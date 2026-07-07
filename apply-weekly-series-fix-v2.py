#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_weekly_series_fix_v2"
BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        target = BACKUP / f"{path.name}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        shutil.copy2(path, target)

def replace_any(text, pairs):
    for old, new in pairs:
        text = text.replace(old, new)
    return text

konto_dashboard = ROOT / "konto-dashboard.js"
konto_html = ROOT / "konto.html"

if not konto_dashboard.exists():
    raise SystemExit("Nie znaleziono konto-dashboard.js. Uruchom skrypt z głównego katalogu repo.")

text = konto_dashboard.read_text(encoding="utf-8")
original = text

text = replace_any(text, [
    ("Szpilplac Konto Dashboard v39", "Szpilplac Konto Dashboard v41"),
    ("Szpilplac Konto Dashboard v40", "Szpilplac Konto Dashboard v41"),
    ('var VERSION = "v39";', 'var VERSION = "v41";'),
    ('var VERSION = "v40";', 'var VERSION = "v41";'),
])

insert_after = '''  function weekWord(n){var mod10=n%10,mod100=n%100;if(n===1)return "tydzień";if(mod10>=2&&mod10<=4&&!(mod100>=12&&mod100<=14))return "tygodnie";return "tygodni";}'''
insert_func = '''  function weekWord(n){var mod10=n%10,mod100=n%100;if(n===1)return "tydzień";if(mod10>=2&&mod10<=4&&!(mod100>=12&&mod100<=14))return "tygodnie";return "tygodni";}
  function findDailyStreakCard(){return Array.prototype.slice.call(document.querySelectorAll(".progress-card")).find(function(card){var kicker=card.querySelector(".progress-kicker");return kicker&&textOf(kicker).toLowerCase().indexOf("seria dni")!==-1;});}
  function visibleDayStreakCount(rows){
    var n=0;
    try{
      var card=findDailyStreakCard(),main=card&&card.querySelector(".progress-main");
      var m=textOf(main).match(/(\\d+)/);
      if(m)n=Number(m[1]||0);
    }catch(e){}
    if(n>0)return n;
    try{
      var played=playedDaysMap(rows),key=warsawTodayKey();
      if(!played[key])key=addDaysKey(key,-1);
      while(played[key]){n++;key=addDaysKey(key,-1);}
    }catch(e){}
    return n;
  }
  function fullWeeksFromDayStreak(rows){return Math.floor(Math.max(0,visibleDayStreakCount(rows))/7);}'''

if insert_after in text and "function fullWeeksFromDayStreak" not in text:
    text = text.replace(insert_after, insert_func)

text = text.replace(
    'var count=Math.max(0,Math.min(7,countCurrentWeekDays(rows))),series=weeklySeries(rows);',
    'var count=Math.max(0,Math.min(7,countCurrentWeekDays(rows))),series=fullWeeksFromDayStreak(rows);'
)

text = replace_any(text, [
    (
        'if(note){var txt=count>=7?"Tygodniowy cel gotowy w tym tygodniu!":"Jeszcze "+(7-count)+" dni do celu w tym tygodniu.";if(series>0)txt+=" · "+series+" "+weekWord(series)+" w serii.";note.textContent=txt;}',
        'if(note){var txt=count>=7?"Tygodniowy cel gotowy w tym tygodniu!":"Jeszcze "+(7-count)+" dni do celu w tym tygodniu.";txt+=" · Pełne tygodnie z serii: "+series+" "+weekWord(series)+".";note.textContent=txt;}'
    ),
    (
        'if(note){var txt=count>=7?"Tygodniowy cel gotowy w tym tygodniu!":"Jeszcze "+(7-count)+" dni do celu w tym tygodniu.";txt+=" · Zagrane pełne tygodnie: "+series+" "+weekWord(series)+".";note.textContent=txt;}',
        'if(note){var txt=count>=7?"Tygodniowy cel gotowy w tym tygodniu!":"Jeszcze "+(7-count)+" dni do celu w tym tygodniu.";txt+=" · Pełne tygodnie z serii: "+series+" "+weekWord(series)+".";note.textContent=txt;}'
    ),
])

if text == original:
    raise SystemExit("Nie wprowadzono zmian w konto-dashboard.js. Możliwe, że patch już był wykonany albo plik ma inną wersję.")

backup(konto_dashboard)
konto_dashboard.write_text(text, encoding="utf-8")
print("OK: konto-dashboard.js -> v41")
print("Pełne tygodnie będą liczone jako floor(Seria dni / 7), np. 9 dni = 1 tydzień.")

if konto_html.exists():
    h = konto_html.read_text(encoding="utf-8")
    old = h
    h = replace_any(h, [
        ('konto-dashboard.js?v=039', 'konto-dashboard.js?v=041'),
        ('konto-dashboard.js?v=040', 'konto-dashboard.js?v=041'),
        ('konto-dashboard.js?v=39', 'konto-dashboard.js?v=041'),
        ('konto-dashboard.js?v=40', 'konto-dashboard.js?v=041'),
    ])
    if h != old:
        backup(konto_html)
        konto_html.write_text(h, encoding="utf-8")
        print("OK: konto.html -> konto-dashboard.js?v=041")
    else:
        print("Uwaga: nie znalazłem starego query konto-dashboard.js w konto.html. Sprawdź ręcznie, czy jest ?v=041.")
else:
    print("Uwaga: nie znaleziono konto.html.")
