/*
  Szpilplac Konto Dashboard v60
  Jeden stabilny układ konta:
  - bez globalnych przechwytywaczy kliknięć,
  - bez dodatkowych nakładek typu drawers/cleanup,
  - rozwijane zakładki są zwykłymi przyciskami,
  - przyciski konta, formularze, PWA i Kamraty zachowują swoje listenery.
*/
(function(){
  "use strict";

  var VERSION = "v60";
  var applying = false;
  var scheduled = false;
  var observerInstalled = false;
  var weeklyPatchInstalled = false;

  function $(sel, root){ return (root || document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function txt(el){ return (el && el.textContent || "").replace(/\s+/g," ").trim(); }

  function injectStyle(){
    if(document.getElementById("szpKontoDashboardStyle")) return;
    var style = document.createElement("style");
    style.id = "szpKontoDashboardStyle";
    style.textContent = [
      "body.szp-account-dashboard header,body.szp-account-dashboard main,body.szp-account-dashboard footer{max-width:760px}",
      "body.szp-account-dashboard main{gap:14px}",
      "body.szp-account-dashboard #profileCard{padding:18px;border-radius:18px}",
      ".szp-profile-main{display:grid;gap:12px;padding:14px;border:1px solid var(--line,#c9bfa6);border-radius:16px;background:var(--surface2,#f3ecda)}",
      ".szp-profile-head{margin:0;padding:0}.szp-profile-head .hello{margin:0 0 4px!important}.szp-profile-head .intro{margin:0!important}",
      ".szp-profile-main .profile-summary{margin:0!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}",
      ".szp-profile-main .stat{padding:11px!important;border-radius:13px!important}.szp-profile-main .stat .value{font-size:23px!important}",
      ".szp-rank-path{margin:0!important;color:var(--ink2,#6a6150)!important;font-size:11.5px!important;line-height:1.35!important}",
      "body.szp-account-dashboard .profile-progress{margin:14px 0 0!important}",
      ".szp-main-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 0}",
      ".szp-main-actions .btn{width:100%;min-height:39px;display:inline-flex;align-items:center;justify-content:center;padding:9px 11px!important;font-size:12px!important;text-align:center}",
      ".szp-foldouts{display:grid;gap:9px;margin-top:14px}",
      ".szp-foldout{border:1px solid var(--line,#c9bfa6);background:var(--surface,#fbf7ee);border-radius:14px;overflow:hidden}",
      ".szp-foldout[data-open='1']{box-shadow:0 18px 42px -34px rgba(35,32,26,.65)}",
      ".szp-foldout-toggle{width:100%;border:0;background:transparent;color:inherit;padding:12px 13px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;cursor:pointer}",
      ".szp-foldout-title{display:block;font-family:Oswald,system-ui,sans-serif;font-size:18px;line-height:1.05;text-transform:uppercase;letter-spacing:.03em;color:var(--ink,#23201a)}",
      ".szp-foldout-sub{display:block;margin-top:3px;font-family:Inter,system-ui,sans-serif;font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150);font-weight:800}",
      ".szp-foldout-icon{font-size:24px;line-height:1;color:var(--gold,#bf8a3a);transform:rotate(90deg)}",
      ".szp-foldout[data-open='1'] .szp-foldout-icon{transform:rotate(-90deg)}",
      ".szp-foldout-body{display:none;border-top:1px solid var(--line,#c9bfa6);padding:12px}",
      ".szp-foldout[data-open='1']>.szp-foldout-body{display:block}",
      ".szp-basic-info{display:grid;gap:0}",
      ".szp-basic-info .profile-row{display:grid!important;grid-template-columns:96px minmax(0,1fr)!important;gap:8px!important;padding:7px 0!important;margin:0!important;font-size:12.5px!important}",
      ".szp-basic-info .profile-row span{min-width:0;overflow:hidden;text-overflow:ellipsis}",
      ".szp-technical-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}.szp-technical-actions .btn{width:100%!important;min-height:40px!important}",
      ".szp-foldout-body form{margin-top:10px!important;gap:10px!important}",
      ".szp-foldout-body #resultsBox{font-size:13px}.szp-foldout-body #resultsBox .result{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;align-items:start;padding:10px 0}.szp-foldout-body #resultsBox .result .pill{justify-self:start}.szp-foldout-body #resultsBox .result-meta{margin-top:0}",
      ".szp-foldout-body #szpNotifyCard,.szp-foldout-body #kamratyPanel{margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;border-radius:0!important}",
      ".szp-foldout-body #szpNotifyCard>h2,.szp-foldout-body #szpNotifyCard>p,.szp-foldout-body #kamratyPanel>.kamraty-head{display:none!important}",
      "body.szp-account-dashboard #profileCard>.sub-head,body.szp-account-dashboard #profileCard>.profile-row,body.szp-account-dashboard #profileCard>#locationForm,body.szp-account-dashboard #profileCard>.profile-actions,body.szp-account-dashboard #profileCard>#resultsBox,body.szp-account-dashboard #profileCard>#achievementsBox{margin-top:0!important}",
      "@media(max-width:760px){body.szp-account-dashboard header,body.szp-account-dashboard main,body.szp-account-dashboard footer{max-width:520px}body.szp-account-dashboard #profileCard{padding:16px;border-radius:16px}.szp-profile-main .profile-summary{grid-template-columns:1fr 1fr!important}.szp-main-actions{grid-template-columns:1fr}.szp-foldout-body #resultsBox .result{display:block}.szp-foldout-body #resultsBox .result-meta{margin-top:5px}}",
      "@media(max-width:420px){.szp-profile-main{padding:12px}.szp-profile-main .profile-summary{grid-template-columns:1fr 1fr!important}.szp-basic-info .profile-row{grid-template-columns:1fr!important;gap:2px!important;padding:8px 0!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function pad(n){ return String(n).padStart(2,"0"); }
  function warsawDateKey(d){
    try{
      var parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d), o = {};
      parts.forEach(function(p){ if(p.type !== "literal") o[p.type] = p.value; });
      return o.year+"-"+o.month+"-"+o.day;
    }catch(e){
      return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
    }
  }
  function todayKey(){ return warsawDateKey(new Date()); }
  function addDays(key,delta){
    var d = new Date(key+"T12:00:00Z");
    d.setUTCDate(d.getUTCDate()+delta);
    return d.getUTCFullYear()+"-"+pad(d.getUTCMonth()+1)+"-"+pad(d.getUTCDate());
  }
  function weekStart(key){ var d = new Date(key+"T12:00:00Z"); return addDays(key,-((d.getUTCDay()+6)%7)); }
  function weekKeys(){
    var start = weekStart(todayKey()), out = [];
    for(var i=0;i<7;i++) out.push(addDays(start,i));
    return out;
  }
  function rajaDayIndexRaw(){
    try{
      var p = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()), o = {};
      p.forEach(function(x){ if(x.type !== "literal") o[x.type] = Number(x.value); });
      return Math.floor((Date.UTC(o.year,o.month-1,o.day)-Date.UTC(2026,6,4))/86400000);
    }catch(e){ return 0; }
  }
  function localFinished(key){
    try{
      var raw = localStorage.getItem(key);
      if(!raw) return false;
      var st = JSON.parse(raw);
      return !!(st && st.status && st.status !== "playing");
    }catch(e){ return false; }
  }
  function localStatsDone(storeKey,dayKey){
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
      if(row && row.finished_at) played[warsawDateKey(new Date(row.finished_at))] = true;
    });
    var t = todayKey(), dayIdx = typeof window.DAY_IDX !== "undefined" ? window.DAY_IDX : "", rajaIdx = Math.max(0, rajaDayIndexRaw());
    if(localFinished("slowko_d"+dayIdx) || localFinished("klodka_d"+dayIdx) || localFinished("zorta_daily_d"+rajaIdx) || localStatsDone("zorta_daily_stats_v1",rajaIdx)) played[t] = true;
    return played;
  }
  function countCurrentWeekDays(rows){
    var played = playedDaysMap(rows), count = 0;
    weekKeys().forEach(function(k){ if(played[k]) count++; });
    return count;
  }
  function findWeeklyCard(){
    return $all(".progress-card").find(function(card){
      var kicker = $(".progress-kicker",card);
      return kicker && txt(kicker).toLowerCase().indexOf("cel tygodniowy") !== -1;
    });
  }
  function updateWeeklyGoalCard(rows){
    var card = findWeeklyCard();
    if(!card) return;
    var count = Math.max(0,Math.min(7,countCurrentWeekDays(rows)));
    var main = $(".progress-main",card), dots = $(".progress-dots",card), note = $(".progress-note",card);
    if(main) main.textContent = count+" / 7";
    if(dots){
      dots.innerHTML = "";
      for(var i=1;i<=7;i++){
        var dot = document.createElement("span");
        dot.className = "progress-dot"+(i<=count ? " on" : "");
        dot.setAttribute("aria-hidden","true");
        dots.appendChild(dot);
      }
    }
    if(note) note.textContent = count >= 7 ? "Tygodniowy cel gotowy w tym tygodniu!" : "Jeszcze "+(7-count)+" dni do celu w tym tygodniu.";
  }
  function installWeeklyPatch(){
    if(weeklyPatchInstalled) return true;
    if(typeof window.renderProfileProgress !== "function") return false;
    var original = window.renderProfileProgress;
    window.renderProfileProgress = function(rows){
      var ret = original.apply(this,arguments);
      try{ updateWeeklyGoalCard(rows); }catch(e){ console.warn("weekly goal patch error",e); }
      return ret;
    };
    weeklyPatchInstalled = true;
    return true;
  }

  function move(parent,node){
    if(!parent || !node || node === parent) return;
    if(node.contains && node.contains(parent)) return;
    if(node.parentNode !== parent) parent.appendChild(node);
  }

  function ensureProfileMain(profile){
    var main = document.getElementById("szpProfileMain");
    if(!main){
      main = document.createElement("section");
      main.id = "szpProfileMain";
      main.className = "szp-profile-main";
      profile.insertBefore(main,profile.firstChild);
    }

    var head = document.getElementById("szpProfileHead");
    if(!head){
      head = document.createElement("div");
      head.id = "szpProfileHead";
      head.className = "szp-profile-head";
    }

    var hello = document.getElementById("helloTitle");
    var intro = document.getElementById("profileIntro");
    var summary = $(".profile-summary",profile);
    var rankPath = $all(".small",profile).find(function(el){ return txt(el).indexOf("Ścieżka rang") !== -1; });

    if(hello) move(head,hello);
    if(intro) move(head,intro);
    move(main,head);
    if(summary) move(main,summary);
    if(rankPath){ rankPath.classList.add("szp-rank-path"); move(main,rankPath); }

    return main;
  }

  function makeFoldout(id,title,sub){
    var fold = document.getElementById(id);
    if(fold) return fold;

    fold = document.createElement("section");
    fold.id = id;
    fold.className = "szp-foldout";
    fold.setAttribute("data-open","0");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "szp-foldout-toggle";
    btn.setAttribute("aria-expanded","false");
    btn.innerHTML = '<span><span class="szp-foldout-title"></span><span class="szp-foldout-sub"></span></span><span class="szp-foldout-icon" aria-hidden="true">›</span>';

    $(".szp-foldout-title",btn).textContent = title;
    $(".szp-foldout-sub",btn).textContent = sub || "";

    var body = document.createElement("div");
    body.className = "szp-foldout-body";

    btn.addEventListener("click",function(){
      var open = fold.getAttribute("data-open") === "1";
      fold.setAttribute("data-open", open ? "0" : "1");
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });

    fold.appendChild(btn);
    fold.appendChild(body);
    return fold;
  }

  function bodyOf(fold){ return fold ? $(".szp-foldout-body",fold) : null; }

  function ensureMainActions(profile){
    var box = document.getElementById("szpMainActions");
    if(!box){
      box = document.createElement("div");
      box.id = "szpMainActions";
      box.className = "szp-main-actions";
    }

    var back = $('a[href="index.html"]',profile);
    var ranking = $('a[href="ranking.html"]',profile);
    var logout = document.getElementById("logoutBtn");

    if(back){
      back.textContent = "Zagraj dzisiaj";
      move(box,back);
    }
    if(ranking) move(box,ranking);
    if(logout) move(box,logout);

    var progress = document.getElementById("profileProgress");
    if(progress && progress.parentNode === profile) progress.insertAdjacentElement("afterend",box);
    else if(box.parentNode !== profile) profile.appendChild(box);

    return box;
  }

  function ensureFoldouts(profile){
    var wrap = document.getElementById("szpAccountFoldouts");
    if(!wrap){
      wrap = document.createElement("section");
      wrap.id = "szpAccountFoldouts";
      wrap.className = "szp-foldouts";
    }

    var actions = document.getElementById("szpMainActions");
    if(actions && actions.parentNode === profile) actions.insertAdjacentElement("afterend",wrap);
    else if(wrap.parentNode !== profile) profile.appendChild(wrap);

    var list = [
      makeFoldout("szpProfileDataFoldout","Profil i zgody","Dane konta, miejscowość, mailing i widoczność."),
      makeFoldout("szpAchievementsFoldout","Odznaki","Cele i nagrody bez przytłaczania panelu."),
      makeFoldout("szpHistoryFoldout","Historia wyników","Lista gier zapisanych na koncie."),
      makeFoldout("szpNotificationsFoldout","Powiadomienia","Telefon, PWA i typy powiadomień."),
      makeFoldout("szpKamratyFoldout","Kamraty z placu","Profil publiczny, reakcje i porównania.")
    ];

    list.forEach(function(f){ move(wrap,f); });
    return wrap;
  }

  function removeHeads(profile){
    $all(".sub-head",profile).forEach(function(el){
      var t = txt(el).toLowerCase();
      if(t.indexOf("odznaki") !== -1 || t.indexOf("dane do statystyk") !== -1 || t.indexOf("ostatnie wyniki") !== -1){
        el.remove();
      }
    });
  }

  function fillFoldouts(profile){
    var pBody = bodyOf(document.getElementById("szpProfileDataFoldout"));
    var aBody = bodyOf(document.getElementById("szpAchievementsFoldout"));
    var hBody = bodyOf(document.getElementById("szpHistoryFoldout"));
    var nBody = bodyOf(document.getElementById("szpNotificationsFoldout"));
    var kBody = bodyOf(document.getElementById("szpKamratyFoldout"));

    var basic = document.getElementById("szpBasicInfo");
    if(!basic){
      basic = document.createElement("div");
      basic.id = "szpBasicInfo";
      basic.className = "szp-basic-info";
    }

    ["pLogin","pEmail","pRanking","pVoivodeship","pCity"].forEach(function(id){
      var span = document.getElementById(id);
      var row = span && span.closest ? span.closest(".profile-row") : null;
      if(row) move(basic,row);
    });
    move(pBody,basic);

    var locForm = document.getElementById("locationForm");
    if(locForm) move(pBody,locForm);

    var mailing = document.getElementById("szpMailingBox");
    if(mailing) move(pBody,mailing);

    var tech = document.getElementById("szpTechnicalActions");
    if(!tech){
      tech = document.createElement("div");
      tech.id = "szpTechnicalActions";
      tech.className = "szp-technical-actions";
    }

    var toggle = document.getElementById("toggleRankingBtn");
    var del = document.getElementById("deleteRequestBtn");
    if(toggle) move(tech,toggle);
    if(del) move(tech,del);
    if((toggle || del)) move(pBody,tech);

    var ach = document.getElementById("achievementsBox");
    if(ach) move(aBody,ach);

    var results = document.getElementById("resultsBox");
    if(results) move(hBody,results);

    var notify = document.getElementById("szpNotifyCard");
    if(notify) move(nBody,notify);

    var kamraty = document.getElementById("kamratyPanel");
    if(kamraty) move(kBody,kamraty);

    removeHeads(profile);

    $all(".profile-actions",profile).forEach(function(el){
      if(!el.children.length) el.remove();
    });
  }

  function normalizeProfile(){
    if(applying){ scheduled = true; return; }
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
        if(main) main.insertAdjacentElement("afterend",progress);
        else profile.appendChild(progress);
      }

      ensureMainActions(profile);
      ensureFoldouts(profile);
      fillFoldouts(profile);
    }catch(e){
      console.warn("konto dashboard v60 error",e);
    }finally{
      applying = false;
      if(scheduled){
        scheduled = false;
        setTimeout(normalizeProfile,120);
      }
    }
  }

  function requestNormalize(){
    if(scheduled) return;
    scheduled = true;
    setTimeout(function(){
      scheduled = false;
      normalizeProfile();
    },160);
  }

  function installObserver(){
    if(observerInstalled) return;
    observerInstalled = true;
    try{
      new MutationObserver(function(mutations){
        if(applying) return;
        var relevant = mutations.some(function(m){
          return Array.prototype.slice.call(m.addedNodes || []).some(function(n){
            return n && n.nodeType === 1 && (
              n.id === "szpNotifyCard" ||
              n.id === "kamratyPanel" ||
              n.id === "szpMailingBox" ||
              n.id === "achievementsBox" ||
              n.id === "resultsBox" ||
              (n.querySelector && (n.querySelector("#szpNotifyCard") || n.querySelector("#kamratyPanel") || n.querySelector("#szpMailingBox")))
            );
          });
        });
        if(relevant) requestNormalize();
      }).observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }

  function boot(){
    console.info("Szpilplac konto-dashboard.js "+VERSION);
    injectStyle();
    installWeeklyPatch();
    installObserver();

    normalizeProfile();

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      installWeeklyPatch();
      normalizeProfile();
      if(tries >= 20) clearInterval(timer);
    },500);
  }

  window.SZP_KONTO_DASHBOARD = {version:VERSION,refresh:normalizeProfile};

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
