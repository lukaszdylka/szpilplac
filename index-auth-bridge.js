/*
  Szpilplac Index Auth Bridge disabled
  ------------------------------------
  Tymczasowo wyłączone, żeby strona główna nie blokowała się na ładowaniu konta.
*/
(function(){
  "use strict";
  console.info("Szpilplac index-auth-bridge disabled");

  function removeLegacyBar(){
    var old=document.getElementById("szpIndexAuth");
    if(old && old.parentNode)old.parentNode.removeChild(old);
  }

  function patchGuestLinks(){
    var card=document.getElementById("szpPlayerCard");
    if(!card)return;

    var label=card.querySelector(".szp-player-label");
    var isGuest=label && /bez konta|bez kōnta/i.test(label.textContent||"");
    if(!isGuest)return;

    var actions=card.querySelector(".szp-player-actions");
    if(!actions)return;

    var links=actions.querySelectorAll("a,button");
    for(var i=0;i<links.length;i++){
      if((links[i].textContent||"").toLowerCase().indexOf("zał")!==-1 || (links[i].textContent||"").toLowerCase().indexOf("kōnt")!==-1){
        links[i].setAttribute("href","konto.html#register");
      }
    }
  }

  function run(){
    removeLegacyBar();
    patchGuestLinks();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);
  else run();

  var timer=setInterval(run,300);
  setTimeout(function(){clearInterval(timer);},8000);
})();
