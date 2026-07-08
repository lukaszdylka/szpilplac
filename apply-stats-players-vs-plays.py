#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
from datetime import datetime
import shutil

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_stats_players_vs_plays"
BACKUP.mkdir(exist_ok=True)

def backup(p: Path):
    if p.exists():
        safe = p.as_posix().replace("/", "__")
        target = BACKUP / f"{safe}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        shutil.copy2(p, target)

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def write(p: Path, text: str):
    backup(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print("OK:", p)

EVENT_BRIDGE = '/*\n  Szpilplac event-visitor-bridge.js v1\n  Dopisuje anonimowy visitor_id i event_type do eventów szpilplac_events.\n*/\n(function(){\n  "use strict";\n  var VERSION = "v1";\n  var KEY = "szpilplac_visitor_id_v1";\n\n  function visitorId(){\n    try{\n      var id = localStorage.getItem(KEY);\n      if(!id){\n        if(window.crypto && crypto.randomUUID) id = crypto.randomUUID();\n        else id = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,10);\n        localStorage.setItem(KEY,id);\n      }\n      return id;\n    }catch(e){\n      return "v-session-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);\n    }\n  }\n\n  function shouldPatch(url){\n    url = String(url || "");\n    return url.indexOf("/szpilplac_events") !== -1 || url.indexOf("szpilplac_events") !== -1;\n  }\n\n  function patchBody(init){\n    if(!init || !init.body)return init;\n    try{\n      if(typeof init.body !== "string")return init;\n      var body = JSON.parse(init.body);\n      if(!body || typeof body !== "object" || Array.isArray(body))return init;\n      if(!body.visitor_id)body.visitor_id = visitorId();\n      if(!body.event_type)body.event_type = "game_finish";\n      var next = {};\n      Object.keys(init).forEach(function(k){next[k] = init[k];});\n      next.body = JSON.stringify(body);\n      return next;\n    }catch(e){\n      return init;\n    }\n  }\n\n  if(window.__SZP_EVENT_VISITOR_BRIDGE_INSTALLED)return;\n  window.__SZP_EVENT_VISITOR_BRIDGE_INSTALLED = true;\n\n  var originalFetch = window.fetch;\n  if(typeof originalFetch !== "function")return;\n\n  window.fetch = function(input, init){\n    try{\n      var url = typeof input === "string" ? input : (input && input.url);\n      if(shouldPatch(url)) init = patchBody(init || {});\n    }catch(e){}\n    return originalFetch.call(this,input,init);\n  };\n\n  window.SZP_VISITOR_ID = visitorId;\n  console.info("Szpilplac event-visitor-bridge.js " + VERSION);\n})();\n'
STATS_BRIDGE = '/*\n  Szpilplac stats-players-vs-plays.js v1\n  Dodaje do stats.html sekcję "Rozgrywki wszystkich graczy".\n*/\n(function(){\n  "use strict";\n\n  var VERSION = "v1";\n  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";\n  var sb = null;\n\n  function esc(v){\n    return String(v == null ? "" : v).replace(/[&<>"\']/g,function(ch){\n      return {"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;","\'":"&#39;"}[ch] || ch;\n    });\n  }\n  function num(v){var n = Number(v);return Number.isFinite(n) ? n : 0;}\n  function fmtInt(v){return new Intl.NumberFormat("pl-PL").format(num(v));}\n  function fmtPct(v){return fmtInt(v) + "%";}\n  function fmtDate(v){if(!v)return "—";try{return new Date(v).toLocaleString("pl-PL");}catch(e){return String(v);}}\n  function gameName(v){\n    var k = String(v || "").toLowerCase();\n    return {slowko:"Słōwko",klodka:"Kłōdka",zorta:"Raja",raja:"Raja",cuzamen:"Cuzamen"}[k] || v;\n  }\n\n  function client(){\n    if(sb)return sb;\n    if(window.sb){sb = window.sb;return sb;}\n    var cfg = window.SZPILPLAC_CONFIG || {};\n    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase)return null;\n    sb = window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{\n      auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}\n    });\n    return sb;\n  }\n\n  async function tryView(name,limit){\n    try{\n      var c = client();\n      if(!c)return {ok:false,data:[],error:"no_client"};\n      var q = c.from(name).select("*");\n      if(limit)q = q.limit(limit);\n      var r = await q;\n      if(r.error)throw r.error;\n      return {ok:true,data:r.data || []};\n    }catch(e){\n      console.warn("Stats all plays skipped",name,e.message || e);\n      return {ok:false,data:[],error:e.message || String(e)};\n    }\n  }\n\n  function stat(label,value,hint){\n    return \'<div class="stat"><div class="label">\'+esc(label)+\'</div><div class="value">\'+esc(value)+\'</div>\'+(hint?\'<div class="hint">\'+esc(hint)+\'</div>\':\'\')+\'</div>\';\n  }\n\n  function table(rows){\n    if(!rows || !rows.length)return \'<div class="empty">Brak danych o rozgrywkach wszystkich graczy.</div>\';\n    var cols = [\n      ["game","Gra",function(v){return gameName(v);}],\n      ["plays_today","Gry dziś",fmtInt],\n      ["players_today","Gracze dziś",fmtInt],\n      ["plays_7d","Gry 7 dni",fmtInt],\n      ["players_7d","Gracze 7 dni",fmtInt],\n      ["plays_30d","Gry 30 dni",fmtInt],\n      ["players_30d","Gracze 30 dni",fmtInt],\n      ["plays","Gry razem",fmtInt],\n      ["players_devices","Gracze/urządzenia",fmtInt],\n      ["wins","Wygrane",fmtInt],\n      ["win_pct","Skuteczność",fmtPct],\n      ["last_play","Ostatnia gra",fmtDate]\n    ];\n    return \'<div class="table-wrap"><table><thead><tr>\'+\n      cols.map(function(c){return \'<th>\'+esc(c[1])+\'</th>\';}).join("")+\n      \'</tr></thead><tbody>\'+\n      rows.map(function(r){\n        return \'<tr>\'+cols.map(function(c){\n          var v = r[c[0]];\n          return \'<td>\'+esc(c[2] ? c[2](v) : v)+\'</td>\';\n        }).join("")+\'</tr>\';\n      }).join("")+\n      \'</tbody></table></div>\';\n  }\n\n  function ensureSection(){\n    var existing = document.getElementById("allPlaysCard");\n    if(existing)return existing;\n    var events = document.getElementById("eventsCard");\n    var section = document.createElement("section");\n    section.className = "card hidden";\n    section.id = "allPlaysCard";\n    section.innerHTML =\n      \'<h2>Rozgrywki wszystkich graczy</h2>\'+\n      \'<p class="muted">Tu liczymy także osoby bez konta. „Gracze” oznaczają unikalne urządzenia/przeglądarki z anonimowym identyfikatorem, nie formalne konta.</p>\'+\n      \'<div id="allPlaysOverview" style="margin:12px 0;"></div>\'+\n      \'<div id="allPlaysByGame"></div>\';\n    if(events && events.parentNode)events.parentNode.insertBefore(section,events);\n    else{var main=document.querySelector("main");if(main)main.appendChild(section);}\n    return section;\n  }\n\n  async function render(){\n    var section = ensureSection();\n    if(!section)return;\n    var overview = await tryView("stats_admin_all_plays_overview",1);\n    var byGame = await tryView("stats_admin_all_plays_by_game",40);\n    if(!overview.ok && !byGame.ok){section.classList.add("hidden");return;}\n    var o = overview.data && overview.data[0] ? overview.data[0] : {};\n    document.getElementById("allPlaysOverview").innerHTML =\n      \'<div class="grid">\'+\n        stat("Gry dziś",fmtInt(o.plays_today || 0),"wszystkie zakończone gry")+\n        stat("Gracze dziś",fmtInt(o.players_today || 0),"unikalne urządzenia")+\n        stat("Gry 7 dni",fmtInt(o.plays_7d || 0),"ostatnie 7 dni")+\n        stat("Gracze 7 dni",fmtInt(o.players_7d || 0),"unikalne urządzenia")+\n        stat("Gry 30 dni",fmtInt(o.plays_30d || 0),"ostatnie 30 dni")+\n        stat("Gracze 30 dni",fmtInt(o.players_30d || 0),"unikalne urządzenia")+\n        stat("Wygrane",fmtInt(o.wins || 0),"wszystkie gry")+\n        stat("Skuteczność",fmtPct(o.win_pct || 0),"wygrane / gry")+\n      \'</div>\';\n    document.getElementById("allPlaysByGame").innerHTML = table(byGame.data || []);\n    section.classList.remove("hidden");\n  }\n\n  function schedule(){\n    setTimeout(render,1200);\n    setTimeout(render,2600);\n    var btn = document.getElementById("refreshBtn");\n    if(btn)btn.addEventListener("click",function(){setTimeout(render,1800);});\n  }\n\n  console.info("Szpilplac stats-players-vs-plays.js " + VERSION);\n  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",schedule);\n  else schedule();\n})();\n'
SQL = '-- Szpilplac: rozróżnienie statystyk\n-- Konta vs rozgrywki wszystkich graczy vs techniczne eventy\n-- Uruchom w Supabase SQL Editor.\n-- Nie usuwa danych.\n\nbegin;\n\nalter table public.szpilplac_events\n  add column if not exists visitor_id text;\n\nalter table public.szpilplac_events\n  add column if not exists event_type text;\n\n-- Stare eventy nie miały typu, więc traktujemy je jako zakończenie gry.\n-- Dzięki temu liczba "gier" zadziała też wstecz.\nupdate public.szpilplac_events\nset event_type = \'game_finish\'\nwhere event_type is null;\n\ncreate index if not exists szpilplac_events_created_at_idx\n  on public.szpilplac_events (created_at);\n\ncreate index if not exists szpilplac_events_visitor_idx\n  on public.szpilplac_events (visitor_id);\n\ncreate index if not exists szpilplac_events_event_type_idx\n  on public.szpilplac_events (event_type);\n\ndrop view if exists public.stats_admin_all_plays_overview;\ndrop view if exists public.stats_admin_all_plays_by_game;\ndrop view if exists public.stats_admin_daily_all_plays;\n\ncreate view public.stats_admin_all_plays_overview as\nwith e as (\n  select\n    created_at,\n    timezone(\'Europe/Warsaw\', created_at)::date as local_day,\n    nullif(visitor_id,\'\') as visitor_id,\n    coalesce(event_type,\'game_finish\') as event_type,\n    won\n  from public.szpilplac_events\n  where coalesce(event_type,\'game_finish\') = \'game_finish\'\n)\nselect\n  count(*)::integer as plays,\n  count(*) filter (\n    where local_day = timezone(\'Europe/Warsaw\', now())::date\n  )::integer as plays_today,\n  count(*) filter (\n    where local_day >= timezone(\'Europe/Warsaw\', now())::date - 6\n  )::integer as plays_7d,\n  count(*) filter (\n    where local_day >= timezone(\'Europe/Warsaw\', now())::date - 29\n  )::integer as plays_30d,\n\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n  )::integer as players_devices,\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n      and local_day = timezone(\'Europe/Warsaw\', now())::date\n  )::integer as players_today,\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n      and local_day >= timezone(\'Europe/Warsaw\', now())::date - 6\n  )::integer as players_7d,\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n      and local_day >= timezone(\'Europe/Warsaw\', now())::date - 29\n  )::integer as players_30d,\n\n  count(*) filter (where won is true)::integer as wins,\n  case\n    when count(*) > 0\n      then round(100.0 * count(*) filter (where won is true) / count(*))::integer\n    else 0\n  end as win_pct,\n  max(created_at) as last_play\nfrom e;\n\ncreate view public.stats_admin_all_plays_by_game as\nwith e as (\n  select\n    coalesce(nullif(game,\'\'),\'unknown\') as game,\n    created_at,\n    timezone(\'Europe/Warsaw\', created_at)::date as local_day,\n    nullif(visitor_id,\'\') as visitor_id,\n    coalesce(event_type,\'game_finish\') as event_type,\n    won\n  from public.szpilplac_events\n  where coalesce(event_type,\'game_finish\') = \'game_finish\'\n)\nselect\n  game,\n  count(*)::integer as plays,\n  count(*) filter (\n    where local_day = timezone(\'Europe/Warsaw\', now())::date\n  )::integer as plays_today,\n  count(*) filter (\n    where local_day >= timezone(\'Europe/Warsaw\', now())::date - 6\n  )::integer as plays_7d,\n  count(*) filter (\n    where local_day >= timezone(\'Europe/Warsaw\', now())::date - 29\n  )::integer as plays_30d,\n\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n  )::integer as players_devices,\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n      and local_day = timezone(\'Europe/Warsaw\', now())::date\n  )::integer as players_today,\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n      and local_day >= timezone(\'Europe/Warsaw\', now())::date - 6\n  )::integer as players_7d,\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n      and local_day >= timezone(\'Europe/Warsaw\', now())::date - 29\n  )::integer as players_30d,\n\n  count(*) filter (where won is true)::integer as wins,\n  case\n    when count(*) > 0\n      then round(100.0 * count(*) filter (where won is true) / count(*))::integer\n    else 0\n  end as win_pct,\n  max(created_at) as last_play\nfrom e\ngroup by game\norder by plays_today desc, plays desc;\n\ncreate view public.stats_admin_daily_all_plays as\nwith e as (\n  select\n    coalesce(nullif(game,\'\'),\'unknown\') as game,\n    timezone(\'Europe/Warsaw\', created_at)::date as day,\n    nullif(visitor_id,\'\') as visitor_id,\n    won\n  from public.szpilplac_events\n  where coalesce(event_type,\'game_finish\') = \'game_finish\'\n)\nselect\n  day,\n  game,\n  count(*)::integer as plays,\n  count(distinct visitor_id) filter (\n    where visitor_id is not null\n  )::integer as players_devices,\n  count(*) filter (where won is true)::integer as wins,\n  case\n    when count(*) > 0\n      then round(100.0 * count(*) filter (where won is true) / count(*))::integer\n    else 0\n  end as win_pct\nfrom e\ngroup by day, game\norder by day desc, game;\n\ngrant select on public.stats_admin_all_plays_overview to anon, authenticated;\ngrant select on public.stats_admin_all_plays_by_game to anon, authenticated;\ngrant select on public.stats_admin_daily_all_plays to anon, authenticated;\n\ncommit;\n\n-- Kontrola po uruchomieniu:\nselect * from public.stats_admin_all_plays_overview;\nselect * from public.stats_admin_all_plays_by_game order by plays_today desc, plays desc;\n'

def patch_gitignore():
    p = ROOT / ".gitignore"
    text = read(p) if p.exists() else ""
    if "_backup_*/" not in text:
        write(p, text.rstrip() + "\n\n# Local patch backups\n_backup_*/\n*.bak\n")

def add_script_before_head_close(path: Path, src: str):
    if not path.exists():
        print("Pominięto, brak pliku:", path)
        return
    text = read(path)
    old = text
    if src in text:
        print("Już jest:", src, "w", path)
        return
    tag = f'<script src="{src}"></script>\n'
    if "</head>" in text:
        text = text.replace("</head>", tag + "</head>", 1)
    else:
        text += "\n" + tag
    if text != old:
        write(path,text)

def add_script_before_body_close(path: Path, src: str):
    if not path.exists():
        print("Pominięto, brak pliku:", path)
        return
    text = read(path)
    old = text
    if src in text:
        print("Już jest:", src, "w", path)
        return
    tag = f'<script src="{src}"></script>\n'
    if "</body>" in text:
        text = text.replace("</body>", tag + "</body>", 1)
    else:
        text += "\n" + tag
    if text != old:
        write(path,text)

def main():
    write(ROOT / "event-visitor-bridge.js", EVENT_BRIDGE)
    write(ROOT / "stats-players-vs-plays.js", STATS_BRIDGE)
    write(ROOT / "sql" / "stats-players-vs-plays.sql", SQL)

    add_script_before_head_close(ROOT / "slowko.html", "event-visitor-bridge.js?v=1")
    add_script_before_head_close(ROOT / "klodka.html", "event-visitor-bridge.js?v=1")
    add_script_before_head_close(ROOT / "raja" / "index.html", "../event-visitor-bridge.js?v=1")
    add_script_before_body_close(ROOT / "stats.html", "stats-players-vs-plays.js?v=1")
    patch_gitignore()

    print()
    print("Gotowe.")
    print("1. Zrób commit/push.")
    print("2. W Supabase SQL Editor uruchom: sql/stats-players-vs-plays.sql")
    print("3. Wejdź w stats.html i odśwież.")

if __name__ == "__main__":
    main()
