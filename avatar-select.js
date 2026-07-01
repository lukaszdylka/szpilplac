/*
  Szpilplac Avatar Select v33
  ---------------------------
  Kompaktowy wybór avatara w panelu gracza:
  aktualny avatar + przycisk "Zmień" + modal wyboru.
*/

(function(){
  "use strict";

  var VERSION="v33";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var avatars=[];
  var currentAvatarId="";

  function css(){
    if(document.getElementById("szpAvatarStyle"))return;
    var s=document.createElement("style");
    s.id="szpAvatarStyle";
    s.textContent=`
      .szp-avatar-card{margin-top:14px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);border-radius:14px;padding:12px 13px}
      .szp-avatar-compact{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .szp-avatar-left{display:flex;align-items:center;gap:10px;min-width:0}
      .szp-avatar-svg{width:46px;height:46px;border-radius:999px;overflow:hidden;display:grid;place-items:center;background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);flex:0 0 auto}
      .szp-avatar-svg svg{width:100%;height:100%;display:block}
      .szp-avatar-name{min-width:0}
      .szp-avatar-title{font-family:Oswald,system-ui,sans-serif;font-size:17px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink,#23201a);line-height:1.1}
      .szp-avatar-sub{font-size:12px;color:var(--ink2,#6a6150);font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .szp-avatar-btn{border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);font:inherit;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;padding:9px 12px;cursor:pointer;white-space:nowrap}
      .szp-avatar-btn:hover{filter:brightness(1.04)}
      .szp-avatar-msg{margin-top:8px;font-size:12px;color:var(--ink2,#6a6150);line-height:1.4}
      .szp-avatar-msg.ok{color:var(--ok,#3f8a5a)}
      .szp-avatar-msg.err{color:var(--danger,#b5482f)}
      .szp-avatar-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.42);padding:18px}
      .szp-avatar-modal.on{display:flex}
      .szp-avatar-sheet{width:min(560px,100%);max-height:min(78vh,720px);overflow:auto;background:var(--surface,#fbf7ee);border:1px solid var(--line,#c9bfa6);border-radius:20px;box-shadow:0 28px 80px -38px rgba(0,0,0,.85);padding:15px}
      .szp-avatar-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
      .szp-avatar-modal-title{font-family:Oswald,system-ui,sans-serif;text-transform:uppercase;font-size:23px;line-height:1;color:var(--ink,#23201a)}
      .szp-avatar-modal-note{font-size:12px;color:var(--ink2,#6a6150);font-weight:700;margin-top:4px;line-height:1.35}
      .szp-avatar-close{width:36px;height:36px;border-radius:999px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font-size:20px;line-height:1;cursor:pointer}
      .szp-avatar-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      .szp-avatar-option{border:1px solid var(--line,#c9bfa6);border-radius:14px;background:var(--surface2,#f3ecda);padding:10px 7px;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:96px;color:var(--ink,#23201a);cursor:pointer}
      .szp-avatar-option:hover{filter:brightness(1.03)}
      .szp-avatar-option.on{border-color:var(--gold,#bf8a3a);box-shadow:0 0 0 2px rgba(191,138,58,.22);background:var(--surface,#fbf7ee)}
      .szp-avatar-option .szp-avatar-svg{width:52px;height:52px}
      .szp-avatar-option span{font-size:10.5px;font-weight:900;color:var(--ink2,#6a6150);text-transform:uppercase;letter-spacing:.03em;text-align:center;line-height:1.15}
      @media(max-width:520px){.szp-avatar-list{grid-template-columns:repeat(3,minmax(0,1fr))}.szp-avatar-sheet{border-radius:18px;padding:13px}.szp-avatar-option{min-height:90px}.szp-avatar-option .szp-avatar-svg{width:46px;height:46px}}
      @media(max-width:370px){.szp-avatar-list{grid-template-columns:repeat(2,minmax(0,1fr))}.szp-avatar-compact{align-items:flex-start}.szp-avatar-btn{padding:8px 10px}}
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

  function getAvatar(id){
    return avatars.find(function(a){return a.id===id;}) || avatars[0] || {id:"bajtel",label:"Bajtel",svg:""};
  }

  function setMsg(t,type){
    var el=document.getElementById("szpAvatarMsg");
    if(!el)return;
    el.textContent=t||"";
    el.className="szp-avatar-msg"+(type?(" "+type):"");
  }

  function ensureShell(){
    css();

    if(!document.getElementById("szpAvatarCard")){
      var card=document.createElement("section");
      card.id="szpAvatarCard";
      card.className="szp-avatar-card";
      card.innerHTML=
        '<div class="szp-avatar-compact">'+
          '<div class="szp-avatar-left">'+
            '<div class="szp-avatar-svg" id="szpAvatarCurrentSvg"></div>'+
            '<div class="szp-avatar-name">'+
              '<div class="szp-avatar-title">Avatar</div>'+
              '<div class="szp-avatar-sub" id="szpAvatarCurrentLabel">Ładuję...</div>'+
            '</div>'+
          '</div>'+
          '<button class="szp-avatar-btn" id="szpAvatarOpen" type="button">Zmień</button>'+
        '</div>'+
        '<div class="szp-avatar-msg" id="szpAvatarMsg"></div>';
      var host=document.getElementById("profileCard")||document.querySelector("main")||document.body;
      host.appendChild(card);
    }

    if(!document.getElementById("szpAvatarModal")){
      var modal=document.createElement("div");
      modal.id="szpAvatarModal";
      modal.className="szp-avatar-modal";
      modal.innerHTML=
        '<div class="szp-avatar-sheet" role="dialog" aria-modal="true" aria-labelledby="szpAvatarModalTitle">'+
          '<div class="szp-avatar-modal-head">'+
            '<div>'+
              '<div class="szp-avatar-modal-title" id="szpAvatarModalTitle">Wybierz avatar</div>'+
              '<div class="szp-avatar-modal-note">Avatar możesz zmienić w każdej chwili.</div>'+
            '</div>'+
            '<button class="szp-avatar-close" id="szpAvatarClose" type="button" aria-label="Zamknij">×</button>'+
          '</div>'+
          '<div class="szp-avatar-list" id="szpAvatarList"></div>'+
        '</div>';
      document.body.appendChild(modal);
    }

    document.getElementById("szpAvatarOpen").onclick=openModal;
    document.getElementById("szpAvatarClose").onclick=closeModal;
    document.getElementById("szpAvatarModal").addEventListener("click",function(e){
      if(e.target && e.target.id==="szpAvatarModal")closeModal();
    });
    document.addEventListener("keydown",function(e){
      if(e.key==="Escape")closeModal();
    });
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

  function renderCurrent(id){
    currentAvatarId=id || currentAvatarId;
    var a=getAvatar(currentAvatarId);
    var svg=document.getElementById("szpAvatarCurrentSvg");
    var label=document.getElementById("szpAvatarCurrentLabel");
    if(svg)svg.innerHTML=cleanSvg(a.svg);
    if(label)label.textContent=a.label || "Avatar";
  }

  function renderList(){
    var list=document.getElementById("szpAvatarList");
    if(!list)return;
    list.innerHTML=avatars.map(function(a){
      return '<button class="szp-avatar-option '+(a.id===currentAvatarId?'on':'')+'" type="button" data-avatar="'+esc(a.id)+'">'+
        '<div class="szp-avatar-svg">'+cleanSvg(a.svg)+'</div>'+
        '<span>'+esc(a.label)+'</span>'+
      '</button>';
    }).join("");
    list.querySelectorAll("[data-avatar]").forEach(function(btn){
      btn.addEventListener("click",function(){
        save(btn.getAttribute("data-avatar"));
      });
    });
  }

  function openModal(){
    if(!avatars.length){setMsg("Brak aktywnych avatarów.","err");return;}
    renderList();
    document.getElementById("szpAvatarModal").classList.add("on");
  }

  function closeModal(){
    var m=document.getElementById("szpAvatarModal");
    if(m)m.classList.remove("on");
  }

  async function load(){
    ensureShell();

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
      currentAvatarId=(avatars[0]&&avatars[0].id)||"bajtel";
      renderCurrent(currentAvatarId);
      return;
    }

    currentAvatarId=(p.data&&p.data.avatar_key)||((avatars[0]&&avatars[0].id)||"bajtel");
    renderCurrent(currentAvatarId);
    setMsg("");
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

    currentAvatarId=a.id;
    renderCurrent(a.id);
    renderList();
    closeModal();
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
          ensureShell();
          setMsg("Nie udało się załadować avatarów. Sprawdź SQL v33.","err");
        });
      }
      if(tries>80)clearInterval(timer);
    },120);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
