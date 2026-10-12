
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
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

    router.replace("/admin/login");
    router.refresh();
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
