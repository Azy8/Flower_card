"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import PhotoLightbox from "./photo-lightbox";
import { useSegmentAudio, type CardMusic } from "./use-segment-audio";

type Props = {
  title: string;
  message: string;
  caption: string;
  date: string;
  images: string[];
  music: CardMusic | null;
};

// front = ซองปิด (ด้านหน้า) → back = พลิกมาเห็นด้านหลังที่มีจดหมายโผล่ → opening → open (การ์ด)
type Phase = "front" | "back" | "opening" | "open";

// ดอกไม้และหัวใจที่ร่วงลงมา — กำหนดตำแหน่งตายตัว (กัน hydration mismatch จากการสุ่ม)
const PETALS = [
  { left: "6%", delay: "0s", duration: "11s", size: 16, drift: "30px", emoji: "🌷" },
  { left: "12%", delay: "9s", duration: "12s", size: 14, drift: "20px", emoji: "💗" },
  { left: "18%", delay: "3s", duration: "13s", size: 12, drift: "-20px", emoji: "🌸" },
  { left: "24%", delay: "5.5s", duration: "11s", size: 13, drift: "-25px", emoji: "💕" },
  { left: "29%", delay: "6s", duration: "10s", size: 18, drift: "40px", emoji: "🌸" },
  { left: "35%", delay: "2.5s", duration: "14s", size: 12, drift: "15px", emoji: "❤️" },
  { left: "41%", delay: "1.5s", duration: "14s", size: 13, drift: "-35px", emoji: "🌷" },
  { left: "47%", delay: "10s", duration: "12s", size: 15, drift: "30px", emoji: "💖" },
  { left: "53%", delay: "8s", duration: "12s", size: 15, drift: "25px", emoji: "🌸" },
  { left: "59%", delay: "0.8s", duration: "13s", size: 12, drift: "-20px", emoji: "💗" },
  { left: "64%", delay: "4.5s", duration: "11s", size: 11, drift: "-15px", emoji: "🌸" },
  { left: "70%", delay: "7.5s", duration: "10s", size: 14, drift: "25px", emoji: "💕" },
  { left: "76%", delay: "2s", duration: "13s", size: 17, drift: "35px", emoji: "🌷" },
  { left: "82%", delay: "11s", duration: "14s", size: 13, drift: "-30px", emoji: "❤️" },
  { left: "87%", delay: "7s", duration: "10s", size: 13, drift: "-30px", emoji: "🌸" },
  { left: "95%", delay: "5s", duration: "15s", size: 14, drift: "-40px", emoji: "💖" },
];

export default function CardExperience(props: Props) {
  const { title, caption, images, music } = props;
  const [phase, setPhase] = useState<Phase>("front");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const audio = useSegmentAudio(music);

  // จังหวะ: จดหมายลอยขึ้นจากซองก่อน แล้วค่อยแสดงการ์ด
  useEffect(() => {
    if (phase !== "opening") return;
    const t = setTimeout(() => setPhase("open"), 750);
    return () => clearTimeout(t);
  }, [phase]);

  function handleEnvelopeTap() {
    if (phase === "front") {
      setPhase("back");
      audio.play(); // เริ่มเพลงพร้อมการพลิกซอง (ต้องอยู่ใน event แตะ)
    } else if (phase === "back") {
      setPhase("opening");
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#f7e3f3] via-[#f1dcf3] to-[#e6d3f2] px-4">
      <Petals />

      {music && phase !== "front" && phase !== "open" && (
        <div className="animate-fade-in absolute inset-x-0 top-5 flex justify-center px-4">
          <MusicChip title={music.title} playing={audio.playing} onToggle={audio.toggle} />
        </div>
      )}

      <Envelope title={title} phase={phase} onTap={handleEnvelopeTap} />

      {/* ข้อมูลร้าน: ตัวเล็กล่างสุดของหน้า (กดเบอร์เพื่อโทรได้) */}
      <footer className="absolute inset-x-0 bottom-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] text-plum-700/60">
        ຮ້ານດອກໄມ້ນຳ້ເຜິ້ງ ບ້ານເຈງ{" "}
        <a href="tel:02054401179" className="underline-offset-2 hover:underline">
          02054401179
        </a>
      </footer>

      {phase === "open" && (
        <LetterCard
          {...props}
          musicSlot={
            music && (
              <MusicChip title={music.title} playing={audio.playing} onToggle={audio.toggle} />
            )
          }
          onClose={() => setPhase("back")}
          onOpenPhotos={() => setLightboxOpen(true)}
        />
      )}

      {lightboxOpen && (
        <PhotoLightbox
          images={images}
          caption={caption}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </main>
  );
}

function Petals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="animate-petal absolute top-0 opacity-0"
          style={
            {
              left: p.left,
              fontSize: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              "--drift": p.drift,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

// แถบชื่อเพลง + ปุ่มหยุด/เล่น + แท่งเสียงเต้นตอนกำลังเล่น
function MusicChip({
  title,
  playing,
  onToggle,
}: {
  title: string;
  playing: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? "ຢຸດເພງ" : "ຫຼິ້ນເພງ"}
      className="flex max-w-full items-center gap-2 rounded-full bg-white/80 py-1.5 pl-2 pr-3 text-xs text-plum-700 shadow-sm ring-1 ring-blush-200 backdrop-blur"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush-400 text-[10px] text-white">
        {playing ? "❚❚" : "▶"}
      </span>
      <span className="truncate font-medium">🎵 {title || "ເພງປະກອບ"}</span>
      <span className="flex h-3 shrink-0 items-end gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full bg-blush-400 ${playing ? "animate-eq" : "h-1"}`}
            style={playing ? { animationDelay: `${i * 0.15}s` } : undefined}
          />
        ))}
      </span>
    </button>
  );
}

function Envelope({
  title,
  phase,
  onTap,
}: {
  title: string;
  phase: Phase;
  onTap: () => void;
}) {
  const flipped = phase !== "front";
  const lifted = phase === "opening" || phase === "open";

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={flipped ? "ແຕະເພື່ອອ່ານຈົດໝາຍ" : "ແຕະເພື່ອເປີດຊອງຈົດໝາຍ"}
      className={`relative flex flex-col items-center outline-none transition-opacity duration-500 ${
        phase === "open" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className={lifted ? "" : "animate-float-soft"}>
        {/* พื้นที่ด้านบนเผื่อฝาซองที่เปิดขึ้น (ด้านหลัง) */}
        <div className="relative mt-[120px] h-[200px] w-[min(82vw,320px)] [perspective:1200px]">
          {/* ตัวที่พลิก: หมุนรอบแกน Y 180° */}
          <div
            className="relative h-full w-full transition-transform duration-[1100ms] ease-[cubic-bezier(0.45,0.05,0.25,1)] [transform-style:preserve-3d]"
            style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            <EnvelopeFront />
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <EnvelopeBack title={title} lifted={lifted} />
            </div>
          </div>
        </div>
      </div>

      <p className="animate-pulse-hint mt-6 text-sm font-medium text-plum-700">
        {flipped ? "ແຕະເພື່ອອ່ານຈົດໝາຍ 💌" : "ແຕະເພື່ອເປີດ"}
      </p>
    </button>
  );
}

// ด้านหน้าซอง (ปิดอยู่): ฝาสามเหลี่ยม + รอยพับ + ตราหัวใจตรงกลาง
function EnvelopeFront() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-b from-[#f5bfe0] to-[#eaa2cf] shadow-[0_18px_40px_-12px_rgba(168,67,140,0.45)] [backface-visibility:hidden]">
      {/* พับซ้าย/ขวา */}
      <div
        className="absolute inset-0 bg-[#f2b4da]"
        style={{ clipPath: "polygon(0 0, 50% 55%, 0 100%)" }}
      />
      <div
        className="absolute inset-0 bg-[#f2b4da]"
        style={{ clipPath: "polygon(100% 0, 50% 55%, 100% 100%)" }}
      />
      {/* พับล่าง */}
      <div
        className="absolute inset-0 bg-[#eba8d3]"
        style={{ clipPath: "polygon(0 100%, 50% 50%, 100% 100%)" }}
      />
      {/* ฝาบน (มีเงาเล็กน้อยให้ดูนูน) */}
      <div className="absolute inset-0 drop-shadow-[0_3px_3px_rgba(168,67,140,0.25)]">
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#f9d3ea] to-[#f3bde0]"
          style={{ clipPath: "polygon(0 0, 100% 0, 50% 58%)" }}
        />
      </div>
      {/* ตราหัวใจ */}
      <span className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-2xl drop-shadow-sm">
        💜
      </span>
    </div>
  );
}

// ด้านหลังซอง (ฝาเปิด จดหมายโผล่พร้อมหัวข้อ)
function EnvelopeBack({ title, lifted }: { title: string; lifted: boolean }) {
  return (
    <>
      {/* ฝาซอง (เปิดขึ้นด้านบน) */}
      <div
        className="absolute bottom-full left-0 h-[120px] w-full bg-[#f6c2e2]"
        style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }}
      />
      {/* ด้านในซอง */}
      <div className="absolute inset-0 rounded-b-2xl bg-[#eda6d2] shadow-[0_18px_40px_-12px_rgba(168,67,140,0.45)]" />

      {/* ตัวจดหมาย */}
      <div
        className={`absolute inset-x-[7%] top-[-30px] h-[170px] rounded-lg bg-white shadow-md transition-all duration-700 ease-out ${
          lifted ? "-translate-y-[180px] opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex items-start justify-center gap-2 px-3 pt-8">
          <span className="text-lg">🌷</span>
          <p className="line-clamp-2 text-center text-sm font-semibold text-plum-700">
            {title}
          </p>
          <span className="text-lg">🌷</span>
        </div>
      </div>

      {/* กระเป๋าด้านหน้าซอง (ขอบบนเป็นรูปตัว V) */}
      <div
        className="absolute inset-0 rounded-b-2xl bg-[#f0aed6]"
        style={{ clipPath: "polygon(0 32%, 50% 64%, 100% 32%, 100% 100%, 0 100%)" }}
      />
      <span className="absolute -right-2 top-[28%] text-xl">🌸</span>
    </>
  );
}

function LetterCard({
  title,
  message,
  caption,
  date,
  images,
  musicSlot,
  onClose,
  onOpenPhotos,
}: Props & {
  musicSlot?: React.ReactNode;
  onClose: () => void;
  onOpenPhotos: () => void;
}) {
  return (
    <div className="animate-fade-in fixed inset-0 z-20 flex items-center justify-center bg-[#8c5f92]/55 p-4 backdrop-blur-[2px]">
      <article className="animate-card-pop relative flex max-h-[90dvh] w-full max-w-[380px] flex-col rounded-[28px] bg-gradient-to-b from-white to-[#fbf2fb] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-blush-50 text-plum-700 hover:bg-blush-100"
        >
          ×
        </button>

        {/* ชื่อเพลงอยู่เหนือหัวการ์ด (ถ้ามีเพลง) ไม่มีก็แสดงหัวใจ */}
        {musicSlot ? (
          <div className="flex justify-center pr-8">{musicSlot}</div>
        ) : (
          <div className="mx-auto flex h-8 w-14 items-center justify-center rounded-full bg-blush-200/80 text-base">
            💖
          </div>
        )}

        <h1 className="mt-4 text-center text-xl font-semibold leading-snug text-plum-700 break-words">
          {title}
        </h1>

        <div className="mx-auto mt-3 flex w-40 items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-blush-200" />
          <span className="text-sm">🌸</span>
          <span className="h-px flex-1 bg-blush-200" />
        </div>

        <hr className="mt-4 border-blush-100" />

        <div className="mt-4 min-h-[140px] flex-1 overflow-y-auto">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-plum-800">
            {message}
          </p>
        </div>

        <footer className="mt-5 flex items-end justify-between gap-4 border-t border-blush-100 pt-4">
          <div className="space-y-1 pb-1">
            <p className="text-2xl">💖</p>
            <p className="text-xs tracking-wide text-plum-700/70">{date}</p>
          </div>

          {images.length > 0 && (
            <Polaroid
              src={images[0]}
              caption={caption}
              count={images.length}
              onClick={onOpenPhotos}
            />
          )}
        </footer>
      </article>
    </div>
  );
}

function Polaroid({
  src,
  caption,
  count,
  onClick,
}: {
  src: string;
  caption: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 1 ? `ดูรูปทั้งหมด ${count} รูป` : "ดูรูป"}
      className="relative mr-1 w-[130px] shrink-0 rotate-[5deg] transition hover:rotate-[2deg] active:scale-95"
    >
      {/* รูปซ้อนด้านหลัง เมื่อมีหลายรูป */}
      {count > 1 && (
        <span className="absolute inset-0 -rotate-[9deg] rounded-sm bg-white shadow-md" />
      )}
      <span className="relative block rounded-sm bg-white p-2 pb-7 shadow-lg ring-1 ring-black/5">
        <span className="relative block aspect-[4/5] overflow-hidden bg-blush-50">
          <Image src={src} alt="" fill sizes="130px" className="object-cover" />
        </span>
        {caption && (
          <span className="absolute inset-x-2 bottom-1.5 line-clamp-1 text-center text-[11px] text-gray-500">
            {caption}
          </span>
        )}
      </span>
      {count > 1 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-blush-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
          {count} รูป
        </span>
      )}
    </button>
  );
}
