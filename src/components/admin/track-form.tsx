"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createTrack,
  deleteTrack,
  discardUploads,
  updateTrack,
} from "@/src/app/admin/actions";
import { createClient } from "@/src/lib/supabase/client";
import { confirmDialog, toast } from "@/src/components/toast";
import SegmentEditor, {
  secondsToSegment,
  segmentToSeconds,
  type Segment,
} from "./segment-editor";
import {
  CARD_MUSIC_BUCKET,
  LIMITS,
  MAX_MUSIC_BYTES,
  musicTypeOf,
} from "@/src/lib/cards";

type ExistingTrack = {
  id: string;
  title: string;
  url: string;
  start: number;
  end: number | null;
  usedBy: number; // จำนวนการ์ดที่ใช้เพลงนี้
};

// ฟอร์มเพลงในคลัง: เพิ่มใหม่ (อัปโหลดไฟล์) หรือแก้ไขชื่อ/ท่อนแนะนำ
export default function TrackForm({ track }: { track?: ExistingTrack }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState(track?.url ?? "");
  const [title, setTitle] = useState(track?.title ?? "");
  const [segment, setSegment] = useState<Segment>(
    track ? secondsToSegment(track.start, track.end) : { start: "0:00", end: "" }
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // คืนหน่วยความจำของ blob URL
  useEffect(() => {
    return () => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [url]);

  function pickFile(files: FileList | null) {
    const picked = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!picked) return;
    if (!musicTypeOf(picked)) {
      setError("ຮອງຮັບສະເພາະໄຟລ໌ mp3, m4a, aac, ogg, wav");
      return;
    }
    if (picked.size > MAX_MUSIC_BYTES) {
      setError("ໄຟລ໌ເພງໃຫຍ່ເກີນ 15MB");
      return;
    }
    setError("");
    setFile(picked);
    setUrl(URL.createObjectURL(picked));
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, "").slice(0, LIMITS.musicTitle));
    setSegment({ start: "0:00", end: "" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const seg = segmentToSeconds(segment);
    if (!seg) {
      setError("ຈຸດຈົບເພງຕ້ອງຫຼາຍກວ່າຈຸດເລີ່ມ (ຮູບແບບ ນາທີ:ວິນາທີ ເຊັ່ນ 1:30)");
      return;
    }
    if (!track && !file) {
      setError("ກະລຸນາເລືອກໄຟລ໌ເພງ");
      return;
    }

    setSaving(true);
    const input = { title, ...seg };

    try {
      if (track) {
        const result = await updateTrack(track.id, input);
        if (!result.ok) throw new Error(result.error);
        toast.success("ບັນທຶກເພງສຳເລັດ");
        router.push("/admin/music");
        return;
      }

      // อัปโหลดไฟล์จากเบราว์เซอร์ตรงไป Storage (สิทธิ์ตาม RLS: admin เท่านั้น)
      const type = musicTypeOf(file!)!;
      const path = `music/${crypto.randomUUID()}.${type.ext}`;
      const supabase = createClient();
      const { error: upError } = await supabase.storage
        .from(CARD_MUSIC_BUCKET)
        .upload(path, file!, {
          contentType: type.contentType,
          cacheControl: "31536000",
          upsert: false,
        });
      if (upError) throw new Error("ອັບໂຫລດໄຟລ໌ບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");

      const result = await createTrack(path, input);
      if (!result.ok) {
        await discardUploads([path]).catch(() => {});
        throw new Error(result.error);
      }

      // ล้างฟอร์ม (Next เก็บ state หน้าเดิมไว้) แล้วกลับไปหน้ารายการ
      setFile(null);
      setUrl("");
      setTitle("");
      setSegment({ start: "0:00", end: "" });
      setSaving(false);
      toast.success("ເພີ່ມເພງເຂົ້າຄັງສຳເລັດ 🎵");
      router.push("/admin/music");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!track) return;
    const ok = await confirmDialog({
      title: "ລົບເພງນີ້ອອກຈາກຄັງບໍ?",
      message:
        track.usedBy > 0
          ? `ມີກາດ ${track.usedBy} ໃບທີ່ໃຊ້ເພງນີ້ຢູ່ — ກາດເຫຼົ່ານັ້ນຈະບໍ່ມີເພງ`
          : "ໄຟລ໌ເພງຈະຖືກລົບຖາວອນ",
      confirmText: "ລົບ",
      danger: true,
    });
    if (!ok) return;

    setDeleting(true);
    const result = await deleteTrack(track.id);
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    toast.success("ລົບເພງສຳເລັດ");
    router.replace("/admin/music");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-blush-100"
    >
      {!track && (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-plum-800">ໄຟລ໌ເພງ</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-blush-200 p-4 text-sm text-blush-500 hover:bg-blush-50"
          >
            {file ? `🎵 ${file.name} (ກົດເພື່ອປ່ຽນ)` : "🎵 ເລືອກໄຟລ໌ເພງ (mp3, m4a — ບໍ່ເກີນ 15MB)"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,.mp3,.m4a"
            hidden
            onChange={(e) => pickFile(e.target.files)}
          />
        </div>
      )}

      <label className="block space-y-2">
        <span className="flex items-center justify-between text-sm font-medium text-plum-800">
          ຊື່ເພງ (ສະແດງເທິງກາດ)
          <span className="text-xs font-normal text-gray-400">
            {title.length}/{LIMITS.musicTitle}
          </span>
        </span>
        <input
          required
          maxLength={LIMITS.musicTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ເຊັ່ນ Perfect – Ed Sheeran"
          className="w-full rounded-xl border border-blush-200 p-3 outline-none focus:border-blush-400 focus:ring-2 focus:ring-blush-100"
        />
      </label>

      {url && (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-plum-800">ທ່ອນແນະນຳ</span>
          <p className="text-xs text-gray-400">
            ຕອນສ້າງກາດ ຈະໃຊ້ທ່ອນນີ້ເປັນຄ່າເລີ່ມຕົ້ນ (ປ່ຽນໄດ້ແຕ່ລະກາດ)
          </p>
          <div className="rounded-xl bg-blush-50 p-3 ring-1 ring-blush-100">
            <SegmentEditor src={url} value={segment} onChange={setSegment} />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || deleting}
        className="w-full rounded-full bg-blush-500 p-3 font-semibold text-white shadow-sm hover:bg-blush-600 disabled:opacity-60"
      >
        {saving ? "ກຳລັງບັນທຶກ..." : track ? "ບັນທຶກການແກ້ໄຂ" : "ເພີ່ມເພງເຂົ້າຄັງ"}
      </button>

      {track && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving || deleting}
          className="w-full rounded-full border border-red-200 p-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? "ກຳລັງລົບ..." : "ລົບເພງອອກຈາກຄັງ"}
        </button>
      )}
    </form>
  );
}
