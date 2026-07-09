/* Szpilplac welcome modal v1
   Jednorazowe okienko startowe po wejściu na index.html.
   Pokazuje się raz od tej wersji, po kliknięciu "Przeczytałem".
*/
(function(){
  "use strict";

  var VERSION = "v1";
  var STORAGE_KEY = "szp_welcome_seen_20260709_v1";

  function isHome(){
    var p = (location.pathname || "").toLowerCase();
    return p === "/" || p.endsWith("/index.html") || p.endsWith("/szpilplac/") || p === "";
  }

  function canStore(){
    try{
      localStorage.setItem("__szp_welcome_test","1");
      localStorage.removeItem("__szp_welcome_test");
      return true;
    }catch(e){
      return false;
    }
  }

  function seen(){
    if(!canStore())return false;
    try{return localStorage.getItem(STORAGE_KEY) === "1";}catch(e){return false;}
  }

  function markSeen(){
    try{localStorage.setItem(STORAGE_KEY,"1");}catch(e){}
  }

  function injectStyle(){
    if(document.getElementById("szpWelcomeStyle"))return;
    var style = document.createElement("style");
    style.id = "szpWelcomeStyle";
    style.textContent =
      ".szp-welcome-scrim{position:fixed;inset:0;z-index:10020;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.62)}"+
      ".szp-welcome-scrim.open{display:flex}"+
      ".szp-welcome-box{width:min(560px,100%);max-height:90vh;overflow:auto;border:1px solid var(--line,#c9bfa6);border-radius:20px;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);box-shadow:0 28px 80px -32px rgba(0,0,0,.82)}"+
      ".szp-welcome-inner{padding:19px}"+
      ".szp-welcome-kicker{margin:0 0 5px;color:var(--gold,#bf8a3a);font-size:10.5px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}"+
      ".szp-welcome-title{margin:0;font-family:Oswald,system-ui,sans-serif;font-size:30px;line-height:1.02;text-transform:uppercase;letter-spacing:.02em}"+
      ".szp-welcome-lead{margin:8px 0 13px;color:var(--ink2,#6a6150);font-size:13px;line-height:1.45}"+
      ".szp-welcome-list{display:grid;gap:8px;margin:0 0 13px;padding:0;list-style:none}"+
      ".szp-welcome-list li{display:grid;grid-template-columns:26px minmax(0,1fr);gap:9px;align-items:start;padding:9px;border:1px solid var(--line,#c9bfa6);border-radius:13px;background:var(--surface2,#f3ecda)}"+
      ".szp-welcome-mark{width:26px;height:26px;display:grid;place-items:center;border-radius:999px;background:rgba(191,138,58,.16);color:var(--gold,#bf8a3a);font-weight:900}"+
      ".szp-welcome-list b{display:block;margin-bottom:2px;color:var(--ink,#23201a);font-size:13px}"+
      ".szp-welcome-list span{display:block;color:var(--ink2,#6a6150);font-size:12px;line-height:1.35}"+
      ".szp-welcome-actions{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:14px}"+
      ".szp-welcome-more{min-height:40px;display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface2,#f3ecda);color:var(--green,#2f4a39);font-size:12px;font-weight:900;text-decoration:none}"+
      ".szp-welcome-ok{min-height:42px;display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border:0;border-radius:999px;background:var(--green,#2f4a39);color:#fff;font-size:13px;font-weight:900;cursor:pointer}"+
      ".szp-welcome-ok:hover,.szp-welcome-more:hover{transform:translateY(-1px);filter:brightness(1.04)}"+
      "@media(max-width:520px){.szp-welcome-inner{padding:16px}.szp-welcome-title{font-size:25px}.szp-welcome-actions{grid-template-columns:1fr}.szp-welcome-ok,.szp-welcome-more{width:100%}}";
    document.head.appendChild(style);
  }

  function build(){
    if(document.getElementById("szpWelcomeScrim"))return document.getElementById("szpWelcomeScrim");

    var scrim = document.createElement("div");
    scrim.id = "szpWelcomeScrim";
    scrim.className = "szp-welcome-scrim";
    scrim.setAttribute("role","dialog");
    scrim.setAttribute("aria-modal","true");
    scrim.setAttribute("aria-labelledby","szpWelcomeTitle");

    scrim.innerHTML =
      '<div class="szp-welcome-box">'+
        '<div class="szp-welcome-inner">'+
          '<p class="szp-welcome-kicker">Nowości na Szpilplacu</p>'+
          '<h2 class="szp-welcome-title" id="szpWelcomeTitle">Najważniejsze dla gracza</h2>'+
          '<p class="szp-welcome-lead">Krótko: grasz codziennie, zbierasz punkty, sprawdzasz ranking i możesz dodać innych graczy do Kamratów z placu.</p>'+
          '<ul class="szp-welcome-list">'+
            '<li><span class="szp-welcome-mark">1</span><div><b>Gry</b><span>Słōwko, Kłōdka i Raja działają codziennie. Cuzamen jest przygotowywany jako kolejna gra.</span></div></li>'+
            '<li><span class="szp-welcome-mark">2</span><div><b>Konto</b><span>Konto zapisuje wyniki, punkty, rangi, odznaki i statystyki po grze.</span></div></li>'+
            '<li><span class="szp-welcome-mark">3</span><div><b>Kamraty z placu</b><span>Możesz włączyć profil publiczny, dodać graczy z rankingu, porównać wyniki i wysyłać lekkie reakcje.</span></div></li>'+
            '<li><span class="szp-welcome-mark">4</span><div><b>Prywatność</b><span>Publiczny profil nie pokazuje maila, prywatnych danych ani rozwiązań zagadek.</span></div></li>'+
          '</ul>'+
          '<div class="szp-welcome-actions">'+
            '<a class="szp-welcome-more" href="nowosci.html" id="szpWelcomeMore">Zobacz nowości</a>'+
            '<button class="szp-welcome-ok" type="button" id="szpWelcomeOk">Przeczytałem</button>'+
          '</div>'+
        '</div>'+
      '</div>';

    document.body.appendChild(scrim);

    var ok = document.getElementById("szpWelcomeOk");
    var more = document.getElementById("szpWelcomeMore");

    function close(){
      markSeen();
      scrim.classList.remove("open");
      setTimeout(function(){ if(scrim && scrim.parentNode)scrim.parentNode.removeChild(scrim); },180);
    }

    if(ok)ok.addEventListener("click",close);
    if(more)more.addEventListener("click",markSeen);

    document.addEventListener("keydown",function(e){
      if(e.key === "Escape" && scrim.classList.contains("open")){
        close();
      }
    });

    return scrim;
  }

  function boot(){
    if(!isHome())return;
    if(seen())return;
    injectStyle();
    setTimeout(function(){
      var scrim = build();
      scrim.classList.add("open");
      var ok = document.getElementById("szpWelcomeOk");
      if(ok)try{ok.focus();}catch(e){}
    },550);
  }

  window.SZP_WELCOME_MODAL = {version:VERSION,key:STORAGE_KEY,reset:function(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}}};

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
