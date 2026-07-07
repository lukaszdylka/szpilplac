-- Szpilplac · korekta zasad odznak: Fajrant i Bez Podpowiydzi
--
-- Ten plik jest helperem do Supabase SQL Editor.
-- U Ciebie tabele odznak to:
--   public.szpilplac_achievements
--   public.user_achievements
--
-- Nie uruchamiaj całego pliku jak instalatora. Najpierw diagnostyka, potem konkretna poprawka funkcji.
--
-- Cel funkcjonalny:
-- 1. Fajrant: przyznawaj dopiero wtedy, gdy gracz ma opuszczony dzień,
--    czyli w danym dniu nie ma żadnego wyniku w public.user_game_results.
--    Samo logowanie nie jest grą i nie powinno blokować Fajrantu.
-- 2. Bez Podpowiydzi: przyznawaj po jednej dowolnej grze dziennej wygranej bez podpowiedzi.
--    Nie licz tygodniowej Kłōdki, bo tam podpowiedzi są częścią zagadki.
--
-- Front został poprawiony w game-save.js v125, żeby przekazywać hintUsed/hint_used z Rai i innych gier.

-- ============================================================
-- 1. DIAGNOSTYKA: odznaki Fajrant i Bez Podpowiydzi
-- ============================================================

select *
from public.szpilplac_achievements
where id in ('fajrant','bezpodp')
   or lower(label) like '%fajrant%'
   or lower(label) like '%podpow%'
order by sort_order nulls last, id;

-- Kolumny tabel odznak, gdyby trzeba było dopasować INSERT-y:

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('szpilplac_achievements','user_achievements')
order by table_name, ordinal_position;

-- ============================================================
-- 2. DIAGNOSTYKA: definicje funkcji odznak
-- ============================================================
-- Te definicje są potrzebne, żeby zrobić dokładne CREATE OR REPLACE bez kasowania obecnej logiki.

select pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'szpilplac_check_achievement_event',
    'szpilplac_repair_my_daily_achievements',
    'szpilplac_repair_user_daily_achievements',
    'szpilplac_award_user_achievement',
    'szpilplac_award_achievement'
  )
order by p.proname;

-- ============================================================
-- 3. DIAGNOSTYKA: dni bez żadnej gry dla konkretnego usera
-- ============================================================
-- Podmień user_id. Pokazuje dni od pierwszego wyniku do wczoraj, w których gracz nie ma żadnego zapisanego wyniku.

-- with params as (
--   select 'TU_WPISZ_USER_ID'::uuid as user_id,
--          timezone('Europe/Warsaw', now())::date as today
-- ), bounds as (
--   select
--     p.user_id,
--     coalesce(min(timezone('Europe/Warsaw', ugr.finished_at)::date), p.today) as first_day,
--     p.today - 1 as yesterday
--   from params p
--   left join public.user_game_results ugr on ugr.user_id = p.user_id
--   group by p.user_id, p.today
-- ), days as (
--   select b.user_id, generate_series(b.first_day, b.yesterday, interval '1 day')::date as day
--   from bounds b
--   where b.yesterday >= b.first_day
-- )
-- select d.day
-- from days d
-- where not exists (
--   select 1
--   from public.user_game_results ugr
--   where ugr.user_id = d.user_id
--     and timezone('Europe/Warsaw', ugr.finished_at)::date = d.day
-- )
-- order by d.day desc;

-- ============================================================
-- 4. Logika do public.szpilplac_check_achievement_event: Bez Podpowiydzi
-- ============================================================
-- Do wklejenia w istniejącej funkcji tam, gdzie obsługiwane jest p_event = 'game_finished'.
-- Jeśli aktualna funkcja korzysta z helpera public.szpilplac_award_user_achievement albo public.szpilplac_award_achievement,
-- użyj helpera zamiast ręcznego INSERT-a.

-- if p_event = 'game_finished'
--    and coalesce(p_won, false) = true
--    and coalesce(p_hints_used, 0) = 0
--    and coalesce(p_meta ->> 'mode', 'daily') = 'daily'
--    and not (coalesce(p_source_game, '') = 'klodka' and coalesce(p_meta ->> 'mode', '') = 'weekly')
-- then
--   insert into public.user_achievements (user_id, achievement_id, earned_at, meta)
--   values (
--     auth.uid(),
--     'bezpodp',
--     now(),
--     jsonb_build_object(
--       'source', 'game_finished_no_hint',
--       'game', p_source_game,
--       'hints_used', p_hints_used,
--       'meta', p_meta
--     )
--   )
--   on conflict (user_id, achievement_id) do nothing;
-- end if;

-- ============================================================
-- 5. Logika do repair/account event: Fajrant
-- ============================================================
-- Reguła: od pierwszego zapisanego wyniku do wczoraj istnieje dzień bez żadnej gry.
-- Nie patrzymy na logowania, profile ani aktywność konta. Tylko public.user_game_results.

-- if exists (
--   with bounds as (
--     select
--       coalesce(min(timezone('Europe/Warsaw', finished_at)::date), timezone('Europe/Warsaw', now())::date) as first_day,
--       timezone('Europe/Warsaw', now())::date - 1 as yesterday
--     from public.user_game_results
--     where user_id = auth.uid()
--   ), days as (
--     select generate_series(first_day, yesterday, interval '1 day')::date as day
--     from bounds
--     where yesterday >= first_day
--   )
--   select 1
--   from days d
--   where not exists (
--     select 1
--     from public.user_game_results ugr
--     where ugr.user_id = auth.uid()
--       and timezone('Europe/Warsaw', ugr.finished_at)::date = d.day
--   )
-- ) then
--   insert into public.user_achievements (user_id, achievement_id, earned_at, meta)
--   values (
--     auth.uid(),
--     'fajrant',
--     now(),
--     jsonb_build_object('source','missed_day_without_any_game')
--   )
--   on conflict (user_id, achievement_id) do nothing;
-- end if;

-- ============================================================
-- 6. Kontrola po wdrożeniu
-- ============================================================

-- select ua.*, a.label
-- from public.user_achievements ua
-- join public.szpilplac_achievements a on a.id = ua.achievement_id
-- where ua.achievement_id in ('fajrant','bezpodp')
-- order by ua.earned_at desc;
