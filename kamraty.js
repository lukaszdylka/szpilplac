/* Szpilplac public-profile bridge v7
   Kamraty z placu zostały wycofane. Ten plik zachowuje tylko:
   - prosty profil publiczny gracza,
   - przełącznik widoczności profilu w koncie,
   - link do profilu publicznego z rankingu.
*/
(function(){
  "use strict";

  var VERSION="v7";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var currentUser=null;
  var publicMap={};

  function esc(x){
    return String(x==null?"":x).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch;
    });
  }
  function fmt(n){return String(Number(n||0));}
  function fmtDate(x){
    if(!x)return "—";
    try{return new Date(x).toLocaleString("pl-PL");}catch(e){return "—";}
  }
  function cfg(){
    return {
      url:window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL)||"",
      key:window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY)||""
    };
  }
  function initClient(){
    if(sb)return true;
    var c=cfg();
    if(!c.url||!c.key||!window.supabase)return false;
    if(window.__SZPILPLAC_SUPABASE_CLIENT)sb=window.__SZPILPLAC_SUPABASE_CLIENT;
    else{
      sb=window.supabase.createClient(c.url,c.key,{
        auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}
      });
      window.__SZPILPLAC_SUPABASE_CLIENT=sb;
    }
    return true;
  }
  async function session(){
    if(!initClient())return null;
    try{
      var r=await sb.auth.getSession();
      if(r&&r.data&&r.data.session){
        currentUser=r.data.session.user||null;
        return r.data.session;
      }
    }catch(e){}
    try{
      var raw=localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw)return null;
      var data=JSON.parse(raw),s=data.currentSession||data.session||data;
      if(s&&s.access_token&&s.refresh_token){
        try{
          var set=await sb.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
          if(set&&set.data&&set.data.session){
            currentUser=set.data.session.user||null;
            return set.data.session;
          }
        }catch(e){}
        currentUser=s.user||null;
        return s;
      }
    }catch(e){}
    return null;
  }
  async function rpc(name,args){
    if(!initClient())throw new Error("Brak połączenia z Supabase.");
    var r=await sb.rpc(name,args||{});
    if(r.error)throw r.error;
    return r.data;
  }

  function injectStyle(){
    if(document.getElementById("publicProfileStyle"))return;
    var s=document.createElement("style");
    s.id="publicProfileStyle";
    s.textContent=[
      ".public-profile-settings{display:grid;gap:10px;color:var(--ink,#23201a)}",
      ".public-profile-settings p{margin:0;color:var(--ink2,#6a6150);font-size:12.5px;line-height:1.5}",
      ".public-profile-toggle{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid var(--line,#c9bfa6);border-radius:13px;background:var(--surface2,#f3ecda);font-size:12.5px;font-weight:900;line-height:1.4}",
      ".public-profile-toggle input{margin-top:2px;accent-color:var(--green,#2f4a39)}",
      ".public-profile-msg{min-height:18px;color:var(--ink2,#6a6150);font-size:11.5px;line-height:1.45}",
      ".public-profile-card{display:grid;gap:14px}",
      ".public-profile-head h1{margin:0;font-family:Oswald,system-ui,sans-serif;font-size:28px;line-height:1.05;text-transform:uppercase;color:var(--ink,#23201a)}",
      ".public-profile-head p{margin:6px 0 0;color:var(--ink2,#6a6150);font-size:12.5px;line-height:1.5}",
      ".public-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}",
      ".public-stat{padding:10px;border:1px solid var(--line,#c9bfa6);border-radius:13px;background:var(--surface2,#f3ecda)}",
      ".public-stat small{display:block;color:var(--ink2,#6a6150);font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}",
      ".public-stat strong{display:block;margin-top:4px;font-family:Oswald,system-ui,sans-serif;font-size:20px;line-height:1.05;color:var(--ink,#23201a)}",
      ".public-actions{display:flex;gap:8px;flex-wrap:wrap}",
      ".public-actions a,.rank-public-link{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:7px 10px;border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font-size:11.5px;font-weight:900;text-decoration:none}",
      ".public-actions a:hover,.rank-public-link:hover{background:var(--surface,#fbf7ee);color:var(--green,#2f4a39)}",
      ".rank-public-actions{grid-column:3/5;margin-top:8px}",
      ".public-profile-empty{padding:12px;border:1px dashed var(--line,#c9bfa6);border-radius:13px;color:var(--ink2,#6a6150);font-size:13px;line-height:1.5}",
      "@media(max-width:560px){.public-stats{grid-template-columns:1fr 1fr}.rank-public-actions{grid-column:3/5}}",
      "@media(max-width:390px){.public-stats{grid-template-columns:1fr 1fr}.rank-public-actions{grid-column:3/4}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function removeLegacyKamratUi(){
    ["kontoKamratyFoldout","kamratyPanel","kamratyGlobalMsg","rankPublicEmpty"].forEach(function(id){
      var el=document.getElementById(id);if(el)el.remove();
    });
    Array.prototype.slice.call(document.querySelectorAll(".rank-kamrat-actions,.rank-z-placu,.kamraty-panel,.reaction-row,.reaction-counts,.compare-box")).forEach(function(el){
      if(!el.closest||!el.closest("#publicProfileBox"))el.remove();
    });
    var folds=document.getElementById("kontoBottomFoldouts");
    if(folds)folds.setAttribute("aria-label","Profil i powiadomienia");
  }

  function accountHost(){
    return document.getElementById("kontoBottomFoldouts")||document.getElementById("profileCard");
  }
  function ensurePublicProfileSettings(){
    removeLegacyKamratUi();
    if(document.getElementById("kontoPublicProfileFoldout"))return;
    var host=accountHost();
    if(!host)return;

    var details=document.createElement("details");
    details.id="kontoPublicProfileFoldout";
    details.className=host.id==="kontoBottomFoldouts"?"konto-bottom-foldout":"konto-native-foldout";
    details.innerHTML=
      '<summary><span>Profil publiczny<small>Widoczność Twoich podstawowych statystyk dla innych graczy.</small></span></summary>'+ 
      '<div class="'+(host.id==="kontoBottomFoldouts"?'konto-bottom-foldout-body':'konto-native-foldout-body')+'">'+
        '<div class="public-profile-settings" id="publicProfileSettings"><div class="public-profile-msg">Ładuję ustawienie...</div></div>'+ 
      '</div>';

    var notify=document.getElementById("kontoNotificationsFoldout");
    if(notify&&notify.parentNode===host)host.insertBefore(details,notify);
    else host.appendChild(details);
    loadPublicProfileSettings();
  }
  async function loadPublicProfileSettings(){
    var box=document.getElementById("publicProfileSettings");
    if(!box)return;
    await session();
    if(!currentUser){
      box.innerHTML='<div class="public-profile-msg">Profil publiczny jest dostępny po zalogowaniu.</div>';
      return;
    }
    var state=false;
    try{
      var st=await rpc("szp_my_public_profile",{});
      state=!!(Array.isArray(st)?st[0]&&st[0].public_profile:st&&st.public_profile);
    }catch(e){}
    box.innerHTML=
      '<label class="public-profile-toggle"><input type="checkbox" id="publicProfileToggle" '+(state?'checked':'')+'><span>Pokazuj mój profil w rankingu i pozwól otworzyć jego publiczny podgląd.</span></label>'+ 
      '<p>Publiczny profil pokazuje login, rangę i statystyki gry. Nie pokazuje adresu e-mail ani prywatnych danych.</p>'+ 
      '<div class="public-profile-msg" id="publicProfileMsg"></div>';
    var toggle=document.getElementById("publicProfileToggle");
    toggle.addEventListener("change",async function(){
      var msg=document.getElementById("publicProfileMsg");
      toggle.disabled=true;
      if(msg)msg.textContent="Zapisuję...";
      try{
        await rpc("szp_set_public_profile",{p_public:!!toggle.checked});
        if(msg)msg.textContent=toggle.checked?"Profil publiczny jest włączony.":"Profil publiczny jest wyłączony.";
      }catch(e){
        toggle.checked=!toggle.checked;
        if(msg)msg.textContent="Nie udało się zapisać ustawienia.";
      }finally{toggle.disabled=false;}
    });
  }

  async function loadPublicMap(){
    publicMap={};
    try{
      var rows=await rpc("szp_public_players",{});
      (rows||[]).forEach(function(r){if(r&&r.user_id)publicMap[String(r.user_id)]=r;});
    }catch(e){}
    return publicMap;
  }
  function addPublicLinks(){
    Array.prototype.slice.call(document.querySelectorAll(".rank-public-actions")).forEach(function(el){el.remove();});
    Array.prototype.slice.call(document.querySelectorAll(".rank-row[data-user-id]")).forEach(function(row){
      var id=row.getAttribute("data-user-id");
      if(!id||!publicMap[id])return;
      var box=document.createElement("div");
      box.className="rank-public-actions";
      box.innerHTML='<a class="rank-public-link" href="gracz.html?u='+encodeURIComponent(id)+'">Profil</a>';
      var details=row.querySelector(".details")||row.lastElementChild;
      if(details&&details.parentNode)details.parentNode.insertBefore(box,details.nextSibling);
      else row.appendChild(box);
    });
  }
  async function enhanceRanking(){
    removeLegacyKamratUi();
    await loadPublicMap();
    addPublicLinks();
    var list=document.getElementById("rankingList");
    if(list&&window.MutationObserver){
      var timer=null;
      new MutationObserver(function(){
        clearTimeout(timer);
        timer=setTimeout(function(){removeLegacyKamratUi();addPublicLinks();},60);
      }).observe(list,{childList:true,subtree:true});
    }
  }

  async function renderPublicProfilePage(){
    var box=document.getElementById("publicProfileBox");
    if(!box)return;
    var id=new URLSearchParams(location.search).get("u")||"";
    if(!id){box.innerHTML='<div class="public-profile-empty">Brak wskazanego gracza.</div>';return;}
    box.innerHTML='<div class="public-profile-empty">Ładuję profil...</div>';
    try{
      var rows=await rpc("szp_get_public_player",{p_player_id:id});
      var p=Array.isArray(rows)?rows[0]:rows;
      if(!p){box.innerHTML='<div class="public-profile-empty">Ten profil nie jest publiczny albo nie istnieje.</div>';return;}
      box.innerHTML=
        '<div class="public-profile-card">'+
          '<div class="public-profile-head"><h1>'+esc(p.login||"Gracz")+'</h1><p>Publiczny profil gracza Szpilplaca.</p></div>'+ 
          '<div class="public-stats">'+
            '<div class="public-stat"><small>Ranga</small><strong>'+esc(p.rank_name||"Gorol")+'</strong></div>'+ 
            '<div class="public-stat"><small>Punkty</small><strong>'+fmt(p.points)+'</strong></div>'+ 
            '<div class="public-stat"><small>Gry</small><strong>'+fmt(p.games_played)+'</strong></div>'+ 
            '<div class="public-stat"><small>Wygrane</small><strong>'+fmt(p.wins)+'</strong></div>'+ 
          '</div>'+ 
          '<div class="public-stats">'+
            '<div class="public-stat"><small>Dziś</small><strong>'+fmt(p.played_today)+'</strong></div>'+ 
            '<div class="public-stat"><small>7 dni</small><strong>'+fmt(p.played_7d)+'</strong></div>'+ 
            '<div class="public-stat"><small>Skuteczność</small><strong>'+fmt(p.win_pct)+'%</strong></div>'+ 
            '<div class="public-stat"><small>Ostatnio</small><strong style="font-size:14px">'+esc(fmtDate(p.last_play))+'</strong></div>'+ 
          '</div>'+ 
          '<div class="public-actions"><a href="ranking.html">Ranking</a><a href="konto.html">Moje konto</a></div>'+ 
        '</div>';
    }catch(e){
      box.innerHTML='<div class="public-profile-empty">Nie udało się pobrać profilu.</div>';
    }
  }

  function boot(){
    injectStyle();
    initClient();
    removeLegacyKamratUi();
    var path=location.pathname||"";
    if(path.indexOf("konto")!==-1){
      ensurePublicProfileSettings();
      var tries=0;
      var timer=setInterval(function(){
        tries++;
        ensurePublicProfileSettings();
        if(document.getElementById("kontoPublicProfileFoldout")||tries>20)clearInterval(timer);
      },350);
    }
    if(path.indexOf("ranking")!==-1)enhanceRanking();
    if(path.indexOf("gracz")!==-1)renderPublicProfilePage();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();

  console.info("Szpilplac public-profile bridge "+VERSION+"; Kamraty retired");
})();
