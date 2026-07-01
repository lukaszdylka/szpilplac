/*
  Szpilplac Avatar Select v32
  ---------------------------
  Wybór avatara przez gracza z tabeli public.szpilplac_avatars.
*/

(function(){
  "use strict";

  var VERSION="v32";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var avatars=[];

  function css(){
    if(document.getElementById("szpAvatarStyle"))return;
    var s=document.createElement("style");
    s.id="szpAvatarStyle";
    s.textContent=`
      .szp-avatar-card{margin-top:14px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);border-radius:14px;padding:14px}
      .szp-avatar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
      .szp-avatar-title{font-family:Oswald,system-ui,sans-serif;font-size:18px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink,#23201a)}
      .szp-avatar-current{display:flex;align-items:center;gap:9px;color:var(--ink2,#6a6150);font-size:12px;font-weight:800}
      .szp-avatar-current .szp-avatar-svg{width:40px;height:40px}
      .szp-avatar-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .szp-avatar-option{border:1px solid var(--line,#c9bfa6);border-radius:13px;background:var(--surface,#fbf7ee);padding:9px 7px;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:88px;color:var(--ink,#23201a)}
      .szp-avatar-option:hover{filter:brightness(1.03)}
      .szp-avatar-option.on{border-color:var(--gold,#bf8a3a);box-shadow:0 0 0 2px rgba(191,138,58,.2);background:var(--surface,#fbf7ee)}
      .szp-avatar-svg{width:44px;height:44px;border-radius:999px;overflow:hidden;display:grid;place-items:center}
      .szp-avatar-svg svg{width:100%;height:100%;display:block}
      .szp-avatar-option span{font-size:10.5px;font-weight:900;color:var(--ink2,#6a6150);text-transform:uppercase;letter-spacing:.03em;text-align:center}
      .szp-avatar-msg{margin-top:9px;font-size:12px;color:var(--ink2,#6a6150);line-height:1.4}
      .szp-avatar-msg.ok{color:var(--ok,#3f8a5a)}
      .szp-avatar-msg.err{color:var(--danger,#b5482f)}
      @media(max-width:420px){.szp-avatar-grid{grid-template-columns:repeat(3,1fr)}.szp-avatar-option{min-height:82px}.szp-avatar-svg{width:38px;height:38px}}
    `;
    document.head.appendChild(s);
  }

  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}

  function cleanSvg(svg){
    svg=String(svg||"");
    svg=svg.replace(/<script[\s\S]*?<\/script>/gi,"");
    svg=svg.replace(/\son\w+="[^"]*"/gi,"");
    svg=svg.replace(/\son\w+='[^']*'/gi,"");
    svg=svg.replace(/javascript:/gi,"");
    return svg;
  }

  function shell(){
    css();
    if(document.getElementById("szpAvatarCard"))return;
    var card=document.createElement("section");
    card.id="szpAvatarCard";
    card.className="szp-avatar-card";
    card.innerHTML=
      '<div class="szp-avatar-head">'+
        '<div class="szp-avatar-title">Avatar gracza</div>'+
        '<div class="szp-avatar-current" id="szpAvatarCurrent"></div>'+
      '</div>'+
      '<div class="szp-avatar-grid" id="szpAvatarGrid"></div>'+
      '<div class="szp-avatar-msg" id="szpAvatarMsg">Wybierz avatar z gotowej listy.</div>';
    var host=document.getElementById("profileCard")||document.querySelector("main")||document.body;
    host.appendChild(card);
  }

  function setMsg(t,type){
    var el=document.getElementById("szpAvatarMsg");
    if(!el)return;
    el.textContent=t||"";
    el.className="szp-avatar-msg"+(type?(" "+type):"");
  }

  function getAvatar(id){
    return avatars.find(function(a){return a.id===id;}) || avatars[0] || {id:"familok",label:"Familok",svg:""};
  }

  function loadScript(src,testFn){
    if(typeof testFn==="function"&&testFn())return Promise.resolve();
    return new Promise(function(resolve,reject){
      var existing=[].slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(src.split("?")[0])!==-1;});
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

  async function client(){
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var cfg=window.SZPILPLAC_CONFIG||{};
    var url=cfg.SUPABASE_URL||window.SUPABASE_URL;
    var key=cfg.SUPABASE_ANON_KEY||window.SUPABASE_ANON_KEY;
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

  async function loadAvatars(){
    var c=await client();
    var r=await c.from("szpilplac_avatars")
      .select("id,label,svg,sort_order,is_active")
      .eq("is_active",true)
      .order("sort_order",{ascending:true})
      .order("label",{ascending:true});

    if(r.error)throw r.error;
    avatars=(r.data||[]).map(function(a){a.svg=cleanSvg(a.svg);return a;});
  }

  function render(activeId){
    var grid=document.getElementById("szpAvatarGrid");
    var cur=document.getElementById("szpAvatarCurrent");
    if(!grid||!cur)return;

    if(!avatars.length){
      grid.innerHTML='<div class="szp-avatar-msg err">Brak aktywnych avatarów.</div>';
      cur.innerHTML="";
      return;
    }

    var active=getAvatar(activeId);
    cur.innerHTML='<div class="szp-avatar-svg">'+cleanSvg(active.svg)+'</div><span>'+esc(active.label)+'</span>';

    grid.innerHTML=avatars.map(function(a){
      return '<button class="szp-avatar-option '+(a.id===active.id?'on':'')+'" type="button" data-avatar="'+esc(a.id)+'">'+
        '<div class="szp-avatar-svg">'+cleanSvg(a.svg)+'</div>'+
        '<span>'+esc(a.label)+'</span>'+
      '</button>';
    }).join("");

    grid.querySelectorAll("[data-avatar]").forEach(function(btn){
      btn.addEventListener("click",function(){save(btn.getAttribute("data-avatar"));});
    });
  }

  async function load(){
    shell();

    var s=await session();
    if(!s||!s.user){
      setMsg("Zaloguj się, żeby wybrać avatar.","err");
      return;
    }

    await loadAvatars();

    var c=await client();
    var p=await c.from("profiles").select("avatar_key").eq("id",s.user.id).single();
    if(p.error){
      setMsg("Nie udało się odczytać avatara.","err");
      render("familok");
      return;
    }

    render((p.data&&p.data.avatar_key)||"familok");
  }

  async function save(id){
    var a=getAvatar(id);
    setMsg("Zapisuję avatar...","");

    var s=await session();
    if(!s||!s.user){setMsg("Zaloguj się, żeby zapisać avatar.","err");return;}

    var c=await client();
    var r=await c.from("profiles").update({avatar_key:a.id}).eq("id",s.user.id);
    if(r.error){
      console.warn("Avatar save error:",r.error);
      setMsg("Nie udało się zapisać avatara.","err");
      return;
    }

    render(a.id);
    setMsg("Avatar zapisany.","ok");
  }

  function boot(){
    console.info("Szpilplac avatar-select.js "+VERSION);
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(document.getElementById("profileCard")||document.querySelector("main")){
        clearInterval(timer);
        load().catch(function(e){
          console.warn("Avatar select error:",e);
          shell();
          setMsg("Nie udało się załadować avatarów. Sprawdź SQL v32.","err");
        });
      }
      if(tries>80)clearInterval(timer);
    },120);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
