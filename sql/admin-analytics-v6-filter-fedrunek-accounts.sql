-- Szpilplac: wykluczenie anonimowych kont Fedrunku ze statystyk kont
-- Uruchom po sql/admin-analytics-v5-separate-events-table.sql.
-- Skrypt nie usuwa użytkowników ani danych Fedrunku. Zmienia wyłącznie widoki panelu.

begin;

create or replace view public.stats_admin_analytics_overview
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
eligible_accounts as (
  select
    u.id,
    u.created_at
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email is not null
    and coalesce(u.raw_user_meta_data ->> 'app','') <> 'fedrunek'
    and nullif(btrim(p.login),'') is not null
    and p.login !~* '^gracz_[0-9a-f]{8}$'
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
  from eligible_accounts u
  cross join calendar c
),
analytics_stats as (
  select
    count(*) filter (
      where e.event_type = 'page_view'
        and timezone('Europe/Warsaw', e.created_at)::date = c.today
    )::integer as page_views_today,
    count(distinct e.visitor_id) filter (
      where e.event_type = 'page_view'
        and timezone('Europe/Warsaw', e.created_at)::date = c.today
    )::integer as visitors_today,
    count(*) filter (
      where e.event_type = 'page_view'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 6 and c.today
    )::integer as page_views_7d,
    count(distinct e.visitor_id) filter (
      where e.event_type = 'page_view'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 6 and c.today
    )::integer as visitors_7d,
    count(*) filter (
      where e.event_type = 'page_view'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 29 and c.today
    )::integer as page_views_30d,
    count(distinct e.visitor_id) filter (
      where e.event_type = 'page_view'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 29 and c.today
    )::integer as visitors_30d,
    count(*) filter (
      where e.event_type = 'support_click'
        and timezone('Europe/Warsaw', e.created_at)::date = c.today
    )::integer as support_clicks_today,
    count(*) filter (
      where e.event_type = 'support_click'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 6 and c.today
    )::integer as support_clicks_7d,
    count(*) filter (
      where e.event_type = 'support_click'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 29 and c.today
    )::integer as support_clicks_30d,
    max(e.created_at) filter (where e.event_type = 'page_view') as last_page_view
  from public.szpilplac_analytics_events e
  cross join calendar c
),
returning_stats as (
  select count(*)::integer as returning_visitors_7d
  from (
    select e.visitor_id
    from public.szpilplac_analytics_events e
    cross join calendar c
    where e.event_type = 'page_view'
      and timezone('Europe/Warsaw', e.created_at)::date between c.today - 6 and c.today
    group by e.visitor_id
    having count(distinct timezone('Europe/Warsaw', e.created_at)::date) >= 2
  ) q
),
game_stats as (
  select
    count(*) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
        and timezone('Europe/Warsaw', e.created_at)::date = c.today
    )::integer as game_finishes_today,
    count(distinct nullif(e.visitor_id,'')) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
        and timezone('Europe/Warsaw', e.created_at)::date = c.today
    )::integer as game_players_today,
    count(*) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 6 and c.today
    )::integer as game_finishes_7d,
    count(distinct nullif(e.visitor_id,'')) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 6 and c.today
    )::integer as game_players_7d,
    count(*) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 29 and c.today
    )::integer as game_finishes_30d,
    count(distinct nullif(e.visitor_id,'')) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
        and timezone('Europe/Warsaw', e.created_at)::date between c.today - 29 and c.today
    )::integer as game_players_30d
  from public.szpilplac_events e
  cross join calendar c
)
select
  a.accounts_total,
  a.new_accounts_today,
  a.new_accounts_7d,
  a.new_accounts_30d,
  s.page_views_today,
  s.visitors_today,
  s.page_views_7d,
  s.visitors_7d,
  s.page_views_30d,
  s.visitors_30d,
  g.game_finishes_today,
  g.game_players_today,
  g.game_finishes_7d,
  g.game_players_7d,
  g.game_finishes_30d,
  g.game_players_30d,
  s.support_clicks_today,
  s.support_clicks_7d,
  s.support_clicks_30d,
  r.returning_visitors_7d,
  s.last_page_view
from admin_access aa
cross join account_stats a
cross join analytics_stats s
cross join returning_stats r
cross join game_stats g
where aa.allowed;

create or replace view public.stats_admin_analytics_daily
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
eligible_accounts as (
  select
    u.id,
    u.created_at
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email is not null
    and coalesce(u.raw_user_meta_data ->> 'app','') <> 'fedrunek'
    and nullif(btrim(p.login),'') is not null
    and p.login !~* '^gracz_[0-9a-f]{8}$'
),
analytics_daily as (
  select
    timezone('Europe/Warsaw', e.created_at)::date as day,
    count(*) filter (where e.event_type = 'page_view')::integer as page_views,
    count(distinct e.visitor_id) filter (where e.event_type = 'page_view')::integer as visitors,
    count(*) filter (where e.event_type = 'support_click')::integer as support_clicks
  from public.szpilplac_analytics_events e
  where e.created_at >= now() - interval '31 days'
  group by 1
),
game_daily as (
  select
    timezone('Europe/Warsaw', e.created_at)::date as day,
    count(*) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
    )::integer as game_finishes,
    count(distinct nullif(e.visitor_id,'')) filter (
      where coalesce(nullif(e.event_type,''),'game_finish') = 'game_finish'
    )::integer as game_players
  from public.szpilplac_events e
  where e.created_at >= now() - interval '31 days'
  group by 1
),
account_daily as (
  select
    timezone('Europe/Warsaw', u.created_at)::date as day,
    count(*)::integer as new_accounts
  from eligible_accounts u
  where u.created_at >= now() - interval '31 days'
  group by 1
)
select
  d.day,
  coalesce(ad.page_views,0)::integer as page_views,
  coalesce(ad.visitors,0)::integer as visitors,
  coalesce(gd.game_finishes,0)::integer as game_finishes,
  coalesce(gd.game_players,0)::integer as game_players,
  coalesce(ac.new_accounts,0)::integer as new_accounts,
  coalesce(ad.support_clicks,0)::integer as support_clicks
from days d
cross join admin_access aa
left join analytics_daily ad on ad.day = d.day
left join game_daily gd on gd.day = d.day
left join account_daily ac on ac.day = d.day
where aa.allowed
order by d.day desc;

create or replace view public.stats_admin_new_accounts
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
join public.profiles p on p.id = u.id
left join results r on r.user_id = u.id
where aa.allowed
  and u.email is not null
  and coalesce(u.raw_user_meta_data ->> 'app','') <> 'fedrunek'
  and nullif(btrim(p.login),'') is not null
  and p.login !~* '^gracz_[0-9a-f]{8}$'
order by u.created_at desc;

revoke all on public.stats_admin_analytics_overview from anon;
revoke all on public.stats_admin_analytics_daily from anon;
revoke all on public.stats_admin_new_accounts from anon;

grant select on public.stats_admin_analytics_overview to authenticated;
grant select on public.stats_admin_analytics_daily to authenticated;
grant select on public.stats_admin_new_accounts to authenticated;

notify pgrst, 'reload schema';

commit;

-- Kontrola po uruchomieniu. Fedrunek pozostaje w auth.users, ale nie jest liczony w panelu.
select
  count(*) filter (
    where u.email is not null
      and coalesce(u.raw_user_meta_data ->> 'app','') <> 'fedrunek'
      and p.id is not null
      and nullif(btrim(p.login),'') is not null
      and p.login !~* '^gracz_[0-9a-f]{8}$'
  )::integer as szpilplac_accounts,
  count(*) filter (
    where u.email is null
      and coalesce(u.raw_user_meta_data ->> 'app','') = 'fedrunek'
  )::integer as fedrunek_anonymous_accounts,
  count(*) filter (
    where p.login ~* '^gracz_[0-9a-f]{8}$'
  )::integer as generated_profiles
from auth.users u
left join public.profiles p on p.id = u.id;
