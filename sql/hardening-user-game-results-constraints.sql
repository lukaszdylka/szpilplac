-- Szpilplac · zabezpieczenie user_game_results przed duplikatami
--
-- Ten plik jest opcjonalnym utwardzeniem bazy.
-- Przed uruchomieniem indeksu unikalnego najpierw uruchom diagnostykę duplikatów
-- z pliku sql/fix-user-game-results-cleanup.sql i usuń starsze nadmiarowe rekordy.
--
-- Cel:
-- Jeden użytkownik powinien mieć najwyżej jeden wynik dla:
-- user_id + game + mode + puzzle_no
--
-- Dzięki temu nie powstaną dwa wyniki dla tej samej dziennej Rai, Słówka lub Kłōdki.
-- Daily i weekly pozostają osobne, bo mode jest częścią indeksu.
--
-- Uwaga:
-- To nie usuwa błędnego wyniku tygodniowej Kłōdki. Do tego służy plik cleanup.
-- Ten indeks zapobiega późniejszym duplikatom tego samego wyniku.

-- ============================================================
-- 1. Diagnostyka przed założeniem indeksu
-- ============================================================

select
  user_id,
  game,
  mode,
  puzzle_no,
  count(*) as ile_rekordow,
  min(created_at) as pierwszy,
  max(created_at) as ostatni
from public.user_game_results
group by user_id, game, mode, puzzle_no
having count(*) > 1
order by ostatni desc;

-- Jeśli ten SELECT zwraca jakiekolwiek wiersze, indeks z sekcji 2 nie przejdzie.
-- Najpierw usuń duplikaty sekcją 8 z pliku fix-user-game-results-cleanup.sql.

-- ============================================================
-- 2. Indeks unikalny
-- ============================================================
-- Po usunięciu duplikatów można uruchomić:

create unique index if not exists user_game_results_user_game_mode_puzzle_unique
on public.user_game_results (user_id, game, mode, puzzle_no);

-- ============================================================
-- 3. Kontrola po wdrożeniu
-- ============================================================

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'user_game_results'
  and indexname = 'user_game_results_user_game_mode_puzzle_unique';
