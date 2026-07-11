/* Szpilplac player-menu-common.js v103 */
(function(){
  "use strict";
  var VERSION="v103";

  function addStyle(){
    if(document.getElementById("szp-player-menu-common-style"))return;
    var st=document.createElement("style"); st.id="szp-player-menu-common-style";
    st.textContent = ".player-menu,#playerMenu{position:fixed!important;z-index:9999!important;width:300px!important;min-width:300px!important;max-width:min(300px,calc(100vw - 24px))!important;box-sizing:border-box!important;padding:14px!important;overflow:visible!important;white-space:normal!important}.player-menu *,#playerMenu *{box-sizing:border-box!important;max-width:100%!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important}.player-menu-actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;width:100%!important}.player-menu-actions a,.player-menu-actions button{width:100%!important;min-height:44px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;text-align:left!important;line-height:1.15!important}.szp-foldout,.szp-foldout-toggle{pointer-events:auto!important}.szp-foldout-toggle{position:relative!important;z-index:20!important}.szp-foldout-toggle *{pointer-events:none!important}@media(max-width:560px){.player-menu,#playerMenu{left:12px!important;right:12px!important;top:76px!important;width:auto!important;min-width:0!important;max-width:none!important}}";
    document.head.appendChild(st);
  }

  function findButton(){return document.getElementById("playerMenuBtn")||document.querySelector("[data-player-menu-btn],.account-btn,.player-menu-btn");}
  function findMenu(){return document.getElementById("playerMenu")||document.querySelector("[data-player-menu],.player-menu");}

  function position(){
    addStyle(); var menu=findMenu(), btn=findButton(); if(!menu||!btn)return;
    var isOpen=menu.classList.contains("open")||menu.getAttribute("aria-hidden")==="false"||getComputedStyle(menu).display!=="none";
    if(!isOpen)return;
    var vw=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0);
    if(vw<=560){menu.style.left="12px";menu.style.right="12px";menu.style.top="76px";menu.style.width="auto";menu.style.minWidth="0";menu.style.maxWidth="none";return;}
    var rect=btn.getBoundingClientRect(), width=Math.min(300,vw-24), left=Math.round(rect.right-width);
    if(left<12)left=12; if(left+width>vw-12)left=vw-width-12;
    menu.style.left=left+"px"; menu.style.right="auto"; menu.style.top=Math.round(rect.bottom+10)+"px"; menu.style.width=width+"px"; menu.style.minWidth=width+"px"; menu.style.maxWidth=width+"px";
  }

  function findFoldoutToggleAtPoint(x,y){
    var direct = document.elementFromPoint ? document.elementFromPoint(x,y) : null;
    var btn = direct && direct.closest ? direct.closest(".szp-foldout-toggle") : null;
    if(btn)return btn;
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".szp-foldout-toggle"));
    return buttons.find(function(b){
      var r = b.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null;
  }

  function toggleFoldoutFromEvent(e){
    if(!/konto\.html?$/.test(location.pathname) && location.pathname.indexOf("/konto") === -1)return;
    var x = typeof e.clientX === "number" ? e.clientX : null;
    var y = typeof e.clientY === "number" ? e.clientY : null;
    var btn = e.target && e.target.closest ? e.target.closest(".szp-foldout-toggle") : null;
    if(!btn && x !== null && y !== null)btn = findFoldoutToggleAtPoint(x,y);
    if(!btn)return;
    var fold = btn.closest(".szp-foldout");
    if(!fold)return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    var open = fold.getAttribute("data-open") === "1";
    fold.setAttribute("data-open", open ? "0" : "1");
    btn.setAttribute("aria-expanded", open ? "false" : "true");
  }

  function installFoldoutFix(){
    if(window.SZP_KONTO_FOLDOUT_HOTFIX)return;
    window.SZP_KONTO_FOLDOUT_HOTFIX = {version:"v1"};
    document.addEventListener("pointerdown", toggleFoldoutFromEvent, true);
    document.addEventListener("click", toggleFoldoutFromEvent, true);
    document.addEventListener("touchstart", function(e){
      var t = e.touches && e.touches[0];
      if(!t)return;
      toggleFoldoutFromEvent({target:e.target,clientX:t.clientX,clientY:t.clientY,preventDefault:function(){e.preventDefault();},stopPropagation:function(){e.stopPropagation();},stopImmediatePropagation:function(){if(e.stopImmediatePropagation)e.stopImmediatePropagation();}});
    }, {capture:true,passive:false});
  }

  function boot(){
    addStyle();
    installFoldoutFix();
    position();
    document.addEventListener("click",function(){setTimeout(position,0);setTimeout(position,50);},true);
    window.addEventListener("resize",position);
    window.addEventListener("scroll",position,true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot); else boot();
  window.SZP_PLAYER_MENU={version:VERSION,position:position};
  console.info("Szpilplac player-menu-common.js "+VERSION);
})();
