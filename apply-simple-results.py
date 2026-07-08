#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_simple_results"
BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        safe = path.as_posix().replace("/", "__")
        target = BACKUP / f"{safe}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        shutil.copy2(path, target)

def read(path):
    return path.read_text(encoding="utf-8")

def write(path, text):
    backup(path)
    path.write_text(text, encoding="utf-8")
    print(f"OK: {path}")

def patch_game_result_actions():
    p = ROOT / "game-result-actions.js"
    if not p.exists():
        print("Pominięto: brak game-result-actions.js")
        return

    text = read(p)
    old = text

    text = text.replace('var VERSION = "v126";', 'var VERSION = "v128";')
    text = text.replace('var VERSION = "v127";', 'var VERSION = "v128";')

    text = text.replace(
        '".szp-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}"+',
        '".szp-result-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:14px}"+'
    )
    text = text.replace(
        '".szp-result-account-note{margin-top:10px;padding:9px 11px;border:1px dashed var(--line,#c9bfa6);border-radius:12px;background:rgba(191,138,58,.10);color:var(--ink2,#6a6150);font-size:12px;line-height:1.4;text-align:center}"+',
        '".szp-result-account-note{display:none!important}"+'
    )

    old_action = '''  function actionHtml(){
    var logged = hasAccountSession();
    return '<div class="szp-result-actions" '+MARK+'="1"><a class="primary" href="'+root("ranking.html")+'">Zobacz ranking</a><a href="'+root("index.html")+'">Zagraj w inną grę</a><a href="'+root("konto.html")+'">'+(logged?"Moje konto":"Załóż konto")+'</a><a href="https://familock.pl" target="_blank" rel="noopener">Familock</a></div><div class="szp-result-account-note" '+MARK+'="1">'+(logged?"Jeśli byłeś zalogowany przed końcem gry, wynik zapisał się automatycznie.":"Załóż konto, żeby kolejne wyniki zapisywały punkty, rangi i historię. Ten wynik zostaje lokalnie w tej przeglądarce.")+'</div>';
  }'''
    new_action = '''  function plDayKey(){
    try{
      var parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),o={};
      parts.forEach(function(p){if(p.type!=="literal")o[p.type]=p.value;});
      return o.year+"-"+o.month+"-"+o.day;
    }catch(e){return new Date().toISOString().slice(0,10);}
  }
  function dayIndexFrom(baseY,baseM0,baseD){
    var k=plDayKey().split("-").map(Number);
    return Math.max(0,Math.floor((Date.UTC(k[0],k[1]-1,k[2])-Date.UTC(baseY,baseM0,baseD))/86400000));
  }
  function readJson(k){try{return JSON.parse(localStorage.getItem(k)||"null");}catch(e){return null;}}
  function isFinishedObj(x){
    if(!x)return false;
    if(x.game)x=x.game;
    return !!(x && (x.status==="won"||x.status==="lost"));
  }
  function playedToday(key){
    try{
      if(key==="slowko"){
        var sIdx=typeof window.TODAY_IDX==="number"?window.TODAY_IDX:dayIndexFrom(2026,5,23);
        return isFinishedObj(readJson("slowko_d"+sIdx));
      }
      if(key==="klodka"){
        var kNo=typeof window.TODAY_NO==="number"?window.TODAY_NO:(dayIndexFrom(2026,5,23)+1);
        return isFinishedObj(readJson("klodka_daily_v1_d"+kNo))||isFinishedObj(readJson("klodka_daily_v1"));
      }
      if(key==="raja"){
        var rIdx=typeof window.TODAY_IDX==="number"&&gameKey()==="raja"?window.TODAY_IDX:dayIndexFrom(2026,6,4);
        return isFinishedObj(readJson("zorta_daily_d"+rIdx));
      }
    }catch(e){}
    return false;
  }
  function nextGameLinks(){
    var cur=gameKey();
    var games=[
      {key:"slowko",label:"Zagraj w Słōwko",href:root("slowko.html")},
      {key:"klodka",label:"Zagraj w Kłōdkę",href:root("klodka.html")},
      {key:"raja",label:"Zagraj w Raję",href:root("raja/")}
    ];
    return games.filter(function(g){
      return g.key!==cur && !playedToday(g.key);
    });
  }
  function actionHtml(){
    var links=nextGameLinks();
    if(!links.length)return "";
    return '<div class="szp-result-actions" '+MARK+'="1">'+links.map(function(g,i){
      return '<a class="'+(i===0?'primary':'')+'" href="'+g.href+'">'+g.label+'</a>';
    }).join("")+'</div>';
  }'''

    if old_action in text:
        text = text.replace(old_action, new_action)
    elif "function nextGameLinks()" not in text:
        print("Uwaga: nie znaleziono starego actionHtml w game-result-actions.js.")

    if text != old:
        write(p,text)
    else:
        print("Bez zmian: game-result-actions.js")

def patch_slowko_end():
    p = ROOT / "slowko.html"
    if not p.exists():
        print("Pominięto: brak slowko.html")
        return
    text = read(p)
    old = text

    old_block = '''    statsHtml()+distHtml()+  // statystyki zawsze
    (isToday?cdHtml(t):'')+  // odliczanie tylko dla dzisiaj
    '<button class="btn" id="shareBtn">'+t.share+'</button>'+
    '<div class="share-msg" id="shareMsg" aria-live="polite"></div>'+
    '<a class="cta" href="https://www.familock.pl/#rezerwacja" target="_blank" rel="noopener">'+t.cta+'</a>');'''
    new_block = '''    (isToday?cdHtml(t):'')+
    '<button class="btn" id="shareBtn">'+t.share+'</button>'+
    '<div class="share-msg" id="shareMsg" aria-live="polite"></div>');'''
    text = text.replace(old_block, new_block)

    if ".modal .szp-auth-save-note{display:none!important}" not in text:
        text = text.replace("</style>", ".modal .szp-auth-save-note{display:none!important}\n</style>")

    text = text.replace('game-result-actions.js?v=126', 'game-result-actions.js?v=128')
    text = text.replace('game-result-actions.js?v=127', 'game-result-actions.js?v=128')

    if text != old:
        write(p,text)
    else:
        print("Bez zmian: slowko.html")

def patch_klodka_end():
    p = ROOT / "klodka.html"
    if not p.exists():
        print("Pominięto: brak klodka.html")
        return
    text = read(p)
    old = text

    old_block = '''    statsSummaryHtml(hist)+
    distHtml(hist)+
    countdownHtml+
    '<a class="cta" href="https://www.familock.pl" target="_blank" rel="noopener">'+T.cta+'</a>'+
    '<button class="btn share" id="shareBtn">'+T.share+'</button>'+'''
    new_block = '''    countdownHtml+
    '<button class="btn share" id="shareBtn">'+T.share+'</button>'+'''
    text = text.replace(old_block, new_block)

    if ".modal .szp-auth-save-note{display:none!important}" not in text:
        text = text.replace("</style>", ".modal .szp-auth-save-note{display:none!important}\n</style>")

    text = text.replace('game-result-actions.js?v=126', 'game-result-actions.js?v=128')
    text = text.replace('game-result-actions.js?v=127', 'game-result-actions.js?v=128')

    if text != old:
        write(p,text)
    else:
        print("Bez zmian: klodka.html")

def patch_raja_end():
    p = ROOT / "raja" / "index.html"
    if not p.exists():
        print("Pominięto: brak raja/index.html")
        return
    text = read(p)
    old = text

    text = text.replace(
        '''  setTimeout(function(){renderStatsModal();$("statScrim").classList.add("show");},650);''',
        '''  startRajaResultCountdown();'''
    )

    helper = '''function rajaCountdownText(){
  var now=new Date(),nx=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  var s=Math.max(0,Math.floor((nx-now)/1000));
  return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(function(x){return String(x).padStart(2,"0");}).join(":");
}
function startRajaResultCountdown(){
  var src=$("resSrc");if(!src)return;
  var label=lang==="sl"?"Nowo Raja za":"Nowa Raja za";
  src.innerHTML='<div class="cd">'+label+' <b id="rajaResultCd">'+rajaCountdownText()+'</b></div>';
  clearInterval(startRajaResultCountdown._t);
  startRajaResultCountdown._t=setInterval(function(){var el=$("rajaResultCd");if(el)el.textContent=rajaCountdownText();else clearInterval(startRajaResultCountdown._t);},1000);
}
'''
    if "function rajaCountdownText()" not in text:
        text = text.replace("function showResult(won){", helper + "function showResult(won){")

    text = text.replace(
        '''  $("resSrc").textContent="";''',
        '''  startRajaResultCountdown();'''
    )

    if ".szp-result-account-note{display:none!important}" not in text:
        text = text.replace("</style>", ".szp-result-account-note{display:none!important}\n</style>")

    text = text.replace('../game-result-actions.js?v=126', '../game-result-actions.js?v=128')
    text = text.replace('../game-result-actions.js?v=127', '../game-result-actions.js?v=128')

    if text != old:
        write(p,text)
    else:
        print("Bez zmian: raja/index.html")

def patch_gitignore():
    p = ROOT / ".gitignore"
    existing = read(p) if p.exists() else ""
    add = "\n# Local patch backups\n_backup_*/\n*.bak\n"
    if "_backup_*/" not in existing:
        write(p, existing.rstrip() + add)

def main():
    patch_game_result_actions()
    patch_slowko_end()
    patch_klodka_end()
    patch_raja_end()
    patch_gitignore()
    print("\nGotowe. Końcówki po grach są uproszczone.")
    print("Commit/push i sprawdź na telefonie: slowko.html, klodka.html, raja/.")

if __name__ == "__main__":
    main()
