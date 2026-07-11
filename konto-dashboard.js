/* Szpilplac Konto Dashboard v62 — awaryjne wyłączenie nakładki
   -------------------------------------------------------------
   Ten plik celowo NIE przestawia teraz elementów w panelu konta.
   Poprzednia wersja poprawiała układ profilu, ale przechwytywała
   zachowanie elementów wewnątrz konta: Kamratów, powiadomień,
   formularzy i przycisków.

   Priorytet: konto ma znowu normalnie działać.
   Układ można poprawić później bez nakładek blokujących kliknięcia.
*/
(function(){
  "use strict";
  var VERSION = "v62-disabled";

  function refresh(){
    try{
      document.body.classList.remove("szp-account-dashboard");
    }catch(e){}
  }

  window.SZP_KONTO_DASHBOARD = {
    version: VERSION,
    disabled: true,
    refresh: refresh
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refresh);
  }else{
    refresh();
  }

  console.info("Szpilplac konto-dashboard.js " + VERSION);
})();
