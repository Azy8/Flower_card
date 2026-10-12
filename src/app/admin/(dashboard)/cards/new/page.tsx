"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CardForm from "@/src/components/admin/card-form";
import FlowerLoader from "@/src/components/flower-loader";
import type { LibraryTrack } from "@/src/components/admin/music-picker";
import { createClient } from "@/src/lib/supabase/client";
import { getLibraryTracks } from "@/src/lib/tracks";

export default function NewCardPage() {
  const [tracks, setTracks] = useState<LibraryTrack[] | null>(null);

  // โหลดรายการเพลงในคลังให้เลือก
  useEffect(() => {
    let cancelled = false;
    getLibraryTracks(createClient()).then((t) => !cancelled && setTracks(t));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin" className="text-sm text-blush-600 hover:underline">
        ← ກັບຄືນ
      </Link>
      <h1 className="text-2xl font-bold text-plum-800">ສ້າງກາດໃໝ່</h1>
      {tracks ? <CardForm tracks={tracks} /> : <FlowerLoader />}
    </div>
  );
}
