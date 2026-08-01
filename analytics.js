/* Szpilplac first-party analytics */
(function(){
  "use strict";
  var VERSION=window.SZP_BUILD_ID||"2026.08.01.6";
  var VISITOR_KEY="szpilplac_visitor_id_v1";
  var PAGE_PREFIX="szpilplac_page_view_v1:";
  var QUEUE_KEY="szpilplac_analytics_queue_v1";
  var configPromise=null;
  var nativeFetch=window.fetch.bind(window);
  var flushing=false;

  function isAdminPath(){
    return /(?:^|\/)(?:admin|stats|podpowiedzi|game-results-admin|mailing-admin|avatar-admin|odznaki-admin|auth-diagnostyka)(?:[_./-]|$)/i.test(location.pathname||"");
  }

  function visitorId(){
    try{
      var id=localStorage.getItem(VISITOR_KEY);
      if(!id){
        id=(window.crypto&&crypto.randomUUID)
          ?crypto.randomUUID()
          :"v-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,12);
        localStorage.setItem(VISITOR_KEY,id);
      }
      return id;
    }catch(e){
      return "session-"+Math.random().toString(36).slice(2,12);
    }
  }

  function lang(){
    try{return String(localStorage.getItem("familock_lang")||document.documentElement.lang||"pl").slice(0,8);}
    catch(e){return "pl";}
  }

  function clean(value,max){
    return String(value||"").replace(/[\u0000-\u001f]/g,"").slice(0,max||180);
  }

  function loadConfig(){
    if(window.SZPILPLAC_CONFIG)return Promise.resolve(window.SZPILPLAC_CONFIG);
    if(configPromise)return configPromise;
    configPromise=new Promise(function(resolve){
      var old=document.querySelector('script[src*="config.js"]');
      if(old){
        if(window.SZPILPLAC_CONFIG)return resolve(window.SZPILPLAC_CONFIG);
        old.addEventListener("load",function(){resolve(window.SZPILPLAC_CONFIG||null);},{once:true});
        setTimeout(function(){resolve(window.SZPILPLAC_CONFIG||null);},1800);
        return;
      }
      var script=document.createElement("script");
      script.src="/config.js?v="+encodeURIComponent(VERSION);
      script.onload=function(){resolve(window.SZPILPLAC_CONFIG||null);};
      script.onerror=function(){resolve(null);};
      document.head.appendChild(script);
    });
    return configPromise;
  }

  function readQueue(){
    try{
      var rows=JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]");
      return Array.isArray(rows)?rows:[];
    }catch(e){return [];}
  }

  function writeQueue(rows){
    try{
      localStorage.setItem(QUEUE_KEY,JSON.stringify((rows||[]).slice(-40)));
    }catch(e){}
  }

  function queueEvent(eventType,value){
    var rows=readQueue();
    var event={
      type:clean(eventType,40),
      value:clean(value,240),
      lang:lang(),
      visitor:visitorId(),
      created:Date.now()
    };
    var duplicate=rows.some(function(row){
      return row.type===event.type&&row.value===event.value&&event.created-Number(row.created||0)<10000;
    });
    if(!duplicate){rows.push(event);writeQueue(rows);}
  }

  function postEvent(eventType,value,eventLang,eventVisitor){
    return loadConfig().then(function(cfg){
      if(!cfg||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){
        throw new Error("Brak konfiguracji Supabase");
      }
      return nativeFetch(cfg.SUPABASE_URL+"/rest/v1/rpc/szpilplac_analytics_track",{
        method:"POST",
        keepalive:true,
        cache:"no-store",
        headers:{
          apikey:cfg.SUPABASE_ANON_KEY,
          Authorization:"Bearer "+cfg.SUPABASE_ANON_KEY,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          p_event_type:clean(eventType,40),
          p_visitor_id:eventVisitor||visitorId(),
          p_value:clean(value,240),
          p_lang:eventLang||lang()
        })
      }).then(function(response){
        if(!response.ok){
          return response.text().then(function(text){
            throw new Error("RPC "+response.status+(text?": "+text.slice(0,180):""));
          });
        }
        try{document.dispatchEvent(new CustomEvent("szp:analytics-ok",{detail:{type:eventType,value:value}}));}catch(e){}
        return true;
      });
    });
  }

  function send(eventType,value){
    if(isAdminPath())return Promise.resolve(false);
    return postEvent(eventType,value).catch(function(error){
      console.warn("Analityka Szpilplacu",error&&error.message?error.message:error);
      queueEvent(eventType,value);
      try{document.dispatchEvent(new CustomEvent("szp:analytics-error",{detail:{message:String(error&&error.message||error)}}));}catch(e){}
      return false;
    });
  }

  function flushQueue(){
    if(flushing||!navigator.onLine)return Promise.resolve(false);
    var rows=readQueue();
    if(!rows.length)return Promise.resolve(true);
    flushing=true;
    var remaining=[];
    var chain=Promise.resolve();
    rows.forEach(function(row){
      chain=chain.then(function(){
        return postEvent(row.type,row.value,row.lang,row.visitor).catch(function(){remaining.push(row);});
      });
    });
    return chain.then(function(){
      writeQueue(remaining);
      flushing=false;
      return remaining.length===0;
    }).catch(function(){
      flushing=false;
      return false;
    });
  }

  function enrichGameEvent(row){
    if(!row||typeof row!=="object"||Array.isArray(row))return row;
    var copy=Object.assign({},row);
    if(!copy.visitor_id)copy.visitor_id=visitorId();
    if(!copy.event_type)copy.event_type="game_finish";
    return copy;
  }

  function installGameEventBridge(){
    if(window.__SZP_ANALYTICS_FETCH_PATCHED)return;
    window.__SZP_ANALYTICS_FETCH_PATCHED=true;
    window.fetch=function(input,init){
      try{
        var url=typeof input==="string"?input:(input&&input.url)||"";
        var method=String((init&&init.method)||(input&&input.method)||"GET").toUpperCase();
        if(method==="POST"&&url.indexOf("/rest/v1/szpilplac_events")!==-1&&init&&typeof init.body==="string"){
          var parsed=JSON.parse(init.body);
          parsed=Array.isArray(parsed)?parsed.map(enrichGameEvent):enrichGameEvent(parsed);
          init=Object.assign({},init,{body:JSON.stringify(parsed)});
        }
      }catch(e){}
      return nativeFetch(input,init);
    };
  }

  function pageKey(){
    return (location.pathname||"/")+(location.search||"");
  }

  function trackPage(){
    if(isAdminPath())return;
    var key=PAGE_PREFIX+pageKey();
    var now=Date.now();
    var last=0;
    try{last=Number(sessionStorage.getItem(key)||0);}catch(e){}
    if(now-last<10000)return;
    try{sessionStorage.setItem(key,String(now));}catch(e){}
    send("page_view",pageKey());
  }

  function sourceFor(link){
    var source=link.getAttribute("data-support-source")||"";
    if(source)return clean(source.replace(/^szpilplac-?/,""),60)||"link";
    if(link.id==="szpSupportCoffee"||link.classList.contains("szp-support-card"))return "card";
    if(link.classList.contains("coffee-btn"))return "header";
    if(link.closest&&link.closest(".player-menu"))return "menu";
    return "link";
  }

  function handleClick(event){
    var target=event.target&&event.target.closest
      ?event.target.closest('a[href*="buycoffee.to/wspolnotafamilocka"]')
      :null;
    if(!target)return;
    send("support_click",sourceFor(target));
  }

  function boot(){
    installGameEventBridge();
    document.addEventListener("click",handleClick,true);
    window.addEventListener("online",flushQueue);
    flushQueue().then(trackPage);
  }

  window.SZP_ANALYTICS={
    version:VERSION,
    track:function(type,value){return send(type,value);},
    flush:flushQueue,
    visitorId:visitorId,
    queued:function(){return readQueue().length;}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  console.info("Szpilplac analytics.js "+VERSION);
})();
