/*
  Szpilplac konto — lekkie menu wysuwane v1

  Cel:
  - profil konta ma zostać lekki i przyjemny,
  - Powiadomienia jako menu wysuwane pod głównym profilem,
  - Kamraty jako menu wysuwane,
  - dane techniczne konta / odznaki / wyniki zwinięte,
  - bez ruszania logiki gier, Supabase, Kamratów i powiadomień.
*/
(function(){
  "use strict";

  var VERSION = "v1";
  var cssDone = false;
  var busy = false;

  function $(sel, root){ return (root || document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }

  function addCss(){
    if(cssDone || document.getElementById("kontoDrawersStyle"))return;
    cssDone = true;
    var s = document.createElement("style");
    s.id = "kontoDrawersStyle";
    s.textContent = [
      "/* Szpilplac konto drawers v1 */",
      ".konto-hero{display:none!important}",
      "#profileCard{padding:18px!important}",
      "#profileCard>.hello{margin-bottom:3px!important}",
      "#profileCard>#profileIntro{margin-bottom:12px!important}",
      "#profileCard .profile-summary{margin-top:8px!important;margin-bottom:12px!important}",
      "#profileCard .profile-progress{margin:14px 0 0!important}",
      "#profileCard .profile-actions{margin-top:14px!important}",
      "#profileCard .profile-actions .btn{min-height:38px!important;padding:9px 11px!important;font-size:12px!important}",
      ".szp-konto-drawer{margin:12px 0;border:1px solid var(--line,#c9bfa6);border-radius:18px;background:var(--surface,#fbf7ee);box-shadow:0 14px 42px -34px rgba(35,32,26,.72);overflow:hidden;color:var(--ink,#23201a)}",
      ".szp-konto-drawer.is-soft{background:linear-gradient(180deg,rgba(191,138,58,.075),rgba(191,138,58,.025))}",
      ".szp-konto-drawer[data-open='1']{box-shadow:0 18px 52px -34px rgba(35,32,26,.82)}",
      ".szp-konto-drawer-toggle{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 15px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}",
      ".szp-konto-drawer-kicker{display:block;margin-bottom:2px;color:var(--ink2,#6a6150);font-size:10px;font-weight:900;letter-spacing:.075em;text-transform:uppercase}",
      ".szp-konto-drawer-title{display:block;font-family:Oswald,system-ui,sans-serif;font-size:22px;line-height:1.02;letter-spacing:.035em;text-transform:uppercase;color:var(--ink,#23201a)}",
      ".szp-konto-drawer-lead{display:block;margin-top:4px;color:var(--ink2,#6a6150);font-size:12.5px;line-height:1.35;font-weight:600}",
      ".szp-konto-drawer-icon{width:30px;height:30px;border:1px solid var(--line,#c9bfa6);border-radius:999px;display:grid;place-items:center;background:var(--surface2,#f3ecda);color:var(--green,#2f4a39);font-weight:900;transition:transform .16s ease}",
      ".szp-konto-drawer[data-open='1'] .szp-konto-drawer-icon{transform:rotate(180deg)}",
      ".szp-konto-drawer-body{display:none;padding:0 15px 15px}",
      ".szp-konto-drawer[data-open='1']>.szp-konto-drawer-body{display:block}",
      ".szp-konto-drawer-body>.sub-head:first-child,.szp-konto-drawer-body>h2:first-child{margin-top:0!important}",
      ".szp-konto-drawer-body .profile-row{margin:8px 0!important}",
      ".szp-konto-drawer-body form{margin-top:10px!important}",
      ".szp-konto-drawer-body .kamraty-head{margin-top:0!important}",
      ".szp-konto-drawer-body .szp-notify-card,.szp-konto-drawer-body .kamraty-panel{margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important}",
      ".szp-konto-drawer-body .szp-notify-card>h2,.szp-konto-drawer-body .szp-notify-card>p{display:none!important}",
      ".szp-konto-drawer-body .kamraty-panel>.kamraty-head{display:none!important}",
      ".szp-konto-drawer-body .kamraty-grid{margin-top:0!important}",
      ".szp-konto-drawer-body .szp-notify-list{margin-top:10px!important}",
      ".szp-konto-mini-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}",
      ".szp-konto-mini-actions a,.szp-konto-mini-actions button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:8px 10px;border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font-size:12px;font-weight:900;text-decoration:none;cursor:pointer}",
      ".szp-konto-mini-actions a.primary{background:var(--green,#2f4a39);border-color:var(--green,#2f4a39);color:#fff}",
      ".szp-konto-mini-actions a:hover,.szp-konto-mini-actions button:hover{transform:translateY(-1px);color:var(--green,#2f4a39)}",
      ".szp-konto-core-note{margin:8px 0 0;color:var(--ink2,#6a6150);font-size:12px;line-height:1.4}",
      "@media(max-width:560px){#profileCard{padding:15px!important}.szp-konto-drawer-toggle{padding:13px}.szp-konto-drawer-title{font-size:20px}.szp-konto-mini-actions{grid-template-columns:1fr}.szp-konto-drawer-body{padding:0 13px 13px}}",
      "@media(prefers-reduced-motion:reduce){.szp-konto-drawer-icon{transition:none!important}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function setDrawerOpen(drawer, open){
    drawer.setAttribute("data-open", open ? "1" : "0");
    var btn = $(".szp-konto-drawer-toggle", drawer);
    if(btn)btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function makeDrawer(opts){
    var drawer = document.createElement(opts.tag || "section");
    drawer.className = "szp-konto-drawer" + (opts.soft ? " is-soft" : "");
    if(opts.id)drawer.id = opts.id;
    drawer.setAttribute("data-open", opts.open ? "1" : "0");

    var bodyId = (opts.id || ("drawer" + Math.random().toString(16).slice(2))) + "Body";
    drawer.innerHTML =
      '<button type="button" class="szp-konto-drawer-toggle" aria-expanded="'+(opts.open ? "true" : "false")+'" aria-controls="'+esc(bodyId)+'">'+
        '<span>'+
          '<span class="szp-konto-drawer-kicker">'+esc(opts.kicker || "Menu")+'</span>'+
          '<span class="szp-konto-drawer-title">'+esc(opts.title || "Sekcja")+'</span>'+
          '<span class="szp-konto-drawer-lead">'+esc(opts.lead || "")+'</span>'+
        '</span>'+
        '<span class="szp-konto-drawer-icon" aria-hidden="true">⌄</span>'+
      '</button>'+
      '<div class="szp-konto-drawer-body" id="'+esc(bodyId)+'"></div>';

    $(".szp-konto-drawer-toggle", drawer).addEventListener("click", function(){
      setDrawerOpen(drawer, drawer.getAttribute("data-open") !== "1");
    });
    return drawer;
  }

  function moveNodesToBody(drawer, nodes){
    var body = $(".szp-konto-drawer-body", drawer);
    nodes.forEach(function(n){
      if(n && n.parentNode)body.appendChild(n);
    });
  }

  function ensureMiniActions(profile){
    if(document.getElementById("kontoMiniActions"))return;
    var actions = document.createElement("div");
    actions.id = "kontoMiniActions";
    actions.className = "szp-konto-mini-actions";
    actions.innerHTML =
      '<a class="primary" href="index.html">Zagraj dzisiaj</a>'+
      '<a href="ranking.html">Ranking</a>'+
      '<button type="button" id="kontoMiniLogout">Wyloguj</button>';

    var progress = document.getElementById("profileProgress");
    if(progress && progress.parentNode)progress.parentNode.insertBefore(actions, progress.nextSibling);
    else profile.appendChild(actions);

    var logout = document.getElementById("logoutBtn");
    var mini = document.getElementById("kontoMiniLogout");
    if(mini && logout)mini.addEventListener("click", function(){ logout.click(); });
  }

  function compactProfile(){
    var profile = document.getElementById("profileCard");
    if(!profile || profile.classList.contains("hidden"))return;

    addCss();
    ensureMiniActions(profile);

    var profileIntro = document.getElementById("profileIntro");
    if(profileIntro && !document.getElementById("kontoCoreNote")){
      var note = document.createElement("p");
      note.id = "kontoCoreNote";
      note.className = "szp-konto-core-note";
      note.textContent = "Najważniejsze rzeczy zostają na wierzchu. Reszta jest niżej, do rozwinięcia.";
      var summary = $(".profile-summary", profile);
      if(summary && summary.parentNode)summary.parentNode.insertBefore(note, summary.nextSibling);
    }

    if(!document.getElementById("kontoSettingsDrawer")){
      var rows = $all(".profile-row", profile);
      var locTitle = null;
      $all(".sub-head", profile).some(function(el){
        if((el.textContent || "").toLowerCase().indexOf("dane do statystyk") !== -1){ locTitle = el; return true; }
        return false;
      });
      var locForm = document.getElementById("locationForm");
      var deleteBtn = document.getElementById("deleteRequestBtn");

      var drawer = makeDrawer({
        id:"kontoSettingsDrawer",
        title:"Ustawienia profilu",
        kicker:"Konto",
        lead:"Login, e-mail, miejscowość, widoczność i sprawy techniczne.",
        open:false
      });

      var anchor = document.getElementById("profileProgress") || $(".profile-summary", profile) || profile.firstChild;
      if(anchor && anchor.parentNode)anchor.parentNode.insertBefore(drawer, anchor.nextSibling);
      else profile.appendChild(drawer);

      var body = $(".szp-konto-drawer-body", drawer);
      rows.forEach(function(n){ body.appendChild(n); });
      if(locTitle)body.appendChild(locTitle);
      if(locForm)body.appendChild(locForm);

      var actions = $(".profile-actions", profile);
      if(actions){
        var technical = document.createElement("div");
        technical.className = "profile-actions";
        var toggle = document.getElementById("toggleRankingBtn");
        if(toggle)technical.appendChild(toggle);
        if(deleteBtn)technical.appendChild(deleteBtn);
        body.appendChild(technical);

        var back = actions.querySelector('a[href="index.html"]');
        var ranking = actions.querySelector('a[href="ranking.html"]');
        var logout = document.getElementById("logoutBtn");
        if(back || ranking || logout){
          actions.innerHTML = "";
          if(back)actions.appendChild(back);
          if(ranking)actions.appendChild(ranking);
          if(logout)actions.appendChild(logout);
        }
      }
    }

    if(!document.getElementById("kontoAchievementsDrawer")){
      var achTitle = null;
      $all(".sub-head", profile).some(function(el){
        if((el.textContent || "").toLowerCase().indexOf("odznaki") !== -1){ achTitle = el; return true; }
        return false;
      });
      var achBox = document.getElementById("achievementsBox");
      if(achBox){
        var drawer = makeDrawer({
          id:"kontoAchievementsDrawer",
          title:"Odznaki",
          kicker:"Postępy",
          lead:"Nagrody i cele są schowane, żeby panel nie przytłaczał.",
          open:false,
          soft:true
        });
        var settings = document.getElementById("kontoSettingsDrawer");
        if(settings && settings.parentNode)settings.parentNode.insertBefore(drawer, settings.nextSibling);
        else profile.appendChild(drawer);
        moveNodesToBody(drawer, [achTitle, achBox]);
      }
    }

    if(!document.getElementById("kontoResultsDrawer")){
      var resTitle = null;
      $all(".sub-head", profile).some(function(el){
        if((el.textContent || "").toLowerCase().indexOf("ostatnie wyniki") !== -1){ resTitle = el; return true; }
        return false;
      });
      var resBox = document.getElementById("resultsBox");
      if(resBox){
        var drawer = makeDrawer({
          id:"kontoResultsDrawer",
          title:"Ostatnie wyniki",
          kicker:"Historia",
          lead:"Otwórz tylko wtedy, gdy chcesz sprawdzić szczegóły.",
          open:false
        });
        var ach = document.getElementById("kontoAchievementsDrawer");
        if(ach && ach.parentNode)ach.parentNode.insertBefore(drawer, ach.nextSibling);
        else profile.appendChild(drawer);
        moveNodesToBody(drawer, [resTitle, resBox]);
      }
    }
  }

  function drawerizeExistingPanel(panel, opts){
    if(!panel || panel.getAttribute("data-szp-drawerized") === "1")return false;
    addCss();

    var drawer = makeDrawer(opts);
    panel.parentNode.insertBefore(drawer, panel);
    var body = $(".szp-konto-drawer-body", drawer);
    body.appendChild(panel);
    panel.setAttribute("data-szp-drawerized", "1");
    panel.classList.add("szp-drawerized-original");
    return true;
  }

  function placeAfterProfile(el){
    var profile = document.getElementById("profileCard");
    if(!profile || !el)return;
    var parent = profile.parentNode;
    if(!parent)return;
    var notifyDrawer = document.getElementById("notifyDrawer");
    var kamratDrawer = document.getElementById("kamratyDrawer");

    if(el.id === "szpNotifyCard"){
      var target = notifyDrawer || el;
      if(target.previousElementSibling !== profile){
        parent.insertBefore(target, profile.nextSibling);
      }
    }

    if(el.id === "kamratyPanel"){
      var targetK = kamratDrawer || el;
      var after = document.getElementById("notifyDrawer") || profile;
      if(after.nextSibling !== targetK){
        parent.insertBefore(targetK, after.nextSibling);
      }
    }
  }

  function drawerizeNotifications(){
    var panel = document.getElementById("szpNotifyCard");
    if(!panel)return;
    drawerizeExistingPanel(panel, {
      id:"notifyDrawer",
      title:"Powiadomienia",
      kicker:"Telefon i PWA",
      lead:"Wybierz, czy chcesz dostawać przypomnienia o grach, nowościach i kamratach.",
      open:false,
      soft:true
    });
    placeAfterProfile(panel);
  }

  function drawerizeKamraty(){
    var panel = document.getElementById("kamratyPanel");
    if(!panel)return;
    drawerizeExistingPanel(panel, {
      id:"kamratyDrawer",
      title:"Kamraty z placu",
      kicker:"Społeczność",
      lead:"Profil publiczny, lista kamratów, reakcje i porównania — tylko po rozwinięciu.",
      open:false,
      soft:true
    });
    placeAfterProfile(panel);
  }

  function tick(){
    if(busy)return;
    busy = true;
    try{
      compactProfile();
      drawerizeNotifications();
      drawerizeKamraty();
    }catch(e){
      console.warn("konto drawers", e);
    }finally{
      busy = false;
    }
  }

  function boot(){
    if(location.pathname.indexOf("konto") === -1)return;
    addCss();
    tick();
    var timer = setInterval(tick, 700);
    setTimeout(function(){ clearInterval(timer); }, 30000);
    try{
      new MutationObserver(function(){ setTimeout(tick, 80); }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
    }catch(e){}
  }

  window.SZP_KONTO_DRAWERS = {version:VERSION,refresh:tick};

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
