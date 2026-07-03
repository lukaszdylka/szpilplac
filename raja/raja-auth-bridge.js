/*
  Szpilplac Raja Auth Bridge v92
  - Raja jako gra codzienna z archiwum od 04.07.2026
  - zapisuje wynik na koncie jako game=zorta, mode=daily
  - blokuje ponowne granie na drugim urządzeniu, jeśli wynik dnia jest już zapisany na koncie
*/
(function(){
  "use strict";

  var VERSION="v92";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var patched=false;
  var hydrated=false;
  var attempts={};

  function injectStyle(){
    if(document.getElementById("szpRajaAccountStyle"))return;
    var style=document.createElement("style");
    style.id="szpRajaAccountStyle";
    style.textContent=
      '.szp-account-save-note{margin:8px auto 0;max-width:340px;text-align:center;font-size:11.5px;line-height:1.35;color:var(--ink2,#6a6150);background:var(--surface2,#f3ecda);border:1px dashed var(--line,#c9bfa6);border-radius:999px;padding:7px 10px}.szp-account-save-note.ok{color:var(--green,#2f4a39);border-color:var(--green,#2f4a39)}.szp-account-save-note.err{color:var(--wrong,#a14b3a);border-color:var(--wrong,#a14b3a)}'+
      '.szp-account-done{margin:10px auto 12px;max-width:430px;text-align:center;font-size:12.5px;line-height:1.45;color:var(--ink,#23201a);background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);border-radius:13px;padding:11px 12px}.szp-account-done b{color:var(--green,#2f4a39)}';
    document.head.appendChild(style);
  }
  function setNote(text,type){
    injectStyle();
    var el=document.getElementById("szpRajaAccountNote");
    if(!el){
      el=document.createElement("div");
      el.id="szpRajaAccountNote";
      el.className="szp-account-save-note";
      var host=document.getElementById("result")||document.querySelector(".wrap")||document.body;
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
  function currentDay(){
    return Number(window.currentDay||0);
  }
  function todayIdx(){
    return Number(window.TODAY_IDX||0);
  }
  function puzzleNo(){
    return currentDay()+1;
  }
  function isCurrent(){
    return currentDay()===todayIdx();
  }
  function scoreRaja(won,tries,hintUsed){
    tries=Math.max(1,Math.min(4,Number(tries||4)));
    if(!won)return 5;
    var table=[150,120,90,60];
    var score=table[tries-1]||60;
    if(hintUsed)score=Math.max(20,score-25);
    return score;
  }
  function localFinished(){
    try{
      if(window.status&&window.status!=="playing")return true;
      var raw=localStorage.getItem("zorta_daily_d"+currentDay());
      if(raw){
        var st=JSON.parse(raw);
        if(st&&st.status&&st.status!=="playing")return true;
      }
    }catch(e){}
    return false;
  }
  function snapshot(won){
    var tries=1;
    try{tries=window.guessHistory&&Array.isArray(window.guessHistory)?Math.max(1,window.guessHistory.length):Number(window.MAX_TRIES||4);}
    catch(e){tries=Number(window.MAX_TRIES||4);}
    var hintUsed=false;
    try{hintUsed=!!window.hintData;}catch(e){}
    return {
      game:"zorta",
      mode:"daily",
      puzzleNo:puzzleNo(),
      won:!!won,
      tries:tries,
      errors:Math.max(0,tries-(won?1:0)),
      score:scoreRaja(!!won,tries,hintUsed),
      isCurrent:isCurrent()
    };
  }
  async function saveResult(data){
    if(!data||!data.isCurrent){
      setNote("Archiwum Rai zostaje lokalnie — do rankingu zapisuje się tylko dzisiejsza gra.","err");
      return;
    }
    var session=await getSession();
    if(!session||!session.user){
      setNote("Grasz bez konta — wynik Rai został zapisany lokalnie.","");
      return;
    }
    setNote("Zapisuję wynik Rai na koncie...","");
    var client=await ensureClient();
    var res=await client.rpc("save_user_game_result",{
      p_game:data.game,
      p_mode:data.mode,
      p_puzzle_no:data.puzzleNo,
      p_won:data.won,
      p_tries:data.tries,
      p_errors:data.errors,
      p_score:data.score
    });
    if(res.error)throw res.error;
    setNote("Wynik Rai zapisany na koncie. +"+data.score+" pkt","ok");
  }
  function showAccountDone(row){
    if(!row||hydrated)return;
    if(localFinished())return;
    hydrated=true;
    injectStyle();

    try{window.status=row.won?"won":"lost";}catch(e){}

    var check=document.getElementById("checkBtn");
    if(check)check.style.display="none";
    var attempts=document.getElementById("attempts");
    if(attempts)attempts.style.display="none";

    var box=document.getElementById("szpRajaAccountDone");
    if(!box){
      box=document.createElement("div");
      box.id="szpRajaAccountDone";
      box.className="szp-account-done";
      var banner=document.getElementById("banner")||document.querySelector(".wrap")||document.body;
      if(banner&&banner.insertAdjacentElement)banner.insertAdjacentElement("afterend",box);
      else document.body.appendChild(box);
    }
    var result=row.won?"wygrana":"nieukończone";
    var tries=row.tries?(" · "+row.tries+"/"+(window.MAX_TRIES||4)):"";
    var score=Number.isFinite(Number(row.score))?(" · Punkty: "+row.score):"";
    box.innerHTML="<b>Ta Raja jest już zapisana na koncie.</b><br>Wynik z innego urządzenia: "+result+tries+score;
  }
  async function hydrateAccountResult(){
    try{
      if(hydrated)return;
      if(!isCurrent())return;
      if(localFinished())return;
      var session=await getSession();
      if(!session||!session.user)return;
      var client=await ensureClient();
      var res=await client.from("user_game_results")
        .select("game,mode,puzzle_no,won,tries,score,created_at")
        .eq("user_id",session.user.id)
        .eq("game","zorta")
        .eq("mode","daily")
        .eq("puzzle_no",puzzleNo())
        .maybeSingle();
      if(!res.error&&res.data)showAccountDone(res.data);
    }catch(e){}
  }
  function hook(){
    if(patched)return true;
    if(typeof window.finishUp!=="function")return false;
    var original=window.finishUp;
    window.finishUp=function(won){
      var data=snapshot(!!won);
      var ret=original.apply(this,arguments);
      var k=data.game+":"+data.mode+":"+data.puzzleNo;
      if(!attempts[k]){
        attempts[k]=true;
        setTimeout(function(){
          saveResult(data).catch(function(err){
            console.warn("Raja account save error:",err);
            setNote("Nie udało się zapisać wyniku Rai na koncie.","err");
          });
        },80);
      }
      return ret;
    };
    patched=true;
    console.info("Szpilplac raja-auth-bridge.js "+VERSION+" hooked");
    return true;
  }
  function boot(){
    console.info("Szpilplac raja-auth-bridge.js "+VERSION);
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
