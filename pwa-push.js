/* Szpilplac PWA + powiadomienia v1 */
(function(){
"use strict";
var VERSION="v2";
var AUTH_STORAGE_KEY="szpilplac-auth-v05";
var sb=null,installPrompt=null,cssDone=false;
var TYPES=[
  ["daily_games","Nowe gry dnia","Przypomnienie, że czekają dzisiejsze gry."],
  ["news","Nowości","Zmiany, nowe funkcje i ważne informacje."],
  ["kamrat_reactions","Reakcje od kamratów","Gdy ktoś zostawi Ci reakcję."],
  ["kamrat_added","Nowy kamrat","Gdy ktoś doda Cię do kamratów."],
  ["achievements","Odznaki","Gdy wpadnie nowa odznaka albo ważny postęp."],
  ["weekly_summary","Podsumowanie tygodnia","Opcjonalne krótkie podsumowanie."]
];
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
function css(){
 if(cssDone)return; cssDone=true;
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
function secure(){return location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1";}
function loadScript(src,test){if(test&&test())return Promise.resolve();return new Promise(function(res,rej){var ex=[].slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(src.split("?")[0])!==-1;});if(ex){ex.addEventListener("load",res,{once:true});ex.addEventListener("error",rej,{once:true});setTimeout(function(){if(!test||test())res();},50);return;}var sc=document.createElement("script");sc.src=src;sc.async=false;sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});}
async function client(){if(sb)return sb;await loadScript("config.js",function(){return !!window.SZPILPLAC_CONFIG;});await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});var cfg=window.SZPILPLAC_CONFIG||{};if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)throw new Error("Brak konfiguracji Supabase.");if(window.__SZPILPLAC_SUPABASE_CLIENT){sb=window.__SZPILPLAC_SUPABASE_CLIENT;return sb;}sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});window.__SZPILPLAC_SUPABASE_CLIENT=sb;return sb;}
function storedSession(){try{var raw=localStorage.getItem(AUTH_STORAGE_KEY);if(!raw)return null;var d=JSON.parse(raw);return d.currentSession||d.session||d;}catch(e){return null;}}
async function session(){var c;try{c=await client();}catch(e){return null;}try{var r=await c.auth.getSession();if(r&&r.data&&r.data.session)return r.data.session;}catch(e){}var st=storedSession();if(st&&st.access_token&&st.refresh_token){try{var sr=await c.auth.setSession({access_token:st.access_token,refresh_token:st.refresh_token});if(sr&&sr.data&&sr.data.session)return sr.data.session;}catch(e){}return st;}return null;}
async function regSW(){if(!("serviceWorker" in navigator))throw new Error("Ta przeglądarka nie obsługuje service workera.");if(!secure())throw new Error("Powiadomienia wymagają HTTPS.");return navigator.serviceWorker.register("/sw.js").then(function(r){return navigator.serviceWorker.ready.then(function(){return r;});});}
function b64u(s){var pad="=".repeat((4-s.length%4)%4);var b=(s+pad).replace(/-/g,"+").replace(/_/g,"/");var raw=atob(b);var arr=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);return arr;}
async function getSettings(){var c=await client();var r=await c.rpc("szp_get_notification_settings");if(r.error)throw r.error;return r.data||{};}
async function savePrefs(p){var c=await client();var r=await c.rpc("szp_save_notification_preferences",{p_daily_games:!!p.daily_games,p_weekly_summary:!!p.weekly_summary,p_kamrat_reactions:!!p.kamrat_reactions,p_kamrat_added:!!p.kamrat_added,p_achievements:!!p.achievements,p_news:!!p.news});if(r.error)throw r.error;return r.data;}
async function saveSub(sub){var c=await client();var d=sub.toJSON();var r=await c.rpc("szp_save_push_subscription",{p_endpoint:d.endpoint,p_p256dh:d.keys&&d.keys.p256dh,p_auth:d.keys&&d.keys.auth,p_user_agent:navigator.userAgent||""});if(r.error)throw r.error;return r.data;}
async function disableSub(){var r=await navigator.serviceWorker.ready;var sub=await r.pushManager.getSubscription();if(sub){try{var d=sub.toJSON();var c=await client();await c.rpc("szp_disable_push_subscription",{p_endpoint:d.endpoint});}catch(e){}await sub.unsubscribe().catch(function(){});}}
function status(card,t,typ){var el=card.querySelector(".szp-notify-status");if(el){el.textContent=t;el.className="szp-notify-status"+(typ?" "+typ:"");}}
function prefs(card){var p={};TYPES.forEach(function(t){var i=card.querySelector('[data-szp-notify-type="'+t[0]+'"]');p[t[0]]=!!(i&&i.checked);});return p;}
function applyPrefs(card,p){TYPES.forEach(function(t){var i=card.querySelector('[data-szp-notify-type="'+t[0]+'"]');if(i)i.checked=!!p[t[0]];});}
function support(){if(!("Notification" in window))return "Ta przeglądarka nie obsługuje powiadomień.";if(!("serviceWorker" in navigator))return "Ta przeglądarka nie obsługuje PWA.";if(!("PushManager" in window))return "Ta przeglądarka nie obsługuje web push.";if(!secure())return "Powiadomienia wymagają HTTPS.";return "";}
async function enable(card){var se=await session();if(!se||!se.user)throw new Error("Zaloguj się, żeby włączyć powiadomienia.");var cfg=window.SZPILPLAC_CONFIG||{};if(!cfg.VAPID_PUBLIC_KEY)throw new Error("Brakuje VAPID_PUBLIC_KEY w config.js. PWA działa, ale push wymaga kluczy VAPID.");var perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("Nie udzielono zgody na powiadomienia.");var r=await regSW();var old=await r.pushManager.getSubscription();if(old)await old.unsubscribe().catch(function(){});var sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(cfg.VAPID_PUBLIC_KEY)});await saveSub(sub);await savePrefs(prefs(card));}

function kontoFoldoutStyle(){
 if(document.getElementById("konto-dynamic-foldout-style"))return;
 var s=document.createElement("style");
 s.id="konto-dynamic-foldout-style";
 s.textContent=[
  ".konto-extra-foldouts{display:grid;gap:10px;margin-top:14px}",
  ".konto-native-foldout{border:1px solid var(--line,#c9bfa6);border-radius:15px;background:var(--surface2,#f3ecda);overflow:hidden}",
  ".konto-native-foldout>summary{list-style:none;cursor:pointer;padding:13px 14px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;color:var(--ink,#23201a);font-family:Oswald,system-ui,sans-serif;font-size:18px;line-height:1.05;letter-spacing:.03em;text-transform:uppercase;user-select:none}",
  ".konto-native-foldout>summary::-webkit-details-marker{display:none}",
  ".konto-native-foldout>summary:after{content:'›';color:var(--gold,#bf8a3a);font-size:25px;line-height:1;transform:rotate(90deg)}",
  ".konto-native-foldout[open]>summary:after{transform:rotate(-90deg)}",
  ".konto-native-foldout>summary small{display:block;margin-top:3px;color:var(--ink2,#6a6150);font-family:Inter,system-ui,sans-serif;font-size:11.5px;line-height:1.35;font-weight:800;letter-spacing:0;text-transform:none}",
  ".konto-native-foldout-body{padding:13px;border-top:1px solid var(--line,#c9bfa6);background:var(--surface,#fbf7ee)}",
  ".konto-native-foldout-body .szp-notify-card,.konto-native-foldout-body .kamraty-panel{margin:0!important;border:0!important;box-shadow:none!important;background:transparent!important;padding:0!important;border-radius:0!important}",
  ".konto-native-foldout-body .szp-notify-card>h2,.konto-native-foldout-body .szp-notify-card>p,.konto-native-foldout-body .kamraty-panel>.kamraty-head>div{display:none!important}"
 ].join("\n");
 document.head.appendChild(s);
}
function kontoExtraWrap(){
 var profile=document.getElementById("profileCard");
 if(!profile)return null;
 kontoFoldoutStyle();
 var wrap=document.getElementById("kontoExtraFoldouts");
 if(!wrap){wrap=document.createElement("section");wrap.id="kontoExtraFoldouts";wrap.className="konto-extra-foldouts";profile.appendChild(wrap);}
 return wrap;
}
function kontoFoldoutBody(id,title,sub){
 var wrap=kontoExtraWrap();
 if(!wrap)return null;
 var det=document.getElementById(id);
 if(!det){
   det=document.createElement("details");det.id=id;det.className="konto-native-foldout";
   det.innerHTML='<summary><span>'+esc(title)+'<small>'+esc(sub||"")+'</small></span></summary><div class="konto-native-foldout-body"></div>';
   wrap.appendChild(det);
 }
 return det.querySelector(".konto-native-foldout-body");
}
function placeKontoNotify(card,target){
 if(location.pathname.indexOf("konto")!==-1){
   var body=kontoFoldoutBody("kontoNotifyFoldout","Powiadomienia","Telefon, PWA i typy powiadomień.");
   if(body){body.appendChild(card);return;}
 }
 placeKontoNotify(card,target);
}

function renderCard(target){css();if(document.getElementById("szpNotifyCard"))return;var card=document.createElement("section");card.className="szp-notify-card";card.id="szpNotifyCard";card.innerHTML='<h2>Powiadomienia</h2><p>Wybierz, o czym Szpilplac może Ci przypominać. Na iPhonie najlepiej dodać stronę do ekranu początkowego i uruchamiać ją z ikonki.</p><div class="szp-notify-status">Sprawdzam ustawienia...</div><div class="szp-notify-list">'+TYPES.map(function(t){return '<label class="szp-notify-row"><input type="checkbox" data-szp-notify-type="'+esc(t[0])+'" checked><span><b>'+esc(t[1])+'</b><span>'+esc(t[2])+'</span></span></label>';}).join("")+'</div><div class="szp-notify-actions"><button type="button" class="szp-notify-btn" id="szpEnablePushBtn">Włącz powiadomienia</button><button type="button" class="szp-notify-btn secondary" id="szpSavePushPrefsBtn">Zapisz wybór</button><button type="button" class="szp-notify-btn secondary" id="szpDisablePushBtn">Wyłącz na tym urządzeniu</button></div>';
 if(target&&target.parentNode)target.parentNode.insertBefore(card,target.nextSibling);else (document.querySelector("main")||document.body).appendChild(card);
 var uns=support();if(uns)status(card,uns,"err");
 card.querySelector("#szpEnablePushBtn").onclick=async function(){var b=this;try{b.disabled=true;status(card,"Włączam powiadomienia...","");await enable(card);status(card,"Powiadomienia włączone na tym urządzeniu.","ok");}catch(e){status(card,e.message||String(e),"err");}finally{b.disabled=false;}};
 card.querySelector("#szpSavePushPrefsBtn").onclick=async function(){var b=this;try{b.disabled=true;var se=await session();if(!se||!se.user)throw new Error("Zaloguj się, żeby zapisać ustawienia.");await savePrefs(prefs(card));status(card,"Zapisano wybór powiadomień.","ok");}catch(e){status(card,e.message||String(e),"err");}finally{b.disabled=false;}};
 card.querySelector("#szpDisablePushBtn").onclick=async function(){var b=this;try{b.disabled=true;await regSW();await disableSub();status(card,"Powiadomienia wyłączone na tym urządzeniu.","ok");}catch(e){status(card,e.message||String(e),"err");}finally{b.disabled=false;}};
 session().then(function(se){if(!se||!se.user){status(card,"Zaloguj się, żeby włączyć i zapisać powiadomienia.","");return;}return getSettings().then(function(st){applyPrefs(card,st);status(card,st.has_push?"Powiadomienia są przypisane do konta na co najmniej jednym urządzeniu.":"Możesz włączyć powiadomienia na tym urządzeniu.",st.has_push?"ok":"");});}).catch(function(e){status(card,e.message||String(e),"err");});
}
function installBanner(){css();if(localStorage.getItem("szp_pwa_install_dismissed_v1")==="1"||document.getElementById("szpInstallBanner"))return;var b=document.createElement("div");b.className="szp-install-banner";b.id="szpInstallBanner";b.innerHTML='<strong>Dodaj Szpilplac do telefonu</strong><p>Szybszy start z ikonki i lepsze działanie powiadomień.</p><div class="szp-notify-actions"><button type="button" class="szp-notify-btn" id="szpInstallBtn">Dodaj</button><button type="button" class="szp-notify-btn secondary" id="szpInstallCloseBtn">Później</button></div>';document.body.appendChild(b);b.querySelector("#szpInstallCloseBtn").onclick=function(){localStorage.setItem("szp_pwa_install_dismissed_v1","1");b.classList.remove("show");};b.querySelector("#szpInstallBtn").onclick=async function(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice.catch(function(){});installPrompt=null;localStorage.setItem("szp_pwa_install_dismissed_v1","1");b.classList.remove("show");}else alert("Android: menu przeglądarki → Dodaj do ekranu głównego. iPhone: Safari → Udostępnij → Dodaj do ekranu początkowego.");};setTimeout(function(){b.classList.add("show");},900);}
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();installPrompt=e;installBanner();});
function boot(){regSW().catch(function(e){console.warn("PWA SW",e.message||e);});var p=location.pathname.replace(/\/+$/,"");if(p.endsWith("/konto.html")||p==="/konto"){var t=document.getElementById("kamratyPanel")||document.getElementById("playerCard")||document.querySelector("main .card");setTimeout(function(){renderCard(t);},500);}if(p===""||p==="/"||p.endsWith("/index.html"))setTimeout(function(){if(installPrompt)installBanner();},1200);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.SZP_PWA_PUSH={version:VERSION,renderSettings:renderCard,resetInstallBanner:function(){localStorage.removeItem("szp_pwa_install_dismissed_v1");location.reload();}};
})();
