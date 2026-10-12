import type { NextConfig } from "next";

// อนุญาตให้ next/image โหลดรูปจาก Supabase Storage (เฉพาะ bucket สาธารณะของโปรเจกต์นี้)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // หน้าแรกพาไปหน้า admin (ถ้ายังไม่ login จะถูกส่งต่อไปหน้า login อัตโนมัติ)
  async redirects() {
    return [
      { source: "/", destination: "/admin", permanent: false },
      { source: "/login", destination: "/admin/login", permanent: false },
    ];
  },
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/card-images/**`)]
      : [],
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
