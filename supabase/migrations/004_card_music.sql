-- =============================================================
-- 004: เพลงประกอบการ์ด (เล่นเฉพาะท่อนที่เลือก: music_start → music_end)
-- ไม่ต้องตัดไฟล์เพลงเอง: เก็บไฟล์เต็ม + จุดเริ่ม/จุดจบ (วินาที)
-- =============================================================

alter table public.greeting_cards
  add column if not exists music_path text,
  add column if not exists music_title text not null default '',
  add column if not exists music_start numeric(7, 2) not null default 0,
  add column if not exists music_end numeric(7, 2);

alter table public.greeting_cards
  drop constraint if exists greeting_cards_music_path_format,
  drop constraint if exists greeting_cards_music_title_length,
  drop constraint if exists greeting_cards_music_range;

alter table public.greeting_cards
  add constraint greeting_cards_music_path_format
    check (music_path is null or music_path ~ '^music/[0-9a-f-]{36}\.(mp3|m4a|aac|ogg|wav)$'),
  add constraint greeting_cards_music_title_length
    check (char_length(music_title) <= 150),
  add constraint greeting_cards_music_range
    check (music_start >= 0 and (music_end is null or music_end > music_start));

-- ฟังก์ชันสาธารณะ: เพิ่มข้อมูลเพลง
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
    'music_path', c.music_path,
    'music_title', c.music_title,
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
  where c.slug = p_slug
    and c.is_active;
$$;

revoke all on function public.get_public_card(text) from public;
grant execute on function public.get_public_card(text) to anon, authenticated;

-- -------------------------------------------------------------
-- Storage bucket สำหรับเพลง (public อ่านได้ด้วย URL, admin เท่านั้นที่เขียน/ลบ)
-- 15MB พอสำหรับเพลง mp3 ทั้งเพลง
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-music', 'card-music', true, 15728640,
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read card music" on storage.objects;
create policy "Admins can read card music"
on storage.objects for select to authenticated
using (bucket_id = 'card-music' and (select public.is_admin()));

drop policy if exists "Admins can upload card music" on storage.objects;
create policy "Admins can upload card music"
on storage.objects for insert to authenticated
with check (bucket_id = 'card-music' and (select public.is_admin()));

drop policy if exists "Admins can update card music" on storage.objects;
create policy "Admins can update card music"
on storage.objects for update to authenticated
using (bucket_id = 'card-music' and (select public.is_admin()));

drop policy if exists "Admins can delete card music" on storage.objects;
create policy "Admins can delete card music"
on storage.objects for delete to authenticated
using (bucket_id = 'card-music' and (select public.is_admin()));
