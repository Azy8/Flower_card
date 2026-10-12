-- =============================================================
-- 002: หลายรูปต่อการ์ด + หน้าสาธารณะ (ลูกค้าสแกน QR) + Storage
-- รันใน Supabase SQL Editor หลังจาก schema เดิม (admin_users, greeting_cards)
-- =============================================================

-- ข้อความใต้รูปโพลารอยด์ (เช่น "ให้ที่รัก") — ไม่บังคับ
alter table public.greeting_cards
  add column if not exists caption text not null default '';

alter table public.greeting_cards
  drop constraint if exists greeting_cards_caption_length;
alter table public.greeting_cards
  add constraint greeting_cards_caption_length
  check (char_length(caption) <= 100);

-- -------------------------------------------------------------
-- Helper: ผู้ใช้ปัจจุบันเป็น admin หรือไม่ (ใช้ซ้ำใน policy ต่างๆ)
-- security definer เพื่ออ่าน admin_users ได้โดยไม่ติด RLS
-- -------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- -------------------------------------------------------------
-- รูปภาพของการ์ด (1 การ์ด : หลายรูป เรียงตาม position)
-- -------------------------------------------------------------
create table if not exists public.greeting_card_images (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.greeting_cards(id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint greeting_card_images_path_format
    check (path ~ '^cards/[0-9a-f-]{36}\.(jpg|png|webp)$')
);

create index if not exists greeting_card_images_card_idx
  on public.greeting_card_images (card_id, position);

alter table public.greeting_card_images enable row level security;

revoke all on public.greeting_card_images from anon;
grant select, insert, update, delete
  on public.greeting_card_images to authenticated;

drop policy if exists "Admins can manage card images"
  on public.greeting_card_images;
create policy "Admins can manage card images"
on public.greeting_card_images
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- ย้ายรูปเดิม (คอลัมน์ image_path) มาไว้ในตารางใหม่ ถ้ามี
insert into public.greeting_card_images (card_id, path, position)
select id, image_path, 0
from public.greeting_cards
where image_path ~ '^cards/[0-9a-f-]{36}\.(jpg|png|webp)$'
  and not exists (
    select 1 from public.greeting_card_images i where i.card_id = greeting_cards.id
  );

-- -------------------------------------------------------------
-- ฟังก์ชันสาธารณะสำหรับหน้าที่ลูกค้าสแกน
-- anon อ่านตารางตรงๆ ไม่ได้ → อ่านได้เฉพาะการ์ดที่รู้ slug และยังเปิดใช้งาน
-- คืนเฉพาะฟิลด์ที่ต้องแสดง (ไม่เปิดเผย id / created_by)
-- -------------------------------------------------------------
create or replace function public.get_public_card(p_slug text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'title', c.title,
    'message', c.message,
    'caption', c.caption,
    'created_at', c.created_at,
    'images', coalesce(
      (select json_agg(i.path order by i.position, i.created_at)
       from public.greeting_card_images i
       where i.card_id = c.id),
      '[]'::json
    )
  )
  from public.greeting_cards c
  where c.slug = p_slug
    and c.is_active;
$$;

revoke all on function public.get_public_card(text) from public;
grant execute on function public.get_public_card(text) to anon, authenticated;

-- -------------------------------------------------------------
-- Storage bucket สำหรับรูปการ์ด
-- public = true: เปิดดูได้ด้วย URL (ชื่อไฟล์เป็น UUID สุ่ม เดาไม่ได้)
-- อัปโหลด/แก้ไข/ลบ ได้เฉพาะ admin
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images', 'card-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage API ต้องมีสิทธิ์ select ด้วยจึงจะลบไฟล์ได้ (เฉพาะ admin; ลูกค้าดูผ่าน public URL)
drop policy if exists "Admins can read card images" on storage.objects;
create policy "Admins can read card images"
on storage.objects
for select
to authenticated
using (bucket_id = 'card-images' and (select public.is_admin()));

drop policy if exists "Admins can upload card images" on storage.objects;
create policy "Admins can upload card images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'card-images' and (select public.is_admin()));

drop policy if exists "Admins can update card images" on storage.objects;
create policy "Admins can update card images"
on storage.objects
for update
to authenticated
using (bucket_id = 'card-images' and (select public.is_admin()));

drop policy if exists "Admins can delete card images" on storage.objects;
create policy "Admins can delete card images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'card-images' and (select public.is_admin()));
