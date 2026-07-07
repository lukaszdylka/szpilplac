-- Szpilplac: kontrola czasu i odznak
-- Uruchom w Supabase SQL Editor po patchach.

-- A. Czy funkcje odznak zawierają Europe/Warsaw?
select
  p.proname,
  position('Europe/Warsaw' in pg_get_functiondef(p.oid)) > 0 as has_warsaw_timezone
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'szpilplac_check_achievement_event',
    'szpilplac_repair_user_daily_achievements',
    'szpilplac_repair_my_daily_achievements'
  )
order by p.proname;

-- B. Ostatnie wyniki kont z datą po Warszawie.
select
  game,
  mode,
  puzzle_no,
  won,
  finished_at,
  finished_at::date as utc_or_session_date,
  timezone('Europe/Warsaw', finished_at)::date as warsaw_date,
  timezone('Europe/Warsaw', finished_at) as warsaw_time
from public.user_game_results
order by finished_at desc
limit 50;

-- C. Ostatnie eventy z datą po Warszawie.
select
  game,
  created_at,
  created_at::date as utc_or_session_date,
  timezone('Europe/Warsaw', created_at)::date as warsaw_date,
  timezone('Europe/Warsaw', created_at) as warsaw_time
from public.szpilplac_events
order by created_at desc
limit 50;
