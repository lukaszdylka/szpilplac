/* Szpilplac PWA + powiadomienia v3 */
(function(){
"use strict";

var VERSION="v3";
var AUTH_STORAGE_KEY="szpilplac-auth-v05";
var sb=null;
var installPrompt=null;
var cssDone=false;

var TYPES=[
  ["daily_games","Nowe gry dnia","Przypomnienie, że czekają dzisiejsze gry."],
  ["news","Nowości","Zmiany, nowe funkcje i ważne informacje."],
  ["achievements","Odznaki","Gdy wpadnie nowa odznaka albo ważny postęp."],
  ["weekly_summary","Podsumowanie tygodnia","Opcjonalne krótkie podsumowanie."]
];

function esc(v){
  return String(v==null?"":v).replace(/[&<>"']/g,function(ch){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
  });
}

function css(){
  if(cssDone)return;
  cssDone=true;
  var s=document.createElement("style");
  s.textContent=[
    ".szp-notify-card{margin:14px 0;padding:16px;border:1px solid var(--line,#c9bfa6);border-radius:18px;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);box-shadow:0 18px 50px -34px rgba(35,32,26,.72)}",
    ".szp-notify-card h2{margin:0 0 7px;font-family:Oswald,system-ui,sans-serif;font-size:22px;text-transform:uppercase;letter-spacing:.03em;line-height:1.05}",
    ".szp-notify-card p{margin:0;color:var(--ink2,#6a6150);font-size:13px;line-height:1.45}",
    ".szp-notify-status{margin-top:10px;padding:10px 12px;border:1px solid var(--line,#c9bfa6);border-radius:12px;background:var(--surface2,#f3ecda);color:var(--ink2,#6a6150);font-size:12.5px;line-height:1.45}",
    ".szp-notify-status.ok{border-color:rgba(63,138,90,.65);color:var(--ok,#3f8a5a)}",
    ".szp-notify-status.err{border-color:rgba(181,72,47,.65);color:var(--danger,#b5482f)}",
    ".szp-notify-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}",
    ".szp-notify-btn{min-height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;border:1px solid var(--green,#2f4a39);background:var(--green,#2f4a39);color:#fff;padding:9px 13px;font-weight:900;font-size:12.5px;cursor:pointer;text-decoration:none}",
    ".szp-notify-btn.secondary{background:var(--surface2,#f3ecda);color:var(--ink,#23201a);border-color:var(--line,#c9bfa6)}",
    ".szp-notify-btn:disabled{opacity:.55;cursor:wait}",
    ".szp-notify-list{display:grid;gap:8px;margin-top:12px}",
    ".szp-notify-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;padding:10px 11px;border:1px solid var(--line,#c9bfa6);border-radius:13px;background:var(--surface2,#f3ecda)}",
    ".szp-notify-row input{width:18px;height:18px;margin-top:2px;accent-color:var(--green,#2f4a39)}",
    ".szp-notify-row b{display:block;color:var(--ink,#23201a);font-size:13px}",
    ".szp-notify-row span span{display:block;margin-top:2px;color:var(--ink2,#6a6150);font-size:11.8px;line-height:1.35}",
    ".szp-install-banner{position:fixed;left:14px;right:14px;bottom:14px;z-index:9997;max-width:520px;margin:0 auto;padding:13px;border:1px solid var(--line,#c9bfa6);border-radius:18px;background:var(--surface,#fbf7ee);box-shadow:0 24px 60px -28px rgba(0,0,0,.6);display:none;color:var(--ink,#23201a)}",
    ".szp-install-banner.show{display:block}.szp-install-banner strong{display:block;font-family:Oswald,system-ui,sans-serif;font-size:18px;text-transform:uppercase}.szp-install-banner p{margin:4px 0 0;color:var(--ink2,#6a6150);font-size:12.5px;line-height:1.35}",
    "@media(max-width:560px){.szp-notify-actions{display:grid}.szp-notify-btn{width:100%}.szp-notify-card{border-radius:16px;padding:14px}}"
  ].join("\n");
  document.head.appendChild(s);
}

function secure(){
  return location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1";
}

function loadScript(src,test){
  if(test&&test())return Promise.resolve();
  return new Promise(function(resolve,reject){
    var clean=src.split("?")[0];
    var existing=[].slice.call(document.scripts||[]).find(function(s){
      return s.src&&s.src.indexOf(clean)!==-1;
    });
    if(existing){
      if(!test||test()){resolve();return;}
      existing.addEventListener("load",resolve,{once:true});
      existing.addEventListener("error",reject,{once:true});
      setTimeout(function(){if(!test||test())resolve();},100);
      return;
    }
    var sc=document.createElement("script");
    sc.src=src;
    sc.async=false;
    sc.onload=resolve;
    sc.onerror=reject;
    document.head.appendChild(sc);
  });
}

async function client(){
  if(sb)return sb;
  await loadScript("config.js",function(){return !!window.SZPILPLAC_CONFIG;});
  await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
  var cfg=window.SZPILPLAC_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)throw new Error("Brak konfiguracji Supabase.");
  if(window.__SZPILPLAC_SUPABASE_CLIENT){
    sb=window.__SZPILPLAC_SUPABASE_CLIENT;
    return sb;
  }
  sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
    auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}
  });
  window.__SZPILPLAC_SUPABASE_CLIENT=sb;
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

async function session(){
  var c;
  try{c=await client();}catch(e){return null;}
  try{
    var r=await c.auth.getSession();
    if(r&&r.data&&r.data.session)return r.data.session;
  }catch(e){}
  var saved=storedSession();
  if(saved&&saved.access_token&&saved.refresh_token){
    try{
      var set=await c.auth.setSession({access_token:saved.access_token,refresh_token:saved.refresh_token});
      if(set&&set.data&&set.data.session)return set.data.session;
    }catch(e){}
    return saved;
  }
  return null;
}

async function regSW(){
  if(!("serviceWorker" in navigator))throw new Error("Ta przeglądarka nie obsługuje service workera.");
  if(!secure())throw new Error("Powiadomienia wymagają HTTPS.");
  var registration=await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

function b64u(s){
  var pad="=".repeat((4-s.length%4)%4);
  var b=(s+pad).replace(/-/g,"+").replace(/_/g,"/");
  var raw=atob(b);
  var arr=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);
  return arr;
}

async function getSettings(){
  var c=await client();
  var r=await c.rpc("szp_get_notification_settings");
  if(r.error)throw r.error;
  return r.data||{};
}

async function savePrefs(p){
  var c=await client();
  var r=await c.rpc("szp_save_notification_preferences",{
    p_daily_games:!!p.daily_games,
    p_weekly_summary:!!p.weekly_summary,
    p_kamrat_reactions:false,
    p_kamrat_added:false,
    p_achievements:!!p.achievements,
    p_news:!!p.news
  });
  if(r.error)throw r.error;
  return r.data;
}

async function saveSub(sub){
  var c=await client();
  var d=sub.toJSON();
  var r=await c.rpc("szp_save_push_subscription",{
    p_endpoint:d.endpoint,
    p_p256dh:d.keys&&d.keys.p256dh,
    p_auth:d.keys&&d.keys.auth,
    p_user_agent:navigator.userAgent||""
  });
  if(r.error)throw r.error;
  return r.data;
}

async function disableSub(){
  var ready=await navigator.serviceWorker.ready;
  var sub=await ready.pushManager.getSubscription();
  if(!sub)return;
  try{
    var d=sub.toJSON();
    var c=await client();
    await c.rpc("szp_disable_push_subscription",{p_endpoint:d.endpoint});
  }catch(e){}
  await sub.unsubscribe().catch(function(){});
}

function status(card,text,type){
  var el=card.querySelector(".szp-notify-status");
  if(!el)return;
  el.textContent=text;
  el.className="szp-notify-status"+(type?" "+type:"");
}

function prefs(card){
  var out={};
  TYPES.forEach(function(t){
    var input=card.querySelector('[data-szp-notify-type="'+t[0]+'"]');
    out[t[0]]=!!(input&&input.checked);
  });
  return out;
}

function applyPrefs(card,p){
  TYPES.forEach(function(t){
    var input=card.querySelector('[data-szp-notify-type="'+t[0]+'"]');
    if(input)input.checked=!!p[t[0]];
  });
}

function support(){
  if(!("Notification" in window))return "Ta przeglądarka nie obsługuje powiadomień.";
  if(!("serviceWorker" in navigator))return "Ta przeglądarka nie obsługuje PWA.";
  if(!("PushManager" in window))return "Ta przeglądarka nie obsługuje web push.";
  if(!secure())return "Powiadomienia wymagają HTTPS.";
  return "";
}

async function enable(card){
  var se=await session();
  if(!se||!se.user)throw new Error("Zaloguj się, żeby włączyć powiadomienia.");
  var cfg=window.SZPILPLAC_CONFIG||{};
  if(!cfg.VAPID_PUBLIC_KEY)throw new Error("Brakuje VAPID_PUBLIC_KEY w config.js. PWA działa, ale push wymaga kluczy VAPID.");
  var permission=await Notification.requestPermission();
  if(permission!=="granted")throw new Error("Nie udzielono zgody na powiadomienia.");
  var registration=await regSW();
  var old=await registration.pushManager.getSubscription();
  if(old)await old.unsubscribe().catch(function(){});
  var sub=await registration.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:b64u(cfg.VAPID_PUBLIC_KEY)
  });
  await saveSub(sub);
  await savePrefs(prefs(card));
}

function renderCard(target){
  css();
  if(document.getElementById("szpNotifyCard"))return;

  var card=document.createElement("section");
  card.className="szp-notify-card";
  card.id="szpNotifyCard";
  card.innerHTML=
    '<h2>Powiadomienia</h2>'+ 
    '<p>Wybierz, o czym Szpilplac może Ci przypominać. Na iPhonie najlepiej dodać stronę do ekranu początkowego i uruchamiać ją z ikonki.</p>'+ 
    '<div class="szp-notify-status">Sprawdzam ustawienia...</div>'+ 
    '<div class="szp-notify-list">'+TYPES.map(function(t){
      return '<label class="szp-notify-row"><input type="checkbox" data-szp-notify-type="'+esc(t[0])+'" checked><span><b>'+esc(t[1])+'</b><span>'+esc(t[2])+'</span></span></label>';
    }).join("")+'</div>'+ 
    '<div class="szp-notify-actions">'+
      '<button type="button" class="szp-notify-btn" id="szpEnablePushBtn">Włącz powiadomienia</button>'+ 
      '<button type="button" class="szp-notify-btn secondary" id="szpSavePushPrefsBtn">Zapisz wybór</button>'+ 
      '<button type="button" class="szp-notify-btn secondary" id="szpDisablePushBtn">Wyłącz na tym urządzeniu</button>'+ 
    '</div>';

  if(target&&target.parentNode)target.parentNode.insertBefore(card,target.nextSibling);
  else (document.querySelector("main")||document.body).appendChild(card);

  var unsupported=support();
  if(unsupported)status(card,unsupported,"err");

  card.querySelector("#szpEnablePushBtn").onclick=async function(){
    var btn=this;
    try{
      btn.disabled=true;
      status(card,"Włączam powiadomienia...","");
      await enable(card);
      status(card,"Powiadomienia włączone na tym urządzeniu.","ok");
    }catch(e){status(card,e.message||String(e),"err");}
    finally{btn.disabled=false;}
  };

  card.querySelector("#szpSavePushPrefsBtn").onclick=async function(){
    var btn=this;
    try{
      btn.disabled=true;
      var se=await session();
      if(!se||!se.user)throw new Error("Zaloguj się, żeby zapisać ustawienia.");
      await savePrefs(prefs(card));
      status(card,"Zapisano wybór powiadomień.","ok");
    }catch(e){status(card,e.message||String(e),"err");}
    finally{btn.disabled=false;}
  };

  card.querySelector("#szpDisablePushBtn").onclick=async function(){
    var btn=this;
    try{
      btn.disabled=true;
      await regSW();
      await disableSub();
      status(card,"Powiadomienia wyłączone na tym urządzeniu.","ok");
    }catch(e){status(card,e.message||String(e),"err");}
    finally{btn.disabled=false;}
  };

  session().then(function(se){
    if(!se||!se.user){
      status(card,"Zaloguj się, żeby włączyć i zapisać powiadomienia.","");
      return;
    }
    return getSettings().then(function(settings){
      applyPrefs(card,settings);
      status(
        card,
        settings.has_push?"Powiadomienia są przypisane do konta na co najmniej jednym urządzeniu.":"Możesz włączyć powiadomienia na tym urządzeniu.",
        settings.has_push?"ok":""
      );
    });
  }).catch(function(e){status(card,e.message||String(e),"err");});
}

function installBanner(){
  css();
  if(localStorage.getItem("szp_pwa_install_dismissed_v1")==="1"||document.getElementById("szpInstallBanner"))return;
  var banner=document.createElement("div");
  banner.className="szp-install-banner";
  banner.id="szpInstallBanner";
  banner.innerHTML=
    '<strong>Dodaj Szpilplac do telefonu</strong>'+ 
    '<p>Szybszy start z ikonki i lepsze działanie powiadomień.</p>'+ 
    '<div class="szp-notify-actions">'+
      '<button type="button" class="szp-notify-btn" id="szpInstallBtn">Dodaj</button>'+ 
      '<button type="button" class="szp-notify-btn secondary" id="szpInstallCloseBtn">Później</button>'+ 
    '</div>';
  document.body.appendChild(banner);

  banner.querySelector("#szpInstallCloseBtn").onclick=function(){
    localStorage.setItem("szp_pwa_install_dismissed_v1","1");
    banner.classList.remove("show");
  };
  banner.querySelector("#szpInstallBtn").onclick=async function(){
    if(installPrompt){
      installPrompt.prompt();
      await installPrompt.userChoice.catch(function(){});
      installPrompt=null;
      localStorage.setItem("szp_pwa_install_dismissed_v1","1");
      banner.classList.remove("show");
    }else{
      alert("Android: menu przeglądarki → Dodaj do ekranu głównego. iPhone: Safari → Udostępnij → Dodaj do ekranu początkowego.");
    }
  };
  setTimeout(function(){banner.classList.add("show");},900);
}

window.addEventListener("beforeinstallprompt",function(e){
  e.preventDefault();
  installPrompt=e;
  installBanner();
});

function boot(){
  regSW().catch(function(e){console.warn("PWA SW",e.message||e);});
  var path=location.pathname.replace(/\/+$/,"");
  if(path.endsWith("/konto.html")||path==="/konto"){
    var target=document.getElementById("profileCard")||document.querySelector("main .card");
    setTimeout(function(){renderCard(target);},500);
  }
  if(path===""||path==="/"||path.endsWith("/index.html")){
    setTimeout(function(){if(installPrompt)installBanner();},1200);
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();

window.SZP_PWA_PUSH={
  version:VERSION,
  renderSettings:renderCard,
  resetInstallBanner:function(){
    localStorage.removeItem("szp_pwa_install_dismissed_v1");
    location.reload();
  }
};
})();
