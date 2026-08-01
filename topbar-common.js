/* Szpilplac topbar-common.js v131 */
(function(){
  "use strict";
  var VERSION="v131";

  function loadCss(){
    if(document.getElementById("szp-common-css"))return;
    var link=document.createElement("link");
    link.id="szp-common-css";
    link.rel="stylesheet";
    link.href="/szpilplac-common.css?v=130";
    document.head.appendChild(link);
  }

  function loadScript(id,src,done){
    var old=document.getElementById(id);
    if(old){if(done)done();return;}
    var script=document.createElement("script");
    script.id=id;
    script.src=src;
    script.async=false;
    if(done)script.onload=done;
    document.head.appendChild(script);
  }

  function addStyle(){
    if(document.getElementById("szp-topbar-common-style"))return;
    var st=document.createElement("style");
    st.id="szp-topbar-common-style";
    st.textContent=".topbar .controls{min-width:0}.topbar [hidden]{display:none!important}";
    document.head.appendChild(st);
  }

  function isHomePage(){
    var path=location.pathname||"/";
    return path==="/"||/(^|\/)index\.html$/.test(path);
  }

  function loadEnhancements(){
    loadScript("szp-games-registry","/games-registry.js?v=130",function(){
      if(isHomePage()){
        loadScript("szp-weekly-status","/weekly-status.js?v=131");
      }
      if(location.pathname.indexOf("konto")!==-1){
        loadScript("szp-streak-progress","/streak-progress-v2.js?v=131");
      }
    });
  }

  function showUpdate(registration){
    if(document.getElementById("szpUpdateToast")||!registration||!registration.waiting)return;
    var toast=document.createElement("div");
    toast.id="szpUpdateToast";
    toast.className="szp-update-toast";
    toast.innerHTML='<span>Dostępna jest nowa wersja Szpilplacu.</span><button type="button">Odśwież</button>';
    toast.querySelector("button").addEventListener("click",function(){
      registration.waiting.postMessage({type:"SKIP_WAITING"});
    });
    document.body.appendChild(toast);
  }

  function watchServiceWorker(){
    if(!("serviceWorker" in navigator))return;
    var reloading=false;
    navigator.serviceWorker.addEventListener("controllerchange",function(){
      if(reloading)return;
      reloading=true;
      location.reload();
    });
    navigator.serviceWorker.getRegistration().then(function(registration){
      if(!registration)return;
      showUpdate(registration);
      registration.addEventListener("updatefound",function(){
        var worker=registration.installing;
        if(!worker)return;
        worker.addEventListener("statechange",function(){
          if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate(registration);
        });
      });
      registration.update().catch(function(){});
    }).catch(function(){});
  }

  function normalize(){
    loadCss();
    addStyle();
    var menuButton=document.getElementById("playerMenuBtn");
    document.documentElement.classList.toggle("szp-compact-topbar",!!menuButton);
    document.querySelectorAll(".topbar .controls a.icon-btn").forEach(function(a){a.setAttribute("role","button");});
  }

  function boot(){
    normalize();
    loadEnhancements();
    watchServiceWorker();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot); else boot();
  setTimeout(normalize,250);
  window.SZP_TOPBAR={version:VERSION,normalize:normalize};
  console.info("Szpilplac topbar-common.js "+VERSION);
})();
