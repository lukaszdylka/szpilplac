/*
  Szpilplac Kłōdka Auth Bridge v24
  Zapisuje wynik Kłōdki do konta/rankingu.
  Gra bez konta działa normalnie.
*/
(function(){
  "use strict";
  var VERSION="v24", AUTH_STORAGE_KEY="szpilplac-auth-v05", sb=null, patched=false;

  function injectStyle(){
    if(document.getElementById("szpKlodkaAccountStyle"))return;
    var style=document.createElement("style");
    style.id="szpKlodkaAccountStyle";
    style.textContent='.szp-account-save-note{margin:8px auto 0;max-width:320px;text-align:center;font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150);background:var(--surface2,#f3ecda);border:1px dashed var(--line,#c9bfa6);border-radius:999px;padding:7px 10px}.szp-account-save-note.ok{color:var(--green,#2f4a39);border-color:var(--green,#2f4a39)}.szp-account-save-note.err{color:var(--wrong,#a14b3a);border-color:var(--wrong,#a14b3a)}';
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
    var mode=window.view||(window.game&&window.game.mode)||"daily";
    var idx=0;
    try{idx=(typeof window.currentIdx==="function")?Number(window.currentIdx()):Number(mode==="daily"?window.DAY_NO:window.WEEK_NO);}
    catch(e){idx=Number(mode==="daily"?window.DAY_NO:window.WEEK_NO);}
    var today=Number(window.TODAY_NO||window.DAY_NO||0);
    var week=Number(window.WEEK_NO||0);
    var isCurrent=(mode==="daily"&&idx===today)||(mode==="weekly"&&idx===week);
    var tries=triesFromGame();
    return {game:"klodka",mode:mode,puzzleNo:idx,won:!!won,tries:tries,errors:Math.max(0,tries-(won?1:0)),score:scoreKlodka(mode,!!won,tries),isCurrent:isCurrent};
  }

  async function saveResult(data){
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

  function hook(){
    if(patched)return true;
    if(typeof window.finish!=="function")return false;
    var original=window.finish;
    window.finish=function(won){
      var data=snapshot(!!won);
      var ret=original.apply(this,arguments);
      setTimeout(function(){saveResult(data).catch(function(err){console.warn("Kłōdka account save error:",err);setNote("Nie udało się zapisać wyniku Kłōdki na koncie.","err");});},80);
      return ret;
    };
    patched=true;
    console.info("Szpilplac klodka-auth-bridge.js "+VERSION+" hooked");
    return true;
  }

  function boot(){
    console.info("Szpilplac klodka-auth-bridge.js "+VERSION);
    var tries=0,timer=setInterval(function(){tries++;if(hook()||tries>80)clearInterval(timer);},100);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
