"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FlowerLoader from "@/src/components/flower-loader";
import TrackForm from "@/src/components/admin/track-form";
import { createClient } from "@/src/lib/supabase/client";
import { publicMusicUrl } from "@/src/lib/cards";

// เวอร์ชัน Firebase: /admin/music/edit?id=<uuid>
export default function EditTrackPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/music" className="text-sm text-blush-600 hover:underline">
        ← ກັບຄືນ
      </Link>
      <h1 className="text-xl font-bold text-plum-800">ແກ້ໄຂເພງ</h1>
      <Suspense fallback={<FlowerLoader />}>
        <EditTrack />
      </Suspense>
    </div>
  );
}

type TrackData = {
  id: string;
  title: string;
  url: string;
  start: number;
  end: number | null;
  usedBy: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function EditTrack() {
  const id = useSearchParams().get("id") ?? "";
  if (!UUID.test(id)) return <p className="text-sm text-gray-500">ບໍ່ພົບເພງນີ້</p>;
  return <TrackLoader key={id} id={id} />;
}

function TrackLoader({ id }: { id: string }) {
  const [track, setTrack] = useState<TrackData | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("music_tracks")
      .select("id, title, path, default_start, default_end, greeting_cards(count)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTrack(
          data
            ? {
                id: data.id,
                title: data.title,
                url: publicMusicUrl(data.path),
                start: Number(data.default_start ?? 0),
                end: data.default_end != null ? Number(data.default_end) : null,
                usedBy:
                  (data.greeting_cards as { count: number }[] | null)?.[0]?.count ?? 0,
              }
            : null
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (track === "loading") return <FlowerLoader />;
  if (!track) return <p className="text-sm text-gray-500">ບໍ່ພົບເພງນີ້</p>;
  return <TrackForm key={track.id} track={track} />;
}
