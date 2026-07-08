/*
  Szpilplac Kamraty z placu v4
  Dopieszczenie UI:
  - badge „Z placu” w rankingu,
  - pusty stan publicznych profili,
  - reakcje tylko dla kamratów,
  - komunikaty po akcjach,
  - cofnij po usunięciu,
  - lekkie porównanie.
*/
(function(){
  "use strict";

  var VERSION = "v5";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var sb = null;
  var currentUser = null;
  var publicMap = {};
  var followedMap = {};
  var lastRemoved = null;
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
  function fmt(n){ return String(Number(n || 0)); }
  function fmtDate(x){ if(!x)return "—"; try{return new Date(x).toLocaleString("pl-PL");}catch(e){return "—";} }
  function cfg(){
    return {
      url: window.SUPABASE_URL || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL) || "",
      key: window.SUPABASE_ANON_KEY || (window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY) || ""
    };
  }
  function initClient(){
    if(sb)return true;
    var c = cfg();
    if(!c.url || !c.key || !window.supabase)return false;
    if(window.__SZPILPLAC_SUPABASE_CLIENT)sb = window.__SZPILPLAC_SUPABASE_CLIENT;
    else{
      sb = window.supabase.createClient(c.url,c.key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
      window.__SZPILPLAC_SUPABASE_CLIENT = sb;
    }
    return true;
  }
  async function session(){
    if(!initClient())return null;
    try{
      var r = await sb.auth.getSession();
      if(r && r.data && r.data.session){currentUser = r.data.session.user || null; return r.data.session;}
    }catch(e){}
    try{
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      var data = JSON.parse(raw), s = data.currentSession || data.session || data;
      if(s && s.access_token && s.refresh_token){
        try{
          var set = await sb.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
          if(set && set.data && set.data.session){currentUser = set.data.session.user || null; return set.data.session;}
        }catch(e){}
        currentUser = s.user || null;
        return s;
      }
    }catch(e){}
    return null;
  }
  async function rpc(name,args){
    if(!initClient())throw new Error("Brak połączenia z Supabase.");
    var r = await sb.rpc(name,args || {});
    if(r.error)throw r.error;
    return r.data;
  }

  function injectStyle(){
    if(document.getElementById("kamratyStyle"))document.getElementById("kamratyStyle").remove();
    var s = document.createElement("style");
    s.id = "kamratyStyle";
    s.textContent = `
      .kamraty-panel{margin:18px 0;padding:16px;border:1px solid var(--line,#c9bfa6);border-radius:18px;background:linear-gradient(180deg,rgba(191,138,58,.08),rgba(191,138,58,.025))}
      .kamraty-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
      .kamraty-title{margin:0;font-family:Oswald,system-ui,sans-serif;font-size:21px;line-height:1.05;text-transform:uppercase;letter-spacing:.04em;color:var(--ink,#23201a)}
      .kamraty-sub{margin:5px 0 0;color:var(--ink2,#6a6150);font-size:12.5px;line-height:1.45}
      .kamraty-toggle{display:flex;align-items:center;gap:8px;min-height:40px;padding:9px 12px;border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface,#fbf7ee);font-size:12px;font-weight:900;color:var(--ink,#23201a)}
      .kamraty-toggle input{accent-color:var(--green,#2f4a39)}
      .kamraty-grid{display:grid;gap:10px}.kamrat-card{padding:13px;border:1px solid var(--line,#c9bfa6);border-radius:15px;background:var(--surface,#fbf7ee)}
      .kamrat-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.kamrat-name{font-family:Oswald,system-ui,sans-serif;font-size:20px;text-transform:uppercase;line-height:1.05;color:var(--ink,#23201a)}
      .kamrat-meta{margin-top:4px;color:var(--ink2,#6a6150);font-size:12px;line-height:1.45}.kamrat-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0}
      .kamrat-stat{padding:8px;border:1px solid var(--line,#c9bfa6);border-radius:12px;background:var(--surface2,#f3ecda)}.kamrat-stat small{display:block;color:var(--ink2,#6a6150);font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.kamrat-stat strong{display:block;margin-top:3px;font-family:Oswald,system-ui,sans-serif;font-size:20px;line-height:1;color:var(--ink,#23201a)}
      .kamrat-actions,.reaction-row,.rank-kamrat-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.kamrat-btn,.reaction-chip,.rank-kamrat-btn{min-height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font-size:11.5px;font-weight:900;text-decoration:none}
      .kamrat-btn:hover,.reaction-chip:hover,.rank-kamrat-btn:hover{background:var(--surface,#fbf7ee);color:var(--green,#2f4a39);transform:translateY(-1px)}.kamrat-btn.gold,.rank-kamrat-btn.gold{border-color:var(--gold,#bf8a3a);background:rgba(191,138,58,.14)}.kamrat-btn.danger{color:var(--danger,#b5482f)}
      .rank-z-placu{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:2px 7px;border:1px solid rgba(191,138,58,.5);border-radius:999px;background:rgba(191,138,58,.10);color:var(--gold,#bf8a3a);font-family:Inter,system-ui,sans-serif;font-size:9.5px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;vertical-align:middle}
      .reaction-title{margin:9px 0 0;color:var(--ink2,#6a6150);font-size:11.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.reaction-chip{font-size:11px;color:var(--green,#2f4a39)}.reaction-chip .mark{font-family:Georgia,serif;font-size:13px;line-height:1}.reaction-chip.active{background:var(--green,#2f4a39);border-color:var(--green,#2f4a39);color:#fff}.reaction-chip:disabled{opacity:.58;cursor:wait;transform:none}.reaction-counts{margin-top:7px;color:var(--ink2,#6a6150);font-size:11.5px;line-height:1.45}
      .compare-box{display:none;margin-top:10px;padding:10px;border:1px dashed rgba(191,138,58,.6);border-radius:13px;background:rgba(191,138,58,.08)}.compare-box.show{display:block}.compare-note{margin:0 0 8px;color:var(--green,#2f4a39);font-size:12.5px;font-weight:900;line-height:1.35}
      .compare-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:6px 0;border-bottom:1px solid var(--line,#c9bfa6);font-size:12px}.compare-row:last-child{border-bottom:0}.compare-row strong{color:var(--ink,#23201a)}.compare-row span{color:var(--ink2,#6a6150);font-weight:800}
      .kamrat-empty,.kamrat-msg,.rank-public-empty{padding:12px;border:1px dashed var(--line,#c9bfa6);border-radius:13px;color:var(--ink2,#6a6150);font-size:13px;line-height:1.5;background:rgba(255,255,255,.03)}
      .kamrat-msg{display:none;margin:0 0 12px;border-style:solid;background:rgba(191,138,58,.10);color:var(--ink,#23201a)}.kamrat-msg.show{display:block}.kamrat-msg.ok{border-color:rgba(63,138,90,.55)}.kamrat-msg.err{border-color:rgba(181,72,47,.55);color:var(--danger,#b5482f)}.kamrat-msg button{margin-left:8px;color:var(--green,#2f4a39);font-weight:900;text-decoration:underline}
      .rank-public-empty{margin-top:10px}.rank-public-empty[hidden]{display:none!important}.rank-kamrat-actions{grid-column:3/5}
      @media(max-width:720px){.kamraty-head{display:grid}.kamrat-stats{grid-template-columns:1fr 1fr}.rank-kamrat-actions{grid-column:2/5}}
      @media(max-width:430px){.kamrat-stats{grid-template-columns:1fr}.kamrat-actions,.reaction-row{display:grid}.kamrat-btn,.reaction-chip{width:100%}.compare-row{grid-template-columns:1fr}.rank-z-placu{margin-left:0;margin-top:4px}}
    `;
    document.head.appendChild(s);
  }

  function ensurePageMsg(){
    var box = document.getElementById("kamratyGlobalMsg");
    if(box)return box;
    box = document.createElement("div");
    box.id = "kamratyGlobalMsg";
    box.className = "kamrat-msg";
    var main = document.querySelector("main") || document.body;
    if(main.firstChild)main.insertBefore(box,main.firstChild);
    else main.appendChild(box);
    return box;
  }
  function msg(text,type,undoFn){
    var box = ensurePageMsg();
    box.innerHTML = esc(text || "");
    if(undoFn){
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Cofnij";
      btn.addEventListener("click",undoFn);
      box.appendChild(btn);
    }
    box.className = "kamrat-msg show " + (type || "ok");
    clearTimeout(box.__timer);
    box.__timer = setTimeout(function(){box.classList.remove("show");}, undoFn ? 7000 : 4200);
  }

  function reactionObj(key){
    return REACTIONS.find(function(r){return r.key === key;}) || {key:key,mark:"•",label:key};
  }
  function reactionHtmlLabel(key){
    var r = reactionObj(key);
    return '<span class="mark">'+esc(r.mark)+'</span><span>'+esc(r.label)+'</span>';
  }
  function reactionPlain(key){
    var r = reactionObj(key);
    return r.mark + " " + r.label;
  }
  function reactionCountsHtml(obj){
    obj = obj || {};
    var items = REACTIONS.map(function(r){
      var n = Number(obj[r.key] || 0);
      return n ? r.mark+" "+r.label+" × "+n : "";
    }).filter(Boolean);
    return items.length ? "Dzisiaj: "+items.join(" · ") : "Dzisiaj bez reakcji.";
  }
  function reactionButtons(id,myReaction,allowed){
    if(!allowed)return '<div class="reaction-counts">Reakcje można dawać tylko kamratom z placu.</div>';
    return '<div class="reaction-title">Reakcje od kamratów</div><div class="reaction-row">'+REACTIONS.map(function(r){
      return '<button type="button" class="reaction-chip '+(myReaction===r.key?'active':'')+'" data-kamrat-react="'+esc(id)+'" data-reaction="'+esc(r.key)+'">'+reactionHtmlLabel(r.key)+'</button>';
    }).join("")+'</div>';
  }

  async function loadPublicMap(){
    try{
      var rows = await rpc("szp_public_players",{});
      publicMap = {};
      (rows || []).forEach(function(r){if(r && r.user_id)publicMap[String(r.user_id)] = r;});
    }catch(e){publicMap = {};}
    return publicMap;
  }
  async function loadFollowedMap(){
    followedMap = {};
    if(!currentUser)return followedMap;
    try{
      var rows = await rpc("szp_my_kamraty",{});
      (rows || []).forEach(function(r){if(r && r.user_id)followedMap[String(r.user_id)] = r;});
    }catch(e){}
    return followedMap;
  }

  function resetRankingKamratUi(){
    Array.prototype.slice.call(document.querySelectorAll(".rank-kamrat-actions,.rank-z-placu,.rank-public-empty")).forEach(function(el){el.remove();});
  }

  async function follow(id,login){
    await session();
    if(!currentUser){location.href="konto.html?login=1";return;}
    await rpc("szp_follow_player",{p_target_id:id});
    msg("Dodano do Kamratów z placu"+(login?": "+login:".").replace("..","."),"ok");
    await loadFollowedMap();
    resetRankingKamratUi();
    enhanceRankingRows();
  }
  async function unfollow(id,login){
    lastRemoved = {id:id,login:login || "kamrat"};
    await rpc("szp_unfollow_player",{p_target_id:id});
    await loadFollowedMap();
    msg("Usunięto z Kamratów z placu: "+(login || "kamrat")+".","ok",async function(){
      try{
        await rpc("szp_follow_player",{p_target_id:id});
        await loadFollowedMap();
        msg("Cofnięto usunięcie. Kamrat wrócił na plac.","ok");
        resetRankingKamratUi(); enhanceRankingRows(); renderKontoKamraty();
      }catch(e){msg("Nie udało się cofnąć: "+(e.message || e),"err");}
    });
    resetRankingKamratUi();
    enhanceRankingRows();
    renderKontoKamraty();
  }
  async function sendReaction(id,reaction){
    await rpc("szp_send_reaction",{p_target_id:id,p_reaction:reaction});
    msg(reactionPlain(reaction)+" poszło do kamrata.","ok");
    await loadFollowedMap();
    if(location.pathname.indexOf("konto") !== -1)renderKontoKamraty();
    if(location.pathname.indexOf("gracz") !== -1)renderPublicProfilePage();
  }

  function compareComment(rows){
    rows = rows || [];
    var today = rows.find(function(r){return String(r.metric || "").toLowerCase().indexOf("dzi") !== -1;});
    var points = rows.find(function(r){return String(r.metric || "") === "Punkty";});
    function n(v){var m = String(v || "").match(/-?\d+/); return m ? Number(m[0]) : 0;}
    if(today){
      var mt = n(today.me_value), tt = n(today.target_value);
      if(mt > tt)return "Dzisiaj jesteś przed kamratem.";
      if(mt < tt)return "Kamrat ma dziś więcej rozegranych gier.";
      if(mt > 0 && mt === tt)return "Dzisiaj idziecie łeb w łeb.";
    }
    if(points){
      var mp = n(points.me_value), tp = n(points.target_value);
      if(mp > tp)return "W punktach jesteś przed kamratem.";
      if(mp < tp)return "Brakuje Ci "+(tp-mp)+" pkt, żeby dogonić kamrata.";
    }
    return "Porównanie bez spiny — plac jest dla zabawy.";
  }
  async function compare(id,box){
    if(!box)return;
    box.classList.toggle("show");
    if(!box.classList.contains("show"))return;
    box.innerHTML = "Porównuję...";
    try{
      var rows = await rpc("szp_compare_with_player",{p_target_id:id});
      var keep = ["Punkty","Gry","Wygrane","Skuteczność","Gry dziś"];
      rows = (rows || []).filter(function(r){return keep.indexOf(String(r.metric || "")) !== -1;});
      box.innerHTML = '<p class="compare-note">'+esc(compareComment(rows))+'</p>' + (rows.map(function(r){
        return '<div class="compare-row"><strong>'+esc(r.metric)+'</strong><span>Ty: '+esc(r.me_value)+'</span><span>Kamrat: '+esc(r.target_value)+'</span></div>';
      }).join("") || "Brak danych do porównania.");
    }catch(e){box.innerHTML = "Nie udało się porównać: "+esc(e.message || e);}
  }

  async function renderKontoKamraty(){
    var panel = document.getElementById("kamratyPanel");
    if(!panel)return;
    await session();
    if(!currentUser){panel.innerHTML='<div class="kamrat-empty">Zaloguj się, żeby korzystać z Kamratów z placu.</div>';return;}
    var state = false;
    try{var st = await rpc("szp_my_public_profile",{}); state = !!(Array.isArray(st)?st[0]&&st[0].public_profile:st&&st.public_profile);}catch(e){}
    var friends = [];
    try{friends = await rpc("szp_my_kamraty",{});}catch(e){friends=[];}
    panel.innerHTML = '<div class="kamraty-head"><div><h2 class="kamraty-title">Kamraty z placu</h2><p class="kamraty-sub">Masz '+friends.length+' '+(friends.length===1?'kamrata':'kamratów')+' z placu. Ukryte profile mogą znikać z tej listy.</p></div><label class="kamraty-toggle"><input type="checkbox" id="publicProfileToggle" '+(state?'checked':'')+'> Profil publiczny</label></div><div id="kamratyList" class="kamraty-grid"></div>';
    var list = document.getElementById("kamratyList");
    if(!friends.length){list.innerHTML='<div class="kamrat-empty">Nie masz jeszcze kamratów. Wejdź w ranking i dodaj graczy z publicznym profilem.</div>';}
    else{
      list.innerHTML = friends.map(function(f){
        var id = String(f.user_id);
        return '<article class="kamrat-card" data-kamrat-id="'+esc(id)+'"><div class="kamrat-top"><div><div class="kamrat-name">'+esc(f.login||"gracz")+'</div><div class="kamrat-meta">Ranga: '+esc(f.rank_name||"Gorol")+' · ostatnio: '+esc(fmtDate(f.last_play))+'</div></div><a class="kamrat-btn" href="gracz.html?u='+encodeURIComponent(id)+'">Profil</a></div><div class="kamrat-stats"><div class="kamrat-stat"><small>Punkty</small><strong>'+fmt(f.points)+'</strong></div><div class="kamrat-stat"><small>Gry</small><strong>'+fmt(f.games_played)+'</strong></div><div class="kamrat-stat"><small>Wygrane</small><strong>'+fmt(f.wins)+'</strong></div><div class="kamrat-stat"><small>Dzisiaj</small><strong>'+fmt(f.played_today)+'</strong></div></div><div class="kamrat-actions"><button type="button" class="kamrat-btn gold" data-kamrat-compare="'+esc(id)+'">Porównaj</button><button type="button" class="kamrat-btn danger" data-kamrat-remove="'+esc(id)+'" data-login="'+esc(f.login||"kamrat")+'">Usuń</button></div><div class="reaction-counts">'+esc(reactionCountsHtml(f.reaction_counts||{}))+'</div>'+reactionButtons(id,f.my_reaction_today||"",true)+'<div class="compare-box" id="compare-'+esc(id)+'"></div></article>';
      }).join("");
    }
    var toggle = document.getElementById("publicProfileToggle");
    if(toggle){
      toggle.addEventListener("change",async function(){
        toggle.disabled = true;
        try{
          await rpc("szp_set_public_profile",{p_public:!!toggle.checked});
          msg(toggle.checked ? "Profil publiczny włączony. Jesteś widoczny jako gracz z placu." : "Profil publiczny wyłączony. Ukryte profile mogą znikać z list kamratów.","ok");
        }catch(e){toggle.checked=!toggle.checked; msg("Nie udało się zmienić profilu publicznego: "+(e.message || e),"err");}
        finally{toggle.disabled = false;}
      });
    }
  }
  function ensureKontoPanel(){
    var profile = document.getElementById("profileCard");
    if(!profile || document.getElementById("kamratyPanel"))return;
    var progress = document.getElementById("profileProgress");
    var panel = document.createElement("section");
    panel.id = "kamratyPanel";
    panel.className = "kamraty-panel";
    panel.innerHTML = '<div class="kamrat-empty">Ładuję Kamratów z placu...</div>';
    if(progress && progress.parentNode)progress.parentNode.insertBefore(panel,progress.nextSibling);
    else profile.appendChild(panel);
    renderKontoKamraty();
  }

  function addBadge(row){
    var login = row.querySelector(".login");
    if(login && !login.querySelector(".rank-z-placu"))login.insertAdjacentHTML("beforeend",' <span class="rank-z-placu">Z placu</span>');
  }
  function ensurePublicEmpty(hasPublic){
    if(location.pathname.indexOf("ranking") === -1)return;
    var list = document.getElementById("rankingList");
    if(!list)return;
    var old = document.getElementById("rankPublicEmpty");
    if(hasPublic){ if(old)old.remove(); return; }
    if(old)return;
    var div = document.createElement("div");
    div.id = "rankPublicEmpty";
    div.className = "rank-public-empty";
    div.textContent = "Publiczne profile pojawią się, gdy gracze włączą je w swoim koncie.";
    list.parentNode.insertBefore(div,list.nextSibling);
  }
  async function enhanceRankingRows(){
    if(location.pathname.indexOf("ranking") === -1)return;
    await session();
    await loadPublicMap();
    if(currentUser)await loadFollowedMap();
    var hasPublic = Object.keys(publicMap).length > 0;
    ensurePublicEmpty(hasPublic);
    Array.prototype.slice.call(document.querySelectorAll(".rank-row[data-user-id]")).forEach(function(row){
      var id = row.getAttribute("data-user-id");
      if(!id)return;
      var old = row.querySelector(".rank-kamrat-actions");
      if(old)old.remove();
      var badge = row.querySelector(".rank-z-placu");
      if(badge)badge.remove();
      var pub = publicMap[id];
      if(!pub)return;
      addBadge(row);
      var isMe = currentUser && currentUser.id === id;
      var isFollowed = !!followedMap[id];
      var login = row.getAttribute("data-login") || (pub.login || "gracz");
      var box = document.createElement("div");
      box.className = "rank-kamrat-actions";
      var html = '<a class="rank-kamrat-btn" href="gracz.html?u='+encodeURIComponent(id)+'">Profil publiczny</a>';
      if(!isMe){
        html += isFollowed
          ? '<button type="button" class="rank-kamrat-btn" data-rank-unfollow="'+esc(id)+'" data-login="'+esc(login)+'">✓ Kamrat</button>'
          : '<button type="button" class="rank-kamrat-btn gold" data-rank-follow="'+esc(id)+'" data-login="'+esc(login)+'">Dodaj do kamratów</button>';
      }
      box.innerHTML = html;
      var details = row.querySelector(".details") || row;
      details.parentNode.insertBefore(box,details.nextSibling);
    });
  }

  async function publicReactionCounts(id){
    try{
      var data = await rpc("szp_public_player_reactions",{p_player_id:id});
      if(Array.isArray(data) && data[0])return data[0].reaction_counts || {};
      return data && data.reaction_counts ? data.reaction_counts : {};
    }catch(e){return {};}
  }
  async function renderPublicProfilePage(){
    var box = document.getElementById("publicProfileBox");
    if(!box)return;
    await session();
    var id = new URLSearchParams(location.search).get("u") || "";
    if(!id){box.innerHTML='<div class="kamrat-empty">Brak wskazanego gracza.</div>';return;}
    box.innerHTML='<div class="kamrat-empty">Ładuję profil...</div>';
    try{
      var rows = await rpc("szp_get_public_player",{p_player_id:id});
      var p = Array.isArray(rows)?rows[0]:rows;
      if(!p){box.innerHTML='<div class="kamrat-empty">Ten profil nie jest publiczny albo nie istnieje.</div>';return;}
      await loadFollowedMap();
      var isMe = currentUser && currentUser.id === id;
      var isFollowed = !!followedMap[id];
      var counts = await publicReactionCounts(id);
      box.innerHTML = '<section class="kamraty-panel"><div class="kamraty-head"><div><h1 class="kamraty-title">'+esc(p.login||"Gracz")+' <span class="rank-z-placu">Z placu</span></h1><p class="kamraty-sub">Publiczny profil gracza Szpilplaca. Bez maila, bez prywatnych danych i bez spoilerów.</p></div></div><div class="kamrat-stats"><div class="kamrat-stat"><small>Ranga</small><strong>'+esc(p.rank_name||"Gorol")+'</strong></div><div class="kamrat-stat"><small>Punkty</small><strong>'+fmt(p.points)+'</strong></div><div class="kamrat-stat"><small>Gry</small><strong>'+fmt(p.games_played)+'</strong></div><div class="kamrat-stat"><small>Wygrane</small><strong>'+fmt(p.wins)+'</strong></div></div><div class="kamrat-stats"><div class="kamrat-stat"><small>Dziś</small><strong>'+fmt(p.played_today)+'</strong></div><div class="kamrat-stat"><small>7 dni</small><strong>'+fmt(p.played_7d)+'</strong></div><div class="kamrat-stat"><small>Skuteczność</small><strong>'+fmt(p.win_pct)+'%</strong></div><div class="kamrat-stat"><small>Ostatnio</small><strong style="font-size:14px">'+esc(fmtDate(p.last_play))+'</strong></div></div><div class="kamrat-actions"><a class="kamrat-btn" href="ranking.html">Ranking</a><a class="kamrat-btn" href="konto.html">Moje konto</a>'+(!isMe && currentUser ? (isFollowed ? '<button type="button" class="kamrat-btn" data-rank-unfollow="'+esc(id)+'" data-login="'+esc(p.login||"kamrat")+'">✓ Kamrat</button>' : '<button type="button" class="kamrat-btn gold" data-rank-follow="'+esc(id)+'" data-login="'+esc(p.login||"kamrat")+'">Dodaj do kamratów</button>') : '')+(!isMe && currentUser && isFollowed ? '<button type="button" class="kamrat-btn gold" data-kamrat-compare="'+esc(id)+'">Porównaj</button>' : '')+'</div><div class="reaction-counts">'+esc(reactionCountsHtml(counts))+'</div>'+(!isMe && currentUser ? reactionButtons(id,"",isFollowed) : '')+'<div class="compare-box" id="compare-'+esc(id)+'"></div></section>';
    }catch(e){box.innerHTML='<div class="kamrat-empty">Nie udało się pobrać profilu: '+esc(e.message||e)+'</div>';}
  }

  document.addEventListener("click",function(e){
    var btn = e.target && e.target.closest ? e.target.closest("[data-rank-follow],[data-rank-unfollow],[data-kamrat-remove],[data-kamrat-compare],[data-kamrat-react]") : null;
    if(!btn)return;
    var id;
    if(btn.hasAttribute("data-rank-follow")){
      id = btn.getAttribute("data-rank-follow"); btn.disabled = true;
      follow(id,btn.getAttribute("data-login")||"").catch(function(err){msg(err.message||err,"err");}).finally(function(){btn.disabled=false;});
    }else if(btn.hasAttribute("data-rank-unfollow")){
      id = btn.getAttribute("data-rank-unfollow"); btn.disabled = true;
      unfollow(id,btn.getAttribute("data-login")||"").catch(function(err){msg(err.message||err,"err");}).finally(function(){btn.disabled=false;});
    }else if(btn.hasAttribute("data-kamrat-remove")){
      id = btn.getAttribute("data-kamrat-remove"); btn.disabled = true;
      unfollow(id,btn.getAttribute("data-login")||"").catch(function(err){msg(err.message||err,"err");}).finally(function(){btn.disabled=false;});
    }else if(btn.hasAttribute("data-kamrat-compare")){
      id = btn.getAttribute("data-kamrat-compare"); compare(id,document.getElementById("compare-"+id) || (btn.closest(".kamrat-card,.kamraty-panel")||document).querySelector(".compare-box"));
    }else if(btn.hasAttribute("data-kamrat-react")){
      id = btn.getAttribute("data-kamrat-react");
      var reaction = btn.getAttribute("data-reaction");
      btn.disabled = true;
      var old = btn.innerHTML;
      btn.textContent = "Zapisuję...";
      sendReaction(id,reaction).catch(function(err){msg(err.message||err,"err");}).finally(function(){btn.disabled=false;btn.innerHTML=old;});
    }
  });

  function boot(){
    injectStyle(); initClient();
    if(location.pathname.indexOf("konto") !== -1){
      var timer = setInterval(function(){var p=document.getElementById("profileCard");if(p && !p.classList.contains("hidden"))ensureKontoPanel();},800);
      setTimeout(function(){clearInterval(timer);},30000);
      new MutationObserver(function(){ensureKontoPanel();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
    }
    if(location.pathname.indexOf("ranking") !== -1){
      setTimeout(enhanceRankingRows,500);
      setTimeout(enhanceRankingRows,1200);
      setTimeout(enhanceRankingRows,2500);
      document.addEventListener("click",function(e){
        if(e.target && e.target.closest && e.target.closest(".tab")){
          setTimeout(enhanceRankingRows,500);
          setTimeout(enhanceRankingRows,1200);
        }
      });
    }
    if(location.pathname.indexOf("gracz") !== -1)renderPublicProfilePage();
  }
  window.SZP_KAMRATY = {version:VERSION,refresh:function(){renderKontoKamraty();resetRankingKamratUi();enhanceRankingRows();renderPublicProfilePage();}};
  console.info("Szpilplac kamraty.js "+VERSION);
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot); else boot();
})();
