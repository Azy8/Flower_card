// ค่าคงที่และ helper ที่ใช้ร่วมกันทั้งฝั่ง server และ client

export const CARD_IMAGE_BUCKET = "card-images";
export const MAX_IMAGES_PER_CARD = 5;

export const LIMITS = {
  title: 150,
  message: 5000,
  caption: 100,
  musicTitle: 150,
} as const;

// รูปแบบ path ที่อนุญาตใน Storage (ต้องตรงกับ constraint ในฐานข้อมูล)
export const IMAGE_PATH_PATTERN = /^cards\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type PublicCard = {
  title: string;
  message: string;
  caption: string;
  card_date: string | null; // วันสำคัญที่ admin กรอก (YYYY-MM-DD)
  created_at: string;
  images: string[];
  music_path: string | null;
  music_title: string;
  music_start: number;
  music_end: number | null;
};

export function publicImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CARD_IMAGE_BUCKET}/${path}`;
}

// ---------- เพลง ----------

export const CARD_MUSIC_BUCKET = "card-music";
export const MAX_MUSIC_BYTES = 15 * 1024 * 1024;
export const MUSIC_PATH_PATTERN = /^music\/[0-9a-f-]{36}\.(mp3|m4a|aac|ogg|wav)$/;

// ชนิดไฟล์ที่รับ → นามสกุล + content-type ที่ส่งให้ Storage (ต้องตรงกับ bucket)
export const MUSIC_TYPES: Record<string, { ext: string; contentType: string }> = {
  "audio/mpeg": { ext: "mp3", contentType: "audio/mpeg" },
  "audio/mp3": { ext: "mp3", contentType: "audio/mpeg" },
  "audio/mp4": { ext: "m4a", contentType: "audio/mp4" },
  "audio/x-m4a": { ext: "m4a", contentType: "audio/mp4" },
  "audio/aac": { ext: "aac", contentType: "audio/aac" },
  "audio/ogg": { ext: "ogg", contentType: "audio/ogg" },
  "audio/wav": { ext: "wav", contentType: "audio/wav" },
  "audio/x-wav": { ext: "wav", contentType: "audio/wav" },
};

// หาชนิดไฟล์เพลง: ใช้ MIME ก่อน ถ้าเบราว์เซอร์ไม่ระบุ (เช่น m4a บน Windows) ใช้นามสกุลไฟล์
export function musicTypeOf(file: { type: string; name: string }) {
  if (MUSIC_TYPES[file.type]) return MUSIC_TYPES[file.type];
  const ext = file.name.split(".").pop()?.toLowerCase();
  return Object.values(MUSIC_TYPES).find((t) => t.ext === ext) ?? null;
}

export function publicMusicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CARD_MUSIC_BUCKET}/${path}`;
}

// วินาที → "m:ss"
export function formatSeconds(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// "m:ss" หรือ "ss" → วินาที (null ถ้ารูปแบบผิด)
export function parseSeconds(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const m = /^(\d{1,3}):([0-5]?\d)(\.\d+)?$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]) + Number(m[3] ?? 0);
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

// วันที่รูปแบบ 07.10.2026
export function formatCardDate(iso: string) {
  // ล็อก timezone (UTC+7) ให้ server และเบราว์เซอร์แสดงวันเดียวกัน
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(iso))
    .replaceAll("/", ".");
}
