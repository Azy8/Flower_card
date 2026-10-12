import type { Metadata } from "next";
import AdminGuard from "@/src/components/admin/admin-guard";
import { Toaster } from "@/src/components/toast";

export const metadata: Metadata = {
  title: "Admin · Flower Card",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      {/* ตรวจ login + สิทธิ์ admin ในเบราว์เซอร์ (เวอร์ชัน Firebase) */}
      <AdminGuard>{children}</AdminGuard>
      {/* วางนอก guard: toast ยังแสดงต่อได้ระหว่างเปลี่ยนหน้า */}
      <Toaster />
    </>
  );
}
