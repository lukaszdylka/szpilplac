(function(){
  "use strict";

  var VERSION = "v39";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var sb = null;
  var avatarMap = {};
  var loadedAvatars = false;

  var PLACEHOLDER_SVG =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">'+
      '<defs>'+
        '<linearGradient id="szp-rank-ph-g" x1="0" y1="0" x2="1" y2="1">'+
          '<stop offset="0" stop-color="#d8d2c2"/>'+
          '<stop offset="1" stop-color="#8f8878"/>'+
        '</linearGradient>'+
      '</defs>'+
      '<circle cx="50" cy="50" r="50" fill="url(#szp-rank-ph-g)"/>'+
      '<circle cx="50" cy="50" r="43" fill="none" stroke="#f3ecda" stroke-width="4" opacity=".78"/>'+
      '<circle cx="50" cy="38" r="16" fill="#f3ecda" opacity=".86"/>'+
      '<path d="M22 91q6-28 28-28t28 28" fill="#f3ecda" opacity=".86"/>'+
    '</svg>';

  function injectStyle(){
    if(document.getElementById("szpRankingAvatarStyle"))return;

    var style = document.createElement("style");
    style.id = "szpRankingAvatarStyle";
    style.textContent = `
      .rank-row.szp-rank-avatar-row{
        grid-template-columns:42px 46px minmax(0,1fr) auto;
      }

      .szp-rank-avatar{
        width:42px;
        height:42px;
        border-radius:999px;
        overflow:hidden;
        display:grid;
        place-items:center;
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface,#fbf7ee);
        box-shadow:0 6px 16px -14px rgba(0,0,0,.7);
      }

      .rank-row.me .szp-rank-avatar{
        border-color:var(--gold,#bf8a3a);
        box-shadow:0 0 0 2px rgba(191,138,58,.18);
      }

      .szp-rank-avatar svg{
        width:100%;
        height:100%;
        display:block;
      }

      .rank-row.szp-rank-avatar-row .details{
        grid-column:3 / 5;
      }

      @media(max-width:430px){
        .rank-row.szp-rank-avatar-row{
          grid-template-columns:30px 38px minmax(0,1fr) auto;
          gap:7px;
        }

        .szp-rank-avatar{
          width:36px;
          height:36px;
        }

        .rank-row.szp-rank-avatar-row .details{
          grid-column:2 / 5;
          margin-left:0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanSvg(svg){
    svg = String(svg || "");
    svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
    svg = svg.replace(/\son\w+="[^"]*"/gi, "");
    svg = svg.replace(/\son\w+='[^']*'/gi, "");
    svg = svg.replace(/javascript:/gi, "");
    return svg;
  }

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }

  function getText(key, fallback){
    if(typeof window.t === "function"){
      try{return window.t(key);}
      catch(e){}
    }
    return fallback || key;
  }

  function niceErr(error){
    if(typeof window.niceError === "function"){
      try{return window.niceError(error);}
      catch(e){}
    }
    return error && error.message ? error.message : String(error || "Nieznany błąd.");
  }

  function client(){
    if(sb)return sb;

    if(window.sb){
      sb = window.sb;
      return sb;
    }

    var cfg = window.SZPILPLAC_CONFIG || {};
    if(!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
      return null;
    }

    if(window.__SZPILPLAC_SUPABASE_CLIENT){
      sb = window.__SZPILPLAC_SUPABASE_CLIENT;
      return sb;
    }

    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth:{
        storageKey:AUTH_STORAGE_KEY,
        detectSessionInUrl:false,
        persistSession:true,
        autoRefreshToken:true
      }
    });

    window.__SZPILPLAC_SUPABASE_CLIENT = sb;
    return sb;
  }

  async function loadAvatars(){
    if(loadedAvatars)return;

    var c = client();
    if(!c)return;

    try{
      var res = await c.from("szpilplac_avatars")
        .select("id,label,svg,is_active")
        .eq("is_active", true);

      if(!res.error && res.data){
        avatarMap = {};
        res.data.forEach(function(a){
          avatarMap[a.id] = {
            label:a.label || "Avatar",
            svg:cleanSvg(a.svg)
          };
        });
      }
    }catch(e){
      avatarMap = {};
    }

    loadedAvatars = true;
  }

  function avatarHtml(key, login){
    var avatar = key && avatarMap[key] ? avatarMap[key] : null;
    var svg = avatar ? avatar.svg : PLACEHOLDER_SVG;
    var label = avatar ? avatar.label : "Avatar";
    return '<div class="szp-rank-avatar" title="'+esc(label)+' · '+esc(login)+'">'+svg+'</div>';
  }

  function setMsg(text, type){
    var el = document.getElementById("globalMsg");
    if(!el)return;
    el.textContent = text;
    el.className = "msg" + (type ? " " + type : "");
    el.classList.remove("hidden");
  }

  function clearMsg(){
    var el = document.getElementById("globalMsg");
    if(!el)return;
    el.textContent = "";
    el.className = "msg hidden";
  }

  function renderRows(rows){
    var list = document.getElementById("rankingList");
    if(!list)return;

    if(!rows.length){
      list.innerHTML =
        '<div class="empty"><strong>'+esc(getText("emptyTitle","Ranking jest jeszcze pusty"))+'</strong>'
        +esc(getText("emptyText","Pierwsze wyniki pojawią się po zapisaniu gry."))+'</div>';
      return;
    }

    var profile = window.currentProfile || null;
    var myLogin = profile && profile.login ? String(profile.login).toLowerCase() : null;

    list.innerHTML = rows.map(function(row, idx){
      var login = row.login || row.display_name || "gracz";
      var isMe = myLogin && String(login).toLowerCase() === myLogin;
      var last = row.last_play ? new Date(row.last_play).toLocaleString("pl-PL") : getText("noDate","brak daty");
      var rank = row.rank_name || "Gorol";
      var points = Number(row.points) || 0;
      var games = Number(row.games_played) || 0;
      var wins = Number(row.wins) || 0;

      return '<div class="rank-row szp-rank-avatar-row '+(isMe ? "me" : "")+'">'
        +'<div class="place">'+(idx+1)+'</div>'
        +avatarHtml(row.avatar_key, login)
        +'<div class="player">'
          +'<div class="login">'+esc(login)+(isMe ? ' · '+esc(getText("you","Ty")) : '')+'</div>'
          +'<div class="rank-name">'+esc(rank)+'</div>'
        +'</div>'
        +'<div class="points"><strong>'+esc(points)+'</strong><span>'+esc(getText("points","pkt"))+'</span></div>'
        +'<div class="details">'
          +esc(games)+' '+esc(getText("games","gier"))+' · '
          +esc(wins)+' '+esc(getText("wins","wygranych"))+' · '
          +esc(getText("last","ostatnio"))+': '+esc(last)
        +'</div>'
      +'</div>';
    }).join("");
  }

  async function loadRankingWithAvatars(){
    var c = client();
    if(!c)return;

    injectStyle();
    clearMsg();

    var list = document.getElementById("rankingList");
    if(list){
      list.innerHTML = '<div class="empty">'+esc(getText("loading","Ładuję ranking..."))+'</div>';
    }

    await loadAvatars();

    var current = window.currentRanking || "weekly";
    var view = current === "weekly" ? "ranking_weekly" : "ranking_all_time";

    var res = await c.from(view)
      .select("login, display_name, avatar_key, rank_name, games_played, wins, points, last_play")
      .order("points", {ascending:false})
      .order("wins", {ascending:false})
      .limit(100);

    if(res.error && String(res.error.message || "").indexOf("avatar_key") !== -1){
      res = await c.from(view)
        .select("login, display_name, rank_name, games_played, wins, points, last_play")
        .order("points", {ascending:false})
        .order("wins", {ascending:false})
        .limit(100);
    }

    if(res.error){
      if(list)list.innerHTML = "";
      setMsg(getText("errRanking","Nie udało się pobrać rankingu: ")+niceErr(res.error), "err");
      return;
    }

    renderRows(res.data || []);
  }

  function install(){
    injectStyle();

    window.renderRanking = renderRows;
    window.loadRanking = loadRankingWithAvatars;

    var refresh = document.getElementById("refreshBtn");
    if(refresh && !refresh.dataset.avatarV39){
      refresh.dataset.avatarV39 = "1";
      refresh.addEventListener("click", function(){
        setTimeout(loadRankingWithAvatars, 80);
      });
    }

    document.querySelectorAll(".tab").forEach(function(btn){
      if(btn.dataset.avatarV39)return;
      btn.dataset.avatarV39 = "1";
      btn.addEventListener("click", function(){
        setTimeout(loadRankingWithAvatars, 80);
      });
    });

    setTimeout(loadRankingWithAvatars, 450);
    setTimeout(loadRankingWithAvatars, 1200);
  }

  function boot(){
    console.info("Szpilplac ranking-avatars.js " + VERSION);

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if(document.getElementById("rankingList") && (window.sb || (window.supabase && window.SZPILPLAC_CONFIG))){
        clearInterval(timer);
        install();
      }
      if(tries > 80)clearInterval(timer);
    }, 150);
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();