import type { NextConfig } from "next";

// เวอร์ชัน Firebase: build เป็นเว็บไฟล์นิ่ง (static export) ไว้ในโฟลเดอร์ out/
// - ไม่มีเซิร์ฟเวอร์: หน้าทั้งหมดโหลดข้อมูลจาก Supabase ในเบราว์เซอร์
// - redirect (/ → /admin, /login, /card/:slug) ย้ายไปตั้งใน firebase.json
// - ปิด image optimization (ต้องใช้เซิร์ฟเวอร์) → โหลดรูปจาก Supabase Storage ตรงๆ
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
