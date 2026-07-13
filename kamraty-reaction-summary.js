/* Szpilplac kamraty-reaction-summary.js v2-hide-only
   Bezpieczne wyłączenie reakcji bez ruszania logowania, konta, PWA ani kamratów.
*/
(function(){
  "use strict";
  var VERSION = "v2-hide-only";

  function injectStyle(){
    if(document.getElementById("kamratReactionHideStyle"))return;
    var st = document.createElement("style");
    st.id = "kamratReactionHideStyle";
    st.textContent = [
      "[data-kamrat-react],",
      ".reaction-row,",
      ".reaction-title,",
      ".reaction-counts,",
      "[data-kr-summary='1'],",
      ".kr-summary{display:none!important}"
    ].join("");
    document.head.appendChild(st);
  }

  function removeReactionNodes(){
    try{
      document.querySelectorAll("[data-kamrat-react],.reaction-row,.reaction-title,.reaction-counts,[data-kr-summary='1'],.kr-summary").forEach(function(el){
        if(el && el.parentNode)el.parentNode.removeChild(el);
      });
    }catch(e){}
  }

  function cleanCopy(){
    try{
      var kontoSub = document.querySelector("#kontoKamratyFoldout summary small");
      if(kontoSub)kontoSub.textContent = "Profil publiczny, lista kamratów i porównania z kamratami.";

      document.querySelectorAll(".kamraty-sub").forEach(function(el){
        var txt = el.textContent || "";
        if(/reakcj|komentarz|czat/i.test(txt)){
          el.textContent = txt
            .replace(/,?\s*reakcje tylko dla kamratów/ig, "")
            .replace(/\s*—\s*bez reakcji, komentarzy i czatu\.?/ig, ".")
            .replace(/bez maila, bez prywatnych danych, bez reakcji i bez spoilerów\./ig, "bez maila, bez prywatnych danych i bez spoilerów.")
            .replace(/\s{2,}/g, " ")
            .trim();
        }
      });
    }catch(e){}
  }

  function hideReactionAchievements(){
    try{
      document.querySelectorAll(".ach-card,.achievement-card,.badge-card,[data-achievement-id],[data-achievement]").forEach(function(card){
        var txt = (card.textContent || "").toLowerCase();
        if(txt.indexOf("dobre słowo") !== -1 || txt.indexOf("dobre slowo") !== -1 || txt.indexOf("przaja wom") !== -1){
          card.style.display = "none";
        }
      });
    }catch(e){}
  }

  function cleanup(){
    injectStyle();
    removeReactionNodes();
    cleanCopy();
    hideReactionAchievements();
  }

  function boot(){
    cleanup();
    [200,700,1500,3000,6000].forEach(function(ms){setTimeout(cleanup,ms);});
    try{
      new MutationObserver(cleanup).observe(document.documentElement,{childList:true,subtree:true});
    }catch(e){}
    console.info("Szpilplac kamraty-reaction-summary.js "+VERSION);
  }

  window.SZP_KAMRAT_REACTION_SUMMARY = {version:VERSION,disabled:true,cleanup:cleanup};
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
