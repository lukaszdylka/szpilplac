(function(){
  "use strict";

  function normalizeAchievementId(id){
    id = String(id || "");
    if(id === "trzy_na_zicher")return "trzynazicher";
    return id;
  }
  function dedupeAchievements(rows){
    if(!Array.isArray(rows))return [];
    var map = {};
    rows.forEach(function(row){
      if(!row)return;
      var id = normalizeAchievementId(row.id || row.achievement_id || row.code);
      var label = String(row.label || row.name || "").trim().toLowerCase();
      var key = id || label;
      if(label === "trzy na zicher")key = "trzynazicher";

      var clone = Object.assign({}, row);
      if(id)clone.id = id;
      if(!map[key]){
        map[key] = clone;
        return;
      }
      var prev = map[key];
      var cloneEarned = !!(clone.earned_at || clone.unlocked_at || clone.obtained_at || clone.is_unlocked || clone.earned);
      var prevEarned = !!(prev.earned_at || prev.unlocked_at || prev.obtained_at || prev.is_unlocked || prev.earned);
      var cloneCanonical = normalizeAchievementId(clone.id || clone.achievement_id || clone.code) === "trzynazicher";
      var prevCanonical = normalizeAchievementId(prev.id || prev.achievement_id || prev.code) === "trzynazicher";
      if((cloneEarned && !prevEarned) || (cloneCanonical && !prevCanonical)){
        map[key] = clone;
      }
    });
    return Object.keys(map).map(function(k){return map[k];});
  }


  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var client = null;

  var VISIBLE_LOCKED = {
    wkludzony:1,
    pierszy:1,
    fajrant:1,
    dwazicher:1,
    trzynazicher:1,
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


  async function achievementEarnedMap(c){
    var out = {};
    try{
      var res = await c.rpc("szpilplac_my_achievements");
      var rows = Array.isArray(res.data) ? res.data : [];
      rows.forEach(function(row){
        if(row && row.earned_at)out[String(row.id || row.achievement_id)] = row;
      });
    }catch(e){}
    return out;
  }
  async function showProfileRepairToasts(c,before){
    try{
      var after = await achievementEarnedMap(c);
      var fresh = [];
      Object.keys(after).forEach(function(id){
        if(!before[id] && after[id]){
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
        if(!window.SZP_ACHIEVEMENT_TOAST){
          await new Promise(function(resolve){
            var s=document.createElement("script");
            s.src="achievement-toast.js?v=120";
            s.onload=resolve;
            s.onerror=resolve;
            document.head.appendChild(s);
          });
        }
        if(window.SZP_ACHIEVEMENT_TOAST && window.SZP_ACHIEVEMENT_TOAST.showMany){
          window.SZP_ACHIEVEMENT_TOAST.showMany(fresh);
        }
      }
    }catch(e){}
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

      var beforeRepairAchievements = await achievementEarnedMap(c);

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

      try{
        await c.rpc("szpilplac_repair_my_daily_achievements");
      }catch(e){}

      await showProfileRepairToasts(c,beforeRepairAchievements);

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

  console.info("Szpilplac achievements-panel.js v120 trzy na zicher");
})();


(function(){
  "use strict";
  function dedupeTrzyNaZicherCards(){
    var cards = Array.prototype.slice.call(document.querySelectorAll(".achievement-card,.badge-card,.ach-card,[data-achievement-id],[data-achievement]"));
    var trzy = cards.filter(function(card){
      return /trzy\s+na\s+zicher/i.test(card.textContent || "");
    });
    if(trzy.length <= 1)return;

    trzy.sort(function(a,b){
      var ae = /zdobyto|✓|odblokowano/i.test(a.textContent || "") ? 1 : 0;
      var be = /zdobyto|✓|odblokowano/i.test(b.textContent || "") ? 1 : 0;
      return be - ae;
    });
    trzy.slice(1).forEach(function(card){card.style.display = "none";});
  }
  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(dedupeTrzyNaZicherCards,100);
    setTimeout(dedupeTrzyNaZicherCards,600);
    setTimeout(dedupeTrzyNaZicherCards,1500);
  });
  window.SZP_DEDUPE_TRZY_NA_ZICHER_CARDS = dedupeTrzyNaZicherCards;
})();

