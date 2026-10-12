"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CardExperience from "@/src/components/card/card-experience";
import type { CardMusic } from "@/src/components/card/use-segment-audio";
import FlowerLoader from "@/src/components/flower-loader";
import { createClient } from "@/src/lib/supabase/client";
import {
  formatCardDate,
  publicImageUrl,
  publicMusicUrl,
  type PublicCard,
} from "@/src/lib/cards";

// หน้าสำหรับลูกค้า (ไม่ต้อง login) — เวอร์ชัน Firebase: /card?id=<slug>
// อ่านข้อมูลผ่านฟังก์ชัน get_public_card เท่านั้น (anon อ่านตารางตรงๆ ไม่ได้ตาม RLS)
export default function CardPage() {
  return (
    <Suspense fallback={<FlowerLoader fullScreen label="ກຳລັງເປີດຈົດໝາຍ..." />}>
      <CardLoader />
    </Suspense>
  );
}

type Loaded =
  | { status: "loading" }
  | { status: "not-found" }
  | {
      status: "ok";
      card: PublicCard;
      music: CardMusic | null;
    };

function CardLoader() {
  const slug = useSearchParams().get("id") ?? "";
  if (!/^[a-z0-9-]{8,80}$/.test(slug)) return <CardNotFound />;
  // key=slug: เปลี่ยนการ์ด → เริ่มสถานะ loading ใหม่
  return <CardContent key={slug} slug={slug} />;
}

function CardContent({ slug }: { slug: string }) {
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    createClient()
      .rpc("get_public_card", { p_slug: slug })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setState({ status: "not-found" });
          return;
        }
        const card = data as PublicCard;
        setState({
          status: "ok",
          card,
          // สร้าง object เพลงครั้งเดียว (hook เล่นเพลงผูกกับ reference นี้)
          music: card.music_path
            ? {
                src: publicMusicUrl(card.music_path),
                title: card.music_title ?? "",
                start: Number(card.music_start ?? 0),
                end: card.music_end != null ? Number(card.music_end) : null,
              }
            : null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return <FlowerLoader fullScreen label="ກຳລັງເປີດຈົດໝາຍ..." />;
  }
  if (state.status === "not-found") return <CardNotFound />;

  const { card, music } = state;
  return (
    <CardExperience
      title={card.title}
      message={card.message}
      caption={card.caption}
      date={formatCardDate(card.card_date ?? card.created_at)}
      images={card.images.map(publicImageUrl)}
      music={music}
    />
  );
}

function CardNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-blush-100 to-[#ead7f3] p-6">
      <div className="max-w-xs space-y-3 rounded-3xl bg-white/80 p-8 text-center shadow-sm">
        <p className="text-5xl">🥀</p>
        <h1 className="text-lg font-bold text-plum-800">ບໍ່ພົບກາດໃບນີ້</h1>
        <p className="text-sm text-plum-700/80">
          ກາດອາດຖືກປິດ ຫຼື ລິ້ງບໍ່ຖືກຕ້ອງ ກະລຸນາຕິດຕໍ່ຮ້ານດອກໄມ້
        </p>
      </div>
    </main>
  );
}
