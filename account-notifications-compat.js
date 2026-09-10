/* Szpilplac account-notifications compatibility v2
   Kamraty zostały wycofane, więc ukrywamy tylko ich stare opcje powiadomień.
   Właściwy panel PWA i pozostałe ustawienia powiadomień pozostają widoczne.
*/
(function(){
  "use strict";
  var VERSION="v2";
  var RETIRED=["kamrat_reactions","kamrat_added"];

  function injectStyle(){
    if(document.getElementById("accountNotificationsCompatStyle"))return;
    var st=document.createElement("style");
    st.id="accountNotificationsCompatStyle";
    st.textContent=[
      "#kontoNotificationsFoldout{display:none!important}",
      "#kontoNotificationsSlot{display:none!important}",
      "[data-szp-notify-type='kamrat_reactions']{display:none!important}",
      "[data-szp-notify-type='kamrat_added']{display:none!important}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function retireSocialPreferences(){
    RETIRED.forEach(function(type){
      var input=document.querySelector('[data-szp-notify-type="'+type+'"]');
      if(!input)return;
      input.checked=false;
      var row=input.closest&&input.closest(".szp-notify-row");
      if(row)row.style.display="none";
    });
  }

  function boot(){
    injectStyle();
    retireSocialPreferences();
    if(window.MutationObserver){
      new MutationObserver(retireSocialPreferences).observe(document.documentElement,{childList:true,subtree:true});
    }
    setTimeout(retireSocialPreferences,500);
    setTimeout(retireSocialPreferences,1500);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();

  window.SZP_ACCOUNT_NOTIFICATIONS_COMPAT={version:VERSION,retiredTypes:RETIRED.slice()};
  console.info("Szpilplac account-notifications compatibility "+VERSION);
})();
