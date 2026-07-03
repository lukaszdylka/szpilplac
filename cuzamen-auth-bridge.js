/*
  Szpilplac Cuzamen Auth Bridge v80
  - dodaje zapis Cuzamen na koncie
  - blokuje ponowne granie na drugim urządzeniu, jeśli wynik dnia jest już zapisany
*/
(function(){
  "use strict";

  var VERSION="v80";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var patched=false;
  var hydrated=false;
  var attempts={};

  function injectStyle(){
    if(document.getElementById("szpCuzamenAccountStyle"))return;
    var style=document.createElement("style");
    style.id="szpCuzamenAccountStyle";
    style.textContent=
      '.szp-account-save-note{margin:8px auto 0;max-width:340px;text-align:center;font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150);background:var(--surface2,#f3ecda);border:1px dashed var(--line,#c9bfa6);border-radius:999px;padding:7px 10px}.szp-account-save-note.ok{color:var(--green,#2f4a39);border-color:var(--green,#2f4a39)}.szp-account-save-note.err{color:#a14b3a;border-color:#a14b3a}'+
      '.szp-account-done{margin:10px auto 12px;max-width:430px;text-align:center;font-size:12.5px;line-height:1.45;color:var(--ink,#23201a);background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);border-radius:13px;padding:11px 12px}.szp-account-done b{color:var(--green,#2f4a39)}';
    document.head.appendChild(style);
  }
  function setNote(text,type){
    injectStyle();
    var el=document.getElementById("szpCuzamenAccountNote");
    if(!el){
      el=document.createElement("div");
      el.id="szpCuzamenAccountNote";
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
    var url=window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL)||window.STATS_URL;
    var key=window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY)||window.STATS_KEY;
    if(!url||!key)throw new Error("Brak konfiguracji Supabase");
    if(!sb)sb=window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
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
  function puzzleNo(){
    try{
      if(window.SET&&Number.isFinite(Number(window.SET.no)))return Number(window.SET.no);
    }catch(e){}
    return 1;
  }
  function localFinished(){
    try{
      if(window.finished)return true;
      var raw=localStorage.getItem("cuzamen_v1");
      if(raw){
        var s=JSON.parse(raw);
        if(s&&s.finished===true)return true;
      }
    }catch(e){}
    return false;
  }
  function scoreCuzamen(won,errors){
    errors=Math.max(0,Math.min(4,Number(errors||0)));
    if(!won)return 5;
    var table=[180,140,100,70,45];
    return table[errors]||45;
  }
  function snapshot(won){
    var errors=Number(window.errors||0);
    return {
      game:"cuzamen",
      mode:"daily",
      puzzleNo:puzzleNo(),
      won:!!won,
      tries:errors,
      errors:errors,
      score:scoreCuzamen(!!won,errors),
      isCurrent:true
    };
  }
  async function saveResult(data){
    var session=await getSession();
    if(!session||!session.user){
      setNote("Grasz bez konta — wynik Cuzamen został zapisany lokalnie.","");
      return;
    }
    setNote("Zapisuję wynik Cuzamen na koncie...","");
    var client=await ensureClient();
    var res=await client.rpc("save_user_game_result",{p_game:data.game,p_mode:data.mode,p_puzzle_no:data.puzzleNo,p_won:data.won,p_tries:data.tries,p_errors:data.errors,p_score:data.score});
    if(res.error)throw res.error;
    setNote("Wynik Cuzamen zapisany na koncie. +"+data.score+" pkt","ok");
  }
  function showAccountDone(row){
    if(!row||hydrated)return;
    if(localFinished())return;
    hydrated=true;
    injectStyle();

    try{window.finished=true;}catch(e){}

    var grid=document.getElementById("grid");
    if(grid)grid.style.display="none";
    var actions=document.querySelector(".actions");
    if(actions)actions.style.display="none";
    var tries=document.getElementById("tries");
    if(tries)tries.style.display="none";

    var box=document.getElementById("szpCuzamenAccountDone");
    if(!box){
      box=document.createElement("div");
      box.id="szpCuzamenAccountDone";
      box.className="szp-account-done";
      var main=document.querySelector("main")||document.body;
      main.insertAdjacentElement("afterbegin",box);
    }
    var result=row.won?"wygrana":"nieukończone";
    var score=Number.isFinite(Number(row.score))?(" · Punkty: "+row.score):"";
    box.innerHTML="<b>Ten Cuzamen jest już zapisany na koncie.</b><br>Wynik z innego urządzenia: "+result+score;
  }
  async function hydrateAccountResult(){
    try{
      if(hydrated)return;
      if(localFinished())return;
      var session=await getSession();
      if(!session||!session.user)return;
      var client=await ensureClient();
      var res=await client.from("user_game_results")
        .select("game,mode,puzzle_no,won,tries,score,created_at")
        .eq("user_id",session.user.id)
        .eq("game","cuzamen")
        .eq("mode","daily")
        .eq("puzzle_no",puzzleNo())
        .maybeSingle();
      if(!res.error&&res.data)showAccountDone(res.data);
    }catch(e){}
  }
  function hook(){
    if(patched)return true;
    if(typeof window.endGame!=="function")return false;
    var original=window.endGame;
    window.endGame=function(won){
      var data=snapshot(!!won);
      var ret=original.apply(this,arguments);
      var k=data.game+":"+data.mode+":"+data.puzzleNo;
      if(!attempts[k]){
        attempts[k]=true;
        setTimeout(function(){saveResult(data).catch(function(err){console.warn("Cuzamen account save error:",err);setNote("Nie udało się zapisać wyniku Cuzamen na koncie.","err");});},100);
      }
      return ret;
    };
    patched=true;
    console.info("Szpilplac cuzamen-auth-bridge.js "+VERSION+" hooked");
    return true;
  }
  function boot(){
    console.info("Szpilplac cuzamen-auth-bridge.js "+VERSION);
    setTimeout(hydrateAccountResult,700);
    setTimeout(hydrateAccountResult,1800);
    var tries=0,timer=setInterval(function(){
      tries++;
      if(hook()||tries>80)clearInterval(timer);
      if(tries===12||tries===32)hydrateAccountResult();
    },100);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
