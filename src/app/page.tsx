"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FlowerLoader from "@/src/components/flower-loader";

// หน้าแรก → หน้า admin (ถ้ายังไม่ login จะถูกส่งไปหน้า login)
// (บน Firebase มี redirect ใน firebase.json อยู่แล้ว — หน้านี้เผื่อเปิดผ่าน next dev)
export default function Redirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return <FlowerLoader fullScreen />;
}
