#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_global_fixes"
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

def replace_in_file(path: Path, pairs):
    if not path.exists():
        print(f"Pominięto, brak pliku: {path}")
        return False
    text = read(path)
    old = text
    for a,b in pairs:
        text = text.replace(a,b)
    if text != old:
        write(path,text)
        return True
    print(f"Bez zmian: {path}")
    return False

def patch_klodka_cache_and_bridge():
    replace_in_file(ROOT / "klodka.html", [
        ('klodka-auth-bridge.js?v=126', 'klodka-auth-bridge.js?v=128'),
        ('klodka-auth-bridge.js?v=127', 'klodka-auth-bridge.js?v=128'),
    ])

    p = ROOT / "klodka-auth-bridge.js"
    if not p.exists():
        print("Pominięto: brak klodka-auth-bridge.js")
        return
    text = read(p)
    old = text
    text = text.replace("Szpilplac Kłōdka Auth Bridge v127", "Szpilplac Kłōdka Auth Bridge v128")
    text = text.replace('var VERSION="v127";', 'var VERSION="v128";')
    text = text.replace('game-save.js?v=125', 'game-save.js?v=126')
    if text != old:
        write(p,text)
    else:
        print("Bez zmian: klodka-auth-bridge.js")

def patch_achievements_panel_cache():
    replace_in_file(ROOT / "konto.html", [
        ('achievements-panel.js?v=125', 'achievements-panel.js?v=126'),
        ('achievements-panel.js?v=124', 'achievements-panel.js?v=126'),
    ])

    p = ROOT / "achievements-panel.js"
    if not p.exists():
        print("Pominięto: brak achievements-panel.js")
        return
    text = read(p)
    old = text
    text = text.replace('achievement-toast.js?v=124', 'achievement-toast.js?v=125')
    text = text.replace('Szpilplac achievements-panel.js v124 trzy na zicher', 'Szpilplac achievements-panel.js v126 timezone/cache')
    if text != old:
        write(p,text)
    else:
        print("Bez zmian: achievements-panel.js")

def patch_slowko_to_common_game_save():
    p = ROOT / "slowko-auth-bridge.js"
    if not p.exists():
        print("Pominięto: brak slowko-auth-bridge.js")
        return

    text = read(p)
    old = text

    text = text.replace("Szpilplac Słōwko Account Bridge v124", "Szpilplac Słōwko Account Bridge v125")
    text = text.replace('var VERSION = "v124";', 'var VERSION = "v125";')

    marker = """      if(!window.SZPILPLAC_AUTH || typeof window.SZPILPLAC_AUTH.saveResult !== "function"){
        renderNote("err",t("noAuth"),payload);
        return;
      }

      if(typeof window.SZPILPLAC_AUTH.refresh === "function"){
        try{await window.SZPILPLAC_AUTH.refresh();}catch(e){}
      }

      var res = await window.SZPILPLAC_AUTH.saveResult(payload);"""

    replacement = """      // Najpierw użyj wspólnego zapisu game-save.js.
      // Ta ścieżka zapisuje wynik i od razu odpala odznaki.
      try{
        await loadScript("game-save.js?v=126",function(){return !!window.SZP_GAME_SAVE;});
      }catch(e){}

      if(window.SZP_GAME_SAVE && typeof window.SZP_GAME_SAVE.saveResult === "function"){
        var commonRes = await window.SZP_GAME_SAVE.saveResult(payload,{
          skipMessage:t("archive"),
          noAccountMessage:t("notLogged"),
          savedMessage:t("saved"),
          errorMessage:t("error")
        });

        if(commonRes && commonRes.saved){
          renderNote("ok",t("saved"),payload);
          return;
        }
        if(commonRes && commonRes.reason === "not_logged_in"){
          renderNote("login",t("notLogged"),payload);
          return;
        }
        if(commonRes && commonRes.reason !== "no_client"){
          renderNote("err",(commonRes && commonRes.message) || t("error"),payload);
          return;
        }
      }

      // Awaryjny stary zapis, tylko gdy game-save.js nie ruszy.
      if(!window.SZPILPLAC_AUTH || typeof window.SZPILPLAC_AUTH.saveResult !== "function"){
        renderNote("err",t("noAuth"),payload);
        return;
      }

      if(typeof window.SZPILPLAC_AUTH.refresh === "function"){
        try{await window.SZPILPLAC_AUTH.refresh();}catch(e){}
      }

      var res = await window.SZPILPLAC_AUTH.saveResult(payload);"""

    if marker in text:
        text = text.replace(marker, replacement)
    elif "Najpierw użyj wspólnego zapisu game-save.js" not in text:
        print("Uwaga: nie znalazłem dokładnego bloku saveResult w slowko-auth-bridge.js. Sprawdź ręcznie.")

    if text != old:
        write(p,text)
        replace_in_file(ROOT / "slowko.html", [
            ('slowko-auth-bridge.js?v=83', 'slowko-auth-bridge.js?v=125'),
            ('slowko-auth-bridge.js?v=124', 'slowko-auth-bridge.js?v=125'),
        ])
    else:
        print("Bez zmian: slowko-auth-bridge.js")

def patch_gitignore():
    p = ROOT / ".gitignore"
    existing = read(p) if p.exists() else ""
    add = "\n# Local patch backups\n_backup_*/\n*.bak\n"
    if "_backup_*/" not in existing:
        write(p, existing.rstrip() + add)
    else:
        print("Bez zmian: .gitignore")

def write_stats_sql():
    sql_dir = ROOT / "sql"
    sql_dir.mkdir(exist_ok=True)

    stats_sql = """-- Szpilplac: statystyki eventów wg polskiego dnia
-- Uruchom w Supabase SQL Editor.
-- Naprawia sytuację, gdy "Today" w stats_admin_events_* liczy dzień po UTC
-- albo według strefy sesji bazy, zamiast Europe/Warsaw.

begin;

create or replace view public.stats_admin_events_overview as
with e as (
  select
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day
  from public.szpilplac_events
)
select
  count(*)::bigint as events,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date
  )::bigint as today,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date - 1
  )::bigint as yesterday,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::bigint as last_7d,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 30
  )::bigint as last_31d,
  max(created_at) as last_event
from e;

create or replace view public.stats_admin_events_by_game as
with e as (
  select
    coalesce(nullif(game,''),'unknown') as game,
    created_at,
    timezone('Europe/Warsaw', created_at)::date as local_day
  from public.szpilplac_events
)
select
  game,
  count(*)::bigint as events,
  count(*) filter (
    where local_day = timezone('Europe/Warsaw', now())::date
  )::bigint as today,
  count(*) filter (
    where local_day >= timezone('Europe/Warsaw', now())::date - 6
  )::bigint as last_7d,
  max(created_at) as last_event
from e
group by game
order by events desc;

commit;

-- Kontrola:
-- 1) Dzisiejsze eventy liczone po Europe/Warsaw.
select * from public.stats_admin_events_by_game order by events desc;

-- 2) Porównanie UTC vs Warszawa z ostatnich godzin.
select
  game,
  created_at,
  created_at::date as utc_or_session_date,
  timezone('Europe/Warsaw', created_at)::date as warsaw_date,
  timezone('Europe/Warsaw', created_at) as warsaw_time
from public.szpilplac_events
order by created_at desc
limit 30;
"""
    p = sql_dir / "fix-stats-events-warsaw-timezone.sql"
    old = read(p) if p.exists() else ""
    if old != stats_sql:
        write(p, stats_sql)
    else:
        print("Bez zmian: sql/fix-stats-events-warsaw-timezone.sql")

    audit_sql = """-- Szpilplac: kontrola czasu i odznak
-- Uruchom w Supabase SQL Editor po patchach.

-- A. Czy funkcje odznak zawierają Europe/Warsaw?
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

-- B. Ostatnie wyniki kont z datą po Warszawie.
select
  game,
  mode,
  puzzle_no,
  won,
  finished_at,
  finished_at::date as utc_or_session_date,
  timezone('Europe/Warsaw', finished_at)::date as warsaw_date,
  timezone('Europe/Warsaw', finished_at) as warsaw_time
from public.user_game_results
order by finished_at desc
limit 50;

-- C. Ostatnie eventy z datą po Warszawie.
select
  game,
  created_at,
  created_at::date as utc_or_session_date,
  timezone('Europe/Warsaw', created_at)::date as warsaw_date,
  timezone('Europe/Warsaw', created_at) as warsaw_time
from public.szpilplac_events
order by created_at desc
limit 50;
"""
    p2 = sql_dir / "audit-timezone-achievements.sql"
    old2 = read(p2) if p2.exists() else ""
    if old2 != audit_sql:
        write(p2, audit_sql)
    else:
        print("Bez zmian: sql/audit-timezone-achievements.sql")

def main():
    patch_klodka_cache_and_bridge()
    patch_achievements_panel_cache()
    patch_slowko_to_common_game_save()
    patch_gitignore()
    write_stats_sql()
    print("\nGOTOWE.")
    print("Zrób commit/push.")
    print("Potem w Supabase SQL Editor uruchom:")
    print("  1) sql/fix-achievements-warsaw-timezone.sql")
    print("  2) sql/fix-stats-events-warsaw-timezone.sql")
    print("  3) opcjonalnie sql/audit-timezone-achievements.sql")

if __name__ == "__main__":
    main()
