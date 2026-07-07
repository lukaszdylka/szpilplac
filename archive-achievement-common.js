"use strict";
/*
  Szpilplac v124 — wspólna odznaka Nazod
  - wejście w starszą zagadkę z archiwum w dowolnej grze
  - działa bez zmiany mechaniki gier
*/
(function(){
  var VERSION = "v124";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var client = null;
  var attempts = {};

  function inRaja(){return /\/raja\/?/.test(location.pathname);}
  function root(path){return (inRaja() ? "../" : "") + path;}
  function qsa(sel){return Array.prototype.slice.call(document.querySelectorAll(sel));}
  function n(v){
    var x = Number(v);
    return Number.isFinite(x) ? x : null;
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
  function gameKey(){
    var p = location.pathname.toLowerCase();
    if(p.indexOf("klodka") !== -1)return "klodka";
    if(p.indexOf("raja") !== -1)return "zorta";
    if(p.indexOf("cuzamen") !== -1)return "cuzamen";
    return "slowko";
  }
  function currentMode(){
    try{
      if(window.view)return String(window.view);
      if(window.game && window.game.mode)return String(window.game.mode);
    }catch(e){}
    return "daily";
  }
  function currentPuzzle(){
    try{ if(typeof window.currentIdx === "function")return n(window.currentIdx()); }catch(e){}
    try{ if(typeof window.currentDay === "number")return n(window.currentDay); }catch(e){}
    try{ if(typeof window.PNO !== "undefined")return n(Number(window.PNO) - 1); }catch(e){}
    try{ if(window.SET && typeof window.SET.no !== "undefined")return n(Number(window.SET.no) - 1); }catch(e){}
    try{ if(typeof window.DAY_NO !== "undefined")return n(window.DAY_NO); }catch(e){}
    return null;
  }
  function todayPuzzle(){
    try{ if(typeof window.TODAY_IDX === "number")return n(window.TODAY_IDX); }catch(e){}
    try{ if(typeof window.TODAY_NO !== "undefined")return n(window.TODAY_NO); }catch(e){}
    try{ if(typeof window.todayIndex === "function")return n(window.todayIndex()); }catch(e){}
    try{ if(window.SET && typeof window.SET.today !== "undefined")return n(Number(window.SET.today) - 1); }catch(e){}
    try{ if(window.SET && typeof window.SET.today_no !== "undefined")return n(Number(window.SET.today_no) - 1); }catch(e){}
    return null;
  }
  function archiveInfo(){
    var day = currentPuzzle();
    var today = todayPuzzle();

    if(day === null || today === null)return null;

    // Kłōdka mogła przekazywać puzzle_no 1-based w części zmiennych,
    // więc jeżeli wygląda to na 1-based przy PNO/SET.no, zostawiamy porównanie tylko po realnym "mniej niż dziś".
    if(!(day < today))return null;

    return {
      game:gameKey(),
      mode:currentMode(),
      day_index:day,
      today_index:today,
      puzzle_no:day + 1
    };
  }
  async function ensureAchievementToast(){
    if(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function")return true;
    await loadScript(root("achievement-toast.js?v=124"),function(){
      return !!(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function");
    }).catch(function(){});
    return !!(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function");
  }
  async function showFresh(rows){
    rows = Array.isArray(rows) ? rows : [];
    var fresh = rows.filter(function(r){return r && r.is_new;});
    if(!fresh.length)return;
    await ensureAchievementToast();
    if(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function"){
      window.SZP_ACHIEVEMENT_TOAST.showMany(fresh);
    }
    if(window.SZPILPLAC_REFRESH_ACHIEVEMENTS){
      try{window.SZPILPLAC_REFRESH_ACHIEVEMENTS();}catch(e){}
    }
  }
  async function awardIfArchive(){
    var info = archiveInfo();
    if(!info)return;

    var key = [info.game,info.mode,info.day_index,info.today_index].join(":");
    if(attempts[key])return;
    attempts[key] = true;

    try{
      var s = await getSession();
      if(!s || !s.user)return;
      var c = await getClient();
      if(!c)return;

      var meta = {
        source:"archive-common-v124",
        path:location.pathname,
        mode:info.mode,
        puzzle_no:info.puzzle_no,
        day_index:info.day_index,
        today_index:info.today_index
      };

      var res = await c.rpc("szpilplac_award_archive_achievement",{
        p_source_game:info.game,
        p_day_index:info.day_index,
        p_today_index:info.today_index,
        p_meta:meta
      });

      if(res && res.error){
        // Fallback dla baz, gdzie Nazod jest obsłużony w głównej funkcji eventów.
        var fallback = await c.rpc("szpilplac_check_achievement_event",{
          p_event:"archive_open",
          p_source_game:info.game,
          p_won:null,
          p_attempts:null,
          p_hints_used:null,
          p_score:null,
          p_meta:meta
        }).catch(function(){return {data:[],error:null};});
        await showFresh(fallback && fallback.data);
        return;
      }

      await showFresh(res && res.data);
    }catch(e){
      console.warn("Szpilplac archive achievement error:",e);
    }
  }

  function boot(){
    setTimeout(awardIfArchive,350);
    setTimeout(awardIfArchive,1000);
    setTimeout(awardIfArchive,2200);
    setInterval(awardIfArchive,1200);
    document.addEventListener("click",function(){
      setTimeout(awardIfArchive,120);
      setTimeout(awardIfArchive,650);
    },true);
    console.info("Szpilplac archive-achievement-common.js "+VERSION);
  }

  window.SZP_ARCHIVE_ACHIEVEMENT = {version:VERSION,check:awardIfArchive};

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
