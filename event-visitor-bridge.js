/*
  Szpilplac event-visitor-bridge.js v1
  Dopisuje anonimowy visitor_id i event_type do eventów szpilplac_events.
*/
(function(){
  "use strict";
  var VERSION = "v1";
  var KEY = "szpilplac_visitor_id_v1";

  function visitorId(){
    try{
      var id = localStorage.getItem(KEY);
      if(!id){
        if(window.crypto && crypto.randomUUID) id = crypto.randomUUID();
        else id = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,10);
        localStorage.setItem(KEY,id);
      }
      return id;
    }catch(e){
      return "v-session-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);
    }
  }

  function shouldPatch(url){
    url = String(url || "");
    return url.indexOf("/szpilplac_events") !== -1 || url.indexOf("szpilplac_events") !== -1;
  }

  function patchBody(init){
    if(!init || !init.body)return init;
    try{
      if(typeof init.body !== "string")return init;
      var body = JSON.parse(init.body);
      if(!body || typeof body !== "object" || Array.isArray(body))return init;
      if(!body.visitor_id)body.visitor_id = visitorId();
      if(!body.event_type)body.event_type = "game_finish";
      var next = {};
      Object.keys(init).forEach(function(k){next[k] = init[k];});
      next.body = JSON.stringify(body);
      return next;
    }catch(e){
      return init;
    }
  }

  if(window.__SZP_EVENT_VISITOR_BRIDGE_INSTALLED)return;
  window.__SZP_EVENT_VISITOR_BRIDGE_INSTALLED = true;

  var originalFetch = window.fetch;
  if(typeof originalFetch !== "function")return;

  window.fetch = function(input, init){
    try{
      var url = typeof input === "string" ? input : (input && input.url);
      if(shouldPatch(url)) init = patchBody(init || {});
    }catch(e){}
    return originalFetch.call(this,input,init);
  };

  window.SZP_VISITOR_ID = visitorId;
  console.info("Szpilplac event-visitor-bridge.js " + VERSION);
})();
