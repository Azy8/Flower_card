"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createCard,
  discardUploads,
  updateCard,
  type CardInput,
} from "@/src/lib/admin-api";
import { createClient } from "@/src/lib/supabase/client";
import { resizeImage } from "@/src/lib/resize-image";
import { toast } from "@/src/components/toast";
import DateInput from "@/src/components/date-input";
import MusicPicker, {
  type LibraryTrack,
  type PickedMusic,
} from "@/src/components/admin/music-picker";
import { secondsToSegment, segmentToSeconds } from "@/src/components/admin/segment-editor";
import {
  CARD_IMAGE_BUCKET,
  LIMITS,
  MAX_IMAGES_PER_CARD,
  publicImageUrl,
} from "@/src/lib/cards";

type ExistingCard = {
  id: string;
  title: string;
  message: string;
  caption: string;
  cardDate: string;
  isActive: boolean;
  imagePaths: string[];
  music: { trackId: string; start: number; end: number | null } | null;
};

// รูปในฟอร์ม: path = รูปที่อยู่ใน Storage แล้ว, file = รูปใหม่ที่รออัปโหลด
// รูปใหม่จะถูกย่อ (≤1600px) ทันทีหลังเลือก แล้วเก็บเป็น blob เล็กๆ
// → มือถือไม่ต้องถือไฟล์ต้นฉบับขนาดใหญ่หลายรูปพร้อมกัน (กัน Safari หน่วยความจำเต็มแล้วรีหน้า)
type ImageItem = {
  key: string;
  previewUrl: string; // "" ระหว่างกำลังย่อรูป
  path?: string;
  blob?: Blob;
  ext?: "webp" | "jpg";
  processing?: boolean;
};

export default function CardForm({
  card,
  tracks,
}: {
  card?: ExistingCard;
  tracks: LibraryTrack[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(card?.title ?? "");
  const [message, setMessage] = useState(card?.message ?? "");
  const [caption, setCaption] = useState(card?.caption ?? "");
  const [cardDate, setCardDate] = useState(card?.cardDate ?? "");
  const [isActive, setIsActive] = useState(card?.isActive ?? true);
  const [images, setImages] = useState<ImageItem[]>(
    () =>
      card?.imagePaths.map((path) => ({
        key: path,
        path,
        previewUrl: publicImageUrl(path),
      })) ?? []
  );
  const [music, setMusic] = useState<PickedMusic | null>(() =>
    card?.music
      ? { trackId: card.music.trackId, ...secondsToSegment(card.music.start, card.music.end) }
      : null
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  // คืนหน่วยความจำของ preview (blob URL) เมื่อออกจากหน้า
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () =>
      imagesRef.current.forEach((i) => i.blob && URL.revokeObjectURL(i.previewUrl)),
    []
  );

  const processingCount = images.filter((i) => i.processing).length;

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES_PER_CARD - images.length;
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, room));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length > room) {
      setError(`ໃສ່ຮູບໄດ້ສູງສຸດ ${MAX_IMAGES_PER_CARD} ຮູບ`);
    }
    if (picked.length === 0) return;

    // ใส่ช่องรูปพร้อมไอคอนโหลดก่อน แล้วค่อยย่อรูปทีละรูป (ทีละรูปเพื่อประหยัดหน่วยความจำมือถือ)
    const pending = picked.map((file) => ({ file, key: crypto.randomUUID() }));
    setImages((prev) => [
      ...prev,
      ...pending.map(({ key }) => ({ key, previewUrl: "", processing: true })),
    ]);

    for (const { file, key } of pending) {
      try {
        const { blob, ext } = await resizeImage(file);
        const previewUrl = URL.createObjectURL(blob);
        setImages((prev) =>
          prev.map((i) =>
            i.key === key ? { key, previewUrl, blob, ext, processing: false } : i
          )
        );
      } catch {
        // อ่านรูปไม่ได้ (เช่นไฟล์เสีย) → เอาช่องนั้นออกและแจ้งเตือน
        setImages((prev) => prev.filter((i) => i.key !== key));
        setError("ມີຮູບທີ່ເປີດບໍ່ໄດ້ ກະລຸນາເລືອກຮູບອື່ນ");
      }
    }
  }

  function removeImage(key: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target?.blob) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.key !== key);
    });
  }

  function moveImage(index: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const to = index + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function resetForm() {
    images.forEach((i) => i.blob && URL.revokeObjectURL(i.previewUrl));
    setTitle("");
    setMessage("");
    setCaption("");
    setCardDate("");
    setIsActive(true);
    setImages([]);
    setMusic(null);
    setError("");
    setTitleError("");
    setStatus("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // ตรวจหัวข้อก่อน (ห้ามว่างหรือมีแต่ช่องว่าง) — แสดงข้อความใต้ช่องและเลื่อนไปที่ช่องนั้น
    if (!title.trim()) {
      setTitleError("ກະລຸນາປ້ອນຫົວຂໍ້");
      titleRef.current?.focus();
      return;
    }
    setTitleError("");
    if (processingCount > 0) {
      setError("ກະລຸນາລໍຖ້າຮູບໂຫລດໃຫ້ແລ້ວກ່ອນ");
      return;
    }
    setStatus("saving");

    const supabase = createClient();
    const uploaded: string[] = [];

    try {
      // ตรวจท่อนเพลงก่อนอัปโหลดรูป (ถ้าผิดจะได้ไม่ต้องอัปโหลดเสียเปล่า)
      let musicInput: CardInput["music"] = null;
      if (music) {
        const seg = segmentToSeconds(music);
        if (!seg) throw new Error("MUSIC_RANGE");
        musicInput = { trackId: music.trackId, ...seg };
      }

      // 1) อัปโหลดรูปใหม่ไป Storage โดยตรงจากเบราว์เซอร์ (สิทธิ์ตาม RLS: admin เท่านั้น)
      const paths: string[] = [];
      for (const item of images) {
        if (item.path) {
          paths.push(item.path);
          continue;
        }
        // ใช้รูปที่ย่อไว้แล้วตอนเลือก
        const blob = item.blob!;
        const path = `cards/${crypto.randomUUID()}.${item.ext}`;
        const { error: upError } = await supabase.storage
          .from(CARD_IMAGE_BUCKET)
          .upload(path, blob, {
            contentType: blob.type,
            cacheControl: "31536000",
            upsert: false,
          });
        if (upError) throw new Error("UPLOAD_FAILED");
        uploaded.push(path);
        paths.push(path);
      }

      // 2) บันทึกข้อมูลการ์ดผ่าน Server Action
      const input = {
        title,
        message,
        caption,
        cardDate,
        isActive,
        imagePaths: paths,
        music: musicInput,
      };
      const result = card
        ? await updateCard(card.id, input)
        : await createCard(input);

      if (!result.ok) {
        if (uploaded.length) await discardUploads(uploaded);
        setError(result.error);
        setStatus("idle");
        return;
      }

      if (!card && result.data) {
        // ล้างฟอร์ม: Next เก็บ state ของหน้าที่เคยเปิดไว้ (Activity)
        // ถ้าไม่ล้าง กลับมาหน้า "สร้างใหม่" จะเห็นข้อมูลเดิมและปุ่มค้างที่ "กำลังบันทึก"
        resetForm();
        toast.success("ສ້າງກາດສຳເລັດ 🎉");
        router.push("/admin"); // กลับหน้าหลัก (เปิดการ์ดจากรายการเพื่อโหลด QR)
        return;
      }

      // แก้ไขสำเร็จ → กลับหน้าหลัก
      toast.success("ບັນທຶກການແກ້ໄຂສຳເລັດ");
      router.push("/admin");
    } catch (e) {
      if (uploaded.length) await discardUploads(uploaded).catch(() => {});
      setError(
        e instanceof Error && e.message === "MUSIC_RANGE"
          ? "ຈຸດຈົບເພງຕ້ອງຫຼາຍກວ່າຈຸດເລີ່ມ (ຮູບແບບ ນາທີ:ວິນາທີ ເຊັ່ນ 1:30)"
          : e instanceof Error && e.message === "UPLOAD_FAILED"
            ? "ອັບໂຫລດໄຟລ໌ບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່"
            : "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່"
      );
      setStatus("idle");
    }
  }

  const saving = status === "saving";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-blush-100"
    >
      <Field label="ຫົວຂໍ້ (ສະແດງໜ້າຈົດໝາຍ)" count={`${title.length}/${LIMITS.title}`}>
        <input
          ref={titleRef}
          maxLength={LIMITS.title}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError && e.target.value.trim()) setTitleError("");
          }}
          placeholder="ຕົວຢ່າງ: ສຸກສັນວັນເກີດ..."
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "title-error" : undefined}
          className={`w-full rounded-xl border p-3 outline-none focus:ring-2 ${
            titleError
              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
              : "border-blush-200 focus:border-blush-400 focus:ring-blush-100"
          }`}
        />
        {titleError && (
          <span id="title-error" role="alert" className="block text-xs text-red-600">
            {titleError}
          </span>
        )}
      </Field>

      <Field
        label="ຂໍ້ຄວາມ (ສະແດງຫຼັງເປີດຈົດໝາຍ)"
        count={`${message.length}/${LIMITS.message}`}
      >
        <textarea
          rows={6}
          maxLength={LIMITS.message}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ຂຽນຄຳອວນພອນ..."
          className="w-full resize-y rounded-xl border border-blush-200 p-3 outline-none focus:border-blush-400 focus:ring-2 focus:ring-blush-100"
        />
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-plum-800">
            ຮູບພາບ ({images.length}/{MAX_IMAGES_PER_CARD})
          </span>
          <span className="text-xs text-gray-400">ຮູບທຳອິດຈະເປັນຮູບໜ້າປົກ</span>
        </div>

        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, index) => (
            <li
              key={img.key}
              className="group relative aspect-square overflow-hidden rounded-xl bg-blush-50 ring-1 ring-blush-100"
            >
              {img.processing ? (
                // กำลังย่อรูป: แสดงดอกไม้หมุน (ยังเลื่อน/บันทึกไม่ได้)
                <div className="flex h-full flex-col items-center justify-center gap-1 text-blush-500">
                  <span className="animate-bloom text-2xl">🌸</span>
                  <span className="text-[10px]">ກຳລັງໂຫລດ...</span>
                </div>
              ) : (
                <Image
                  src={img.previewUrl}
                  alt={`ຮູບທີ ${index + 1}`}
                  fill
                  sizes="160px"
                  unoptimized
                  className="object-cover"
                />
              )}
              {index === 0 && !img.processing && (
                <span className="absolute left-1 top-1 rounded-full bg-blush-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  ປົກ
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(img.key)}
                aria-label="ลบรูป"
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                ×
              </button>
              <div
                className={`absolute inset-x-1 bottom-1 flex justify-between ${
                  processingCount > 0 ? "invisible" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => moveImage(index, -1)}
                  disabled={index === 0}
                  aria-label="เลื่อนไปซ้าย"
                  className="h-7 w-7 rounded-full bg-white/90 text-plum-800 shadow disabled:invisible"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, 1)}
                  disabled={index === images.length - 1}
                  aria-label="เลื่อนไปขวา"
                  className="h-7 w-7 rounded-full bg-white/90 text-plum-800 shadow disabled:invisible"
                >
                  ›
                </button>
              </div>
            </li>
          ))}

          {images.length < MAX_IMAGES_PER_CARD && (
            <li>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-blush-200 text-blush-500 hover:bg-blush-50"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs">เพิ่มรูป</span>
              </button>
            </li>
          )}
        </ul>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <Field label="ຂໍ້ຄວາມກ້ອງຮູບ (ບໍ່ບັງຄັບ)" count={`${caption.length}/${LIMITS.caption}`}>
        <input
          maxLength={LIMITS.caption}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="ເຊັ່ນ ຄວາມສົງຈຳຂອງເຮົາ 💕"
          className="w-full rounded-xl border border-blush-200 p-3 outline-none focus:border-blush-400 focus:ring-2 focus:ring-blush-100"
        />
      </Field>

      <Field label="ວັນສຳຄັນ (ສະແດງໃນກາດ)">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <DateInput
              value={cardDate}
              onChange={setCardDate}
              className="rounded-xl border border-blush-200 p-3 outline-none focus:border-blush-400 focus:ring-2 focus:ring-blush-100"
            />
          </div>
          {cardDate && (
            <button
              type="button"
              onClick={() => setCardDate("")}
              className="shrink-0 rounded-xl border border-blush-200 px-3 text-sm text-plum-700"
            >
              ລ້າງຂ້ໍມູນ
            </button>
          )}
        </div>
        <span className="block text-xs text-gray-400">
          ຖ້າບໍ່ເລືອກຈະສະປກງວັນທີ່ສ້າງແທນ
        </span>
      </Field>

      <MusicPicker tracks={tracks} value={music} onChange={setMusic} />

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-5 w-5 accent-blush-500"
        />
        ເປີດໃຫ້ລູກຄ້າສະແກນໄດ້
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || processingCount > 0}
        className="w-full rounded-full bg-blush-500 p-3 font-semibold text-white shadow-sm hover:bg-blush-600 disabled:opacity-60"
      >
        {saving
          ? "ກຳລັງບັນທືກ..."
          : processingCount > 0
            ? `ກຳລັງໂຫລດຮູບ (${processingCount})...`
            : card
              ? "ບັນທືກການແກ້ໄຂ"
              : "ສ້າງກາດ + QR"}
      </button>
    </form>
  );
}

function Field({
  label,
  count,
  children,
}: {
  label: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-sm font-medium text-plum-800">
        {label}
        {count && <span className="text-xs font-normal text-gray-400">{count}</span>}
      </span>
      {children}
    </label>
  );
}
