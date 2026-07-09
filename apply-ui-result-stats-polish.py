
# -*- coding: utf-8 -*-
from pathlib import Path
from datetime import datetime
import shutil
import sys
import re

ROOT = Path.cwd()
BACKUP = ROOT / ("_backup_ui_result_stats_" + datetime.now().strftime("%Y%m%d-%H%M%S"))
RESULT_STATS_JS = "/* Szpilplac result-stats-snapshot.js v1\n   Krotkie statystyki widoczne od razu po zakonczeniu gry.\n   Dziala dla: Slowko, Klodka, Raja. Nie zmienia logiki gier.\n*/\n(function(){\n  \"use strict\";\n\n  var VERSION = \"v1\";\n  var AUTH_STORAGE_KEY = \"szpilplac-auth-v05\";\n  var client = null;\n  var pending = false;\n\n  function inRaja(){return /\\/raja\\/?/.test(location.pathname);}\n  function root(path){return (inRaja() ? \"../\" : \"\") + path;}\n  function qsa(sel,rootNode){return Array.prototype.slice.call((rootNode||document).querySelectorAll(sel));}\n  function esc(v){\n    return String(v == null ? \"\" : v).replace(/[&<>\"']/g,function(ch){\n      return {\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#39;\"}[ch] || ch;\n    });\n  }\n  function n(v){var x = Number(v); return Number.isFinite(x) ? x : null;}\n  function gameKey(){\n    var p = location.pathname.toLowerCase();\n    if(p.indexOf(\"klodka\") !== -1)return \"klodka\";\n    if(p.indexOf(\"raja\") !== -1)return \"zorta\";\n    if(p.indexOf(\"cuzamen\") !== -1)return \"cuzamen\";\n    return \"slowko\";\n  }\n  function gameKeys(key){\n    key = key || gameKey();\n    return (key === \"zorta\" || key === \"raja\") ? [\"zorta\",\"raja\"] : [key];\n  }\n  function gameLabel(key){\n    key = key || gameKey();\n    if(key === \"klodka\")return \"Kłōdka\";\n    if(key === \"zorta\" || key === \"raja\")return \"Raja\";\n    if(key === \"cuzamen\")return \"Cuzamen\";\n    return \"Słōwko\";\n  }\n  function loadScript(src,testFn){\n    if(typeof testFn === \"function\" && testFn())return Promise.resolve();\n    return new Promise(function(resolve){\n      var clean = src.split(\"?\")[0];\n      var existing = qsa(\"script\").find(function(s){return s.src && s.src.indexOf(clean) !== -1;});\n      if(existing){resolve();return;}\n      var sc = document.createElement(\"script\");\n      sc.src = src;\n      sc.async = false;\n      sc.onload = resolve;\n      sc.onerror = resolve;\n      document.head.appendChild(sc);\n    });\n  }\n  async function getClient(){\n    if(client)return client;\n    if(window.SZP_GAME_SAVE && typeof window.SZP_GAME_SAVE.getClient === \"function\"){\n      try{var c = await window.SZP_GAME_SAVE.getClient(); if(c){client = c; return c;}}catch(e){}\n    }\n    if(window.SZPILPLAC_AUTH && typeof window.SZPILPLAC_AUTH.getClient === \"function\"){\n      try{var c2 = window.SZPILPLAC_AUTH.getClient(); if(c2){client = c2; return c2;}}catch(e){}\n    }\n    await loadScript(root(\"config.js?v=13\"),function(){return !!window.SZPILPLAC_CONFIG;});\n    await loadScript(\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\",function(){return !!window.supabase;});\n    var url = window.SUPABASE_URL || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL);\n    var key = window.SUPABASE_ANON_KEY || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY);\n    if(!url || !key || !window.supabase)return null;\n    client = window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});\n    return client;\n  }\n  async function getSession(){\n    var c = await getClient();\n    if(!c)return null;\n    try{\n      var r = await c.auth.getSession();\n      if(r && r.data && r.data.session)return r.data.session;\n    }catch(e){}\n    try{\n      var raw = localStorage.getItem(AUTH_STORAGE_KEY);\n      if(!raw)return null;\n      var data = JSON.parse(raw);\n      var s = data.currentSession || data.session || data;\n      if(s && s.access_token && s.refresh_token){\n        try{\n          var set = await c.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});\n          if(set && set.data && set.data.session)return set.data.session;\n        }catch(e){}\n        return s;\n      }\n    }catch(e){}\n    return null;\n  }\n  function injectStyle(){\n    if(document.getElementById(\"szpResultStatsSnapshotStyle\"))return;\n    var st = document.createElement(\"style\");\n    st.id = \"szpResultStatsSnapshotStyle\";\n    st.textContent =\n      \".szp-result-stats{margin:13px 0 12px;padding:12px;border:1px solid var(--line,#c9bfa6);border-radius:15px;background:var(--surface2,#f3ecda)}\"+\n      \".szp-result-stats-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;color:var(--ink2,#6a6150);font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}\"+\n      \".szp-result-stats-source{padding:3px 7px;border:1px solid rgba(191,138,58,.5);border-radius:999px;color:var(--gold,#bf8a3a);background:rgba(191,138,58,.08)}\"+\n      \".szp-result-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}\"+\n      \".szp-result-stat{padding:9px 7px;border:1px solid var(--line,#c9bfa6);border-radius:12px;background:var(--surface,#fbf7ee);text-align:center}\"+\n      \".szp-result-stat b{display:block;font-family:Oswald,system-ui,sans-serif;font-size:22px;line-height:1;color:var(--green,#2f4a39)}\"+\n      \"[data-theme=dark] .szp-result-stat b{color:var(--gold,#bf8a3a)}\"+\n      \".szp-result-stat span{display:block;margin-top:4px;color:var(--ink2,#6a6150);font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}\"+\n      \".szp-result-full-stats{width:100%;margin-top:10px;min-height:38px;padding:9px 12px;border:1.5px solid var(--green,#2f4a39);border-radius:12px;background:transparent;color:var(--green,#2f4a39);font-family:Oswald,system-ui,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:13px}\"+\n      \"[data-theme=dark] .szp-result-full-stats{border-color:var(--gold,#bf8a3a);color:var(--gold,#bf8a3a)}\"+\n      \"@media(max-width:430px){.szp-result-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\";\n    document.head.appendChild(st);\n  }\n  function normalizeRows(rows){\n    var map = {};\n    (rows || []).forEach(function(r){\n      if(!r)return;\n      var key = [r.game || \"\", r.mode || \"\", r.puzzle_no == null ? \"\" : r.puzzle_no].join(\":\");\n      var old = map[key];\n      var date = Date.parse(r.finished_at || r.created_at || 0) || 0;\n      var oldDate = old ? (Date.parse(old.finished_at || old.created_at || 0) || 0) : -1;\n      if(!old || date >= oldDate)map[key] = r;\n    });\n    return Object.keys(map).map(function(k){return map[k];});\n  }\n  function compute(rows){\n    rows = normalizeRows(rows || []);\n    var played = rows.length;\n    var wins = rows.filter(function(r){return r.won === true;}).length;\n    var triesList = rows.map(function(r){return n(r.tries);}).filter(function(x){return x !== null && x > 0;});\n    var avg = triesList.length ? (triesList.reduce(function(a,b){return a+b;},0) / triesList.length).toFixed(1) : \"—\";\n    return {played:played,wins:wins,avg:avg};\n  }\n  async function fetchRows(){\n    var c = await getClient();\n    var s = await getSession();\n    if(!c || !s || !s.user)return null;\n    var keys = gameKeys(gameKey());\n    async function query(withFinished){\n      var sel = withFinished ? \"game,mode,puzzle_no,won,tries,score,created_at,finished_at\" : \"game,mode,puzzle_no,won,tries,score,created_at\";\n      var q = c.from(\"user_game_results\").select(sel).eq(\"user_id\",s.user.id);\n      if(keys.length > 1)q = q.in(\"game\",keys);\n      else q = q.eq(\"game\",keys[0]);\n      q = q.order(\"puzzle_no\",{ascending:true});\n      var res = await q;\n      if(res && res.error && withFinished)return query(false);\n      if(res && res.error)return [];\n      return res && Array.isArray(res.data) ? res.data : [];\n    }\n    return query(true);\n  }\n  function currentResult(){\n    var key = gameKey();\n    var won = null, tries = null, max = null;\n    if(key === \"zorta\"){\n      var r = window.__SZP_LAST_RAJA_RESULT || {};\n      if(typeof r.won !== \"undefined\")won = !!r.won;\n      tries = n(r.tries);\n      max = n(window.MAX_TRIES) || 4;\n    }else{\n      var g = window.game || {};\n      if(g.status === \"won\")won = true;\n      if(g.status === \"lost\")won = false;\n      if(Array.isArray(g.guesses))tries = g.guesses.length;\n      max = n(window.MAX_TRIES) || n(window.MAX_GUESSES) || n(window.MAX_GUESSES_TEST) || 6;\n    }\n    return {won:won,tries:tries,max:max,label: won === false ? \"X/\"+(max || \"—\") : ((tries || \"—\")+\"/\"+(max || \"—\"))};\n  }\n  function findHosts(){\n    var out = [];\n    var modal = document.getElementById(\"modal\");\n    var result = document.getElementById(\"result\");\n    if(modal)out.push(modal);\n    if(result)out.push(result);\n    qsa(\".modal,.result\").forEach(function(x){if(out.indexOf(x) === -1)out.push(x);});\n    return out.filter(function(el){\n      if(!el || el.nodeType !== 1)return false;\n      if(el.querySelector(\".szp-result-stats\"))return false;\n      var visible = true;\n      if(el.id === \"result\")visible = el.classList.contains(\"show\") || getComputedStyle(el).display !== \"none\";\n      if(!visible)return false;\n      var txt = (el.textContent || \"\").toLowerCase();\n      return !!(el.querySelector(\"#shareBtn,.share,[data-share],.share-btn\") || txt.indexOf(\"poukładane\") !== -1 || txt.indexOf(\"otwarte\") !== -1 || txt.indexOf(\"znaczenie\") !== -1);\n    });\n  }\n  function buttonFullStats(){return '<button type=\"button\" class=\"szp-result-full-stats\" data-result-full-stats>Pełne statystyki</button>';}\n  function tile(v,l){return '<div class=\"szp-result-stat\"><b>'+esc(v)+'</b><span>'+esc(l)+'</span></div>';}\n  function renderBox(host,stats,source){\n    var res = currentResult();\n    var html =\n      '<div class=\"szp-result-stats\" data-szp-result-stats=\"1\">'+\n        '<div class=\"szp-result-stats-head\"><span>'+esc(gameLabel())+'</span><span class=\"szp-result-stats-source\">'+esc(source)+'</span></div>'+\n        '<div class=\"szp-result-stats-grid\">'+\n          tile(stats.played || 0,\"Zagrane\")+\n          tile(res.label,\"Ta gra\")+\n          tile(stats.wins || 0,\"Wygrane\")+\n          tile(stats.avg || \"—\",\"Śr. prób\")+\n        '</div>'+buttonFullStats()+'</div>';\n    var share = host.querySelector(\"#shareBtn,.share,[data-share],.share-btn\");\n    if(share && share.parentNode === host)share.insertAdjacentHTML(\"beforebegin\",html);\n    else host.insertAdjacentHTML(\"beforeend\",html);\n  }\n  async function enhanceHost(host){\n    if(!host || host.querySelector(\".szp-result-stats\"))return;\n    injectStyle();\n    var stats = null, source = \"konto\";\n    try{var rows = await fetchRows(); if(rows && rows.length)stats = compute(rows);}catch(e){}\n    if(!stats){\n      var res = currentResult();\n      stats = {played:1,wins:res.won === true ? 1 : 0,avg:res.tries || \"—\"};\n      source = \"lokalnie\";\n    }\n    if(host.querySelector(\".szp-result-stats\"))return;\n    renderBox(host,stats,source);\n  }\n  function scan(){\n    if(pending)return;\n    pending = true;\n    setTimeout(function(){pending = false; findHosts().forEach(function(host){enhanceHost(host);});},80);\n  }\n  function openFullStats(){\n    if(window.SZP_GAME_STATS && typeof window.SZP_GAME_STATS.show === \"function\"){window.SZP_GAME_STATS.show();return;}\n    var btn = document.getElementById(\"statBtn\") || document.getElementById(\"statsBtn\");\n    if(btn)btn.click();\n  }\n  function boot(){\n    injectStyle(); scan();\n    document.addEventListener(\"click\",function(e){\n      var btn = e.target && e.target.closest ? e.target.closest(\"[data-result-full-stats]\") : null;\n      if(!btn)return;\n      e.preventDefault();\n      openFullStats();\n    },true);\n    new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:[\"class\",\"style\"]});\n    setInterval(scan,1200);\n    console.info(\"Szpilplac result-stats-snapshot.js \"+VERSION);\n  }\n  window.SZP_RESULT_STATS_SNAPSHOT = {version:VERSION,scan:scan};\n  if(document.readyState === \"loading\")document.addEventListener(\"DOMContentLoaded\",boot); else boot();\n})();\n"

def die(msg):
    print("ERROR:", msg)
    sys.exit(1)

def backup(path):
    if path.exists():
        BACKUP.mkdir(exist_ok=True)
        target = BACKUP / path.as_posix().replace("/", "__")
        shutil.copy2(path, target)

def readb(path):
    return path.read_bytes()

def writeb(path, data):
    backup(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    print("OK:", path)

def write_text_utf8(path, text):
    backup(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("OK:", path)

def check_utf8(path):
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return
    bad = [x for x in ["Â","Ä","Å","�"] if x in text]
    if bad:
        print("UWAGA:", path, "ma podejrzane znaki:", ",".join(bad))

def ensure_script_before_body(data, script_line):
    if script_line in data:
        return data
    marker = b"</body>"
    if marker not in data:
        raise RuntimeError("Nie znaleziono </body>")
    return data.replace(marker, script_line + b"\n" + marker, 1)

def patch_raja():
    path = ROOT / "raja" / "index.html"
    if not path.exists():
        print("Pominięto Raja - brak raja/index.html")
        return
    b = readb(path)
    css_marker = b'.szp-result-account-note{display:none!important}\n</style>'
    css_add = b'''\n/* SZPILPLAC RAJA DESKTOP COMPACT ARROWS v132 */
@media(min-width:721px){
  .raja-stack #list{gap:8px!important}
  .raja-stack #list .row,
  #list .row{
    min-height:54px!important;
    padding:9px 11px!important;
    gap:10px!important;
  }
  #list .arrows{gap:3px!important}
  #list .arrows button{
    width:32px!important;
    min-width:32px!important;
    height:22px!important;
    min-height:22px!important;
    border-radius:7px!important;
    font-size:12px!important;
    line-height:1!important;
  }
}
'''
    if b"RAJA DESKTOP COMPACT ARROWS v132" not in b:
        if css_marker in b:
            b = b.replace(css_marker, css_add + css_marker, 1)
        else:
            b = b.replace(b"</style>", css_add + b"</style>", 1)
    b = ensure_script_before_body(b, b'<script src="../result-stats-snapshot.js?v=1"></script>')
    b = b.replace(b'Szpilplac raja/index.html v124 achievements audit fix', b'Szpilplac raja/index.html v132 desktop arrows result stats')
    writeb(path,b)
    check_utf8(path)

def patch_slowko():
    path = ROOT / "slowko.html"
    if not path.exists():
        print("Pominięto Slowko - brak slowko.html")
        return
    b = readb(path)
    if b'game-stats-common.js' not in b:
        b = b.replace(b'<script src="game-result-actions.js?v=128"></script>', b'<script src="game-stats-common.js?v=125"></script>\n  <script src="game-result-actions.js?v=128"></script>', 1)
    b = ensure_script_before_body(b, b'  <script src="result-stats-snapshot.js?v=1"></script>')
    writeb(path,b)
    check_utf8(path)

def patch_klodka():
    path = ROOT / "klodka.html"
    if not path.exists():
        print("Pominięto Klodke - brak klodka.html")
        return
    b = readb(path)
    if b'game-stats-common.js' not in b:
        b = b.replace(b'<script src="game-result-actions.js?v=128"></script>', b'<script src="game-stats-common.js?v=125"></script>\n      <script src="game-result-actions.js?v=128"></script>', 1)
    b = ensure_script_before_body(b, b'      <script src="result-stats-snapshot.js?v=1"></script>')
    writeb(path,b)
    check_utf8(path)

def patch_game_stats_common_version_reference():
    for rel in ["raja/index.html","slowko.html","klodka.html"]:
        p = ROOT / rel
        if not p.exists():
            continue
        b = readb(p)
        b2 = b.replace(b"game-stats-common.js?v=124", b"game-stats-common.js?v=125")
        if b2 != b:
            writeb(p,b2)
            check_utf8(p)

def patch_ranking():
    path = ROOT / "ranking.html"
    if not path.exists():
        print("Pominięto ranking - brak ranking.html")
        return
    b = readb(path)
    css_marker = b"</style>"
    css_add = b'''\n/* SZPILPLAC UI UNIFY v1 - ranking avatar + rank pill */
.rank-row{grid-template-columns:40px 56px minmax(0,1fr) auto!important;align-items:center!important}
.rank-avatar{width:56px!important;height:56px!important;min-width:56px!important;max-width:56px!important;min-height:56px!important;max-height:56px!important;align-self:center!important;justify-self:center!important;display:grid!important;place-items:center!important;padding:3px!important;border-width:2px!important;box-shadow:0 0 0 3px rgba(191,138,58,.08)}
.rank-avatar-img{width:100%!important;height:100%!important;display:grid!important;place-items:center!important;border-radius:999px!important;overflow:hidden!important}
.rank-avatar-img svg{width:100%!important;height:100%!important;display:block!important}
.rank-name{display:inline-flex!important;align-items:center!important;width:max-content!important;max-width:100%!important;margin-top:6px!important;padding:3px 8px 3px 7px!important;border:1px solid rgba(191,138,58,.45)!important;border-radius:999px!important;background:rgba(191,138,58,.09)!important;color:var(--ink2)!important;font-size:11px!important;line-height:1!important;gap:0!important}
.rank-name svg{display:none!important}.rank-name span{display:block!important}.login{line-height:1.05!important}
@media(max-width:560px){.rank-row{grid-template-columns:34px 46px minmax(0,1fr) auto!important}.rank-avatar{width:46px!important;height:46px!important;min-width:46px!important;max-width:46px!important;min-height:46px!important;max-height:46px!important;padding:2px!important}.rank-name{font-size:10px!important;padding:3px 7px!important}}
@media(max-width:390px){.rank-row{grid-template-columns:30px 42px minmax(0,1fr)!important}.rank-avatar{width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;min-height:42px!important;max-height:42px!important}}
'''
    if b"UI UNIFY v1" not in b:
        if css_marker not in b:
            raise RuntimeError("ranking.html: nie znaleziono </style>")
        b = b.replace(css_marker, css_add + css_marker, 1)
    b = b.replace(b'Szpilplac ranking.html v125 kamraty z placu', b'Szpilplac ranking.html v126 ui unified avatar rank')
    writeb(path,b)
    check_utf8(path)

def patch_konto():
    path = ROOT / "konto.html"
    if not path.exists():
        print("Pominięto konto - brak konto.html")
        return
    b = readb(path)
    trophy_svg = b'<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8v3.2a4 4 0 0 1-8 0V3z"/><path d="M6 5H3.8a1.8 1.8 0 0 0 0 3.6H6"/><path d="M14 5h2.2a1.8 1.8 0 0 1 0 3.6H14"/><path d="M10 10.5V14"/><path d="M7.2 17h5.6"/><path d="M8 14h4"/></svg>'
    pattern = re.compile(br'(<a class="icon-btn)([^"]*)(" href="ranking\.html" title="Ranking" aria-label="Ranking">\s*)<svg[^>]*>.*?</svg>(\s*</a>)', re.S)
    def repl(m):
        extra = b' ranking-btn' if b'ranking-btn' not in m.group(2) else b''
        return m.group(1) + extra + m.group(2) + m.group(3) + trophy_svg + m.group(4)
    b2, count = pattern.subn(repl, b, count=1)
    if count == 0 and b'ranking-btn' not in b:
        print("UWAGA: nie znaleziono linku ranking.html w konto.html")
    else:
        b = b2
    writeb(path,b)
    check_utf8(path)

def patch_gitignore():
    p = ROOT / ".gitignore"
    txt = p.read_text(encoding="utf-8") if p.exists() else ""
    add = "\n# Local patch backups\n_backup_*/\n*.bak\n"
    if "_backup_*/" not in txt:
        write_text_utf8(p, txt.rstrip() + add)

def main():
    if not (ROOT / ".git").exists():
        die("Uruchom skrypt w głównym katalogu repo szpilplac, tam gdzie jest folder .git")
    write_text_utf8(ROOT / "result-stats-snapshot.js", RESULT_STATS_JS)
    patch_raja()
    patch_slowko()
    patch_klodka()
    patch_game_stats_common_version_reference()
    patch_ranking()
    patch_konto()
    patch_gitignore()
    print()
    print("Gotowe.")
    print("Sprawdź lokalnie: Raja na PC, wyniki po grze, ranking i konto.")
    print()
    print("Commit:")
    print("  git add result-stats-snapshot.js raja/index.html slowko.html klodka.html ranking.html konto.html .gitignore")
    print('  git commit -m "Polish game result stats and unified UI"')
    print("  git push origin main")

if __name__ == "__main__":
    main()
