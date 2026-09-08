/*
  Szpilplac Kłōdka Auth Bridge v131
  Konto, wynik i blokada powtórki dla codziennej Kłōdki.
  Warstwa zgodności usuwa z interfejsu dawną tygodniówkę.
*/
(function(){
"use strict";

var VERSION="v131";
var AUTH_STORAGE_KEY="szpilplac-auth-v05";
var sb=null;
var patched=false;
var hydratedKey=null;
var attempts={};

function retireWeeklyUi(){
  try{
    window.view="daily";
    ["weektile","weeklyHint","weeklyHintGame","subback"].forEach(function(id){
      var el=document.getElementById(id);
      if(el&&el.parentNode)el.parentNode.removeChild(el);
    });
    if(typeof window.fetchWeeklyHint==="function")window.fetchWeeklyHint=function(){return Promise.resolve();};
    if(typeof window.refreshWeektile==="function")window.refreshWeektile=function(){};
    if(typeof window.switchView==="function")window.switchView=function(){return false;};
  }catch(e){}
}

function esc(x){
  return String(x==null?"":x).replace(/[&<>"']/g,function(ch){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch;
  });
}

function loadScript(src,test){
  if(test&&test())return Promise.resolve();
  return new Promise(function(resolve){
    var clean=src.split("?")[0];
    var existing=[].slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(clean)!==-1;});
    if(existing){resolve();return;}
    var sc=document.createElement("script");
    sc.src=src;
    sc.async=false;
    sc.onload=resolve;
    sc.onerror=resolve;
    document.head.appendChild(sc);
  });
}

async function client(){
  await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
  var url=window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL);
  var key=window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY);
  if(!url||!key||!window.supabase)throw new Error("Brak konfiguracji Supabase");
  if(window.__SZPILPLAC_SUPABASE_CLIENT){sb=window.__SZPILPLAC_SUPABASE_CLIENT;return sb;}
  if(!sb){
    sb=window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    window.__SZPILPLAC_SUPABASE_CLIENT=sb;
  }
  return sb;
}

function storedSession(){
  try{
    var raw=localStorage.getItem(AUTH_STORAGE_KEY);
    if(!raw)return null;
    var d=JSON.parse(raw);
    return d.currentSession||d.session||d;
  }catch(e){return null;}
}

async function session(){
  var c=await client();
  try{
    var r=await c.auth.getSession();
    if(r&&r.data&&r.data.session)return r.data.session;
  }catch(e){}
  var s=storedSession();
  if(s&&s.access_token&&s.refresh_token){
    try{
      var set=await c.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
      if(set&&set.data&&set.data.session)return set.data.session;
    }catch(e){}
    return s;
  }
  return null;
}

function idx(){
  try{if(typeof window.currentIdx==="function")return Number(window.currentIdx());}catch(e){}
  return Number(window.DAY_NO||0);
}

function isCurrent(i){
  return Number(i)===Number(window.TODAY_NO||window.DAY_NO||0);
}

function localFinished(i){
  try{
    if(typeof window.loadSavedGame==="function"){
      var g=window.loadSavedGame("daily",i);
      if(g&&(g.status==="won"||g.status==="lost"))return true;
    }
    if(window.game&&window.game.__accountDone===true)return false;
    if(window.game&&(window.game.status==="won"||window.game.status==="lost")){
      var gi=window.game.idx!=null?Number(window.game.idx):idx();
      if(String(gi)===String(i))return true;
    }
  }catch(e){}
  return false;
}

function tries(){
  try{if(window.game&&Array.isArray(window.game.guesses))return Math.max(1,window.game.guesses.length);}catch(e){}
  return Number(window.MAX_TRIES||6);
}

function score(won,t){
  t=Math.max(1,Math.min(Number(window.MAX_TRIES||6),Number(t||6)));
  if(!won)return 5;
  var points=[120,100,80,60,40,25];
  return points[t-1]||points[points.length-1];
}

function snap(won){
  var i=idx();
  var t=tries();
  return {
    game:"klodka",
    mode:"daily",
    puzzleNo:i,
    won:!!won,
    tries:t,
    errors:Math.max(0,t-(won?1:0)),
    score:score(!!won,t),
    maxAttempts:Number(window.MAX_TRIES||6),
    isCurrent:isCurrent(i)
  };
}

function style(){
  if(document.getElementById("szpKlodkaAccountStyle"))return;
  var s=document.createElement("style");
  s.id="szpKlodkaAccountStyle";
  s.textContent=".szp-account-save-note{margin:8px auto 0;max-width:340px;text-align:center;font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150);background:var(--surface2,#f3ecda);border:1px dashed var(--line,#c9bfa6);border-radius:999px;padding:7px 10px}.szp-account-save-note.ok{color:var(--green,#2f4a39);border-color:var(--green,#2f4a39)}.szp-account-save-note.err{color:var(--wrong,#a14b3a);border-color:var(--wrong,#a14b3a)}.szp-account-done{margin:10px auto 12px;max-width:420px;text-align:center;font-size:12.5px;line-height:1.45;color:var(--ink,#23201a);background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);border-radius:13px;padding:11px 12px}.szp-account-done b{color:var(--green,#2f4a39)}.szp-account-solution{display:inline-block;margin-top:4px}.szp-account-solution code{font-family:Oswald,monospace;font-size:18px;letter-spacing:.12em;color:var(--gold,#bf8a3a);background:transparent}";
  document.head.appendChild(s);
}

function note(text,type){
  style();
  var el=document.getElementById("szpKlodkaAccountNote");
  if(!el){
    el=document.createElement("div");
    el.id="szpKlodkaAccountNote";
    var host=document.getElementById("toast")||document.querySelector("main")||document.body;
    if(host&&host.insertAdjacentElement)host.insertAdjacentElement("afterend",el);else document.body.appendChild(el);
  }
  el.textContent=text||"";
  el.className="szp-account-save-note"+(type?" "+type:"");
}

async function saveResult(d){
  if(!d||!d.isCurrent){
    note("Archiwum Kłōdki zostaje lokalnie. Do rankingu zapisuje się tylko bieżąca zagadka.","err");
    return;
  }
  try{
    if(!window.SZP_GAME_SAVE)await loadScript("game-save.js?v=126",function(){return !!window.SZP_GAME_SAVE;});
    if(window.SZP_GAME_SAVE&&typeof window.SZP_GAME_SAVE.saveResult==="function"){
      var r=await window.SZP_GAME_SAVE.saveResult(d,{
        skipMessage:"Archiwum Kłōdki zostaje lokalnie. Do rankingu zapisuje się tylko bieżąca zagadka.",
        noAccountMessage:"Grasz bez konta. Wynik Kłōdki został zapisany lokalnie.",
        savedMessage:"Wynik zapisany na koncie. Punkty: "+(d.score||0)+".",
        errorMessage:"Nie udało się zapisać wyniku Kłōdki."
      });
      if(r&&r.message)note(r.message,r.type||"");
      if(r&&r.error)throw r.error;
      return;
    }
  }catch(e){throw e;}

  var se=await session();
  if(!se||!se.user){note("Grasz bez konta. Wynik Kłōdki został zapisany lokalnie.","");return;}
  note("Zapisuję wynik Kłōdki na koncie...","");
  var c=await client();
  var res=await c.rpc("save_user_game_result",{
    p_game:d.game,
    p_mode:"daily",
    p_puzzle_no:d.puzzleNo,
    p_won:d.won,
    p_tries:d.tries,
    p_errors:d.errors,
    p_score:d.score
  });
  if(res.error)throw res.error;
  note("Wynik zapisany na koncie. Punkty: "+d.score+".","ok");
}

function clearDone(){
  try{if(window.game)delete window.game.__accountDone;}catch(e){}
  var box=document.getElementById("szpKlodkaAccountDone");
  if(box&&box.parentNode)box.parentNode.removeChild(box);
  var pad=document.getElementById("pad");
  if(pad)pad.style.display="";
}

function boxHtml(row,code){
  var result=row.won?"wygrana":"nieukończone";
  var tr=row.tries?(" · "+row.tries+"/"+(window.MAX_TRIES||6)):"";
  var sc=Number.isFinite(Number(row.score))?(" · Punkty: "+row.score):"";
  var reveal=code?('<br><span class="szp-account-solution">Kod dnia: <code>'+esc(code)+'</code></span>'):"";
  return "<b>Ta Kłōdka jest już zapisana na koncie.</b><br>Wynik z innego urządzenia: "+result+tr+sc+reveal;
}

async function reveal(i,box,row){
  try{
    var c=await client();
    var r=await c.rpc("klodka_reveal",{p_mode:"daily",p_idx:i});
    var code=r&&r.data!=null?r.data:r;
    if(code&&box&&document.body.contains(box))box.innerHTML=boxHtml(row,code);
  }catch(e){}
}

function showDone(row,i){
  var key="daily:"+String(i);
  if(!row||hydratedKey===key||localFinished(i))return;
  hydratedKey=key;
  style();
  try{
    if(window.game){
      window.game.status=row.won?"won":"lost";
      window.game.mode="daily";
      window.game.idx=i;
      window.game.__accountDone=true;
    }
    window.current="";
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
    else(document.querySelector("main")||document.body).insertAdjacentElement("afterbegin",box);
  }
  box.innerHTML=boxHtml(row,null);
  reveal(i,box,row);
  try{if(typeof window.paintFromGame==="function")window.paintFromGame();}catch(e){}
}

async function hydrate(){
  try{
    retireWeeklyUi();
    var i=idx();
    var key="daily:"+String(i);
    if(!isCurrent(i))return;
    if(localFinished(i)){
      if(hydratedKey===key){hydratedKey=null;clearDone();}
      return;
    }
    var se=await session();
    if(!se||!se.user)return;
    var c=await client();
    var r=await c.from("user_game_results")
      .select("game,mode,puzzle_no,won,tries,score,created_at,finished_at")
      .eq("user_id",se.user.id)
      .eq("game","klodka")
      .eq("mode","daily")
      .eq("puzzle_no",i)
      .maybeSingle();
    if(!r.error&&r.data)showDone(r.data,i);
    else if(hydratedKey===key){hydratedKey=null;clearDone();}
  }catch(e){}
}

function hookFinish(){
  if(patched||typeof window.finish!=="function")return !!patched;
  var old=window.finish;
  window.finish=function(won){
    retireWeeklyUi();
    var d=snap(!!won);
    var ret=old.apply(this,arguments);
    var key=d.game+":"+d.mode+":"+d.puzzleNo;
    if(!attempts[key]){
      attempts[key]=true;
      setTimeout(function(){
        saveResult(d).catch(function(e){
          console.warn("Kłōdka account save error:",e);
          note("Nie udało się zapisać wyniku Kłōdki na koncie.","err");
        });
      },80);
    }
    return ret;
  };
  patched=true;
  console.info("Szpilplac klodka-auth-bridge.js "+VERSION+" hooked");
  return true;
}

function boot(){
  console.info("Szpilplac klodka-auth-bridge.js "+VERSION);
  retireWeeklyUi();
  window.SZP_KLODKA_ACCOUNT={version:VERSION,hydrate:hydrate,saveResult:saveResult,retireWeeklyUi:retireWeeklyUi};
  loadScript("archive-achievement-common.js?v=125",function(){return !!window.SZP_ARCHIVE_ACHIEVEMENT;});
  loadScript("game-stats-common.js?v=125",function(){return !!window.SZP_GAME_STATS;});
  setTimeout(retireWeeklyUi,40);
  setTimeout(hydrate,500);
  setTimeout(hydrate,1400);
  var n=0;
  var timer=setInterval(function(){
    n++;
    retireWeeklyUi();
    if(hookFinish()||n>80)clearInterval(timer);
    if(n===10||n===30)hydrate();
  },100);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
