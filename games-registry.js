/* Szpilplac games registry */
(function(){
  "use strict";

  var VERSION=window.SZP_BUILD_ID||"2026.08.01.4";
  var games=[
    {
      id:"slowko",aliases:["slowko"],title:"Słōwko",href:"slowko.html",
      cadence:["daily"],kind:"main",active:true,
      description:"Odgadnij śląskie słowo dnia w sześciu próbach."
    },
    {
      id:"cuzamen",aliases:["cuzamen"],title:"Cuzamen Szpil",href:"cuzamen.html",
      cadence:["daily"],kind:"main",active:true,
      description:"Znajdź cztery ukryte grupy śląskich słów i skojarzeń."
    },
    {
      id:"klodka",aliases:["klodka"],title:"Kłōdka",href:"klodka.html",
      cadence:["daily","weekly"],kind:"main",active:true,
      description:"Odgadnij czterocyfrowy kod, korzystając z informacji po każdej próbie."
    },
    {
      id:"raja",aliases:["raja","zorta"],title:"Raja",href:"raja/",
      cadence:["weekly"],kind:"main",active:true,
      description:"Ułóż pięć śląskich elementów we właściwej kolejności."
    },
    {
      id:"kopalnia",aliases:["kopalnia","starzik-w-kopalni"],title:"Starzik w kopalni",
      href:"minigra.html?g=kopalnia",file:"kopalnia.html",source:"file",
      cadence:["anytime"],kind:"minigame",active:true,icon:"mine",order:10,
      scoreLabel:"Rekord czasu",fullscreen:true,category:"Zręcznościowa",
      description:"Zbierz cały wyngiel, pilnuj metanu i wróć szolą na wiyrch."
    },
    {
      id:"na-wiyrch",aliases:["na-wiyrch","nawiyrch"],title:"Na Wiyrch",
      href:"minigra.html?g=na-wiyrch",file:"na-wiyrch.html",source:"file",
      cadence:["anytime"],kind:"minigame",active:true,icon:"climb",order:20,
      scoreLabel:"Rekord punktów",fullscreen:true,category:"Zręcznościowa",
      description:"Skacz po balkonach familoka i pnij się jak najwyżej."
    },
    {
      id:"bandyta",aliases:["bandyta","jednoreki-bandyta"],title:"Jednoręki bandyta",
      href:"minigra.html?g=bandyta",file:"bandyta.html",source:"file",
      cadence:["anytime"],kind:"minigame",active:true,icon:"slot",order:30,
      scoreLabel:"Rekord punktów",fullscreen:true,category:"Losowa",
      description:"Kręć, zatrzymuj symbole i składaj punktowane układy."
    },
    {
      id:"pong",aliases:["pong"],title:"Pong",
      href:"minigra.html?g=pong",file:"pong.html",source:"file",
      cadence:["anytime"],kind:"minigame",active:true,icon:"pong",order:40,
      scoreLabel:"Rekord serii",fullscreen:true,category:"Zręcznościowa",
      description:"Klasyk do trzech punktów. Wygrywaj pod rząd i bij rekord serii."
    }
  ];

  var minigameDefaults=[
    {
      id:"zeflik",aliases:["furgej-zeflik","furgejzeflik"],title:"Furgej, Zeflik!",
      icon:"bird",scoreLabel:"Rekord punktów",fullscreen:true,category:"Zręcznościowa",
      description:"Machaj skrzydłami Zeflika, przelatuj między familokami i zbieraj kołocz."
    },
    {
      id:"skok-do-nieba",aliases:["skok","skok-do-nieba-gra"],title:"Skok do nieba",
      icon:"jump",scoreLabel:"Rekord punktów",fullscreen:true,category:"Zręcznościowa",
      description:"Skacz coraz wyżej, zbieraj wyngiel i omijaj przeszkody nad familokiem."
    }
  ];

  function norm(value){
    var raw=String(value||"").trim();
    if(!raw)return "";
    try{
      var url=new URL(raw,location.origin);
      var queryGame=url.searchParams.get("g");
      if(queryGame)raw=queryGame;
      else raw=url.pathname;
    }catch(e){}
    return raw.toLowerCase()
      .replace(/^\/+|\/+$/g,"")
      .replace(/\.html$/i,"")
      .replace(/^minigra$/i,"");
  }

  function clone(item){return JSON.parse(JSON.stringify(item));}

  function aliasesContain(item,id){
    return (item.aliases||[]).some(function(alias){return norm(alias)===id;});
  }

  function get(id){
    var n=norm(id);
    for(var i=0;i<games.length;i++){
      var game=games[i];
      if(norm(game.id)===n||norm(game.href)===n||norm(game.file)===n||aliasesContain(game,n))return clone(game);
    }
    return null;
  }

  function minigameDefault(id){
    var n=norm(id);
    for(var i=0;i<minigameDefaults.length;i++){
      var item=minigameDefaults[i];
      if(norm(item.id)===n||aliasesContain(item,n))return clone(item);
    }
    return null;
  }

  function decorateMinigame(input){
    input=input||{};
    var id=norm(input.id||input.slug||input.href||input.file);
    var fallback=minigameDefault(id)||{};
    var result={};
    Object.keys(fallback).forEach(function(key){result[key]=fallback[key];});
    Object.keys(input).forEach(function(key){
      if(input[key]!==undefined&&input[key]!==null&&input[key]!=="")result[key]=input[key];
    });
    result.id=id||norm(result.id);
    result.kind="minigame";
    result.cadence=result.cadence||["anytime"];
    result.active=result.active!==false;
    result.href="minigra.html?g="+encodeURIComponent(result.id);
    result.icon=result.icon||"gamepad";
    result.description=result.description||"Krótka familockowa gierka dostępna od ręki.";
    return result;
  }

  function list(filter){
    return games.filter(function(game){
      if(!filter)return true;
      if(filter.kind&&game.kind!==filter.kind)return false;
      if(filter.active!=null&&game.active!==filter.active)return false;
      if(filter.cadence&&game.cadence.indexOf(filter.cadence)===-1)return false;
      return true;
    }).map(clone);
  }

  function syncIndex(){
    var root=document.getElementById("games");
    if(!root)return;
    root.querySelectorAll("a[href]").forEach(function(card){
      var game=get(card.getAttribute("href")||"");
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
    minigames:function(){return list({active:true,kind:"minigame"}).map(decorateMinigame);},
    minigameDefault:minigameDefault,
    decorateMinigame:decorateMinigame,
    minigameUrl:function(id){return "minigra.html?g="+encodeURIComponent(norm(id));},
    normalizeId:norm,
    syncIndex:syncIndex
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  console.info("Szpilplac games-registry.js "+VERSION);
})();
