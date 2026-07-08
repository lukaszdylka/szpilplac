#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_stats_players_plays"
BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        safe = path.as_posix().replace("/", "__")
        target = BACKUP / f"{safe}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        shutil.copy2(path, target)

def read(path: Path):
    return path.read_text(encoding="utf-8")

def write(path: Path, text: str):
    backup(path)
    path.write_text(text, encoding="utf-8")
    print(f"OK: {path}")

def patch_gitignore():
    p = ROOT / ".gitignore"
    existing = read(p) if p.exists() else ""
    add = "\n# Local patch backups\n_backup_*/\n*.bak\n"
    if "_backup_*/" not in existing:
        write(p, existing.rstrip() + add)

VISITOR_HELPER = '''
function szpVisitorId(){
  var key="szpilplac_visitor_id_v1";
  try{
    var id=localStorage.getItem(key);
    if(!id){
      if(window.crypto&&crypto.randomUUID)id=crypto.randomUUID();
      else id="v-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
      localStorage.setItem(key,id);
    }
    return id;
  }catch(e){
    return "v-session-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
  }
}
function enrichEventPayload(p){
  p=p||{};
  if(!p.visitor_id)p.visitor_id=szpVisitorId();
  if(!p.event_type)p.event_type="game_finish";
  return p;
}
'''

def patch_slowko_events():
    p = ROOT / "slowko.html"
    if not p.exists():
        print("Pominięto: brak slowko.html")
        return
    text = read(p)
    old = text

    if "function szpVisitorId()" not in text:
        text = text.replace("/* ── STATYSTYKI ─────────────────────────────────────────────────────── */",
                            "/* ── STATYSTYKI ─────────────────────────────────────────────────────── */" + VISITOR_HELPER)

    text = text.replace("body:JSON.stringify(payload)", "body:JSON.stringify(enrichEventPayload(payload))")
    text = text.replace("game-result-actions.js?v=128", "game-result-actions.js?v=129")
    text = text.replace("game-result-actions.js?v=127", "game-result-actions.js?v=129")
    text = text.replace("game-result-actions.js?v=126", "game-result-actions.js?v=129")

    if text != old:
        write(p, text)
    else:
        print("Bez zmian: slowko.html")

def patch_klodka_events():
    p = ROOT / "klodka.html"
    if not p.exists():
        print("Pominięto: brak klodka.html")
        return
    text = read(p)
    old = text

    if "function szpVisitorId()" not in text:
        text = text.replace("function trackEvent(p){", VISITOR_HELPER + "\nfunction trackEvent(p){")

    text = text.replace("body:JSON.stringify(p)", "body:JSON.stringify(enrichEventPayload(p))")
    text = text.replace("game-result-actions.js?v=128", "game-result-actions.js?v=129")
    text = text.replace("game-result-actions.js?v=127", "game-result-actions.js?v=129")
    text = text.replace("game-result-actions.js?v=126", "game-result-actions.js?v=129")

    if text != old:
        write(p, text)
    else:
        print("Bez zmian: klodka.html")

def patch_raja_events():
    p = ROOT / "raja" / "index.html"
    if not p.exists():
        print("Pominięto: brak raja/index.html")
        return
    text = read(p)
    old = text

    helper = '''
function szpVisitorId(){
  var key="szpilplac_visitor_id_v1";
  try{
    var id=localStorage.getItem(key);
    if(!id){
      if(window.crypto&&crypto.randomUUID)id=crypto.randomUUID();
      else id="v-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
      localStorage.setItem(key,id);
    }
    return id;
  }catch(e){
    return "v-session-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
  }
}
'''
    if "function szpVisitorId()" not in text:
        text = text.replace("function eventCorePayload(p){", helper + "\nfunction eventCorePayload(p){")

    old_line = 'var q={game:p.game,puzzle_no:p.puzzle_no,puzzle_word:p.puzzle_word,won:!!p.won,tries:p.tries,lang:p.lang,mode:p.mode};'
    new_line = 'var q={game:p.game,puzzle_no:p.puzzle_no,puzzle_word:p.puzzle_word,won:!!p.won,tries:p.tries,lang:p.lang,mode:p.mode,event_type:p.event_type||"game_finish",visitor_id:p.visitor_id||szpVisitorId()};'
    text = text.replace(old_line, new_line)

    text = text.replace('../game-result-actions.js?v=128', '../game-result-actions.js?v=129')
    text = text.replace('../game-result-actions.js?v=127', '../game-result-actions.js?v=129')
    text = text.replace('../game-result-actions.js?v=126', '../game-result-actions.js?v=129')

    if text != old:
        write(p, text)
    else:
        print("Bez zmian: raja/index.html")

def patch_game_result_actions_version():
    p = ROOT / "game-result-actions.js"
    if not p.exists():
        print("Pominięto: brak game-result-actions.js")
        return
    text = read(p)
    old = text
    text = text.replace('var VERSION = "v128";', 'var VERSION = "v129";')
    text = text.replace('var VERSION = "v127";', 'var VERSION = "v129";')
    text = text.replace('var VERSION = "v126";', 'var VERSION = "v129";')
    if text != old:
        write(p, text)
    else:
        print("Bez zmian: game-result-actions.js")

def patch_stats_html():
    p = ROOT / "stats.html"
    if not p.exists():
        print("Pominięto: brak stats.html")
        return
    text = read(p)
    old = text

    text = text.replace('console.info("Szpilplac stats.html v16-optimized");',
                        'console.info("Szpilplac stats.html v17-players-vs-plays");')

    section = '<section class="card hidden" id="allPlaysCard"><h2>Rozgrywki wszystkich graczy</h2><p class="muted">Tu liczymy także osoby bez konta. „Gracze” oznaczają unikalne urządzenia/przeglądarki z anonimowym identyfikatorem, nie formalne konta.</p><div id="allPlaysOverview" style="margin:12px 0;"></div><div id="allPlaysByGame"></div></section>'
    if 'id="allPlaysCard"' not in text:
        text = text.replace('<section class="card hidden" id="eventsCard">', section + '<section class="card hidden" id="eventsCard">')

    old_fetch = 'var evOverview=await tryView("stats_admin_events_overview",1);var evByGame=await tryView("stats_admin_events_by_game",40);'
    new_fetch = 'var evOverview=await tryView("stats_admin_events_overview",1);var evByGame=await tryView("stats_admin_events_by_game",40);var allPlaysOverview=await tryView("stats_admin_all_plays_overview",1);var allPlaysByGame=await tryView("stats_admin_all_plays_by_game",40);'
    text = text.replace(old_fetch, new_fetch)

    render_insert = (
        'if((allPlaysOverview.ok&&allPlaysOverview.data.length)||(allPlaysByGame.ok&&allPlaysByGame.data.length)){'
        'var ap=(allPlaysOverview.data&&allPlaysOverview.data[0])||{};'
        'document.getElementById("allPlaysOverview").innerHTML=\\'<div class="grid">\\'+['
        'stat("Gry dziś",fmtInt(ap.plays_today||0),"wszystkie zakończone gry"),'
        'stat("Gracze dziś",fmtInt(ap.players_today||0),"unikalne urządzenia"),'
        'stat("Gry 7 dni",fmtInt(ap.plays_7d||0),"ostatnie 7 dni"),'
        'stat("Gracze 7 dni",fmtInt(ap.players_7d||0),"unikalne urządzenia"),'
        'stat("Gry 30 dni",fmtInt(ap.plays_30d||0),"ostatnie 30 dni"),'
        'stat("Gracze 30 dni",fmtInt(ap.players_30d||0),"unikalne urządzenia")'
        '].join("")+\\'</div>\\';'
        'document.getElementById("allPlaysByGame").innerHTML=allPlaysByGame.ok?table(allPlaysByGame.data,['
        '{key:"game",label:"Gra"},'
        '{key:"plays_today",label:"Gry dziś",num:true,format:fmtInt},'
        '{key:"players_today",label:"Gracze dziś",num:true,format:fmtInt},'
        '{key:"plays_7d",label:"Gry 7 dni",num:true,format:fmtInt},'
        '{key:"players_7d",label:"Gracze 7 dni",num:true,format:fmtInt},'
        '{key:"plays_30d",label:"Gry 30 dni",num:true,format:fmtInt},'
        '{key:"players_30d",label:"Gracze 30 dni",num:true,format:fmtInt},'
        '{key:"plays",label:"Gry razem",num:true,format:fmtInt},'
        '{key:"players_devices",label:"Gracze/urządzenia",num:true,format:fmtInt},'
        '{key:"wins",label:"Wygrane",num:true,format:fmtInt},'
        '{key:"win_pct",label:"Skuteczność",num:true,format:fmtPct},'
        '{key:"last_play",label:"Ostatnia gra",format:fmtDate}'
        '],"Brak danych o rozgrywkach wszystkich graczy."):\\'\\';'
        'show(document.getElementById("allPlaysCard"));'
        '}'
    )

    marker = 'if((evOverview.ok&&evOverview.data.length)||(evByGame.ok&&evByGame.data.length)){'
    if "stats_admin_all_plays_overview" in text and "Rozgrywki wszystkich graczy" in text and "players_today" in text:
        pass
    if render_insert not in text and marker in text:
        text = text.replace(marker, render_insert + marker)

    if text != old:
        write(p, text)
    else:
        print("Bez zmian: stats.html")

def write_sql():
    sql_dir = ROOT / "sql"
    sql_dir.mkdir(exist_ok=True)
    p = sql_dir / "stats-players-vs-plays.sql"
    sql = r'''-- Szpilplac: rozróżnienie kont, rozgrywek wszystkich graczy i technicznych eventów
-- Uruchom w Supabase SQL Editor po commicie frontu.
-- Nie usuwa danych. Dodaje anonimowy visitor_id i nowe widoki admina.

begin;

alter table public.szpilplac_events
  add column if not exists visitor_id text;

alter table public.szpilplac_events
  add column if not exists event_type text;

-- Stare wpisy traktujemy jako zakończone rozgrywki, bo dotychczas trackEvent był odpalany po końcu gry.
update public.szpilplac_events
set event_type = 'game_finish'
where event_type is null;

create index if not exists szpilplac_events_created_at_idx
  on public.szpilplac_events (created_at);

create index if not exists szpilplac_events_visitor_idx
  on public.szpilplac_events (visitor_id);

create index if not exists szpilplac_events_event_type_idx
  on public.szpilplac_events (event_type);

drop view if exists public.stats_admin_all_plays_overview;
drop view if exists public.stats_admin_all_plays_by_game;
drop view if exists public.stats_admin_daily_all_plays;

create view public.stats_admin_all_plays_overview as
with e as (
  select
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day,
    nullif(visitor_id,'') as visitor_id,
    coalesce(event_type,'game_finish') as event_type,
    won
  from public.szpilplac_events
  where coalesce(event_type,'game_finish') = 'game_finish'
)
select
  count(*)::integer as plays,
  count(*) filter (where local_day = timezone('Europe/Warsaw', now())::date)::integer as plays_today,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 6)::integer as plays_7d,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 29)::integer as plays_30d,
  count(distinct visitor_id) filter (where visitor_id is not null)::integer as players_devices,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day = timezone('Europe/Warsaw', now())::date
  )::integer as players_today,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::integer as players_7d,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 29
  )::integer as players_30d,
  count(*) filter (where won is true)::integer as wins,
  case when count(*) > 0 then round(100.0 * count(*) filter (where won is true) / count(*))::integer else 0 end as win_pct,
  max(created_at) as last_play
from e;

create view public.stats_admin_all_plays_by_game as
with e as (
  select
    coalesce(nullif(game,''),'unknown') as game,
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day,
    nullif(visitor_id,'') as visitor_id,
    coalesce(event_type,'game_finish') as event_type,
    won
  from public.szpilplac_events
  where coalesce(event_type,'game_finish') = 'game_finish'
)
select
  game,
  count(*)::integer as plays,
  count(*) filter (where local_day = timezone('Europe/Warsaw', now())::date)::integer as plays_today,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 6)::integer as plays_7d,
  count(*) filter (where local_day >= timezone('Europe/Warsaw', now())::date - 29)::integer as plays_30d,
  count(distinct visitor_id) filter (where visitor_id is not null)::integer as players_devices,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day = timezone('Europe/Warsaw', now())::date
  )::integer as players_today,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::integer as players_7d,
  count(distinct visitor_id) filter (
    where visitor_id is not null
      and local_day >= timezone('Europe/Warsaw', now())::date - 29
  )::integer as players_30d,
  count(*) filter (where won is true)::integer as wins,
  case when count(*) > 0 then round(100.0 * count(*) filter (where won is true) / count(*))::integer else 0 end as win_pct,
  max(created_at) as last_play
from e
group by game
order by plays_today desc, plays desc;

create view public.stats_admin_daily_all_plays as
with e as (
  select
    coalesce(nullif(game,''),'unknown') as game,
    timezone('Europe/Warsaw', created_at)::date as day,
    nullif(visitor_id,'') as visitor_id,
    won
  from public.szpilplac_events
  where coalesce(event_type,'game_finish') = 'game_finish'
)
select
  day,
  game,
  count(*)::integer as plays,
  count(distinct visitor_id) filter (where visitor_id is not null)::integer as players_devices,
  count(*) filter (where won is true)::integer as wins,
  case when count(*) > 0 then round(100.0 * count(*) filter (where won is true) / count(*))::integer else 0 end as win_pct
from e
group by day, game
order by day desc, game;

grant select on public.stats_admin_all_plays_overview to anon, authenticated;
grant select on public.stats_admin_all_plays_by_game to anon, authenticated;
grant select on public.stats_admin_daily_all_plays to anon, authenticated;

commit;

-- Kontrola:
select * from public.stats_admin_all_plays_overview;
select * from public.stats_admin_all_plays_by_game order by plays_today desc, plays desc;
'''
    old = read(p) if p.exists() else ""
    if old != sql:
        write(p, sql)
    else:
        print("Bez zmian: sql/stats-players-vs-plays.sql")

def main():
    patch_slowko_events()
    patch_klodka_events()
    patch_raja_events()
    patch_game_result_actions_version()
    patch_stats_html()
    write_sql()
    patch_gitignore()
    print("\nGotowe.")
    print("1) Commit/push zmian.")
    print("2) W Supabase SQL Editor uruchom: sql/stats-players-vs-plays.sql")
    print("3) Po kilku nowych grach statystyki zaczną rozróżniać gry i unikalne urządzenia.")

if __name__ == "__main__":
    main()
