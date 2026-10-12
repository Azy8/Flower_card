import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import CardExperience from "@/src/components/card/card-experience";
import FlowerLoader from "@/src/components/flower-loader";
import { createPublicClient } from "@/src/lib/supabase/public";
import {
  formatCardDate,
  publicImageUrl,
  publicMusicUrl,
  type PublicCard,
} from "@/src/lib/cards";

// ไม่ใส่หัวข้อการ์ดใน metadata เพื่อไม่ให้ข้อความส่วนตัวไปโผล่ใน link preview
export const metadata: Metadata = {
  title: "💌 ມີຈົດໝາຍຫາເຈົ້າ",
  robots: { index: false, follow: false },
};

// หน้าสำหรับลูกค้า: ไม่ต้อง login (proxy.ts ข้าม path /card ด้วย)
export default function CardPage({ params }: PageProps<"/card/[slug]">) {
  return (
    <Suspense fallback={<FlowerLoader fullScreen label="ກຳລັງເປີດຈົດໝາຍ..." />}>
      <CardLoader params={params} />
    </Suspense>
  );
}

async function CardLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{8,80}$/.test(slug)) notFound();

  await connection();
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_card", { p_slug: slug });
  if (error || !data) notFound();

  const card = data as PublicCard;

  return (
    <CardExperience
      title={card.title}
      message={card.message}
      caption={card.caption}
      date={formatCardDate(card.card_date ?? card.created_at)}
      images={card.images.map(publicImageUrl)}
      music={
        card.music_path
          ? {
              src: publicMusicUrl(card.music_path),
              title: card.music_title ?? "",
              start: Number(card.music_start ?? 0),
              end: card.music_end != null ? Number(card.music_end) : null,
            }
          : null
      }
    />
  );
}
