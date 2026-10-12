"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import FlowerLoader from "@/src/components/flower-loader";
import LogoutButton from "@/src/components/logout-button";
import AdminNav from "@/src/components/admin/admin-nav";

type State =
  | { status: "loading" }
  | { status: "ok"; email?: string }
  | { status: "forbidden"; email?: string }
  | { status: "error" };

// ตรวจ session + สิทธิ์ admin ในเบราว์เซอร์ (เวอร์ชัน Firebase ไม่มีเซิร์ฟเวอร์)
// ⚠️ เป็นแค่การซ่อนหน้า — ข้อมูลจริงถูกป้องกันด้วย RLS ใน Supabase:
//    คนที่ไม่ใช่ admin ต่อให้เปิดหน้าได้ ก็อ่าน/เขียนข้อมูลไม่ได้
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const { data: admin, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) setState({ status: "error" });
      else if (!admin) setState({ status: "forbidden", email: user.email });
      else setState({ status: "ok", email: user.email });
    }

    void check();

    // ออกจากระบบ (หรือ session หมดอายุ) → กลับหน้า login
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/admin/login");
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (state.status === "loading") return <FlowerLoader fullScreen />;

  if (state.status === "error") {
    return (
      <FullPageMessage
        title="ກວດສອບສິດບໍ່ສຳເລັດ"
        detail="ກະລຸນາກວດສອບການເຊື່ອມຕໍ່ ແລ້ວລອງໃໝ່"
      />
    );
  }

  if (state.status === "forbidden") {
    return (
      <FullPageMessage
        title="ບໍ່ມີສິດເຂົ້າເຖິງ"
        detail={`ບັນຊີ ${state.email ?? ""} ຍັງບໍ່ໄດ້ຮັບສິດ Admin`}
        action={<LogoutButton />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-blush-50">
      <header className="sticky top-0 z-10 border-b border-blush-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="text-lg font-bold text-plum-800">
            🌸Nampherng Flower Card
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{state.email}</span>
            <LogoutButton />
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

function FullPageMessage({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blush-50 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-plum-800">{title}</h1>
        {detail && <p className="text-sm text-gray-500">{detail}</p>}
        {action}
      </div>
    </main>
  );
}
