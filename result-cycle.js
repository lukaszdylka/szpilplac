/* Szpilplac: jednoznaczne przejście po zakończeniu gry */
(function(){
  "use strict";

  var VERSION=window.SZP_BUILD_ID||"2026.09.11.2";

  function currentGame(){
    var p=String(location.pathname||"").toLowerCase();
    if(p.indexOf("klodka")!==-1)return "klodka";
    if(p.indexOf("/raja")!==-1)return "raja";
    if(p.indexOf("slowko")!==-1)return "slowko";
    return "";
  }

  function isSl(){
    try{
      var l=String(localStorage.getItem("familock_lang")||"").toLowerCase();
      return l==="szl"||l==="śl"||l==="sl";
    }catch(e){return false;}
  }

  function next(){
    var g=currentGame(),sl=isSl();
    if(g==="slowko")return {href:"/klodka.html",label:sl?"Szpilej w Kłōdkę":"Zagraj w Kłōdkę"};
    if(g==="klodka")return {href:"/raja/",label:sl?"Szpilej w Raję":"Zagraj w Raję"};
    if(g==="raja")return {href:"/slowko.html",label:sl?"Szpilej w Słōwko":"Zagraj w Słōwko"};
    return null;
  }

  function addStyle(){
    if(document.getElementById("szp-result-cycle-style"))return;
    var st=document.createElement("style");
    st.id="szp-result-cycle-style";
    st.textContent=
      '.szp-result-actions{display:none!important}'+
      '.szp-cycle-action{margin-top:12px}'+
      '.szp-cycle-action a{width:100%;min-height:44px;display:flex;align-items:center;justify-content:center;padding:11px 14px;border:1px solid var(--green,#2f4a39);border-radius:11px;background:var(--green,#2f4a39);color:#fff!important;font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:900;text-decoration:none;text-align:center}'+
      '.szp-cycle-action a:hover{filter:brightness(1.06)}';
    document.head.appendChild(st);
  }

  function resultHost(){
    var g=currentGame();
    if(g==="raja"){
      var r=document.getElementById("result");
      return r&&r.classList.contains("show")?r:null;
    }
    var modal=document.getElementById("modal");
    if(!modal)return null;
    var scrim=document.getElementById("scrim");
    var visible=!scrim||scrim.classList.contains("open");
    if(!visible)return null;
    if(modal.querySelector("#shareBtn")||modal.querySelector(".reveal-card")||modal.querySelector(".reveal-code"))return modal;
    return null;
  }

  function render(){
    addStyle();
    var host=resultHost(),n=next();
    if(!host||!n)return;
    var old=host.querySelector(".szp-cycle-action");
    if(!old){
      old=document.createElement("div");
      old.className="szp-cycle-action";
      old.innerHTML='<a></a>';
      host.appendChild(old);
    }
    var a=old.querySelector("a");
    a.href=n.href;
    a.textContent=n.label;
  }

  function boot(){
    if(!currentGame())return;
    addStyle();
    render();
    try{
      var obs=new MutationObserver(function(){render();});
      obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
    }catch(e){}
    document.addEventListener("click",function(){setTimeout(render,40);},true);
    window.addEventListener("storage",function(e){if(e&&e.key==="familock_lang")setTimeout(render,0);});
    console.info("Szpilplac result-cycle.js "+VERSION);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
