-- Szpilplac: statystyki eventów wg polskiego dnia
-- Uruchom w Supabase SQL Editor.
-- Naprawia sytuację, gdy "Today" w stats_admin_events_* liczy dzień po UTC
-- albo według strefy sesji bazy, zamiast Europe/Warsaw.

begin;

create or replace view public.stats_admin_events_overview as
with e as (
  select
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day
  from public.szpilplac_events
)
select
  count(*)::bigint as events,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date
  )::bigint as today,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date - 1
  )::bigint as yesterday,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::bigint as last_7d,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 30
  )::bigint as last_31d,
  max(created_at) as last_event
from e;

create or replace view public.stats_admin_events_by_game as
with e as (
  select
    coalesce(nullif(game,''),'unknown') as game,
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day
  from public.szpilplac_events
)
select
  game,
  count(*)::bigint as events,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date
  )::bigint as today,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::bigint as last_7d,
  max(created_at) as last_event
from e
group by game
order by events desc;

commit;

-- Kontrola:
-- 1) Dzisiejsze eventy liczone po Europe/Warsaw.
select * from public.stats_admin_events_by_game order by events desc;

-- 2) Porównanie UTC vs Warszawa z ostatnich godzin.
select
  game,
  created_at,
  created_at::date as utc_or_session_date,
  timezone('Europe/Warsaw', created_at)::date as warsaw_date,
  timezone('Europe/Warsaw', created_at) as warsaw_time
from public.szpilplac_events
order by created_at desc
limit 30;
