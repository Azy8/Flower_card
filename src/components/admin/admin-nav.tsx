"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "💌 ກາດ", match: (p: string) => !p.startsWith("/admin/music") },
  { href: "/admin/music", label: "🎵 ຄັງເພງ", match: (p: string) => p.startsWith("/admin/music") },
];

// แท็บเมนูใต้ header (กดง่ายบนมือถือ)
export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active ? "bg-blush-500 text-white" : "text-plum-700 hover:bg-blush-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
