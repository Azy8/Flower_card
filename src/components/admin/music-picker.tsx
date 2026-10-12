"use client";

import Link from "next/link";
import SegmentEditor, { secondsToSegment, type Segment } from "./segment-editor";

export type LibraryTrack = {
  id: string;
  title: string;
  url: string;
  defaultStart: number;
  defaultEnd: number | null;
};

export type PickedMusic = { trackId: string } & Segment;

// เลือกเพลงจากคลัง แล้วเลือกท่อนสำหรับการ์ดใบนี้
export default function MusicPicker({
  tracks,
  value,
  onChange,
}: {
  tracks: LibraryTrack[];
  value: PickedMusic | null;
  onChange: (next: PickedMusic | null) => void;
}) {
  const selected = tracks.find((t) => t.id === value?.trackId) ?? null;

  function pick(trackId: string) {
    const track = tracks.find((t) => t.id === trackId);
    // เลือกเพลงใหม่ → ใช้ท่อนแนะนำของเพลงนั้นเป็นค่าเริ่มต้น
    onChange(
      track ? { trackId, ...secondsToSegment(track.defaultStart, track.defaultEnd) } : null
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-plum-800">ເພງປະກອບ (ບໍ່ບັງຄັບ)</span>
        <Link href="/admin/music" className="text-xs text-blush-600 hover:underline">
          ຈັດການເພງ →
        </Link>
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-blush-200 p-4 text-center text-sm text-gray-500">
          ຍັງບໍ່ມີເພງໃນຄັງ{" "}
          <Link href="/admin/music/new" className="text-blush-600 underline">
            ອັບໂຫລດເພງ
          </Link>
        </p>
      ) : (
        <select
          value={value?.trackId ?? ""}
          onChange={(e) => pick(e.target.value)}
          className="w-full rounded-xl border border-blush-200 bg-white p-3 text-sm outline-none focus:border-blush-400"
        >
          <option value="">— ບໍ່ມີເພງ —</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              🎵 {t.title}
            </option>
          ))}
        </select>
      )}

      {value && !selected && (
        <p className="text-xs text-amber-600">ເພງທີ່ເລືອກໄວ້ຖືກລົບອອກຈາກຄັງແລ້ວ</p>
      )}

      {value && selected && (
        <div className="rounded-xl bg-blush-50 p-3 ring-1 ring-blush-100">
          <SegmentEditor
            src={selected.url}
            value={{ start: value.start, end: value.end }}
            onChange={(seg) => onChange({ ...value, ...seg })}
          />
        </div>
      )}
    </div>
  );
}
