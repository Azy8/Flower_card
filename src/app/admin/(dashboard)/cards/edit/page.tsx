"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import CardForm from "@/src/components/admin/card-form";
import CardDangerZone from "@/src/components/admin/card-danger-zone";
import QrPanel from "@/src/components/admin/qr-panel";
import FlowerLoader from "@/src/components/flower-loader";
import type { LibraryTrack } from "@/src/components/admin/music-picker";
import { createClient } from "@/src/lib/supabase/client";
import { getLibraryTracks } from "@/src/lib/tracks";

// เวอร์ชัน Firebase: /admin/cards/edit?id=<uuid> (เว็บไฟล์นิ่งใช้ path แบบ [id] ไม่ได้)
export default function EditCardPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-blush-600 hover:underline">
        ← ກັບຄືນ
      </Link>
      <Suspense fallback={<FlowerLoader />}>
        <EditCard />
      </Suspense>
    </div>
  );
}

type CardData = {
  id: string;
  slug: string;
  title: string;
  message: string;
  caption: string;
  card_date: string | null;
  is_active: boolean;
  music_track_id: string | null;
  music_start: number | null;
  music_end: number | null;
  greeting_card_images: { path: string; position: number }[] | null;
};

type Loaded =
  | { status: "loading" }
  | { status: "not-found" }
  | {
      status: "ok";
      card: CardData;
      tracks: LibraryTrack[];
      cardUrl: string;
      qrDataUrl: string;
    };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function EditCard() {
  const id = useSearchParams().get("id") ?? "";
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!UUID.test(id)) {
        setState({ status: "not-found" });
        return;
      }
      setState({ status: "loading" });
      const supabase = createClient();
      const [{ data: card }, tracks] = await Promise.all([
        supabase
          .from("greeting_cards")
          .select(
            "id, slug, title, message, caption, card_date, is_active, music_track_id, music_start, music_end, greeting_card_images(path, position)"
          )
          .eq("id", id)
          .order("position", { referencedTable: "greeting_card_images" })
          .maybeSingle(),
        getLibraryTracks(supabase),
      ]);
      if (cancelled) return;
      if (!card) {
        setState({ status: "not-found" });
        return;
      }

      // ลิงก์ใน QR ใช้โดเมนที่เปิดอยู่ตอนนี้ (หรือ NEXT_PUBLIC_SITE_URL ถ้าตั้งไว้)
      // ใน ລາວ DNS ของค่ายมือถือหา *.web.app ไม่เจอ แต่ *.firebaseapp.com (เว็บเดียวกัน) เปิดได้
      // → QR ใช้ .firebaseapp.com เสมอ ลูกค้าจะสแกนแล้วเปิดได้โดยไม่ต้อง VPN
      const origin = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin)
        .replace(/\/+$/, "")
        .replace(/\.web\.app$/, ".firebaseapp.com");
      const cardUrl = `${origin}/card?id=${card.slug}`;
      // QR ความละเอียดสูงสำหรับพิมพ์ (error correction H ทนรอยยับ/รอยเปื้อน)
      const qrDataUrl = await QRCode.toDataURL(cardUrl, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#4f3557", light: "#ffffff" },
      });
      if (!cancelled) {
        setState({ status: "ok", card: card as CardData, tracks, cardUrl, qrDataUrl });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <FlowerLoader />;
  if (state.status === "not-found") {
    return <p className="text-sm text-gray-500">ບໍ່ພົບກາດນີ້</p>;
  }

  const { card, tracks, cardUrl, qrDataUrl } = state;

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
          key={card.id}
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
