/* Szpilplac topbar-common.js v102 */
(function(){
  "use strict";
  var VERSION="v102";
  function addStyle(){
    if(document.getElementById("szp-topbar-common-style"))return;
    var st=document.createElement("style"); st.id="szp-topbar-common-style";
    st.textContent = ".topbar .controls{min-width:0}.topbar .icon-btn,.topbar .coffee-btn,.topbar .account-btn,.topbar .rank-btn{flex:none;display:inline-grid;place-items:center}.topbar svg{display:block}.topbar .lang-tog{flex:none}.topbar .back{min-width:0}.topbar [hidden]{display:none!important}@media(max-width:430px){.topbar .controls{gap:4px}.topbar .icon-btn,.topbar .coffee-btn,.topbar .account-btn,.topbar .rank-btn{width:30px;height:30px}.topbar .lang-tog button{padding-left:8px;padding-right:8px}}";
    document.head.appendChild(st);
  }
  function normalize(){addStyle(); document.querySelectorAll(".topbar .controls a.icon-btn").forEach(function(a){a.setAttribute("role","button");});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",normalize); else normalize();
  setTimeout(normalize,250);
  window.SZP_TOPBAR={version:VERSION,normalize:normalize};
  console.info("Szpilplac topbar-common.js "+VERSION);
})();
