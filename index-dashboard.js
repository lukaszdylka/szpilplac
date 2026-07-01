/*
  Szpilplac Index Dashboard v40
  -----------------------------
  Zmienia stronę główną w plac startowy:
  - szerszy układ na PC
  - gry po lewej
  - panel gracza po prawej
  - avatar, login, ranga, punkty
  - jedna kolumna na mobile
*/

(function(){
  "use strict";

  var VERSION = "v40";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var sb = null;
  var profile = null;
  var rankStats = null;
  var avatars = {};

  var PLACEHOLDER_SVG =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">'+
      '<defs>'+
        '<linearGradient id="szp-home-ph-g" x1="0" y1="0" x2="1" y2="1">'+
          '<stop offset="0" stop-color="#d8d2c2"/>'+
          '<stop offset="1" stop-color="#8f8878"/>'+
        '</linearGradient>'+
      '</defs>'+
      '<circle cx="50" cy="50" r="50" fill="url(#szp-home-ph-g)"/>'+
      '<circle cx="50" cy="50" r="43" fill="none" stroke="#f3ecda" stroke-width="4" opacity=".78"/>'+
      '<circle cx="50" cy="38" r="16" fill="#f3ecda" opacity=".86"/>'+
      '<path d="M22 91q6-28 28-28t28 28" fill="#f3ecda" opacity=".86"/>'+
    '</svg>';

  function injectStyle(){
    if(document.getElementById("szpIndexDashboardStyle"))return;

    var style = document.createElement("style");
    style.id = "szpIndexDashboardStyle";
    style.textContent = `
      body.szp-home-dashboard header,
      body.szp-home-dashboard main,
      body.szp-home-dashboard footer{
        max-width:1040px;
      }

      body.szp-home-dashboard main{
        gap:16px;
      }

      .szp-home-hero{
        border:1px solid var(--line,#c9bfa6);
        background:
          radial-gradient(circle at 16% 20%, rgba(191,138,58,.16), transparent 28%),
          linear-gradient(135deg, var(--surface,#fbf7ee), var(--surface2,#f3ecda));
        border-radius:20px;
        box-shadow:var(--sh,0 6px 18px -10px rgba(35,32,26,.4));
        padding:22px;
        position:relative;
        overflow:hidden;
      }

      .szp-home-hero::after{
        content:"";
        position:absolute;
        right:-70px;
        top:-90px;
        width:220px;
        height:220px;
        border-radius:999px;
        border:34px solid rgba(191,138,58,.10);
        pointer-events:none;
      }

      .szp-home-kicker{
        font-size:11px;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.12em;
        color:var(--green,#2f4a39);
        margin-bottom:8px;
      }

      .szp-home-title{
        font-family:Oswald,system-ui,sans-serif;
        font-size:clamp(34px,6vw,62px);
        text-transform:uppercase;
        line-height:.95;
        margin:0;
        max-width:760px;
      }

      .szp-home-lead{
        margin:10px 0 0;
        max-width:680px;
        font-size:14px;
        line-height:1.55;
        color:var(--ink2,#6a6150);
      }

      .szp-home-grid{
        display:grid;
        grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);
        gap:16px;
        align-items:start;
      }

      .szp-home-left,
      .szp-home-side{
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      .szp-home-section-title{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin:2px 0 0;
        color:var(--ink2,#6a6150);
        font-size:11px;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.1em;
      }

      .szp-home-section-title::after{
        content:"";
        flex:1;
        height:1px;
        background:var(--line,#c9bfa6);
      }

      body.szp-home-dashboard #games{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }

      body.szp-home-dashboard .game-link{
        align-items:flex-start;
        min-height:132px;
        padding:16px;
        border-radius:18px;
        gap:13px;
        position:relative;
        overflow:hidden;
      }

      body.szp-home-dashboard .game-link::after{
        content:"";
        position:absolute;
        right:-44px;
        bottom:-54px;
        width:130px;
        height:130px;
        border-radius:999px;
        border:22px solid rgba(191,138,58,.08);
        pointer-events:none;
      }

      body.szp-home-dashboard .game-link:hover{
        transform:translateY(-2px);
      }

      body.szp-home-dashboard .game-icon{
        width:48px;
        height:48px;
        border-radius:14px;
        position:relative;
        z-index:1;
      }

      body.szp-home-dashboard .lbl{
        position:relative;
        z-index:1;
        padding-right:4px;
      }

      body.szp-home-dashboard .lbl .name{
        font-size:24px;
      }

      body.szp-home-dashboard .lbl .desc{
        font-size:12.5px;
        line-height:1.35;
        margin-top:5px;
      }

      body.szp-home-dashboard .badge{
        position:absolute;
        right:12px;
        top:12px;
        z-index:2;
      }

      body.szp-home-dashboard .section-sep{
        margin:2px 0 0;
      }

      body.szp-home-dashboard .ext-links{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }

      body.szp-home-dashboard .ext-link{
        border-radius:16px;
        min-height:78px;
      }

      .szp-player-card{
        background:var(--surface,#fbf7ee);
        border:1px solid var(--line,#c9bfa6);
        border-radius:20px;
        box-shadow:var(--sh,0 6px 18px -10px rgba(35,32,26,.4));
        padding:16px;
      }

      .szp-player-top{
        display:flex;
        align-items:center;
        gap:12px;
        margin-bottom:12px;
      }

      .szp-player-avatar{
        width:66px;
        height:66px;
        border-radius:999px;
        overflow:hidden;
        border:2px solid var(--line,#c9bfa6);
        background:var(--surface2,#f3ecda);
        display:grid;
        place-items:center;
        flex:0 0 auto;
      }

      .szp-player-avatar.has-avatar{
        border-color:var(--gold,#bf8a3a);
      }

      .szp-player-avatar svg{
        width:100%;
        height:100%;
        display:block;
      }

      .szp-player-name{
        min-width:0;
        flex:1;
      }

      .szp-player-label{
        font-size:10.5px;
        font-weight:900;
        color:var(--ink2,#6a6150);
        text-transform:uppercase;
        letter-spacing:.08em;
        margin-bottom:3px;
      }

      .szp-player-login{
        font-family:Oswald,system-ui,sans-serif;
        font-size:25px;
        text-transform:uppercase;
        line-height:1;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .szp-player-sub{
        color:var(--ink2,#6a6150);
        font-size:12.5px;
        line-height:1.4;
        margin-top:5px;
      }

      .szp-player-stats{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:12px;
      }

      .szp-player-stat{
        background:var(--surface2,#f3ecda);
        border:1px solid var(--line,#c9bfa6);
        border-radius:14px;
        padding:11px;
      }

      .szp-player-stat span{
        display:block;
        font-size:10px;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.06em;
        color:var(--ink2,#6a6150);
      }

      .szp-player-stat b{
        display:block;
        font-family:Oswald,system-ui,sans-serif;
        font-size:23px;
        line-height:1.05;
        margin-top:4px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .szp-player-actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:12px;
      }

      .szp-home-btn{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:40px;
        border-radius:12px;
        background:var(--green,#2f4a39);
        color:#fff;
        font-size:12px;
        font-weight:900;
        text-align:center;
        padding:9px 10px;
      }

      .szp-home-btn.secondary{
        background:var(--surface2,#f3ecda);
        color:var(--ink,#23201a);
        border:1px solid var(--line,#c9bfa6);
      }

      .szp-home-btn.gold{
        background:var(--gold,#bf8a3a);
        color:#20170d;
      }

      .szp-mini-card{
        background:var(--surface2,#f3ecda);
        border:1px solid var(--line,#c9bfa6);
        border-radius:16px;
        padding:13px;
        color:var(--ink2,#6a6150);
        font-size:12.5px;
        line-height:1.45;
      }

      .szp-mini-card b{
        display:block;
        font-family:Oswald,system-ui,sans-serif;
        color:var(--ink,#23201a);
        font-size:17px;
        text-transform:uppercase;
        letter-spacing:.03em;
        margin-bottom:4px;
      }

      @media(max-width:820px){
        body.szp-home-dashboard header,
        body.szp-home-dashboard main,
        body.szp-home-dashboard footer{
          max-width:560px;
        }

        .szp-home-grid{
          grid-template-columns:1fr;
        }

        body.szp-home-dashboard #games,
        body.szp-home-dashboard .ext-links{
          grid-template-columns:1fr;
        }

        body.szp-home-dashboard .game-link{
          min-height:auto;
        }

        body.szp-home-dashboard .lbl .name{
          font-size:21px;
        }
      }

      @media(max-width:420px){
        .szp-home-hero{
          padding:18px;
          border-radius:17px;
        }

        .szp-home-title{
          font-size:38px;
        }

        .szp-player-actions{
          grid-template-columns:1fr;
        }

        .szp-player-avatar{
          width:58px;
          height:58px;
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

  function getLang(){
    try{
      var l = localStorage.getItem("familock_lang") || document.documentElement.lang || "pl";
      return l === "szl" ? "szl" : "pl";
    }catch(e){
      return "pl";
    }
  }

  function txt(pl, szl){
    return getLang() === "szl" ? szl : pl;
  }

  function loadScript(src, testFn){
    if(typeof testFn === "function" && testFn())return Promise.resolve();

    return new Promise(function(resolve, reject){
      var existing = Array.prototype.slice.call(document.scripts || []).find(function(s){
        return s.src && s.src.indexOf(src.split("?")[0]) !== -1;
      });

      if(existing){
        if(typeof testFn !== "function" || testFn())return resolve();
        existing.addEventListener("load", resolve, {once:true});
        existing.addEventListener("error", reject, {once:true});
        return;
      }

      var sc = document.createElement("script");
      sc.src = src;
      sc.async = false;
      sc.onload = resolve;
      sc.onerror = function(){reject(new Error("Nie załadowano " + src));};
      document.head.appendChild(sc);
    });
  }

  async function ensureConfig(){
    if(window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL)return;
    await loadScript("config.js", function(){
      return !!(window.SZPILPLAC_CONFIG && window.SZPILPLAC_CONFIG.SUPABASE_URL);
    });
  }

  async function client(){
    if(sb)return sb;

    await ensureConfig();
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", function(){
      return !!window.supabase;
    });

    var cfg = window.SZPILPLAC_CONFIG || {};
    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase)return null;

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

  function readStoredSession(){
    try{
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      var data = JSON.parse(raw);
      return data.currentSession || data.session || data;
    }catch(e){
      return null;
    }
  }

  async function getSession(){
    var c = await client();
    if(!c)return null;

    try{
      var r = await c.auth.getSession();
      if(r && r.data && r.data.session)return r.data.session;
    }catch(e){}

    var stored = readStoredSession();
    if(stored && stored.access_token && stored.refresh_token){
      try{
        var s = await c.auth.setSession({
          access_token:stored.access_token,
          refresh_token:stored.refresh_token
        });
        if(s && s.data && s.data.session)return s.data.session;
      }catch(e){}
      return stored;
    }

    return null;
  }

  function makeHero(){
    if(document.getElementById("szpHomeHero"))return;

    var main = document.querySelector("main");
    if(!main)return;

    var hero = document.createElement("section");
    hero.id = "szpHomeHero";
    hero.className = "szp-home-hero";
    hero.innerHTML =
      '<div class="szp-home-kicker">'+esc(txt("Szpilplac Familocka","Szpilplac Familocka"))+'</div>'+
      '<h1 class="szp-home-title">'+esc(txt("Graj, zbieraj punkty i wracaj po kolejne zagadki","Szpilej, zbiyrej punkty i wrŏcej po dalsze zagadki"))+'</h1>'+
      '<p class="szp-home-lead">'+esc(txt("Codzienne słowa, kody i układanki w klimacie familoków. Możesz grać bez konta, ale konto zapisuje wyniki, ranking i rangę.", "Codziynne słowa, kody i ukłŏdanki w klimacie familokōw. Idzie szpilać bez kōnta, ale kōnto spamiyntuje wyniki, ranking i ranga."))+'</p>';

    main.insertBefore(hero, main.firstChild);
  }

  function makeLayout(){
    var main = document.querySelector("main");
    var games = document.getElementById("games");
    if(!main || !games)return;

    if(!document.getElementById("szpHomeGrid")){
      var grid = document.createElement("div");
      grid.id = "szpHomeGrid";
      grid.className = "szp-home-grid";

      var left = document.createElement("section");
      left.id = "szpHomeLeft";
      left.className = "szp-home-left";

      var side = document.createElement("aside");
      side.id = "szpHomeSide";
      side.className = "szp-home-side";

      var afterHero = document.getElementById("szpHomeHero");
      if(afterHero && afterHero.nextSibling){
        main.insertBefore(grid, afterHero.nextSibling);
      }else{
        main.appendChild(grid);
      }

      grid.appendChild(left);
      grid.appendChild(side);
    }

    var leftCol = document.getElementById("szpHomeLeft");
    var sideCol = document.getElementById("szpHomeSide");

    if(!document.getElementById("szpGamesTitle")){
      var gameTitle = document.createElement("div");
      gameTitle.id = "szpGamesTitle";
      gameTitle.className = "szp-home-section-title";
      gameTitle.textContent = txt("Gry na dziś", "Szpile na dzisiej");
      leftCol.appendChild(gameTitle);
    }

    if(games.parentNode !== leftCol)leftCol.appendChild(games);

    var sep = document.getElementById("sepLabel");
    var ext = document.querySelector(".ext-links");

    if(sep && sep.parentNode !== leftCol)leftCol.appendChild(sep);
    if(ext && ext.parentNode !== leftCol)leftCol.appendChild(ext);

    if(!document.getElementById("szpPlayerCard")){
      var card = document.createElement("section");
      card.id = "szpPlayerCard";
      card.className = "szp-player-card";
      sideCol.appendChild(card);
    }

    if(!document.getElementById("szpHomeMiniCard")){
      var mini = document.createElement("div");
      mini.id = "szpHomeMiniCard";
      mini.className = "szp-mini-card";
      mini.innerHTML =
        '<b>'+esc(txt("Dzisiaj na placu","Dzisiej na placu"))+'</b>'+
        esc(txt("Zagraj w krótką zagadkę, sprawdź ranking albo wróć później po kolejne wyzwanie.", "Szpilej w krōtko zagadka, sprawdź ranking abo wrōć niyskorzij po dalsze wyzwanie."));
      sideCol.appendChild(mini);
    }
  }

  async function loadProfile(){
    profile = null;
    rankStats = null;

    var session = await getSession();
    if(!session || !session.user)return;

    var c = await client();
    if(!c)return;

    try{
      var p = await c.from("profiles")
        .select("id,login,display_name,rank_name,avatar_key,show_in_ranking")
        .eq("id", session.user.id)
        .single();

      if(!p.error && p.data){
        profile = p.data;
      }
    }catch(e){}

    try{
      var r = await c.from("ranking_all_time")
        .select("user_id,points,games_played,wins")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if(!r.error && r.data){
        rankStats = r.data;
      }
    }catch(e){}

    if(profile && profile.avatar_key){
      await loadAvatar(profile.avatar_key);
    }
  }

  async function loadAvatar(key){
    if(!key || avatars[key])return;

    var c = await client();
    if(!c)return;

    try{
      var r = await c.from("szpilplac_avatars")
        .select("id,label,svg")
        .eq("id", key)
        .eq("is_active", true)
        .maybeSingle();

      if(!r.error && r.data){
        avatars[key] = {
          label:r.data.label || "Avatar",
          svg:cleanSvg(r.data.svg)
        };
      }
    }catch(e){}
  }

  function renderPlayer(){
    var card = document.getElementById("szpPlayerCard");
    if(!card)return;

    if(profile){
      var login = profile.login || profile.display_name || "gracz";
      var rank = profile.rank_name || "Gorol";
      var points = rankStats ? (Number(rankStats.points) || 0) : 0;
      var games = rankStats ? (Number(rankStats.games_played) || 0) : 0;
      var wins = rankStats ? (Number(rankStats.wins) || 0) : 0;
      var av = profile.avatar_key && avatars[profile.avatar_key] ? avatars[profile.avatar_key] : null;

      card.innerHTML =
        '<div class="szp-player-top">'+
          '<div class="szp-player-avatar '+(av ? "has-avatar" : "")+'">'+(av ? av.svg : PLACEHOLDER_SVG)+'</div>'+
          '<div class="szp-player-name">'+
            '<div class="szp-player-label">'+esc(txt("Twój profil","Twōj profil"))+'</div>'+
            '<div class="szp-player-login">'+esc(login)+'</div>'+
            '<div class="szp-player-sub">'+esc(txt("Ranga: ","Ranga: "))+esc(rank)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="szp-player-stats">'+
          '<div class="szp-player-stat"><span>'+esc(txt("Punkty","Punkty"))+'</span><b>'+esc(points)+'</b></div>'+
          '<div class="szp-player-stat"><span>'+esc(txt("Gry","Szpile"))+'</span><b>'+esc(games)+'</b></div>'+
          '<div class="szp-player-stat"><span>'+esc(txt("Wygrane","Wygrane"))+'</span><b>'+esc(wins)+'</b></div>'+
          '<div class="szp-player-stat"><span>'+esc(txt("Ranking","Ranking"))+'</span><b>'+esc(profile.show_in_ranking ? txt("Widoczny","Widoczny") : txt("Ukryty","Skryty"))+'</b></div>'+
        '</div>'+
        '<div class="szp-player-actions">'+
          '<a class="szp-home-btn" href="konto.html">'+esc(txt("Mój profil","Mōj profil"))+'</a>'+
          '<a class="szp-home-btn secondary" href="ranking.html">'+esc(txt("Ranking","Ranking"))+'</a>'+
        '</div>';
      return;
    }

    card.innerHTML =
      '<div class="szp-player-top">'+
        '<div class="szp-player-avatar">'+PLACEHOLDER_SVG+'</div>'+
        '<div class="szp-player-name">'+
          '<div class="szp-player-label">'+esc(txt("Grasz bez konta","Szpilosz bez kōnta"))+'</div>'+
          '<div class="szp-player-login">'+esc(txt("Gość","Gość"))+'</div>'+
          '<div class="szp-player-sub">'+esc(txt("Gry działają normalnie. Konto zapisze punkty, ranking i historię.", "Szpile fungujōm normalnie. Kōnto spamiyntuje punkty, ranking i historyjo."))+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="szp-player-actions">'+
        '<a class="szp-home-btn gold" href="konto.html">'+esc(txt("Załóż konto","Założ kōnto"))+'</a>'+
        '<a class="szp-home-btn secondary" href="ranking.html">'+esc(txt("Ranking","Ranking"))+'</a>'+
      '</div>';
  }

  async function refresh(){
    document.body.classList.add("szp-home-dashboard");
    injectStyle();
    makeHero();
    makeLayout();
    renderPlayer();
    await loadProfile();
    renderPlayer();
  }

  function boot(){
    console.info("Szpilplac index-dashboard.js " + VERSION);

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if(document.querySelector("main") && document.getElementById("games")){
        clearInterval(timer);
        refresh().catch(function(e){
          console.warn("Index dashboard error:", e);
        });
      }
      if(tries > 80)clearInterval(timer);
    }, 120);

    window.addEventListener("pageshow", function(){
      setTimeout(function(){refresh().catch(function(){});}, 250);
    });

    document.addEventListener("visibilitychange", function(){
      if(!document.hidden)setTimeout(function(){refresh().catch(function(){});}, 250);
    });

    window.addEventListener("focus", function(){
      setTimeout(function(){refresh().catch(function(){});}, 250);
    });
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();