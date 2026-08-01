/* Szpilplac games registry */
(function(){
  "use strict";

  var VERSION=window.SZP_BUILD_ID||"2026.08.01.2";
  var games=[
    {
      id:"slowko", aliases:["slowko"], title:"Słōwko", href:"slowko.html",
      cadence:["daily"], kind:"main", active:true,
      description:"Odgadnij śląskie słowo dnia w sześciu próbach."
    },
    {
      id:"cuzamen", aliases:["cuzamen"], title:"Cuzamen Szpil", href:"cuzamen.html",
      cadence:["daily"], kind:"main", active:true,
      description:"Znajdź cztery ukryte grupy śląskich słów i skojarzeń."
    },
    {
      id:"klodka", aliases:["klodka"], title:"Kłōdka", href:"klodka.html",
      cadence:["daily","weekly"], kind:"main", active:true,
      description:"Odgadnij czterocyfrowy kod, korzystając z informacji po każdej próbie."
    },
    {
      id:"raja", aliases:["raja","zorta"], title:"Raja", href:"raja/",
      cadence:["weekly"], kind:"main", active:true,
      description:"Ułóż pięć śląskich elementów we właściwej kolejności."
    },
    {
      id:"kopalnia", aliases:["kopalnia"], title:"Starzik w kopalni", href:"kopalnia.html",
      cadence:["anytime"], kind:"minigame", active:true, icon:"kopalnia",
      scoreLabel:"Rekord czasu", fullscreen:true,
      description:"Zbierz cały wyngiel, pilnuj metanu i wróć szolą na wiyrch."
    },
    {
      id:"na-wiyrch", aliases:["na-wiyrch","nawiyrch"], title:"Na Wiyrch", href:"na-wiyrch.html",
      cadence:["anytime"], kind:"minigame", active:true, icon:"familok",
      scoreLabel:"Rekord punktów", fullscreen:true,
      description:"Skacz po balkonach familoka i pnij się jak najwyżej."
    },
    {
      id:"bandyta", aliases:["bandyta"], title:"Jednoręki bandyta", href:"bandyta.html",
      cadence:["anytime"], kind:"minigame", active:true, icon:"automat",
      scoreLabel:"Rekord punktów", fullscreen:true,
      description:"Kręć, zatrzymuj symbole i składaj punktowane układy."
    },
    {
      id:"pong", aliases:["pong"], title:"Pong", href:"pong.html",
      cadence:["anytime"], kind:"minigame", active:true, icon:"pong",
      scoreLabel:"Rekord serii", fullscreen:true,
      description:"Klasyk do trzech punktów. Wygrywaj pod rząd i bij rekord serii."
    }
  ];

  function norm(value){
    return String(value||"").toLowerCase().replace(/^\/+|\/+$/g,"").replace(/\.html(?:\?.*)?$/i,"");
  }

  function clone(item){
    return JSON.parse(JSON.stringify(item));
  }

  function get(id){
    var n=norm(id);
    for(var i=0;i<games.length;i++){
      var g=games[i];
      if(norm(g.id)===n||norm(g.href)===n||(g.aliases||[]).some(function(a){return norm(a)===n;})){
        return clone(g);
      }
    }
    return null;
  }

  function list(filter){
    return games.filter(function(g){
      if(!filter)return true;
      if(filter.kind&&g.kind!==filter.kind)return false;
      if(filter.active!=null&&g.active!==filter.active)return false;
      if(filter.cadence&&g.cadence.indexOf(filter.cadence)===-1)return false;
      return true;
    }).map(clone);
  }

  function syncIndex(){
    var root=document.getElementById("games");
    if(!root)return;
    root.querySelectorAll("a[href]").forEach(function(card){
      var href=card.getAttribute("href")||"";
      var game=get(href);
      if(!game)return;
      var name=card.querySelector(".game-name");
      var desc=card.querySelector(".game-desc");
      if(name&&name.textContent!==game.title)name.textContent=game.title;
      if(desc&&desc.textContent!==game.description)desc.textContent=game.description;
      card.setAttribute("data-game-id",game.id);
    });
  }

  function boot(){
    syncIndex();
    requestAnimationFrame(function(){requestAnimationFrame(syncIndex);});
    document.addEventListener("szp:games-rendered",syncIndex);
  }

  window.SZP_GAMES={
    version:VERSION,
    all:function(){return list();},
    get:get,
    list:list,
    daily:function(){return list({active:true,cadence:"daily"});},
    weekly:function(){return list({active:true,cadence:"weekly"});},
    minigames:function(){return list({active:true,kind:"minigame"});},
    syncIndex:syncIndex
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot); else boot();
  console.info("Szpilplac games-registry.js "+VERSION);
})();
