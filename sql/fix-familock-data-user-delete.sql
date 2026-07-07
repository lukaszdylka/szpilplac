-- Szpilplac · naprawa usuwania użytkownika blokowanego przez familock_data
--
-- Błąd:
-- update or delete on table "users" violates foreign key constraint
-- "familock_data_user_id_fkey" on table "familock_data"
--
-- Znaczenie:
-- Próbujesz usunąć użytkownika z auth.users, ale public.familock_data nadal ma rekord
-- z tym samym user_id. PostgreSQL blokuje usunięcie, żeby nie zostawić osieroconych danych.
--
-- Najbezpieczniej:
-- 1. Najpierw zrób diagnostykę z sekcji 1.
-- 2. Jeśli chcesz usunąć tylko jednego testowego użytkownika, użyj sekcji 2 albo 3.
-- 3. Jeśli chcesz, żeby w przyszłości usuwanie użytkownika automatycznie usuwało jego familock_data,
--    użyj sekcji 4.

-- ============================================================
-- 1. DIAGNOSTYKA: sprawdź obecny klucz obcy i zależne rekordy
-- ============================================================

select
  con.conname as constraint_name,
  nsp.nspname as table_schema,
  rel.relname as table_name,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where con.conname = 'familock_data_user_id_fkey';

-- Podejrzyj dane blokujące usunięcie użytkownika po emailu.
-- Podmień email i uruchom.

select
  u.id as user_id,
  u.email,
  fd.*
from auth.users u
join public.familock_data fd on fd.user_id = u.id
where u.email = 'TU_WPISZ_EMAIL';

-- ============================================================
-- 2. JEDNORAZOWE USUNIĘCIE danych familock_data dla konkretnego emaila
-- ============================================================
-- Użyj, jeśli chcesz skasować testowe konto i jego dane.
-- Najpierw zostaw ROLLBACK. Jeśli RETURNING pokaże właściwe rekordy, uruchom ponownie z COMMIT.

-- begin;
-- delete from public.familock_data fd
-- using auth.users u
-- where fd.user_id = u.id
--   and u.email = 'TU_WPISZ_EMAIL'
-- returning fd.*;
-- rollback;
-- commit;

-- Po COMMIT możesz ponownie usunąć użytkownika w Supabase Authentication → Users.

-- ============================================================
-- 3. JEDNORAZOWE USUNIĘCIE danych familock_data dla konkretnego user_id
-- ============================================================
-- Użyj, jeśli łatwiej skopiować UUID użytkownika niż email.

-- begin;
-- delete from public.familock_data
-- where user_id = 'TU_WPISZ_USER_ID'::uuid
-- returning *;
-- rollback;
-- commit;

-- Po COMMIT możesz ponownie usunąć użytkownika w Supabase Authentication → Users.

-- ============================================================
-- 4. STAŁA POPRAWKA: przebuduj FK na ON DELETE CASCADE
-- ============================================================
-- Dzięki temu usunięcie użytkownika z auth.users automatycznie usunie jego rekordy
-- z public.familock_data.
--
-- To jest sensowne dla danych ściśle należących do konta użytkownika.
-- Nie używaj CASCADE, jeśli familock_data ma przechowywać archiwalne dane niezależnie
-- od konta użytkownika.

-- begin;
-- alter table public.familock_data
--   drop constraint if exists familock_data_user_id_fkey;
--
-- alter table public.familock_data
--   add constraint familock_data_user_id_fkey
--   foreign key (user_id)
--   references auth.users(id)
--   on delete cascade;
--
-- rollback;
-- commit;

-- ============================================================
-- 5. KONTROLA po stałej poprawce
-- ============================================================

select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'familock_data'
  and con.conname = 'familock_data_user_id_fkey';

-- Po poprawnym wdrożeniu sekcji 4 definicja powinna kończyć się na:
-- ON DELETE CASCADE
