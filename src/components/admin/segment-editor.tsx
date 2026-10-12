"use client";

import { useEffect, useRef, useState } from "react";
import { formatSeconds, parseSeconds } from "@/src/lib/cards";

// เลือกท่อนเพลง: ตัวเล่นเพลง + จุดเริ่ม/จุดจบ ("m:ss") + ปุ่มฟังเฉพาะท่อน
// ใช้ร่วมกันทั้งหน้าคลังเพลง และหน้าสร้าง/แก้ไขการ์ด
export type Segment = { start: string; end: string };

export default function SegmentEditor({
  src,
  value,
  onChange,
}: {
  src: string;
  value: Segment;
  onChange: (next: Segment) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [previewing, setPreviewing] = useState(false);

  // ฟังตัวอย่างท่อน: เล่นจาก start แล้วหยุดเมื่อถึง end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewing) return;
    const end = parseSeconds(value.end);
    const onTime = () => {
      if (end !== null && audio.currentTime >= end) {
        audio.pause();
        setPreviewing(false);
      }
    };
    const onPause = () => setPreviewing(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("pause", onPause);
    };
  }, [previewing, value.end]);

  // เปลี่ยนเพลง → หยุดตัวอย่างที่ค้างอยู่
  useEffect(() => {
    audioRef.current?.pause();
  }, [src]);

  function setFromCurrent(field: keyof Segment) {
    const t = audioRef.current?.currentTime ?? 0;
    onChange({ ...value, [field]: formatSeconds(t) });
  }

  function previewSegment() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = parseSeconds(value.start) ?? 0;
    void audio.play();
    setPreviewing(true);
  }

  const start = parseSeconds(value.start) ?? 0;
  const end = parseSeconds(value.end);
  const length = end !== null && end > start ? end - start : null;

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={src} controls preload="metadata" className="w-full" />

      <div className="grid grid-cols-2 gap-2">
        {(["start", "end"] as const).map((field) => (
          <div key={field} className="space-y-1">
            <span className="block text-xs text-gray-500">
              {field === "start" ? "ຈຸດເລີ່ມ (ນາທີ:ວິນາທີ)" : "ຈຸດຈົບ (ວ່າງ = ຈົນຈົບເພງ)"}
            </span>
            <input
              inputMode="decimal"
              value={value[field]}
              onChange={(e) => onChange({ ...value, [field]: e.target.value })}
              placeholder={field === "start" ? "0:00" : "—"}
              className="w-full rounded-lg border border-blush-200 bg-white p-2 text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={() => setFromCurrent(field)}
              className="w-full rounded-lg border border-blush-200 bg-white px-2 py-1.5 text-xs text-plum-700"
            >
              📍 ໃຊ້ເວລາທີ່ກຳລັງຫຼິ້ນ
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={previewSegment}
          className="rounded-full bg-blush-500 px-4 py-1.5 text-sm font-medium text-white"
        >
          ▶ ຟັງທ່ອນນີ້
        </button>
        {length !== null && (
          <span className="text-xs text-gray-500">ຍາວ {formatSeconds(length)}</span>
        )}
        {previewing && <span className="text-xs text-blush-600">ກຳລັງຫຼິ້ນ...</span>}
      </div>
    </div>
  );
}

// แปลงค่าจากฟอร์มเป็นวินาที (คืน null ถ้าช่วงไม่ถูกต้อง)
export function segmentToSeconds(seg: Segment): { start: number; end: number | null } | null {
  const start = parseSeconds(seg.start) ?? 0;
  if (!seg.end.trim()) return { start, end: null };
  const end = parseSeconds(seg.end);
  if (end === null || end <= start) return null;
  return { start, end };
}

export function secondsToSegment(start: number, end: number | null): Segment {
  return { start: formatSeconds(start), end: end != null ? formatSeconds(end) : "" };
}
