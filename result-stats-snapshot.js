/* Szpilplac result-stats-snapshot.js v1
   Krotkie statystyki widoczne od razu po zakonczeniu gry.
   Dziala dla: Slowko, Klodka, Raja. Nie zmienia logiki gier.
*/
(function(){
  "use strict";

  var VERSION = "v1";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var client = null;
  var pending = false;

  function inRaja(){return /\/raja\/?/.test(location.pathname);}
  function root(path){return (inRaja() ? "../" : "") + path;}
  function qsa(sel,rootNode){return Array.prototype.slice.call((rootNode||document).querySelectorAll(sel));}
  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function n(v){var x = Number(v); return Number.isFinite(x) ? x : null;}
  function gameKey(){
    var p = location.pathname.toLowerCase();
    if(p.indexOf("klodka") !== -1)return "klodka";
    if(p.indexOf("raja") !== -1)return "zorta";
    if(p.indexOf("cuzamen") !== -1)return "cuzamen";
    return "slowko";
  }
  function gameKeys(key){
    key = key || gameKey();
    return (key === "zorta" || key === "raja") ? ["zorta","raja"] : [key];
  }
  function gameLabel(key){
    key = key || gameKey();
    if(key === "klodka")return "Kłōdka";
    if(key === "zorta" || key === "raja")return "Raja";
    if(key === "cuzamen")return "Cuzamen";
    return "Słōwko";
  }
  function loadScript(src,testFn){
    if(typeof testFn === "function" && testFn())return Promise.resolve();
    return new Promise(function(resolve){
      var clean = src.split("?")[0];
      var existing = qsa("script").find(function(s){return s.src && s.src.indexOf(clean) !== -1;});
      if(existing){resolve();return;}
      var sc = document.createElement("script");
      sc.src = src;
      sc.async = false;
      sc.onload = resolve;
      sc.onerror = resolve;
      document.head.appendChild(sc);
    });
  }
  async function getClient(){
    if(client)return client;
    if(window.SZP_GAME_SAVE && typeof window.SZP_GAME_SAVE.getClient === "function"){
      try{var c = await window.SZP_GAME_SAVE.getClient(); if(c){client = c; return c;}}catch(e){}
    }
    if(window.SZPILPLAC_AUTH && typeof window.SZPILPLAC_AUTH.getClient === "function"){
      try{var c2 = window.SZPILPLAC_AUTH.getClient(); if(c2){client = c2; return c2;}}catch(e){}
    }
    await loadScript(root("config.js?v=13"),function(){return !!window.SZPILPLAC_CONFIG;});
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var url = window.SUPABASE_URL || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL);
    var key = window.SUPABASE_ANON_KEY || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY);
    if(!url || !key || !window.supabase)return null;
    client = window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    return client;
  }
  async function getSession(){
    var c = await getClient();
    if(!c)return null;
    try{
      var r = await c.auth.getSession();
      if(r && r.data && r.data.session)return r.data.session;
    }catch(e){}
    try{
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      var data = JSON.parse(raw);
      var s = data.currentSession || data.session || data;
      if(s && s.access_token && s.refresh_token){
        try{
          var set = await c.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
          if(set && set.data && set.data.session)return set.data.session;
        }catch(e){}
        return s;
      }
    }catch(e){}
    return null;
  }
  function injectStyle(){
    if(document.getElementById("szpResultStatsSnapshotStyle"))return;
    var st = document.createElement("style");
    st.id = "szpResultStatsSnapshotStyle";
    st.textContent =
      ".szp-result-stats{margin:13px 0 12px;padding:12px;border:1px solid var(--line,#c9bfa6);border-radius:15px;background:var(--surface2,#f3ecda)}"+
      ".szp-result-stats-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;color:var(--ink2,#6a6150);font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}"+
      ".szp-result-stats-source{padding:3px 7px;border:1px solid rgba(191,138,58,.5);border-radius:999px;color:var(--gold,#bf8a3a);background:rgba(191,138,58,.08)}"+
      ".szp-result-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}"+
      ".szp-result-stat{padding:9px 7px;border:1px solid var(--line,#c9bfa6);border-radius:12px;background:var(--surface,#fbf7ee);text-align:center}"+
      ".szp-result-stat b{display:block;font-family:Oswald,system-ui,sans-serif;font-size:22px;line-height:1;color:var(--green,#2f4a39)}"+
      "[data-theme=dark] .szp-result-stat b{color:var(--gold,#bf8a3a)}"+
      ".szp-result-stat span{display:block;margin-top:4px;color:var(--ink2,#6a6150);font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}"+
      ".szp-result-full-stats{width:100%;margin-top:10px;min-height:38px;padding:9px 12px;border:1.5px solid var(--green,#2f4a39);border-radius:12px;background:transparent;color:var(--green,#2f4a39);font-family:Oswald,system-ui,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:13px}"+
      "[data-theme=dark] .szp-result-full-stats{border-color:var(--gold,#bf8a3a);color:var(--gold,#bf8a3a)}"+
      "@media(max-width:430px){.szp-result-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}";
    document.head.appendChild(st);
  }
  function normalizeRows(rows){
    var map = {};
    (rows || []).forEach(function(r){
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
    var triesList = rows.map(function(r){return n(r.tries);}).filter(function(x){return x !== null && x > 0;});
    var avg = triesList.length ? (triesList.reduce(function(a,b){return a+b;},0) / triesList.length).toFixed(1) : "—";
    return {played:played,wins:wins,avg:avg};
  }
  async function fetchRows(){
    var c = await getClient();
    var s = await getSession();
    if(!c || !s || !s.user)return null;
    var keys = gameKeys(gameKey());
    async function query(withFinished){
      var sel = withFinished ? "game,mode,puzzle_no,won,tries,score,created_at,finished_at" : "game,mode,puzzle_no,won,tries,score,created_at";
      var q = c.from("user_game_results").select(sel).eq("user_id",s.user.id);
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
  function currentResult(){
    var key = gameKey();
    var won = null, tries = null, max = null;
    if(key === "zorta"){
      var r = window.__SZP_LAST_RAJA_RESULT || {};
      if(typeof r.won !== "undefined")won = !!r.won;
      tries = n(r.tries);
      max = n(window.MAX_TRIES) || 4;
    }else{
      var g = window.game || {};
      if(g.status === "won")won = true;
      if(g.status === "lost")won = false;
      if(Array.isArray(g.guesses))tries = g.guesses.length;
      max = n(window.MAX_TRIES) || n(window.MAX_GUESSES) || n(window.MAX_GUESSES_TEST) || 6;
    }
    return {won:won,tries:tries,max:max,label: won === false ? "X/"+(max || "—") : ((tries || "—")+"/"+(max || "—"))};
  }
  function findHosts(){
    var out = [];
    var modal = document.getElementById("modal");
    var result = document.getElementById("result");
    if(modal)out.push(modal);
    if(result)out.push(result);
    qsa(".modal,.result").forEach(function(x){if(out.indexOf(x) === -1)out.push(x);});
    return out.filter(function(el){
      if(!el || el.nodeType !== 1)return false;
      if(el.querySelector(".szp-result-stats"))return false;
      var visible = true;
      if(el.id === "result")visible = el.classList.contains("show") || getComputedStyle(el).display !== "none";
      if(!visible)return false;
      var txt = (el.textContent || "").toLowerCase();
      return !!(el.querySelector("#shareBtn,.share,[data-share],.share-btn") || txt.indexOf("poukładane") !== -1 || txt.indexOf("otwarte") !== -1 || txt.indexOf("znaczenie") !== -1);
    });
  }
  function buttonFullStats(){return '<button type="button" class="szp-result-full-stats" data-result-full-stats>Pełne statystyki</button>';}
  function tile(v,l){return '<div class="szp-result-stat"><b>'+esc(v)+'</b><span>'+esc(l)+'</span></div>';}
  function renderBox(host,stats,source){
    var res = currentResult();
    var html =
      '<div class="szp-result-stats" data-szp-result-stats="1">'+
        '<div class="szp-result-stats-head"><span>'+esc(gameLabel())+'</span><span class="szp-result-stats-source">'+esc(source)+'</span></div>'+
        '<div class="szp-result-stats-grid">'+
          tile(stats.played || 0,"Zagrane")+
          tile(res.label,"Ta gra")+
          tile(stats.wins || 0,"Wygrane")+
          tile(stats.avg || "—","Śr. prób")+
        '</div>'+buttonFullStats()+'</div>';
    var share = host.querySelector("#shareBtn,.share,[data-share],.share-btn");
    if(share && share.parentNode === host)share.insertAdjacentHTML("beforebegin",html);
    else host.insertAdjacentHTML("beforeend",html);
  }
  async function enhanceHost(host){
    if(!host || host.querySelector(".szp-result-stats"))return;
    injectStyle();
    var stats = null, source = "konto";
    try{var rows = await fetchRows(); if(rows && rows.length)stats = compute(rows);}catch(e){}
    if(!stats){
      var res = currentResult();
      stats = {played:1,wins:res.won === true ? 1 : 0,avg:res.tries || "—"};
      source = "lokalnie";
    }
    if(host.querySelector(".szp-result-stats"))return;
    renderBox(host,stats,source);
  }
  function scan(){
    if(pending)return;
    pending = true;
    setTimeout(function(){pending = false; findHosts().forEach(function(host){enhanceHost(host);});},80);
  }
  function openFullStats(){
    if(window.SZP_GAME_STATS && typeof window.SZP_GAME_STATS.show === "function"){window.SZP_GAME_STATS.show();return;}
    var btn = document.getElementById("statBtn") || document.getElementById("statsBtn");
    if(btn)btn.click();
  }
  function boot(){
    injectStyle(); scan();
    document.addEventListener("click",function(e){
      var btn = e.target && e.target.closest ? e.target.closest("[data-result-full-stats]") : null;
      if(!btn)return;
      e.preventDefault();
      openFullStats();
    },true);
    new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
    setInterval(scan,1200);
    console.info("Szpilplac result-stats-snapshot.js "+VERSION);
  }
  window.SZP_RESULT_STATS_SNAPSHOT = {version:VERSION,scan:scan};
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot); else boot();
})();
