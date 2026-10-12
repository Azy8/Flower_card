import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import FlowerLoader from "@/src/components/flower-loader";
import LogoutButton from "@/src/components/logout-button";
import AdminNav from "@/src/components/admin/admin-nav";
import { Toaster } from "@/src/components/toast";
import { checkAdminPage } from "@/src/lib/auth";

export const metadata: Metadata = {
  title: "Admin · Flower Card",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <Suspense fallback={<FlowerLoader fullScreen />}>
        <AdminGuard>{children}</AdminGuard>
      </Suspense>
      {/* วางนอก Suspense: toast ยังแสดงต่อได้ระหว่างเปลี่ยนหน้า */}
      <Toaster />
    </>
  );
}

// ตรวจ session + สิทธิ์ admin ก่อนแสดงทุกหน้าในกลุ่ม (dashboard)
async function AdminGuard({ children }: { children: React.ReactNode }) {
  const result = await checkAdminPage();

  if (result.status === "error") {
    return (
      <FullPageMessage
        title="ກວດສອບສິດບໍ່ສຳເລັດ"
        detail="ກະລຸນາກາດສອບການເຊື່ອມຕໍ່ Supabase ແລ້ວລອງໃໝ້"
      />
    );
  }

  if (result.status === "forbidden") {
    return (
      <FullPageMessage
        title="ບໍ່ມີສິດເຂົ້າເຖິງ"
        detail={`ບັນຊີ ${result.email ?? ""} ຍັງບໍ່ໄດ້ຮັບສິດ Admin`}
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
            <span className="hidden text-sm text-gray-500 sm:inline">
              {result.user.email}
            </span>
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
