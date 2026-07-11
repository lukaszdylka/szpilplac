/*
  Szpilplac konto — klikane zakładki v1
  Naprawia sytuację, gdy zakładki .szp-foldout są widoczne,
  ale nie rozwijają się po kliknięciu.
*/
(function(){
  "use strict";

  var VERSION = "v1";

  function closestSummary(target){
    if(!target || !target.closest) return null;
    var summary = target.closest(".szp-foldout > summary");
    if(summary) return summary;

    /* Awaryjnie: gdy klik wpada w pierwszy element zakładki, potraktuj go jak nagłówek. */
    var fold = target.closest(".szp-foldout");
    if(fold){
      var first = fold.firstElementChild;
      if(first && first.tagName && first.tagName.toLowerCase() === "summary"){
        var rect = first.getBoundingClientRect();
        var ev = window.__szpLastFoldoutEvent;
        if(ev && ev.clientY >= rect.top && ev.clientY <= rect.bottom){
          return first;
        }
      }
    }
    return null;
  }

  function toggle(summary){
    var details = summary && summary.parentElement;
    if(!details || !details.classList || !details.classList.contains("szp-foldout")) return false;

    details.open = !details.open;
    details.setAttribute("data-open", details.open ? "1" : "0");
    summary.setAttribute("aria-expanded", details.open ? "true" : "false");

    return true;
  }

  function prepare(){
    document.querySelectorAll(".szp-foldout > summary").forEach(function(summary){
      summary.setAttribute("role", "button");
      summary.setAttribute("tabindex", "0");
      summary.setAttribute("aria-expanded", summary.parentElement && summary.parentElement.open ? "true" : "false");
    });
  }

  document.addEventListener("pointerdown", function(e){
    window.__szpLastFoldoutEvent = e;
  }, true);

  document.addEventListener("click", function(e){
    var summary = closestSummary(e.target);
    if(!summary) return;

    e.preventDefault();
    e.stopPropagation();
    toggle(summary);
  }, true);

  document.addEventListener("keydown", function(e){
    if(e.key !== "Enter" && e.key !== " ") return;

    var summary = closestSummary(e.target);
    if(!summary) return;

    e.preventDefault();
    e.stopPropagation();
    toggle(summary);
  }, true);

  function boot(){
    if(location.pathname.indexOf("konto") === -1) return;

    prepare();

    var timer = setInterval(prepare, 500);
    setTimeout(function(){ clearInterval(timer); }, 15000);

    try{
      new MutationObserver(function(){ setTimeout(prepare, 80); }).observe(document.body, {
        childList:true,
        subtree:true
      });
    }catch(e){}

    console.info("Szpilplac konto-foldout-clickfix.js " + VERSION);
  }

  window.SZP_KONTO_FOLDOUT_CLICKFIX = { version: VERSION, prepare: prepare };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
