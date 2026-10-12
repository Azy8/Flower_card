import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client แบบไม่มี session (anon) สำหรับหน้าที่ลูกค้าสแกน
// อ่านข้อมูลได้เฉพาะผ่านฟังก์ชัน get_public_card เท่านั้น (ตาม RLS)
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
