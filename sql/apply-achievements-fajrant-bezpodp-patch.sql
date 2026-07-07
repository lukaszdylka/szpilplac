-- Szpilplac · executable patch: Fajrant + Bez Podpowiydzi
--
-- Uruchom w Supabase SQL Editor.
-- Co robi:
-- 1. Bez Podpowiydzi: tylko wygrana gra dzienna bez podpowiedzi; tygodniowa Kłōdka nie liczy się.
-- 2. Fajrant: opuszczony dzień bez żadnej gry, a nie 4 gry jednego dnia.
--
-- Patch modyfikuje istniejące funkcje przez pobranie ich aktualnej definicji i podmianę konkretnych bloków.
-- Jeśli Supabase zwróci exception "Nie znaleziono bloku...", nie uruchamiaj nic dalej i podeślij aktualną definicję funkcji.

begin;

do $$
declare
  ddl text;
  old_bez text;
  new_bez text;
  old_fajrant_event text;
  new_fajrant_event text;
begin
  select pg_get_functiondef(p.oid)
  into ddl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'szpilplac_check_achievement_event';

  if ddl is null then
    raise exception 'Nie znaleziono funkcji public.szpilplac_check_achievement_event';
  end if;

  old_bez := $old$
    if p_won is true and v_hints = 0 then
      return query select * from public.szpilplac_award_user_achievement(v_user, 'bezpodp', v_source, p_meta);
    end if;
$old$;

  new_bez := $new$
    if p_won is true
       and v_hints = 0
       and coalesce(p_meta ->> 'mode', 'daily') = 'daily'
       and not (v_source = 'klodka' and coalesce(p_meta ->> 'mode', '') = 'weekly') then
      return query select * from public.szpilplac_award_user_achievement(v_user, 'bezpodp', v_source, p_meta);
    end if;
$new$;

  if position(old_bez in ddl) = 0 then
    raise exception 'Nie znaleziono bloku Bez Podpowiydzi w szpilplac_check_achievement_event';
  end if;
  ddl := replace(ddl, old_bez, new_bez);

  old_fajrant_event := $old$
    v_done_today := public.szpilplac_daily_done_count(v_user, v_local_date);
    if v_done_today >= 4 then
      return query select * from public.szpilplac_award_user_achievement(v_user, 'fajrant', v_source,
        jsonb_build_object('source','v121_game_finished','daily_done',v_done_today,'day',v_local_date::text) || coalesce(p_meta,'{}'::jsonb));
    end if;
$old$;

  new_fajrant_event := $new$
    if exists (
      with bounds as (
        select
          coalesce(min(timezone('Europe/Warsaw', finished_at)::date), v_local_date) as first_day,
          v_local_date - 1 as yesterday
        from public.user_game_results
        where user_id = v_user
      ), days as (
        select generate_series(first_day, yesterday, interval '1 day')::date as day
        from bounds
        where yesterday >= first_day
      )
      select 1
      from days d
      where not exists (
        select 1
        from public.user_game_results ugr
        where ugr.user_id = v_user
          and timezone('Europe/Warsaw', ugr.finished_at)::date = d.day
      )
    ) then
      return query select * from public.szpilplac_award_user_achievement(v_user, 'fajrant', v_source,
        jsonb_build_object('source','missed_day_without_any_game','checked_at',v_local_date::text) || coalesce(p_meta,'{}'::jsonb));
    end if;
$new$;

  if position(old_fajrant_event in ddl) = 0 then
    raise exception 'Nie znaleziono bloku Fajrant w szpilplac_check_achievement_event';
  end if;
  ddl := replace(ddl, old_fajrant_event, new_fajrant_event);

  execute ddl;
end $$;

do $$
declare
  ddl text;
  old_fajrant_repair text;
  new_fajrant_repair text;
begin
  select pg_get_functiondef(p.oid)
  into ddl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'szpilplac_repair_user_daily_achievements';

  if ddl is null then
    raise exception 'Nie znaleziono funkcji public.szpilplac_repair_user_daily_achievements';
  end if;

  old_fajrant_repair := $old$
  -- Fajrant: cztery różne gry jednego dnia.
  v_sql := format($fmt$
    insert into public.user_achievements(user_id, achievement_id, earned_at, source_game, meta)
    select x.user_id, 'fajrant', x.first_done, null, jsonb_build_object('source','v121_repair_fajrant','daily_done',x.games,'day',x.day::text)
    from (
      select r.user_id, timezone('Europe/Warsaw', %1$s)::date as day, max(%1$s) as first_done,
             count(distinct public.szpilplac_normalize_game_key(r.game)) as games
      from public.user_game_results r
      where 1=1 %2$s
      group by r.user_id, timezone('Europe/Warsaw', %1$s)::date
      having count(distinct public.szpilplac_normalize_game_key(r.game)) >= 4
    ) x
    on conflict on constraint user_achievements_pkey do nothing
  $fmt$, v_when, v_filter);
  if p_user is null then execute v_sql; else execute v_sql using p_user; end if;
$old$;

  new_fajrant_repair := $new$
  -- Fajrant: opuszczony dzień bez żadnej gry.
  v_sql := format($fmt$
    insert into public.user_achievements(user_id, achievement_id, earned_at, source_game, meta)
    select x.user_id, 'fajrant', now(), null, jsonb_build_object('source','missed_day_without_any_game','missed_day',x.day::text)
    from (
      with users as (
        select distinct r.user_id
        from public.user_game_results r
        where 1=1 %2$s
      ), bounds as (
        select
          u.user_id,
          coalesce(min(timezone('Europe/Warsaw', %1$s)::date), timezone('Europe/Warsaw', now())::date) as first_day,
          timezone('Europe/Warsaw', now())::date - 1 as yesterday
        from users u
        left join public.user_game_results r on r.user_id = u.user_id
        group by u.user_id
      ), days as (
        select b.user_id, generate_series(b.first_day, b.yesterday, interval '1 day')::date as day
        from bounds b
        where b.yesterday >= b.first_day
      )
      select d.user_id, min(d.day) as day
      from days d
      where not exists (
        select 1
        from public.user_game_results ugr
        where ugr.user_id = d.user_id
          and timezone('Europe/Warsaw', coalesce(ugr.finished_at, ugr.created_at, now()))::date = d.day
      )
      group by d.user_id
    ) x
    on conflict on constraint user_achievements_pkey do nothing
  $fmt$, v_when, v_filter);
  if p_user is null then execute v_sql; else execute v_sql using p_user; end if;
$new$;

  if position(old_fajrant_repair in ddl) = 0 then
    raise exception 'Nie znaleziono bloku Fajrant w szpilplac_repair_user_daily_achievements';
  end if;

  ddl := replace(ddl, old_fajrant_repair, new_fajrant_repair);
  execute ddl;
end $$;

commit;

-- Kontrola po patchu:
select pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('szpilplac_check_achievement_event','szpilplac_repair_user_daily_achievements')
order by p.proname;

-- Opcjonalne czyszczenie błędnie przyznanego starego Fajrantu.
-- Najpierw ROLLBACK, sprawdź wynik RETURNING. Dopiero potem powtórz z COMMIT.
--
-- begin;
-- delete from public.user_achievements
-- where achievement_id = 'fajrant'
--   and (
--     meta ->> 'source' in ('v121_game_finished','v121_repair_fajrant')
--     or meta ? 'daily_done'
--   )
-- returning *;
-- rollback;
