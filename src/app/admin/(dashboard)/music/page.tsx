"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FlowerLoader from "@/src/components/flower-loader";
import { createClient } from "@/src/lib/supabase/client";
import { formatSeconds } from "@/src/lib/cards";

export default function MusicLibraryPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-plum-800">ຄັງເພງ</h1>
        <Link
          href="/admin/music/new"
          className="shrink-0 rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blush-600"
        >
          + ອັບໂຫລດເພງ
        </Link>
      </div>

      <TrackList />
    </div>
  );
}

type TrackRow = {
  id: string;
  title: string;
  default_start: number | null;
  default_end: number | null;
  greeting_cards: { count: number }[] | null;
};

function TrackList() {
  const [result, setResult] = useState<{ tracks: TrackRow[] | null; error: boolean } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    // นับจำนวนการ์ดที่ใช้แต่ละเพลงไปพร้อมกัน
    createClient()
      .from("music_tracks")
      .select("id, title, default_start, default_end, greeting_cards(count)")
      .order("title")
      .then(({ data, error }) => {
        if (!cancelled) setResult({ tracks: data as TrackRow[] | null, error: Boolean(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!result) return <FlowerLoader label="ກຳລັງໂຫລດເພງ..." />;
  const { tracks, error } = result;

  if (error) {
    return <p className="text-sm text-red-600">ໂຫລດລາຍການເພງບໍ່ສຳເລັດ</p>;
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-blush-200 bg-white p-8 text-center">
        <p className="text-3xl">🎵</p>
        <p className="mt-1 text-sm text-gray-500">ຍັງບໍ່ມີເພງໃນຄັງ</p>
        <p className="mt-1 text-xs text-gray-400">
          ອັບໂຫລດເພງໄວ້ຄັ້ງດຽວ ແລ້ວເລືອກໃຊ້ໄດ້ກັບທຸກກາດ
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-blush-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-blush-100">
      {tracks.map((t) => {
        const used = t.greeting_cards?.[0]?.count ?? 0;
        const start = Number(t.default_start ?? 0);
        const end = t.default_end != null ? Number(t.default_end) : null;
        return (
          <li key={t.id}>
            <Link
              href={`/admin/music/edit?id=${t.id}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-blush-50/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blush-100">
                🎵
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-plum-800">
                  {t.title}
                </span>
                <span className="block text-xs text-gray-400">
                  ທ່ອນ {formatSeconds(start)} – {end != null ? formatSeconds(end) : "ຈົບ"}
                  {" · "}ໃຊ້ໃນ {used} ກາດ
                </span>
              </span>
              <span className="text-gray-300">›</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
