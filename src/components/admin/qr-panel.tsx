"use client";

import { useState } from "react";

export default function QrPanel({
  qrDataUrl,
  cardUrl,
  fileName,
  isActive,
}: {
  qrDataUrl: string;
  cardUrl: string;
  fileName: string;
  isActive: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // เบราว์เซอร์ไม่อนุญาต clipboard → ให้ผู้ใช้คัดลอกเองจากช่องลิงก์
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blush-100">
      <h2 className="font-semibold text-plum-800">QR Code</h2>

      {/* eslint-disable-next-line @next/next/no-img-element -- data URL ไม่ต้องผ่าน image optimizer */}
      <img
        src={qrDataUrl}
        alt="QR Code ของการ์ดนี้"
        className="mx-auto aspect-square w-full max-w-64 rounded-xl ring-1 ring-blush-100"
      />

      {!isActive && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
          การ์ดนี้ปิดอยู่ ลูกค้าสแกนแล้วจะไม่เห็นเนื้อหา
        </p>
      )}

      <a
        href={qrDataUrl}
        download={fileName}
        className="block w-full rounded-full bg-blush-500 p-2.5 text-center text-sm font-semibold text-white hover:bg-blush-600"
      >
        ⬇ ໂຫລດ QR (PNG)
      </a>

      <div className="flex gap-2">
        <input
          readOnly
          value={cardUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-blush-200 px-2 py-1.5 text-xs text-gray-600"
        />
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 rounded-lg border border-blush-200 px-3 text-xs font-medium text-plum-800"
        >
          {copied ? "ສຳເນົາແລ້ວ" : "ສຳເນົາ"}
        </button>
      </div>

      <a
        href={cardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm text-blush-600 hover:underline"
      >
        ເປີດເບິ່ງຕົວຢ່າງ ↗
      </a>
    </div>
  );
}
