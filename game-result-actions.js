(function(){
  "use strict";

  var VERSION = "v126";
  var MARK = "data-szp-result-actions";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var client = null;
  var startedAt = Date.now();
  var notifiedAchievements = {};

  function esc(x){
    return String(x == null ? "" : x).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;});
  }
  function warsawDayString(){
    try{
      var parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
      var out = {};
      parts.forEach(function(p){ if(p.type !== "literal") out[p.type] = p.value; });
      return out.year + "-" + out.month + "-" + out.day;
    }catch(e){return new Date().toISOString().slice(0,10);}
  }
  function resetDailyHintChoices(){
    var today = warsawDayString();
    var markerKey = "szpilplac_hint_reset_day";
    try{ if(localStorage.getItem(markerKey) === today)return; }catch(e){}
    try{
      var exactKeys = {slowko_hint:"off",klodka_hint:"off",raja_hint:"off",cuzamen_hint:"off",szpilplac_hint:"off"};
      Object.keys(exactKeys).forEach(function(k){try{localStorage.setItem(k,exactKeys[k]);}catch(e){}});
      var toRemove = [];
      for(var i=0;i<localStorage.length;i++){
        var key = localStorage.key(i);
        if(!key)continue;
        var low = key.toLowerCase();
        if(low.indexOf("hintshown") !== -1 || low.indexOf("hintsused") !== -1 || low.indexOf("hint_used") !== -1 || low.indexOf("hint-shown") !== -1 || low.indexOf("podpowiedz") !== -1 || low.indexOf("podpowiedzi") !== -1)toRemove.push(key);
      }
      toRemove.forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
      localStorage.setItem(markerKey,today);
    }catch(e){}
    try{
      if(typeof window.hintMode !== "undefined")window.hintMode = "off";
      if(typeof window.hintShown !== "undefined")window.hintShown = false;
      if(typeof window.hintsUsed !== "undefined")window.hintsUsed = 0;
      if(typeof window.usedHint !== "undefined" && typeof window.usedHint !== "function")window.usedHint = false;
      if(typeof window.updateHintBar === "function")window.updateHintBar();
    }catch(e){}
  }

  function inRaja(){return /\/raja\/?/.test(location.pathname);}
  function root(path){return (inRaja()?"../":"") + path;}
  function gameKey(){
    var path = location.pathname.toLowerCase();
    if(path.indexOf("klodka") !== -1)return "klodka";
    if(path.indexOf("raja") !== -1)return "raja";
    if(path.indexOf("cuzamen") !== -1)return "cuzamen";
    return "slowko";
  }
  function gameName(){var key=gameKey();return key==="klodka"?"Kłōdka":key==="raja"?"Raja":key==="cuzamen"?"Cuzamen":"Słōwko";}

  function injectStyle(){
    if(document.getElementById("szpResultActionsStyle"))return;
    var st = document.createElement("style");
    st.id = "szpResultActionsStyle";
    st.textContent =
      ".szp-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}"+
      ".szp-result-actions a{min-height:40px;display:flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:12px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:900;text-decoration:none;text-align:center}"+
      ".szp-result-actions a:hover{background:var(--surface,#fbf7ee);color:var(--green,#2f4a39)}"+
      ".szp-result-actions a.primary{background:var(--green,#2f4a39);border-color:var(--green,#2f4a39);color:#fff}"+
      ".szp-result-account-note{margin-top:10px;padding:9px 11px;border:1px dashed var(--line,#c9bfa6);border-radius:12px;background:rgba(191,138,58,.10);color:var(--ink2,#6a6150);font-size:12px;line-height:1.4;text-align:center}"+
      ".szp-cross-device-detail{margin-top:7px;padding-top:7px;border-top:1px dashed var(--line,#c9bfa6);font-size:12.5px;line-height:1.45}"+
      ".szp-cross-device-detail code{font-family:Oswald,monospace;font-size:18px;letter-spacing:.08em;color:var(--gold,#bf8a3a);background:transparent}"+
      ".szp-cross-device-order{margin:6px auto 0;padding-left:20px;text-align:left;display:inline-block;max-width:100%}.szp-cross-device-order li{margin:2px 0}"+
      ".szp-ach-toast{position:fixed;right:18px;bottom:18px;transform:translateY(16px);z-index:10050;width:min(390px,calc(100vw - 28px));border:1px solid rgba(191,138,58,.82);border-radius:20px;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);box-shadow:0 24px 70px -28px rgba(0,0,0,.78);padding:14px 15px 16px;display:grid;grid-template-columns:58px 1fr;gap:12px;align-items:center;opacity:0;pointer-events:auto;overflow:hidden;transition:opacity .18s,transform .18s}"+
      ".szp-ach-toast.on{opacity:1;transform:translateY(0)}.szp-ach-toast .ico svg{width:58px;height:68px;display:block}.szp-ach-toast .k{font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:var(--green,#2f4a39)}.szp-ach-toast .t{font-family:Oswald,system-ui,sans-serif;font-size:23px;line-height:1.04;text-transform:uppercase}.szp-ach-toast .go{display:inline-flex;margin-top:6px;font-size:11.5px;font-weight:900;color:var(--green,#2f4a39);text-decoration:underline;text-underline-offset:2px}.szp-ach-toast .timer{position:absolute;left:0;bottom:0;height:4px;width:100%;background:var(--gold,#bf8a3a);transform-origin:left center;animation:szpAchTimer 5s linear forwards}@keyframes szpAchTimer{from{transform:scaleX(1)}to{transform:scaleX(0)}}@media(max-width:560px){.szp-ach-toast{left:12px;right:12px;bottom:12px;width:auto;grid-template-columns:50px 1fr}.szp-ach-toast .ico svg{width:50px;height:60px}.szp-ach-toast .t{font-size:20px}}@media(max-width:420px){.szp-result-actions{grid-template-columns:1fr}}";
    document.head.appendChild(st);
  }

  function hasAccountSession(){
    try{var raw=localStorage.getItem(AUTH_STORAGE_KEY);if(!raw)return false;var data=JSON.parse(raw);var s=data.currentSession||data.session||data;return !!(s&&s.user);}catch(e){return false;}
  }
  function actionHtml(){
    var logged = hasAccountSession();
    return '<div class="szp-result-actions" '+MARK+'="1"><a class="primary" href="'+root("ranking.html")+'">Zobacz ranking</a><a href="'+root("index.html")+'">Zagraj w inną grę</a><a href="'+root("konto.html")+'">'+(logged?"Moje konto":"Załóż konto")+'</a><a href="https://familock.pl" target="_blank" rel="noopener">Familock</a></div><div class="szp-result-account-note" '+MARK+'="1">'+(logged?"Jeśli byłeś zalogowany przed końcem gry, wynik zapisał się automatycznie.":"Załóż konto, żeby kolejne wyniki zapisywały punkty, rangi i historię. Ten wynik zostaje lokalnie w tej przeglądarce.")+'</div>';
  }
  function loadScript(src,testFn){
    if(typeof testFn === "function" && testFn())return Promise.resolve();
    return new Promise(function(resolve,reject){
      var clean=src.split("?")[0];
      var existing=Array.prototype.slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(clean)!==-1;});
      if(existing){if(typeof testFn!=="function"||testFn())return resolve();existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});return;}
      var sc=document.createElement("script");sc.src=src;sc.async=false;sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc);
    });
  }
  async function getClient(){
    if(client)return client;
    if(window.SZPILPLAC_AUTH&&typeof window.SZPILPLAC_AUTH.getClient==="function"){try{var existing=window.SZPILPLAC_AUTH.getClient();if(existing){client=existing;return client;}}catch(e){}}
    await loadScript(root("config.js?v=13"),function(){return !!window.SZPILPLAC_CONFIG;}).catch(function(){});
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var url=window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL);
    var key=window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY);
    if(!url||!key||!window.supabase)return null;
    client=window.supabase.createClient(url,key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    return client;
  }

  function nval(x){var n=Number(x);return Number.isFinite(n)?n:null;}
  function gnum(names){for(var i=0;i<names.length;i++){try{var n=nval(window[names[i]]);if(n!==null)return n;}catch(e){}}return null;}
  function inferMeta(){
    var g=window.game||{};
    var guesses=Array.isArray(g.guesses)?g.guesses:null;
    var attempts=guesses?guesses.length:null;
    if(!attempts)attempts=gnum(["tries","attempts","tryCount","guessCount"]);
    var won=null;
    if(g.status==="won"||g.won===true||window.won===true)won=true;
    if(g.status==="lost"||g.won===false||window.won===false)won=false;
    var hints=null;
    if(typeof window.hintShown!=="undefined")hints=window.hintShown?1:0;
    if(typeof window.hintsUsed!=="undefined")hints=Number(window.hintsUsed)||0;
    if(typeof window.hintData!=="undefined")hints=window.hintData?1:0;
    if(typeof window.usedHint!=="undefined"&&typeof window.usedHint!=="function")hints=window.usedHint?1:0;
    return {game:gameKey(),game_name:gameName(),won:won,attempts:attempts,max_attempts:gnum(["MAX_TRIES","MAX_GUESSES","MAX_GUESSES_TEST","maxGuesses","maxAttempts"]),hints_used:hints,duration_seconds:Math.max(0,Math.round((Date.now()-startedAt)/1000)),word_length:gnum(["LEN","WORD_LEN","wordLength"]),day_index:(typeof window.currentDay==="number")?window.currentDay:null,today_index:(typeof window.TODAY_IDX==="number")?window.TODAY_IDX:null,mistakes:gnum(["mistakes","mistakeCount","errors","errorCount","wrong","wrongCount"]),score:gnum(["score","points","lastScore"]),path:location.pathname};
  }
  function showAchievementToast(row){
    if(!row||!row.label)return;
    var id=row.achievement_id||row.id||row.label;
    if(notifiedAchievements[id])return;
    notifiedAchievements[id]=true;
    if(window.SZP_ACHIEVEMENT_TOAST&&typeof window.SZP_ACHIEVEMENT_TOAST.show==="function"){window.SZP_ACHIEVEMENT_TOAST.show(row);return;}
    injectStyle();
    var old=document.querySelector(".szp-ach-toast");if(old)old.remove();
    var el=document.createElement("div");el.className="szp-ach-toast";el.setAttribute("role","status");el.setAttribute("aria-live","polite");
    el.innerHTML='<div class="ico">'+(row.svg||"")+'</div><div><div class="k">Nowa odznaka</div><div class="t"></div><a class="go" href="'+root("konto.html")+'">Sprawdź w profilu</a></div><div class="timer" aria-hidden="true"></div>';
    el.querySelector(".t").textContent=row.label;document.body.appendChild(el);setTimeout(function(){el.classList.add("on");},40);setTimeout(function(){el.classList.remove("on");},5000);setTimeout(function(){el.remove();},5250);
  }
  async function checkAchievements(eventName,meta){
    if(!hasAccountSession())return;
    try{
      var c=await getClient();if(!c)return;meta=meta||inferMeta();
      var res=await c.rpc("szpilplac_check_achievement_event",{p_event:eventName,p_source_game:meta.game||gameKey(),p_won:meta.won,p_attempts:meta.attempts,p_hints_used:meta.hints_used,p_score:meta.score||null,p_meta:meta});
      if(res.error)return;
      var rows=Array.isArray(res.data)?res.data:[];
      rows.filter(function(r){return r&&r.is_new;}).forEach(showAchievementToast);
      if(rows.some(function(r){return r&&r.is_new;})&&window.SZPILPLAC_REFRESH_ACHIEVEMENTS){try{window.SZPILPLAC_REFRESH_ACHIEVEMENTS();}catch(e){}}
    }catch(e){}
  }

  function appendDetailOnce(box,key,html){
    if(!box||box.getAttribute("data-szp-detail-"+key))return;
    box.setAttribute("data-szp-detail-"+key,"1");
    var node=document.createElement("div");node.className="szp-cross-device-detail";node.innerHTML=html;box.appendChild(node);
  }
  function enhanceSlowkoDone(){
    var box=document.getElementById("slowkoAccountDone");
    if(!box||box.getAttribute("data-szp-detail-slowko"))return;
    if(typeof window.rpc!=="function")return;
    var day=typeof window.currentDay==="number"?window.currentDay:null;
    if(day==null)return;
    box.setAttribute("data-szp-detail-slowko","loading");
    window.rpc("wihajster_reveal_day",{p_day:day}).then(function(r){
      if(!r)return;
      var word=r.word||r.slowo||r.answer||"";
      var meaning=r.meaning||r.znaczenie||"";
      if(!word&&!meaning)return;
      box.setAttribute("data-szp-detail-slowko","1");
      appendDetailOnce(box,"slowko-ready",'Słowo dnia: '+(word?'<code>'+esc(word)+'</code>':'—')+(meaning?'<br>Znaczenie: <b>'+esc(meaning)+'</b>':''));
    }).catch(function(){box.removeAttribute("data-szp-detail-slowko");});
  }
  async function enhanceRajaDone(){
    var box=document.getElementById("szpRajaAccountDone");
    if(!box||box.getAttribute("data-szp-detail-raja"))return;
    var day=typeof window.currentDay==="number"?window.currentDay:null;
    if(day==null)return;
    box.setAttribute("data-szp-detail-raja","loading");
    try{
      var c=await getClient();if(!c){box.removeAttribute("data-szp-detail-raja");return;}
      var res=await c.rpc("zorta_daily_reveal",{p_day:day});
      var rv=res&&res.data?res.data:res;
      var order=(rv&&Array.isArray(rv.kolejnosc))?rv.kolejnosc:[];
      if(!order.length){box.removeAttribute("data-szp-detail-raja");return;}
      box.setAttribute("data-szp-detail-raja","1");
      appendDetailOnce(box,"raja-ready",'Ułożenie dnia:<ol class="szp-cross-device-order">'+order.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ol>');
    }catch(e){box.removeAttribute("data-szp-detail-raja");}
  }
  async function enhanceKlodkaDoneFallback(){
    var box=document.getElementById("szpKlodkaAccountDone");
    if(!box||box.getAttribute("data-szp-detail-klodka")||/Kod dnia|Kod tygodniówki/.test(box.textContent||""))return;
    var mode=String(window.view||"daily");
    var idx=mode==="weekly"?Number(window.WEEK_NO):Number(window.DAY_NO||window.TODAY_NO);
    if(!idx)return;
    box.setAttribute("data-szp-detail-klodka","loading");
    try{
      var c=await getClient();if(!c){box.removeAttribute("data-szp-detail-klodka");return;}
      var res=await c.rpc("klodka_reveal",{p_mode:mode,p_idx:idx});
      var code=res&&res.data!=null?res.data:res;
      if(!code){box.removeAttribute("data-szp-detail-klodka");return;}
      box.setAttribute("data-szp-detail-klodka","1");
      appendDetailOnce(box,"klodka-ready",(mode==="weekly"?"Kod tygodniówki":"Kod dnia")+': <code>'+esc(code)+'</code>');
    }catch(e){box.removeAttribute("data-szp-detail-klodka");}
  }
  function enhanceCrossDeviceDetails(){injectStyle();enhanceSlowkoDone();enhanceRajaDone();enhanceKlodkaDoneFallback();}

  function isResultHost(el){
    if(!el||el.nodeType!==1)return false;
    if(el.querySelector&&el.querySelector("[data-szp-result-actions]"))return false;
    var id=el.id||"", cls=el.className||"", text=(el.textContent||"").toLowerCase();
    if(id==="modal"&&el.querySelector("#shareBtn")&&(el.querySelector(".reveal-card")||el.querySelector(".reveal-code")||text.indexOf("otwarte")!==-1||text.indexOf("trefi")!==-1||text.indexOf("nie uda")!==-1||text.indexOf("niy podar")!==-1))return true;
    if(id==="result"||(typeof cls==="string"&&cls.indexOf("result")!==-1)){if((el.classList&&el.classList.contains("show"))||el.querySelector("#shareBtn"))return true;}
    return false;
  }
  function enhanceHost(el){if(!isResultHost(el))return;injectStyle();el.insertAdjacentHTML("beforeend",actionHtml());if(!el.hasAttribute("data-szp-achievements-checked"))el.setAttribute("data-szp-achievements-checked","1");}
  function scan(){
    var candidates=[];
    var modal=document.getElementById("modal"), result=document.getElementById("result");
    if(modal)candidates.push(modal);if(result)candidates.push(result);
    document.querySelectorAll(".modal,.result").forEach(function(el){candidates.push(el);});
    candidates.forEach(enhanceHost);
    enhanceCrossDeviceDetails();
  }
  function hookShare(){
    document.addEventListener("click",function(e){var btn=e.target&&e.target.closest?e.target.closest("#shareBtn,[data-share],.share-btn"):null;if(!btn)return;setTimeout(function(){var meta=inferMeta();meta.shared=true;checkAchievements("share",meta);},250);},true);
  }
  window.SZP_RESULT_ACHIEVEMENTS={version:VERSION,check:checkAchievements,show:showAchievementToast,scan:scan};
  function boot(){
    resetDailyHintChoices();injectStyle();hookShare();scan();
    var obs=new MutationObserver(function(){scan();});
    obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
    setInterval(scan,1200);
    console.info("Szpilplac game-result-actions.js "+VERSION);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();