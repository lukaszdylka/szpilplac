/* Szpilplac legacy analytics loader */
(function(){
  "use strict";

  if(window.SZP_SITE_EVENTS||document.getElementById("szp-site-events"))return;

  var version=window.SZP_BUILD_ID||"2026.08.02.1";
  var script=document.createElement("script");
  script.id="szp-site-events";
  script.src="/site-events.js?v="+encodeURIComponent(version);
  script.async=false;
  script.onerror=function(){
    console.error("Nie udało się załadować modułu zdarzeń Szpilplacu.");
    try{document.dispatchEvent(new CustomEvent("szp:site-events-load-error"));}catch(error){}
  };
  document.head.appendChild(script);
})();
