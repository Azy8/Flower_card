import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export type AdminCheck =
  | { status: "ok"; user: { id: string; email?: string } }
  | { status: "forbidden"; email?: string }
  | { status: "error" };

// ใช้ในหน้า admin: ยังไม่ login → ไปหน้า login, login แล้วคืนสถานะสิทธิ์
export async function checkAdminPage(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { status: "error" };
  if (!admin) return { status: "forbidden", email: user.email };
  return { status: "ok", user: { id: user.id, email: user.email } };
}

// ใช้ใน Server Action: ไม่ใช่ admin → throw (RLS ก็กันซ้ำอีกชั้นอยู่แล้ว)
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("UNAUTHENTICATED");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) throw new Error("FORBIDDEN");
  return { supabase, user };
}
