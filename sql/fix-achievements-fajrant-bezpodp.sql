-- Szpilplac · korekta zasad odznak: Fajrant i Bez Podpowiydzi
--
-- Ten plik jest bezpiecznym helperem do Supabase SQL Editor.
-- Nie uruchamiaj całego pliku bez czytania komentarzy, bo schemat odznak może mieć inną nazwę tabeli/funkcji
-- w Twoim projekcie. Najpierw odpal sekcje DIAGNOSTYKA.
--
-- Cel funkcjonalny:
-- 1. Fajrant: przyznawaj dopiero wtedy, gdy gracz ma opuszczony dzień,
--    czyli w danym dniu nie ma żadnego wyniku w public.user_game_results.
--    Samo logowanie nie jest grą i nie powinno blokować Fajrantu.
-- 2. Bez Podpowiydzi: przyznawaj po jednej dowolnej grze dziennej wygranej bez podpowiedzi.
--    Nie licz tygodniowej Kłōdki, bo tam podpowiedzi są częścią zagadki.
--
-- W praktyce reguła Bez Podpowiydzi zależy od RPC public.szpilplac_check_achievement_event,
-- bo to tam frontend przekazuje p_hints_used. Front został już poprawiony w game-save.js v125,
-- żeby przekazywać hintUsed/hint_used z Rai i innych gier.

-- ============================================================
-- 1. DIAGNOSTYKA: czy odznaki istnieją i jak są nazwane
-- ============================================================

select *
from public.achievements
where id in ('fajrant','bezpodp')
   or lower(label) like '%fajrant%'
   or lower(label) like '%podpow%'
order by sort_order nulls last, id;

-- Jeśli tabela public.achievements nie istnieje, sprawdź nazwy tabel:
-- select table_schema, table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name ilike '%achiev%'
-- order by table_name;

-- ============================================================
-- 2. DIAGNOSTYKA: dni bez żadnej gry dla aktualnie zalogowanego usera
-- ============================================================
-- Działa w SQL Editor tylko, jeśli wpiszesz user_id ręcznie.
-- Pokazuje dni od pierwszego wyniku do wczoraj, w których gracz nie ma żadnego zapisanego wyniku.

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
-- 3. Logika do public.szpilplac_check_achievement_event: Bez Podpowiydzi
-- ============================================================
-- Tę logikę trzeba mieć w funkcji RPC, która obsługuje zdarzenie game_finished.
-- Nie daję tu CREATE OR REPLACE całej funkcji, bo bez aktualnej definicji łatwo nadpisać inne odznaki.
-- Wklej warunek w istniejącą funkcję w miejscu, gdzie przyznawane są odznaki za koniec gry.
--
-- Założenie: istnieje helper/przyznawanie w stylu insert do public.user_achievements.
-- Jeśli u Ciebie funkcja ma własny helper, użyj jego zamiast INSERT-a.

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
-- 4. Logika do public.szpilplac_check_achievement_event albo repair: Fajrant
-- ============================================================
-- Fajrant najlepiej sprawdzać przy wejściu na konto / account event / repair achievements.
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
-- 5. Kontrola po wdrożeniu
-- ============================================================
-- Sprawdź, czy konkretni użytkownicy dostali odznaki tylko raz.

-- select ua.*, a.label
-- from public.user_achievements ua
-- join public.achievements a on a.id = ua.achievement_id
-- where ua.achievement_id in ('fajrant','bezpodp')
-- order by ua.earned_at desc;
