/*
  Szpilplac Konto Dashboard v36
  -----------------------------
  Porządkuje panel profilu gracza:
  - szerszy układ na PC
  - kompaktowy nagłówek z avatarem po prawej
  - statystyki jako główny blok
  - dane/mailing zwijane
  - historia wyników jako lista do rozwinięcia
*/

(function(){
  "use strict";

  var VERSION = "v36";
  var applying = false;
  var queued = false;

  function injectStyle(){
    if(document.getElementById("szpKontoDashboardStyle"))return;

    var style = document.createElement("style");
    style.id = "szpKontoDashboardStyle";
    style.textContent = `
      body.szp-account-dashboard header,
      body.szp-account-dashboard main,
      body.szp-account-dashboard footer{
        max-width:980px;
      }

      body.szp-account-dashboard main{
        gap:16px;
      }

      body.szp-account-dashboard #profileCard{
        padding:22px;
        border-radius:18px;
      }

      .szp-dashboard-grid{
        display:grid;
        grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);
        gap:14px;
        align-items:start;
      }

      .szp-dashboard-panel{
        background:var(--surface2,#f3ecda);
        border:1px solid var(--line,#c9bfa6);
        border-radius:15px;
        padding:14px;
        min-width:0;
      }

      .szp-dashboard-hero{
        display:grid;
        gap:12px;
      }

      .szp-dashboard-hero #szpProfileHead,
      .szp-dashboard-hero .szp-profile-head{
        margin:0;
        padding:0;
      }

      .szp-dashboard-hero .profile-summary{
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
        margin:0;
      }

      .szp-dashboard-hero .stat{
        padding:11px;
        border-radius:13px;
      }

      .szp-dashboard-hero .stat .value{
        font-size:23px;
      }

      .szp-rank-path{
        font-size:11.5px!important;
        margin:0!important;
        color:var(--ink2,#6a6150);
        line-height:1.35;
      }

      .szp-side-title{
        font-family:Oswald,system-ui,sans-serif;
        font-size:18px;
        text-transform:uppercase;
        letter-spacing:.03em;
        margin:0 0 8px;
        line-height:1.05;
      }

      .szp-basic-info{
        display:grid;
        gap:0;
        margin-bottom:10px;
      }

      .szp-basic-info .profile-row{
        grid-template-columns:92px minmax(0,1fr);
        gap:8px;
        padding:7px 0;
        font-size:12.5px;
      }

      .szp-basic-info .profile-row span{
        min-width:0;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .szp-foldout{
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface,#fbf7ee);
        border-radius:13px;
        margin-top:9px;
        overflow:hidden;
      }

      .szp-foldout summary{
        list-style:none;
        cursor:pointer;
        padding:11px 12px;
        font-family:Oswald,system-ui,sans-serif;
        font-size:15px;
        text-transform:uppercase;
        letter-spacing:.03em;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }

      .szp-foldout summary::-webkit-details-marker{
        display:none;
      }

      .szp-foldout summary::after{
        content:"›";
        font-size:22px;
        line-height:1;
        color:var(--gold,#bf8a3a);
        transform:rotate(90deg);
        transition:transform .15s ease;
      }

      .szp-foldout[open] summary::after{
        transform:rotate(-90deg);
      }

      .szp-foldout-body{
        border-top:1px solid var(--line,#c9bfa6);
        padding:12px;
      }

      .szp-foldout-body form{
        gap:10px;
      }

      .szp-actions-panel{
        margin-top:10px;
      }

      .szp-actions-panel .profile-actions{
        margin-top:0;
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
      }

      .szp-actions-panel .profile-actions .btn{
        padding:10px 11px;
        font-size:12px;
        min-width:0;
        width:100%;
      }

      .szp-history-panel{
        margin-top:14px;
      }

      .szp-history-panel .szp-foldout{
        margin-top:0;
      }

      .szp-history-panel .szp-foldout summary{
        font-size:18px;
        padding:13px 14px;
      }

      .szp-history-sub{
        display:block;
        font-family:Inter,system-ui,sans-serif;
        font-size:11.5px;
        text-transform:none;
        letter-spacing:0;
        color:var(--ink2,#6a6150);
        font-weight:800;
        margin-top:3px;
      }

      .szp-history-panel #resultsBox{
        font-size:13px;
      }

      .szp-history-panel .result{
        display:grid;
        grid-template-columns:auto 1fr;
        gap:6px 10px;
        align-items:start;
        padding:10px 0;
      }

      .szp-history-panel .result .pill{
        justify-self:start;
      }

      .szp-history-panel .result-meta{
        margin-top:0;
      }

      .szp-mailing-compact .szp-foldout-body > *:first-child{
        margin-top:0;
      }

      body.szp-account-dashboard #profileCard > .sub-head,
      body.szp-account-dashboard #profileCard > .profile-row,
      body.szp-account-dashboard #profileCard > #locationForm,
      body.szp-account-dashboard #profileCard > .profile-actions,
      body.szp-account-dashboard #profileCard > #resultsBox{
        margin-top:0;
      }

      @media(max-width:760px){
        body.szp-account-dashboard header,
        body.szp-account-dashboard main,
        body.szp-account-dashboard footer{
          max-width:520px;
        }

        body.szp-account-dashboard #profileCard{
          padding:18px;
          border-radius:14px;
        }

        .szp-dashboard-grid{
          grid-template-columns:1fr;
        }

        .szp-dashboard-hero .profile-summary{
          grid-template-columns:1fr 1fr;
        }

        .szp-actions-panel .profile-actions{
          grid-template-columns:1fr;
        }

        .szp-history-panel .result{
          display:block;
        }

        .szp-history-panel .result-meta{
          margin-top:5px;
        }
      }

      @media(max-width:420px){
        body.szp-account-dashboard #profileCard{
          padding:16px;
        }

        .szp-dashboard-hero .profile-summary{
          grid-template-columns:1fr 1fr;
          gap:8px;
        }

        .szp-basic-info .profile-row{
          grid-template-columns:1fr;
          gap:2px;
          padding:8px 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function isHidden(el){
    return !el || el.classList.contains("hidden") || el.offsetParent === null;
  }

  function textOf(el){
    return (el && el.textContent || "").replace(/\s+/g," ").trim();
  }

  function findSubHead(profile, phrase){
    return Array.prototype.slice.call(profile.querySelectorAll(".sub-head")).find(function(el){
      return textOf(el).toLowerCase().indexOf(phrase.toLowerCase()) !== -1;
    });
  }

  function directChildContaining(profile, selector){
    var node = profile.querySelector(selector);
    if(!node)return null;

    var cur = node;
    while(cur && cur.parentNode && cur.parentNode !== profile){
      cur = cur.parentNode;
    }
    return cur && cur !== profile ? cur : null;
  }

  function ensureProfileHeader(profile){
    var head = document.getElementById("szpProfileHead");
    if(head)return head;

    var hello = document.getElementById("helloTitle");
    var intro = document.getElementById("profileIntro");
    if(!hello)return null;

    head = document.createElement("div");
    head.id = "szpProfileHead";
    head.className = "szp-profile-head";

    var left = document.createElement("div");
    left.id = "szpProfileTitlebox";
    left.className = "szp-profile-titlebox";

    hello.parentNode.insertBefore(head, hello);
    left.appendChild(hello);
    if(intro)left.appendChild(intro);
    head.appendChild(left);

    return head;
  }

  function makeFoldout(id, title, sub){
    var details = document.getElementById(id);
    if(details)return details;

    details = document.createElement("details");
    details.id = id;
    details.className = "szp-foldout";

    var summary = document.createElement("summary");
    summary.innerHTML = sub
      ? '<span>'+title+'<span class="szp-history-sub">'+sub+'</span></span>'
      : '<span>'+title+'</span>';

    var body = document.createElement("div");
    body.className = "szp-foldout-body";

    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  function moveIfExists(parent, node){
    if(node && node.parentNode !== parent)parent.appendChild(node);
  }

  function normalizeProfile(){
    if(applying){
      queued = true;
      return;
    }

    applying = true;

    try{
      injectStyle();

      var profile = document.getElementById("profileCard");
      if(!profile || profile.classList.contains("hidden")){
        document.body.classList.remove("szp-account-dashboard");
        return;
      }

      document.body.classList.add("szp-account-dashboard");
      profile.classList.add("szp-dashboard-ready");

      var grid = document.getElementById("szpDashboardGrid");
      if(!grid){
        grid = document.createElement("div");
        grid.id = "szpDashboardGrid";
        grid.className = "szp-dashboard-grid";
        profile.insertBefore(grid, profile.firstChild);
      }

      var hero = document.getElementById("szpDashboardHero");
      if(!hero){
        hero = document.createElement("section");
        hero.id = "szpDashboardHero";
        hero.className = "szp-dashboard-panel szp-dashboard-hero";
        grid.appendChild(hero);
      }

      var side = document.getElementById("szpDashboardSide");
      if(!side){
        side = document.createElement("aside");
        side.id = "szpDashboardSide";
        side.className = "szp-dashboard-panel szp-dashboard-side";
        side.innerHTML = '<div class="szp-side-title">Profil</div>';
        grid.appendChild(side);
      }

      var head = ensureProfileHeader(profile);
      var summary = profile.querySelector(".profile-summary");
      var rankPath = Array.prototype.slice.call(profile.querySelectorAll(".small")).find(function(el){
        return textOf(el).indexOf("Ścieżka rang") !== -1;
      });

      moveIfExists(hero, head);
      moveIfExists(hero, summary);
      if(rankPath){
        rankPath.classList.add("szp-rank-path");
        moveIfExists(hero, rankPath);
      }

      var basic = document.getElementById("szpBasicInfo");
      if(!basic){
        basic = document.createElement("div");
        basic.id = "szpBasicInfo";
        basic.className = "szp-basic-info";
        var title = side.querySelector(".szp-side-title");
        if(title && title.nextSibling)side.insertBefore(basic, title.nextSibling);
        else side.appendChild(basic);
      }

      Array.prototype.slice.call(profile.querySelectorAll(".profile-row")).forEach(function(row){
        basic.appendChild(row);
      });

      var locForm = document.getElementById("locationForm");
      if(locForm){
        var locHead = findSubHead(profile, "Dane do statystyk");
        if(locHead && locHead.parentNode)locHead.parentNode.removeChild(locHead);

        var loc = makeFoldout("szpLocationFoldout", "Dane do statystyk");
        var locBody = loc.querySelector(".szp-foldout-body");
        moveIfExists(locBody, locForm);
        if(loc.parentNode !== side)side.appendChild(loc);
      }

      var actions = profile.querySelector(".profile-actions");
      if(actions){
        var actionsPanel = document.getElementById("szpActionsPanel");
        if(!actionsPanel){
          actionsPanel = document.createElement("div");
          actionsPanel.id = "szpActionsPanel";
          actionsPanel.className = "szp-actions-panel";
        }
        moveIfExists(actionsPanel, actions);
        if(actionsPanel.parentNode !== side)side.appendChild(actionsPanel);
      }

      var mailingBlock = directChildContaining(profile, "#szpMarketingConsent") || directChildContaining(profile, "#szpSaveMarketing");
      if(mailingBlock && !mailingBlock.closest("#szpMailingFoldout")){
        var mailing = makeFoldout("szpMailingFoldout", "Mailing i zgody");
        mailing.classList.add("szp-mailing-compact");
        var mailingBody = mailing.querySelector(".szp-foldout-body");
        moveIfExists(mailingBody, mailingBlock);
        if(mailing.parentNode !== side)side.appendChild(mailing);
      }

      var results = document.getElementById("resultsBox");
      if(results){
        var resHead = findSubHead(profile, "Ostatnie wyniki");
        if(resHead && resHead.parentNode)resHead.parentNode.removeChild(resHead);

        var historyPanel = document.getElementById("szpHistoryPanel");
        if(!historyPanel){
          historyPanel = document.createElement("section");
          historyPanel.id = "szpHistoryPanel";
          historyPanel.className = "szp-history-panel";
          profile.appendChild(historyPanel);
        }

        var hist = makeFoldout("szpHistoryFoldout", "Historia wyników", "Rozwiń listę ostatnich gier zapisanych na koncie");
        var histBody = hist.querySelector(".szp-foldout-body");
        moveIfExists(histBody, results);
        if(hist.parentNode !== historyPanel)historyPanel.appendChild(hist);
      }

    } finally {
      applying = false;
      if(queued){
        queued = false;
        setTimeout(normalizeProfile, 80);
      }
    }
  }

  function boot(){
    console.info("Szpilplac konto-dashboard.js "+VERSION);

    injectStyle();

    var tickCount = 0;
    var tick = setInterval(function(){
      tickCount++;
      normalizeProfile();
      if(tickCount > 60)clearInterval(tick);
    }, 250);

    var observer = new MutationObserver(function(){
      if(applying)return;
      clearTimeout(window.__szpDashboardTimer);
      window.__szpDashboardTimer = setTimeout(normalizeProfile, 120);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });

    normalizeProfile();
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
