/*
  Szpilplac Raja Auth Bridge v120
  - Raja jako gra codzienna z archiwum od 04.07.2026
  - zapisuje wynik na koncie jako game=zorta, mode=daily
  - blokuje ponowne granie na drugim urządzeniu, jeśli wynik dnia jest już zapisany na koncie
*/
(function(){
  "use strict";

  var VERSION="v120";
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
      '.szp-account-done{margin:10px auto 12px;max-width:430px;text-align:center;font-size:12.5px;line-height:1.45;color:var(--ink,#23201a);background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);border-radius:13px;padding:11px 12px}.szp-account-done b{color:var(--green,#2f4a39)}'+
      'body.raja-account-locked #list,body.raja-account-locked .raja-stack{pointer-events:none!important;opacity:.62!important}'+
      'body.raja-account-locked .order-mini-btn,body.raja-account-locked #checkBtn,body.raja-account-locked #hintBtn{display:none!important}'+
      'body.raja-account-locked .order-mobile-hint{display:none!important}'+
      'body.raja-account-locked .row,body.raja-account-locked .item,body.raja-account-locked li{cursor:default!important}';
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

  function dateKeyFromValue(value){
    if(!value)return "";
    try{
      var d = value instanceof Date ? value : new Date(value);
      if(isNaN(d.getTime()))return "";
      var parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
      var o = {};
      parts.forEach(function(p){if(p.type !== "literal")o[p.type] = p.value;});
      return o.year + "-" + o.month + "-" + o.day;
    }catch(e){return "";}
  }
  function todayWarsawKey(){
    return dateKeyFromValue(new Date());
  }
  function localState(){
    try{
      var raw = localStorage.getItem("zorta_daily_d"+currentDay());
      if(!raw)return null;
      var st = JSON.parse(raw);
      return st || null;
    }catch(e){return null;}
  }
  function localResultPayload(){
    var st = localState();
    if(!st || !st.status || st.status === "playing")return null;
    var hist = Array.isArray(st.history) ? st.history : [];
    var won = st.status === "won";
    var tries = Math.max(1, hist.length || 1);
    var hintUsed = !!st.hintData;
    return {
      game:"zorta",
      mode:"daily",
      puzzleNo:puzzleNo(),
      puzzle_no:puzzleNo(),
      dayIndex:currentDay(),
      todayIndex:todayIdx(),
      won:won,
      tries:tries,
      errors:Math.max(0,tries-(won?1:0)),
      score:scoreRaja(won,tries,hintUsed),
      isCurrent:isCurrent(),
      hintUsed:hintUsed,
      finishedAt:new Date().toISOString(),
      source:"local-raja-sync-v120"
    };
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
      dayIndex:currentDay(),
      todayIndex:todayIdx(),
      isCurrent:isCurrent()
    };
  }

  async function tryCommonGameSave(data){
    try{
      if(!window.SZP_GAME_SAVE){
        var commonPath = (/\/raja\/?/.test(location.pathname) ? "../" : "") + "game-save.js?v=120";
        await loadScript(commonPath,function(){return !!window.SZP_GAME_SAVE;}).catch(function(){});
      }
      if(!window.SZP_GAME_SAVE || typeof window.SZP_GAME_SAVE.saveResult !== "function")return false;
      var res = await window.SZP_GAME_SAVE.saveResult(data,{
        skipMessage:"Do rankingu zapisuje si\u0119 tylko dzisiejsza Raja.",
        noAccountMessage:"Grasz bez konta \u2014 wynik Rai zosta\u0142 zapisany lokalnie.",
        savedMessage:"Wynik Rai zapisany na koncie." + " +" + (data && data.score ? data.score : 0) + " pkt",
        errorMessage:"Nie uda\u0142o si\u0119 zapisa\u0107 wyniku Rai."
      });
      if(res && res.message)setNote(res.message,res.type || "");
      if(res && res.error)throw res.error;
      return true;
    }catch(e){throw e;}
  }

  async function saveResult(data){
    if(await tryCommonGameSave(data))return;
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

  function lockAccountDoneUI(){
    try{document.body.classList.add("raja-account-locked");}catch(e){}
    ["checkBtn","hintBtn"].forEach(function(id){
      var el=document.getElementById(id);
      if(el){el.disabled=true;el.style.display="none";}
    });
    var list=document.getElementById("list");
    if(list){
      list.setAttribute("aria-disabled","true");
      Array.prototype.slice.call(list.querySelectorAll("button,.order-mini-btn")).forEach(function(btn){
        btn.disabled=true;
        btn.setAttribute("aria-disabled","true");
      });
    }
    if(window.RAJA_SYNC_DOM_ORDER){
      try{window.RAJA_SYNC_DOM_ORDER();}catch(e){}
    }
    if(window.RAJA_LOCK_ACCOUNT_DONE_UI){
      try{window.RAJA_LOCK_ACCOUNT_DONE_UI();}catch(e){}
    }
  }

  function showAccountDone(row){
    if(!row||hydrated)return;
    hydrated=true;
    injectStyle();

    try{window.status=row.won?"won":"lost";}catch(e){}
    lockAccountDoneUI();

    var check=document.getElementById("checkBtn");
    if(check)check.style.display="none";
    var attempts=document.getElementById("attempts");
    if(attempts)attempts.style.display="none";

    var box=document.getElementById("szpRajaAccountDone");
    if(!box){
      box=document.createElement("div");
      box.id="szpRajaAccountDone";
      box.className="szp-account-done";
      var banner=document.getElementById("banner");
      var stack=document.querySelector(".raja-stack");
      var wrap=document.querySelector(".wrap")||document.body;
      if(banner&&banner.insertAdjacentElement)banner.insertAdjacentElement("afterend",box);
      else if(stack&&stack.parentNode)stack.parentNode.insertBefore(box,stack);
      else if(wrap&&wrap.insertAdjacentElement)wrap.insertAdjacentElement("afterbegin",box);
      else document.body.appendChild(box);
    }
    setNote("Ta Raja jest już zapisana na koncie.","ok");
    var result=row.won?"wygrana":"nieukończone";
    var tries=row.tries?(" · "+row.tries+"/"+(window.MAX_TRIES||4)):"";
    var score=Number.isFinite(Number(row.score))?(" · Punkty: "+row.score):"";
    box.innerHTML="<b>Ta Raja jest już zapisana na koncie.</b><br>Wynik z innego urządzenia: "+result+tries+score;
  }

  async function ensureAchievementToast(){
    if(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function")return true;
    await loadScript("../achievement-toast.js?v=120",function(){
      return !!(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function");
    }).catch(function(){});
    return !!(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function");
  }
  var nazodAwardAttempts = {};
  async function awardNazodIfArchive(){
    try{
      var day = currentDay();
      var today = todayIdx();
      if(!(day < today))return;
      var key = day + ":" + today;
      if(nazodAwardAttempts[key])return;
      nazodAwardAttempts[key] = true;

      var session = await getSession();
      if(!session || !session.user)return;

      var client = await ensureClient();
      var res = await client.rpc("szpilplac_award_archive_achievement",{
        p_source_game:"zorta",
        p_day_index:day,
        p_today_index:today,
        p_meta:{
          source:"raja-archive-nav-v120",
          path:location.pathname,
          puzzle_no:day+1
        }
      });

      if(res && res.error){
        console.warn("Nazod achievement error:",res.error);
        return;
      }

      var rows = Array.isArray(res && res.data) ? res.data : [];
      var fresh = rows.filter(function(row){return row && row.is_new;});
      if(fresh.length){
        await ensureAchievementToast();
        if(window.SZP_ACHIEVEMENT_TOAST && typeof window.SZP_ACHIEVEMENT_TOAST.showMany === "function"){
          window.SZP_ACHIEVEMENT_TOAST.showMany(fresh);
        }
        if(window.SZPILPLAC_REFRESH_ACHIEVEMENTS){
          try{window.SZPILPLAC_REFRESH_ACHIEVEMENTS();}catch(e){}
        }
      }
    }catch(e){
      console.warn("Nazod archive award error:",e);
    }
  }

  async function fetchAccountResult(){
    var ready = await ensureSupabase();
    if(!ready)return null;
    var session = await getSession();
    if(!session || !session.user)return null;
    var client = await ensureClient();

    var day = puzzleNo();
    var today = todayWarsawKey();
    var games = ["zorta","raja"];

    async function queryRows(withFinished, exactPuzzle){
      var sel = withFinished
        ? "game,mode,puzzle_no,won,tries,score,created_at,finished_at"
        : "game,mode,puzzle_no,won,tries,score,created_at";

      var q = client.from("user_game_results")
        .select(sel)
        .eq("user_id",session.user.id)
        .in("game",games);

      if(exactPuzzle)q = q.eq("puzzle_no",day);

      q = q.order("created_at",{ascending:false}).limit(exactPuzzle ? 1 : 30);

      var res = await q;
      if(res && res.error && withFinished){
        return queryRows(false, exactPuzzle);
      }
      if(res && res.error)return [];
      return (res && res.data) ? res.data : [];
    }

    var exact = await queryRows(true,true);
    if(exact && exact[0])return exact[0];

    var rows = await queryRows(true,false);
    for(var i=0;i<rows.length;i++){
      var row = rows[i];
      if(Number(row.puzzle_no||0) === day)return row;
      var d = row.finished_at || row.created_at;
      if(today && d && dateKeyFromValue(d) === today)return row;
    }

    return null;
  }
  async function hydrateAccountResult(){
    try{
      if(hydrated)return;
      if(!isCurrent())return;

      var row = await fetchAccountResult();
      if(row){
        showAccountDone(row);
        return;
      }

      var local = localResultPayload();
      if(local){
        var session = await getSession();
        if(session && session.user){
          setNote("Synchronizuję ukończoną Raję z kontem...","");
          await saveResult(local);
          var saved = await fetchAccountResult();
          if(saved)showAccountDone(saved);
          else lockAccountDoneUI();
        }
      }
    }catch(e){
      console.warn("Raja hydrate/sync error:",e);
    }
  }

  function onRajaFinished(ev){
    var data=(ev&&ev.detail)||window.__SZP_LAST_RAJA_RESULT||snapshot(false);
    if(!data)return;
    data.game=data.game||"zorta";
    data.mode=data.mode||"daily";
    if(data.puzzleNo==null&&data.puzzle_no!=null)data.puzzleNo=data.puzzle_no;
    if(data.puzzleNo==null)data.puzzleNo=puzzleNo();
    if(data.isCurrent==null)data.isCurrent=isCurrent();
    var k=data.game+":"+data.mode+":"+data.puzzleNo;
    if(attempts[k])return;
    attempts[k]=true;
    setTimeout(function(){
      saveResult(data).catch(function(err){
        console.warn("Raja account save error:",err);
        setNote("Nie udało się zapisać wyniku Rai na koncie.","err");
      });
    },80);
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
    window.addEventListener("szpilplac:raja-finished",onRajaFinished);
    if(window.__SZP_LAST_RAJA_RESULT)setTimeout(function(){onRajaFinished({detail:window.__SZP_LAST_RAJA_RESULT});},120);
    setTimeout(hydrateAccountResult,700);
    setTimeout(hydrateAccountResult,1800);
    setTimeout(hydrateAccountResult,3200);

    setTimeout(awardNazodIfArchive,900);
    setTimeout(awardNazodIfArchive,1800);
    setInterval(awardNazodIfArchive,1200);
    var tries=0,timer=setInterval(function(){
      tries++;
      if(hook()||tries>80)clearInterval(timer);
      if(tries===12||tries===32)hydrateAccountResult();
    },100);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
