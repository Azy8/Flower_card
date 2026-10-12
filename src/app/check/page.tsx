"use client";

import { useEffect, useState } from "react";

// หน้าตรวจเครือข่าย: เปิดบนมือถือเพื่อดูว่าเชื่อมต่อส่วนไหนได้/ไม่ได้
// (ไม่แสดงข้อมูลลับ — ทดสอบเฉพาะ endpoint สาธารณะ)
type Result = { label: string; status: "wait" | "ok" | "fail"; detail?: string };

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const TESTS: { label: string; run: () => Promise<Response> }[] = [
  {
    label: "Supabase (ຖານຂໍ້ມູນ)",
    run: () => fetch(`${SUPABASE}/auth/v1/health`, { headers: { apikey: KEY } }),
  },
  {
    label: "Supabase Storage (ຮູບ/ເພງ)",
    run: () => fetch(`${SUPABASE}/storage/v1/version`, { headers: { apikey: KEY } }),
  },
];

async function withTimeout(p: Promise<Response>, ms: number) {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export default function CheckPage() {
  const [results, setResults] = useState<Result[]>(
    TESTS.map((t) => ({ label: t.label, status: "wait" }))
  );

  useEffect(() => {
    TESTS.forEach((t, i) => {
      const started = performance.now();
      withTimeout(t.run(), 10000)
        .then((res) => ({
          status: (res.ok ? "ok" : "fail") as Result["status"],
          detail: `HTTP ${res.status} · ${Math.round(performance.now() - started)}ms`,
        }))
        .catch((e: unknown) => ({
          status: "fail" as const,
          detail: e instanceof Error ? e.message : "error",
        }))
        .then((r) =>
          setResults((prev) => prev.map((p, j) => (j === i ? { ...p, ...r } : p)))
        );
    });
  }, []);

  return (
    <main className="mx-auto max-w-sm space-y-3 p-6">
      <h1 className="text-lg font-bold text-plum-800">ກວດການເຊື່ອມຕໍ່</h1>
      <Row label="ເວັບໄຊ (Firebase)" status="ok" detail="ເປີດໜ້ານີ້ໄດ້ = ເຊື່ອມຕໍ່ໄດ້" />
      {results.map((r) => (
        <Row key={r.label} {...r} />
      ))}
      <p className="pt-2 text-xs text-gray-400">
        ໃຫ້ແຄັບໜ້າຈໍນີ້ສົ່ງໃຫ້ຜູ້ພັດທະນາ (ປິດ VPN ກ່ອນເປີດ)
      </p>
    </main>
  );
}

function Row({ label, status, detail }: Result) {
  const icon = status === "ok" ? "✅" : status === "fail" ? "❌" : "⏳";
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-blush-100">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-medium text-plum-800">{label}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
      </div>
    </div>
  );
}
