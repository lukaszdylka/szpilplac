/* Szpilplac account streak and cadence view v131 */
(function(){
  "use strict";

  var VERSION="v131";
  var originalLoadResults=typeof window.loadResults==="function" ? window.loadResults : null;

  function esc(value){
    return String(value==null?"":value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }

  function warsawKey(date){
    try{
      var p=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date||new Date());
      var o={};p.forEach(function(x){if(x.type!=="literal")o[x.type]=x.value;});
      return o.year+"-"+o.month+"-"+o.day;
    }catch(e){return (date||new Date()).toISOString().slice(0,10);}
  }

  function addDays(key,amount){
    var p=String(key).split("-").map(Number);
    var d=new Date(Date.UTC(p[0],p[1]-1,p[2]+amount,12));
    return d.toISOString().slice(0,10);
  }

  function weekStartKey(date){
    var key=warsawKey(date||new Date());
    var p=key.split("-").map(Number);
    var d=new Date(Date.UTC(p[0],p[1]-1,p[2],12));
    var dow=d.getUTCDay()||7;
    d.setUTCDate(d.getUTCDate()-(dow-1));
    return d.toISOString().slice(0,10);
  }

  function normGame(value){
    var g=String(value||"").toLowerCase();
    return g==="zorta"?"raja":g;
  }

  function localPlayed(game,mode){
    try{
      return !!(window.SZP_GAME_PLAYED&&window.SZP_GAME_PLAYED.isPlayed&&window.SZP_GAME_PLAYED.isPlayed(game,mode));
    }catch(e){return false;}
  }

  function hrefFor(game){return game&&game.href?game.href:"#";}

  function gameChip(game,done,sub){
    return '<a class="daily-chip '+(done?'done':'')+'" href="'+esc(hrefFor(game))+'">'+
      '<div class="mark">'+(done?'✓':'—')+'</div>'+
      '<div class="name">'+esc(game.title)+'</div>'+
      (sub?'<div class="sub">'+esc(sub)+'</div>':'')+
    '</a>';
  }

  function render(rows){
    var box=document.getElementById("profileProgressBody");
    if(!box)return;

    rows=Array.isArray(rows)?rows:[];
    var today=warsawKey(new Date());
    var weekStart=weekStartKey(new Date());
    var playedDays={};
    var dailyGames=(window.SZP_GAMES&&window.SZP_GAMES.daily)?window.SZP_GAMES.daily():[];
    var weeklyGames=(window.SZP_GAMES&&window.SZP_GAMES.weekly)?window.SZP_GAMES.weekly():[];
    var dailyDone={};
    var weeklyDone={};

    rows.forEach(function(row){
      if(!row||!row.finished_at)return;
      var when=warsawKey(new Date(row.finished_at));
      var game=normGame(row.game);
      playedDays[when]=true;
      var mode=String(row.mode||"").toLowerCase();
      if(when===today && !(game==="klodka"&&mode==="weekly"))dailyDone[game]=true;
      if(when>=weekStart && (game!=="klodka"||mode==="weekly"))weeklyDone[game]=true;
    });

    dailyGames.forEach(function(game){
      if(localPlayed(game.id,"daily"))dailyDone[game.id]=true;
    });

    weeklyGames.forEach(function(game){
      if(localPlayed(game.id,"weekly"))weeklyDone[game.id]=true;
    });

    if(Object.keys(dailyDone).some(function(k){return dailyDone[k];}))playedDays[today]=true;

    var todayPlayed=!!playedDays[today];
    var cursor=todayPlayed?today:addDays(today,-1);
    var streak=0;
    while(playedDays[cursor]){
      streak++;
      cursor=addDays(cursor,-1);
    }

    var streakLabel=streak+" "+(streak===1?"dzień":"dni");
    var streakNote=todayPlayed
      ? "Dzisiejsza aktywność jest już zaliczona."
      : (streak?"Zagraj dziś w dowolną grę, żeby seria trwała dalej.":"Zagraj dziś w dowolną grę, żeby rozpocząć serię.");

    var dailyHtml=dailyGames.map(function(game){
      return gameChip(game,!!dailyDone[game.id],"codziennie");
    }).join("");

    var weeklyHtml=weeklyGames.map(function(game){
      return gameChip(game,!!weeklyDone[game.id],"w tym tygodniu");
    }).join("");

    var sub=document.querySelector(".profile-progress .progress-sub");
    if(sub)sub.textContent="Seria kolejnych dni oraz gry codzienne i tygodniowe.";

    box.innerHTML=
      '<div class="progress-card wide szp-streak-main">'+
        '<div class="progress-kicker">Seria aktywności</div>'+
        '<div class="progress-main">'+esc(streakLabel)+'</div>'+
        '<div class="progress-note">Każdy kolejny dzień liczy się, gdy ukończysz przynajmniej jedną grę. '+esc(streakNote)+'</div>'+
      '</div>'+
      '<div class="progress-card">'+
        '<div class="progress-kicker">Dzisiaj</div>'+
        '<div class="progress-main">'+(todayPlayed?'Zagrano':'Do zagrania')+'</div>'+
        '<div class="progress-note">Nie trzeba robić całego kompletu. Wystarczy jedna ukończona gra.</div>'+
      '</div>'+
      '<div class="progress-card wide">'+
        '<div class="progress-kicker">Gry codzienne</div>'+
        '<div class="daily-games">'+dailyHtml+'</div>'+
      '</div>'+
      '<div class="progress-card wide">'+
        '<div class="progress-kicker">Gry tygodniowe</div>'+
        '<div class="daily-games">'+weeklyHtml+'</div>'+
      '</div>';
  }

  window.renderProfileProgress=render;

  if(originalLoadResults){
    window.loadResults=async function(userId){
      await originalLoadResults(userId);
      try{
        if(!window.sb||!userId)return;
        var res=await window.sb.from("user_game_results")
          .select("game,mode,puzzle_no,won,tries,errors,score,finished_at")
          .eq("user_id",userId)
          .order("finished_at",{ascending:false})
          .limit(2000);
        if(!res.error)render(res.data||[]);
      }catch(e){}
    };
  }

  function refresh(){
    try{
      if(window.currentUser&&window.currentUser.id&&typeof window.loadResults==="function"){
        window.loadResults(window.currentUser.id);
      }
    }catch(e){}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh); else setTimeout(refresh,0);
  console.info("Szpilplac streak-progress-v2.js "+VERSION);
})();
