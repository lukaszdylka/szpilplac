/* Szpilplac game-played.js v102 */
(function(){
  "use strict";
  var VERSION="v102";
  var accountPlayed={};
  function norm(game){var g=String(game||"").toLowerCase();return g==="raja"?"zorta":g;}
  function parse(k){try{return JSON.parse(localStorage.getItem(k)||"null");}catch(e){return null;}}
  function hasFinishedStatus(x){return !!(x&&(x.status==="won"||x.status==="lost"||x.status==="finished"||x.finished===true));}
  function isFinishedGame(x){return !!(x&&(hasFinishedStatus(x)||(x.game&&hasFinishedStatus(x.game))));}
  function hasResult(obj,key){return !!(obj&&obj.results&&obj.results[String(key)]);}
  function markAccountPlayed(game,mode,puzzleNo){
    if(!game||puzzleNo==null)return;
    var g=norm(game), m=mode==null?"any":String(mode).toLowerCase(), n=String(puzzleNo);
    accountPlayed[g+":"+m+":"+n]=true; accountPlayed[g+":any:"+n]=true;
  }
  function accountHasPlayed(game,puzzleNo,mode){
    var g=norm(game), n=String(puzzleNo);
    if(mode&&accountPlayed[g+":"+String(mode).toLowerCase()+":"+n])return true;
    return !!accountPlayed[g+":any:"+n];
  }
  function sameTodayDate(x){
    if(!x)return false;
    var a=String(x), today=(window.SZP_DAILY&&window.SZP_DAILY.warsawDateKey?window.SZP_DAILY.warsawDateKey(new Date()):new Date().toISOString().slice(0,10));
    return a===today || a===String(new Date().getFullYear()+"-"+(new Date().getMonth()+1)+"-"+new Date().getDate());
  }
  function isPlayed(game){
    var g=norm(game), info=(window.SZP_DAILY&&window.SZP_DAILY.gameInfo?window.SZP_DAILY.gameInfo(g):{day_index:0,puzzle_no:1,started:true});
    if(g==="zorta"&&!info.started)return false;
    if(accountHasPlayed(g,info.puzzle_no,"daily")||accountHasPlayed(g,info.puzzle_no))return true;
    if(g==="slowko"){
      if(isFinishedGame(parse("slowko_d"+info.day_index)))return true;
      var st=parse("slowko_v2"); return !!(st&&st.stats&&hasResult(st.stats,info.day_index));
    }
    if(g==="klodka"){
      if(isFinishedGame(parse("klodka_daily_v1_d"+info.puzzle_no)))return true;
      var cur=parse("klodka_daily_v1");
      if(cur){var curDay=cur.day!==undefined?cur.day:(cur.game&&cur.game.idx);if(String(curDay)===String(info.puzzle_no)&&isFinishedGame(cur))return true;}
      return hasResult(parse("klodka_daily_v1__hist"),info.puzzle_no);
    }
    if(g==="cuzamen"){
      var cg=parse("cuzamen_v1"); return !!(cg&&sameTodayDate(cg.date)&&cg.finished===true);
    }
    if(g==="zorta"){
      if(isFinishedGame(parse("zorta_daily_d"+info.day_index)))return true;
      var zs=parse("zorta_daily_stats_v1"); var r=zs&&zs.days&&zs.days[String(info.day_index)]; return !!(r&&(r.won===true||r.won===false));
    }
    return false;
  }
  window.SZP_GAME_PLAYED={version:VERSION,markAccountPlayed:markAccountPlayed,accountHasPlayed:accountHasPlayed,isPlayed:isPlayed,isFinishedGame:isFinishedGame};
  console.info("Szpilplac game-played.js "+VERSION);
})();
