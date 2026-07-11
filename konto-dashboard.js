/*
  Szpilplac Konto Dashboard v50 — jeden stabilny układ konta
  ----------------------------------------------------------
  Zasada:
  - bez kilku nakładek walczących ze sobą,
  - główny profil i postępy zostają na górze,
  - techniczne rzeczy są niżej w rozwijanych zakładkach,
  - Powiadomienia i Kamraty też są zakładkami niżej,
  - jedna działająca Historia wyników.
*/
(function(){
  "use strict";

  var VERSION = "v50";
  var applying = false;
  var scheduled = false;
  var weeklyPatchInstalled = false;
  var observerInstalled = false;

  function $(sel, root){ return (root || document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function textOf(el){ return (el && el.textContent || "").replace(/\s+/g," ").trim(); }

  function injectStyle(){
    if(document.getElementById("szpKontoDashboardStyle")) return;

    var style = document.createElement("style");
    style.id = "szpKontoDashboardStyle";
    style.textContent = `
      body.szp-account-dashboard header,
      body.szp-account-dashboard main,
      body.szp-account-dashboard footer{max-width:760px}

      body.szp-account-dashboard main{gap:14px}
      body.szp-account-dashboard #profileCard{padding:18px;border-radius:18px}

      .szp-profile-main{
        display:grid;
        gap:12px;
        padding:14px;
        border:1px solid var(--line,#c9bfa6);
        border-radius:16px;
        background:var(--surface2,#f3ecda);
      }

      .szp-profile-head{margin:0;padding:0}
      .szp-profile-head .hello{margin:0 0 4px!important}
      .szp-profile-head .intro{margin:0!important}

      .szp-profile-main .profile-summary{
        margin:0!important;
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:8px!important;
      }
      .szp-profile-main .stat{padding:11px!important;border-radius:13px!important}
      .szp-profile-main .stat .value{font-size:23px!important}

      .szp-rank-path{
        margin:0!important;
        color:var(--ink2,#6a6150)!important;
        font-size:11.5px!important;
        line-height:1.35!important;
      }

      .profile-progress{
        margin:14px 0 0!important;
      }

      .szp-main-actions{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        margin:12px 0 0;
      }
      .szp-main-actions .btn{
        width:100%;
        min-height:39px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:9px 11px!important;
        font-size:12px!important;
        text-align:center;
      }

      .szp-foldouts{
        display:grid;
        gap:9px;
        margin-top:14px;
      }

      .szp-foldout{
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface,#fbf7ee);
        border-radius:14px;
        overflow:hidden;
      }
      .szp-foldout[open]{
        box-shadow:0 18px 42px -34px rgba(35,32,26,.65);
      }
      .szp-foldout summary{
        list-style:none;
        cursor:pointer;
        padding:12px 13px;
        font-family:Oswald,system-ui,sans-serif;
        font-size:18px;
        line-height:1.05;
        text-transform:uppercase;
        letter-spacing:.03em;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        color:var(--ink,#23201a);
      }
      .szp-foldout summary::-webkit-details-marker{display:none}
      .szp-foldout summary::after{
        content:"›";
        font-size:24px;
        line-height:1;
        color:var(--gold,#bf8a3a);
        transform:rotate(90deg);
      }
      .szp-foldout[open] summary::after{
        transform:rotate(-90deg);
      }
      .szp-foldout-sub{
        display:block;
        margin-top:3px;
        font-family:Inter,system-ui,sans-serif;
        font-size:11.5px;
        line-height:1.35;
        text-transform:none;
        letter-spacing:0;
        color:var(--ink2,#6a6150);
        font-weight:800;
      }
      .szp-foldout-body{
        border-top:1px solid var(--line,#c9bfa6);
        padding:12px;
      }

      .szp-basic-info{
        display:grid;
        gap:0;
      }
      .szp-basic-info .profile-row{
        display:grid!important;
        grid-template-columns:96px minmax(0,1fr)!important;
        gap:8px!important;
        padding:7px 0!important;
        margin:0!important;
        font-size:12.5px!important;
      }
      .szp-basic-info .profile-row span{
        min-width:0;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .szp-technical-actions{
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
        margin-top:12px;
      }
      .szp-technical-actions .btn{
        width:100%!important;
        min-height:40px!important;
      }

      .szp-foldout-body form{
        margin-top:10px!important;
        gap:10px!important;
      }

      .szp-foldout-body #resultsBox{font-size:13px}
      .szp-foldout-body #resultsBox .result{
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:6px 10px;
        align-items:start;
        padding:10px 0;
      }
      .szp-foldout-body #resultsBox .result .pill{justify-self:start}
      .szp-foldout-body #resultsBox .result-meta{margin-top:0}

      #szpNotifyCard,
      #kamratyPanel{
        margin:0!important;
      }
      .szp-foldout-body #szpNotifyCard,
      .szp-foldout-body #kamratyPanel{
        border:0!important;
        background:transparent!important;
        box-shadow:none!important;
        padding:0!important;
        border-radius:0!important;
      }
      .szp-foldout-body #szpNotifyCard > h2,
      .szp-foldout-body #szpNotifyCard > p,
      .szp-foldout-body #kamratyPanel > .kamraty-head{
        display:none!important;
      }

      body.szp-account-dashboard #profileCard > .sub-head,
      body.szp-account-dashboard #profileCard > .profile-row,
      body.szp-account-dashboard #profileCard > #locationForm,
      body.szp-account-dashboard #profileCard > .profile-actions,
      body.szp-account-dashboard #profileCard > #resultsBox,
      body.szp-account-dashboard #profileCard > #achievementsBox{
        margin-top:0!important;
      }

      @media(max-width:760px){
        body.szp-account-dashboard header,
        body.szp-account-dashboard main,
        body.szp-account-dashboard footer{max-width:520px}
        body.szp-account-dashboard #profileCard{padding:16px;border-radius:16px}
        .szp-profile-main .profile-summary{grid-template-columns:1fr 1fr!important}
        .szp-main-actions{grid-template-columns:1fr}
        .szp-foldout-body #resultsBox .result{display:block}
        .szp-foldout-body #resultsBox .result-meta{margin-top:5px}
      }

      @media(max-width:420px){
        .szp-profile-main{padding:12px}
        .szp-profile-main .profile-summary{grid-template-columns:1fr 1fr!important}
        .szp-basic-info .profile-row{grid-template-columns:1fr!important;gap:2px!important;padding:8px 0!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ppPad(n){ return String(n).padStart(2,"0"); }

  function warsawDateKeyFromDate(d){
    try{
      var parts = new Intl.DateTimeFormat("en-CA",{
        timeZone:"Europe/Warsaw",
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
      }).formatToParts(d);
      var o = {};
      parts.forEach(function(p){ if(p.type !== "literal") o[p.type] = p.value; });
      return o.year + "-" + o.month + "-" + o.day;
    }catch(e){
      return d.getFullYear() + "-" + ppPad(d.getMonth()+1) + "-" + ppPad(d.getDate());
    }
  }

  function warsawTodayKey(){ return warsawDateKeyFromDate(new Date()); }

  function addDaysKey(key, delta){
    var d = new Date(key + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    return d.getUTCFullYear() + "-" + ppPad(d.getUTCMonth()+1) + "-" + ppPad(d.getUTCDate());
  }

  function dayOfWeekMondayFirst(key){
    var d = new Date(key + "T12:00:00Z");
    return (d.getUTCDay()+6)%7;
  }

  function weekStartKey(key){
    return addDaysKey(key, -dayOfWeekMondayFirst(key));
  }

  function currentWeekKeys(){
    var start = weekStartKey(warsawTodayKey());
    var keys = [];
    for(var i=0;i<7;i++) keys.push(addDaysKey(start,i));
    return keys;
  }

  function rajaDayIndexRaw(){
    try{
      var p = new Intl.DateTimeFormat("en-CA",{
        timeZone:"Europe/Warsaw",
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
      }).formatToParts(new Date());
      var o = {};
      p.forEach(function(x){ if(x.type !== "literal") o[x.type] = Number(x.value); });
      return Math.floor((Date.UTC(o.year,o.month-1,o.day)-Date.UTC(2026,6,4))/86400000);
    }catch(e){
      return 0;
    }
  }

  function localFinished(key){
    try{
      var raw = localStorage.getItem(key);
      if(!raw) return false;
      var st = JSON.parse(raw);
      return !!(st && st.status && st.status !== "playing");
    }catch(e){
      return false;
    }
  }

  function localStatsDone(storeKey, dayKey){
    try{
      var raw = localStorage.getItem(storeKey);
      if(!raw) return false;
      var st = JSON.parse(raw);
      if(!st) return false;
      if(st.days && st.days[String(dayKey)]) return true;
      if(st.weeks && st.weeks[String(dayKey)]) return true;
    }catch(e){}
    return false;
  }

  function playedDaysMap(rows){
    var played = {};
    (Array.isArray(rows) ? rows : []).forEach(function(row){
      if(row && row.finished_at) played[warsawDateKeyFromDate(new Date(row.finished_at))] = true;
    });

    var today = warsawTodayKey();
    var dayIdx = typeof window.DAY_IDX !== "undefined" ? window.DAY_IDX : "";
    var rajaIdx = Math.max(0, rajaDayIndexRaw());

    if(
      localFinished("slowko_d"+dayIdx) ||
      localFinished("klodka_d"+dayIdx) ||
      localFinished("zorta_daily_d"+rajaIdx) ||
      localStatsDone("zorta_daily_stats_v1", rajaIdx)
    ){
      played[today] = true;
    }

    return played;
  }

  function countCurrentWeekDays(rows){
    var played = playedDaysMap(rows);
    var count = 0;
    currentWeekKeys().forEach(function(k){ if(played[k]) count++; });
    return count;
  }

  function findWeeklyCard(){
    return $all(".progress-card").find(function(card){
      var kicker = $(".progress-kicker", card);
      return kicker && textOf(kicker).toLowerCase().indexOf("cel tygodniowy") !== -1;
    });
  }

  function updateWeeklyGoalCard(rows){
    var card = findWeeklyCard();
    if(!card) return;

    var count = Math.max(0, Math.min(7, countCurrentWeekDays(rows)));
    var main = $(".progress-main", card);
    var dots = $(".progress-dots", card);
    var note = $(".progress-note", card);

    if(main) main.textContent = count + " / 7";

    if(dots){
      dots.innerHTML = "";
      for(var i=1;i<=7;i++){
        var dot = document.createElement("span");
        dot.className = "progress-dot" + (i <= count ? " on" : "");
        dot.setAttribute("aria-hidden","true");
        dots.appendChild(dot);
      }
    }

    if(note){
      note.textContent = count >= 7
        ? "Tygodniowy cel gotowy w tym tygodniu!"
        : "Jeszcze " + (7-count) + " dni do celu w tym tygodniu.";
    }
  }

  function installWeeklyPatch(){
    if(weeklyPatchInstalled) return true;
    if(typeof window.renderProfileProgress !== "function") return false;

    var original = window.renderProfileProgress;
    window.renderProfileProgress = function(rows){
      var ret = original.apply(this, arguments);
      try{ updateWeeklyGoalCard(rows); }catch(e){ console.warn("weekly goal patch error", e); }
      return ret;
    };

    weeklyPatchInstalled = true;
    return true;
  }

  function ensureProfileMain(profile){
    var main = document.getElementById("szpProfileMain");
    if(!main){
      main = document.createElement("section");
      main.id = "szpProfileMain";
      main.className = "szp-profile-main";
      profile.insertBefore(main, profile.firstChild);
    }

    var head = document.getElementById("szpProfileHead");
    if(!head){
      head = document.createElement("div");
      head.id = "szpProfileHead";
      head.className = "szp-profile-head";
    }

    var hello = document.getElementById("helloTitle");
    var intro = document.getElementById("profileIntro");
    if(hello && hello.parentNode !== head) head.appendChild(hello);
    if(intro && intro.parentNode !== head) head.appendChild(intro);

    var summary = $(".profile-summary", profile);

    if(head.parentNode !== main) main.appendChild(head);
    if(summary && summary.parentNode !== main) main.appendChild(summary);

    var rankPath = $all(".small", profile).find(function(el){
      return textOf(el).indexOf("Ścieżka rang") !== -1;
    });
    if(rankPath){
      rankPath.classList.add("szp-rank-path");
      if(rankPath.parentNode !== main) main.appendChild(rankPath);
    }

    return main;
  }

  function makeFoldout(id, title, sub){
    var d = document.getElementById(id);
    if(d) return d;

    d = document.createElement("details");
    d.id = id;
    d.className = "szp-foldout";

    var summary = document.createElement("summary");
    summary.innerHTML = sub
      ? '<span>' + title + '<span class="szp-foldout-sub">' + sub + '</span></span>'
      : '<span>' + title + '</span>';

    var body = document.createElement("div");
    body.className = "szp-foldout-body";

    d.appendChild(summary);
    d.appendChild(body);

    return d;
  }

  function bodyOf(foldout){
    return foldout ? $(".szp-foldout-body", foldout) : null;
  }

  function move(parent, node){
    if(!parent || !node || node === parent) return;
    if(node.contains && node.contains(parent)) return;
    if(node.parentNode !== parent) parent.appendChild(node);
  }

  function removeSubHeads(profile, words){
    $all(".sub-head", profile).forEach(function(el){
      var t = textOf(el).toLowerCase();
      if(words.some(function(w){ return t.indexOf(String(w).toLowerCase()) !== -1; })){
        el.remove();
      }
    });
  }

  function ensureMainActions(profile){
    var progress = document.getElementById("profileProgress");
    var box = document.getElementById("szpMainActions");

    if(!box){
      box = document.createElement("div");
      box.id = "szpMainActions";
      box.className = "szp-main-actions";
    }

    var back = $('a[href="index.html"]', profile) || $('a[href="index.html"]');
    var ranking = $('a[href="ranking.html"]', profile) || $('a[href="ranking.html"]');
    var logout = document.getElementById("logoutBtn");

    if(back) box.appendChild(back);
    if(ranking) box.appendChild(ranking);
    if(logout) box.appendChild(logout);

    if(progress && progress.parentNode === profile){
      progress.insertAdjacentElement("afterend", box);
    }else if(box.parentNode !== profile){
      profile.appendChild(box);
    }

    return box;
  }

  function ensureFoldoutsContainer(profile){
    var wrap = document.getElementById("szpAccountFoldouts");
    if(!wrap){
      wrap = document.createElement("section");
      wrap.id = "szpAccountFoldouts";
      wrap.className = "szp-foldouts";
    }

    var actions = document.getElementById("szpMainActions");
    if(actions && actions.parentNode === profile){
      actions.insertAdjacentElement("afterend", wrap);
    }else if(wrap.parentNode !== profile){
      profile.appendChild(wrap);
    }

    return wrap;
  }

  function arrangeFoldouts(profile){
    var wrap = ensureFoldoutsContainer(profile);

    var profileFold = makeFoldout("szpProfileDataFoldout", "Profil i zgody", "Dane konta, miejscowość, mailing i widoczność.");
    var badgesFold = makeFoldout("szpAchievementsFoldout", "Odznaki", "Cele i nagrody bez przytłaczania panelu.");
    var historyFold = makeFoldout("szpHistoryFoldout", "Historia wyników", "Lista gier zapisanych na koncie.");
    var notifyFold = makeFoldout("szpNotificationsFoldout", "Powiadomienia", "Telefon, PWA i typy powiadomień.");
    var kamratyFold = makeFoldout("szpKamratyFoldout", "Kamraty z placu", "Profil publiczny, reakcje i porównania.");

    [profileFold, badgesFold, historyFold, notifyFold, kamratyFold].forEach(function(f){
      if(f.parentNode !== wrap) wrap.appendChild(f);
    });

    var profileBody = bodyOf(profileFold);
    var basic = document.getElementById("szpBasicInfo");
    if(!basic){
      basic = document.createElement("div");
      basic.id = "szpBasicInfo";
      basic.className = "szp-basic-info";
    }

    ["pLogin","pEmail","pRanking","pVoivodeship","pCity"].forEach(function(id){
      var span = document.getElementById(id);
      var row = span && span.closest ? span.closest(".profile-row") : null;
      if(row) basic.appendChild(row);
    });
    move(profileBody, basic);

    var locForm = document.getElementById("locationForm");
    if(locForm) move(profileBody, locForm);

    var mailing = document.getElementById("szpMailingBox");
    if(mailing) move(profileBody, mailing);

    var tech = document.getElementById("szpTechnicalActions");
    if(!tech){
      tech = document.createElement("div");
      tech.id = "szpTechnicalActions";
      tech.className = "szp-technical-actions";
    }

    var toggle = document.getElementById("toggleRankingBtn");
    var del = document.getElementById("deleteRequestBtn");
    if(toggle) tech.appendChild(toggle);
    if(del) tech.appendChild(del);
    if((toggle || del) && tech.parentNode !== profileBody) profileBody.appendChild(tech);

    var ach = document.getElementById("achievementsBox");
    if(ach) move(bodyOf(badgesFold), ach);

    var results = document.getElementById("resultsBox");
    if(results) move(bodyOf(historyFold), results);

    var notify = document.getElementById("szpNotifyCard");
    if(notify) move(bodyOf(notifyFold), notify);

    var kamraty = document.getElementById("kamratyPanel");
    if(kamraty) move(bodyOf(kamratyFold), kamraty);

    removeSubHeads(profile, ["Odznaki","Dane do statystyk","Ostatnie wyniki"]);
  }

  function cleanupEmptyActions(profile){
    $all(".profile-actions", profile).forEach(function(el){
      if(!el.children.length) el.remove();
    });
  }

  function normalizeProfile(){
    if(applying){
      scheduled = true;
      return;
    }

    applying = true;

    try{
      injectStyle();
      installWeeklyPatch();

      var profile = document.getElementById("profileCard");

      if(!profile || profile.classList.contains("hidden")){
        document.body.classList.remove("szp-account-dashboard");
        return;
      }

      document.body.classList.add("szp-account-dashboard");

      ensureProfileMain(profile);

      var progress = document.getElementById("profileProgress");
      if(progress && progress.parentNode !== profile){
        var main = document.getElementById("szpProfileMain");
        if(main) main.insertAdjacentElement("afterend", progress);
        else profile.appendChild(progress);
      }

      ensureMainActions(profile);
      arrangeFoldouts(profile);
      cleanupEmptyActions(profile);

    }catch(e){
      console.warn("konto dashboard v50 error", e);
    }finally{
      applying = false;
      if(scheduled){
        scheduled = false;
        setTimeout(normalizeProfile, 120);
      }
    }
  }

  function requestNormalize(){
    if(scheduled) return;
    scheduled = true;
    setTimeout(function(){
      scheduled = false;
      normalizeProfile();
    }, 120);
  }

  function installObserver(){
    if(observerInstalled) return;
    observerInstalled = true;

    try{
      new MutationObserver(function(mutations){
        if(applying) return;
        var relevant = mutations.some(function(m){
          if(!m.addedNodes || !m.addedNodes.length) return false;
          return Array.prototype.slice.call(m.addedNodes).some(function(n){
            return n && n.nodeType === 1 && (
              n.id === "szpNotifyCard" ||
              n.id === "kamratyPanel" ||
              n.id === "szpMailingBox" ||
              n.id === "achievementsBox" ||
              n.id === "resultsBox" ||
              n.querySelector && (
                n.querySelector("#szpNotifyCard") ||
                n.querySelector("#kamratyPanel") ||
                n.querySelector("#szpMailingBox")
              )
            );
          });
        });
        if(relevant) requestNormalize();
      }).observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }

  function boot(){
    console.info("Szpilplac konto-dashboard.js " + VERSION);
    injectStyle();
    installWeeklyPatch();
    installObserver();

    normalizeProfile();

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      installWeeklyPatch();
      normalizeProfile();
      if(tries >= 24) clearInterval(timer);
    }, 500);
  }

  window.SZP_KONTO_DASHBOARD = {
    version: VERSION,
    refresh: normalizeProfile
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
