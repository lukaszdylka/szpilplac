/*
  Szpilplac game-result-actions.js v59
  Dokłada przyjazne przyciski po zakończeniu gry.
  Działa jako lekki mostek — nie zmienia logiki punktacji ani zapisu wyników.
*/
(function(){
  "use strict";

  var VERSION = "v59";
  var MARK = "data-szp-result-actions";

  function inRaja(){
    return /\/raja\/?/.test(location.pathname);
  }
  function root(path){
    return (inRaja() ? "../" : "") + path;
  }
  function gameName(){
    var path = location.pathname.toLowerCase();
    if(path.indexOf("klodka") !== -1)return "Kłōdka";
    if(path.indexOf("raja") !== -1)return "Raja";
    return "Słōwko";
  }
  function injectStyle(){
    if(document.getElementById("szpResultActionsStyle"))return;
    var st = document.createElement("style");
    st.id = "szpResultActionsStyle";
    st.textContent =
      ".szp-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}" +
      ".szp-result-actions a{min-height:40px;display:flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:12px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:900;text-decoration:none;text-align:center}" +
      ".szp-result-actions a:hover{background:var(--surface,#fbf7ee);color:var(--green,#2f4a39)}" +
      ".szp-result-actions a.primary{background:var(--green,#2f4a39);border-color:var(--green,#2f4a39);color:#fff}" +
      ".szp-result-account-note{margin-top:10px;padding:9px 11px;border:1px dashed var(--line,#c9bfa6);border-radius:12px;background:rgba(191,138,58,.10);color:var(--ink2,#6a6150);font-size:12px;line-height:1.4;text-align:center}" +
      "@media(max-width:420px){.szp-result-actions{grid-template-columns:1fr}}";
    document.head.appendChild(st);
  }
  function hasAccountSession(){
    try{
      var raw = localStorage.getItem("szpilplac-auth-v05");
      if(!raw)return false;
      var data = JSON.parse(raw);
      var s = data.currentSession || data.session || data;
      return !!(s && s.access_token);
    }catch(e){
      return false;
    }
  }
  function actionHtml(){
    var logged = hasAccountSession();
    var accountText = logged ? "Moje konto" : "Załóż konto";
    return '' +
      '<div class="szp-result-actions" '+MARK+'="1">' +
        '<a class="primary" href="'+root("ranking.html")+'">Zobacz ranking</a>' +
        '<a href="'+root("index.html")+'">Zagraj w inną grę</a>' +
        '<a href="'+root("konto.html")+'">'+accountText+'</a>' +
        '<a href="https://familock.pl" target="_blank" rel="noopener">Familock</a>' +
      '</div>' +
      '<div class="szp-result-account-note" '+MARK+'="1">' +
        (logged ? "Jeśli byłeś zalogowany przed końcem gry, wynik zapisał się automatycznie." : "Załóż konto, żeby kolejne wyniki zapisywały punkty, rangi i historię. Ten wynik zostaje lokalnie w tej przeglądarce.") +
      '</div>';
  }
  function isResultHost(el){
    if(!el || el.nodeType !== 1)return false;
    if(el.querySelector && el.querySelector("[data-szp-result-actions]"))return false;

    var id = el.id || "";
    var cls = el.className || "";
    var text = (el.textContent || "").toLowerCase();

    if(id === "modal"){
      if(el.querySelector("#shareBtn") && (el.querySelector(".reveal-card") || el.querySelector(".reveal-code") || text.indexOf("otwarte") !== -1 || text.indexOf("trefi") !== -1 || text.indexOf("nie uda") !== -1 || text.indexOf("niy podar") !== -1))return true;
    }

    if(id === "result" || (typeof cls === "string" && cls.indexOf("result") !== -1)){
      if((el.classList && el.classList.contains("show")) || el.querySelector("#shareBtn"))return true;
    }

    return false;
  }
  function enhanceHost(el){
    if(!isResultHost(el))return;
    injectStyle();
    el.insertAdjacentHTML("beforeend", actionHtml());
  }
  function scan(){
    var candidates = [];
    var modal = document.getElementById("modal");
    var result = document.getElementById("result");
    if(modal)candidates.push(modal);
    if(result)candidates.push(result);
    document.querySelectorAll(".modal,.result").forEach(function(el){candidates.push(el);});
    candidates.forEach(enhanceHost);
  }
  function boot(){
    injectStyle();
    scan();
    var obs = new MutationObserver(function(){scan();});
    obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
    setInterval(scan,1200);
    console.info("Szpilplac game-result-actions.js "+VERSION);
  }
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
