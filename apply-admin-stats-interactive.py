# -*- coding: utf-8 -*-
"""
Szpilplac — admin bardziej interaktywny + naprawa stats layout

Uruchom w głównym katalogu repo:
    py apply-admin-stats-interactive.py
"""
from pathlib import Path
from datetime import datetime
import shutil
import sys
import re

ROOT = Path.cwd()
BACKUP = ROOT / ("_backup_admin_stats_interactive_" + datetime.now().strftime("%Y%m%d-%H%M%S"))

ADMIN_JS = "/* Szpilplac admin-enhance.js v1\n   Bezpieczna nakładka na admin.html:\n   - dodaje szybkie działania,\n   - nie zapisuje nic w bazie,\n   - nie zmienia logiki istniejących paneli.\n*/\n(function(){\n  \"use strict\";\n  var VERSION = \"v1\";\n  var mounted = false;\n\n  function esc(x){\n    return String(x == null ? \"\" : x).replace(/[&<>\"']/g,function(ch){\n      return {\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#39;\"}[ch] || ch;\n    });\n  }\n  function injectStyle(){\n    if(document.getElementById(\"adminEnhanceStyle\"))return;\n    var s = document.createElement(\"style\");\n    s.id = \"adminEnhanceStyle\";\n    s.textContent = `\n      .admin-fast-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}\n      .admin-fast-card{padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--surface2);min-width:0}\n      .admin-fast-card h3{margin:0 0 6px;font-family:Oswald,system-ui,sans-serif;font-size:18px;line-height:1;text-transform:uppercase;letter-spacing:.03em}\n      .admin-fast-card p{margin:0 0 10px;color:var(--ink2);font-size:12px;line-height:1.45}\n      .admin-fast-actions{display:flex;flex-wrap:wrap;gap:7px}\n      .admin-fast-actions a,.admin-fast-actions button{\n        min-height:34px;display:inline-flex;align-items:center;justify-content:center;\n        padding:7px 10px;border:1px solid var(--line);border-radius:999px;background:var(--surface);\n        color:var(--ink);font-size:11.5px;font-weight:900;text-decoration:none;cursor:pointer\n      }\n      .admin-fast-actions a:hover,.admin-fast-actions button:hover{color:var(--green);border-color:rgba(191,138,58,.65);transform:translateY(-1px)}\n      .admin-fast-note{margin-top:10px;color:var(--ink2);font-size:11.5px;line-height:1.45}\n      .admin-mini-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}\n      .admin-mini-tools button,.admin-mini-tools a{\n        min-height:36px;display:inline-flex;align-items:center;justify-content:center;padding:8px 11px;\n        border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:var(--ink);font-size:12px;font-weight:900;text-decoration:none;cursor:pointer\n      }\n      .admin-mini-tools button:hover,.admin-mini-tools a:hover{background:var(--surface);color:var(--green)}\n      .admin-toast{\n        position:fixed;left:50%;bottom:18px;z-index:9999;transform:translateX(-50%);\n        max-width:min(520px,calc(100vw - 24px));padding:11px 13px;border:1px solid var(--line);\n        border-radius:14px;background:var(--surface);color:var(--ink);box-shadow:0 20px 50px -30px rgba(0,0,0,.7);\n        font-size:12.5px;font-weight:800;line-height:1.4;display:none\n      }\n      .admin-toast.show{display:block}\n      @media(max-width:980px){.admin-fast-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n      @media(max-width:620px){.admin-fast-grid{grid-template-columns:1fr}.admin-fast-actions a,.admin-fast-actions button{width:100%}.admin-mini-tools{display:grid}.admin-mini-tools button,.admin-mini-tools a{width:100%}}\n    `;\n    document.head.appendChild(s);\n  }\n  function toast(text){\n    var el = document.getElementById(\"adminEnhanceToast\");\n    if(!el){\n      el = document.createElement(\"div\");\n      el.id = \"adminEnhanceToast\";\n      el.className = \"admin-toast\";\n      document.body.appendChild(el);\n    }\n    el.textContent = text || \"\";\n    el.classList.add(\"show\");\n    clearTimeout(el.__t);\n    el.__t = setTimeout(function(){el.classList.remove(\"show\");},3600);\n  }\n  function copyText(text,ok){\n    if(navigator.clipboard && navigator.clipboard.writeText){\n      navigator.clipboard.writeText(text).then(function(){toast(ok || \"Skopiowano.\");}).catch(function(){fallbackCopy(text,ok);});\n    }else fallbackCopy(text,ok);\n  }\n  function fallbackCopy(text,ok){\n    var ta = document.createElement(\"textarea\");\n    ta.value = text;\n    ta.style.position = \"fixed\";\n    ta.style.left = \"-9999px\";\n    document.body.appendChild(ta);\n    ta.select();\n    try{document.execCommand(\"copy\");toast(ok || \"Skopiowano.\");}\n    catch(e){toast(\"Nie udało się skopiować. Zaznacz ręcznie z konsoli.\");}\n    ta.remove();\n  }\n  function card(title,desc,actions){\n    return '<article class=\"admin-fast-card\"><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p><div class=\"admin-fast-actions\">'+actions.map(function(a){\n      if(a.copy)return '<button type=\"button\" data-copy=\"'+esc(a.copy)+'\">'+esc(a.label)+'</button>';\n      return '<a href=\"'+esc(a.href)+'\" '+(a.blank?'target=\"_blank\" rel=\"noopener\"':'')+'>'+esc(a.label)+'</a>';\n    }).join(\"\")+'</div></article>';\n  }\n  function mount(){\n    if(mounted)return;\n    var hub = document.getElementById(\"hubCard\");\n    if(!hub || hub.classList.contains(\"hidden\"))return;\n    mounted = true;\n    injectStyle();\n\n    var html = '<section class=\"card\" id=\"adminFastCard\">'+\n      '<div class=\"section-title\"><h2>Szybkie działania</h2><span class=\"section-note\">Najczęstsze rzeczy pod ręką — bez zapisu w bazie z tej nakładki.</span></div>'+\n      '<div class=\"admin-fast-grid\">'+\n        card(\"Treści i start\",\"Nowości, strona główna i komunikat pierwszego wejścia.\",[\n          {label:\"Nowości\",href:\"nowosci.html\"},\n          {label:\"Strona główna\",href:\"index.html\"},\n          {label:\"Kod resetu okienka\",copy:\"SZP_WELCOME_MODAL.reset(); location.reload();\"}\n        ])+\n        card(\"Gry dzienne\",\"Podpowiedzi, wyniki i szybkie wejście do gier.\",[\n          {label:\"Podpowiedzi\",href:\"podpowiedzi.html\"},\n          {label:\"Wyniki gier\",href:\"game-results-admin.html\"},\n          {label:\"Kłōdka tyg.\",href:\"podpowiedzi_klodka_tygodniowki.html\"}\n        ])+\n        card(\"Społeczność\",\"Ranking, kamraty, odznaki i avatar gracza.\",[\n          {label:\"Ranking\",href:\"ranking.html\"},\n          {label:\"Odznaki\",href:\"odznaki-admin.html\"},\n          {label:\"Avatary\",href:\"avatar-admin.html\"}\n        ])+\n        card(\"Kontrola\",\"Statystyki, mailing i diagnostyka techniczna.\",[\n          {label:\"Statystyki\",href:\"stats.html\"},\n          {label:\"Mailing\",href:\"mailing-admin.html\"},\n          {label:\"Auth\",href:\"auth-diagnostyka.html\"}\n        ])+\n      '</div>'+\n      '<div class=\"admin-mini-tools\">'+\n        '<button type=\"button\" data-admin-hard-refresh>Odśwież panel</button>'+\n        '<button type=\"button\" data-copy=\"git status\\\\ngit add -A\\\\ngit commit -m \\\\\"Update Szpilplac\\\\\"\\\\ngit push origin main\">Kopiuj mini-commit</button>'+\n        '<button type=\"button\" data-copy=\"Ctrl+F5, potem sprawdź: index.html, ranking.html, konto.html, gracz.html, stats.html\">Kopiuj checklistę testu</button>'+\n        '<a href=\"https://supabase.com/dashboard\" target=\"_blank\" rel=\"noopener\">Supabase</a>'+\n      '</div>'+\n      '<p class=\"admin-fast-note\">To jest bezpieczna warstwa skrótów. Prawdziwe edytory treści robimy dalej jako osobne panele, żeby nie mieszać logiki i nie psuć istniejących gier.</p>'+\n    '</section>';\n\n    hub.insertAdjacentHTML(\"beforebegin\",html);\n\n    document.addEventListener(\"click\",function(e){\n      var copy = e.target && e.target.closest ? e.target.closest(\"[data-copy]\") : null;\n      if(copy){copyText(copy.getAttribute(\"data-copy\"),\"Skopiowano do schowka.\");return;}\n      var ref = e.target && e.target.closest ? e.target.closest(\"[data-admin-hard-refresh]\") : null;\n      if(ref){location.reload();return;}\n    });\n    console.info(\"Szpilplac admin-enhance.js \"+VERSION);\n  }\n  function scan(){mount();}\n  if(document.readyState === \"loading\")document.addEventListener(\"DOMContentLoaded\",scan); else scan();\n  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:[\"class\"]});\n  setInterval(scan,1500);\n})();\n"
STATS_JS = "/* Szpilplac stats-responsive-fix.js v1\n   Naprawa rozjeżdżania stats.html:\n   - bez zmiany danych,\n   - tabele na telefonie zamieniają się wizualnie w karty,\n   - na PC ogranicza przelewanie szerokich sekcji.\n*/\n(function(){\n  \"use strict\";\n  var VERSION = \"v1\";\n\n  function injectStyle(){\n    if(document.getElementById(\"statsResponsiveFixStyle\"))return;\n    var s = document.createElement(\"style\");\n    s.id = \"statsResponsiveFixStyle\";\n    s.textContent = `\n      html,body{width:100%;max-width:100%;overflow-x:hidden}\n      header,main,footer{width:100%;max-width:min(1120px,100%)}\n      main,.card,.hero,.hero-main,.hero-side,.two-col,.three-col,.table-wrap,.signal-list{min-width:0;max-width:100%}\n      .card{overflow:hidden}\n      .hero{grid-template-columns:minmax(0,1.28fr) minmax(240px,.72fr)}\n      .hero-main,.hero-side{min-width:0}\n      .grid,.kpi-row{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))!important}\n      .two-col{grid-template-columns:repeat(2,minmax(0,1fr))}\n      .three-col{grid-template-columns:repeat(3,minmax(0,1fr))}\n      .table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}\n      .table-wrap table{width:100%;min-width:680px}\n      .stat .value{overflow-wrap:anywhere}\n      .signal{min-width:0}\n      .signal b,.signal span{min-width:0;overflow-wrap:anywhere}\n      @media(max-width:1040px){\n        .hero,.two-col,.three-col{grid-template-columns:1fr!important}\n      }\n      @media(max-width:760px){\n        body{padding-left:10px!important;padding-right:10px!important}\n        .topbar{display:grid!important;grid-template-columns:1fr;gap:10px}\n        .controls{justify-content:flex-start!important;max-width:100%;overflow-x:auto;padding-bottom:2px}\n        .controls .nav-btn,.controls .icon-btn{flex:none}\n        .hero-main h2{font-size:25px!important}\n        .card{padding:14px!important;border-radius:16px!important}\n        .kpi-row,.grid{grid-template-columns:1fr 1fr!important;gap:8px!important}\n        .stat{padding:11px!important}\n        .stat .value{font-size:24px!important}\n      }\n      @media(max-width:520px){\n        .kpi-row,.grid{grid-template-columns:1fr!important}\n        .table-wrap{\n          overflow:visible!important;\n          border:0!important;\n          background:transparent!important;\n          border-radius:0!important;\n        }\n        .table-wrap table{\n          min-width:0!important;\n          width:100%!important;\n          background:transparent!important;\n        }\n        .table-wrap thead{\n          display:none!important;\n        }\n        .table-wrap tbody,\n        .table-wrap tr,\n        .table-wrap td{\n          display:block!important;\n          width:100%!important;\n        }\n        .table-wrap tr{\n          margin:0 0 10px!important;\n          padding:8px!important;\n          border:1px solid var(--line)!important;\n          border-radius:14px!important;\n          background:var(--surface2)!important;\n        }\n        .table-wrap td{\n          display:grid!important;\n          grid-template-columns:minmax(92px,.75fr) minmax(0,1.25fr)!important;\n          gap:10px!important;\n          align-items:start!important;\n          padding:7px 6px!important;\n          border-bottom:1px solid var(--line)!important;\n          white-space:normal!important;\n          text-align:right!important;\n          overflow-wrap:anywhere!important;\n        }\n        .table-wrap td:last-child{\n          border-bottom:0!important;\n        }\n        .table-wrap td::before{\n          content:attr(data-label);\n          color:var(--ink2);\n          font-size:10.5px;\n          font-weight:900;\n          letter-spacing:.05em;\n          text-transform:uppercase;\n          text-align:left;\n          line-height:1.35;\n        }\n        .table-wrap td.num{\n          text-align:right!important;\n        }\n      }\n    `;\n    document.head.appendChild(s);\n  }\n\n  function labelTables(){\n    Array.prototype.slice.call(document.querySelectorAll(\".table-wrap table\")).forEach(function(table){\n      var heads = Array.prototype.slice.call(table.querySelectorAll(\"thead th\")).map(function(th){\n        return (th.textContent || \"\").trim();\n      });\n      Array.prototype.slice.call(table.querySelectorAll(\"tbody tr\")).forEach(function(tr){\n        Array.prototype.slice.call(tr.children).forEach(function(td,i){\n          if(td.tagName && td.tagName.toLowerCase() === \"td\" && !td.getAttribute(\"data-label\")){\n            td.setAttribute(\"data-label\",heads[i] || \"\");\n          }\n        });\n      });\n    });\n  }\n\n  function boot(){\n    injectStyle();\n    labelTables();\n    new MutationObserver(function(){labelTables();}).observe(document.documentElement,{childList:true,subtree:true});\n    setInterval(labelTables,1500);\n    console.info(\"Szpilplac stats-responsive-fix.js \"+VERSION);\n  }\n\n  if(document.readyState === \"loading\")document.addEventListener(\"DOMContentLoaded\",boot);\n  else boot();\n})();\n"

def die(msg):
    print("ERROR:", msg)
    sys.exit(1)

def backup(path):
    if path.exists():
        BACKUP.mkdir(exist_ok=True)
        shutil.copy2(path, BACKUP / path.as_posix().replace("/", "__"))

def read(path):
    return path.read_text(encoding="utf-8", errors="replace")

def write(path,text):
    backup(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    print("OK:", path)

def check_utf8(path):
    text = read(path)
    bad = [x for x in ["Â","Ä","Å","�"] if x in text]
    if bad:
        print("UWAGA:", path, "ma podejrzane znaki:", ",".join(bad))
    else:
        print("Kodowanie OK:", path)

def ensure_script(text, filename, tag):
    pattern = re.compile(r'[ \t]*<script[^>]+src="' + re.escape(filename) + r'(?:\?v=[^"]*)?"[^>]*></script>\s*', re.I)
    text = pattern.sub("", text)
    if "</body>" not in text:
        die("Nie znaleziono </body>")
    return text.replace("</body>", tag + "\n</body>", 1)

def patch_admin():
    p = ROOT / "admin.html"
    if not p.exists():
        die("Nie znaleziono admin.html")
    text = read(p)
    text = text.replace("Szpilplac admin.html v80-clean-admin", "Szpilplac admin.html v81-interactive")
    text = ensure_script(text, "admin-enhance.js", '<script src="admin-enhance.js?v=1"></script>')
    write(p,text)
    check_utf8(p)

def patch_stats():
    p = ROOT / "stats.html"
    if not p.exists():
        die("Nie znaleziono stats.html")
    text = read(p)
    text = text.replace("Szpilplac stats.html v16-optimized", "Szpilplac stats.html v17-responsive")
    text = ensure_script(text, "stats-responsive-fix.js", '<script src="stats-responsive-fix.js?v=1"></script>')
    write(p,text)
    check_utf8(p)

def patch_gitignore():
    p = ROOT / ".gitignore"
    text = read(p) if p.exists() else ""
    add = []
    if "_backup_*/" not in text:
        add.append("_backup_*/")
    if "*.bak" not in text:
        add.append("*.bak")
    if add:
        write(p, text.rstrip() + "\n\n# Local patch backups\n" + "\n".join(add) + "\n")

def main():
    if not (ROOT / ".git").exists():
        die("Uruchom w głównym katalogu repo, tam gdzie jest folder .git")

    write(ROOT / "admin-enhance.js", ADMIN_JS)
    write(ROOT / "stats-responsive-fix.js", STATS_JS)
    patch_admin()
    patch_stats()
    patch_gitignore()

    print()
    print("Gotowe.")
    print("Sprawdź:")
    print("  admin.html — pojawia się sekcja Szybkie działania")
    print("  stats.html — nie rozjeżdża się na PC i telefonie")
    print()
    print("Commit:")
    print("  git add admin.html stats.html admin-enhance.js stats-responsive-fix.js .gitignore")
    print('  git commit -m "Improve admin actions and stats layout"')
    print("  git push origin main")

if __name__ == "__main__":
    main()
