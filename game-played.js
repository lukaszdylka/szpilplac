/* Szpilplac game-played.js */
(function(){
  "use strict";
  var VERSION=window.SZP_BUILD_ID||"2026.08.01.2";
  var accountPlayed={};

  function norm(game){
    var g=String(game||"").toLowerCase();
    return g==="raja"?"zorta":g;
  }

  function parse(k){
    try{return JSON.parse(localStorage.getItem(k)||"null");}
    catch(e){return null;}
  }

  function hasFinishedStatus(x){
    return !!(x&&(x.status==="won"||x.status==="lost"||x.status==="finished"||x.finished===true));
  }

  function isFinishedGame(x){
    return !!(x&&(hasFinishedStatus(x)||(x.game&&hasFinishedStatus(x.game))));
  }

  function hasResult(obj,key){
    return !!(obj&&obj.results&&obj.results[String(key)]);
  }

  function emit(game,mode,puzzleNo,source){
    try{
      document.dispatchEvent(new CustomEvent("szp:game-played",{
        detail:{game:norm(game),mode:String(mode||"any").toLowerCase(),puzzle_no:puzzleNo,source:source||"account"}
      }));
    }catch(e){}
  }

  function markAccountPlayed(game,mode,puzzleNo){
    if(!game||puzzleNo==null)return;
    var g=norm(game),m=mode==null?"any":String(mode).toLowerCase(),n=String(puzzleNo);
    accountPlayed[g+":"+m+":"+n]=true;
    accountPlayed[g+":any:"+n]=true;
    emit(g,m,puzzleNo,"account");
  }

  function accountHasPlayed(game,puzzleNo,mode){
    var g=norm(game),n=String(puzzleNo);
    if(mode&&accountPlayed[g+":"+String(mode).toLowerCase()+":"+n])return true;
    return !!accountPlayed[g+":any:"+n];
  }

  function sameTodayDate(x){
    if(!x)return false;
    var a=String(x);
    var today=(window.SZP_DAILY&&window.SZP_DAILY.warsawDateKey)
      ?window.SZP_DAILY.warsawDateKey(new Date())
      :new Date().toISOString().slice(0,10);
    return a===today||a===String(new Date().getFullYear()+"-"+(new Date().getMonth()+1)+"-"+new Date().getDate());
  }

  function isPlayed(game,requestedMode){
    var g=norm(game);
    var info=(window.SZP_DAILY&&window.SZP_DAILY.gameInfo)
      ?window.SZP_DAILY.gameInfo(g)
      :{day_index:0,week_index:0,puzzle_no:1,started:true,mode:"daily"};
    var mode=String(requestedMode||info.mode||"daily").toLowerCase();

    if(g==="zorta"&&!info.started)return false;

    if(g==="slowko"){
      if(accountHasPlayed(g,info.puzzle_no,"daily"))return true;
      if(isFinishedGame(parse("slowko_d"+info.day_index)))return true;
      var st=parse("slowko_v2");
      return !!(st&&st.stats&&hasResult(st.stats,info.day_index));
    }

    if(g==="klodka"){
      if(accountHasPlayed(g,info.puzzle_no,mode))return true;
      if(mode==="weekly"){
        if(isFinishedGame(parse("klodka_weekly_v1_w"+info.puzzle_no)))return true;
        var wk=parse("klodka_weekly_v1");
        if(wk){
          var curWeek=wk.week!==undefined?wk.week:(wk.game&&wk.game.idx);
          if(String(curWeek)===String(info.puzzle_no)&&isFinishedGame(wk))return true;
        }
        return hasResult(parse("klodka_weekly_v1__hist"),info.puzzle_no);
      }
      if(isFinishedGame(parse("klodka_daily_v1_d"+info.puzzle_no)))return true;
      var cur=parse("klodka_daily_v1");
      if(cur){
        var curDay=cur.day!==undefined?cur.day:(cur.game&&cur.game.idx);
        if(String(curDay)===String(info.puzzle_no)&&isFinishedGame(cur))return true;
      }
      return hasResult(parse("klodka_daily_v1__hist"),info.puzzle_no);
    }

    if(g==="cuzamen"){
      var cg=parse("cuzamen_v1");
      return !!(cg&&sameTodayDate(cg.date)&&cg.finished===true);
    }

    if(g==="zorta"){
      var weekIndex=info.week_index!==undefined?info.week_index:info.day_index;
      if(accountHasPlayed(g,info.puzzle_no,"weekly"))return true;
      if(isFinishedGame(parse("raja_weekly_v2_w"+weekIndex)))return true;
      var rs=parse("raja_weekly_stats_v2");
      var rr=rs&&rs.weeks&&rs.weeks[String(weekIndex)];
      return !!(rr&&(rr.won===true||rr.won===false));
    }

    return false;
  }

  window.SZP_GAME_PLAYED={
    version:VERSION,
    markAccountPlayed:markAccountPlayed,
    accountHasPlayed:accountHasPlayed,
    isPlayed:isPlayed,
    isFinishedGame:isFinishedGame
  };
  console.info("Szpilplac game-played.js "+VERSION);
})();
