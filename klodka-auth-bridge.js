/*
  Szpilplac Kłōdka Auth Bridge v126
  - zapisuje wynik Kłōdki na koncie
  - blokuje ponowne granie na drugim urządzeniu, osobno dla trybu daily i weekly
  - tygodniówka liczy tydzień od poniedziałku
  - przy wyniku z innego urządzenia pokazuje kod danej Kłōdki
*/
(function(){
  "use strict";

  var VERSION="v126";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var patched=false;
  var switchPatched=false;
  var hydratedKey=null;
  var attempts={};
  var mondayPatchApplied=false;

  function keyOf(mode,idx){return String(mode||"daily").toLowerCase()+":"+String(idx);}

  function injectStyle(){
    if(document.getElementById("szpKlodkaAccountStyle"))return;
    var style=document.createElement("style");
    style.id="szpKlodkaAccountStyle";
    style.textContent=
      '.szp-account-save-note{margin:8px auto 0;max-width:340px;text-align:center;font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150);background:var(--surface2,#f3ecda);border:1px dashed var(--line,#c9bfa6);border-radius:999px;padding:7px 10px}.szp-account-save-note.ok{color:var(--green,#2f4a39);border-color:var(--green,#2f4a39)}.szp-account-save-note.err{color:var(--wrong,#a14b3a);border-color:var(--wrong,#a14b3a)}'+
      '.szp-account-done{margin:10px auto 12px;max-width:420px;text-align:center;font-size:12.5px;line-height:1.45;color:var(--ink,#23201a);background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);border-radius:13px;padding:11px 12px}.szp-account-done b{color:var(--green,#2f4a39)}.szp-account-solution{display:inline-block;margin-top:4px}.szp-account-solution code{font-family:Oswald,monospace;font-size:18px;letter-spacing:.12em;color:var(--gold,#bf8a3a);background:transparent}';
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

  function clearAccountDoneUI(){
    var box=document.getElementById("szpKlodkaAccountDone");
    if(box&&box.parentNode)box.parentNode.removeChild(box);
    var pad=document.getElementById("pad");
    if(pad)pad.style.display="";
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
    if(!sb)sb=window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    return sb;
  }

  function storedSession(){
    try{var raw=localStorage.getItem(AUTH_STORAGE_KEY);if(!raw)return null;var data=JSON.parse(raw);return data.currentSession||data.session||data;}catch(e){return null;}
  }
  async function getSession(){
    var client=await ensureClient();
    try{var r=await client.auth.getSession();if(r&&r.data&&r.data.session)return r.data.session;}catch(e){}
    var s=storedSession();
    if(s&&s.access_token&&s.refresh_token){try{var set=await client.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});if(set&&set.data&&set.data.session)return set.data.session;}catch(e){}return s;}
    return null;
  }

  function mondayWeekNo(){
    try{
      var parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),o={};
      parts.forEach(function(p){if(p.type!=="literal")o[p.type]=Number(p.value);});
      var today=Date.UTC(o.year,o.month-1,o.day);
      var baseMonday=Date.UTC(2026,5,22); // tydzień 1: 22–28.06, start gry 23.06 mieści się w tygodniu 1
      return Math.max(1,Math.floor((today-baseMonday)/604800000)+1);
    }catch(e){return Number(window.WEEK_NO||1);}
  }
  function applyMondayWeekNo(){
    var n=mondayWeekNo();
    if(!Number.isFinite(n)||n<1)return;
    if(Number(window.WEEK_NO)===n){mondayPatchApplied=true;return;}
    window.WEEK_NO=n;
    mondayPatchApplied=true;
    hydratedKey=null;
    clearAccountDoneUI();
    try{
      if(window.view==="weekly"&&typeof window.loadGame==="function"&&typeof window.renderStatic==="function"){
        window.current="";
        window.loadGame();
        window.renderStatic();
        if(typeof window.fetchWeeklyHint==="function")window.fetchWeeklyHint();
      }
      if(typeof window.refreshWeektile==="function")window.refreshWeektile();
    }catch(e){console.warn("Kłōdka monday week patch refresh error",e);}
  }

  function currentMode(){return window.view || (window.game&&window.game.mode) || "daily";}
  function currentPuzzleNo(mode){try{if(typeof window.currentIdx==="function")return Number(window.currentIdx());}catch(e){}return Number(mode==="weekly"?window.WEEK_NO:window.DAY_NO);}
  function isCurrent(mode,idx){var today=Number(window.TODAY_NO||window.DAY_NO||0),week=Number(window.WEEK_NO||0);return (mode==="daily"&&Number(idx)===today)||(mode==="weekly"&&Number(idx)===week);}
  function localFinished(mode,idx){
    try{
      if(typeof window.loadSavedGame==="function"){var saved=window.loadSavedGame(mode,idx);if(saved&&(saved.status==="won"||saved.status==="lost"))return true;}
      if(window.game&&(window.game.status==="won"||window.game.status==="lost")){var gm=window.game.mode||currentMode();var gi=window.game.idx!=null?Number(window.game.idx):currentPuzzleNo(gm);if(gm===mode&&String(gi)===String(idx))return true;}
    }catch(e){}
    return false;
  }
  function triesFromGame(){try{if(window.game&&Array.isArray(window.game.guesses))return Math.max(1,window.game.guesses.length);}catch(e){}return Number(window.MAX_TRIES||6);}
  function scoreKlodka(mode,won,tries){tries=Math.max(1,Math.min(Number(window.MAX_TRIES||6),Number(tries||6)));if(!won)return 5;if(mode==="weekly"){var weekly=[150,120,90,65,45,30];return weekly[tries-1]||30;}var daily=[120,100,80,60,40,25];return daily[tries-1]||25;}
  function snapshot(won){var mode=currentMode(),idx=currentPuzzleNo(mode),tries=triesFromGame();return {game:"klodka",mode:mode,puzzleNo:idx,won:!!won,tries:tries,errors:Math.max(0,tries-(won?1:0)),score:scoreKlodka(mode,!!won,tries),maxAttempts:window.MAX_TRIES||6,isCurrent:isCurrent(mode,idx)};}

  async function tryCommonGameSave(data){
    try{
      if(!window.SZP_GAME_SAVE){var commonPath=(/\/raja\/?/.test(location.pathname)?"../":"")+"game-save.js?v=125";await loadScript(commonPath,function(){return !!window.SZP_GAME_SAVE;}).catch(function(){});}
      if(!window.SZP_GAME_SAVE||typeof window.SZP_GAME_SAVE.saveResult!=="function")return false;
      var res=await window.SZP_GAME_SAVE.saveResult(data,{skipMessage:"Archiwum Kłōdki zostaje lokalnie. Do rankingu zapisuje się tylko bieżąca zagadka.",noAccountMessage:"Grasz bez konta. Wynik Kłōdki został zapisany lokalnie.",savedMessage:"Wynik zapisany na koncie. Punkty: "+(data&&data.score?data.score:0)+".",errorMessage:"Nie udało się zapisać wyniku Kłōdki."});
      if(res&&res.message)setNote(res.message,res.type||"");
      if(res&&res.error)throw res.error;
      return true;
    }catch(e){throw e;}
  }
  async function saveResult(data){
    if(await tryCommonGameSave(data))return;
    if(!data||!data.isCurrent){setNote("Archiwum Kłōdki zostaje lokalnie. Do rankingu zapisuje się tylko bieżąca zagadka.","err");return;}
    var session=await getSession();
    if(!session||!session.user){setNote("Grasz bez konta. Wynik Kłōdki został zapisany lokalnie.","");return;}
    setNote("Zapisuję wynik Kłōdki na koncie...","");
    var client=await ensureClient();
    var res=await client.rpc("save_user_game_result",{p_game:data.game,p_mode:data.mode,p_puzzle_no:data.puzzleNo,p_won:data.won,p_tries:data.tries,p_errors:data.errors,p_score:data.score});
    if(res.error)throw res.error;
    setNote("Wynik zapisany na koncie. Punkty: "+data.score+".","ok");
  }

  function renderAccountBox(box,row,mode,idx,code){
    var result=row.won?"wygrana":"nieukończone";
    var tries=row.tries?(" · "+row.tries+"/"+(window.MAX_TRIES||6)):"";
    var score=Number.isFinite(Number(row.score))?(" · Punkty: "+row.score):"";
    var label=mode==="weekly"?"Kod tygodniówki":"Kod dnia";
    var reveal=code?('<br><span class="szp-account-solution">'+label+': <code>'+String(code).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];})+'</code></span>'):"";
    box.innerHTML="<b>Ta Kłōdka jest już zapisana na koncie.</b><br>Wynik z innego urządzenia: "+result+tries+score+reveal;
  }
  async function revealCodeFor(mode,idx,box,row){
    try{
      var client=await ensureClient();
      var res=await client.rpc("klodka_reveal",{p_mode:mode,p_idx:idx});
      var code=res&&res.data!=null?res.data:res;
      if(code&&box&&document.body.contains(box))renderAccountBox(box,row,mode,idx,code);
    }catch(e){}
  }
  function showAccountDone(row,mode,idx){
    var k=keyOf(mode,idx);if(!row||hydratedKey===k)return;if(localFinished(mode,idx))return;hydratedKey=k;injectStyle();
    try{if(window.game){window.game.status=row.won?"won":"lost";window.game.mode=mode;window.game.idx=idx;}window.current="";}catch(e){}
    var pad=document.getElementById("pad");if(pad)pad.style.display="none";
    var board=document.getElementById("board");var box=document.getElementById("szpKlodkaAccountDone");
    if(!box){box=document.createElement("div");box.id="szpKlodkaAccountDone";box.className="szp-account-done";if(board&&board.parentNode)board.insertAdjacentElement("beforebegin",box);else if(document.querySelector("main"))document.querySelector("main").insertAdjacentElement("afterbegin",box);else document.body.appendChild(box);}
    renderAccountBox(box,row,mode,idx,null);
    revealCodeFor(mode,idx,box,row);
    try{if(typeof window.paintFromGame==="function")window.paintFromGame();}catch(e){}
  }

  async function hydrateAccountResult(){
    try{
      applyMondayWeekNo();
      var mode=currentMode(),idx=currentPuzzleNo(mode),k=keyOf(mode,idx);
      if(!isCurrent(mode,idx))return;
      if(localFinished(mode,idx)){if(hydratedKey===k){hydratedKey=null;clearAccountDoneUI();}return;}
      var session=await getSession();if(!session||!session.user)return;
      var client=await ensureClient();
      var res=await client.from("user_game_results").select("game,mode,puzzle_no,won,tries,score,created_at,finished_at").eq("user_id",session.user.id).eq("game","klodka").eq("mode",mode).eq("puzzle_no",idx).maybeSingle();
      if(!res.error&&res.data)showAccountDone(res.data,mode,idx);else if(hydratedKey===k){hydratedKey=null;clearAccountDoneUI();}
    }catch(e){}
  }
  function hookSwitchView(){
    if(switchPatched)return true;if(typeof window.switchView!=="function")return false;
    var original=window.switchView;
    window.switchView=function(v){applyMondayWeekNo();clearAccountDoneUI();hydratedKey=null;var ret=original.apply(this,arguments);setTimeout(hydrateAccountResult,120);setTimeout(hydrateAccountResult,700);return ret;};
    switchPatched=true;return true;
  }
  function hook(){
    if(patched)return true;if(typeof window.finish!=="function")return false;
    var original=window.finish;
    window.finish=function(won){applyMondayWeekNo();var data=snapshot(!!won);var ret=original.apply(this,arguments);var k=data.game+":"+data.mode+":"+data.puzzleNo;if(!attempts[k]){attempts[k]=true;setTimeout(function(){saveResult(data).catch(function(err){console.warn("Kłōdka account save error:",err);setNote("Nie udało się zapisać wyniku Kłōdki na koncie.","err");});},80);}return ret;};
    patched=true;console.info("Szpilplac klodka-auth-bridge.js "+VERSION+" hooked");return true;
  }

  function boot(){
    console.info("Szpilplac klodka-auth-bridge.js "+VERSION);
    applyMondayWeekNo();
    window.SZP_KLODKA_ACCOUNT={version:VERSION,hydrate:hydrateAccountResult,saveResult:saveResult,mondayWeekNo:mondayWeekNo};
    loadScript("archive-achievement-common.js?v=125",function(){return !!window.SZP_ARCHIVE_ACHIEVEMENT;}).catch(function(){});
    loadScript("game-stats-common.js?v=125",function(){return !!window.SZP_GAME_STATS;}).catch(function(){});
    setTimeout(hydrateAccountResult,500);setTimeout(hydrateAccountResult,1400);
    var tries=0,timer=setInterval(function(){tries++;applyMondayWeekNo();var okFinish=hook();var okSwitch=hookSwitchView();if((okFinish&&okSwitch)||tries>80)clearInterval(timer);if(tries===10||tries===30)hydrateAccountResult();},100);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();