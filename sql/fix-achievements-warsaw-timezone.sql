-- Szpilplac: poprawka strefy czasowej odznak
-- Uruchom w Supabase SQL Editor.
-- Cel: gry zapisane między północą a ranem mają liczyć się według daty Europe/Warsaw, a nie UTC.

begin;

create or replace function public.szpilplac_warsaw_date(p_ts timestamptz default now())
returns date
language sql
stable
as $$
  select timezone('Europe/Warsaw', coalesce(p_ts, now()))::date
$$;

create or replace function public.szpilplac_warsaw_now_date()
returns date
language sql
stable
as $$
  select timezone('Europe/Warsaw', now())::date
$$;

do $$
declare
  fn oid;
  def text;
  newdef text;
begin
  for fn in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'szpilplac_check_achievement_event',
        'szpilplac_repair_user_daily_achievements',
        'szpilplac_repair_my_daily_achievements'
      )
  loop
    def := pg_get_functiondef(fn);
    newdef := def;

    newdef := replace(newdef, 'current_date', 'timezone(''Europe/Warsaw'', now())::date');
    newdef := replace(newdef, 'now()::date', 'timezone(''Europe/Warsaw'', now())::date');
    newdef := replace(newdef, 'created_at::date', 'timezone(''Europe/Warsaw'', created_at)::date');
    newdef := replace(newdef, 'finished_at::date', 'timezone(''Europe/Warsaw'', finished_at)::date');
    newdef := replace(newdef, 'coalesce(finished_at, created_at)::date', 'timezone(''Europe/Warsaw'', coalesce(finished_at, created_at))::date');
    newdef := replace(newdef, 'timezone(''UTC'', finished_at)::date', 'timezone(''Europe/Warsaw'', finished_at)::date');
    newdef := replace(newdef, 'timezone(''UTC'', created_at)::date', 'timezone(''Europe/Warsaw'', created_at)::date');
    newdef := replace(newdef, 'timezone(''UTC'', coalesce(finished_at, created_at))::date', 'timezone(''Europe/Warsaw'', coalesce(finished_at, created_at))::date');

    if newdef is distinct from def then
      execute newdef;
      raise notice 'Patched function %', fn::regprocedure;
    else
      raise notice 'No textual timezone patch needed for %', fn::regprocedure;
    end if;
  end loop;
end $$;

commit;

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
