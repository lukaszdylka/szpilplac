-- Szpilplac: odświeżenie schematu RPC i kontrola uprawnień analityki
-- Uruchom po admin-analytics-v3-track-events.sql.
-- Skrypt nie zapisuje testowych odsłon i nie zmienia istniejących danych.

begin;

-- Ponowne nadanie praw jest bezpieczne i idempotentne.
revoke all
  on function public.szpilplac_analytics_track(text,text,text,text)
  from public;

grant execute
  on function public.szpilplac_analytics_track(text,text,text,text)
  to anon;

grant execute
  on function public.szpilplac_analytics_track(text,text,text,text)
  to authenticated;

-- PostgREST/Supabase ma ponownie odczytać listę funkcji RPC.
notify pgrst, 'reload schema';

commit;

-- Kontrola instalacji. Wszystkie trzy wartości powinny być prawidłowe:
-- analytics_rpc: nazwa funkcji
-- anon_can_execute: true
-- authenticated_can_execute: true
select
  to_regprocedure(
    'public.szpilplac_analytics_track(text,text,text,text)'
  ) as analytics_rpc,
  has_function_privilege(
    'anon',
    'public.szpilplac_analytics_track(text,text,text,text)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.szpilplac_analytics_track(text,text,text,text)',
    'EXECUTE'
  ) as authenticated_can_execute;

-- Kontrola, czy pojawiły się już prawdziwe zdarzenia z witryny.
select
  created_at,
  event_type,
  visitor_id,
  puzzle_word
from public.szpilplac_events
where event_type in ('page_view','support_click')
order by created_at desc
limit 20;
