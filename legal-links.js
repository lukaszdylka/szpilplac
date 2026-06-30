/*
  Szpilplac Legal Links v21
  -------------------------
  Dodaje publiczne linki prawne do stopki.
*/

(function(){
  "use strict";

  function inject(){
    if(document.getElementById("szpLegalLinks"))return;

    var style=document.createElement("style");
    style.id="szpLegalLinksStyle";
    style.textContent=
      ".szp-legal-links{width:100%;max-width:520px;margin:12px auto 0;text-align:center;color:var(--ink2,#6a6150);font-size:11.5px;line-height:1.7}" +
      ".szp-legal-links nav{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}" +
      ".szp-legal-links a{color:var(--green,#2f4a39);font-weight:900;text-decoration:none}" +
      ".szp-legal-links a:hover{text-decoration:underline}";
    document.head.appendChild(style);

    var box=document.createElement("div");
    box.id="szpLegalLinks";
    box.className="szp-legal-links";
    box.innerHTML='<nav>' +
      '<a href="regulamin.html">Regulamin</a>' +
      '<span>·</span>' +
      '<a href="polityka-prywatnosci.html">Prywatność</a>' +
      '<span>·</span>' +
      '<a href="cookies.html">Cookies</a>' +
      '<span>·</span>' +
      '<a href="mailing.html">Mailing</a>' +
      '</nav>';

    var footer=document.querySelector("footer");
    if(footer)footer.appendChild(box);
    else document.body.appendChild(box);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",inject);
  else inject();
})();
