// ฟังก์ชันจัดการข้อมูลฝั่ง admin — เวอร์ชัน Firebase (เว็บไฟล์นิ่ง ไม่มีเซิร์ฟเวอร์)
// ทำงานในเบราว์เซอร์ผ่าน Supabase client โดยตรง
// ⚠️ การตรวจสอบในไฟล์นี้มีไว้ให้ผู้ใช้เห็น error ที่อ่านเข้าใจ — ความปลอดภัยจริงอยู่ที่
//    RLS + constraint ในฐานข้อมูล (เฉพาะ admin เขียนได้, ตรวจรูปแบบข้อมูลซ้ำทุกครั้ง)

import { createClient } from "@/src/lib/supabase/client";
import {
  CARD_IMAGE_BUCKET,
  CARD_MUSIC_BUCKET,
  IMAGE_PATH_PATTERN,
  LIMITS,
  MAX_IMAGES_PER_CARD,
  MUSIC_PATH_PATTERN,
} from "@/src/lib/cards";

export type CardInput = {
  title: string;
  message: string;
  caption: string;
  // วันสำคัญที่แสดงบนการ์ด รูปแบบ YYYY-MM-DD ("" = ใช้วันที่สร้างการ์ด)
  cardDate: string;
  isActive: boolean;
  // path ของรูปใน Storage เรียงตามลำดับที่จะแสดง
  imagePaths: string[];
  // เพลงจากคลัง (null = ไม่มีเพลง) — เล่นเฉพาะท่อน start → end (วินาที)
  music: { trackId: string; start: number; end: number | null } | null;
};

export type TrackInput = {
  title: string;
  start: number;
  end: number | null;
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// log เฉพาะ code/message ของ DB ลง console (ไม่ log ข้อมูลการ์ดหรือ token)
function logDbError(where: string, error: { code?: string; message?: string } | null) {
  console.error(`[${where}]`, error?.code ?? "", error?.message ?? "no data returned");
}

// slug สุ่ม 16 ตัว [a-z0-9] จาก crypto.getRandomValues (CSPRNG ของเบราว์เซอร์) — เดาลิงก์การ์ดของคนอื่นไม่ได้
// ใช้ rejection sampling กันการกระจายตัวไม่เท่ากัน (modulo bias)
function generateSlug() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const limit = 256 - (256 % alphabet.length);
  let slug = "";
  while (slug.length < 16) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    for (const b of bytes) {
      if (b < limit && slug.length < 16) slug += alphabet[b % alphabet.length];
    }
  }
  return slug;
}

// ตรวจว่า login อยู่และเป็น admin (เพื่อแสดง error ที่ชัดเจน — RLS กันซ้ำอีกชั้น)
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) throw new Error("FORBIDDEN");
  return { supabase, user };
}

// ท่อนเพลง: start >= 0, end ว่างได้ หรือต้องมากกว่า start
function validateSegment(start: unknown, end: unknown): string | null {
  if (typeof start !== "number" || !Number.isFinite(start) || start < 0 || start > 99999)
    return "ຈຸດເລີ່ມເພງບໍ່ຖືກຕ້ອງ";
  if (
    end !== null &&
    (typeof end !== "number" || !Number.isFinite(end) || end <= start || end > 99999)
  )
    return "ຈຸດຈົບເພງຕ້ອງຫຼາຍກວ່າຈຸດເລີ່ມ";
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ตรวจสอบข้อมูลฝั่ง server เสมอ (ไม่เชื่อข้อมูลจาก client)
function validate(input: CardInput): string | null {
  const title = input.title?.trim() ?? "";
  if (!title) return "ກະລຸນາປ້ອນຫົວຂໍ້";
  if (title.length > LIMITS.title) return `หัวข้อยาวได้ไม่เกิน ${LIMITS.title} ตัวอักษร`;
  if ((input.message ?? "").length > LIMITS.message)
    return `ข้อความยาวได้ไม่เกิน ${LIMITS.message} ตัวอักษร`;
  if ((input.caption ?? "").length > LIMITS.caption)
    return `ข้อความใต้รูปยาวได้ไม่เกิน ${LIMITS.caption} ตัวอักษร`;
  if (input.cardDate && !isValidDate(input.cardDate)) return "วันที่ไม่ถูกต้อง";
  if (!Array.isArray(input.imagePaths) || input.imagePaths.length > MAX_IMAGES_PER_CARD)
    return `ใส่รูปได้ไม่เกิน ${MAX_IMAGES_PER_CARD} รูป`;
  if (!input.imagePaths.every((p) => typeof p === "string" && IMAGE_PATH_PATTERN.test(p)))
    return "ข้อมูลรูปภาพไม่ถูกต้อง";
  if (new Set(input.imagePaths).size !== input.imagePaths.length)
    return "มีรูปซ้ำกัน";
  if (input.music) {
    if (typeof input.music.trackId !== "string" || !UUID_PATTERN.test(input.music.trackId))
      return "ຂໍ້ມູນເພງບໍ່ຖືກຕ້ອງ";
    const segmentError = validateSegment(input.music.start, input.music.end);
    if (segmentError) return segmentError;
  }
  return null;
}

// YYYY-MM-DD ที่เป็นวันที่จริง (กัน 2026-02-31)
function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

function toRow(input: CardInput) {
  return {
    title: input.title.trim(),
    message: input.message ?? "",
    caption: (input.caption ?? "").trim(),
    card_date: input.cardDate || null,
    is_active: Boolean(input.isActive),
    music_track_id: input.music?.trackId ?? null,
    music_start: input.music ? round2(input.music.start) : 0,
    music_end: input.music?.end != null ? round2(input.music.end) : null,
  };
}

// ---------------------------------------------------------------- การ์ด

export async function createCard(
  input: CardInput
): Promise<ActionResult<{ id: string }>> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const { supabase, user } = await requireAdmin();

  // ลองใหม่เผื่อ slug ชน (โอกาสต่ำมาก)
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: card, error } = await supabase
      .from("greeting_cards")
      .insert({ ...toRow(input), slug: generateSlug(), created_by: user.id })
      .select("id")
      .single();

    if (error?.code === "23505") continue; // unique violation
    if (error || !card) {
      logDbError("createCard", error);
      return { ok: false, error: "บันทึกการ์ดไม่สำเร็จ" };
    }

    if (input.imagePaths.length > 0) {
      const { error: imgError } = await supabase
        .from("greeting_card_images")
        .insert(
          input.imagePaths.map((path, position) => ({
            card_id: card.id,
            path,
            position,
          }))
        );
      if (imgError) {
        logDbError("createCard:images", imgError);
        await supabase.from("greeting_cards").delete().eq("id", card.id);
        return { ok: false, error: "บันทึกรูปภาพไม่สำเร็จ" };
      }
    }

    return { ok: true, data: { id: card.id } };
  }

  return { ok: false, error: "สร้างลิงก์การ์ดไม่สำเร็จ กรุณาลองใหม่" };
}

export async function updateCard(
  id: string,
  input: CardInput
): Promise<ActionResult> {
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "ไม่พบการ์ด" };
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("greeting_cards")
    .update(toRow(input))
    .eq("id", id);
  if (error) {
    logDbError("updateCard", error);
    return { ok: false, error: "บันทึกการ์ดไม่สำเร็จ" };
  }

  const { data: oldImages } = await supabase
    .from("greeting_card_images")
    .select("path")
    .eq("card_id", id);
  const oldPaths = (oldImages ?? []).map((i) => i.path as string);

  // แทนที่ลำดับรูปทั้งหมดด้วยลำดับใหม่
  const { error: delError } = await supabase
    .from("greeting_card_images")
    .delete()
    .eq("card_id", id);
  if (delError) {
    logDbError("updateCard:deleteImages", delError);
    return { ok: false, error: "บันทึกรูปภาพไม่สำเร็จ" };
  }

  if (input.imagePaths.length > 0) {
    const { error: insError } = await supabase
      .from("greeting_card_images")
      .insert(
        input.imagePaths.map((path, position) => ({ card_id: id, path, position }))
      );
    if (insError) {
      logDbError("updateCard:insertImages", insError);
      return { ok: false, error: "บันทึกรูปภาพไม่สำเร็จ" };
    }
  }

  // ลบไฟล์ที่ถูกเอาออกจากการ์ด
  const removed = oldPaths.filter((p) => !input.imagePaths.includes(p));
  if (removed.length > 0) {
    await supabase.storage.from(CARD_IMAGE_BUCKET).remove(removed);
  }

  return { ok: true, data: undefined };
}

export async function deleteCard(id: string): Promise<ActionResult> {
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "ไม่พบการ์ด" };
  const { supabase } = await requireAdmin();

  const { data: images } = await supabase
    .from("greeting_card_images")
    .select("path")
    .eq("card_id", id);

  // เพลงอยู่ในคลังกลาง จึงไม่ลบไฟล์เพลงตามการ์ด
  const { error } = await supabase.from("greeting_cards").delete().eq("id", id);
  if (error) return { ok: false, error: "ລົບກາດບໍ່ສຳເລັດ" };

  const paths = (images ?? []).map((i) => i.path as string);
  if (paths.length > 0) {
    await supabase.storage.from(CARD_IMAGE_BUCKET).remove(paths);
  }

  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------- คลังเพลง

function validateTrack(input: TrackInput): string | null {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return "ກະລຸນາໃສ່ຊື່ເພງ";
  if (title.length > LIMITS.musicTitle)
    return `ຊື່ເພງຍາວໄດ້ບໍ່ເກີນ ${LIMITS.musicTitle} ຕົວອັກສອນ`;
  return validateSegment(input.start, input.end);
}

export async function createTrack(
  path: string,
  input: TrackInput
): Promise<ActionResult<{ id: string }>> {
  if (typeof path !== "string" || !MUSIC_PATH_PATTERN.test(path))
    return { ok: false, error: "ຂໍ້ມູນໄຟລ໌ເພງບໍ່ຖືກຕ້ອງ" };
  const invalid = validateTrack(input);
  if (invalid) return { ok: false, error: invalid };

  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase
    .from("music_tracks")
    .insert({
      path,
      title: input.title.trim(),
      default_start: round2(input.start),
      default_end: input.end != null ? round2(input.end) : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logDbError("createTrack", error);
    return { ok: false, error: "ບັນທຶກເພງບໍ່ສຳເລັດ" };
  }

  return { ok: true, data: { id: data.id } };
}

export async function updateTrack(id: string, input: TrackInput): Promise<ActionResult> {
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "ບໍ່ພົບເພງ" };
  const invalid = validateTrack(input);
  if (invalid) return { ok: false, error: invalid };

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("music_tracks")
    .update({
      title: input.title.trim(),
      default_start: round2(input.start),
      default_end: input.end != null ? round2(input.end) : null,
    })
    .eq("id", id);

  if (error) {
    logDbError("updateTrack", error);
    return { ok: false, error: "ບັນທຶກເພງບໍ່ສຳເລັດ" };
  }

  return { ok: true, data: undefined };
}

// ลบเพลงออกจากคลัง: การ์ดที่ใช้เพลงนี้จะกลายเป็นไม่มีเพลง (on delete set null)
export async function deleteTrack(id: string): Promise<ActionResult> {
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "ບໍ່ພົບເພງ" };
  const { supabase } = await requireAdmin();

  const { data: track } = await supabase
    .from("music_tracks")
    .select("path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("music_tracks").delete().eq("id", id);
  if (error) {
    logDbError("deleteTrack", error);
    return { ok: false, error: "ລົບເພງບໍ່ສຳເລັດ" };
  }

  if (track?.path) {
    await supabase.storage.from(CARD_MUSIC_BUCKET).remove([track.path as string]);
  }

  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------- ไฟล์ค้าง

// ลบไฟล์ที่อัปโหลดไปแล้วแต่บันทึกไม่สำเร็จ (กันไฟล์ค้าง) — ลบเฉพาะไฟล์ที่ยังไม่ถูกใช้
export async function discardUploads(paths: string[]): Promise<void> {
  const images = paths.filter((p) => IMAGE_PATH_PATTERN.test(p));
  const music = paths.filter((p) => MUSIC_PATH_PATTERN.test(p));
  if (images.length === 0 && music.length === 0) return;
  const { supabase } = await requireAdmin();

  if (images.length > 0) {
    const { data: used } = await supabase
      .from("greeting_card_images")
      .select("path")
      .in("path", images);
    const usedSet = new Set((used ?? []).map((u) => u.path as string));
    const orphans = images.filter((p) => !usedSet.has(p));
    if (orphans.length > 0) {
      await supabase.storage.from(CARD_IMAGE_BUCKET).remove(orphans);
    }
  }

  if (music.length > 0) {
    const { data: used } = await supabase
      .from("music_tracks")
      .select("path")
      .in("path", music);
    const usedSet = new Set((used ?? []).map((u) => u.path as string));
    const orphans = music.filter((p) => !usedSet.has(p));
    if (orphans.length > 0) {
      await supabase.storage.from(CARD_MUSIC_BUCKET).remove(orphans);
    }
  }
}
