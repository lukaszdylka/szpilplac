/* Szpilplac player-menu-common.js v130 */
(function(){
  "use strict";
  var VERSION="v130";
  var observer=null;
  var ensureBusy=false;

  function addStyle(){
    if(document.getElementById("szp-player-menu-common-style"))return;
    var st=document.createElement("style");
    st.id="szp-player-menu-common-style";
    st.textContent=".player-menu,#playerMenu{position:fixed!important;z-index:9999!important;width:300px!important;min-width:300px!important;max-width:min(300px,calc(100vw - 24px))!important;box-sizing:border-box!important;padding:14px!important;overflow:visible!important;white-space:normal!important}.player-menu *,#playerMenu *{box-sizing:border-box!important;max-width:100%!important}.player-menu-actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;width:100%!important}.player-menu-actions a,.player-menu-actions button{width:100%!important;min-height:44px!important}@media(max-width:560px){.player-menu,#playerMenu{left:12px!important;right:12px!important;top:70px!important;width:auto!important;min-width:0!important;max-width:none!important;max-height:calc(100dvh - 84px)!important;overflow:auto!important}}";
    document.head.appendChild(st);
  }

  function findButton(){return document.getElementById("playerMenuBtn")||document.querySelector("[data-player-menu-btn],.account-btn,.player-menu-btn");}
  function findMenu(){return document.getElementById("playerMenu")||document.querySelector("[data-player-menu],.player-menu");}

  function langLabel(){
    var current=localStorage.getItem("familock_lang")||"pl";
    return current==="szl"?"Język: śląski":"Język: polski";
  }

  function toggleLanguage(){
    var current=localStorage.getItem("familock_lang")||"pl";
    localStorage.setItem("familock_lang",current==="szl"?"pl":"szl");
    location.reload();
  }

  function toggleTheme(){
    var btn=document.getElementById("themeBtn");
    if(btn){btn.click();return;}
    var current=localStorage.getItem("szpilplac_theme")||"light";
    var next=current==="dark"?"light":"dark";
    localStorage.setItem("szpilplac_theme",next);
    document.documentElement.setAttribute("data-theme",next);
  }

  function openHelp(){
    var btn=document.getElementById("helpBtn");
    if(btn){btn.click();return;}
    location.href="nowosci.html";
  }

  function ensureUtilities(){
    if(ensureBusy)return;
    var menu=findMenu();
    if(!menu)return;
    if(menu.querySelector(".szp-player-utilities"))return;
    ensureBusy=true;
    var wrap=document.createElement("div");
    wrap.className="szp-player-utilities";
    wrap.innerHTML=
      '<div class="szp-player-utilities-label">Ustawienia i skróty</div>'+
      '<div class="szp-player-utilities-grid">'+
        '<button type="button" data-szp-util="language"><span>'+langLabel()+'</span><span>↔</span></button>'+
        '<button type="button" data-szp-util="theme"><span>Zmień motyw</span><span>◐</span></button>'+
        '<button type="button" data-szp-util="help"><span>O Szpilplacu</span><span>?</span></button>'+
        '<a href="https://buycoffee.to/wspolnotafamilocka" target="_blank" rel="noopener"><span>Postaw kawę</span><span>↗</span></a>'+
      '</div>';
    menu.appendChild(wrap);
    wrap.querySelector('[data-szp-util="language"]').addEventListener("click",toggleLanguage);
    wrap.querySelector('[data-szp-util="theme"]').addEventListener("click",toggleTheme);
    wrap.querySelector('[data-szp-util="help"]').addEventListener("click",openHelp);
    ensureBusy=false;
  }

  function position(){
    addStyle();
    ensureUtilities();
    var menu=findMenu(),btn=findButton();
    if(!menu||!btn)return;
    var isOpen=menu.classList.contains("open")||menu.getAttribute("aria-hidden")==="false"||getComputedStyle(menu).display!=="none";
    if(!isOpen)return;
    var vw=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0);
    if(vw<=560){
      menu.style.left="12px";menu.style.right="12px";menu.style.top="70px";menu.style.width="auto";menu.style.minWidth="0";menu.style.maxWidth="none";
      return;
    }
    var rect=btn.getBoundingClientRect(),width=Math.min(300,vw-24),left=Math.round(rect.right-width);
    if(left<12)left=12;
    if(left+width>vw-12)left=vw-width-12;
    menu.style.left=left+"px";menu.style.right="auto";menu.style.top=Math.round(rect.bottom+10)+"px";menu.style.width=width+"px";menu.style.minWidth=width+"px";menu.style.maxWidth=width+"px";
  }

  function watchMenu(){
    var menu=findMenu();
    if(!menu||observer)return;
    try{
      observer=new MutationObserver(function(){
        setTimeout(function(){ensureUtilities();position();},0);
      });
      observer.observe(menu,{childList:true,subtree:false});
    }catch(e){}
  }

  function boot(){
    addStyle();
    ensureUtilities();
    watchMenu();
    position();
    document.addEventListener("click",function(){setTimeout(ensureUtilities,0);setTimeout(position,20);},true);
    window.addEventListener("resize",position);
    window.addEventListener("scroll",position,true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot); else boot();
  window.SZP_PLAYER_MENU={version:VERSION,position:position,ensureUtilities:ensureUtilities};
  console.info("Szpilplac player-menu-common.js "+VERSION);
})();
