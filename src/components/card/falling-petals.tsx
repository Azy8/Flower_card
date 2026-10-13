"use client";

import { useEffect, useRef } from "react";

// กลีบดอกไม้ร่วง (วาดบน canvas): รูปกลีบซากุระ ไล่สีชมพู หมุนตีลังกาแบบ 3D + พลิ้วซ้ายขวา
// ใช้ canvas แทน emoji/DOM หลายสิบชิ้น → ลื่นบนมือถือ

// เฉดสีกลีบ: [สีโคนกลีบ, สีปลายกลีบ]
const COLORS: [string, string][] = [
  ["#f7a8c4", "#ffe3ee"],
  ["#f28db2", "#ffd0e1"],
  ["#fbbfd4", "#fff0f5"],
  ["#e9799f", "#fbc6d8"],
  ["#f9cfe0", "#ffffff"],
];

type Petal = {
  x: number;
  y: number;
  size: number;
  fall: number; // ความเร็วตก (px/วินาที)
  swayAmp: number; // ระยะพลิ้วซ้ายขวา
  swaySpeed: number;
  phase: number;
  rot: number; // มุมหมุนบนระนาบ
  rotSpeed: number;
  flip: number; // มุมตีลังกา (ใช้ cos ย่อความกว้าง → ดูเป็น 3D)
  flipSpeed: number;
  color: [string, string];
  alpha: number;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makePetal(w: number, h: number, anywhere: boolean): Petal {
  return {
    x: rand(-20, w + 20),
    // ครั้งแรกกระจายทั้งจอ ครั้งต่อไปเริ่มเหนือขอบบน
    y: anywhere ? rand(-h * 0.1, h) : rand(-60, -15),
    size: rand(7, 14),
    fall: rand(28, 62),
    swayAmp: rand(12, 38),
    swaySpeed: rand(0.6, 1.4),
    phase: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-1.2, 1.2),
    flip: rand(0, Math.PI * 2),
    flipSpeed: rand(1.5, 3.2),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: rand(0.7, 0.95),
  };
}

// วาดกลีบหนึ่งกลีบที่จุด (0,0): ทรงหยดน้ำ มีรอยเว้าที่ปลาย (แบบกลีบซากุระ)
function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  const s = p.size;
  const grad = ctx.createLinearGradient(0, s, 0, -s);
  grad.addColorStop(0, p.color[0]);
  grad.addColorStop(1, p.color[1]);

  ctx.beginPath();
  ctx.moveTo(0, s); // โคนกลีบ
  ctx.bezierCurveTo(s * 0.95, s * 0.35, s * 0.85, -s * 0.75, s * 0.18, -s);
  ctx.lineTo(0, -s * 0.78); // รอยเว้าที่ปลาย
  ctx.lineTo(-s * 0.18, -s);
  ctx.bezierCurveTo(-s * 0.85, -s * 0.75, -s * 0.95, s * 0.35, 0, s);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // เส้นกลางกลีบจางๆ ให้ดูมีมิติ
  ctx.beginPath();
  ctx.moveTo(0, s * 0.85);
  ctx.quadraticCurveTo(s * 0.08, 0, 0, -s * 0.7);
  ctx.strokeStyle = "rgba(233, 121, 159, 0.25)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

export default function FallingPetals() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // ผู้ใช้ตั้งค่าลดการเคลื่อนไหว → ไม่แสดง
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0;
    let h = 0;
    let petals: Petal[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // จำกัด 2x ประหยัดแรงเครื่อง
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // จำนวนกลีบตามขนาดจอ (มือถือ ~25, จอใหญ่สูงสุด 45)
      const count = Math.min(45, Math.max(25, Math.round((w * h) / 14000)));
      petals = Array.from({ length: count }, (_, i) => petals[i] ?? makePetal(w, h, true));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let time = 0;

    const frame = (now: number) => {
      // dt เป็นวินาที (จำกัดไว้ กันกระตุกตอนกลับมาจากแท็บอื่น)
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += p.fall * dt;
        p.rot += p.rotSpeed * dt;
        p.flip += p.flipSpeed * dt;
        const x = p.x + Math.sin(time * p.swaySpeed + p.phase) * p.swayAmp;

        if (p.y > h + 30) petals[i] = makePetal(w, h, false);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(x, p.y);
        ctx.rotate(p.rot);
        // ย่อแกน X ตาม cos ของมุมตีลังกา → กลีบพลิกไปมาเหมือนลอยในอากาศ
        ctx.scale(Math.max(0.15, Math.abs(Math.cos(p.flip))), 1);
        drawPetal(ctx, p);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    // หยุดวาดเมื่อสลับแอป/ปิดจอ (ประหยัดแบต)
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
