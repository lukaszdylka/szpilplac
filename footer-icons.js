/*
  Szpilplac Footer Icons v22
  --------------------------
  Zamienia podpis i linki socialowe w stopce na okrągłe ikonki.

  Dołącz na index.html przed </body>:
  <script src="footer-icons.js?v=22"></script>

  Można też dodać na inne strony, jeżeli mają standardową stopkę.
*/

(function(){
  "use strict";

  var LINKS = [
    {
      href: "https://dylka.pl",
      label: "Łukasz Dyłka",
      title: "Łukasz Dyłka",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z"/><path d="M4.8 20.3c.8-3.7 3.4-5.8 7.2-5.8s6.4 2.1 7.2 5.8"/></svg>'
    },
    {
      href: "https://www.facebook.com/escaperoomfamilock",
      label: "Fanpage Familock",
      title: "Fanpage",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.2h2.2V4.6c-.4-.1-1.7-.2-3.2-.2-3.1 0-5.2 1.9-5.2 5.4v3H4.5v4h3.3V24h4.1v-7.2h3.2l.5-4h-3.7v-2.6c0-1.2.3-2 2.1-2Z"/></svg>'
    },
    {
      href: "https://www.instagram.com/familock.escaperoom/",
      label: "Instagram Familock",
      title: "Instagram",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.2"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r="1"/></svg>'
    },
    {
      href: "https://www.facebook.com/groups/mieszkancy.familoka",
      label: "Wspólnota Familoka",
      title: "Wspólnota",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M15.8 11.3a2.8 2.8 0 1 0 0-5.6"/><path d="M2.8 19.3c.6-3.6 2.7-5.5 5.7-5.5s5.1 1.9 5.7 5.5"/><path d="M14.5 14.3c2.6.2 4.3 1.9 4.8 5"/></svg>'
    }
  ];

  function injectStyle(){
    if(document.getElementById("szpFooterIconsStyle"))return;

    var style=document.createElement("style");
    style.id="szpFooterIconsStyle";
    style.textContent =
      ".szp-footer-icons{margin-top:12px;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap}" +
      ".szp-footer-icons a{width:39px;height:39px;border-radius:999px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);color:var(--green,#2f4a39);display:inline-flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 6px 16px -12px rgba(35,32,26,.45);transition:transform .12s,background-color .12s,color .12s,border-color .12s}" +
      ".szp-footer-icons a:hover{transform:translateY(-1px);background:var(--surface,#fbf7ee);color:var(--ink,#23201a);text-decoration:none}" +
      ".szp-footer-icons svg{width:19px;height:19px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
      ".szp-footer-icons a:nth-child(2) svg{fill:currentColor;stroke:none}" +
      ".szp-footer-icons .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}" +
      ".footer-sources,.footer-social{display:none!important}" +
      "footer .buycoffee{margin-top:12px}" +
      "footer .buycoffee img{border-radius:999px;opacity:.9}" +
      "@media(max-width:420px){.szp-footer-icons a{width:37px;height:37px}.szp-footer-icons{gap:8px}}";

    document.head.appendChild(style);
  }

  function createIconBar(){
    var bar=document.createElement("div");
    bar.id="szpFooterIcons";
    bar.className="szp-footer-icons";
    bar.setAttribute("aria-label","Linki Familock");

    bar.innerHTML = LINKS.map(function(link){
      return '<a href="'+link.href+'" target="_blank" rel="noopener" title="'+link.title+'" aria-label="'+link.label+'">' +
        link.icon +
        '<span class="sr-only">'+link.label+'</span>' +
      '</a>';
    }).join("");

    return bar;
  }

  function inject(){
    var footer=document.querySelector("footer");
    if(!footer)return;
    if(document.getElementById("szpFooterIcons"))return;

    injectStyle();

    var bar=createIconBar();

    var legal=document.getElementById("szpLegalLinks");
    var coffee=footer.querySelector(".buycoffee");

    if(legal){
      footer.insertBefore(bar,legal);
      return;
    }

    if(coffee){
      footer.insertBefore(bar,coffee);
      return;
    }

    footer.appendChild(bar);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",inject);
  }else{
    inject();
  }

  // Jeżeli legal-links.js doładuje stopkę chwilę później, układ nadal zostaje poprawny.
  setTimeout(inject,300);
})();
