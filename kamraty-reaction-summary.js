/* Szpilplac account-notifications compatibility v6
   Kamraty i ich reakcje zostały wycofane.
   Zachowujemy dotychczasowe ukrycie nieużywanego panelu powiadomień konta.
*/
(function(){
  "use strict";
  var VERSION="v6-no-kamraty";

  function injectStyle(){
    if(document.getElementById("accountNotificationsHideStyle"))return;
    var st=document.createElement("style");
    st.id="accountNotificationsHideStyle";
    st.textContent=[
      "#kontoNotificationsFoldout{display:none!important}",
      "details#kontoNotificationsFoldout{display:none!important}",
      "#kontoNotificationsSlot{display:none!important}",
      "#szpNotifyCard{display:none!important}",
      ".szp-notify-card{display:none!important}",
      "[data-szp-notify-type='kamrat_reactions']{display:none!important}"
    ].join("\n");
    document.head.appendChild(st);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",injectStyle);
  else injectStyle();

  window.SZP_KAMRAT_REACTION_SUMMARY={version:VERSION,retired:true,notificationsHidden:true};
  console.info("Szpilplac account notifications compatibility "+VERSION);
})();
