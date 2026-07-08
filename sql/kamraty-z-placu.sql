-- Szpilplac: Kamraty z placu
-- Profil publiczny, obserwowani gracze, porównanie i lekkie reakcje.
-- Uruchom w Supabase SQL Editor po wrzuceniu plików.

begin;

alter table public.profiles
  add column if not exists public_profile boolean not null default false;

create table if not exists public.szpilplac_kamraty (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint szpilplac_kamraty_no_self check (follower_id <> followed_id)
);

create table if not exists public.szpilplac_reactions (
  id uuid primary key default gen_random_uuid(),
  reactor_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null,
  reaction_date date not null default (timezone('Europe/Warsaw', now())::date),
  created_at timestamptz not null default now(),
  constraint szpilplac_reactions_allowed check (reaction in ('Fest!','Przaja Ci!','Dobro robota!','Gonia Cie!','Gowa paruje!')),
  constraint szpilplac_reactions_no_self check (reactor_id <> target_id),
  unique (reactor_id, target_id, reaction_date)
);

alter table public.szpilplac_kamraty enable row level security;
alter table public.szpilplac_reactions enable row level security;

drop policy if exists "kamraty_select_own" on public.szpilplac_kamraty;
create policy "kamraty_select_own" on public.szpilplac_kamraty
for select using (auth.uid() = follower_id);

drop policy if exists "kamraty_insert_own" on public.szpilplac_kamraty;
create policy "kamraty_insert_own" on public.szpilplac_kamraty
for insert with check (auth.uid() = follower_id);

drop policy if exists "kamraty_delete_own" on public.szpilplac_kamraty;
create policy "kamraty_delete_own" on public.szpilplac_kamraty
for delete using (auth.uid() = follower_id);

drop policy if exists "reactions_select_public" on public.szpilplac_reactions;
create policy "reactions_select_public" on public.szpilplac_reactions
for select using (true);

drop policy if exists "reactions_insert_own" on public.szpilplac_reactions;
create policy "reactions_insert_own" on public.szpilplac_reactions
for insert with check (auth.uid() = reactor_id);

drop policy if exists "reactions_update_own" on public.szpilplac_reactions;
create policy "reactions_update_own" on public.szpilplac_reactions
for update using (auth.uid() = reactor_id) with check (auth.uid() = reactor_id);

create index if not exists szpilplac_kamraty_followed_idx on public.szpilplac_kamraty (followed_id);
create index if not exists szpilplac_reactions_target_day_idx on public.szpilplac_reactions (target_id, reaction_date);
create index if not exists szpilplac_reactions_reactor_day_idx on public.szpilplac_reactions (reactor_id, reaction_date);

drop view if exists public.szp_public_profile_stats;

create view public.szp_public_profile_stats as
with r as (
  select
    ugr.user_id,
    count(*)::integer as games_played,
    count(*) filter (where ugr.won is true)::integer as wins,
    coalesce(sum(coalesce(ugr.score,0)),0)::integer as points,
    max(ugr.finished_at) as last_play,
    count(*) filter (
      where timezone('Europe/Warsaw', ugr.finished_at)::date = timezone('Europe/Warsaw', now())::date
    )::integer as played_today,
    count(*) filter (
      where timezone('Europe/Warsaw', ugr.finished_at)::date >= timezone('Europe/Warsaw', now())::date - 6
    )::integer as played_7d,
    count(*) filter (
      where timezone('Europe/Warsaw', ugr.finished_at)::date >= timezone('Europe/Warsaw', now())::date - 29
    )::integer as played_30d
  from public.user_game_results ugr
  group by ugr.user_id
)
select
  p.id as user_id,
  coalesce(nullif(p.login,''), nullif(p.display_name,''), 'gracz')::text as login,
  p.display_name::text as display_name,
  p.avatar_key::text as avatar_key,
  coalesce(p.rank_name,'Gorol')::text as rank_name,
  coalesce(r.games_played,0)::integer as games_played,
  coalesce(r.wins,0)::integer as wins,
  coalesce(r.points,0)::integer as points,
  coalesce(r.played_today,0)::integer as played_today,
  coalesce(r.played_7d,0)::integer as played_7d,
  coalesce(r.played_30d,0)::integer as played_30d,
  case when coalesce(r.games_played,0) > 0 then round(100.0 * coalesce(r.wins,0) / r.games_played)::integer else 0 end as win_pct,
  r.last_play
from public.profiles p
left join r on r.user_id = p.id
where coalesce(p.public_profile,false) is true;

grant select on public.szp_public_profile_stats to anon, authenticated;

create or replace function public.szp_my_public_profile()
returns table(public_profile boolean)
language sql
security definer
set search_path = public, auth
as $$
  select coalesce((select p.public_profile from public.profiles p where p.id = auth.uid()), false) as public_profile;
$$;

create or replace function public.szp_set_public_profile(p_public boolean)
returns table(public_profile boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.profiles
  set public_profile = coalesce(p_public,false)
  where id = auth.uid();

  return query
  select coalesce((select p.public_profile from public.profiles p where p.id = auth.uid()), false);
end;
$$;

create or replace function public.szp_public_players()
returns table(user_id uuid, login text, display_name text, avatar_key text, rank_name text, games_played integer, wins integer, points integer, played_today integer, played_7d integer, played_30d integer, win_pct integer, last_play timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.user_id, s.login, s.display_name, s.avatar_key, s.rank_name, s.games_played, s.wins, s.points, s.played_today, s.played_7d, s.played_30d, s.win_pct, s.last_play
  from public.szp_public_profile_stats s
  order by s.points desc, s.wins desc, s.games_played desc
  limit 200;
$$;

create or replace function public.szp_get_public_player(p_player_id uuid)
returns table(user_id uuid, login text, display_name text, avatar_key text, rank_name text, games_played integer, wins integer, points integer, played_today integer, played_7d integer, played_30d integer, win_pct integer, last_play timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.user_id, s.login, s.display_name, s.avatar_key, s.rank_name, s.games_played, s.wins, s.points, s.played_today, s.played_7d, s.played_30d, s.win_pct, s.last_play
  from public.szp_public_profile_stats s
  where s.user_id = p_player_id
  limit 1;
$$;

create or replace function public.szp_follow_player(p_target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Najpierw zaloguj się na konto.'; end if;
  if p_target_id = auth.uid() then raise exception 'Nie możesz dodać siebie do kamratów.'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_target_id and coalesce(p.public_profile,false) is true) then
    raise exception 'Ten profil nie jest publiczny.';
  end if;
  insert into public.szpilplac_kamraty(follower_id, followed_id)
  values (auth.uid(), p_target_id)
  on conflict do nothing;
  return true;
end;
$$;

create or replace function public.szp_unfollow_player(p_target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Najpierw zaloguj się na konto.'; end if;
  delete from public.szpilplac_kamraty where follower_id = auth.uid() and followed_id = p_target_id;
  return true;
end;
$$;

create or replace function public.szp_my_kamraty()
returns table(user_id uuid, login text, display_name text, avatar_key text, rank_name text, games_played integer, wins integer, points integer, played_today integer, played_7d integer, played_30d integer, win_pct integer, last_play timestamptz, followed_at timestamptz, my_reaction_today text, reaction_counts jsonb)
language sql
security definer
set search_path = public, auth
as $$
  select
    s.user_id, s.login, s.display_name, s.avatar_key, s.rank_name, s.games_played, s.wins, s.points, s.played_today, s.played_7d, s.played_30d, s.win_pct, s.last_play,
    k.created_at as followed_at,
    (select rr.reaction from public.szpilplac_reactions rr where rr.reactor_id = auth.uid() and rr.target_id = s.user_id and rr.reaction_date = timezone('Europe/Warsaw', now())::date limit 1) as my_reaction_today,
    coalesce((select jsonb_object_agg(x.reaction, x.cnt) from (select r.reaction, count(*)::integer as cnt from public.szpilplac_reactions r where r.target_id = s.user_id and r.reaction_date = timezone('Europe/Warsaw', now())::date group by r.reaction) x), '{}'::jsonb) as reaction_counts
  from public.szpilplac_kamraty k
  join public.szp_public_profile_stats s on s.user_id = k.followed_id
  where k.follower_id = auth.uid()
  order by k.created_at desc;
$$;

create or replace function public.szp_send_reaction(p_target_id uuid, p_reaction text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare today date := timezone('Europe/Warsaw', now())::date;
begin
  if auth.uid() is null then raise exception 'Najpierw zaloguj się na konto.'; end if;
  if p_target_id = auth.uid() then raise exception 'Nie możesz reagować na własny profil.'; end if;
  if p_reaction not in ('Fest!','Przaja Ci!','Dobro robota!','Gonia Cie!','Gowa paruje!') then raise exception 'Nieznana reakcja.'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_target_id and coalesce(p.public_profile,false) is true) then
    raise exception 'Ten profil nie jest publiczny.';
  end if;
  insert into public.szpilplac_reactions(reactor_id,target_id,reaction,reaction_date)
  values (auth.uid(), p_target_id, p_reaction, today)
  on conflict (reactor_id, target_id, reaction_date)
  do update set reaction = excluded.reaction, created_at = now();
  return true;
end;
$$;

create or replace function public.szp_compare_with_player(p_target_id uuid)
returns table(metric text, me_value text, target_value text)
language sql
security definer
set search_path = public, auth
as $$
  with me as (
    select count(*)::integer as games, count(*) filter (where won is true)::integer as wins, coalesce(sum(coalesce(score,0)),0)::integer as points,
    count(*) filter (where timezone('Europe/Warsaw', finished_at)::date = timezone('Europe/Warsaw', now())::date)::integer as today
    from public.user_game_results where user_id = auth.uid()
  ),
  target as (
    select s.games_played as games, s.wins, s.points, s.played_today as today
    from public.szp_public_profile_stats s where s.user_id = p_target_id
  )
  select 'Punkty'::text, coalesce(me.points,0)::text, coalesce(target.points,0)::text from me, target
  union all select 'Gry'::text, coalesce(me.games,0)::text, coalesce(target.games,0)::text from me, target
  union all select 'Wygrane'::text, coalesce(me.wins,0)::text, coalesce(target.wins,0)::text from me, target
  union all select 'Skuteczność'::text,
    case when coalesce(me.games,0)>0 then round(100.0*me.wins/me.games)::integer::text || '%' else '0%' end,
    case when coalesce(target.games,0)>0 then round(100.0*target.wins/target.games)::integer::text || '%' else '0%' end
  from me, target
  union all select 'Gry dziś'::text, coalesce(me.today,0)::text, coalesce(target.today,0)::text from me, target;
$$;

grant execute on function public.szp_my_public_profile() to authenticated;
grant execute on function public.szp_set_public_profile(boolean) to authenticated;
grant execute on function public.szp_public_players() to anon, authenticated;
grant execute on function public.szp_get_public_player(uuid) to anon, authenticated;
grant execute on function public.szp_follow_player(uuid) to authenticated;
grant execute on function public.szp_unfollow_player(uuid) to authenticated;
grant execute on function public.szp_my_kamraty() to authenticated;
grant execute on function public.szp_send_reaction(uuid,text) to authenticated;
grant execute on function public.szp_compare_with_player(uuid) to authenticated;

commit;

select * from public.szp_public_players() limit 10;
