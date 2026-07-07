"use strict";
/*
  Szpilplac v124 — wspólne statystyki gier
  - jeśli gracz jest zalogowany: statystyki z konta / user_game_results
  - jeśli nie jest zalogowany: delikatny fallback lokalny
  - przechwytuje przyciski Statystyki bez zmiany logiki gry
*/
(function(){
  var VERSION = "v124";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var client = null;

  function inRaja(){return /\/raja\/?/.test(location.pathname);}
  function root(path){return (inRaja() ? "../" : "") + path;}
  function qs(sel,rootNode){return (rootNode||document).querySelector(sel);}
  function qsa(sel,rootNode){return Array.prototype.slice.call((rootNode||document).querySelectorAll(sel));}
  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function n(v){
    var x = Number(v);
    return Number.isFinite(x) ? x : null;
  }
  function pct(wins,played){
    if(!played)return "0%";
    return Math.round((wins/played)*100) + "%";
  }
  function gameKey(){
    var p = location.pathname.toLowerCase();
    if(p.indexOf("klodka") !== -1)return "klodka";
    if(p.indexOf("raja") !== -1)return "zorta";
    if(p.indexOf("cuzamen") !== -1)return "cuzamen";
    return "slowko";
  }
  function gameLabel(key){
    key = key || gameKey();
    if(key === "klodka")return "Kłōdka";
    if(key === "zorta" || key === "raja")return "Raja";
    if(key === "cuzamen")return "Cuzamen";
    return "Słōwko";
  }
  function gameKeys(key){
    key = key || gameKey();
    if(key === "zorta" || key === "raja")return ["zorta","raja"];
    return [key];
  }
  function loadScript(src,testFn){
    if(typeof testFn === "function" && testFn())return Promise.resolve();
    return new Promise(function(resolve,reject){
      var clean = src.split("?")[0];
      var existing = qsa("script").find(function(s){return s.src && s.src.indexOf(clean) !== -1;});
      if(existing){
        if(typeof testFn !== "function" || testFn())return resolve();
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",reject,{once:true});
        return;
      }
      var sc = document.createElement("script");
      sc.src = src;
      sc.async = false;
      sc.onload = resolve;
      sc.onerror = reject;
      document.head.appendChild(sc);
    });
  }
  async function getClient(){
    if(client)return client;
    if(window.SZP_GAME_SAVE && typeof window.SZP_GAME_SAVE.getClient === "function"){
      try{
        var c = await window.SZP_GAME_SAVE.getClient();
        if(c){client = c; return c;}
      }catch(e){}
    }
    if(window.SZPILPLAC_AUTH && typeof window.SZPILPLAC_AUTH.getClient === "function"){
      try{
        var c2 = window.SZPILPLAC_AUTH.getClient();
        if(c2){client = c2; return c2;}
      }catch(e){}
    }
    await loadScript(root("config.js?v=13"),function(){return !!window.SZPILPLAC_CONFIG;}).catch(function(){});
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;}).catch(function(){});
    var url = window.SUPABASE_URL || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL);
    var key = window.SUPABASE_ANON_KEY || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY);
    if(!url || !key || !window.supabase)return null;
    client = window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    return client;
  }
  function storedSession(){
    try{
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      var data = JSON.parse(raw);
      return data.currentSession || data.session || data;
    }catch(e){return null;}
  }
  async function getSession(){
    var c = await getClient();
    if(!c)return null;
    try{
      var r = await c.auth.getSession();
      if(r && r.data && r.data.session)return r.data.session;
    }catch(e){}
    var s = storedSession();
    if(s && s.access_token && s.refresh_token){
      try{
        var set = await c.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
        if(set && set.data && set.data.session)return set.data.session;
      }catch(e){}
      return s;
    }
    return null;
  }

  function injectStyle(){
    if(document.getElementById("szpGameStatsCommonStyle"))return;
    var st = document.createElement("style");
    st.id = "szpGameStatsCommonStyle";
    st.textContent =
      ".szp-stats-scrim{position:fixed;inset:0;z-index:10020;background:rgba(12,10,8,.62);display:none;align-items:center;justify-content:center;padding:18px}" +
      ".szp-stats-scrim.show{display:flex}" +
      ".szp-stats-modal{width:min(540px,100%);max-height:min(760px,92vh);overflow:auto;border:1px solid var(--line,#c9bfa6);border-radius:22px;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);box-shadow:0 28px 90px rgba(0,0,0,.48);padding:18px}" +
      ".szp-stats-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}" +
      ".szp-stats-head h2{margin:0;font-family:Oswald,system-ui,sans-serif;text-transform:uppercase;font-size:26px;line-height:1}" +
      ".szp-stats-close{border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);border-radius:999px;width:36px;height:36px;font-weight:900;color:var(--ink,#23201a)}" +
      ".szp-stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}" +
      ".szp-stat-tile{border:1px solid var(--line,#c9bfa6);border-radius:15px;background:var(--surface2,#f3ecda);padding:11px 12px;text-align:center}" +
      ".szp-stat-tile b{display:block;font-family:Oswald,system-ui,sans-serif;font-size:25px;line-height:1.05}" +
      ".szp-stat-tile span{display:block;margin-top:4px;color:var(--ink2,#6a6150);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}" +
      ".szp-stats-note{margin:10px 0 0;color:var(--ink2,#6a6150);font-size:12.5px;line-height:1.45;text-align:center}" +
      ".szp-stats-source{display:inline-flex;gap:7px;align-items:center;border:1px solid rgba(47,74,57,.35);border-radius:999px;background:rgba(47,74,57,.08);color:var(--green,#2f4a39);font-size:11px;font-weight:900;padding:6px 9px}" +
      ".szp-stats-source.local{border-color:rgba(191,138,58,.45);background:rgba(191,138,58,.10);color:var(--gold,#bf8a3a)}" +
      ".szp-stats-dist{display:flex;flex-direction:column;gap:6px;margin-top:10px}" +
      ".szp-stats-dist-row{display:grid;grid-template-columns:52px 1fr 34px;gap:8px;align-items:center;font-size:12px;color:var(--ink2,#6a6150)}" +
      ".szp-stats-bar{height:8px;border-radius:999px;background:var(--line,#c9bfa6);overflow:hidden}.szp-stats-bar i{display:block;height:100%;background:var(--green,#2f4a39)}" +
      "@media(max-width:460px){.szp-stats-grid{grid-template-columns:1fr}.szp-stats-modal{padding:15px}.szp-stats-head h2{font-size:23px}}";
    document.head.appendChild(st);
  }

  function ensureModal(){
    injectStyle();

    var rajaScrim = document.getElementById("statScrim");
    var rajaBody = document.getElementById("statBody");
    if(rajaScrim && rajaBody){
      return {
        scrim: rajaScrim,
        body: rajaBody,
        show:function(){rajaScrim.classList.add("show");},
        close:function(){rajaScrim.classList.remove("show");}
      };
    }

    var scrim = document.getElementById("szpStatsScrim");
    if(!scrim){
      scrim = document.createElement("div");
      scrim.id = "szpStatsScrim";
      scrim.className = "szp-stats-scrim";
      scrim.innerHTML =
        '<div class="szp-stats-modal" role="dialog" aria-modal="true" aria-labelledby="szpStatsTitle">'+
          '<div class="szp-stats-head">'+
            '<h2 id="szpStatsTitle">Statystyki</h2>'+
            '<button type="button" class="szp-stats-close" id="szpStatsClose" aria-label="Zamknij">×</button>'+
          '</div>'+
          '<div id="szpStatsBody"></div>'+
        '</div>';
      document.body.appendChild(scrim);
      scrim.addEventListener("click",function(e){if(e.target === scrim)scrim.classList.remove("show");});
      var close = document.getElementById("szpStatsClose");
      if(close)close.addEventListener("click",function(){scrim.classList.remove("show");});
      document.addEventListener("keydown",function(e){if(e.key === "Escape")scrim.classList.remove("show");});
    }

    return {
      scrim:scrim,
      body:document.getElementById("szpStatsBody"),
      show:function(){scrim.classList.add("show");},
      close:function(){scrim.classList.remove("show");}
    };
  }

  function statTile(value,label){
    return '<div class="szp-stat-tile"><b>'+esc(value)+'</b><span>'+esc(label)+'</span></div>';
  }
  function renderLoading(modal){
    modal.body.innerHTML =
      '<span class="szp-stats-source">konto gracza</span>'+
      '<p class="szp-stats-note">Wczytuję statystyki z konta...</p>';
    modal.show();
  }

  function normalizeRows(rows){
    var map = {};
    rows.forEach(function(r){
      if(!r)return;
      var key = [r.game || "", r.mode || "", r.puzzle_no == null ? "" : r.puzzle_no].join(":");
      var old = map[key];
      var date = Date.parse(r.finished_at || r.created_at || 0) || 0;
      var oldDate = old ? (Date.parse(old.finished_at || old.created_at || 0) || 0) : -1;
      if(!old || date >= oldDate)map[key] = r;
    });
    return Object.keys(map).map(function(k){return map[k];});
  }

  function compute(rows){
    rows = normalizeRows(rows || []);
    var played = rows.length;
    var wins = rows.filter(function(r){return r.won === true;}).length;
    var points = rows.reduce(function(sum,r){return sum + (n(r.score) || 0);},0);
    var triesList = rows.map(function(r){return n(r.tries);}).filter(function(x){return x !== null && x > 0;});
    var avgTries = triesList.length ? (triesList.reduce(function(a,b){return a+b;},0) / triesList.length) : 0;
    var bestScore = rows.reduce(function(best,r){return Math.max(best,n(r.score) || 0);},0);
    var dist = {};
    triesList.forEach(function(t){dist[t] = (dist[t] || 0) + 1;});

    var daily = rows.filter(function(r){return String(r.mode || "daily") === "daily" && n(r.puzzle_no) !== null;})
      .sort(function(a,b){return n(a.puzzle_no) - n(b.puzzle_no);});

    var bestStreak = 0, curRun = 0, prevNo = null;
    daily.forEach(function(r){
      var no = n(r.puzzle_no);
      if(r.won === true && (prevNo === null || no === prevNo + 1)){
        curRun += 1;
      }else if(r.won === true){
        curRun = 1;
      }else{
        curRun = 0;
      }
      bestStreak = Math.max(bestStreak,curRun);
      prevNo = no;
    });

    var currentStreak = 0;
    var desc = daily.slice().sort(function(a,b){return n(b.puzzle_no) - n(a.puzzle_no);});
    var expected = null;
    for(var i=0;i<desc.length;i++){
      var row = desc[i];
      var no2 = n(row.puzzle_no);
      if(expected !== null && no2 !== expected)break;
      if(row.won !== true)break;
      currentStreak += 1;
      expected = no2 - 1;
    }

    return {played:played,wins:wins,points:points,winPct:pct(wins,played),avgTries:avgTries,bestScore:bestScore,dist:dist,currentStreak:currentStreak,bestStreak:bestStreak};
  }

  function renderDist(dist,total){
    var keys = Object.keys(dist || {}).map(Number).sort(function(a,b){return a-b;});
    if(!keys.length)return "";
    var rows = keys.map(function(k){
      var val = dist[k] || 0;
      var w = total ? Math.round((val/total)*100) : 0;
      return '<div class="szp-stats-dist-row"><span>'+esc(k)+' prób</span><div class="szp-stats-bar"><i style="width:'+w+'%"></i></div><b>'+esc(val)+'</b></div>';
    }).join("");
    return '<h3 style="margin:12px 0 6px;font-family:Oswald,system-ui,sans-serif;text-transform:uppercase;font-size:15px;color:var(--ink2,#6a6150)">Rozkład prób</h3><div class="szp-stats-dist">'+rows+'</div>';
  }

  function renderAccount(modal,stats,key){
    var label = gameLabel(key);
    modal.body.innerHTML =
      '<span class="szp-stats-source">statystyki z konta</span>'+
      '<div class="szp-stats-grid">'+
        statTile(stats.played,"Rozegrane")+
        statTile(stats.wins,"Wygrane")+
        statTile(stats.winPct,"Skuteczność")+
        statTile(stats.points,"Punkty")+
        statTile(stats.avgTries ? stats.avgTries.toFixed(1) : "—","Śr. prób")+
        statTile(stats.bestScore || "—","Najlepszy wynik")+
        statTile(stats.currentStreak,"Aktualna seria")+
        statTile(stats.bestStreak,"Najlepsza seria")+
      '</div>'+
      renderDist(stats.dist,stats.played)+
      '<p class="szp-stats-note">To są statystyki gry '+esc(label)+' z konta gracza — działają na komputerze, telefonie i po zalogowaniu przez Google.</p>';
    modal.show();
  }

  function localRajaStats(){
    try{
      var raw = localStorage.getItem("zorta_daily_stats_v1");
      if(!raw)return null;
      var s = JSON.parse(raw);
      if(!s || !s.days)return null;
      var rows = Object.keys(s.days).map(function(k){
        var d = s.days[k] || {};
        return {game:"zorta",mode:"daily",puzzle_no:Number(k)+1,won:d.won === true,tries:d.tries || d.attempts || 0,score:d.score || 0};
      });
      return compute(rows);
    }catch(e){return null;}
  }
  function localGenericStats(key){
    if(key === "zorta" || key === "raja")return localRajaStats();
    return null;
  }
  function renderLocal(modal,key){
    var stats = localGenericStats(key);
    if(stats && stats.played){
      modal.body.innerHTML =
        '<span class="szp-stats-source local">statystyki lokalne</span>'+
        '<div class="szp-stats-grid">'+
          statTile(stats.played,"Rozegrane")+
          statTile(stats.wins,"Wygrane")+
          statTile(stats.winPct,"Skuteczność")+
          statTile(stats.avgTries ? stats.avgTries.toFixed(1) : "—","Śr. prób")+
        '</div>'+
        '<p class="szp-stats-note">Nie jesteś zalogowany. To tylko lokalne statystyki tej przeglądarki. Zaloguj się, żeby mieć statystyki konta na każdym urządzeniu.</p>';
    }else{
      modal.body.innerHTML =
        '<span class="szp-stats-source local">brak konta</span>'+
        '<p class="szp-stats-note">Zaloguj się, żeby statystyki, punkty i historia gry zapisywały się na koncie, a nie tylko w tej przeglądarce.</p>';
    }
    modal.show();
  }

  async function fetchAccountRows(key){
    var c = await getClient();
    var s = await getSession();
    if(!c || !s || !s.user)return null;

    async function query(withFinished){
      var sel = withFinished
        ? "game,mode,puzzle_no,won,tries,score,created_at,finished_at"
        : "game,mode,puzzle_no,won,tries,score,created_at";
      var q = c.from("user_game_results")
        .select(sel)
        .eq("user_id",s.user.id);
      var keys = gameKeys(key);
      if(keys.length > 1)q = q.in("game",keys);
      else q = q.eq("game",keys[0]);
      q = q.order("puzzle_no",{ascending:true});
      var res = await q;
      if(res && res.error && withFinished)return query(false);
      if(res && res.error)return [];
      return res && Array.isArray(res.data) ? res.data : [];
    }

    return query(true);
  }

  async function showStats(){
    var key = gameKey();
    var modal = ensureModal();
    renderLoading(modal);
    try{
      var rows = await fetchAccountRows(key);
      if(rows && rows.length){
        renderAccount(modal,compute(rows),key);
      }else{
        renderLocal(modal,key);
      }
    }catch(e){
      console.warn("Szpilplac account stats error:",e);
      renderLocal(modal,key);
    }
  }

  function isStatsButton(el){
    if(!el || !el.matches)return false;
    if(el.matches("#statBtn,#statsBtn,#statsOpen,[data-stats],.stats-btn,.stat-btn"))return true;
    var text = (el.textContent || "").toLowerCase();
    var title = (el.getAttribute("title") || "").toLowerCase();
    var aria = (el.getAttribute("aria-label") || "").toLowerCase();
    return text.indexOf("statyst") !== -1 || title.indexOf("statyst") !== -1 || aria.indexOf("statyst") !== -1;
  }

  function hookButtons(){
    document.addEventListener("click",function(e){
      var el = e.target && e.target.closest ? e.target.closest("button,a,[role='button']") : null;
      if(!isStatsButton(el))return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      showStats();
    },true);
  }

  function patchKnownRenderers(){
    // Raja i ewentualne inne gry mają globalne renderStatsModal().
    // Nadpisujemy tylko warstwę statystyk, nie logikę gry.
    try{
      if(typeof window.renderStatsModal === "function" && !window.renderStatsModal.__szpV124){
        var wrapper = function(){ showStats(); };
        wrapper.__szpV124 = true;
        window.renderStatsModal = wrapper;
      }
    }catch(e){}
  }

  function boot(){
    injectStyle();
    hookButtons();
    patchKnownRenderers();
    setTimeout(patchKnownRenderers,500);
    setTimeout(patchKnownRenderers,1500);
    console.info("Szpilplac game-stats-common.js "+VERSION);
  }

  window.SZP_GAME_STATS = {version:VERSION,show:showStats,refresh:showStats};

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
