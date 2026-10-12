import Link from "next/link";
import TrackForm from "@/src/components/admin/track-form";

export default function NewTrackPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/music" className="text-sm text-blush-600 hover:underline">
        ← ກັບຄືນ
      </Link>
      <h1 className="text-xl font-bold text-plum-800">ອັບໂຫລດເພງເຂົ້າຄັງ</h1>
      <TrackForm />
    </div>
  );
}
