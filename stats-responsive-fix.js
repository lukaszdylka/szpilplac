/* Szpilplac stats-responsive-fix.js v1
   Naprawa rozjeżdżania stats.html:
   - bez zmiany danych,
   - tabele na telefonie zamieniają się wizualnie w karty,
   - na PC ogranicza przelewanie szerokich sekcji.
*/
(function(){
  "use strict";
  var VERSION = "v1";

  function injectStyle(){
    if(document.getElementById("statsResponsiveFixStyle"))return;
    var s = document.createElement("style");
    s.id = "statsResponsiveFixStyle";
    s.textContent = `
      html,body{width:100%;max-width:100%;overflow-x:hidden}
      header,main,footer{width:100%;max-width:min(1120px,100%)}
      main,.card,.hero,.hero-main,.hero-side,.two-col,.three-col,.table-wrap,.signal-list{min-width:0;max-width:100%}
      .card{overflow:hidden}
      .hero{grid-template-columns:minmax(0,1.28fr) minmax(240px,.72fr)}
      .hero-main,.hero-side{min-width:0}
      .grid,.kpi-row{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))!important}
      .two-col{grid-template-columns:repeat(2,minmax(0,1fr))}
      .three-col{grid-template-columns:repeat(3,minmax(0,1fr))}
      .table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .table-wrap table{width:100%;min-width:680px}
      .stat .value{overflow-wrap:anywhere}
      .signal{min-width:0}
      .signal b,.signal span{min-width:0;overflow-wrap:anywhere}
      @media(max-width:1040px){
        .hero,.two-col,.three-col{grid-template-columns:1fr!important}
      }
      @media(max-width:760px){
        body{padding-left:10px!important;padding-right:10px!important}
        .topbar{display:grid!important;grid-template-columns:1fr;gap:10px}
        .controls{justify-content:flex-start!important;max-width:100%;overflow-x:auto;padding-bottom:2px}
        .controls .nav-btn,.controls .icon-btn{flex:none}
        .hero-main h2{font-size:25px!important}
        .card{padding:14px!important;border-radius:16px!important}
        .kpi-row,.grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
        .stat{padding:11px!important}
        .stat .value{font-size:24px!important}
      }
      @media(max-width:520px){
        .kpi-row,.grid{grid-template-columns:1fr!important}
        .table-wrap{
          overflow:visible!important;
          border:0!important;
          background:transparent!important;
          border-radius:0!important;
        }
        .table-wrap table{
          min-width:0!important;
          width:100%!important;
          background:transparent!important;
        }
        .table-wrap thead{
          display:none!important;
        }
        .table-wrap tbody,
        .table-wrap tr,
        .table-wrap td{
          display:block!important;
          width:100%!important;
        }
        .table-wrap tr{
          margin:0 0 10px!important;
          padding:8px!important;
          border:1px solid var(--line)!important;
          border-radius:14px!important;
          background:var(--surface2)!important;
        }
        .table-wrap td{
          display:grid!important;
          grid-template-columns:minmax(92px,.75fr) minmax(0,1.25fr)!important;
          gap:10px!important;
          align-items:start!important;
          padding:7px 6px!important;
          border-bottom:1px solid var(--line)!important;
          white-space:normal!important;
          text-align:right!important;
          overflow-wrap:anywhere!important;
        }
        .table-wrap td:last-child{
          border-bottom:0!important;
        }
        .table-wrap td::before{
          content:attr(data-label);
          color:var(--ink2);
          font-size:10.5px;
          font-weight:900;
          letter-spacing:.05em;
          text-transform:uppercase;
          text-align:left;
          line-height:1.35;
        }
        .table-wrap td.num{
          text-align:right!important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  function labelTables(){
    Array.prototype.slice.call(document.querySelectorAll(".table-wrap table")).forEach(function(table){
      var heads = Array.prototype.slice.call(table.querySelectorAll("thead th")).map(function(th){
        return (th.textContent || "").trim();
      });
      Array.prototype.slice.call(table.querySelectorAll("tbody tr")).forEach(function(tr){
        Array.prototype.slice.call(tr.children).forEach(function(td,i){
          if(td.tagName && td.tagName.toLowerCase() === "td" && !td.getAttribute("data-label")){
            td.setAttribute("data-label",heads[i] || "");
          }
        });
      });
    });
  }

  function boot(){
    injectStyle();
    labelTables();
    new MutationObserver(function(){labelTables();}).observe(document.documentElement,{childList:true,subtree:true});
    setInterval(labelTables,1500);
    console.info("Szpilplac stats-responsive-fix.js "+VERSION);
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
