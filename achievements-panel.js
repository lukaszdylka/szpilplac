(function(){
  "use strict";

  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var client = null;

  var VISIBLE_LOCKED = {
    wkludzony:1,
    pierszy:1,
    fajrant:1,
    dwazicher:1,
    bezpodp:1,
    godka:1,
    tydzien:1,
    ranga_bajtel:1,
    ranga_karlus:1,
    ranga_chop:1,
    ranga_grubiorz:1,
    ranga_hajer:1,
    ranga_przodowy:1,
    ranga_sztajger:1,
    ranga_zeflik:1
  };

  function canonicalId(id){
    id = String(id || "");
    if(id.charAt(0) === "$")id = id.slice(1);
    if(id === "zeflik")id = "ranga_zeflik";
    return id;
  }

  function esc(x){
    return String(x == null ? "" : x).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }

  function fmtDate(value){
    if(!value)return "";
    try{
      return new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value));
    }catch(e){
      return "";
    }
  }

  function fallbackSvg(){
    return '<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg"><path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#3d7a55"/><path d="M52 58l10 34-12-6-10 6 6-30z" fill="#3d7a55"/><circle cx="40" cy="40" r="36" fill="#4a9a6a"/><circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/><g transform="translate(22,22) scale(1.5)" fill="none" stroke="#161310" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9z"/></g></svg>';
  }

  function cfg(){
    return {
      url: window.SUPABASE_URL || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL) || "",
      key: window.SUPABASE_ANON_KEY || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY) || ""
    };
  }

  function getClient(){
    if(client)return client;
    if(!window.supabase)return null;
    var c = cfg();
    if(!c.url || !c.key)return null;
    client = window.supabase.createClient(c.url,c.key,{
      auth:{
        storageKey:AUTH_STORAGE_KEY,
        detectSessionInUrl:false,
        persistSession:true,
        autoRefreshToken:true
      }
    });
    return client;
  }

  function injectStyle(){
    if(document.getElementById("szpAchievementsStyle"))return;
    var st = document.createElement("style");
    st.id = "szpAchievementsStyle";
    st.textContent =
      ".achievements-box{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px;margin:8px 0 14px}" +
      ".ach-card{min-width:0;border:1px solid var(--line,#c9bfa6);border-radius:15px;background:var(--surface2,#f3ecda);padding:10px;display:grid;gap:7px;align-content:start;text-align:center}" +
      ".ach-card.earned{background:var(--surface,#fbf7ee);border-color:rgba(191,138,58,.68)}" +
      ".ach-icon{width:58px;height:70px;margin:0 auto;display:grid;place-items:center}" +
      ".ach-icon svg{width:58px;height:70px;display:block}" +
      ".ach-card.locked .ach-icon{filter:grayscale(1);opacity:.36}" +
      ".ach-title{font-family:Oswald,system-ui,sans-serif;font-size:15px;line-height:1.05;text-transform:uppercase;letter-spacing:.02em;color:var(--ink,#23201a)}" +
      ".ach-desc{font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150)}" +
      ".ach-date{font-size:10.5px;font-weight:900;color:var(--green,#2f4a39)}" +
      ".ach-card.locked .ach-title{color:var(--ink2,#6a6150)}" +
      ".ach-card.locked .ach-desc,.ach-card.locked .ach-date{display:none}" +
      "@media(max-width:420px){.achievements-box{grid-template-columns:repeat(2,minmax(0,1fr))}.ach-icon{width:52px;height:62px}.ach-icon svg{width:52px;height:62px}}";
    document.head.appendChild(st);
  }

  function cleanRows(rows){
    var byId = {};
    (rows || []).forEach(function(row){
      var id = canonicalId(row.id || row.achievement_id);
      if(!id)return;

      var earned = !!row.earned_at;
      var showLocked = row.show_locked === true || row.show_locked === "true" || !!VISIBLE_LOCKED[id];

      if(!earned && !showLocked)return;

      row.id = id;
      row.show_locked = showLocked;
      if(!row.svg)row.svg = fallbackSvg();

      var old = byId[id];
      if(!old || (!!row.earned_at && !old.earned_at) || ((row.sort_order || 9999) < (old.sort_order || 9999))){
        byId[id] = row;
      }
    });

    return Object.keys(byId).map(function(k){return byId[k];}).sort(function(a,b){
      return (Number(a.sort_order || 9999) - Number(b.sort_order || 9999)) || String(a.label || a.id).localeCompare(String(b.label || b.id), "pl");
    });
  }

  function renderRows(rows){
    var box = document.getElementById("achievementsBox");
    if(!box)return;
    injectStyle();

    rows = cleanRows(rows);

    if(!rows.length){
      box.innerHTML = '<div class="muted">Brak aktywnych odznak.</div>';
      return;
    }

    box.innerHTML = rows.map(function(row){
      var earned = !!row.earned_at;
      return ''+
        '<article class="ach-card '+(earned ? 'earned' : 'locked')+'">'+
          '<div class="ach-icon" aria-hidden="true">'+(row.svg || fallbackSvg())+'</div>'+
          '<div class="ach-title">'+esc(row.label || row.id)+'</div>'+
          (earned && row.description ? '<div class="ach-desc">'+esc(row.description)+'</div>' : '')+
          (earned ? '<div class="ach-date">Zdobyto: '+esc(fmtDate(row.earned_at))+'</div>' : '')+
        '</article>';
    }).join("");
  }

  async function loadAchievements(){
    var box = document.getElementById("achievementsBox");
    if(!box)return;
    injectStyle();

    var c = getClient();
    if(!c){
      box.innerHTML = '<div class="muted">Odznaki chwilowo niedostępne.</div>';
      return;
    }

    try{
      var sessionRes = await c.auth.getSession();
      var session = sessionRes && sessionRes.data && sessionRes.data.session;
      if(!session){
        box.innerHTML = '<div class="muted">Odznaki pojawią się po zalogowaniu.</div>';
        return;
      }

      try{
        await c.rpc("szpilplac_check_achievement_event", {
          p_event:"account",
          p_source_game:null,
          p_won:null,
          p_attempts:null,
          p_hints_used:null,
          p_score:null,
          p_meta:{}
        });
      }catch(e){}

      var res = await c.rpc("szpilplac_my_achievements");
      if(res.error)throw res.error;
      renderRows(res.data || []);
    }catch(err){
      box.innerHTML = '<div class="muted">Nie udało się wczytać odznak.</div>';
    }
  }

  function boot(){
    loadAchievements();
    window.SZPILPLAC_REFRESH_ACHIEVEMENTS = loadAchievements;
    setTimeout(loadAchievements,1200);
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();

  console.info("Szpilplac achievements-panel.js v78 clean");
})();
