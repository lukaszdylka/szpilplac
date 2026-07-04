/*
  Szpilplac footer-normalizer.js v100
  Jedno źródło prawdy dla stopki:
  - usuwa stare footer-nav i zdublowane footer-legal
  - zawsze buduje jedną linię: Regulamin · Prywatność · Cookies · Mailing
  - poprawia relatywne linki na podstronach, np. raja/
*/
(function(){
  "use strict";

  var VERSION = "v100";

  function isNested(){
    return /\/raja\/[^\/]*$/.test(location.pathname);
  }
  function prefix(){
    return isNested() ? "../" : "";
  }
  function isNewsPage(){
    return /(^|\/)nowosci\.html$/.test(location.pathname);
  }
  function iconSvg(type){
    var svgs = {
      person:'<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="6" r="3"/><path d="M4 18c.9-4 3-6 6-6s5.1 2 6 6"/></svg>',
      home:'<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7 18v-6h6v6"/></svg>',
      fb:'<svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor"><path d="M12.2 3.4h2V0h-2.9C8.1 0 6.2 1.9 6.2 5.3v2.4H3.5v3.6h2.7V20h3.8v-8.7h3.1l.5-3.6H10V5.6c0-1.1.3-2.2 2.2-2.2z"/></svg>',
      instagram:'<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="4"/><circle cx="10" cy="10" r="3.2"/><circle cx="14.6" cy="5.4" r=".8" fill="currentColor" stroke="none"/></svg>',
      group:'<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="3"/><circle cx="14" cy="8" r="2.5"/><path d="M2.5 17c.7-3.6 2.3-5.4 4.5-5.4s3.8 1.8 4.5 5.4"/><path d="M11.8 13c2.6.2 4.2 1.5 4.9 4"/></svg>',
      news:'<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15.5V4.5A1.5 1.5 0 015.5 3h9A1.5 1.5 0 0116 4.5v11A1.5 1.5 0 0114.5 17h-9A1.5 1.5 0 014 15.5z"/><path d="M7 7h6M7 10h6M7 13h3"/></svg>'
    };
    return svgs[type] || "";
  }
  function addStyle(){
    if(document.getElementById("szp-footer-normalizer-style"))return;
    var st = document.createElement("style");
    st.id = "szp-footer-normalizer-style";
    st.textContent = [
      ".site-footer{width:100%;max-width:980px;margin:30px auto 0;padding:22px 12px 26px;text-align:center;color:var(--ink2,#9a907a);font-size:11.5px;line-height:1.55}",
      ".site-footer .footer-head{margin:0 0 4px;color:var(--ink,#ede5d0);font-size:13px;font-weight:900}",
      ".site-footer .footer-copy{margin:0 0 12px;color:var(--ink2,#9a907a);font-size:11px;line-height:1.5}",
      ".site-footer .footer-news-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;margin:2px 0 12px;padding:8px 14px;border:1px solid rgba(191,138,58,.55);border-radius:999px;background:rgba(191,138,58,.12);color:var(--gold,#d4a04a);font-size:12px;font-weight:900;letter-spacing:.02em;text-decoration:none}",
      ".site-footer .footer-news-btn:hover{background:rgba(191,138,58,.2);color:var(--ink,#ede5d0);transform:translateY(-1px)}",
      ".site-footer .footer-icons{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:4px}",
      ".site-footer .footer-icons a{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--line,#3d3629);border-radius:999px;background:var(--surface2,#2e2820);color:var(--green,#4a7a56);text-decoration:none}",
      ".site-footer .footer-icons a:hover{background:var(--surface,#262018);color:var(--gold,#d4a04a);transform:translateY(-1px)}",
      ".site-footer .footer-legal{display:flex!important;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:12px;color:var(--ink2,#9a907a);font-size:11px;line-height:1.6;opacity:.95}",
      ".site-footer .footer-legal a{color:var(--green,#4a7a56)!important;font-weight:900!important;text-decoration:none!important}",
      ".site-footer .footer-legal a:hover{color:var(--gold,#d4a04a)!important;text-decoration:underline!important}",
      ".site-footer .footer-nav{display:none!important}",
      ".site-footer .footer-legal + .footer-legal{display:none!important}"
    ].join("\n");
    document.head.appendChild(st);
  }
  function buildFooter(){
    var p = prefix();
    var news = "";
    if(!isNewsPage()){
      news =
        '<a class="footer-news-btn" href="'+p+'nowosci.html" aria-label="Zobacz nowości w Szpilplacu">'+
          iconSvg("news")+
          '<span>Co nowego?</span>'+
        '</a>';
    }

    return ''+
      '<div class="footer-head">Szpilplac i Familock</div>'+
      '<div class="footer-copy">Zajrzyj też do naszych miejsc i ważnych informacji.</div>'+
      news+
      '<div class="footer-icons" aria-label="Familock w social mediach">'+
        '<a href="https://dylka.pl" target="_blank" rel="noopener" aria-label="Łukasz Dyłka">'+iconSvg("person")+'</a>'+
        '<a href="https://www.familock.pl" target="_blank" rel="noopener" aria-label="Familock">'+iconSvg("home")+'</a>'+
        '<a href="https://www.facebook.com/escaperoomfamilock" target="_blank" rel="noopener" aria-label="Fanpage">'+iconSvg("fb")+'</a>'+
        '<a href="https://www.instagram.com/familock.escaperoom/" target="_blank" rel="noopener" aria-label="Instagram">'+iconSvg("instagram")+'</a>'+
        '<a href="https://www.facebook.com/groups/mieszkancy.familoka" target="_blank" rel="noopener" aria-label="Wspólnota Familoka">'+iconSvg("group")+'</a>'+
      '</div>'+
      '<div class="footer-legal" data-footer-legal="v100">'+
        '<a href="'+p+'regulamin.html" id="footerTerms">Regulamin</a>'+
        '<span>·</span>'+
        '<a href="'+p+'polityka-prywatnosci.html" id="footerPrivacy">Prywatność</a>'+
        '<span>·</span>'+
        '<a href="'+p+'cookies.html" id="footerCookies">Cookies</a>'+
        '<span>·</span>'+
        '<a href="'+p+'mailing.html" id="footerMailing">Mailing</a>'+
      '</div>';
  }
  function normalizeFooter(){
    addStyle();

    var footer = document.querySelector(".site-footer");
    if(!footer){
      footer = document.querySelector("footer");
      if(footer)footer.classList.add("site-footer");
    }
    if(!footer)return;

    footer.innerHTML = buildFooter();
    footer.setAttribute("data-footer-normalized","v100");
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", normalizeFooter);
  }else{
    normalizeFooter();
  }
  setTimeout(normalizeFooter, 250);
  setTimeout(normalizeFooter, 1000);
  window.SZP_NORMALIZE_FOOTER = normalizeFooter;
  console.info("Szpilplac footer-normalizer.js " + VERSION);
})();
