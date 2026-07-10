-- Szpilplac PWA + powiadomienia web push
-- Uruchom w Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.szpilplac_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_games boolean not null default true,
  weekly_summary boolean not null default false,
  kamrat_reactions boolean not null default true,
  kamrat_added boolean not null default true,
  achievements boolean not null default true,
  news boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.szpilplac_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.szpilplac_notification_preferences enable row level security;
alter table public.szpilplac_push_subscriptions enable row level security;

drop policy if exists "notification prefs own select" on public.szpilplac_notification_preferences;
create policy "notification prefs own select" on public.szpilplac_notification_preferences
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "notification prefs own insert" on public.szpilplac_notification_preferences;
create policy "notification prefs own insert" on public.szpilplac_notification_preferences
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "notification prefs own update" on public.szpilplac_notification_preferences;
create policy "notification prefs own update" on public.szpilplac_notification_preferences
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push subs own select" on public.szpilplac_push_subscriptions;
create policy "push subs own select" on public.szpilplac_push_subscriptions
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "push subs own insert" on public.szpilplac_push_subscriptions;
create policy "push subs own insert" on public.szpilplac_push_subscriptions
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push subs own update" on public.szpilplac_push_subscriptions;
create policy "push subs own update" on public.szpilplac_push_subscriptions
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push subs own delete" on public.szpilplac_push_subscriptions;
create policy "push subs own delete" on public.szpilplac_push_subscriptions
for delete to authenticated using (auth.uid() = user_id);

create or replace function public.szp_save_notification_preferences(
  p_daily_games boolean default true,
  p_weekly_summary boolean default false,
  p_kamrat_reactions boolean default true,
  p_kamrat_added boolean default true,
  p_achievements boolean default true,
  p_news boolean default true
)
returns public.szpilplac_notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.szpilplac_notification_preferences;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.szpilplac_notification_preferences (
    user_id, daily_games, weekly_summary, kamrat_reactions, kamrat_added, achievements, news, updated_at
  )
  values (
    auth.uid(), coalesce(p_daily_games,true), coalesce(p_weekly_summary,false),
    coalesce(p_kamrat_reactions,true), coalesce(p_kamrat_added,true),
    coalesce(p_achievements,true), coalesce(p_news,true), now()
  )
  on conflict (user_id) do update set
    daily_games = excluded.daily_games,
    weekly_summary = excluded.weekly_summary,
    kamrat_reactions = excluded.kamrat_reactions,
    kamrat_added = excluded.kamrat_added,
    achievements = excluded.achievements,
    news = excluded.news,
    updated_at = now()
  returning * into row_out;

  return row_out;
end;
$$;

create or replace function public.szp_get_notification_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.szpilplac_notification_preferences;
  has_push boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.szpilplac_notification_preferences (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select * into p
  from public.szpilplac_notification_preferences
  where user_id = auth.uid();

  select exists(
    select 1 from public.szpilplac_push_subscriptions
    where user_id = auth.uid() and is_active = true
  ) into has_push;

  return jsonb_build_object(
    'daily_games', p.daily_games,
    'weekly_summary', p.weekly_summary,
    'kamrat_reactions', p.kamrat_reactions,
    'kamrat_added', p.kamrat_added,
    'achievements', p.achievements,
    'news', p.news,
    'has_push', has_push,
    'updated_at', p.updated_at
  );
end;
$$;

create or replace function public.szp_save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sub_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if nullif(trim(p_endpoint),'') is null
    or nullif(trim(p_p256dh),'') is null
    or nullif(trim(p_auth),'') is null then
    raise exception 'invalid subscription';
  end if;

  insert into public.szpilplac_notification_preferences (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  insert into public.szpilplac_push_subscriptions (
    user_id, endpoint, p256dh, auth, user_agent, is_active, updated_at, last_seen_at
  )
  values (
    auth.uid(), p_endpoint, p_p256dh, p_auth, left(coalesce(p_user_agent,''),500), true, now(), now()
  )
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    is_active = true,
    updated_at = now(),
    last_seen_at = now()
  returning id into sub_id;

  return sub_id;
end;
$$;

create or replace function public.szp_disable_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.szpilplac_push_subscriptions
  set is_active = false, updated_at = now()
  where user_id = auth.uid() and endpoint = p_endpoint;

  return true;
end;
$$;

create or replace view public.szp_push_targets as
select
  s.user_id,
  s.endpoint,
  s.p256dh,
  s.auth,
  s.user_agent,
  coalesce(p.daily_games, true) as daily_games,
  coalesce(p.weekly_summary, false) as weekly_summary,
  coalesce(p.kamrat_reactions, true) as kamrat_reactions,
  coalesce(p.kamrat_added, true) as kamrat_added,
  coalesce(p.achievements, true) as achievements,
  coalesce(p.news, true) as news,
  s.updated_at,
  s.last_seen_at
from public.szpilplac_push_subscriptions s
left join public.szpilplac_notification_preferences p
  on p.user_id = s.user_id
where s.is_active = true;

grant execute on function public.szp_save_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.szp_get_notification_settings() to authenticated;
grant execute on function public.szp_save_push_subscription(text,text,text,text) to authenticated;
grant execute on function public.szp_disable_push_subscription(text) to authenticated;
grant select on public.szp_push_targets to service_role;

commit;
