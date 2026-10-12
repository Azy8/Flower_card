"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCard } from "@/src/app/admin/actions";
import { confirmDialog, toast } from "@/src/components/toast";

export default function CardDangerZone({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const ok = await confirmDialog({
      title: "ລົບກາດນີ້ບໍ?",
      message: "ກາດ ແລະ ຮູບທັງໝົດຈະຖືກລົບ. QR ທີ່ພິມໄປແລ້ວຈະໃຊ້ບໍ່ໄດ້ອີກ",
      confirmText: "ລົບ",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError("");
    const result = await deleteCard(id);
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    toast.success("ລົບກາດສຳເລັດ");
    router.replace("/admin");
  }

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-red-100">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full rounded-full border border-red-200 p-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {deleting ? "ກຳລັງລົບ..." : "ລົບກາດ"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
