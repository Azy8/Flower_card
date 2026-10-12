export default function CardNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-blush-100 to-[#ead7f3] p-6">
      <div className="max-w-xs space-y-3 rounded-3xl bg-white/80 p-8 text-center shadow-sm">
        <p className="text-5xl">🥀</p>
        <h1 className="text-lg font-bold text-plum-800">ไม่พบการ์ดใบนี้</h1>
        <p className="text-sm text-plum-700/80">
          การ์ดอาจถูกปิดหรือลิงก์ไม่ถูกต้อง กรุณาติดต่อร้านดอกไม้
        </p>
      </div>
    </main>
  );
}
