"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createCard,
  discardUploads,
  updateCard,
  type CardInput,
} from "@/src/app/admin/actions";
import { createClient } from "@/src/lib/supabase/client";
import { resizeImage } from "@/src/lib/resize-image";
import { toast } from "@/src/components/toast";
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
type ImageItem = {
  key: string;
  previewUrl: string;
  path?: string;
  file?: File;
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
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
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
      imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.previewUrl)),
    []
  );

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES_PER_CARD - images.length;
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    if (files.length > room) {
      setError(`ใส่รูปได้สูงสุด ${MAX_IMAGES_PER_CARD} รูป`);
    }
    setImages((prev) => [
      ...prev,
      ...picked.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(key: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target?.file) URL.revokeObjectURL(target.previewUrl);
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
    images.forEach((i) => i.file && URL.revokeObjectURL(i.previewUrl));
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
        const { blob, ext } = await resizeImage(item.file!);
        const path = `cards/${crypto.randomUUID()}.${ext}`;
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
        router.push(`/admin/cards/${result.data.id}`);
        return;
      }

      toast.success("ບັນທຶກການແກ້ໄຂສຳເລັດ");

      // อัปเดตรูปใหม่ให้เป็นรูปที่บันทึกแล้ว
      setImages(
        paths.map((path) => ({ key: path, path, previewUrl: publicImageUrl(path) }))
      );
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
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
              <Image
                src={img.previewUrl}
                alt={`รูปที่ ${index + 1}`}
                fill
                sizes="160px"
                unoptimized={Boolean(img.file)}
                className="object-cover"
              />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-blush-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  ปก
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
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
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
          <input
            type="date"
            value={cardDate}
            onChange={(e) => setCardDate(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-blush-200 p-3 outline-none focus:border-blush-400 focus:ring-2 focus:ring-blush-100"
          />
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
        disabled={saving}
        className="w-full rounded-full bg-blush-500 p-3 font-semibold text-white shadow-sm hover:bg-blush-600 disabled:opacity-60"
      >
        {saving
          ? "ກຳລັງບັນທືກ..."
          : status === "saved"
            ? "ບັນທືກແລ້ວ ✓"
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
