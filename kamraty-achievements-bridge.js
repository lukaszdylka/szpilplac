/* Szpilplac kamraty-achievements-bridge.js v1 */
(function(){
  "use strict";
  var VERSION="v1";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var KAMRAT_IDS={
    piyrszykamrat:1,kamraty:1,nawidoku:1,dobreslowo:1,przajawom:1,swojnaplacu:1,hersztbandy:1
  };
  var client=null;
  function root(path){return path;}
  function cfg(){return {url:window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL)||"",key:window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY)||""};}
  function loadScript(src,testFn){
    if(typeof testFn==="function"&&testFn())return Promise.resolve();
    return new Promise(function(resolve){
      var clean=src.split("?")[0];
      var existing=Array.prototype.slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(clean)!==-1;});
      if(existing){resolve();return;}
      var sc=document.createElement("script");sc.src=src;sc.async=false;sc.onload=resolve;sc.onerror=resolve;document.head.appendChild(sc);
    });
  }
  function getClient(){
    if(client)return client;
    if(window.__SZPILPLAC_SUPABASE_CLIENT){client=window.__SZPILPLAC_SUPABASE_CLIENT;return client;}
    if(!window.supabase)return null;
    var c=cfg();
    if(!c.url||!c.key)return null;
    client=window.supabase.createClient(c.url,c.key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    window.__SZPILPLAC_SUPABASE_CLIENT=client;
    return client;
  }
  async function session(){
    var c=getClient(); if(!c)return null;
    try{var r=await c.auth.getSession();if(r&&r.data&&r.data.session)return r.data.session;}catch(e){}
    return null;
  }
  async function earnedMap(){
    var c=getClient(); var s=await session(); var out={};
    if(!c||!s)return out;
    try{
      var r=await c.rpc("szpilplac_my_achievements");
      (r.data||[]).forEach(function(a){
        var id=String(a.id||a.achievement_id||"");
        if(id&&a.earned_at)out[id]=a;
      });
    }catch(e){}
    return out;
  }
  async function ensureToast(){
    if(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany)return true;
    await loadScript(root("achievement-toast.js?v=125"),function(){return !!(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany);});
    return !!(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany);
  }
  async function checkAndToast(before){
    var c=getClient(); var s=await session();
    if(!c||!s)return;
    try{await c.rpc("szp_check_my_kamrat_achievements");}catch(e){}
    var after=await earnedMap();
    var fresh=[];
    Object.keys(after).forEach(function(id){
      if(KAMRAT_IDS[id]&&!before[id]&&after[id]){
        fresh.push({
          achievement_id:id,
          id:id,
          label:after[id].label,
          description:after[id].description,
          svg:after[id].svg,
          earned_at:after[id].earned_at,
          is_new:true
        });
      }
    });
    if(fresh.length){
      await ensureToast();
      if(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany)window.SZP_ACHIEVEMENT_TOAST.showMany(fresh);
      if(window.SZPILPLAC_REFRESH_ACHIEVEMENTS)try{window.SZPILPLAC_REFRESH_ACHIEVEMENTS();}catch(e){}
    }
  }
  document.addEventListener("click",async function(e){
    var b=e.target&&e.target.closest&&e.target.closest("[data-rank-follow],[data-rank-unfollow],[data-kamrat-remove],[data-kamrat-react],#publicProfileToggle");
    if(!b)return;
    var before=await earnedMap();
    setTimeout(function(){checkAndToast(before);},1200);
    setTimeout(function(){checkAndToast(before);},2800);
  },true);
  function boot(){
    setTimeout(async function(){
      var before=await earnedMap();
      checkAndToast(before);
    },1800);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  console.info("Szpilplac kamraty-achievements-bridge.js "+VERSION);
})();
