/*
  Szpilplac Clean Footer v23
  --------------------------
  Jedna estetyczna stopka dla stron Szpilplaca.
  Usuwa techniczne linki typu Diagnostyka z widoku gracza.
*/

(function(){
  "use strict";

  var socialLinks = [
    {
      href:"https://dylka.pl",
      label:"Łukasz Dyłka",
      title:"Łukasz Dyłka",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z"/><path d="M4.8 20.3c.8-3.7 3.4-5.8 7.2-5.8s6.4 2.1 7.2 5.8"/></svg>'
    },
    {
      href:"https://familock.pl",
      label:"Familock",
      title:"Familock",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2 12 3.7l8.5 7.5"/><path d="M5.8 9.8v10.1h12.4V9.8"/><path d="M9.5 19.9v-6h5v6"/></svg>'
    },
    {
      href:"https://www.facebook.com/escaperoomfamilock",
      label:"Fanpage Familock",
      title:"Fanpage",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.2h2.2V4.6c-.4-.1-1.7-.2-3.2-.2-3.1 0-5.2 1.9-5.2 5.4v3H4.5v4h3.3V24h4.1v-7.2h3.2l.5-4h-3.7v-2.6c0-1.2.3-2 2.1-2Z"/></svg>'
    },
    {
      href:"https://www.instagram.com/familock.escaperoom/",
      label:"Instagram Familock",
      title:"Instagram",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.2"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r="1"/></svg>'
    },
    {
      href:"https://www.facebook.com/groups/mieszkancy.familoka",
      label:"Wspólnota Familoka",
      title:"Wspólnota",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M15.8 11.3a2.8 2.8 0 1 0 0-5.6"/><path d="M2.8 19.3c.6-3.6 2.7-5.5 5.7-5.5s5.1 1.9 5.7 5.5"/><path d="M14.5 14.3c2.6.2 4.3 1.9 4.8 5"/></svg>'
    }
  ];

  var gameLinks = [
    {
      href:"index.html",
      label:"Szpilplac",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2 12 3.7l8.5 7.5"/><path d="M6 10.2v9.5h12v-9.5"/><path d="M9.5 19.7v-5.5h5v5.5"/></svg>'
    },
    {
      href:"ranking.html",
      label:"Ranking",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4.5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.8 3.7"/><path d="M17 6h2.5a2.5 2.5 0 0 1-2.8 3.7"/></svg>'
    },
    {
      href:"konto.html",
      label:"Konto",
      icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z"/><path d="M4.8 20.3c.8-3.7 3.4-5.8 7.2-5.8s6.4 2.1 7.2 5.8"/></svg>'
    }
  ];

  var legalLinks = [
    {href:"regulamin.html", label:"Regulamin"},
    {href:"polityka-prywatnosci.html", label:"Prywatność"},
    {href:"cookies.html", label:"Cookies"},
    {href:"mailing.html", label:"Mailing"}
  ];

  function injectStyle(){
    if(document.getElementById("szpCleanFooterStyle"))return;

    var style=document.createElement("style");
    style.id="szpCleanFooterStyle";
    style.textContent =
      "footer{width:100%;max-width:520px;text-align:center;color:var(--ink2,#6a6150);font-size:11.5px;margin-top:22px;line-height:1.7}" +
      ".szp-clean-footer{display:grid;gap:12px;justify-items:center;margin-top:8px}" +
      ".szp-footer-icons,.szp-footer-main,.szp-footer-legal{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap}" +
      ".szp-footer-icons a,.szp-footer-main a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none}" +
      ".szp-footer-icons a{width:40px;height:40px;border-radius:999px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);color:var(--green,#2f4a39);box-shadow:0 8px 18px -14px rgba(35,32,26,.55);transition:transform .12s,background-color .12s,color .12s,border-color .12s}" +
      ".szp-footer-icons a:hover{transform:translateY(-1px);background:var(--surface,#fbf7ee);color:var(--ink,#23201a);text-decoration:none}" +
      ".szp-footer-icons svg{width:19px;height:19px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
      ".szp-footer-icons a[data-kind='facebook'] svg{fill:currentColor;stroke:none}" +
      ".szp-footer-main a{min-height:31px;padding:7px 11px;border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font-size:11px;font-weight:900;gap:6px}" +
      ".szp-footer-main a:hover{background:var(--surface,#fbf7ee);color:var(--green,#2f4a39);text-decoration:none}" +
      ".szp-footer-main svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}" +
      ".szp-footer-legal{gap:7px;opacity:.92}" +
      ".szp-footer-legal a{color:var(--ink2,#6a6150);font-size:11px;font-weight:800;text-decoration:none;border-bottom:1px solid transparent}" +
      ".szp-footer-legal a:hover{color:var(--green,#2f4a39);border-bottom-color:currentColor;text-decoration:none}" +
      ".szp-footer-dot{color:var(--line,#c9bfa6)}" +
      ".szp-footer-copy{font-size:10.5px;color:var(--ink2,#6a6150);opacity:.72}" +
      ".szp-clean-footer .buycoffee img{border-radius:999px;opacity:.92}" +
      ".footer-sources,.footer-social,#szpLegalLinks,#szpKontoLegalFooter{display:none!important}" +
      ".szp-clean-footer .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}" +
      "@media(max-width:420px){.szp-footer-icons a{width:38px;height:38px}.szp-footer-main a{font-size:10.5px;padding:7px 10px}.szp-clean-footer{gap:11px}}";

    document.head.appendChild(style);
  }

  function iconLink(link, idx){
    var kind = link.href.indexOf("facebook.com") !== -1 ? "facebook" : "";
    return '<a href="'+link.href+'" target="_blank" rel="noopener" title="'+link.title+'" aria-label="'+link.label+'" data-kind="'+kind+'">' +
      link.icon +
      '<span class="sr-only">'+link.label+'</span>' +
    '</a>';
  }

  function mainLink(link){
    return '<a href="'+link.href+'">' + link.icon + '<span>'+link.label+'</span></a>';
  }

  function legalLink(link, idx){
    return (idx ? '<span class="szp-footer-dot">·</span>' : '') +
      '<a href="'+link.href+'">'+link.label+'</a>';
  }

  function findBuyCoffee(footer){
    var coffee = footer.querySelector(".buycoffee");
    if(!coffee)return "";
    coffee.classList.add("buycoffee");
    return coffee.outerHTML;
  }

  function inject(){
    var footer=document.querySelector("footer");
    if(!footer)return;

    injectStyle();

    var coffeeHtml = findBuyCoffee(footer);

    footer.innerHTML =
      '<div class="szp-clean-footer" id="szpCleanFooter">' +
        '<div class="szp-footer-icons" aria-label="Familock w sieci">' +
          socialLinks.map(iconLink).join("") +
        '</div>' +
        '<div class="szp-footer-main" aria-label="Nawigacja Szpilplaca">' +
          gameLinks.map(mainLink).join("") +
        '</div>' +
        '<div class="szp-footer-legal" aria-label="Linki prawne">' +
          legalLinks.map(legalLink).join("") +
        '</div>' +
        (coffeeHtml || '') +
        '<div class="szp-footer-copy">Szpilplac · Familock</div>' +
      '</div>';
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",inject);
  }else{
    inject();
  }

  setTimeout(inject,300);
})();
