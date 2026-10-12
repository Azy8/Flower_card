import Link from "next/link";
import { Suspense } from "react";
import CardForm from "@/src/components/admin/card-form";
import FlowerLoader from "@/src/components/flower-loader";
import { createClient } from "@/src/lib/supabase/server";
import { getLibraryTracks } from "@/src/lib/tracks";

export default function NewCardPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin" className="text-sm text-blush-600 hover:underline">
        ← ກັບຄືນ
      </Link>
      <h1 className="text-2xl font-bold text-plum-800">ສ້າງກາດໃໝ່</h1>
      <Suspense fallback={<FlowerLoader />}>
        <NewCardForm />
      </Suspense>
    </div>
  );
}

// โหลดรายการเพลงในคลังให้เลือก
async function NewCardForm() {
  const supabase = await createClient();
  const tracks = await getLibraryTracks(supabase);
  return <CardForm tracks={tracks} />;
}
