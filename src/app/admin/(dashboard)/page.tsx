import Image from "next/image";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import FlowerLoader from "@/src/components/flower-loader";
import DateInput from "@/src/components/date-input";
import { createClient } from "@/src/lib/supabase/server";
import { formatCardDate, publicImageUrl } from "@/src/lib/cards";

const PAGE_SIZE = 10;

type Status = "all" | "active" | "inactive";

type Filters = {
  from: string;
  to: string;
  status: Status;
  page: number;
};

export default function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-plum-800">ກາດອວນພອນ</h1>
        <Link
          href="/admin/cards/new"
          className="shrink-0 rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blush-600"
        >
          + ສ້າງກາດໃໝ່
        </Link>
      </div>

      <Suspense fallback={<FlowerLoader label="ກຳລັງໂຫລດກາດ..." />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// ---------- อ่านและตรวจสอบค่าจาก URL (ไม่เชื่อค่าจากผู้ใช้โดยตรง) ----------

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const from = isValidDate(sp.from) ? sp.from : "";
  const to = isValidDate(sp.to) ? sp.to : "";
  const status: Status =
    sp.status === "active" || sp.status === "inactive" ? sp.status : "all";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  return { from, to, status, page };
}

function buildHref(filters: Filters, patch: Partial<Filters>) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.status !== "all") params.set("status", next.status);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

// กรองตามวันที่สร้างการ์ด (created_at) โดยนับวันตามเวลาไทย/ลาว (UTC+7)
function createdRange(from: string, to: string) {
  return {
    gte: from ? `${from}T00:00:00+07:00` : null,
    lte: to ? `${to}T23:59:59.999+07:00` : null,
  };
}

// ---------- Dashboard ----------

async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const supabase = await createClient();
  const range = createdRange(filters.from, filters.to);

  // นับจำนวนตามช่วงวันที่ที่เลือก (ไม่ดึงข้อมูลแถว)
  const countQuery = (status: Status) => {
    let q = supabase.from("greeting_cards").select("id", { count: "exact", head: true });
    if (range.gte) q = q.gte("created_at", range.gte);
    if (range.lte) q = q.lte("created_at", range.lte);
    if (status !== "all") q = q.eq("is_active", status === "active");
    return q;
  };

  const offset = (filters.page - 1) * PAGE_SIZE;
  let listQuery = supabase
    .from("greeting_cards")
    .select(
      "id, title, is_active, created_at, greeting_card_images(path, position)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "greeting_card_images" })
    .limit(1, { referencedTable: "greeting_card_images" })
    .range(offset, offset + PAGE_SIZE - 1);
  if (range.gte) listQuery = listQuery.gte("created_at", range.gte);
  if (range.lte) listQuery = listQuery.lte("created_at", range.lte);
  if (filters.status !== "all")
    listQuery = listQuery.eq("is_active", filters.status === "active");

  const [total, active, inactive, list] = await Promise.all([
    countQuery("all"),
    countQuery("active"),
    countQuery("inactive"),
    listQuery,
  ]);

  const stats: { key: Status; label: string; value: number; tone: string }[] = [
    { key: "all", label: "ທັງໝົດ", value: total.count ?? 0, tone: "text-plum-800" },
    { key: "active", label: "ເປີດໃຊ້ງານ", value: active.count ?? 0, tone: "text-emerald-600" },
    { key: "inactive", label: "ປິດໃຊ້ງານ", value: inactive.count ?? 0, tone: "text-gray-500" },
  ];

  const totalRows = list.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const cards = list.data ?? [];

  return (
    <div className="space-y-4">
      {/* สรุปจำนวน (กดเพื่อกรองสถานะ) */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => {
          const selected = filters.status === s.key;
          return (
            <Link
              key={s.key}
              href={buildHref(filters, { status: s.key, page: 1 })}
              className={`rounded-xl bg-white p-3 text-center shadow-sm ring-1 transition ${
                selected ? "ring-2 ring-blush-400" : "ring-blush-100"
              }`}
            >
              <p className={`text-2xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </Link>
          );
        })}
      </div>

      {/* กรองตามช่วงวันที่ */}
      <Form
        action="/admin"
        className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-blush-100"
      >
        {filters.status !== "all" && (
          <input type="hidden" name="status" value={filters.status} />
        )}
        <label className="min-w-0 flex-1 space-y-1">
          <span className="block text-xs text-gray-500">ຈາກວັນທີ</span>
          <DateInput
            key={filters.from}
            name="from"
            defaultValue={filters.from}
            className="rounded-lg border border-blush-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="min-w-0 flex-1 space-y-1">
          <span className="block text-xs text-gray-500">ຫາວັນທີ</span>
          <DateInput
            key={filters.to}
            name="to"
            defaultValue={filters.to}
            className="rounded-lg border border-blush-200 px-2 py-1.5 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-blush-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blush-600"
          >
            ຄົ້ນຫາ
          </button>
          {(filters.from || filters.to) && (
            <Link
              href={buildHref(filters, { from: "", to: "", page: 1 })}
              className="rounded-lg border border-blush-200 px-3 py-1.5 text-sm text-plum-700"
            >
              ລ້າງ
            </Link>
          )}
        </div>
      </Form>

      {/* PGRST103 = เลขหน้าเกินจำนวนที่มี → แสดงเป็นรายการว่าง */}
      {list.error && list.error.code !== "PGRST103" ? (
        <p className="text-sm text-red-600">ໂຫລດລາຍການບໍ່ສຳເລັດ</p>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-blush-200 bg-white p-8 text-center">
          <p className="text-3xl">💌</p>
          <p className="mt-1 text-sm text-gray-500">ບໍ່ພົບກາດ</p>
          {filters.page > 1 && (
            <Link
              href={buildHref(filters, { page: 1 })}
              className="mt-2 inline-block text-sm text-blush-600 hover:underline"
            >
              ກັບໄປໜ້າ 1
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-blush-100">
          <table className="w-full text-sm">
            <thead className="bg-blush-50 text-left text-xs text-gray-500">
              <tr>
                <th className="w-14 px-3 py-2 font-medium">ຮູບ</th>
                <th className="px-2 py-2 font-medium">ຫົວຂໍ້</th>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">ວັນທີສ້າງ</th>
                <th className="px-3 py-2 text-right font-medium">ສະຖານະ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blush-100">
              {cards.map((card) => {
                const cover = card.greeting_card_images?.[0]?.path;
                // แสดงวันที่สร้าง ให้ตรงกับตัวกรอง
                const date = formatCardDate(card.created_at);
                const href = `/admin/cards/${card.id}`;
                return (
                  <tr key={card.id} className="hover:bg-blush-50/60">
                    <td className="px-3 py-2">
                      <Link href={href} className="relative block h-10 w-10 overflow-hidden rounded-lg bg-blush-100">
                        {cover ? (
                          <Image
                            src={publicImageUrl(cover)}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center">💐</span>
                        )}
                      </Link>
                    </td>
                    <td className="max-w-0 px-2 py-2">
                      <Link href={href} className="block">
                        <span className="block truncate font-medium text-plum-800">
                          {card.title}
                        </span>
                        <span className="block text-xs text-gray-400 sm:hidden">{date}</span>
                      </Link>
                    </td>
                    <td className="hidden whitespace-nowrap px-2 py-2 text-gray-500 sm:table-cell">
                      {date}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${
                          card.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {card.is_active ? "ເປີດ" : "ປິດ"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-2 text-sm" aria-label="ໜ້າ">
          <PageLink
            href={buildHref(filters, { page: filters.page - 1 })}
            disabled={filters.page <= 1}
          >
            ‹ ກ່ອນໜ້າ
          </PageLink>
          <span className="tabular-nums text-gray-500">
            ໜ້າ {filters.page} / {totalPages}
          </span>
          <PageLink
            href={buildHref(filters, { page: filters.page + 1 })}
            disabled={filters.page >= totalPages}
          >
            ຖັດໄປ ›
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-blush-100 px-3 py-1.5 text-gray-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-blush-200 bg-white px-3 py-1.5 text-plum-700 hover:bg-blush-50"
    >
      {children}
    </Link>
  );
}
