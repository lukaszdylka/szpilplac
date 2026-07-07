#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_klodka_fix"
BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        target = BACKUP / f"{path.name}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        shutil.copy2(path, target)

path = ROOT / "klodka-auth-bridge.js"

if not path.exists():
    raise SystemExit("Nie znaleziono klodka-auth-bridge.js. Uruchom ten skrypt z głównego katalogu repo szpilplac.")

text = path.read_text(encoding="utf-8")
original = text

text = text.replace("Szpilplac Kłōdka Auth Bridge v126", "Szpilplac Kłōdka Auth Bridge v127")
text = text.replace('var VERSION="v126";', 'var VERSION="v127";')

old_clear = '''  function clearAccountDoneUI(){
    var box=document.getElementById("szpKlodkaAccountDone");
    if(box&&box.parentNode)box.parentNode.removeChild(box);
    var pad=document.getElementById("pad");
    if(pad)pad.style.display="";
  }'''
new_clear = '''  function clearAccountDoneUI(){
    try{if(window.game)delete window.game.__accountDone;}catch(e){}
    var box=document.getElementById("szpKlodkaAccountDone");
    if(box&&box.parentNode)box.parentNode.removeChild(box);
    var pad=document.getElementById("pad");
    if(pad)pad.style.display="";
  }'''
text = text.replace(old_clear, new_clear)

old_local = '''      if(window.game&&(window.game.status==="won"||window.game.status==="lost")){var gm=window.game.mode||currentMode();var gi=window.game.idx!=null?Number(window.game.idx):currentPuzzleNo(gm);if(gm===mode&&String(gi)===String(idx))return true;}'''
new_local = '''      if(window.game&&window.game.__accountDone===true)return false;
      if(window.game&&(window.game.status==="won"||window.game.status==="lost")){var gm=window.game.mode||currentMode();var gi=window.game.idx!=null?Number(window.game.idx):currentPuzzleNo(gm);if(gm===mode&&String(gi)===String(idx))return true;}'''
text = text.replace(old_local, new_local)

old_show = '''    try{if(window.game){window.game.status=row.won?"won":"lost";window.game.mode=mode;window.game.idx=idx;}window.current="";}catch(e){}'''
new_show = '''    try{if(window.game){window.game.status=row.won?"won":"lost";window.game.mode=mode;window.game.idx=idx;window.game.__accountDone=true;}window.current="";}catch(e){}'''
text = text.replace(old_show, new_show)

if text == original:
    raise SystemExit("Nie wprowadzono zmian. Możliwe, że plik ma inną wersję albo patch już był wykonany.")

backup(path)
path.write_text(text, encoding="utf-8")
print("OK: poprawiono klodka-auth-bridge.js do v127.")
print("Komunikat 'Ta Kłōdka jest już zapisana na koncie' nie powinien już znikać po chwili.")
