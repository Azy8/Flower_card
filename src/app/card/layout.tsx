import type { Metadata } from "next";

// ไม่ใส่หัวข้อการ์ดใน metadata เพื่อไม่ให้ข้อความส่วนตัวไปโผล่ใน link preview
export const metadata: Metadata = {
  title: "💌 ມີຈົດໝາຍເຖິງເຈົ້າ",
  robots: { index: false, follow: false },
};

export default function CardLayout({ children }: LayoutProps<"/card">) {
  return children;
}
