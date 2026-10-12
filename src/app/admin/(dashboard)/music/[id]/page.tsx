import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FlowerLoader from "@/src/components/flower-loader";
import TrackForm from "@/src/components/admin/track-form";
import { createClient } from "@/src/lib/supabase/server";
import { publicMusicUrl } from "@/src/lib/cards";

export default function EditTrackPage({ params }: PageProps<"/admin/music/[id]">) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/music" className="text-sm text-blush-600 hover:underline">
        ← ກັບຄືນ
      </Link>
      <h1 className="text-xl font-bold text-plum-800">ແກ້ໄຂເພງ</h1>
      <Suspense fallback={<FlowerLoader />}>
        <EditTrack params={params} />
      </Suspense>
    </div>
  );
}

async function EditTrack({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: track } = await supabase
    .from("music_tracks")
    .select("id, title, path, default_start, default_end, greeting_cards(count)")
    .eq("id", id)
    .maybeSingle();

  if (!track) notFound();

  return (
    <TrackForm
      track={{
        id: track.id,
        title: track.title,
        url: publicMusicUrl(track.path),
        start: Number(track.default_start ?? 0),
        end: track.default_end != null ? Number(track.default_end) : null,
        usedBy: (track.greeting_cards as { count: number }[] | null)?.[0]?.count ?? 0,
      }}
    />
  );
}
