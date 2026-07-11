/* Szpilplac player-menu-common.js v105 */
(function(){
  "use strict";
  var VERSION="v105";

  function addStyle(){
    if(document.getElementById("szp-player-menu-common-style"))return;
    var st=document.createElement("style"); st.id="szp-player-menu-common-style";
    st.textContent = ".player-menu,#playerMenu{position:fixed!important;z-index:9999!important;width:300px!important;min-width:300px!important;max-width:min(300px,calc(100vw - 24px))!important;box-sizing:border-box!important;padding:14px!important;overflow:visible!important;white-space:normal!important}.player-menu *,#playerMenu *{box-sizing:border-box!important;max-width:100%!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important}.player-menu-actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;width:100%!important}.player-menu-actions a,.player-menu-actions button{width:100%!important;min-height:44px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;text-align:left!important;line-height:1.15!important}@media(max-width:560px){.player-menu,#playerMenu{left:12px!important;right:12px!important;top:76px!important;width:auto!important;min-width:0!important;max-width:none!important}}";
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

  function isKonto(){
    return location.pathname.indexOf("konto")!==-1;
  }

  function meaningful(el){
    if(!el)return false;
    var txt=(el.textContent||"").replace(/\s+/g," ").trim().toLowerCase();
    return txt && txt.indexOf("ładuję")!==0 && txt.indexOf("laduje")!==0;
  }

  function moveUniqueIntoSlot(slotId, elementId){
    var slot=document.getElementById(slotId);
    if(!slot)return false;
    var els=Array.prototype.slice.call(document.querySelectorAll('[id="'+elementId+'"]'));
    if(!els.length)return false;
    var chosen=els.find(function(el){return slot.contains(el);}) || els.find(meaningful) || els[0];
    if(!chosen)return false;
    if(!slot.contains(chosen)){
      slot.innerHTML="";
      slot.appendChild(chosen);
    }
    Array.prototype.slice.call(document.querySelectorAll('[id="'+elementId+'"]')).forEach(function(el){
      if(el!==chosen)el.remove();
    });
    return true;
  }

  function removeEmptyDynamicFoldouts(){
    var notify=document.getElementById("kontoNotifyFoldout");
    if(notify && !notify.querySelector("#szpNotifyCard"))notify.remove();

    var extra=document.getElementById("kontoExtraFoldouts");
    if(extra && !extra.querySelector("#kamratyPanel,#szpNotifyCard"))extra.remove();
  }

  function normalizeAccountBottomFoldouts(){
    if(!isKonto())return;
    moveUniqueIntoSlot("kontoKamratySlot","kamratyPanel");
    moveUniqueIntoSlot("kontoNotificationsSlot","szpNotifyCard");
    removeEmptyDynamicFoldouts();
  }

  function installAccountBottomFix(){
    if(!isKonto()||window.SZP_KONTO_BOTTOM_FOLDOUT_FIX)return;
    window.SZP_KONTO_BOTTOM_FOLDOUT_FIX={version:"v1",refresh:normalizeAccountBottomFoldouts};
    var n=0;
    var t=setInterval(function(){
      normalizeAccountBottomFoldouts();
      n++;
      if(n>50)clearInterval(t);
    },400);
    try{
      new MutationObserver(function(){normalizeAccountBottomFoldouts();}).observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }

  function boot(){
    addStyle();
    installAccountBottomFix();
    position();
    document.addEventListener("click",function(){setTimeout(position,0);setTimeout(position,50);},true);
    window.addEventListener("resize",position);
    window.addEventListener("scroll",position,true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot); else boot();
  window.SZP_PLAYER_MENU={version:VERSION,position:position};
  console.info("Szpilplac player-menu-common.js "+VERSION);
})();