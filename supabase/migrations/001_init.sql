-- 001: schema เริ่มต้น (รันไปแล้วใน Supabase — เก็บไว้เป็นประวัติ)

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.greeting_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  message text not null default '',
  image_path text,
  image_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint greeting_cards_slug_format
    check (slug ~ '^[a-z0-9-]{8,80}$'),
  constraint greeting_cards_title_length
    check (char_length(title) between 1 and 150),
  constraint greeting_cards_message_length
    check (char_length(message) <= 5000)
);

alter table public.admin_users enable row level security;
alter table public.greeting_cards enable row level security;

revoke all on public.admin_users from anon;
revoke all on public.greeting_cards from anon;

grant select on public.admin_users to authenticated;
grant select, insert, update, delete
  on public.greeting_cards to authenticated;

drop policy if exists "Admin can view own access"
  on public.admin_users;
create policy "Admin can view own access"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Admins can manage greeting cards"
  on public.greeting_cards;
create policy "Admins can manage greeting cards"
on public.greeting_cards
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  )
);

create index if not exists greeting_cards_created_at_idx
  on public.greeting_cards (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists greeting_cards_updated_at
  on public.greeting_cards;
create trigger greeting_cards_updated_at
before update on public.greeting_cards
for each row
execute function public.set_updated_at();
