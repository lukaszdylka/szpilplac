-- Szpilplac: rozróżnienie statystyk
-- Konta vs rozgrywki wszystkich graczy vs techniczne eventy
-- Uruchom w Supabase SQL Editor.
-- Nie usuwa danych.

begin;

alter table public.szpilplac_events
  add column if not exists visitor_id text;

alter table public.szpilplac_events
  add column if not exists event_type text;

-- Stare eventy nie miały typu, więc traktujemy je jako zakończenie gry.
-- Dzięki temu liczba "gier" zadziała też wstecz.
update public.szpilplac_events
set event_type = 'game_finish'
where event_type is null;

create index if not exists szpilplac_events_created_at_idx
  on public.szpilplac_events (created_at);

create index if not exists szpilplac_events_visitor_idx
  on public.szpilplac_events (visitor_id);

create index if not exists szpilplac_events_event_type_idx
  on public.szpilplac_events (event_type);

drop view if exists public.stats_admin_all_plays_overview;
drop view if exists public.stats_admin_all_plays_by_game;
drop view if exists public.stats_admin_daily_all_plays;

create view public.stats_admin_all_plays_overview as
with e as (
  select
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day,
    nullif(visitor_id,'') as visitor_id,
    coalesce(event_type,'game_finish') as event_type,
    won
  from public.szpilplac_events
  where coalesce(event_type,'game_finish') = 'game_finish'
)
select
  count(*)::integer as plays,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date
  )::integer as plays_today,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::integer as plays_7d,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 29
  )::integer as plays_30d,

  count(distinct visitor_id) filter (
    where visitor_id is not null
  )::integer as players_devices,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day = timezone('Europe/Warsaw', now())::date
  )::integer as players_today,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::integer as players_7d,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 29
  )::integer as players_30d,

  count(*) filter (where won is true)::integer as wins,
  case
    when count(*) > 0
      then round(100.0 * count(*) filter (where won is true) / count(*))::integer
    else 0
  end as win_pct,
  max(created_at) as last_play
from e;

create view public.stats_admin_all_plays_by_game as
with e as (
  select
    coalesce(nullif(game,''),'unknown') as game,
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day,
    nullif(visitor_id,'') as visitor_id,
    coalesce(event_type,'game_finish') as event_type,
    won
  from public.szpilplac_events
  where coalesce(event_type,'game_finish') = 'game_finish'
)
select
  game,
  count(*)::integer as plays,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date
  )::integer as plays_today,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::integer as plays_7d,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 29
  )::integer as plays_30d,

  count(distinct visitor_id) filter (
    where visitor_id is not null
  )::integer as players_devices,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day = timezone('Europe/Warsaw', now())::date
  )::integer as players_today,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::integer as players_7d,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 29
  )::integer as players_30d,

  count(*) filter (where won is true)::integer as wins,
  case
    when count(*) > 0
      then round(100.0 * count(*) filter (where won is true) / count(*))::integer
    else 0
  end as win_pct,
  max(created_at) as last_play
from e
group by game
order by plays_today desc, plays desc;

create view public.stats_admin_daily_all_plays as
with e as (
  select
    coalesce(nullif(game,''),'unknown') as game,
    timezone('Europe/Warsaw', created_at)::date as day,
    nullif(visitor_id,'') as visitor_id,
    won
  from public.szpilplac_events
  where coalesce(event_type,'game_finish') = 'game_finish'
)
select
  day,
  game,
  count(*)::integer as plays,
  count(distinct visitor_id) filter (
    where visitor_id is not null
  )::integer as players_devices,
  count(*) filter (where won is true)::integer as wins,
  case
    when count(*) > 0
      then round(100.0 * count(*) filter (where won is true) / count(*))::integer
    else 0
  end as win_pct
from e
group by day, game
order by day desc, game;

grant select on public.stats_admin_all_plays_overview to anon, authenticated;
grant select on public.stats_admin_all_plays_by_game to anon, authenticated;
grant select on public.stats_admin_daily_all_plays to anon, authenticated;

commit;

-- Kontrola po uruchomieniu:
select * from public.stats_admin_all_plays_overview;
select * from public.stats_admin_all_plays_by_game order by plays_today desc, plays desc;
