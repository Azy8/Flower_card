import type { Metadata, Viewport } from "next";
import { Noto_Sans_Lao, Noto_Sans_Thai, Quicksand } from "next/font/google";
import "./globals.css";

// Quicksand: ละติน/เวียดนาม, Noto: ไทย/ลาว
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "vietnamese"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
});

const notoLao = Noto_Sans_Lao({
  variable: "--font-noto-lao",
  subsets: ["lao"],
});

export const metadata: Metadata = {
  title: "Flower Card 💌",
  description: "ກາດອວນພອນດິຈິຕອນ",
};

export const viewport: Viewport = {
  themeColor: "#f3d9f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${quicksand.variable} ${notoThai.variable} ${notoLao.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
