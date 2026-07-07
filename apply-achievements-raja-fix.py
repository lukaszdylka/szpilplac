#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_achievements_raja_fix"
BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        target = BACKUP / f"{path.as_posix().replace('/', '__')}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

def read(path):
    return path.read_text(encoding="utf-8")

def write(path, text):
    backup(path)
    path.write_text(text, encoding="utf-8")
    print(f"Zaktualizowano: {path}")

def patch_game_save():
    path = ROOT / "game-save.js"
    if not path.exists():
        print("Pominięto: brak game-save.js")
        return
    text = read(path)
    old = text

    text = text.replace("/* Szpilplac game-save.js v125 */", "/* Szpilplac game-save.js v126 */")
    text = text.replace('var VERSION="v125";', 'var VERSION="v126";')
    text = text.replace('source: "game-save-v125"', 'source: "game-save-v126"')

    if "function warsawLocalInfo()" not in text:
        marker = '''  function globalNumber(names){
    for(var i=0;i<names.length;i++){
      try{
        var n = firstNumber(window[names[i]]);
        if(n !== null)return n;
      }catch(e){}
    }
    return null;
  }'''
        helper = marker + '''

  function warsawLocalInfo(){
    var now = new Date();
    try{
      var parts = new Intl.DateTimeFormat("en-CA",{
        timeZone:"Europe/Warsaw",
        year:"numeric",
        month:"2-digit",
        day:"2-digit",
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit",
        hour12:false
      }).formatToParts(now);
      var o = {};
      parts.forEach(function(p){ if(p.type !== "literal") o[p.type] = p.value; });
      var hour = Number(o.hour || 0);
      return {
        date: o.year+"-"+o.month+"-"+o.day,
        time: (o.hour||"00")+":"+(o.minute||"00")+":"+(o.second||"00"),
        hour: Number.isFinite(hour) ? hour : 0,
        timezone: "Europe/Warsaw",
        utc: now.toISOString()
      };
    }catch(e){
      return {date:now.toISOString().slice(0,10),time:now.toISOString().slice(11,19),hour:now.getHours(),timezone:"Europe/Warsaw",utc:now.toISOString()};
    }
  }'''
        text = text.replace(marker, helper)

    if "var local = warsawLocalInfo();" not in text:
        text = text.replace(
            '    var hints = detectHints(original,payload);',
            '    var hints = detectHints(original,payload);\n    var local = warsawLocalInfo();'
        )

    if "local_date: local.date" not in text:
        text = text.replace(
            '      source: "game-save-v126",\n      path: location.pathname',
            '      source: "game-save-v126",\n      local_date: local.date,\n      local_time: local.time,\n      local_hour: local.hour,\n      timezone: local.timezone,\n      utc_finished_at: local.utc,\n      path: location.pathname'
        )

    if text != old:
        write(path, text)
    else:
        print("Bez zmian: game-save.js")

def patch_html_cache():
    candidates = [
        ROOT / "slowko.html",
        ROOT / "klodka.html",
        ROOT / "konto.html",
        ROOT / "index.html",
        ROOT / "raja" / "index.html",
    ]
    for path in candidates:
        if not path.exists():
            continue
        text = read(path)
        old = text
        text = text.replace("game-save.js?v=125", "game-save.js?v=126")
        text = text.replace("../game-save.js?v=125", "../game-save.js?v=126")
        if text != old:
            write(path, text)

def patch_raja():
    path = ROOT / "raja" / "index.html"
    if not path.exists():
        print("Pominięto: brak raja/index.html")
        return
    text = read(path)
    old = text

    old_reorder = '''function reorder(from,to){if(from<0||to<0||from===to||from>=order.length||to>=order.length)return;var item=order.splice(from,1)[0];order.splice(to,0,item);selIdx=-1;persist();playSound("drop");renderList();}
function dragOverIndex(x,y){'''
    new_reorder = '''function fixedAt(i){var mask=lastMask();return !!(mask&&mask[i]);}
function movableTarget(i,dir){var j=i+dir;while(j>=0&&j<order.length){if(!fixedAt(j))return j;j+=dir;}return -1;}
function reorder(from,to){if(from<0||to<0||from===to||from>=order.length||to>=order.length)return;if(fixedAt(from))return;if(fixedAt(to)){to=movableTarget(from,to>from?1:-1);}if(to<0||to>=order.length||fixedAt(to))return;var item=order.splice(from,1)[0];order.splice(to,0,item);selIdx=-1;persist();playSound("drop");renderList();}
function dragOverIndex(x,y){'''
    if old_reorder in text:
        text = text.replace(old_reorder, new_reorder)
    elif "function fixedAt(i)" not in text:
        print("Uwaga: nie znaleziono miejsca na fixedAt/movableTarget w raja/index.html")

    old_arrows = '''    if(!locked){
      html+='<div class="arrows"><button data-up="'+i+'" '+(i===0?'disabled':'')+'>▲</button><button data-down="'+i+'" '+(i===order.length-1?'disabled':'')+'>▼</button></div>';
    }else if(fixed){html+='<div class="tick">✓</div>';}'''
    new_arrows = '''    if(!locked&&!fixed){
      var upDisabled=movableTarget(i,-1)<0;
      var downDisabled=movableTarget(i,1)<0;
      html+='<div class="arrows"><button data-up="'+i+'" '+(upDisabled?'disabled':'')+'>▲</button><button data-down="'+i+'" '+(downDisabled?'disabled':'')+'>▼</button></div>';
    }else if(fixed){html+='<div class="tick">✓</div>';}'''
    if old_arrows in text:
        text = text.replace(old_arrows, new_arrows)
    else:
        print("Uwaga: nie znaleziono starego bloku strzałek w renderList.")

    old_pick_move = '''function pick(i){if(status!=="playing")return;if(selIdx===-1){selIdx=i;}else if(selIdx===i){selIdx=-1;}else{var t=order[selIdx];order[selIdx]=order[i];order[i]=t;selIdx=-1;persist();playSound("move");}renderList();}
function move(i,dir){var j=i+dir;if(j<0||j>=order.length)return;var t=order[i];order[i]=order[j];order[j]=t;selIdx=-1;persist();playSound("move");renderList();}'''
    new_pick_move = '''function pick(i){if(status!=="playing"||fixedAt(i))return;if(selIdx===-1){selIdx=i;}else if(selIdx===i){selIdx=-1;}else{if(fixedAt(selIdx)||fixedAt(i)){selIdx=-1;renderList();return;}var t=order[selIdx];order[selIdx]=order[i];order[i]=t;selIdx=-1;persist();playSound("move");}renderList();}
function move(i,dir){if(fixedAt(i))return;var j=movableTarget(i,dir);if(j<0||j>=order.length)return;var t=order[i];order[i]=order[j];order[j]=t;selIdx=-1;persist();playSound("move");renderList();}'''
    if old_pick_move in text:
        text = text.replace(old_pick_move, new_pick_move)
    else:
        print("Uwaga: nie znaleziono starego bloku pick/move. Możliwe, że był już patchowany.")

    css = '''
/* SZPILPLAC RAJA FIXED CORRECT SLOTS v131 */
.row.fixed{
  opacity:1!important;
}
.row.fixed .name{
  font-weight:900!important;
}
.row.fixed .arrows{
  display:none!important;
}
.row.fixed .tick{
  width:38px;
  min-width:38px;
  height:34px;
  border-radius:10px;
  display:grid;
  place-items:center;
  background:var(--correct,#3f8a5a);
  color:#fff;
}
'''
    if "SZPILPLAC RAJA FIXED CORRECT SLOTS v131" not in text:
        idx = text.lower().find("</style>")
        if idx != -1:
            text = text[:idx] + "\n" + css.strip() + "\n" + text[idx:]

    if text != old:
        write(path, text)
    else:
        print("Bez zmian: raja/index.html")

def write_sql_patch():
    sql_dir = ROOT / "sql"
    sql_dir.mkdir(exist_ok=True)
    path = sql_dir / "fix-achievements-warsaw-timezone.sql"
    content = r'''-- Szpilplac: poprawka strefy czasowej odznak
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
'''
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if old != content:
        if path.exists():
            backup(path)
        path.write_text(content, encoding="utf-8")
        print(f"Zapisano SQL: {path}")

def main():
    patch_game_save()
    patch_html_cache()
    patch_raja()
    write_sql_patch()
    print("\nGotowe.")
    print("1) Commit/push zmian plików.")
    print("2) W Supabase SQL Editor uruchom: sql/fix-achievements-warsaw-timezone.sql")
    print("3) Sprawdź grę po północy oraz Raję po pierwszym błędnym sprawdzeniu.")

if __name__ == "__main__":
    main()
