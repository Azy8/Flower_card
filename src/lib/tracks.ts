import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LibraryTrack } from "@/src/components/admin/music-picker";
import { publicMusicUrl } from "@/src/lib/cards";

// รายการเพลงในคลัง สำหรับให้เลือกในฟอร์มการ์ด
export async function getLibraryTracks(supabase: SupabaseClient): Promise<LibraryTrack[]> {
  const { data } = await supabase
    .from("music_tracks")
    .select("id, title, path, default_start, default_end")
    .order("title");

  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    url: publicMusicUrl(t.path),
    defaultStart: Number(t.default_start ?? 0),
    defaultEnd: t.default_end != null ? Number(t.default_end) : null,
  }));
}
