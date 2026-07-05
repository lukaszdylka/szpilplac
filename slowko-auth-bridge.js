/*
  Szpilplac Słōwko Account Bridge v110
  -----------------------------------
  - zapisuje wynik Słōwka na koncie
  - nie zmienia logiki zgadywania
  - blokuje ponowne granie na drugim urządzeniu, jeśli wynik na dziś jest już zapisany na koncie
*/

(function(){
  "use strict";

  var VERSION = "v110";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";

  var STATE = {
    booted:false,
    depsReady:null,
    attempts:{},
    crossDeviceApplied:false,
    saveStartedAt:0
  };


  function todayIdx(){
    try{
      if(typeof window.TODAY_IDX === "number")return window.TODAY_IDX;
      if(typeof window.todayIndex === "function")return window.todayIndex();
    }catch(e){}
    return null;
  }

  function storageGet(k){
    try{return localStorage.getItem(k);}catch(e){return null;}
  }

  function storageSet(k,v){
    try{localStorage.setItem(k,v);}catch(e){}
  }

  function resetDailyAssistDefaults(){
    /*
      v83:
      Kategoria i tłumaczenie są podpowiedziami.
      Nie mogą przechodzić automatycznie z poprzedniego dnia,
      bo gracz mógłby stracić odznakę "Bez Podpowiydzi" przez stary zapis.
      Reset jest raz dziennie. W tym samym dniu świadomy wybór gracza zostaje.
    */
    var idx = todayIdx();
    if(idx === null || !Number.isFinite(Number(idx)))return;

    var resetKey = "slowko_assist_reset_day_v83";
    var today = String(idx);

    if(storageGet(resetKey) === today)return;

    storageSet("slowko_hint","off");
    storageSet("slowko_cat","off");
    storageSet(resetKey,today);

    try{window.hintMode = "off";}catch(e){}
    try{window.catMode = "off";}catch(e){}
    try{window.hintShown = false;}catch(e){}
    try{window.categoryShown = false;}catch(e){}
    try{window.hintsUsed = 0;}catch(e){}

    try{
      if(typeof window.updateHintBar === "function")window.updateHintBar();
      if(typeof window.updateCatBar === "function")window.updateCatBar();
    }catch(e){}
  }

  function patchAssistUsageTracking(){
    if(typeof window.updateCatBar === "function" && !window.updateCatBar.__szpV83){
      var originalCat = window.updateCatBar;
      window.updateCatBar = function(){
        var ret = originalCat.apply(this, arguments);
        try{
          var el = document.getElementById("catBar");
          if(el && el.style.display !== "none" && String(el.textContent || "").trim()){
            window.categoryShown = true;
            window.hintsUsed = Math.max(Number(window.hintsUsed || 0), 1);
          }
        }catch(e){}
        return ret;
      };
      window.updateCatBar.__szpV83 = true;
    }

    if(typeof window.updateHintBar === "function" && !window.updateHintBar.__szpV83){
      var originalHint = window.updateHintBar;
      window.updateHintBar = function(){
        var ret = originalHint.apply(this, arguments);
        try{
          var el = document.getElementById("hintBar");
          if(el && el.style.display !== "none" && String(el.textContent || "").trim().indexOf("???") === -1){
            if(window.hintShown){
              window.hintsUsed = Math.max(Number(window.hintsUsed || 0), 1);
            }
          }
        }catch(e){}
        return ret;
      };
      window.updateHintBar.__szpV83 = true;
    }
  }


  var TEXT = {
    pl:{
      saving:"Zapisuję wynik...",
      saved:"Wynik zapisany na koncie.",
      notLogged:"Wynik lokalny. Zaloguj się, żeby zapisać go w rankingu.",
      login:"Zaloguj się",
      archive:"Archiwum — wynik lokalny.",
      tester:"Tryb testowy — bez rankingu.",
      noAuth:"Wynik lokalny. Konto chwilowo niedostępne.",
      score:"Punkty",
      hint:"z podpowiedzią",
      error:"Nie udało się zapisać wyniku.",
      already:"Ten dzień masz już zapisany na koncie.",
      alreadyMeta:"Wynik z innego urządzenia",
      won:"wygrana",
      lost:"nieukończone"
    },
    szl:{
      saving:"Spamiyntuja wynik...",
      saved:"Wynik spamiyntany na kōncie.",
      notLogged:"Wynik lokalny. Zaloguj sie, coby spamiyntać go w rankingu.",
      login:"Zaloguj sie",
      archive:"Archiwum — wynik lokalny.",
      tester:"Tryb testowy — bez rankingu.",
      noAuth:"Wynik lokalny. Kōnto chwilowo niydostympne.",
      score:"Punkty",
      hint:"z podpowiydziōm",
      error:"Niy szło spamiyntać wyniku.",
      already:"Tyn dziyń mosz już spamiyntany na kōncie.",
      alreadyMeta:"Wynik z inkszego urzōndzynio",
      won:"wygrano",
      lost:"niyukończōne"
    }
  };

  function getLang(){
    try{
      if(window.lang === "szl")return "szl";
      return localStorage.getItem("familock_lang") === "szl" ? "szl" : "pl";
    }catch(e){return "pl";}
  }
  function t(key){
    var pack = TEXT[getLang()] || TEXT.pl;
    return pack[key] || TEXT.pl[key] || key;
  }
  function esc(value){
    return String(value == null ? "" : value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function loadScript(src,testFn){
    if(typeof testFn === "function" && testFn())return Promise.resolve();
    return new Promise(function(resolve,reject){
      var clean = src.split("?")[0];
      var existing = Array.prototype.slice.call(document.scripts || []).find(function(s){
        return s.src && s.src.indexOf(clean) !== -1;
      });
      if(existing){
        if(typeof testFn !== "function" || testFn())return resolve();
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",reject,{once:true});
        return;
      }
      var sc = document.createElement("script");
      sc.src = src;
      sc.async = false;
      sc.onload = resolve;
      sc.onerror = reject;
      document.head.appendChild(sc);
    });
  }
  function ensureAuthWidgetContainer(){
    if(document.getElementById("szpAuthWidget"))return;
    var node = document.createElement("div");
    node.id = "szpAuthWidget";
    var nav = document.getElementById("navBar");
    if(nav && nav.parentNode){
      nav.insertAdjacentElement("afterend",node);
      return;
    }
    var header = document.querySelector("header");
    if(header){
      header.appendChild(node);
      return;
    }
    document.body.insertAdjacentElement("afterbegin",node);
  }
  async function ensureDeps(){
    if(STATE.depsReady)return STATE.depsReady;

    STATE.depsReady = (async function(){
      ensureAuthWidgetContainer();

      await loadScript("config.js?v=13",function(){return !!window.SZPILPLAC_CONFIG;});
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
      await loadScript("auth-widget.js?v=13",function(){return !!window.SZPILPLAC_AUTH;});

      if(window.SZPILPLAC_AUTH && typeof window.SZPILPLAC_AUTH.init === "function"){
        await window.SZPILPLAC_AUTH.init({
          container:"#szpAuthWidget",
          lang:getLang()
        });
      }

      return true;
    })();

    return STATE.depsReady;
  }
  function getGame(){
    return window.game || null;
  }
  function puzzleNo(){
    var pno = Number(window.PNO);
    if(Number.isFinite(pno) && pno > 0)return pno;

    var day = Number(window.currentDay);
    if(Number.isFinite(day))return day + 1;

    return null;
  }
  function isTodayPuzzle(){
    return Number(window.currentDay) === Number(window.TODAY_IDX);
  }
  function isTesterMode(){
    return !!window.IS_TESTER;
  }
  function isArchivePuzzle(){
    return Number(window.currentDay) < Number(window.TODAY_IDX);
  }
  function dayKey(){
    var day = Number(window.currentDay);
    if(!Number.isFinite(day))return null;
    return "slowko_d" + day;
  }
  function hasLocalFinishedToday(){
    try{
      var key = dayKey();
      if(!key)return false;
      var raw = localStorage.getItem(key);
      if(!raw)return false;
      var g = JSON.parse(raw);
      return !!(g && (g.status === "won" || g.status === "lost"));
    }catch(e){
      return false;
    }
  }
  function getTries(){
    var g = getGame();
    return g && Array.isArray(g.guesses) ? g.guesses.length : null;
  }
  function usedHint(){
    return !!window.hintShown;
  }
  function calculateScore(won){
    var tries = getTries() || 0;
    if(!won)return 5;

    var pointsByTry = [100,85,70,55,40,25];
    var score = pointsByTry[Math.max(0,tries - 1)] || 10;

    if(usedHint()){
      score = Math.max(10, score - 15);
    }

    return score;
  }
  function resultPayload(won){
    var tries = getTries();
    var pno = puzzleNo();

    return {
      game:"slowko",
      mode:"daily",
      puzzleNo:pno,
      won:!!won,
      tries:tries,
      errors:tries == null ? null : (won ? Math.max(0, tries - 1) : tries),
      score:calculateScore(!!won)
    };
  }
  function accountNoteNode(){
    var modal = document.getElementById("modal");
    if(!modal)return null;

    var node = document.getElementById("slowkoAccountSaveNote");
    if(node)return node;

    node = document.createElement("div");
    node.id = "slowkoAccountSaveNote";
    node.className = "szp-auth-save-note";

    var share = document.getElementById("shareBtn");
    if(share){
      share.insertAdjacentElement("afterend",node);
      return node;
    }

    modal.appendChild(node);
    return node;
  }
  function renderNote(kind,message,payload){
    var node = accountNoteNode();
    if(!node)return;

    node.className = "szp-auth-save-note";
    if(kind === "ok")node.classList.add("ok");
    if(kind === "err")node.classList.add("err");

    var html = esc(message);

    if(payload && Number.isFinite(payload.score)){
      html += " <b>" + esc(t("score")) + ": " + esc(payload.score) + "</b>.";
      if(usedHint() && payload.won){
        html += " <span>(" + esc(t("hint")) + ")</span>";
      }
    }

    if(kind === "login"){
      html += ' <a href="konto.html">' + esc(t("login")) + "</a>";
    }

    node.innerHTML = html;
  }
  function renderLocalReason(){
    if(isTesterMode()){
      renderNote("",t("tester"));
      return true;
    }

    if(isArchivePuzzle()){
      renderNote("",t("archive"));
      return true;
    }

    return false;
  }
  function attemptKey(){
    return "slowko:" + puzzleNo();
  }
  async function saveCurrentResult(source){
    var g = getGame();
    if(!g || (g.status !== "won" && g.status !== "lost"))return;

    if(renderLocalReason())return;
    if(!isTodayPuzzle())return;

    var key = attemptKey();
    if(STATE.attempts[key])return;
    STATE.attempts[key] = true;

    var won = g.status === "won";
    var payload = resultPayload(won);

    if(!Number.isFinite(payload.puzzleNo)){
      renderNote("err",t("error"));
      return;
    }

    renderNote("",t("saving"),payload);

    try{
      await ensureDeps();

      if(!window.SZPILPLAC_AUTH || typeof window.SZPILPLAC_AUTH.saveResult !== "function"){
        renderNote("err",t("noAuth"),payload);
        return;
      }

      if(typeof window.SZPILPLAC_AUTH.refresh === "function"){
        try{await window.SZPILPLAC_AUTH.refresh();}catch(e){}
      }

      var res = await window.SZPILPLAC_AUTH.saveResult(payload);

      if(res && res.saved){
        renderNote("ok",t("saved"),payload);
        return;
      }

      if(res && res.reason === "not_logged_in"){
        renderNote("login",t("notLogged"),payload);
        return;
      }

      renderNote("err",(res && res.message) || t("error"),payload);
    }catch(err){
      console.warn("Szpilplac slowko bridge save error:",err);
      renderNote("err",t("error"),payload);
    }
  }
  function injectCrossDeviceStyle(){
    if(document.getElementById("slowkoCrossDeviceStyle"))return;
    var st = document.createElement("style");
    st.id = "slowkoCrossDeviceStyle";
    st.textContent =
      ".slowko-account-done{width:100%;max-width:500px;margin:8px auto 10px;padding:11px 12px;border:1px solid var(--line,#c9bfa6);border-radius:13px;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);font-size:12.5px;line-height:1.45;text-align:center}" +
      ".slowko-account-done b{color:var(--green,#2f4a39)}";
    document.head.appendChild(st);
  }
  function showCrossDeviceResult(row){
    if(!row || STATE.crossDeviceApplied)return;
    if(!isTodayPuzzle() || isTesterMode() || isArchivePuzzle())return;
    if(hasLocalFinishedToday())return;

    var g = getGame();
    if(!g)return;

    STATE.crossDeviceApplied = true;

    try{
      g.status = row.won ? "won" : "lost";
      if(!Array.isArray(g.guesses))g.guesses = [];
      window.game = g;
    }catch(e){}

    var kbd = document.getElementById("kbd");
    if(kbd)kbd.style.display = "none";

    var msg = document.getElementById("slowkoAccountDone");
    if(!msg){
      injectCrossDeviceStyle();
      msg = document.createElement("div");
      msg.id = "slowkoAccountDone";
      msg.className = "slowko-account-done";
      var board = document.getElementById("board");
      if(board && board.parentNode){
        board.insertAdjacentElement("beforebegin",msg);
      }else{
        document.body.insertAdjacentElement("afterbegin",msg);
      }
    }

    var state = row.won ? t("won") : t("lost");
    var tries = row.tries ? " · " + row.tries + "/6" : "";
    var score = Number.isFinite(Number(row.score)) ? " · " + t("score") + ": " + row.score : "";

    msg.innerHTML = "<b>" + esc(t("already")) + "</b><br>" +
      esc(t("alreadyMeta")) + ": " + esc(state + tries + score);

    try{
      if(typeof window.updateNavBar === "function")window.updateNavBar();
    }catch(e){}
  }
  async function hydrateAccountResult(){
    if(STATE.crossDeviceApplied)return;
    if(!isTodayPuzzle() || isTesterMode() || isArchivePuzzle())return;
    if(hasLocalFinishedToday())return;

    try{
      await ensureDeps();

      if(!window.SZPILPLAC_AUTH || typeof window.SZPILPLAC_AUTH.refresh !== "function")return;
      var auth = await window.SZPILPLAC_AUTH.refresh();
      var user = auth && auth.user;
      var client = window.SZPILPLAC_AUTH.getClient && window.SZPILPLAC_AUTH.getClient();
      var pno = puzzleNo();

      if(!user || !client || !Number.isFinite(Number(pno)))return;

      var res = await client
        .from("user_game_results")
        .select("game,mode,puzzle_no,won,tries,score,created_at")
        .eq("user_id",user.id)
        .eq("game","slowko")
        .eq("mode","daily")
        .eq("puzzle_no",Number(pno))
        .maybeSingle();

      if(res.error || !res.data)return;
      showCrossDeviceResult(res.data);
    }catch(e){}
  }
  function wrapShowEnd(){
    if(typeof window.showEnd !== "function" || window.showEnd.__slowkoBridgeV79)return false;

    var original = window.showEnd;
    window.showEnd = function(){
      var ret = original.apply(this,arguments);
      setTimeout(function(){saveCurrentResult("showEnd");},80);
      return ret;
    };

    window.showEnd.__slowkoBridgeV79 = true;
    return true;
  }
  function wrapFinish(){
    if(typeof window.finish !== "function" || window.finish.__slowkoBridgeV79)return false;

    var original = window.finish;
    window.finish = function(won){
      var ret = original.apply(this,arguments);
      setTimeout(function(){saveCurrentResult("finish");},1100);
      return ret;
    };

    window.finish.__slowkoBridgeV79 = true;
    return true;
  }
  function boot(){
    if(STATE.booted)return;
    STATE.booted = true;

    resetDailyAssistDefaults();
    patchAssistUsageTracking();

    console.info("Szpilplac slowko-auth-bridge.js " + VERSION);

    ensureDeps()
      .then(function(){setTimeout(hydrateAccountResult,500);})
      .catch(function(err){console.warn("Szpilplac auth bridge deps error:",err);});

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      resetDailyAssistDefaults();
      patchAssistUsageTracking();

      var ok1 = wrapShowEnd();
      var ok2 = wrapFinish();

      if(tries === 8 || tries === 20 || tries === 40){
        hydrateAccountResult();
      }

      if((ok1 || typeof window.showEnd === "function") &&
         (ok2 || typeof window.finish === "function")){
        clearInterval(timer);
        patchAssistUsageTracking();
        setTimeout(hydrateAccountResult,900);
      }

      if(tries > 80)clearInterval(timer);
    },100);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();
