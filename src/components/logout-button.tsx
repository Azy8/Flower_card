
"use client";

import { useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();
    // ออกจากระบบเฉพาะเครื่องนี้ (เครื่องอื่นที่ login บัญชีเดียวกันยังใช้งานต่อได้)
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      setLoading(false);
      alert("ອອກຈາກລະບົບບໍ່ສຳເລັດ");
      return;
    }

    // เปิดหน้า login ใหม่แบบเต็มหน้า (ล้าง state เดิมทั้งหมด)
    window.location.replace("/admin/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-60 hover:bg-red-100 text-red-400"
    >
      {loading ? "ກຳລັງອອກຈາກລະບົບ..." : "ອອກຈາກລະບົບ"}
    </button>
  );
}
