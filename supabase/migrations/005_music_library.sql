-- =============================================================
-- 005: คลังเพลงของร้าน
-- อัปโหลดเพลงไว้ที่เดียว (music_tracks) แล้วการ์ดแต่ละใบแค่เลือกเพลง + ท่อนที่จะเล่น
-- รันหลัง 004 — ย้ายเพลงที่ผูกกับการ์ดโดยตรง (music_path) มาเข้าคลังให้อัตโนมัติ
-- =============================================================

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  title text not null,
  -- ท่อนเริ่มต้นที่แนะนำ (การ์ดแต่ละใบปรับเองได้)
  default_start numeric(7, 2) not null default 0,
  default_end numeric(7, 2),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint music_tracks_path_format
    check (path ~ '^music/[0-9a-f-]{36}\.(mp3|m4a|aac|ogg|wav)$'),
  constraint music_tracks_title_length
    check (char_length(title) between 1 and 150),
  constraint music_tracks_range
    check (default_start >= 0 and (default_end is null or default_end > default_start))
);

alter table public.music_tracks enable row level security;
revoke all on public.music_tracks from anon;
grant select, insert, update, delete on public.music_tracks to authenticated;

drop policy if exists "Admins can manage music tracks" on public.music_tracks;
create policy "Admins can manage music tracks"
on public.music_tracks
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- การ์ดอ้างอิงเพลงในคลัง (ลบเพลงออกจากคลัง → การ์ดที่ใช้อยู่จะไม่มีเพลง)
alter table public.greeting_cards
  add column if not exists music_track_id uuid
    references public.music_tracks(id) on delete set null;

create index if not exists greeting_cards_music_track_idx
  on public.greeting_cards (music_track_id);

-- ย้ายเพลงเดิมจาก 004 (ถ้ามี) เข้าคลัง แล้วผูกกับการ์ด
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'greeting_cards'
      and column_name = 'music_path'
  ) then
    insert into public.music_tracks (path, title, default_start, default_end)
    select music_path,
           coalesce(nullif(music_title, ''), 'ເພງ'),
           music_start,
           music_end
    from public.greeting_cards
    where music_path is not null
    on conflict (path) do nothing;

    update public.greeting_cards c
    set music_track_id = t.id
    from public.music_tracks t
    where c.music_path = t.path
      and c.music_track_id is null;
  end if;
end $$;

-- ฟังก์ชันสาธารณะ: ดึงเพลงจากคลัง (ต้องแทนที่ก่อนลบคอลัมน์เดิม)
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
    'card_date', c.card_date,
    'created_at', c.created_at,
    'music_path', t.path,
    'music_title', coalesce(t.title, ''),
    'music_start', c.music_start,
    'music_end', c.music_end,
    'images', coalesce(
      (select json_agg(i.path order by i.position, i.created_at)
       from public.greeting_card_images i
       where i.card_id = c.id),
      '[]'::json
    )
  )
  from public.greeting_cards c
  left join public.music_tracks t on t.id = c.music_track_id
  where c.slug = p_slug
    and c.is_active;
$$;

revoke all on function public.get_public_card(text) from public;
grant execute on function public.get_public_card(text) to anon, authenticated;

-- คอลัมน์เพลงแบบเดิม (ไฟล์ต่อการ์ด) ไม่ใช้แล้ว
-- เก็บ music_start / music_end ไว้: เป็นท่อนที่เลือกเฉพาะการ์ดใบนั้น
alter table public.greeting_cards
  drop constraint if exists greeting_cards_music_path_format,
  drop constraint if exists greeting_cards_music_title_length,
  drop column if exists music_path,
  drop column if exists music_title;
