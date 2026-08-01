/* Szpilplac support-coffee.js */
(function(){
  "use strict";

  var VERSION=window.SZP_BUILD_ID||"2026.08.01.2";
  var BASE_URL="https://buycoffee.to/wspolnotafamilocka";
  var URL=BASE_URL+"?utm_source=szpilplac&utm_medium=website&utm_campaign=wsparcie";

  function isHomePage(){
    var path=location.pathname||"/";
    return path==="/"||/(^|\/)index\.html$/.test(path);
  }

  function copy(){
    var lang="pl";
    try{lang=String(localStorage.getItem("familock_lang")||"pl").toLowerCase();}catch(e){}
    var sl=lang==="szl"||lang==="sl"||lang==="śl";
    return sl?{
      kicker:"Wesprzyj Szpilplac",
      title:"Podobo Ci sie Szpilplac?",
      text:"Kawa pomogo tworzyć kolejne gry i zagodki.",
      button:"Postow kawa"
    }:{
      kicker:"Wesprzyj Szpilplac",
      title:"Podoba Ci się Szpilplac?",
      text:"Kawa pomaga tworzyć kolejne gry i zagadki.",
      button:"Postaw kawę"
    };
  }

  function addStyle(){
    if(document.getElementById("szp-support-coffee-style"))return;
    var style=document.createElement("style");
    style.id="szp-support-coffee-style";
    style.textContent=
      ".szp-support-card{position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;width:100%;padding:14px;border:1px solid rgba(191,138,58,.68);border-radius:20px;background:linear-gradient(135deg,rgba(191,138,58,.18),var(--surface));color:var(--ink);box-shadow:var(--shadow);text-decoration:none;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}.szp-support-card:after{content:'';position:absolute;right:-38px;bottom:-52px;width:112px;height:112px;border:18px solid rgba(191,138,58,.11);border-radius:999px;pointer-events:none}.szp-support-card:hover{transform:translateY(-2px);border-color:var(--gold);box-shadow:0 16px 34px -22px rgba(0,0,0,.72)}.szp-support-icon{position:relative;z-index:1;flex:0 0 48px;width:48px;height:48px;display:grid;place-items:center;border:1px solid rgba(191,138,58,.48);border-radius:15px;background:rgba(191,138,58,.14);color:var(--gold)}.szp-support-copy{position:relative;z-index:1;min-width:0;flex:1}.szp-support-kicker,.szp-support-title,.szp-support-text{display:block}.szp-support-kicker{color:var(--gold);font-size:9.5px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.szp-support-title{margin-top:3px;font-family:Oswald,system-ui,sans-serif;font-size:19px;line-height:1.05;text-transform:uppercase}.szp-support-text{margin-top:4px;color:var(--ink2);font-size:11.5px;line-height:1.35}.szp-support-action{position:relative;z-index:1;flex:none;display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:8px 11px;border-radius:999px;background:var(--gold);color:#20170d;font-size:10.5px;font-weight:900;white-space:nowrap}.szp-support-card:focus-visible{outline:3px solid var(--gold);outline-offset:3px}@media(max-width:390px){.szp-support-card{align-items:flex-start;flex-wrap:wrap}.szp-support-action{margin-left:60px}}";
    document.head.appendChild(style);
  }

  function normalizeLinks(){
    document.querySelectorAll('a[href^="'+BASE_URL+'"]')
      .forEach(function(link){
        link.href=URL;
        link.rel="noopener noreferrer";
        link.setAttribute("data-support-source","szpilplac");
      });
  }

  function render(){
    normalizeLinks();
    if(!isHomePage()||document.getElementById("szpSupportCoffee"))return;
    var side=document.querySelector(".side");
    if(!side)return;

    addStyle();
    var text=copy();
    var card=document.createElement("a");
    card.id="szpSupportCoffee";
    card.className="szp-support-card";
    card.href=URL;
    card.target="_blank";
    card.rel="noopener noreferrer";
    card.setAttribute("data-support-source","szpilplac-card");
    card.setAttribute("aria-label",text.button+" — otwiera buycoffee.to w nowej karcie");
    card.innerHTML=
      '<span class="szp-support-icon" aria-hidden="true">'+
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+
          '<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"></path>'+
          '<path d="M16 10h2.2a2.2 2.2 0 0 1 0 4.4H16"></path>'+
          '<path d="M7 4.5c0 .8-.7.9-.7 1.6M10 4.5c0 .8-.7.9-.7 1.6M13 4.5c0 .8-.7.9-.7 1.6"></path>'+
          '<path d="M4 20h13"></path>'+
        '</svg>'+
      '</span>'+
      '<span class="szp-support-copy">'+
        '<span class="szp-support-kicker">'+text.kicker+'</span>'+
        '<span class="szp-support-title">'+text.title+'</span>'+
        '<span class="szp-support-text">'+text.text+'</span>'+
      '</span>'+
      '<span class="szp-support-action">'+text.button+' <span aria-hidden="true">↗</span></span>';

    var mini=document.getElementById("miniCard");
    side.insertBefore(card,mini||null);
    normalizeLinks();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
  window.SZP_SUPPORT_COFFEE={version:VERSION,render:render};
  console.info("Szpilplac support-coffee.js "+VERSION);
})();
