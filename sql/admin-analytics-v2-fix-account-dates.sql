-- Szpilplac: poprawka dat rejestracji w statystykach admina
-- Uruchom raz w Supabase SQL Editor po admin-analytics-v1.sql.
-- Źródłem daty założenia konta jest teraz auth.users.created_at,
-- a nie public.profiles.created_at.

begin;

drop view if exists public.stats_admin_analytics_overview;
drop view if exists public.stats_admin_analytics_daily;
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
    coalesce(nullif(e.event_type,''),'game_finish') as event_type
  from public.szpilplac_events e
),
returning_stats as (
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
),
account_stats as (
  select
    count(*)::integer as accounts_total,
    count(*) filter (
      where timezone('Europe/Warsaw', u.created_at)::date = c.today
    )::integer as new_accounts_today,
    count(*) filter (
      where timezone('Europe/Warsaw', u.created_at)::date between c.today - 6 and c.today
    )::integer as new_accounts_7d,
    count(*) filter (
      where timezone('Europe/Warsaw', u.created_at)::date between c.today - 29 and c.today
    )::integer as new_accounts_30d
  from auth.users u
  cross join calendar c
)
select
  a.accounts_total,
  a.new_accounts_today,
  a.new_accounts_7d,
  a.new_accounts_30d,

  count(*) filter (
    where event_type = 'page_view'
      and local_day = calendar.today
  )::integer as page_views_today,

  count(distinct visitor_id) filter (
    where event_type = 'page_view'
      and visitor_id is not null
      and local_day = calendar.today
  )::integer as visitors_today,

  count(*) filter (
    where event_type = 'page_view'
      and local_day between calendar.today - 6 and calendar.today
  )::integer as page_views_7d,

  count(distinct visitor_id) filter (
    where event_type = 'page_view'
      and visitor_id is not null
      and local_day between calendar.today - 6 and calendar.today
  )::integer as visitors_7d,

  count(*) filter (
    where event_type = 'page_view'
      and local_day between calendar.today - 29 and calendar.today
  )::integer as page_views_30d,

  count(distinct visitor_id) filter (
    where event_type = 'page_view'
      and visitor_id is not null
      and local_day between calendar.today - 29 and calendar.today
  )::integer as visitors_30d,

  count(*) filter (
    where event_type = 'game_finish'
      and local_day = calendar.today
  )::integer as game_finishes_today,

  count(distinct visitor_id) filter (
    where event_type = 'game_finish'
      and visitor_id is not null
      and local_day = calendar.today
  )::integer as game_players_today,

  count(*) filter (
    where event_type = 'game_finish'
      and local_day between calendar.today - 6 and calendar.today
  )::integer as game_finishes_7d,

  count(distinct visitor_id) filter (
    where event_type = 'game_finish'
      and visitor_id is not null
      and local_day between calendar.today - 6 and calendar.today
  )::integer as game_players_7d,

  count(*) filter (
    where event_type = 'game_finish'
      and local_day between calendar.today - 29 and calendar.today
  )::integer as game_finishes_30d,

  count(distinct visitor_id) filter (
    where event_type = 'game_finish'
      and visitor_id is not null
      and local_day between calendar.today - 29 and calendar.today
  )::integer as game_players_30d,

  count(*) filter (
    where event_type = 'support_click'
      and local_day = calendar.today
  )::integer as support_clicks_today,

  count(*) filter (
    where event_type = 'support_click'
      and local_day between calendar.today - 6 and calendar.today
  )::integer as support_clicks_7d,

  count(*) filter (
    where event_type = 'support_click'
      and local_day between calendar.today - 29 and calendar.today
  )::integer as support_clicks_30d,

  (select returning_visitors_7d from returning_stats) as returning_visitors_7d,
  max(created_at) filter (where event_type = 'page_view') as last_page_view
from events
cross join calendar
cross join admin_access
cross join account_stats a
where admin_access.allowed
group by
  calendar.today,
  a.accounts_total,
  a.new_accounts_today,
  a.new_accounts_7d,
  a.new_accounts_30d;

create view public.stats_admin_analytics_daily
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
    count(distinct visitor_id) filter (
      where event_type = 'page_view' and visitor_id is not null
    )::integer as visitors,
    count(*) filter (where event_type = 'game_finish')::integer as game_finishes,
    count(distinct visitor_id) filter (
      where event_type = 'game_finish' and visitor_id is not null
    )::integer as game_players,
    count(*) filter (where event_type = 'support_click')::integer as support_clicks
  from e
  group by day
),
account_daily as (
  select
    timezone('Europe/Warsaw', u.created_at)::date as day,
    count(*)::integer as new_accounts
  from auth.users u
  where u.created_at >= now() - interval '31 days'
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

create view public.stats_admin_new_accounts
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
results as (
  select
    user_id,
    count(*)::integer as games_played,
    max(coalesce(finished_at,created_at)) as last_play
  from public.user_game_results
  group by user_id
)
select
  u.id,
  p.login,
  u.created_at,
  p.city,
  p.voivodeship,
  coalesce(r.games_played,0)::integer as games_played,
  r.last_play
from auth.users u
cross join admin_access aa
left join public.profiles p on p.id = u.id
left join results r on r.user_id = u.id
where aa.allowed
order by u.created_at desc;

revoke all on public.stats_admin_analytics_overview from anon;
revoke all on public.stats_admin_analytics_daily from anon;
revoke all on public.stats_admin_new_accounts from anon;

grant select on public.stats_admin_analytics_overview to authenticated;
grant select on public.stats_admin_analytics_daily to authenticated;
grant select on public.stats_admin_new_accounts to authenticated;

commit;

-- Kontrola: te liczby powinny odpowiadać rzeczywistym kontom Supabase.
select
  timezone('Europe/Warsaw', created_at)::date as day,
  count(*)::integer as new_accounts
from auth.users
where created_at >= now() - interval '31 days'
group by 1
order by 1 desc;

select * from public.stats_admin_analytics_overview;
select * from public.stats_admin_analytics_daily limit 14;
select * from public.stats_admin_new_accounts limit 15;
