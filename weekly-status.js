/* Szpilplac weekly-status.js */
(function(){
  "use strict";
  var VERSION=window.SZP_BUILD_ID||"2026.08.01.2";
  var accountPlayed=false;
  var accountChecked=false;

  function isRaja(id){
    var g=String(id||"").toLowerCase();
    return g==="raja"||g==="zorta";
  }

  function labels(){
    var lang="pl";
    try{lang=String(localStorage.getItem("familock_lang")||"pl").toLowerCase();}catch(e){}
    var sl=lang==="szl"||lang==="sl"||lang==="śl";
    return sl
      ?{play:"Szpilej w tym tydniu",done:"Zagrane w tym tydniu"}
      :{play:"Zagraj w tym tygodniu",done:"Zagrane w tym tygodniu"};
  }

  function info(){
    if(window.SZP_DAILY&&typeof window.SZP_DAILY.gameInfo==="function"){
      return window.SZP_DAILY.gameInfo("raja");
    }
    return {started:true,mode:"weekly",week_index:0,puzzle_no:1};
  }

  function localPlayed(){
    var current=info();
    if(!current.started)return false;
    try{
      return !!(window.SZP_GAME_PLAYED&&window.SZP_GAME_PLAYED.isPlayed&&window.SZP_GAME_PLAYED.isPlayed("raja","weekly"));
    }catch(e){return false;}
  }

  function played(){
    return accountPlayed||localPlayed();
  }

  function patchGlobals(){
    if(typeof window.statusLabelForGame==="function"&&!window.statusLabelForGame.__szpWeekly){
      var originalLabel=window.statusLabelForGame;
      var replacement=function(id,isPlayed){
        if(isRaja(id)){
          var text=labels();
          return isPlayed?text.done:text.play;
        }
        return originalLabel.apply(this,arguments);
      };
      replacement.__szpWeekly=true;
      window.statusLabelForGame=replacement;
    }

    if(typeof window.playedRaja==="function"&&!window.playedRaja.__szpWeekly){
      var replacementPlayed=function(){return played();};
      replacementPlayed.__szpWeekly=true;
      window.playedRaja=replacementPlayed;
    }
  }

  function applyBadge(){
    var root=document.getElementById("games");
    if(!root)return;
    var card=root.querySelector('[data-game-id="raja"],[data-game-id="zorta"],a[href="raja/"],a[href="/raja/"],a[href$="/raja/"]');
    if(!card)return;
    var badge=card.querySelector(".badge");
    if(!badge)return;
    var done=played();
    var text=labels();
    badge.textContent=done?text.done:text.play;
    badge.className="badge "+(done?"done":"live");
  }

  function rerender(){
    patchGlobals();
    if(typeof window.renderGames==="function"){
      try{window.renderGames();}catch(e){}
    }
    if(window.SZP_GAMES&&typeof window.SZP_GAMES.syncIndex==="function"){
      window.SZP_GAMES.syncIndex();
    }
    applyBadge();
    try{document.dispatchEvent(new CustomEvent("szp:games-rendered"));}catch(e){}
  }

  async function getClient(){
    if(window.__SZPILPLAC_SUPABASE_CLIENT)return window.__SZPILPLAC_SUPABASE_CLIENT;
    if(typeof window.client==="function"){
      try{return await window.client();}catch(e){return null;}
    }
    return null;
  }

  async function queryAccount(){
    if(accountChecked)return;
    accountChecked=true;
    var client=await getClient();
    if(!client)return;

    try{
      var sr=await client.auth.getSession();
      var session=sr&&sr.data&&sr.data.session;
      if(!session||!session.user)return;
      var current=info();
      if(!current.started)return;

      var result=await client.from("user_game_results")
        .select("game,mode,puzzle_no")
        .eq("user_id",session.user.id)
        .in("game",["zorta","raja"])
        .eq("mode","weekly")
        .eq("puzzle_no",current.puzzle_no)
        .limit(1);

      if(!result.error&&Array.isArray(result.data)&&result.data.length){
        accountPlayed=true;
        if(window.SZP_GAME_PLAYED&&typeof window.SZP_GAME_PLAYED.markAccountPlayed==="function"){
          window.SZP_GAME_PLAYED.markAccountPlayed("zorta","weekly",current.puzzle_no);
        }
        rerender();
      }
    }catch(e){
      console.warn("Raja weekly status",e);
    }
  }

  function boot(){
    patchGlobals();
    rerender();
    queryAccount();
    document.addEventListener("szp:game-played",function(e){
      if(!e||!e.detail||isRaja(e.detail.game))rerender();
    });
    window.addEventListener("storage",function(e){
      if(!e||String(e.key||"").indexOf("raja_weekly")===0)rerender();
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  window.SZP_WEEKLY_STATUS={version:VERSION,refresh:rerender,isRajaPlayed:played};
  console.info("Szpilplac weekly-status.js "+VERSION);
})();
