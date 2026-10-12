// โหลดดิ้ง: ดอกไม้ 🌸 สามดอก ขยายเล็ก-ใหญ่ไล่กันไปทีละดอก
export default function FlowerLoader({
  label = "ກຳລັງໂຫລດ...",
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  const loader = (
    <div role="status" className="flex flex-col items-center gap-3">
      <div className="flex items-end gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-bloom inline-block text-2xl"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            🌸
          </span>
        ))}
      </div>
      <span className="text-sm text-plum-700/70">{label}</span>
    </div>
  );

  if (!fullScreen) return <div className="flex justify-center py-10">{loader}</div>;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[#f7e3f3] to-[#e6d3f2]">
      {loader}
    </main>
  );
}
