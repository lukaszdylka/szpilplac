/* Szpilplac site events */
(function(){
  "use strict";

  if(window.__SZP_SITE_EVENTS_ACTIVE)return;
  window.__SZP_SITE_EVENTS_ACTIVE=true;

  var VERSION=window.SZP_BUILD_ID||"2026.08.02.1";
  var VISITOR_KEY="szpilplac_visitor_id_v1";
  var PAGE_PREFIX="szpilplac_page_view_v1:";
  var QUEUE_KEY="szpilplac_site_events_queue_v1";
  var OLD_QUEUE_KEY="szpilplac_analytics_queue_v1";
  var STATUS_KEY="szpilplac_site_events_status_v1";
  var configPromise=null;
  var nativeFetch=window.fetch.bind(window);
  var flushing=false;

  function isAdminPath(){
    return /(?:^|\/)(?:admin|stats|podpowiedzi|game-results-admin|mailing-admin|avatar-admin|odznaki-admin|auth-diagnostyka)(?:[_./-]|$)/i.test(location.pathname||"");
  }

  function clean(value,max){
    return String(value||"").replace(/[\u0000-\u001f]/g,"").slice(0,max||180);
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
    }catch(error){
      return "session-"+Math.random().toString(36).slice(2,12);
    }
  }

  function lang(){
    try{return clean(localStorage.getItem("familock_lang")||document.documentElement.lang||"pl",8)||"pl";}
    catch(error){return "pl";}
  }

  function loadConfig(){
    if(window.SZPILPLAC_CONFIG)return Promise.resolve(window.SZPILPLAC_CONFIG);
    if(configPromise)return configPromise;

    configPromise=new Promise(function(resolve){
      var existing=document.querySelector('script[src*="config.js"]');
      if(existing){
        if(window.SZPILPLAC_CONFIG){resolve(window.SZPILPLAC_CONFIG);return;}
        existing.addEventListener("load",function(){resolve(window.SZPILPLAC_CONFIG||null);},{once:true});
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

  function parseRows(value){
    try{
      var rows=JSON.parse(value||"[]");
      return Array.isArray(rows)?rows:[];
    }catch(error){return [];}
  }

  function readQueue(){
    try{
      var rows=parseRows(localStorage.getItem(QUEUE_KEY));
      var oldRows=parseRows(localStorage.getItem(OLD_QUEUE_KEY));
      if(oldRows.length){
        rows=rows.concat(oldRows).slice(-40);
        localStorage.removeItem(OLD_QUEUE_KEY);
        localStorage.setItem(QUEUE_KEY,JSON.stringify(rows));
      }
      return rows;
    }catch(error){return [];}
  }

  function writeQueue(rows){
    try{localStorage.setItem(QUEUE_KEY,JSON.stringify((rows||[]).slice(-40)));}
    catch(error){}
  }

  function readStatus(){
    try{return JSON.parse(localStorage.getItem(STATUS_KEY)||"null");}
    catch(error){return null;}
  }

  function saveStatus(state,detail){
    var status={
      state:state,
      at:new Date().toISOString(),
      detail:clean(detail,300),
      queued:readQueue().length,
      version:VERSION
    };
    try{localStorage.setItem(STATUS_KEY,JSON.stringify(status));}catch(error){}
    try{document.dispatchEvent(new CustomEvent("szp:site-events-status",{detail:status}));}catch(error){}
    return status;
  }

  function queueEvent(eventType,value,eventLang,eventVisitor){
    var rows=readQueue();
    var row={
      type:clean(eventType,40),
      value:clean(value,240),
      lang:clean(eventLang||lang(),8)||"pl",
      visitor:clean(eventVisitor||visitorId(),100),
      created:Date.now()
    };
    var duplicate=rows.some(function(existing){
      return existing.type===row.type&&existing.value===row.value&&row.created-Number(existing.created||0)<10000;
    });
    if(!duplicate)rows.push(row);
    writeQueue(rows);
    saveStatus("queued",row.type+" "+row.value);
  }

  function parseRpcResponse(response){
    return response.text().then(function(text){
      if(!response.ok){
        throw new Error("RPC "+response.status+(text?": "+text.slice(0,220):""));
      }

      var result=null;
      if(text){
        try{result=JSON.parse(text);}catch(error){result=text.trim();}
      }
      if(result!==true){
        throw new Error("RPC nie potwierdziło zapisu: "+String(result));
      }
      return true;
    });
  }

  function postEvent(eventType,value,eventLang,eventVisitor){
    return loadConfig().then(function(config){
      if(!config||!config.SUPABASE_URL||!config.SUPABASE_ANON_KEY){
        throw new Error("Brak konfiguracji Supabase");
      }

      return nativeFetch(config.SUPABASE_URL+"/rest/v1/rpc/szpilplac_analytics_track",{
        method:"POST",
        keepalive:true,
        cache:"no-store",
        headers:{
          apikey:config.SUPABASE_ANON_KEY,
          Authorization:"Bearer "+config.SUPABASE_ANON_KEY,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          p_event_type:clean(eventType,40),
          p_visitor_id:clean(eventVisitor||visitorId(),100),
          p_value:clean(value,240),
          p_lang:clean(eventLang||lang(),8)||"pl"
        })
      }).then(parseRpcResponse).then(function(){
        saveStatus("ok",eventType+" "+value);
        try{document.dispatchEvent(new CustomEvent("szp:site-events-ok",{detail:{type:eventType,value:value}}));}catch(error){}
        return true;
      });
    });
  }

  function send(eventType,value){
    if(isAdminPath())return Promise.resolve(false);
    return postEvent(eventType,value).catch(function(error){
      var message=error&&error.message?error.message:String(error);
      console.warn("Zdarzenia Szpilplacu:",message);
      queueEvent(eventType,value);
      saveStatus("error",message);
      try{document.dispatchEvent(new CustomEvent("szp:site-events-error",{detail:{message:message}}));}catch(ignore){}
      return false;
    });
  }

  function flushQueue(){
    if(flushing||!navigator.onLine)return Promise.resolve(false);
    var rows=readQueue();
    if(!rows.length){saveStatus("ready","Brak oczekujących zdarzeń");return Promise.resolve(true);}

    flushing=true;
    var remaining=[];
    var chain=Promise.resolve();

    rows.forEach(function(row){
      chain=chain.then(function(){
        return postEvent(row.type,row.value,row.lang,row.visitor).catch(function(error){
          remaining.push(row);
          saveStatus("error",error&&error.message?error.message:String(error));
        });
      });
    });

    return chain.then(function(){
      writeQueue(remaining);
      flushing=false;
      saveStatus(remaining.length?"queued":"ok",remaining.length?"Czekające zdarzenia: "+remaining.length:"Kolejka wysłana");
      return remaining.length===0;
    }).catch(function(error){
      flushing=false;
      saveStatus("error",error&&error.message?error.message:String(error));
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
    if(window.__SZP_SITE_EVENTS_FETCH_PATCHED)return;
    window.__SZP_SITE_EVENTS_FETCH_PATCHED=true;

    window.fetch=function(input,init){
      try{
        var url=typeof input==="string"?input:(input&&input.url)||"";
        var method=String((init&&init.method)||(input&&input.method)||"GET").toUpperCase();
        if(method==="POST"&&url.indexOf("/rest/v1/szpilplac_events")!==-1&&init&&typeof init.body==="string"){
          var parsed=JSON.parse(init.body);
          parsed=Array.isArray(parsed)?parsed.map(enrichGameEvent):enrichGameEvent(parsed);
          init=Object.assign({},init,{body:JSON.stringify(parsed)});
        }
      }catch(error){}
      return nativeFetch(input,init);
    };
  }

  function pageKey(){return (location.pathname||"/")+(location.search||"");}

  function trackPage(){
    if(isAdminPath())return;
    var path=pageKey();
    var key=PAGE_PREFIX+path;
    var now=Date.now();
    var last=0;
    try{last=Number(sessionStorage.getItem(key)||0);}catch(error){}
    if(now-last<10000)return;
    try{sessionStorage.setItem(key,String(now));}catch(error){}
    send("page_view",path);
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
    if(target)send("support_click",sourceFor(target));
  }

  function boot(){
    installGameEventBridge();
    document.addEventListener("click",handleClick,true);
    window.addEventListener("online",flushQueue);
    saveStatus("ready","Tracker uruchomiony");
    flushQueue().then(trackPage);
  }

  window.SZP_SITE_EVENTS={
    version:VERSION,
    track:function(type,value){return send(type,value);},
    flush:flushQueue,
    visitorId:visitorId,
    queued:function(){return readQueue().length;},
    status:readStatus
  };
  window.SZP_ANALYTICS=window.SZP_SITE_EVENTS;

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();

  console.info("Szpilplac site-events.js "+VERSION);
})();
