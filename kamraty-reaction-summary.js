/* Szpilplac kamraty-reaction-summary.js v4-css-only
   TEST: wyciszenie społecznościowych reakcji i opcji powiadomień bez ruszania logiki konta.
   Tylko CSS + pojedyncze kosmetyczne zmiany tekstu. Bez MutationObserver, bez usuwania DOM, bez RPC.
*/
(function(){
  "use strict";
  var VERSION = "v4-css-only-no-notifications";

  function injectStyle(){
    if(document.getElementById("kamratReactionHideStyle"))return;
    var st = document.createElement("style");
    st.id = "kamratReactionHideStyle";
    st.textContent = [
      "[data-kamrat-react]{display:none!important}",
      ".reaction-row{display:none!important}",
      ".reaction-title{display:none!important}",
      ".reaction-counts{display:none!important}",
      ".kr-summary{display:none!important}",
      "[data-kr-summary='1']{display:none!important}",
      "[data-szp-notify-type='kamrat_reactions']{display:none!important}",
      "#kontoNotificationsFoldout{display:none!important}",
      "#kontoNotificationsSlot{display:none!important}",
      "#szpNotifyCard{display:none!important}",
      ".szp-notify-card{display:none!important}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function lightTextCleanup(){
    try{
      var sub = document.querySelector("#kontoKamratyFoldout summary small");
      if(sub)sub.textContent = "Profil publiczny, lista kamratów i porównania.";
    }catch(e){}
  }

  function boot(){
    injectStyle();
    lightTextCleanup();
    setTimeout(lightTextCleanup, 800);
    console.info("Szpilplac kamraty-reaction-summary.js "+VERSION);
  }

  window.SZP_KAMRAT_REACTION_SUMMARY = {version:VERSION,cssOnly:true,notificationsHidden:true};
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();