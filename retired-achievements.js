/* Szpilplac retired-achievements v1
   Historyczne rekordy zostają w bazie, ale odznaki zależne od wycofanych Kamratów
   nie są już przyznawane ani pokazywane w koncie.
*/
(function(){
  "use strict";

  var VERSION="v1";
  var RETIRED_LABELS={
    "dobre słowo":1,
    "herszt bandy":1,
    "kamraty":1,
    "na widoku":1,
    "piyrszy kamrat":1,
    "przaja wom":1,
    "swój na placu":1
  };

  function clean(){
    var box=document.getElementById("achievementsBox");
    if(!box)return;
    Array.prototype.slice.call(box.querySelectorAll(".ach-card")).forEach(function(card){
      var title=card.querySelector(".ach-title");
      var label=String(title&&title.textContent||"").trim().toLowerCase();
      if(RETIRED_LABELS[label])card.remove();
    });
  }

  function boot(){
    clean();
    var box=document.getElementById("achievementsBox");
    if(box&&window.MutationObserver){
      new MutationObserver(clean).observe(box,{childList:true,subtree:true});
    }
    setTimeout(clean,500);
    setTimeout(clean,1600);
  }

  window.SZP_RETIRED_ACHIEVEMENTS={version:VERSION,labels:Object.keys(RETIRED_LABELS)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();

  console.info("Szpilplac retired-achievements "+VERSION);
})();
