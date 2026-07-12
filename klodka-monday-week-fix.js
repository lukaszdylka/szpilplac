/*
  Szpilplac Kłōdka — fix tygodniówki od poniedziałku v1
  Surowy plik JS. Wgraj do katalogu głównego obok klodka.html.
  W klodka.html dodaj przed klodka-auth-bridge.js:
  <script src="klodka-monday-week-fix.js?v=1"></script>
*/
(function(){
  "use strict";

  var VERSION = "v1";
  var BASE_MONDAY_UTC = Date.UTC(2026,5,22); // tydzień 1 = 22–28.06.2026

  function warsawTodayUtc(){
    var parts = new Intl.DateTimeFormat("en-CA",{
      timeZone:"Europe/Warsaw",
      year:"numeric",
      month:"2-digit",
      day:"2-digit"
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function(p){
      if(p.type !== "literal") o[p.type] = Number(p.value);
    });
    return Date.UTC(o.year,o.month-1,o.day);
  }

  function mondayWeekNo(){
    try{
      return Math.max(1, Math.floor((warsawTodayUtc() - BASE_MONDAY_UTC) / 604800000) + 1);
    }catch(e){
      return Number(window.WEEK_NO || 1);
    }
  }

  function applyMondayWeekNo(){
    var n = mondayWeekNo();
    if(!Number.isFinite(n) || n < 1) return;
    if(Number(window.WEEK_NO) !== n){
      window.WEEK_NO = n;
      try{ window.current = ""; }catch(e){}
    }
  }

  function refreshKlodkaIfPossible(){
    try{
      if(window.view === "weekly" && typeof window.loadGame === "function" && typeof window.renderStatic === "function"){
        window.current = "";
        window.loadGame();
        window.renderStatic();
        if(typeof window.fetchWeeklyHint === "function") window.fetchWeeklyHint();
      }
      if(typeof window.refreshWeektile === "function") window.refreshWeektile();
    }catch(e){
      console.warn("Kłōdka monday week refresh error", e);
    }
  }

  function patchCountdown(){
    if(typeof window.countdown !== "function" || window.countdown.__mondayFixed) return;
    var original = window.countdown;
    var fixed = function(){
      try{
        if(window.view !== "weekly") return original.apply(this, arguments);
        var now = new Date();
        var week = mondayWeekNo();
        var baseMonday = new Date(2026,5,22); // lokalnie: poniedziałek 22.06.2026
        var nextWeekStart = new Date(baseMonday);
        nextWeekStart.setDate(baseMonday.getDate() + week * 7);
        var ms = nextWeekStart - now;
        if(ms < 0) ms = 0;
        var h = Math.floor(ms / 3600000);
        var m = Math.floor(ms % 3600000 / 60000);
        var s = Math.floor(ms % 60000 / 1000);
        return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
      }catch(e){
        return original.apply(this, arguments);
      }
    };
    fixed.__mondayFixed = true;
    window.countdown = fixed;
  }

  function patchSwitchView(){
    if(typeof window.switchView !== "function" || window.switchView.__mondayFixed) return;
    var original = window.switchView;
    var fixed = function(){
      applyMondayWeekNo();
      var ret = original.apply(this, arguments);
      setTimeout(function(){ applyMondayWeekNo(); refreshKlodkaIfPossible(); }, 30);
      setTimeout(function(){ applyMondayWeekNo(); refreshKlodkaIfPossible(); }, 400);
      return ret;
    };
    fixed.__mondayFixed = true;
    window.switchView = fixed;
  }

  function syncReflexBlock(){
    try{
      var el = document.getElementById("weeklyHintGame");
      if(!el) return;
      if(mondayWeekNo() !== 3){
        el.remove();
        return;
      }
      var hint = document.getElementById("weeklyHint");
      if(hint) el.classList.toggle("on", hint.classList.contains("on"));
    }catch(e){}
  }

  function boot(){
    applyMondayWeekNo();
    patchCountdown();
    patchSwitchView();
    refreshKlodkaIfPossible();
    syncReflexBlock();
    window.SZP_KLODKA_MONDAY_WEEK_FIX = {
      version: VERSION,
      mondayWeekNo: mondayWeekNo,
      apply: function(){ applyMondayWeekNo(); refreshKlodkaIfPossible(); syncReflexBlock(); }
    };
    console.info("Szpilplac klodka-monday-week-fix.js " + VERSION + " · WEEK_NO=" + window.WEEK_NO);
  }

  // Ważne: wykonuje się od razu, zanim DOMContentLoaded odpali blok Testu refleksu.
  boot();

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      boot();
      setTimeout(boot, 250);
      setTimeout(boot, 900);
    });
  }else{
    setTimeout(boot, 0);
    setTimeout(boot, 250);
  }
})();
