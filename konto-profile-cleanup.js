/*
  Szpilplac konto — cleanup profilu v3
  Naprawa formatu pliku JS + porządek w menu konta.
*/
(function(){
  "use strict";

  var VERSION = "v3";
  var cssDone = false;
  var running = false;

  function $(sel, root){ return (root || document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function addCss(){
    if(cssDone || document.getElementById("kontoProfileCleanupStyle")) return;
    cssDone = true;
    var s = document.createElement("style");
    s.id = "kontoProfileCleanupStyle";
    s.textContent = [
      "#kontoSettingsDrawer,#kontoResultsDrawer{display:none!important}",
      "#kontoCoreNote{display:none!important}",
      "#szpAccountTechFoldout{margin-top:9px!important}",
      "#szpAccountTechFoldout .profile-actions{margin:0!important;display:grid!important;grid-template-columns:1fr!important;gap:8px!important}",
      "#szpAccountTechFoldout .btn{width:100%!important;min-height:40px!important}",
      "#szpHistoryFoldout summary span:first-child{font-size:0!important}",
      "#szpHistoryFoldout summary span:first-child::before{content:'Historia wyników';font-size:18px}",
      "#szpHistoryFoldout .szp-history-sub{font-size:11.5px!important}",
      "#kontoMiniActions{margin:12px 0 16px!important}",
      "@media(max-width:760px){#szpAccountTechFoldout .profile-actions{grid-template-columns:1fr!important}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function text(el){ return (el && el.textContent || "").replace(/\s+/g," ").trim(); }

  function makeFoldout(id, title, sub){
    var d = document.getElementById(id);
    if(d) return d;
    d = document.createElement("details");
    d.id = id;
    d.className = "szp-foldout";
    var summary = document.createElement("summary");
    summary.innerHTML = sub
      ? '<span>'+title+'<span class="szp-history-sub">'+sub+'</span></span>'
      : '<span>'+title+'</span>';
    var body = document.createElement("div");
    body.className = "szp-foldout-body";
    d.appendChild(summary);
    d.appendChild(body);
    return d;
  }

  function bodyOf(foldout){ return foldout ? $(".szp-foldout-body", foldout) : null; }

  function moveInto(parent, node){
    if(!parent || !node || node === parent) return;
    if(node.contains && node.contains(parent)) return;
    parent.appendChild(node);
  }

  function removeSubHeads(profile, phrases){
    if(!profile) return;
    $all(".sub-head", profile).forEach(function(el){
      var t = text(el).toLowerCase();
      if(phrases.some(function(p){ return t.indexOf(String(p).toLowerCase()) !== -1; })) el.remove();
    });
  }

  function ensureSide(){ return document.getElementById("szpDashboardSide"); }

  function moveProfileRowsToSide(side){
    var basic = document.getElementById("szpBasicInfo");
    if(!basic){
      basic = document.createElement("div");
      basic.id = "szpBasicInfo";
      basic.className = "szp-basic-info";
      var title = $(".szp-side-title", side);
      if(title) title.insertAdjacentElement("afterend", basic);
      else side.insertBefore(basic, side.firstChild);
    }
    ["pLogin","pEmail","pRanking","pVoivodeship","pCity"].forEach(function(id){
      var span = document.getElementById(id);
      var row = span && span.closest ? span.closest(".profile-row") : null;
      if(row) basic.appendChild(row);
    });
  }

  function moveLocationToSide(profile, side){
    var locForm = document.getElementById("locationForm");
    if(!locForm) return;
    removeSubHeads(profile, ["Dane do statystyk"]);
    var loc = makeFoldout("szpLocationFoldout", "Dane do statystyk", "");
    moveInto(bodyOf(loc), locForm);
    if(loc.parentNode !== side){
      var basic = document.getElementById("szpBasicInfo");
      if(basic && basic.parentNode === side) basic.insertAdjacentElement("afterend", loc);
      else side.appendChild(loc);
    }
  }

  function moveMailingToSide(side){
    var mailingBlock = document.getElementById("szpMailingBox");
    if(!mailingBlock) return;
    var mailing = makeFoldout("szpMailingFoldout", "Mailing i zgody", "");
    mailing.classList.add("szp-mailing-compact");
    moveInto(bodyOf(mailing), mailingBlock);
    if(mailing.parentNode !== side){
      var loc = document.getElementById("szpLocationFoldout");
      if(loc && loc.parentNode === side) loc.insertAdjacentElement("afterend", mailing);
      else side.appendChild(mailing);
    }
  }

  function moveAccountTechToSide(side){
    var toggle = document.getElementById("toggleRankingBtn");
    var del = document.getElementById("deleteRequestBtn");
    if(!toggle && !del) return;
    var tech = makeFoldout("szpAccountTechFoldout", "Widoczność i konto", "Publiczny ranking i usuwanie konta.");
    var body = bodyOf(tech);
    var actions = $("#szpAccountTechActions", tech);
    if(!actions){
      actions = document.createElement("div");
      actions.id = "szpAccountTechActions";
      actions.className = "profile-actions";
      body.appendChild(actions);
    }
    if(toggle) actions.appendChild(toggle);
    if(del) actions.appendChild(del);
    if(tech.parentNode !== side){
      var anchor = document.getElementById("szpMailingFoldout") || document.getElementById("szpLocationFoldout") || document.getElementById("szpBasicInfo");
      if(anchor && anchor.parentNode === side) anchor.insertAdjacentElement("afterend", tech);
      else side.appendChild(tech);
    }
  }

  function restoreMainActions(side){
    var actionsPanel = document.getElementById("szpActionsPanel");
    if(!actionsPanel) return;
    var actions = $(".profile-actions", actionsPanel);
    if(!actions){
      actions = document.createElement("div");
      actions.className = "profile-actions";
      actionsPanel.appendChild(actions);
    }
    var back = $('a[href="index.html"]');
    var ranking = $('a[href="ranking.html"]');
    var logout = document.getElementById("logoutBtn");
    if(back && !actions.contains(back)) actions.appendChild(back);
    if(ranking && !actions.contains(ranking)) actions.appendChild(ranking);
    if(logout && !actions.contains(logout)) actions.appendChild(logout);
    if(actionsPanel.parentNode !== side) side.appendChild(actionsPanel);
  }

  function cleanupResults(profile){
    if(!profile) return;
    var results = document.getElementById("resultsBox");
    var historyPanel = document.getElementById("szpHistoryPanel");
    if(!historyPanel){
      historyPanel = document.createElement("section");
      historyPanel.id = "szpHistoryPanel";
      historyPanel.className = "szp-history-panel";
      profile.appendChild(historyPanel);
    }
    if(results){
      var hist = makeFoldout("szpHistoryFoldout", "Historia wyników", "Lista gier zapisanych na koncie.");
      moveInto(bodyOf(hist), results);
      if(hist.parentNode !== historyPanel) historyPanel.appendChild(hist);
    }
    removeSubHeads(profile, ["Ostatnie wyniki"]);
    var broken = document.getElementById("kontoResultsDrawer");
    if(broken) broken.remove();
  }

  function removeTopDrawers(){
    ["kontoSettingsDrawer","kontoResultsDrawer"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.remove();
    });
  }

  function tick(){
    if(running) return;
    running = true;
    try{
      addCss();
      var profile = document.getElementById("profileCard");
      if(!profile || profile.classList.contains("hidden")) return;
      var side = ensureSide();
      if(!side) return;
      moveProfileRowsToSide(side);
      moveLocationToSide(profile, side);
      moveMailingToSide(side);
      moveAccountTechToSide(side);
      restoreMainActions(side);
      cleanupResults(profile);
      removeTopDrawers();
      console.info("Szpilplac konto cleanup applied " + VERSION);
    }catch(e){
      console.warn("konto profile cleanup error", e);
    }finally{
      running = false;
    }
  }

  function boot(){
    if(location.pathname.indexOf("konto") === -1) return;
    tick();
    var timer = setInterval(tick, 500);
    setTimeout(function(){ clearInterval(timer); }, 30000);
    try{
      new MutationObserver(function(){ setTimeout(tick, 70); }).observe(document.body, {
        childList:true,
        subtree:true,
        attributes:true,
        attributeFilter:["class","style","data-open"]
      });
    }catch(e){}
    console.info("Szpilplac konto-profile-cleanup.js " + VERSION);
  }

  window.SZP_KONTO_PROFILE_CLEANUP = { version: VERSION, refresh: tick };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
