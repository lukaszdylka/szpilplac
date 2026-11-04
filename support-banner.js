/* Wspólna, nienachalna zachęta do wsparcia Szpilplaca. Bez zbierania danych i bez fikcyjnego licznika. */
(function(){
  "use strict";
  var GENERAL_URL="https://buycoffee.to/szpilplacfamilocka";
  var GOAL_URL="https://buycoffee.to/szpilplacfamilocka/nowa-gra-na-szpilplacu";
  var KEY="szpilplac_support_result_last_v1";
  var DAYS=14;
  function lang(){
    try{return (localStorage.getItem("familock_lang")||"pl").toLowerCase()==="szl"?"szl":"pl";}catch(e){return"pl";}
  }
  function words(){
    return lang()==="szl"?{
      goal:"Nowo szpil: Kaj to je?",body:"Szykujymy gra o miastach Ślonska: kontury, herby i ciekawe pytania. Jak chcesz, możesz dołożyć sie do jeji powstanio.",
      thanks:"Podobo Ci sie Szpilplac?",result:"Gry som darmowe. Jak chcesz pomóc robić nowe szpile, możesz postawić symboliczno kawa.",
      button:"Wesprzyj na BuyCoffee",note:"Dobrowolne wsparcie. Bez opłat za granie.",eyebrow:"Rozwijomy Szpilplac"
    }:{
      goal:"Nowa gra: Kaj to je?",body:"Przygotowujemy grę o miastach Śląska: kontury, herby i ciekawe pytania. Jeśli chcesz, możesz wesprzeć jej rozwój.",
      thanks:"Podoba Ci się Szpilplac?",result:"Wszystkie gry są darmowe. Jeśli chcesz pomóc tworzyć kolejne, możesz postawić symboliczną kawę.",
      button:"Wesprzyj na BuyCoffee",note:"Dobrowolnie, bez opłat za granie.",eyebrow:"Rozwijamy Szpilplac"
    };
  }
  function element(tag,cls,value){
    var el=document.createElement(tag);if(cls)el.className=cls;if(value)el.textContent=value;return el;
  }
  function card(kind){
    var w=words(),section=element("section","szp-support szp-support--"+kind);
    section.setAttribute("aria-label","Dobrowolne wsparcie Szpilplaca");
    section.appendChild(element("p","szp-support__eyebrow",w.eyebrow));
    section.appendChild(element("h2","szp-support__heading",kind==="result"?w.thanks:w.goal));
    section.appendChild(element("p","szp-support__copy",kind==="result"?w.result:w.body));
    var actions=element("div","szp-support__actions");
    var link=element("a","szp-support__link",kind==="result"?w.button:(lang()==="szl"?"Wesprzyj nowo gra":"Wesprzyj nową grę"));
    link.href=kind==="result"?GENERAL_URL:GOAL_URL;link.target="_blank";link.rel="noopener noreferrer";
    link.dataset.supportSource=kind==="result"?"game-result":"support-"+kind;
    actions.appendChild(link);actions.appendChild(element("span","szp-support__note",w.note));
    section.appendChild(actions);return section;
  }
  function insertStatic(){
    if(document.querySelector(".szp-support[data-szp-static]"))return;
    var path=location.pathname.replace(/\/+$/,"").toLowerCase(),kind="compact",target=null,position="beforeend";
    if(path===""||path==="/index.html"){
      kind="home";target=document.querySelector(".familock-strip");
      position=target?"beforebegin":"beforeend";
      if(!target)target=document.querySelector("main");
    }else if(path==="/gierki"||path==="/gierki.html"){
      target=document.querySelector("main");
    }else if(path==="/konto"||path==="/konto.html"){
      target=document.querySelector("main")||document.querySelector(".site-footer");
      position=target&&target.tagName==="MAIN"?"beforeend":"beforebegin";
    }else{return;}
    if(!target)return;
    var node=card(kind);node.dataset.szpStatic="1";target.insertAdjacentElement(position,node);
  }
  function permitted(){
    try{var last=Number(localStorage.getItem(KEY)||0);return !last||Date.now()-last>=DAYS*86400000;}catch(e){return false;}
  }
  function showResult(modal){
    if(!modal||!permitted()||modal.querySelector(".szp-support"))return;
    var node=card("result");
    modal.appendChild(node);
    try{localStorage.setItem(KEY,String(Date.now()));}catch(e){}
  }
  window.SZP_SUPPORT={showResult:showResult};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",insertStatic);
  else insertStatic();
})();
