/*
  Szpilplac v43
  -------------
  Hotfix avatara na stronie głównej.
  Ogranicza SVG avatara do małego kółka w panelu gracza.
*/

(function(){
  "use strict";

  var VERSION = "v43";

  function injectStyle(){
    if(document.getElementById("szpIndexAvatarFixStyle"))return;

    var style = document.createElement("style");
    style.id = "szpIndexAvatarFixStyle";
    style.textContent = `
      #playerCard .player-avatar,
      #playerCard .szp-player-avatar,
      #szpPlayerCard .player-avatar,
      #szpPlayerCard .szp-player-avatar,
      .player-card .player-avatar,
      .player-card .szp-player-avatar,
      .szp-player-card .player-avatar,
      .szp-player-card .szp-player-avatar{
        width:66px !important;
        height:66px !important;
        min-width:66px !important;
        max-width:66px !important;
        min-height:66px !important;
        max-height:66px !important;
        flex:0 0 66px !important;
        border-radius:999px !important;
        overflow:hidden !important;
        display:grid !important;
        place-items:center !important;
        position:relative !important;
        isolation:isolate !important;
      }

      #playerCard .player-avatar > svg,
      #playerCard .szp-player-avatar > svg,
      #szpPlayerCard .player-avatar > svg,
      #szpPlayerCard .szp-player-avatar > svg,
      .player-card .player-avatar > svg,
      .player-card .szp-player-avatar > svg,
      .szp-player-card .player-avatar > svg,
      .szp-player-card .szp-player-avatar > svg{
        width:100% !important;
        height:100% !important;
        max-width:100% !important;
        max-height:100% !important;
        min-width:0 !important;
        min-height:0 !important;
        display:block !important;
        object-fit:cover !important;
        position:static !important;
        transform:none !important;
      }

      #playerCard .player-avatar *,
      #playerCard .szp-player-avatar *,
      #szpPlayerCard .player-avatar *,
      #szpPlayerCard .szp-player-avatar *,
      .player-card .player-avatar *,
      .player-card .szp-player-avatar *,
      .szp-player-card .player-avatar *,
      .szp-player-card .szp-player-avatar *{
        max-width:100% !important;
        max-height:100% !important;
      }

      @media(max-width:520px){
        #playerCard .player-avatar,
        #playerCard .szp-player-avatar,
        #szpPlayerCard .player-avatar,
        #szpPlayerCard .szp-player-avatar,
        .player-card .player-avatar,
        .player-card .szp-player-avatar,
        .szp-player-card .player-avatar,
        .szp-player-card .szp-player-avatar{
          width:58px !important;
          height:58px !important;
          min-width:58px !important;
          max-width:58px !important;
          min-height:58px !important;
          max-height:58px !important;
          flex-basis:58px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function hardClamp(){
    var avatars = document.querySelectorAll(
      "#playerCard .player-avatar, #playerCard .szp-player-avatar, " +
      "#szpPlayerCard .player-avatar, #szpPlayerCard .szp-player-avatar, " +
      ".player-card .player-avatar, .player-card .szp-player-avatar, " +
      ".szp-player-card .player-avatar, .szp-player-card .szp-player-avatar"
    );

    avatars.forEach(function(box){
      box.style.width = "";
      box.style.height = "";
      box.style.overflow = "hidden";
      box.style.borderRadius = "999px";
      box.style.display = "grid";
      box.style.placeItems = "center";

      var svg = box.querySelector(":scope > svg");
      if(svg){
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.maxWidth = "100%";
        svg.style.maxHeight = "100%";
        svg.style.display = "block";
        svg.style.position = "static";
        svg.style.transform = "none";
      }
    });
  }

  function boot(){
    console.info("Szpilplac index-avatar-fix.js " + VERSION);
    injectStyle();
    hardClamp();

    var ticks = 0;
    var timer = setInterval(function(){
      ticks++;
      injectStyle();
      hardClamp();
      if(ticks > 30)clearInterval(timer);
    }, 250);

    var obs = new MutationObserver(function(){
      injectStyle();
      hardClamp();
    });

    obs.observe(document.body, {
      childList:true,
      subtree:true
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }

})();