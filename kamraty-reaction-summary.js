/* Szpilplac kamraty-reaction-summary.js v1
   Pokazuje reakcje otrzymane:
   - konto.html -> "Reakcje, które dostałeś"
   - gracz.html -> "Reakcje od kamratów" w profilu publicznym
*/
(function(){
  "use strict";

  var VERSION = "v1";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var sb = null;
  var busy = false;

  var REACTIONS = [
    {key:"Fest!", mark:"✦", label:"Fest!"},
    {key:"Przaja Ci!", mark:"♡", label:"Przaja Ci!"},
    {key:"Dobro robota!", mark:"✓", label:"Dobro robota!"},
    {key:"Gonia Cie!", mark:"→", label:"Gonia Cie!"},
    {key:"Gowa paruje!", mark:"≋", label:"Gowa paruje!"}
  ];

  function esc(x){
    return String(x == null ? "" : x).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function cfg(){
    return {
      url: window.SUPABASE_URL || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL) || "",
      key: window.SUPABASE_ANON_KEY || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY) || ""
    };
  }
  function inRaja(){return /\/raja\/?/.test(location.pathname);}
  function root(path){return (inRaja() ? "../" : "") + path;}
  function qsa(sel,rootNode){return Array.prototype.slice.call((rootNode||document).querySelectorAll(sel));}
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
  async function initClient(){
    if(sb)return sb;
    if(window.__SZPILPLAC_SUPABASE_CLIENT){
      sb = window.__SZPILPLAC_SUPABASE_CLIENT;
      return sb;
    }
    await loadScript(root("config.js?v=13"),function(){return !!window.SZPILPLAC_CONFIG;});
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var c = cfg();
    if(!c.url || !c.key || !window.supabase)return null;
    sb = window.supabase.createClient(c.url,c.key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    window.__SZPILPLAC_SUPABASE_CLIENT = sb;
    return sb;
  }
  async function session(){
    var c = await initClient();
    if(!c)return null;
    try{
      var r = await c.auth.getSession();
      if(r && r.data && r.data.session)return r.data.session;
    }catch(e){}
    try{
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      var data = JSON.parse(raw), s = data.currentSession || data.session || data;
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
  async function rpc(name,args){
    var c = await initClient();
    if(!c)throw new Error("Brak połączenia z Supabase.");
    var r = await c.rpc(name,args || {});
    if(r.error)throw r.error;
    return r.data;
  }

  function injectStyle(){
    if(document.getElementById("kamratReactionSummaryStyle"))return;
    var st = document.createElement("style");
    st.id = "kamratReactionSummaryStyle";
    st.textContent =
      ".kr-summary{margin:12px 0 0;padding:12px;border:1px solid var(--line,#c9bfa6);border-radius:15px;background:rgba(191,138,58,.08)}"+
      ".kr-summary-title{font-family:Oswald,system-ui,sans-serif;font-size:17px;line-height:1;text-transform:uppercase;letter-spacing:.04em;color:var(--ink,#23201a);margin:0 0 8px}"+
      ".kr-summary-grid{display:grid;grid-template-columns:1fr 110px;gap:8px;align-items:stretch}"+
      ".kr-box{padding:9px 10px;border:1px solid var(--line,#c9bfa6);border-radius:12px;background:var(--surface,#fbf7ee)}"+
      ".kr-box small{display:block;margin-bottom:5px;color:var(--ink2,#6a6150);font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}"+
      ".kr-list{color:var(--ink,#23201a);font-size:12.5px;line-height:1.5;font-weight:800}"+
      ".kr-empty{color:var(--ink2,#6a6150);font-weight:700}"+
      ".kr-total{text-align:center;display:grid;place-items:center}.kr-total strong{display:block;font-family:Oswald,system-ui,sans-serif;font-size:28px;line-height:1;color:var(--green,#2f4a39)}"+
      "[data-theme=dark] .kr-total strong{color:var(--gold,#bf8a3a)}"+
      ".kr-note{margin:8px 0 0;color:var(--ink2,#6a6150);font-size:11.5px;line-height:1.4}"+
      "@media(max-width:520px){.kr-summary-grid{grid-template-columns:1fr}.kr-total{text-align:left;place-items:start}.kr-total strong{font-size:24px}}";
    document.head.appendChild(st);
  }

  function labelOf(key){
    var r = REACTIONS.find(function(x){return x.key === key;});
    return r ? (r.mark+" "+r.label) : key;
  }
  function countsList(obj){
    obj = obj || {};
    var rows = REACTIONS.map(function(r){
      var n = Number(obj[r.key] || 0);
      return n ? '<span>'+esc(r.mark+" "+r.label)+' × '+esc(n)+'</span>' : "";
    }).filter(Boolean);
    return rows.length ? rows.join("<br>") : '<span class="kr-empty">Brak reakcji.</span>';
  }
  function normalizeRow(data){
    var row = Array.isArray(data) ? data[0] : data;
    row = row || {};
    return {
      today_counts: row.today_counts || {},
      total_counts: row.total_counts || {},
      total_count: Number(row.total_count || 0),
      top_reaction: row.top_reaction || ""
    };
  }
  function render(summary,title){
    var top = summary.top_reaction ? labelOf(summary.top_reaction) : "—";
    return '<section class="kr-summary" data-kr-summary="1">'+
      '<h3 class="kr-summary-title">'+esc(title)+'</h3>'+
      '<div class="kr-summary-grid">'+
        '<div class="kr-box"><small>Dzisiaj</small><div class="kr-list">'+countsList(summary.today_counts)+'</div></div>'+
        '<div class="kr-box kr-total"><div><small>Łącznie</small><strong>'+esc(summary.total_count)+'</strong></div></div>'+
        '<div class="kr-box"><small>Wszystkie reakcje</small><div class="kr-list">'+countsList(summary.total_counts)+'</div></div>'+
        '<div class="kr-box"><small>Najczęściej</small><div class="kr-list">'+esc(top)+'</div></div>'+
      '</div>'+
      '<p class="kr-note">Pokazujemy tylko liczby reakcji, bez listy kto kliknął.</p>'+
    '</section>';
  }

  async function injectAccount(){
    if(location.pathname.indexOf("konto") === -1)return;
    var panel = document.getElementById("kamratyPanel");
    if(!panel || panel.querySelector('[data-kr-summary="1"]'))return;
    var s = await session();
    if(!s || !s.user)return;
    try{
      var data = normalizeRow(await rpc("szp_my_reaction_summary",{}));
      var head = panel.querySelector(".kamraty-head");
      if(head)head.insertAdjacentHTML("afterend",render(data,"Reakcje, które dostałeś"));
      else panel.insertAdjacentHTML("afterbegin",render(data,"Reakcje, które dostałeś"));
    }catch(e){
      console.warn("Kamraty reaction summary account error:",e);
    }
  }
  async function injectPublic(){
    if(location.pathname.indexOf("gracz") === -1)return;
    var rootBox = document.getElementById("publicProfileBox");
    if(!rootBox || rootBox.querySelector('[data-kr-summary="1"]'))return;
    var panel = rootBox.querySelector(".kamraty-panel");
    if(!panel)return;
    var id = new URLSearchParams(location.search).get("u") || "";
    if(!id)return;
    try{
      var data = normalizeRow(await rpc("szp_public_reaction_summary",{p_player_id:id}));
      var actions = panel.querySelector(".kamrat-actions");
      if(actions)actions.insertAdjacentHTML("beforebegin",render(data,"Reakcje od kamratów"));
      else panel.insertAdjacentHTML("beforeend",render(data,"Reakcje od kamratów"));
    }catch(e){
      console.warn("Kamraty reaction summary public error:",e);
    }
  }
  function scan(){
    if(busy)return;
    busy = true;
    setTimeout(function(){
      busy = false;
      injectStyle();
      injectAccount();
      injectPublic();
    },120);
  }
  function boot(){
    injectStyle();
    scan();
    new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
    setInterval(scan,1800);
    console.info("Szpilplac kamraty-reaction-summary.js "+VERSION);
  }

  window.SZP_KAMRAT_REACTION_SUMMARY = {version:VERSION,scan:scan};
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
