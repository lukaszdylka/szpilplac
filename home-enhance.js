/* Szpilplac home enhancements */
(function(){
  "use strict";

  var VERSION=window.SZP_BUILD_ID||"2026.09.11.2";
  var AUTH_KEY="szpilplac-auth-v05";
  var sb=null;
  var refreshBusy=false;
  var lastProfile=null;
  var lastPoints=0;

  function lang(){
    try{return localStorage.getItem("familock_lang")==="szl"?"szl":"pl";}
    catch(e){return "pl";}
  }
  function labels(){
    return lang()==="szl"?{
      login:"Zaloguj / zaregistruj",
      account:"Twoje konto",
      daily:"Kożdy dziyń",
      dailyDone:"Zagrane dzisioj",
      weekly:"Szpilej w tym tydniu",
      weeklyDone:"Zagrane w tym tydniu",
      points:"pkt",
      pointclick:"Gra point & click ↗"
    }:{
      login:"Zaloguj / zarejestruj",
      account:"Twoje konto",
      daily:"Codziennie",
      dailyDone:"Zagrane dzisiaj",
      weekly:"Zagraj w tym tygodniu",
      weeklyDone:"Zagrane w tym tygodniu",
      points:"pkt",
      pointclick:"Gra point & click ↗"
    };
  }

  function addStyle(){
    if(document.getElementById("szp-home-enhance-style"))return;
    var st=document.createElement("style");
    st.id="szp-home-enhance-style";
    st.textContent=
      '.quick a.szp-home-account{justify-content:flex-start;text-align:left;gap:8px;min-width:0;padding:7px 9px}'+
      '.szp-home-avatar{width:30px;height:30px;flex:0 0 30px;display:grid;place-items:center;border:1px solid var(--line,#c9bfa6);border-radius:10px;background:var(--surface,#fbf7ee);overflow:hidden;color:var(--green,#2f4a39)}'+
      '.szp-home-avatar svg{display:block;width:100%;height:100%;max-width:30px;max-height:30px}'+
      '.szp-home-account-copy{min-width:0;display:block;line-height:1.1}'+
      '.szp-home-account-copy b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink,#23201a);font-size:11px}'+
      '.szp-home-account-copy small{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink2,#6a6150);font-size:9.5px;font-weight:800}'+
      '.familock-link.pointclick{border-color:var(--gold,#bf8a3a);color:var(--gold,#bf8a3a);background:var(--surface,#fbf7ee)}';
    document.head.appendChild(st);
  }

  function loadScript(id,src,test){
    if(typeof test==="function"&&test())return Promise.resolve();
    var old=document.getElementById(id);
    if(old){
      return new Promise(function(resolve){
        if(typeof test!=="function"||test()){resolve();return;}
        old.addEventListener("load",resolve,{once:true});
        setTimeout(resolve,1800);
      });
    }
    return new Promise(function(resolve){
      var s=document.createElement("script");
      s.id=id;s.src=src;s.async=false;s.onload=resolve;s.onerror=resolve;
      document.head.appendChild(s);
    });
  }

  function storedSession(){
    try{
      var raw=localStorage.getItem(AUTH_KEY);
      if(!raw)return null;
      var data=JSON.parse(raw);
      var s=data.currentSession||data.session||data;
      if(!s||!s.user||!s.access_token)return null;
      var expires=Number(s.expires_at||0);
      if(expires&&expires*1000<=Date.now())return null;
      return s;
    }catch(e){return null;}
  }

  function safeSvg(raw){
    if(!raw)return "";
    try{
      var tpl=document.createElement("template");
      tpl.innerHTML=String(raw).trim();
      var svg=tpl.content.querySelector("svg");
      if(!svg)return "";
      svg.querySelectorAll("script,foreignObject,iframe,object,embed").forEach(function(el){el.remove();});
      svg.querySelectorAll("*").forEach(function(el){
        Array.prototype.slice.call(el.attributes||[]).forEach(function(a){
          var n=String(a.name||"").toLowerCase(),v=String(a.value||"").trim().toLowerCase();
          if(n.indexOf("on")===0||((n==="href"||n==="xlink:href")&&v.indexOf("javascript:")===0))el.removeAttribute(a.name);
        });
      });
      svg.setAttribute("aria-hidden","true");
      return svg.outerHTML;
    }catch(e){return "";}
  }

  function defaultAvatar(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c1-5 3.3-7.5 7-7.5S18 16 19 21"/></svg>';
  }

  function renderGuest(){
    var p=labels(),a=document.getElementById("quickAccount");
    if(!a)return;
    a.classList.remove("szp-home-account");
    a.textContent=p.login;
    a.href="konto.html";
    a.setAttribute("aria-label",p.login);
    var top=document.getElementById("accountTopLink");
    if(top){top.title=p.login;top.setAttribute("aria-label",p.login);}
  }

  function renderAccount(profile,points,avatarSvg){
    var p=labels(),a=document.getElementById("quickAccount");
    if(!a)return;
    var login=(profile&&(profile.login||profile.display_name))||p.account;
    var rank=(profile&&profile.rank_name)||"Gorol";
    a.classList.add("szp-home-account");
    a.href="konto.html";
    a.innerHTML='<span class="szp-home-avatar">'+(avatarSvg||defaultAvatar())+'</span><span class="szp-home-account-copy"><b></b><small></small></span>';
    a.querySelector("b").textContent=login;
    a.querySelector("small").textContent=rank+" · "+Number(points||0)+" "+p.points;
    a.setAttribute("aria-label",p.account+": "+login);
    var top=document.getElementById("accountTopLink");
    if(top){top.title=login;top.setAttribute("aria-label",p.account+": "+login);}
  }

  function setBadge(id,done,weekly){
    var el=document.getElementById(id),p=labels();
    if(!el)return;
    el.textContent=weekly?(done?p.weeklyDone:p.weekly):(done?p.dailyDone:p.daily);
    el.className="badge "+(done?"done":(weekly?"live":""));
  }

  function renderPlayed(){
    if(!window.SZP_GAME_PLAYED)return;
    var slow=false,klodka=false,raja=false;
    try{slow=window.SZP_GAME_PLAYED.isPlayed("slowko","daily");}catch(e){}
    try{klodka=window.SZP_GAME_PLAYED.isPlayed("klodka","daily");}catch(e){}
    try{raja=window.SZP_GAME_PLAYED.isPlayed("zorta","weekly");}catch(e){}
    setBadge("slowkoBadge",slow,false);
    setBadge("klodkaBadge",klodka,false);
    setBadge("rajaBadge",raja,true);
  }

  function normalizeGame(value){
    var g=String(value||"").toLowerCase();
    return g==="raja"?"zorta":g;
  }

  function markCurrentAccountRows(rows){
    if(!window.SZP_GAME_PLAYED||!window.SZP_DAILY)return;
    (rows||[]).forEach(function(row){
      var g=normalizeGame(row.game),mode=String(row.mode||"").toLowerCase();
      var info=window.SZP_DAILY.gameInfo(g);
      if(!info||!info.started||Number(row.puzzle_no)!==Number(info.puzzle_no))return;
      if(g==="zorta"){
        if(mode!=="weekly")return;
        window.SZP_GAME_PLAYED.markAccountPlayed(g,"weekly",info.puzzle_no);
        return;
      }
      if((g==="slowko"||g==="klodka")&&(mode==="daily"||!mode)){
        window.SZP_GAME_PLAYED.markAccountPlayed(g,"daily",info.puzzle_no);
      }
    });
  }

  async function getClient(session){
    if(sb)return sb;
    await loadScript("szp-home-config","/config.js?v="+encodeURIComponent(VERSION),function(){return !!window.SZPILPLAC_CONFIG;});
    await loadScript("szp-home-supabase","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var cfg=window.SZPILPLAC_CONFIG||{};
    if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return null;
    sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{storageKey:AUTH_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    if(session&&session.access_token&&session.refresh_token){
      try{await sb.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});}catch(e){}
    }
    return sb;
  }

  async function loadAccount(){
    var session=storedSession();
    if(!session){lastProfile=null;lastPoints=0;renderGuest();return;}
    var c=await getClient(session);
    if(!c){renderAccount(null,0,"");return;}
    try{
      var sr=await c.auth.getSession();
      if(sr&&sr.data&&sr.data.session)session=sr.data.session;
    }catch(e){}
    if(!session||!session.user){renderGuest();return;}

    var profile=null,rows=[],avatar="";
    try{
      var pr=await c.from("profiles").select("login,display_name,rank_name,avatar_key").eq("id",session.user.id).maybeSingle();
      if(!pr.error&&pr.data)profile=pr.data;
    }catch(e){}
    try{
      var rr=await c.from("user_game_results").select("game,mode,puzzle_no,score,won,finished_at").eq("user_id",session.user.id);
      if(!rr.error&&Array.isArray(rr.data))rows=rr.data;
    }catch(e){}
    var points=rows.reduce(function(sum,row){return sum+(Number(row.score)||0);},0);
    markCurrentAccountRows(rows);
    if(profile&&profile.avatar_key){
      try{
        var ar=await c.from("szpilplac_avatars").select("svg").eq("id",profile.avatar_key).eq("is_active",true).maybeSingle();
        if(!ar.error&&ar.data)avatar=safeSvg(ar.data.svg);
      }catch(e){}
    }
    lastProfile=profile;lastPoints=points;
    renderAccount(profile,points,avatar);
    renderPlayed();
  }

  function labelPointClick(){
    var a=document.querySelector('a[href*="gra.familock.pl"]');
    if(!a)return;
    a.classList.add("pointclick");
    a.textContent=labels().pointclick;
    a.setAttribute("aria-label",labels().pointclick.replace(" ↗",""));
  }

  async function refresh(){
    if(refreshBusy)return;
    refreshBusy=true;
    addStyle();
    await loadScript("szp-home-daily-status","/daily-status.js?v="+encodeURIComponent(VERSION),function(){return !!window.SZP_DAILY;});
    await loadScript("szp-home-game-played","/game-played.js?v="+encodeURIComponent(VERSION),function(){return !!window.SZP_GAME_PLAYED;});
    renderPlayed();
    labelPointClick();
    await loadAccount();
    renderPlayed();
    labelPointClick();
    refreshBusy=false;
  }

  function relabel(){
    labelPointClick();
    renderPlayed();
    if(lastProfile)renderAccount(lastProfile,lastPoints,document.querySelector(".szp-home-avatar svg")?document.querySelector(".szp-home-avatar").innerHTML:"");
    else if(!storedSession())renderGuest();
  }

  document.addEventListener("click",function(e){
    var t=e&&e.target;
    if(t&&(t.id==="langPl"||t.id==="langSzl"))setTimeout(refresh,30);
  },true);

  document.addEventListener("szp:game-played",function(){setTimeout(renderPlayed,0);});
  window.addEventListener("pageshow",refresh);
  window.addEventListener("focus",refresh);
  window.addEventListener("storage",function(e){
    if(!e||e.key===AUTH_KEY||String(e.key||"").indexOf("slowko")===0||String(e.key||"").indexOf("klodka")===0||String(e.key||"").indexOf("raja_weekly")===0)refresh();
    if(e&&e.key==="familock_lang")setTimeout(relabel,0);
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh,{once:true});else refresh();
  window.SZP_HOME_ENHANCE={version:VERSION,refresh:refresh,renderPlayed:renderPlayed};
  console.info("Szpilplac home-enhance.js "+VERSION);
})();
