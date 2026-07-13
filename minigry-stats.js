/* Szpilplac minigry-stats.js v1
   Lekki tracker dla gier zapisanych jako osobne pliki HTML.
   Użycie: <script src="minigry-stats.js" data-game="pong"></script>
*/
(function(){
  "use strict";

  var script=document.currentScript;
  var slug=String(script&&script.dataset&&script.dataset.game||"").toLowerCase();
  var startedAt=Date.now();
  var startSent=false;
  var lastFinishAt=0;
  var readyPromise=null;
  var VISITOR_KEY="szpilplac_minigry_visitor_v1";

  function visitorId(){
    try{
      var id=localStorage.getItem(VISITOR_KEY);
      if(id)return id;
      id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():("v-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));
      localStorage.setItem(VISITOR_KEY,id);
      return id;
    }catch(e){
      return "v-"+Math.random().toString(36).slice(2);
    }
  }

  function loadConfig(){
    if(window.SZPILPLAC_CONFIG)return Promise.resolve(window.SZPILPLAC_CONFIG);
    if(readyPromise)return readyPromise;
    readyPromise=new Promise(function(resolve,reject){
      var s=document.createElement("script");
      s.src="config.js?v=13";
      s.onload=function(){window.SZPILPLAC_CONFIG?resolve(window.SZPILPLAC_CONFIG):reject(new Error("Brak konfiguracji"));};
      s.onerror=function(){reject(new Error("Nie udało się załadować config.js"));};
      document.head.appendChild(s);
    });
    return readyPromise;
  }

  function track(type,data){
    data=data||{};
    return loadConfig().then(function(cfg){
      if(!cfg||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
      return fetch(cfg.SUPABASE_URL+"/rest/v1/rpc/szpilplac_minigry_track",{
        method:"POST",
        keepalive:true,
        headers:{
          "Content-Type":"application/json",
          "apikey":cfg.SUPABASE_ANON_KEY,
          "Authorization":"Bearer "+cfg.SUPABASE_ANON_KEY
        },
        body:JSON.stringify({
          p_slug:slug,
          p_event_type:type,
          p_visitor_id:visitorId(),
          p_won:data.won===true?true:(data.won===false?false:null),
          p_score:Number.isFinite(Number(data.score))?Number(data.score):null,
          p_duration_ms:Number.isFinite(Number(data.duration_ms))?Math.max(0,Math.round(Number(data.duration_ms))):null,
          p_meta:data.meta&&typeof data.meta==="object"?data.meta:{}
        })
      }).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);});
    }).catch(function(e){console.warn("Statystyki gierki:",e&&e.message||e);});
  }

  function start(){
    if(startSent)return;
    startSent=true;
    startedAt=Date.now();
    track("start");
  }

  function finish(data){
    var now=Date.now();
    if(now-lastFinishAt<800)return;
    lastFinishAt=now;
    data=data||{};
    if(data.duration_ms==null)data.duration_ms=Math.max(0,now-startedAt);
    track("finish",data);
  }

  function reset(){
    startSent=false;
    startedAt=Date.now();
    start();
  }

  window.SZPILPLAC_MINIGRA_STATS={track:track,start:start,finish:finish,reset:reset,slug:slug};

  if(!slug)return;
  track("open");
  document.addEventListener("pointerdown",start,{once:true,capture:true});
  document.addEventListener("keydown",start,{once:true,capture:true});
})();
