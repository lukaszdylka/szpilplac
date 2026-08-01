/* Szpilplac weekly-status.js v131 */
(function(){
  "use strict";
  var VERSION="v131";
  var accountPlayed=false;
  var queryRunning=false;
  var accountChecked=false;
  var observer=null;

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
    var today=new Date();
    var p;
    try{
      var parts=new Intl.DateTimeFormat("en-CA",{
        timeZone:"Europe/Warsaw",
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
      }).formatToParts(today);
      p={};
      parts.forEach(function(x){if(x.type!=="literal")p[x.type]=Number(x.value);});
    }catch(e){
      p={year:today.getFullYear(),month:today.getMonth()+1,day:today.getDate()};
    }
    var days=Math.floor((Date.UTC(p.year,p.month-1,p.day)-Date.UTC(2026,6,27))/86400000);
    var rawWeek=Math.floor(days/7);
    return {
      started:days>=0,
      mode:"weekly",
      week_index:Math.max(0,rawWeek),
      puzzle_no:Math.max(0,rawWeek)+1
    };
  }

  function localPlayed(){
    var current=info();
    if(!current.started)return false;
    try{
      if(window.SZP_GAME_PLAYED&&typeof window.SZP_GAME_PLAYED.isPlayed==="function"){
        return !!window.SZP_GAME_PLAYED.isPlayed("raja","weekly");
      }
    }catch(e){}
    try{
      var state=JSON.parse(localStorage.getItem("raja_weekly_v2_w"+current.week_index)||"null");
      if(state&&(state.status==="won"||state.status==="lost"||state.status==="finished"))return true;
      var stats=JSON.parse(localStorage.getItem("raja_weekly_stats_v2")||"null");
      var result=stats&&stats.weeks&&stats.weeks[String(current.week_index)];
      return !!(result&&(result.won===true||result.won===false));
    }catch(e){
      return false;
    }
  }

  function played(){
    return accountPlayed||localPlayed();
  }

  function patchGlobals(){
    if(typeof window.statusLabelForGame==="function"&&!window.statusLabelForGame.__szpWeekly131){
      var originalLabel=window.statusLabelForGame;
      var replacement=function(id,isPlayed){
        if(isRaja(id)){
          var text=labels();
          return isPlayed?text.done:text.play;
        }
        return originalLabel.apply(this,arguments);
      };
      replacement.__szpWeekly131=true;
      window.statusLabelForGame=replacement;
    }

    if(typeof window.playedRaja==="function"&&!window.playedRaja.__szpWeekly131){
      var replacementPlayed=function(){return played();};
      replacementPlayed.__szpWeekly131=true;
      window.playedRaja=replacementPlayed;
    }
  }

  function findCard(){
    var root=document.getElementById("games");
    if(!root)return null;
    return root.querySelector(
      '[data-game-id="raja"],'+
      '[data-game-id="zorta"],'+
      'a[href="raja/"],'+
      'a[href="/raja/"],'+
      'a[href$="/raja/"]'
    );
  }

  function applyBadge(){
    patchGlobals();
    var card=findCard();
    if(!card)return;
    var badge=card.querySelector(".badge");
    if(!badge)return;
    var done=played();
    var text=labels();
    var expected=done?text.done:text.play;
    var cls="badge "+(done?"done":"live");
    if(badge.textContent!==expected)badge.textContent=expected;
    if(badge.className!==cls)badge.className=cls;
  }

  function rerender(){
    patchGlobals();
    if(typeof window.renderGames==="function"){
      try{window.renderGames();}catch(e){}
    }
    applyBadge();
  }

  function wait(ms){
    return new Promise(function(resolve){setTimeout(resolve,ms);});
  }

  async function queryAccount(){
    if(queryRunning||accountChecked)return;
    queryRunning=true;
    var client=null;

    for(var i=0;i<24;i++){
      client=window.__SZPILPLAC_SUPABASE_CLIENT||null;
      if(client)break;
      await wait(250);
    }

    if(!client){
      queryRunning=false;
      return;
    }

    try{
      var sr=await client.auth.getSession();
      var session=sr&&sr.data&&sr.data.session;
      if(!session||!session.user){
        accountChecked=true;
        return;
      }

      var current=info();
      if(!current.started){
        accountChecked=true;
        return;
      }

      var result=await client.from("user_game_results")
        .select("game,mode,puzzle_no")
        .eq("user_id",session.user.id)
        .in("game",["zorta","raja"])
        .eq("mode","weekly")
        .eq("puzzle_no",current.puzzle_no)
        .limit(1);

      accountChecked=true;
      if(!result.error&&Array.isArray(result.data)&&result.data.length){
        accountPlayed=true;
        if(window.SZP_GAME_PLAYED&&typeof window.SZP_GAME_PLAYED.markAccountPlayed==="function"){
          window.SZP_GAME_PLAYED.markAccountPlayed("zorta","weekly",current.puzzle_no);
        }
        rerender();
      }
    }catch(e){
      console.warn("Raja weekly status",e);
    }finally{
      queryRunning=false;
    }
  }

  function watch(){
    var root=document.getElementById("games");
    if(root&&!observer){
      observer=new MutationObserver(function(){setTimeout(applyBadge,0);});
      observer.observe(root,{childList:true,subtree:true});
    }
    window.addEventListener("storage",function(e){
      if(!e||String(e.key||"").indexOf("raja_weekly")===0)rerender();
    });
  }

  function boot(){
    patchGlobals();
    watch();
    rerender();
    queryAccount();
    setTimeout(rerender,250);
    setTimeout(rerender,1000);
    setTimeout(queryAccount,2000);
    setTimeout(queryAccount,5000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  window.SZP_WEEKLY_STATUS={version:VERSION,refresh:rerender,isRajaPlayed:played};
  console.info("Szpilplac weekly-status.js "+VERSION);
})();
