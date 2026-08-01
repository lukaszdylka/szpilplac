-- Szpilplac: poprawny zapis odsłon i kliknięć wsparcia
-- Uruchom raz w Supabase SQL Editor po admin-analytics-v1.sql.
-- V2 (daty kont) może być uruchomione przed albo po tym skrypcie.

begin;

create or replace function public.szpilplac_analytics_track(
  p_event_type text,
  p_visitor_id text,
  p_value text,
  p_lang text default 'pl'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text := lower(trim(coalesce(p_event_type,'')));
  v_visitor_id text := left(trim(coalesce(p_visitor_id,'')),100);
  v_value text := left(trim(coalesce(p_value,'')),240);
  v_lang text := left(trim(coalesce(p_lang,'pl')),8);
  v_window interval;
begin
  if v_event_type not in ('page_view','support_click') then
    return false;
  end if;

  if length(v_visitor_id) < 8 then
    return false;
  end if;

  if v_event_type = 'page_view' then
    if v_value = '' or left(v_value,1) <> '/' then
      return false;
    end if;
    v_window := interval '8 seconds';
  else
    if v_value = '' then
      v_value := 'link';
    end if;
    v_window := interval '2 seconds';
  end if;

  if exists (
    select 1
    from public.szpilplac_events e
    where e.event_type = v_event_type
      and e.visitor_id = v_visitor_id
      and coalesce(e.puzzle_word,'') = v_value
      and e.created_at >= now() - v_window
  ) then
    return true;
  end if;

  insert into public.szpilplac_events (
    game,
    puzzle_no,
    puzzle_word,
    won,
    tries,
    lang,
    visitor_id,
    event_type
  ) values (
    'szpilplac',
    0,
    v_value,
    false,
    0,
    coalesce(nullif(v_lang,''),'pl'),
    v_visitor_id,
    v_event_type
  );

  return true;
end;
$$;

revoke all on function public.szpilplac_analytics_track(text,text,text,text) from public;
grant execute on function public.szpilplac_analytics_track(text,text,text,text) to anon;
grant execute on function public.szpilplac_analytics_track(text,text,text,text) to authenticated;

commit;

-- Test techniczny. Po wykonaniu powinien zwrócić true.
select public.szpilplac_analytics_track(
  'page_view',
  'sql-test-visitor-0001',
  '/test-analityki',
  'pl'
) as zapisano;

-- Kontrola ostatnich zdarzeń analitycznych.
select
  created_at,
  event_type,
  visitor_id,
  puzzle_word
from public.szpilplac_events
where event_type in ('page_view','support_click')
order by created_at desc
limit 20;
