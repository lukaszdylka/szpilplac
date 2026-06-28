(function(){
  "use strict";
  var href="https://buycoffee.to/wspolnotafamilocka";
  if(document.querySelector(".familock-coffee-top")) return;

  function svg(){return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"></path><path d="M16 10h2.2a2.2 2.2 0 0 1 0 4.4H16"></path><path d="M7 4.5c0 .8-.7.9-.7 1.6"></path><path d="M10 4.5c0 .8-.7.9-.7 1.6"></path><path d="M13 4.5c0 .8-.7.9-.7 1.6"></path><path d="M4 20h13"></path></svg>';}

  function makeLink(){
    var a=document.createElement("a");
    a.href=href;
    a.target="_blank";
    a.rel="noopener";
    a.className="icon-btn familock-coffee-top";
    a.title="Postaw kawę";
    a.setAttribute("aria-label","Postaw kawę na buycoffee.to");
    a.innerHTML=svg();
    return a;
  }

  function injectStyle(){
    if(document.getElementById("familockCoffeeTopStyle")) return;
    var st=document.createElement("style");
    st.id="familockCoffeeTopStyle";
    st.textContent=".familock-coffee-top{flex:none;text-decoration:none}.familock-coffee-top:hover{text-decoration:none}.familock-coffee-top svg{display:block;flex:none}.familock-coffee-top:visited{color:inherit}";
    document.head.appendChild(st);
  }

  function insert(){
    var controls=document.querySelector(".controls");
    if(!controls) return false;
    injectStyle();
    var a=makeLink();
    var lang=controls.querySelector(".lang-tog");
    if(lang && lang.nextSibling) controls.insertBefore(a,lang.nextSibling);
    else controls.insertBefore(a,controls.firstChild);
    return true;
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",insert);
  else insert();
})();
