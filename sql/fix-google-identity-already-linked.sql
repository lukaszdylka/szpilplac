-- Szpilplac · diagnoza konfliktu Google identity_already_exists
--
-- Błąd z URL:
-- error_code=identity_already_exists
-- error_description=Identity is already linked to another user
--
-- Znaczenie:
-- To konto Google jest już wpisane w auth.identities i należy do innego użytkownika Supabase.
-- Nie da się podłączyć tej samej tożsamości Google do drugiego konta.
--
-- Najbezpieczniejsze rozwiązanie:
-- 1. Znajdź użytkownika, do którego jest już przypięte Google.
-- 2. Jeśli to stare/testowe konto, usuń je w Supabase Authentication → Users.
-- 3. Jeśli usuwanie blokuje familock_data, użyj sql/fix-familock-data-user-delete.sql.
-- 4. Wróć do właściwego konta i ponów "Podłącz Google".

-- ============================================================
-- 1. Lista wszystkich kont, które mają podpięte Google
-- ============================================================

select
  u.id as user_id,
  u.email as auth_email,
  u.created_at as user_created_at,
  i.id as identity_id,
  i.provider,
  i.provider_id,
  i.identity_data ->> 'email' as google_email,
  i.identity_data ->> 'name' as google_name,
  i.identity_data ->> 'full_name' as google_full_name,
  i.created_at as identity_created_at,
  p.login,
  p.display_name
from auth.identities i
join auth.users u on u.id = i.user_id
left join public.profiles p on p.id = u.id
where i.provider = 'google'
order by i.created_at desc;

-- ============================================================
-- 2. Szukanie konkretnego Google po emailu z Google
-- ============================================================
-- Podmień adres na email widoczny na ekranie zgody Google.

select
  u.id as user_id,
  u.email as auth_email,
  u.created_at as user_created_at,
  i.id as identity_id,
  i.provider,
  i.provider_id,
  i.identity_data,
  p.login,
  p.display_name
from auth.identities i
join auth.users u on u.id = i.user_id
left join public.profiles p on p.id = u.id
where i.provider = 'google'
  and lower(i.identity_data ->> 'email') = lower('TU_WPISZ_EMAIL_GOOGLE');

-- ============================================================
-- 3. Szukanie po provider_id z błędu, jeśli Supabase go pokazuje
-- ============================================================
-- Jeśli w error_description po dwukropku widzisz identyfikator, spróbuj tu.
-- Uwaga: Google provider_id bywa długim numerem, więc przepisz całość, nie tylko końcówkę.

select
  u.id as user_id,
  u.email as auth_email,
  u.created_at as user_created_at,
  i.id as identity_id,
  i.provider,
  i.provider_id,
  i.identity_data,
  p.login,
  p.display_name
from auth.identities i
join auth.users u on u.id = i.user_id
left join public.profiles p on p.id = u.id
where i.provider = 'google'
  and i.provider_id = 'TU_WPISZ_PROVIDER_ID';

-- ============================================================
-- 4. Jednorazowe wypięcie Google ze starego/testowego konta
-- ============================================================
-- Używaj tylko wtedy, gdy masz pewność, że to stare konto testowe.
-- Bezpieczniej zwykle usunąć całe stare konto w Authentication → Users.
-- Jeśli jednak chcesz odpiąć samą tożsamość Google z konkretnego user_id:
-- najpierw zostaw ROLLBACK, sprawdź RETURNING, potem uruchom ponownie z COMMIT.

-- begin;
-- delete from auth.identities
-- where provider = 'google'
--   and user_id = 'TU_WPISZ_USER_ID_STAREGO_KONTA'::uuid
-- returning *;
-- rollback;
-- commit;

-- Po COMMIT zaloguj się na właściwe konto i kliknij ponownie "Podłącz Google".

-- ============================================================
-- 5. Kontrola po naprawie
-- ============================================================
-- Po usunięciu starego/testowego powiązania ten SELECT nie powinien zwrócić starego konta.

select
  u.id as user_id,
  u.email as auth_email,
  i.provider,
  i.provider_id,
  i.identity_data ->> 'email' as google_email,
  p.login,
  p.display_name
from auth.identities i
join auth.users u on u.id = i.user_id
left join public.profiles p on p.id = u.id
where i.provider = 'google'
order by i.created_at desc;
