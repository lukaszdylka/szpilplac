/* Szpilplac game-save.js v110 */
(function(){
  "use strict";
  var VERSION="v110";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var client=null;
  function nested(){return /\/raja\/?/.test(location.pathname);} 
  function root(path){return (nested()?"../":"")+path;}
  function loadScript(src,testFn){
    if(typeof testFn==="function"&&testFn())return Promise.resolve();
    return new Promise(function(resolve,reject){
      var clean=src.split("?")[0];
      var existing=Array.prototype.slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(clean)!==-1;});
      if(existing){existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true}); if(typeof testFn!=="function"||testFn())resolve(); return;}
      var sc=document.createElement("script"); sc.src=src; sc.async=false; sc.onload=resolve; sc.onerror=reject; document.head.appendChild(sc);
    });
  }
  async function getClient(){
    if(client)return client;
    if(window.SZPILPLAC_AUTH&&typeof window.SZPILPLAC_AUTH.getClient==="function"){
      try{var c=window.SZPILPLAC_AUTH.getClient(); if(c){client=c; return c;}}catch(e){}
    }
    await loadScript(root("config.js?v=13"),function(){return !!window.SZPILPLAC_CONFIG;}).catch(function(){});
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var url=window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL);
    var key=window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY);
    if(!url||!key||!window.supabase)return null;
    client=window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    return client;
  }
  function storedSession(){try{var raw=localStorage.getItem(AUTH_STORAGE_KEY);if(!raw)return null;var data=JSON.parse(raw);return data.currentSession||data.session||data;}catch(e){return null;}}
  async function getSession(){
    var c=await getClient(); if(!c)return null;
    try{var r=await c.auth.getSession(); if(r&&r.data&&r.data.session)return r.data.session;}catch(e){}
    var s=storedSession();
    if(s&&s.access_token&&s.refresh_token){try{var set=await c.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token}); if(set&&set.data&&set.data.session)return set.data.session;}catch(e){} return s;}
    return null;
  }

  async function ensureAchievementToast(){
    if(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function")return true;
    await loadScript(root("achievement-toast.js?v=110"),function(){
      return !!(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function");
    }).catch(function(){});
    return !!(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function");
  }
  function achievementMeta(payload, original){
    original = original || {};
    payload = payload || {};
    return {
      game: payload.game,
      mode: payload.mode || "daily",
      puzzle_no: payload.puzzleNo,
      won: !!payload.won,
      attempts: payload.tries,
      tries: payload.tries,
      errors: payload.errors,
      score: payload.score,
      hints_used: Number(original.hintsUsed != null ? original.hintsUsed : (original.hints_used != null ? original.hints_used : 0)) || 0,
      source: "game-save-v110",
      path: location.pathname
    };
  }
  async function checkAchievementsAfterSave(payload, original){
    try{
      var c = await getClient();
      var session = await getSession();
      if(!c || !session || !session.user)return [];
      var meta = achievementMeta(payload, original);
      var res = await c.rpc("szpilplac_check_achievement_event",{
        p_event:"game_finished",
        p_source_game:payload.game,
        p_won:!!payload.won,
        p_attempts:payload.tries == null ? null : Number(payload.tries),
        p_hints_used:meta.hints_used,
        p_score:payload.score == null ? null : Number(payload.score),
        p_meta:meta
      });
      if(res.error)return [];
      var rows = Array.isArray(res.data) ? res.data : [];
      var fresh = rows.filter(function(r){return r && r.is_new;});
      if(fresh.length){
        await ensureAchievementToast();
        if(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function"){
          window.SZP_ACHIEVEMENT_TOAST.showMany(fresh);
        }
        if(window.SZPILPLAC_REFRESH_ACHIEVEMENTS){
          try{window.SZPILPLAC_REFRESH_ACHIEVEMENTS();}catch(e){}
        }
      }
      return fresh;
    }catch(e){
      console.warn("Szpilplac achievement check error:",e);
      return [];
    }
  }

  function normalizePayload(data){
    data=data||{};
    return {game:data.game,mode:data.mode||"daily",puzzleNo:data.puzzleNo!=null?data.puzzleNo:data.puzzle_no,won:!!data.won,tries:data.tries,errors:data.errors,score:data.score,isCurrent:data.isCurrent!==false};
  }
  async function saveResult(data,opts){
    opts=opts||{}; var p=normalizePayload(data);
    if(!p.game||p.puzzleNo==null)return {saved:false,reason:"bad_payload",type:"err",message:opts.errorMessage||"Niepełne dane wyniku."};
    if(p.isCurrent===false)return {saved:false,reason:"not_current",type:"err",message:opts.skipMessage||"Do rankingu zapisuje się tylko bieżąca zagadka."};
    var session=await getSession();
    if(!session||!session.user)return {saved:false,reason:"not_logged_in",type:"",message:opts.noAccountMessage||"Grasz bez konta — wynik został zapisany lokalnie."};
    var c=await getClient(); if(!c)return {saved:false,reason:"no_client",type:"err",message:opts.errorMessage||"Nie udało się połączyć z kontem."};
    var res=await c.rpc("save_user_game_result",{p_game:p.game,p_mode:p.mode,p_puzzle_no:p.puzzleNo,p_won:p.won,p_tries:p.tries,p_errors:p.errors,p_score:p.score});
    if(res.error)return {saved:false,reason:"supabase",type:"err",message:res.error.message||opts.errorMessage||"Nie udało się zapisać wyniku.",error:res.error};
    if(window.SZP_GAME_PLAYED&&window.SZP_GAME_PLAYED.markAccountPlayed)window.SZP_GAME_PLAYED.markAccountPlayed(p.game,p.mode,p.puzzleNo);
    var freshAchievements = await checkAchievementsAfterSave(p,data);
    return {saved:true,reason:"saved",type:"ok",message:opts.savedMessage||("Wynik zapisany na koncie. +"+(p.score||0)+" pkt"),score:p.score,achievements:freshAchievements};
  }
  window.SZP_GAME_SAVE={version:VERSION,getClient:getClient,getSession:getSession,saveResult:saveResult};
  if(!window.SZPILPLAC_AUTH)window.SZPILPLAC_AUTH={};
  if(typeof window.SZPILPLAC_AUTH.saveResult!=="function")window.SZPILPLAC_AUTH.saveResult=saveResult;
  if(typeof window.SZPILPLAC_AUTH.getClient!=="function")window.SZPILPLAC_AUTH.getClient=function(){return client;};
  if(typeof window.SZPILPLAC_AUTH.refresh!=="function")window.SZPILPLAC_AUTH.refresh=getSession;
  console.info("Szpilplac game-save.js "+VERSION);
})();
