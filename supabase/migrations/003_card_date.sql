-- =============================================================
-- 003: วันที่ที่แสดงบนการ์ด (วันสำคัญ) — admin กรอกเอง
-- ถ้าไม่กรอก จะใช้วันที่สร้างการ์ดแทน
-- =============================================================

alter table public.greeting_cards
  add column if not exists card_date date;

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
