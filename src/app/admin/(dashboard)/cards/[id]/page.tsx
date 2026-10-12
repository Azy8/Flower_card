import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import CardForm from "@/src/components/admin/card-form";
import CardDangerZone from "@/src/components/admin/card-danger-zone";
import QrPanel from "@/src/components/admin/qr-panel";
import FlowerLoader from "@/src/components/flower-loader";
import { createClient } from "@/src/lib/supabase/server";
import { getSiteUrl } from "@/src/lib/site-url";
import { getLibraryTracks } from "@/src/lib/tracks";

export default function EditCardPage({ params }: PageProps<"/admin/cards/[id]">) {
  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-blush-600 hover:underline">
        ← ກັບຄືນ
      </Link>
      <Suspense fallback={<FlowerLoader />}>
        <EditCard params={params} />
      </Suspense>
    </div>
  );
}

async function EditCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: card } = await supabase
    .from("greeting_cards")
    .select(
      "id, slug, title, message, caption, card_date, is_active, created_at, music_track_id, music_start, music_end, greeting_card_images(path, position)"
    )
    .eq("id", id)
    .order("position", { referencedTable: "greeting_card_images" })
    .maybeSingle();

  if (!card) notFound();
  const tracks = await getLibraryTracks(supabase);

  const cardUrl = `${await getSiteUrl()}/card/${card.slug}`;
  // QR ความละเอียดสูงสำหรับพิมพ์ (error correction H ทนรอยยับ/รอยเปื้อน)
  const qrDataUrl = await QRCode.toDataURL(cardUrl, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#4f3557", light: "#ffffff" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <QrPanel
          qrDataUrl={qrDataUrl}
          cardUrl={cardUrl}
          fileName={`flower-card-${card.slug}.png`}
          isActive={card.is_active}
        />
        <CardDangerZone id={card.id} />
      </aside>

      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-plum-800">ແກ້ໄຂກາດ</h1>
        <CardForm
          tracks={tracks}
          card={{
            id: card.id,
            title: card.title,
            message: card.message,
            caption: card.caption,
            cardDate: card.card_date ?? "",
            isActive: card.is_active,
            imagePaths: (card.greeting_card_images ?? []).map((i) => i.path),
            music: card.music_track_id
              ? {
                  trackId: card.music_track_id,
                  start: Number(card.music_start ?? 0),
                  end: card.music_end != null ? Number(card.music_end) : null,
                }
              : null,
          }}
        />
      </section>
    </div>
  );
}
