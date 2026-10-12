
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function createClient() {
  // ข้อมูล Supabase ต้องอ่านตอนมี request จริงเท่านั้น
  // (Supabase เรียก Date.now() ภายใน ซึ่ง Cache Components ห้ามใช้ตอน prerender)
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components อาจเขียน Cookie ไม่ได้
            // การต่ออายุ Session จะจัดการผ่าน src/proxy.ts
          }
        },
      },
    }
  );
}
