-- Szpilplac: prosta analityka ruchu i wsparcia
-- Uruchom raz w Supabase SQL Editor po wdrożeniu plików z PR.
-- Korzysta z istniejącej tabeli szpilplac_events i profili graczy.
-- Nie zapisuje IP, user-agenta, e-maila ani danych zewnętrznych.

begin;

alter table public.szpilplac_events
  add column if not exists visitor_id text;

alter table public.szpilplac_events
  add column if not exists event_type text;

create index if not exists szpilplac_events_type_created_idx
  on public.szpilplac_events (event_type, created_at desc);

create index if not exists szpilplac_events_type_visitor_idx
  on public.szpilplac_events (event_type, visitor_id);

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

drop view if exists public.stats_admin_analytics_overview;
drop view if exists public.stats_admin_analytics_daily;
drop view if exists public.stats_admin_support_sources;
drop view if exists public.stats_admin_top_pages;
drop view if exists public.stats_admin_new_accounts;

create view public.stats_admin_analytics_overview
with (security_barrier = true)
as
with
admin_access as (
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.rank_name,'')) = 'starzik'
  ) as allowed
),
calendar as (
  select timezone('Europe/Warsaw', now())::date as today
),
events as (
  select
    timezone('Europe/Warsaw', e.created_at)::date as local_day,
    e.created_at,
    nullif(e.visitor_id,'') as visitor_id,
    coalesce(nullif(e.event_type,''),'game_finish') as event_type,
    nullif(e.puzzle_word,'') as detail
  from public.szpilplac_events e
),
returning as (
  select count(*)::integer as returning_visitors_7d
  from (
    select visitor_id
    from events, calendar
    where event_type = 'page_view'
      and visitor_id is not null
      and local_day between today - 6 and today
    group by visitor_id
    having count(distinct local_day) >= 2
  ) q
)
select
  (select count(*) from public.profiles)::integer as accounts_total,
  (select count(*) from public.profiles, calendar where timezone('Europe/Warsaw', created_at)::date = today)::integer as new_accounts_today,
  (select count(*) from public.profiles, calendar where timezone('Europe/Warsaw', created_at)::date between today - 6 and today)::integer as new_accounts_7d,
  (select count(*) from public.profiles, calendar where timezone('Europe/Warsaw', created_at)::date between today - 29 and today)::integer as new_accounts_30d,

  count(*) filter (where event_type = 'page_view' and local_day = calendar.today)::integer as page_views_today,
  count(distinct visitor_id) filter (where event_type = 'page_view' and visitor_id is not null and local_day = calendar.today)::integer as visitors_today,
  count(*) filter (where event_type = 'page_view' and local_day between calendar.today - 6 and calendar.today)::integer as page_views_7d,
  count(distinct visitor_id) filter (where event_type = 'page_view' and visitor_id is not null and local_day between calendar.today - 6 and calendar.today)::integer as visitors_7d,
  count(*) filter (where event_type = 'page_view' and local_day between calendar.today - 29 and calendar.today)::integer as page_views_30d,
  count(distinct visitor_id) filter (where event_type = 'page_view' and visitor_id is not null and local_day between calendar.today - 29 and calendar.today)::integer as visitors_30d,

  count(*) filter (where event_type = 'game_finish' and local_day = calendar.today)::integer as game_finishes_today,
  count(distinct visitor_id) filter (where event_type = 'game_finish' and visitor_id is not null and local_day = calendar.today)::integer as game_players_today,
  count(*) filter (where event_type = 'game_finish' and local_day between calendar.today - 6 and calendar.today)::integer as game_finishes_7d,
  count(distinct visitor_id) filter (where event_type = 'game_finish' and visitor_id is not null and local_day between calendar.today - 6 and calendar.today)::integer as game_players_7d,
  count(*) filter (where event_type = 'game_finish' and local_day between calendar.today - 29 and calendar.today)::integer as game_finishes_30d,
  count(distinct visitor_id) filter (where event_type = 'game_finish' and visitor_id is not null and local_day between calendar.today - 29 and calendar.today)::integer as game_players_30d,

  count(*) filter (where event_type = 'support_click' and local_day = calendar.today)::integer as support_clicks_today,
  count(*) filter (where event_type = 'support_click' and local_day between calendar.today - 6 and calendar.today)::integer as support_clicks_7d,
  count(*) filter (where event_type = 'support_click' and local_day between calendar.today - 29 and calendar.today)::integer as support_clicks_30d,
  (select returning_visitors_7d from returning) as returning_visitors_7d,
  max(created_at) filter (where event_type = 'page_view') as last_page_view
from events
cross join calendar
cross join admin_access
where admin_access.allowed
group by calendar.today;

create view public.stats_admin_analytics_daily
with (security_barrier = true)
as
with
admin_access as (
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.rank_name,'')) = 'starzik'
  ) as allowed
),
days as (
  select generate_series(
    timezone('Europe/Warsaw', now())::date - 29,
    timezone('Europe/Warsaw', now())::date,
    interval '1 day'
  )::date as day
),
e as (
  select
    timezone('Europe/Warsaw', created_at)::date as day,
    coalesce(nullif(event_type,''),'game_finish') as event_type,
    nullif(visitor_id,'') as visitor_id
  from public.szpilplac_events
  where created_at >= now() - interval '31 days'
),
event_daily as (
  select
    day,
    count(*) filter (where event_type = 'page_view')::integer as page_views,
    count(distinct visitor_id) filter (where event_type = 'page_view' and visitor_id is not null)::integer as visitors,
    count(*) filter (where event_type = 'game_finish')::integer as game_finishes,
    count(distinct visitor_id) filter (where event_type = 'game_finish' and visitor_id is not null)::integer as game_players,
    count(*) filter (where event_type = 'support_click')::integer as support_clicks
  from e
  group by day
),
account_daily as (
  select timezone('Europe/Warsaw', created_at)::date as day, count(*)::integer as new_accounts
  from public.profiles
  where created_at >= now() - interval '31 days'
  group by 1
)
select
  d.day,
  coalesce(ed.page_views,0)::integer as page_views,
  coalesce(ed.visitors,0)::integer as visitors,
  coalesce(ed.game_finishes,0)::integer as game_finishes,
  coalesce(ed.game_players,0)::integer as game_players,
  coalesce(ed.support_clicks,0)::integer as support_clicks,
  coalesce(ad.new_accounts,0)::integer as new_accounts
from days d
cross join admin_access aa
left join event_daily ed on ed.day = d.day
left join account_daily ad on ad.day = d.day
where aa.allowed
order by d.day desc;

create view public.stats_admin_support_sources
with (security_barrier = true)
as
with
admin_access as (
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.rank_name,'')) = 'starzik'
  ) as allowed
),
e as (
  select
    coalesce(nullif(puzzle_word,''),'link') as source,
    timezone('Europe/Warsaw', created_at)::date as local_day
  from public.szpilplac_events
  where event_type = 'support_click'
)
select
  source,
  count(*) filter (where local_day = timezone('Europe/Warsaw', now())::date)::integer as clicks_today,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 6)::integer as clicks_7d,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 29)::integer as clicks_30d,
  count(*)::integer as clicks_total
from e
cross join admin_access aa
where aa.allowed
group by source
order by clicks_30d desc, clicks_total desc;

create view public.stats_admin_top_pages
with (security_barrier = true)
as
with
admin_access as (
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.rank_name,'')) = 'starzik'
  ) as allowed
),
e as (
  select
    coalesce(nullif(puzzle_word,''),'/') as path,
    timezone('Europe/Warsaw', created_at)::date as local_day,
    nullif(visitor_id,'') as visitor_id
  from public.szpilplac_events
  where event_type = 'page_view'
)
select
  path,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 6)::integer as views_7d,
  count(distinct visitor_id) filter (where visitor_id is not null and local_day >= timezone('Europe/Warsaw', now())::date - 6)::integer as visitors_7d,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 29)::integer as views_30d,
  count(distinct visitor_id) filter (where visitor_id is not null and local_day >= timezone('Europe/Warsaw', now())::date - 29)::integer as visitors_30d
from e
cross join admin_access aa
where aa.allowed
group by path
order by views_30d desc, views_7d desc;

create view public.stats_admin_new_accounts
with (security_barrier = true)
as
with admin_access as (
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.rank_name,'')) = 'starzik'
  ) as allowed
), results as (
  select
    user_id,
    count(*)::integer as games_played,
    max(coalesce(finished_at,created_at)) as last_play
  from public.user_game_results
  group by user_id
)
select
  p.id,
  p.login,
  p.created_at,
  p.city,
  p.voivodeship,
  coalesce(r.games_played,0)::integer as games_played,
  r.last_play
from public.profiles p
cross join admin_access aa
left join results r on r.user_id = p.id
where aa.allowed
order by p.created_at desc;

revoke all on public.stats_admin_analytics_overview from anon;
revoke all on public.stats_admin_analytics_daily from anon;
revoke all on public.stats_admin_support_sources from anon;
revoke all on public.stats_admin_top_pages from anon;
revoke all on public.stats_admin_new_accounts from anon;

grant select on public.stats_admin_analytics_overview to authenticated;
grant select on public.stats_admin_analytics_daily to authenticated;
grant select on public.stats_admin_support_sources to authenticated;
grant select on public.stats_admin_top_pages to authenticated;
grant select on public.stats_admin_new_accounts to authenticated;

commit;

-- Kontrola po uruchomieniu jako zalogowany administrator:
select * from public.stats_admin_analytics_overview;
select * from public.stats_admin_analytics_daily limit 14;
select * from public.stats_admin_support_sources;
select * from public.stats_admin_top_pages limit 10;
select * from public.stats_admin_new_accounts limit 10;
