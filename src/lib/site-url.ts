import "server-only";

import { headers } from "next/headers";

// URL หลักของเว็บ ใช้สร้างลิงก์ใน QR
// ตั้ง NEXT_PUBLIC_SITE_URL ใน production เพื่อไม่ต้องพึ่ง Host header
export async function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
