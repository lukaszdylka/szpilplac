/*
  Szpilplac Kłōdka Auth Bridge v118
  - zapisuje wynik Kłōdki na koncie
  - blokuje ponowne granie na drugim urządzeniu, jeśli wynik jest już zapisany na koncie
*/
(function(){
  "use strict";

  var VERSION="v118";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var patched=false;
  var hydrated=false;
  var attempts={};

  function injectStyle(){
    if(document.getElementById("szpKlodkaAccountStyle"))return;
    var style=document.createElement("style");
    style.id="szpKlodkaAccountStyle";
    style.textContent=
      '.szp-account-save-note{margin:8px auto 0;max-width:340px;text-align:center;font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150);background:var(--surface2,#f3ecda);border:1px dashed var(--line,#c9bfa6);border-radius:999px;padding:7px 10px}.szp-account-save-note.ok{color:var(--green,#2f4a39);border-color:var(--green,#2f4a39)}.szp-account-save-note.err{color:var(--wrong,#a14b3a);border-color:var(--wrong,#a14b3a)}'+
      '.szp-account-done{margin:10px auto 12px;max-width:420px;text-align:center;font-size:12.5px;line-height:1.45;color:var(--ink,#23201a);background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);border-radius:13px;padding:11px 12px}.szp-account-done b{color:var(--green,#2f4a39)}';
    document.head.appendChild(style);
  }

  function setNote(text,type){
    injectStyle();
    var el=document.getElementById("szpKlodkaAccountNote");
    if(!el){
      el=document.createElement("div");
      el.id="szpKlodkaAccountNote";
      el.className="szp-account-save-note";
      var host=document.getElementById("toast")||document.querySelector("main")||document.body;
      if(host&&host.insertAdjacentElement)host.insertAdjacentElement("afterend",el);
      else document.body.appendChild(el);
    }
    el.textContent=text||"";
    el.className="szp-account-save-note"+(type?(" "+type):"");
  }

  function loadScript(src,testFn){
    if(typeof testFn==="function"&&testFn())return Promise.resolve();
    return new Promise(function(resolve,reject){
      var existing=Array.prototype.slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(src.split("?")[0])!==-1;});
      if(existing){
        if(typeof testFn!=="function"||testFn())return resolve();
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",reject,{once:true});
        return;
      }
      var sc=document.createElement("script");
      sc.src=src;sc.async=false;sc.onload=resolve;sc.onerror=function(){reject(new Error("Nie załadowano "+src));};
      document.head.appendChild(sc);
    });
  }

  async function ensureClient(){
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var url=window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL);
    var key=window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY);
    if(!url||!key)throw new Error("Brak konfiguracji Supabase");
    if(!sb){
      sb=window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    }
    return sb;
  }

  function storedSession(){
    try{
      var raw=localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      var data=JSON.parse(raw);
      return data.currentSession||data.session||data;
    }catch(e){return null;}
  }

  async function getSession(){
    var client=await ensureClient();
    try{
      var r=await client.auth.getSession();
      if(r&&r.data&&r.data.session)return r.data.session;
    }catch(e){}
    var s=storedSession();
    if(s&&s.access_token&&s.refresh_token){
      try{
        var set=await client.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
        if(set&&set.data&&set.data.session)return set.data.session;
      }catch(e){}
      return s;
    }
    return null;
  }

  function currentMode(){
    return window.view || (window.game&&window.game.mode) || "daily";
  }
  function currentPuzzleNo(mode){
    try{
      if(typeof window.currentIdx==="function")return Number(window.currentIdx());
    }catch(e){}
    return Number(mode==="weekly"?window.WEEK_NO:window.DAY_NO);
  }
  function isCurrent(mode,idx){
    var today=Number(window.TODAY_NO||window.DAY_NO||0);
    var week=Number(window.WEEK_NO||0);
    return (mode==="daily"&&idx===today)||(mode==="weekly"&&idx===week);
  }
  function localFinished(mode,idx){
    try{
      if(typeof window.loadSavedGame==="function"){
        var g=window.loadSavedGame(mode,idx);
        if(g&&(g.status==="won"||g.status==="lost"))return true;
      }
      if(window.game&&(window.game.status==="won"||window.game.status==="lost"))return true;
    }catch(e){}
    return false;
  }
  function triesFromGame(){
    try{if(window.game&&Array.isArray(window.game.guesses))return Math.max(1,window.game.guesses.length);}catch(e){}
    return Number(window.MAX_TRIES||6);
  }
  function scoreKlodka(mode,won,tries){
    tries=Math.max(1,Math.min(Number(window.MAX_TRIES||6),Number(tries||6)));
    if(!won)return 5;
    if(mode==="weekly"){
      var weekly=[150,120,90,65,45,30];
      return weekly[tries-1]||30;
    }
    var daily=[120,100,80,60,40,25];
    return daily[tries-1]||25;
  }
  function snapshot(won){
    var mode=currentMode();
    var idx=currentPuzzleNo(mode);
    var tries=triesFromGame();
    return {game:"klodka",mode:mode,puzzleNo:idx,won:!!won,tries:tries,errors:Math.max(0,tries-(won?1:0)),score:scoreKlodka(mode,!!won,tries),isCurrent:isCurrent(mode,idx)};
  }


  async function tryCommonGameSave(data){
    try{
      if(!window.SZP_GAME_SAVE){
        var commonPath = (/\/raja\/?/.test(location.pathname) ? "../" : "") + "game-save.js?v=118";
        await loadScript(commonPath,function(){return !!window.SZP_GAME_SAVE;}).catch(function(){});
      }
      if(!window.SZP_GAME_SAVE || typeof window.SZP_GAME_SAVE.saveResult !== "function")return false;
      var res = await window.SZP_GAME_SAVE.saveResult(data,{
        skipMessage:"Archiwum K\u0142\u014ddki zostaje lokalnie \u2014 do rankingu zapisuje si\u0119 tylko bie\u017c\u0105ca zagadka.",
        noAccountMessage:"Grasz bez konta \u2014 wynik K\u0142\u014ddki zosta\u0142 zapisany lokalnie.",
        savedMessage:"Wynik K\u0142\u014ddki zapisany na koncie." + " +" + (data && data.score ? data.score : 0) + " pkt",
        errorMessage:"Nie uda\u0142o si\u0119 zapisa\u0107 wyniku K\u0142\u014ddki."
      });
      if(res && res.message)setNote(res.message,res.type || "");
      if(res && res.error)throw res.error;
      return true;
    }catch(e){throw e;}
  }

  async function saveResult(data){
    if(await tryCommonGameSave(data))return;
    if(!data||!data.isCurrent){
      setNote("Archiwum Kłōdki zostaje lokalnie — do rankingu zapisuje się tylko bieżąca zagadka.","err");
      return;
    }
    var session=await getSession();
    if(!session||!session.user){
      setNote("Grasz bez konta — wynik Kłōdki został zapisany lokalnie.","");
      return;
    }
    setNote("Zapisuję wynik Kłōdki na koncie...","");
    var client=await ensureClient();
    var res=await client.rpc("save_user_game_result",{p_game:data.game,p_mode:data.mode,p_puzzle_no:data.puzzleNo,p_won:data.won,p_tries:data.tries,p_errors:data.errors,p_score:data.score});
    if(res.error)throw res.error;
    setNote("Wynik Kłōdki zapisany na koncie. +"+data.score+" pkt","ok");
  }

  function showAccountDone(row,mode,idx){
    if(!row||hydrated)return;
    if(localFinished(mode,idx))return;
    hydrated=true;
    injectStyle();

    try{
      if(window.game){
        window.game.status=row.won?"won":"lost";
      }
    }catch(e){}

    var pad=document.getElementById("pad");
    if(pad)pad.style.display="none";

    var board=document.getElementById("board");
    var box=document.getElementById("szpKlodkaAccountDone");
    if(!box){
      box=document.createElement("div");
      box.id="szpKlodkaAccountDone";
      box.className="szp-account-done";
      if(board&&board.parentNode)board.insertAdjacentElement("beforebegin",box);
      else document.querySelector("main").insertAdjacentElement("afterbegin",box);
    }
    var result=row.won?"wygrana":"nieukończone";
    var tries=row.tries?(" · "+row.tries+"/"+(window.MAX_TRIES||6)):"";
    var score=Number.isFinite(Number(row.score))?(" · Punkty: "+row.score):"";
    box.innerHTML="<b>Ta Kłōdka jest już zapisana na koncie.</b><br>Wynik z innego urządzenia: "+result+tries+score;
  }

  async function hydrateAccountResult(){
    try{
      var mode=currentMode();
      var idx=currentPuzzleNo(mode);
      if(!isCurrent(mode,idx))return;
      if(localFinished(mode,idx))return;

      var session=await getSession();
      if(!session||!session.user)return;
      var client=await ensureClient();
      var res=await client.from("user_game_results")
        .select("game,mode,puzzle_no,won,tries,score,created_at")
        .eq("user_id",session.user.id)
        .eq("game","klodka")
        .eq("mode",mode)
        .eq("puzzle_no",idx)
        .maybeSingle();

      if(!res.error&&res.data)showAccountDone(res.data,mode,idx);
    }catch(e){}
  }

  function hook(){
    if(patched)return true;
    if(typeof window.finish!=="function")return false;
    var original=window.finish;
    window.finish=function(won){
      var data=snapshot(!!won);
      var ret=original.apply(this,arguments);
      var k=data.game+":"+data.mode+":"+data.puzzleNo;
      if(!attempts[k]){
        attempts[k]=true;
        setTimeout(function(){saveResult(data).catch(function(err){console.warn("Kłōdka account save error:",err);setNote("Nie udało się zapisać wyniku Kłōdki na koncie.","err");});},80);
      }
      return ret;
    };
    patched=true;
    console.info("Szpilplac klodka-auth-bridge.js "+VERSION+" hooked");
    return true;
  }

  function boot(){
    console.info("Szpilplac klodka-auth-bridge.js "+VERSION);
    setTimeout(hydrateAccountResult,500);
    setTimeout(hydrateAccountResult,1400);
    var tries=0,timer=setInterval(function(){
      tries++;
      if(hook()||tries>80)clearInterval(timer);
      if(tries===10||tries===30)hydrateAccountResult();
    },100);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
