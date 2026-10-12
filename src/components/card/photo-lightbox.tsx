"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// ดูรูปเต็มจอ: ปัดซ้าย/ขวาด้วย CSS scroll-snap (ลื่นแบบ native บนมือถือ)
export default function PhotoLightbox({
  images,
  caption,
  onClose,
}: {
  images: string[];
  caption: string;
  onClose: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }

  // ล็อกการเลื่อนหน้าพื้นหลัง + รองรับปุ่มคีย์บอร์ด
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      const track = trackRef.current;
      if (!track) return;
      const current = Math.round(track.scrollLeft / track.clientWidth);
      if (e.key === "ArrowRight")
        track.scrollTo({ left: (current + 1) * track.clientWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft")
        track.scrollTo({ left: (current - 1) * track.clientWidth, behavior: "smooth" });
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="รูปภาพ"
      className="animate-fade-in fixed inset-0 z-30 flex flex-col bg-black/90"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm tabular-nums opacity-80">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20"
        >
          ×
        </button>
      </div>

      <div className="relative flex-1">
        <div
          ref={trackRef}
          onScroll={(e) => {
            const t = e.currentTarget;
            setIndex(Math.round(t.scrollLeft / t.clientWidth));
          }}
          className="no-scrollbar absolute inset-0 flex snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-center">
              <Image
                src={src}
                alt={`รูปที่ ${i + 1}`}
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="รูปก่อนหน้า"
              className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25 disabled:opacity-0 sm:flex"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              aria-label="รูปถัดไป"
              className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25 disabled:opacity-0 sm:flex"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="space-y-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-center">
        {caption && <p className="text-sm text-white/80">{caption}</p>}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`ไปที่รูปที่ ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
