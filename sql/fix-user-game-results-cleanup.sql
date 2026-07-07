-- Szpilplac · jednorazowe czyszczenie błędnych wyników konta
--
-- Cel:
-- 1. Podejrzeć wpisy w public.user_game_results, które mogą fałszywie blokować grę.
-- 2. Usunąć konkretny błędny rekord dopiero po sprawdzeniu podglądu.
--
-- Bezpieczna zasada:
-- Najpierw uruchom SELECT-y z sekcji PODGLĄD.
-- DELETE uruchamiaj w transakcji: BEGIN; DELETE ... RETURNING *; a potem ROLLBACK albo COMMIT.
--
-- Daty startu zgodne z frontem:
-- Kłōdka dzień 1: 2026-06-23
-- Raja dzień 1:   2026-07-04

-- ============================================================
-- 0. Aktualne numery zagadek według czasu Europe/Warsaw
-- ============================================================

with params as (
  select
    ((timezone('Europe/Warsaw', now())::date - date '2026-06-23')::int + 1) as klodka_day_no,
    (floor(((timezone('Europe/Warsaw', now())::date - date '2026-06-23')::int) / 7)::int + 1) as klodka_week_no,
    ((timezone('Europe/Warsaw', now())::date - date '2026-07-04')::int + 1) as raja_day_no,
    timezone('Europe/Warsaw', now())::date as warsaw_today
)
select * from params;

-- Na dzień 2026-07-07 powinno wyjść:
-- klodka_day_no  = 15
-- klodka_week_no = 3
-- raja_day_no    = 4

-- ============================================================
-- 1. PODGLĄD: aktualna tygodniowa Kłōdka, czyli najczęstszy fałszywy blok
-- ============================================================

with params as (
  select (floor(((timezone('Europe/Warsaw', now())::date - date '2026-06-23')::int) / 7)::int + 1) as klodka_week_no
)
select
  ugr.*,
  p.login,
  p.display_name
from public.user_game_results ugr
left join public.profiles p on p.id = ugr.user_id
cross join params
where ugr.game = 'klodka'
  and ugr.mode = 'weekly'
  and ugr.puzzle_no = params.klodka_week_no
order by ugr.created_at desc;

-- ============================================================
-- 2. PODGLĄD: konkretny user i konkretna tygodniowa Kłōdka
-- ============================================================
-- Wpisz swój login z profilu, jeśli chcesz zawęzić rekordy.
-- Przykład: where p.login = 'lukasz'

with params as (
  select (floor(((timezone('Europe/Warsaw', now())::date - date '2026-06-23')::int) / 7)::int + 1) as klodka_week_no
)
select
  ugr.*,
  p.login,
  p.display_name
from public.user_game_results ugr
join public.profiles p on p.id = ugr.user_id
cross join params
where ugr.game = 'klodka'
  and ugr.mode = 'weekly'
  and ugr.puzzle_no = params.klodka_week_no
  -- and p.login = 'TU_WPISZ_LOGIN'
order by ugr.created_at desc;

-- ============================================================
-- 3. USUNIĘCIE: aktualna tygodniowa Kłōdka dla jednego loginu
-- ============================================================
-- Najbezpieczniejsza wersja. Odkomentuj, wpisz login i uruchom.
-- Najpierw zostaw ROLLBACK. Jeśli RETURNING pokaże dokładnie ten rekord, uruchom ponownie z COMMIT.

-- begin;
-- with params as (
--   select (floor(((timezone('Europe/Warsaw', now())::date - date '2026-06-23')::int) / 7)::int + 1) as klodka_week_no
-- ), target as (
--   select ugr.ctid
--   from public.user_game_results ugr
--   join public.profiles p on p.id = ugr.user_id
--   cross join params
--   where ugr.game = 'klodka'
--     and ugr.mode = 'weekly'
--     and ugr.puzzle_no = params.klodka_week_no
--     and p.login = 'TU_WPISZ_LOGIN'
-- )
-- delete from public.user_game_results ugr
-- using target
-- where ugr.ctid = target.ctid
-- returning ugr.*;
-- rollback;
-- commit;

-- ============================================================
-- 4. USUNIĘCIE: aktualna tygodniowa Kłōdka dla konkretnego user_id
-- ============================================================
-- Użyj, jeśli w podglądzie łatwiej skopiować UUID z user_id niż login.

-- begin;
-- with params as (
--   select (floor(((timezone('Europe/Warsaw', now())::date - date '2026-06-23')::int) / 7)::int + 1) as klodka_week_no
-- )
-- delete from public.user_game_results ugr
-- using params
-- where ugr.game = 'klodka'
--   and ugr.mode = 'weekly'
--   and ugr.puzzle_no = params.klodka_week_no
--   and ugr.user_id = 'TU_WPISZ_USER_ID'::uuid
-- returning ugr.*;
-- rollback;
-- commit;

-- ============================================================
-- 5. PODGLĄD: dzisiejsza Raja na koncie
-- ============================================================
-- Przydaje się, gdy Raja pokazuje inny stan niż lokalna gra.

with params as (
  select ((timezone('Europe/Warsaw', now())::date - date '2026-07-04')::int + 1) as raja_day_no
)
select
  ugr.*,
  p.login,
  p.display_name
from public.user_game_results ugr
left join public.profiles p on p.id = ugr.user_id
cross join params
where ugr.game in ('zorta','raja')
  and ugr.mode = 'daily'
  and ugr.puzzle_no = params.raja_day_no
order by ugr.created_at desc;

-- ============================================================
-- 6. USUNIĘCIE: dzisiejsza Raja dla jednego loginu
-- ============================================================
-- Odkomentuj tylko wtedy, gdy podgląd pokazuje błędny rekord.

-- begin;
-- with params as (
--   select ((timezone('Europe/Warsaw', now())::date - date '2026-07-04')::int + 1) as raja_day_no
-- ), target as (
--   select ugr.ctid
--   from public.user_game_results ugr
--   join public.profiles p on p.id = ugr.user_id
--   cross join params
--   where ugr.game in ('zorta','raja')
--     and ugr.mode = 'daily'
--     and ugr.puzzle_no = params.raja_day_no
--     and p.login = 'TU_WPISZ_LOGIN'
-- )
-- delete from public.user_game_results ugr
-- using target
-- where ugr.ctid = target.ctid
-- returning ugr.*;
-- rollback;
-- commit;

-- ============================================================
-- 7. Diagnostyka duplikatów wyników na koncie
-- ============================================================
-- To niczego nie usuwa. Pokazuje sytuacje, gdzie jeden użytkownik ma więcej niż jeden wynik
-- dla tej samej gry, trybu i numeru zagadki.

select
  user_id,
  game,
  mode,
  puzzle_no,
  count(*) as ile_rekordow,
  min(created_at) as pierwszy,
  max(created_at) as ostatni,
  array_agg(won order by created_at desc) as wyniki_od_najnowszego
from public.user_game_results
group by user_id, game, mode, puzzle_no
having count(*) > 1
order by ostatni desc;

-- ============================================================
-- 8. Opcjonalne porządki po duplikatach
-- ============================================================
-- Zostawia najnowszy rekord dla pary user_id/game/mode/puzzle_no, usuwa starsze.
-- Uruchamiaj tylko, jeśli sekcja 7 pokaże realne duplikaty i chcesz je scalić.

-- begin;
-- with ranked as (
--   select
--     ctid,
--     row_number() over (
--       partition by user_id, game, mode, puzzle_no
--       order by created_at desc nulls last
--     ) as rn
--   from public.user_game_results
-- ), doomed as (
--   select ctid from ranked where rn > 1
-- )
-- delete from public.user_game_results ugr
-- using doomed
-- where ugr.ctid = doomed.ctid
-- returning ugr.*;
-- rollback;
-- commit;
