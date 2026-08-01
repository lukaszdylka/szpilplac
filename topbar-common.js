/* Szpilplac topbar-common.js */
(function(){
  "use strict";
  var FALLBACK_BUILD="2026.08.01.4";
  var updateRequested=false;
  function buildId(){return window.SZP_BUILD_ID||FALLBACK_BUILD}
  function asset(path){return path+(path.indexOf("?")===-1?"?":"&")+"v="+encodeURIComponent(buildId())}
  function loadCss(){if(document.getElementById("szp-common-css"))return;var link=document.createElement("link");link.id="szp-common-css";link.rel="stylesheet";link.href=asset("/szpilplac-common.css");document.head.appendChild(link)}
  function loadScript(id,src,done){var old=document.getElementById(id);if(old){if(done)done();return}var script=document.createElement("script");script.id=id;script.src=src;script.async=false;if(done)script.onload=done;document.head.appendChild(script)}
  function addStyle(){if(document.getElementById("szp-topbar-common-style"))return;var st=document.createElement("style");st.id="szp-topbar-common-style";st.textContent=".topbar .controls{min-width:0}.topbar [hidden]{display:none!important}";document.head.appendChild(st)}
  function isHomePage(){var path=location.pathname||"/";return path==="/"||/(^|\/)index\.html$/.test(path)}
  function loadEnhancements(){
    loadScript("szp-analytics",asset("/analytics.js"));
    loadScript("szp-games-registry",asset("/games-registry.js"),function(){
      if(isHomePage()){
        loadScript("szp-weekly-status",asset("/weekly-status.js"));
        loadScript("szp-support-coffee",asset("/support-coffee.js"));
      }
      if(location.pathname.indexOf("konto")!==-1)loadScript("szp-streak-progress",asset("/streak-progress-v2.js"));
    });
  }
  function showUpdate(registration){
    if(document.getElementById("szpUpdateToast")||!registration||!registration.waiting)return;
    var toast=document.createElement("div");toast.id="szpUpdateToast";toast.className="szp-update-toast";toast.innerHTML='<span>Dostępna jest nowa wersja Szpilplacu.</span><button type="button">Odśwież</button>';
    toast.querySelector("button").addEventListener("click",function(){if(!registration.waiting)return;updateRequested=true;registration.waiting.postMessage({type:"SKIP_WAITING"})});document.body.appendChild(toast)
  }
  function watchServiceWorker(){
    if(!("serviceWorker" in navigator))return;
    navigator.serviceWorker.addEventListener("controllerchange",function(){if(!updateRequested)return;updateRequested=false;location.reload()});
    navigator.serviceWorker.getRegistration().then(function(registration){if(!registration)return;showUpdate(registration);registration.addEventListener("updatefound",function(){var worker=registration.installing;if(!worker)return;worker.addEventListener("statechange",function(){if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate(registration)})});registration.update().catch(function(){})}).catch(function(){})
  }
  function normalize(){loadCss();addStyle();var menuButton=document.getElementById("playerMenuBtn");document.documentElement.classList.toggle("szp-compact-topbar",!!menuButton);document.querySelectorAll(".topbar .controls a.icon-btn").forEach(function(a){a.setAttribute("role","button")})}
  function start(){loadScript("szp-build-version","/build-version.js?v="+encodeURIComponent(FALLBACK_BUILD),function(){normalize();loadEnhancements();watchServiceWorker()})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  setTimeout(normalize,250);
  window.SZP_TOPBAR={version:FALLBACK_BUILD,normalize:normalize};
  console.info("Szpilplac topbar-common.js "+FALLBACK_BUILD);
})();
