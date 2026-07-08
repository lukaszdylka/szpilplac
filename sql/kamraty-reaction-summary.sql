-- Szpilplac: podsumowanie reakcji otrzymanych
-- Uruchom w Supabase SQL Editor.
-- Dodaje:
-- - szp_my_reaction_summary()
-- - szp_public_reaction_summary(p_player_id uuid)

begin;

drop function if exists public.szp_my_reaction_summary();
drop function if exists public.szp_public_reaction_summary(uuid);

create function public.szp_my_reaction_summary()
returns table(
  today_counts jsonb,
  total_counts jsonb,
  total_count integer,
  top_reaction text
)
language sql
security definer
set search_path = public, auth
as $$
  with me as (
    select auth.uid() as target_id
  ),
  all_r as (
    select r.reaction, r.reaction_date
    from public.szpilplac_reactions r
    join me on me.target_id = r.target_id
    where me.target_id is not null
  ),
  today as (
    select coalesce(jsonb_object_agg(x.reaction, x.cnt), '{}'::jsonb) as counts
    from (
      select reaction, count(*)::integer as cnt
      from all_r
      where reaction_date = timezone('Europe/Warsaw', now())::date
      group by reaction
    ) x
  ),
  total as (
    select coalesce(jsonb_object_agg(x.reaction, x.cnt), '{}'::jsonb) as counts
    from (
      select reaction, count(*)::integer as cnt
      from all_r
      group by reaction
    ) x
  ),
  top_one as (
    select reaction
    from all_r
    group by reaction
    order by count(*) desc, reaction asc
    limit 1
  )
  select
    coalesce((select counts from today), '{}'::jsonb) as today_counts,
    coalesce((select counts from total), '{}'::jsonb) as total_counts,
    coalesce((select count(*)::integer from all_r), 0) as total_count,
    (select reaction from top_one) as top_reaction;
$$;

create function public.szp_public_reaction_summary(p_player_id uuid)
returns table(
  today_counts jsonb,
  total_counts jsonb,
  total_count integer,
  top_reaction text
)
language sql
security definer
set search_path = public
as $$
  with allowed as (
    select p_player_id as target_id
    where exists (
      select 1
      from public.profiles p
      where p.id = p_player_id
        and coalesce(p.public_profile,false) is true
    )
  ),
  all_r as (
    select r.reaction, r.reaction_date
    from public.szpilplac_reactions r
    join allowed a on a.target_id = r.target_id
  ),
  today as (
    select coalesce(jsonb_object_agg(x.reaction, x.cnt), '{}'::jsonb) as counts
    from (
      select reaction, count(*)::integer as cnt
      from all_r
      where reaction_date = timezone('Europe/Warsaw', now())::date
      group by reaction
    ) x
  ),
  total as (
    select coalesce(jsonb_object_agg(x.reaction, x.cnt), '{}'::jsonb) as counts
    from (
      select reaction, count(*)::integer as cnt
      from all_r
      group by reaction
    ) x
  ),
  top_one as (
    select reaction
    from all_r
    group by reaction
    order by count(*) desc, reaction asc
    limit 1
  )
  select
    coalesce((select counts from today), '{}'::jsonb) as today_counts,
    coalesce((select counts from total), '{}'::jsonb) as total_counts,
    coalesce((select count(*)::integer from all_r), 0) as total_count,
    (select reaction from top_one) as top_reaction;
$$;

grant execute on function public.szp_my_reaction_summary() to authenticated;
grant execute on function public.szp_public_reaction_summary(uuid) to anon, authenticated;

commit;

-- Kontrola:
select * from public.szp_my_reaction_summary();
