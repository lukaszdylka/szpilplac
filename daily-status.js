/* Szpilplac daily-status.js v131 */
(function(){
  "use strict";
  var VERSION="v131";

  function parts(date){
    try{
      var p=new Intl.DateTimeFormat("en-CA",{
        timeZone:"Europe/Warsaw",
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
      }).formatToParts(date||new Date());
      var o={};
      p.forEach(function(x){if(x.type!=="literal")o[x.type]=Number(x.value);});
      return o;
    }catch(e){
      var d=date||new Date();
      return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate()};
    }
  }

  function key(date){
    var p=parts(date||new Date());
    return p.year+"-"+String(p.month).padStart(2,"0")+"-"+String(p.day).padStart(2,"0");
  }

  function dayUtc(date){
    var p=parts(date||new Date());
    return Date.UTC(p.year,p.month-1,p.day);
  }

  function dayIndexSince(y,m,d,date){
    return Math.floor((dayUtc(date||new Date())-Date.UTC(y,m-1,d))/86400000);
  }

  function gameInfo(game,date){
    var g=String(game||"").toLowerCase();
    if(g==="raja")g="zorta";

    if(g==="zorta"){
      var rawDays=dayIndexSince(2026,7,27,date);
      var rawWeek=Math.floor(rawDays/7);
      var started=rawDays>=0;
      var weekIndex=Math.max(0,rawWeek);
      return {
        game:g,
        mode:"weekly",
        raw_day_index:rawDays,
        raw_week_index:rawWeek,
        day_index:weekIndex,
        week_index:weekIndex,
        puzzle_no:weekIndex+1,
        started:started,
        date_key:key(date||new Date())
      };
    }

    var raw=dayIndexSince(2026,6,23,date);
    return {
      game:g,
      mode:"daily",
      raw_day_index:raw,
      day_index:Math.max(0,raw),
      puzzle_no:Math.max(0,raw)+1,
      started:raw>=0,
      date_key:key(date||new Date())
    };
  }

  function sameWarsawDay(a,b){
    return key(a||new Date())===key(b||new Date());
  }

  function isRecentFinishedAt(iso){
    if(!iso)return false;
    var d=new Date(iso);
    if(isNaN(d.getTime()))return false;
    return sameWarsawDay(d,new Date());
  }

  window.SZP_DAILY={
    version:VERSION,
    warsawParts:parts,
    warsawDateKey:key,
    dayIndexSince:dayIndexSince,
    gameInfo:gameInfo,
    sameWarsawDay:sameWarsawDay,
    isRecentFinishedAt:isRecentFinishedAt
  };
  console.info("Szpilplac daily-status.js "+VERSION);
})();
