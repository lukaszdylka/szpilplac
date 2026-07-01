/*
  Szpilplac Avatar Select v35
  ---------------------------
  Czysty avatar obok nazwy gracza:
  - sam obrazek w kółku
  - pod spodem Ustaw / Zmień
  - neutralny szary placeholder, gdy avatar nie jest ustawiony
*/

(function(){
  "use strict";

  var VERSION="v35";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;
  var avatars=[];
  var currentAvatarId=null;

  var PLACEHOLDER_SVG =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Brak avatara">'+
      '<defs>'+
        '<linearGradient id="szp-ph-g" x1="0" y1="0" x2="1" y2="1">'+
          '<stop offset="0" stop-color="#d8d2c2"/>'+
          '<stop offset="1" stop-color="#8f8878"/>'+
        '</linearGradient>'+
      '</defs>'+
      '<circle cx="50" cy="50" r="50" fill="url(#szp-ph-g)"/>'+
      '<circle cx="50" cy="50" r="43" fill="none" stroke="#f3ecda" stroke-width="4" opacity=".78"/>'+
      '<circle cx="50" cy="38" r="16" fill="#f3ecda" opacity=".86"/>'+
      '<path d="M22 91q6-28 28-28t28 28" fill="#f3ecda" opacity=".86"/>'+
      '<path d="M25 78q25-12 50 0" fill="none" stroke="#6a6150" stroke-width="2" opacity=".22"/>'+
    '</svg>';

  function css(){
    if(document.getElementById("szpAvatarStyle"))return;
    var s=document.createElement("style");
    s.id="szpAvatarStyle";
    s.textContent=`
      .szp-profile-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 10px}
      .szp-profile-titlebox{min-width:0;flex:1}
      .szp-profile-titlebox .hello{margin-bottom:6px}
      .szp-profile-titlebox .intro{margin-bottom:0}
      .szp-avatar-card{flex:0 0 auto;margin:0;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:78px}
      .szp-avatar-current{width:68px;height:68px;border-radius:999px;overflow:hidden;display:grid;place-items:center;background:var(--surface2,#f3ecda);border:2px solid var(--line,#c9bfa6);box-shadow:0 8px 20px -16px rgba(0,0,0,.65)}
      .szp-avatar-current.has-avatar{border-color:var(--gold,#bf8a3a)}
      .szp-avatar-current svg{width:100%;height:100%;display:block}
      .szp-avatar-change{border:1px solid var(--line,#c9bfa6);border-radius:999px;background:var(--surface2,#f3ecda);color:var(--ink,#23201a);font:inherit;font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px;cursor:pointer;white-space:nowrap;min-width:62px;text-align:center}
      .szp-avatar-change:hover{filter:brightness(1.04)}
      .szp-avatar-msg{display:none;font-size:10.5px;line-height:1.2;text-align:center;max-width:80px}
      .szp-avatar-msg.ok,.szp-avatar-msg.err{display:block}
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
      .szp-avatar-option-img{width:54px;height:54px;border-radius:999px;overflow:hidden;display:grid;place-items:center;border:1px solid var(--line,#c9bfa6);background:var(--surface,#fbf7ee)}
      .szp-avatar-option-img svg{width:100%;height:100%;display:block}
      .szp-avatar-option span{font-size:10.5px;font-weight:900;color:var(--ink2,#6a6150);text-transform:uppercase;letter-spacing:.03em;text-align:center;line-height:1.15}
      @media(max-width:520px){
        .szp-profile-head{align-items:flex-start;gap:10px}
        .szp-avatar-card{min-width:68px}
        .szp-avatar-current{width:58px;height:58px}
        .szp-avatar-change{font-size:9.8px;padding:5px 8px;min-width:56px}
        .szp-avatar-list{grid-template-columns:repeat(3,minmax(0,1fr))}
        .szp-avatar-sheet{border-radius:18px;padding:13px}
        .szp-avatar-option{min-height:90px}
        .szp-avatar-option-img{width:48px;height:48px}
      }
      @media(max-width:370px){
        .szp-profile-head{gap:8px}
        .szp-avatar-current{width:52px;height:52px}
        .szp-avatar-change{font-size:9px;min-width:52px}
        .szp-avatar-list{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
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
    if(!id)return null;
    return avatars.find(function(a){return a.id===id;}) || null;
  }

  function hasSelectedAvatar(){
    return !!getAvatar(currentAvatarId);
  }

  function setMsg(t,type){
    var el=document.getElementById("szpAvatarMsg");
    if(!el)return;
    el.textContent=t||"";
    el.className="szp-avatar-msg"+(type?(" "+type):"");
    if(!type && !t)el.className="szp-avatar-msg";
  }

  function ensureProfileHeader(){
    var profile=document.getElementById("profileCard")||document.querySelector("main")||document.body;
    var hello=document.getElementById("helloTitle");
    var intro=document.getElementById("profileIntro");

    var head=document.getElementById("szpProfileHead");
    if(!head){
      head=document.createElement("div");
      head.id="szpProfileHead";
      head.className="szp-profile-head";

      var left=document.createElement("div");
      left.className="szp-profile-titlebox";
      left.id="szpProfileTitlebox";

      if(hello && hello.parentNode){
        hello.parentNode.insertBefore(head, hello);
        left.appendChild(hello);
        if(intro)left.appendChild(intro);
      }else{
        profile.insertBefore(head, profile.firstChild);
      }
      head.appendChild(left);
    }

    return head;
  }

  function ensureShell(){
    css();

    if(!document.getElementById("szpAvatarCard")){
      var card=document.createElement("section");
      card.id="szpAvatarCard";
      card.className="szp-avatar-card";
      card.innerHTML=
        '<button class="szp-avatar-current" id="szpAvatarCurrent" type="button" aria-label="Ustaw avatar"></button>'+
        '<button class="szp-avatar-change" id="szpAvatarOpen" type="button">Ustaw</button>'+
        '<div class="szp-avatar-msg" id="szpAvatarMsg"></div>';

      var head=ensureProfileHeader();
      head.appendChild(card);
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

    var open=document.getElementById("szpAvatarOpen");
    var current=document.getElementById("szpAvatarCurrent");
    var close=document.getElementById("szpAvatarClose");
    var modalEl=document.getElementById("szpAvatarModal");

    if(open)open.onclick=openModal;
    if(current)current.onclick=openModal;
    if(close)close.onclick=closeModal;
    if(modalEl && !modalEl.dataset.bound){
      modalEl.dataset.bound="1";
      modalEl.addEventListener("click",function(e){
        if(e.target && e.target.id==="szpAvatarModal")closeModal();
      });
      document.addEventListener("keydown",function(e){
        if(e.key==="Escape")closeModal();
      });
    }
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
    currentAvatarId=id || null;

    var current=document.getElementById("szpAvatarCurrent");
    var btn=document.getElementById("szpAvatarOpen");
    var avatar=getAvatar(currentAvatarId);

    if(!current || !btn)return;

    if(avatar){
      current.innerHTML=cleanSvg(avatar.svg);
      current.classList.add("has-avatar");
      current.setAttribute("aria-label","Zmień avatar");
      btn.textContent="Zmień";
    }else{
      current.innerHTML=PLACEHOLDER_SVG;
      current.classList.remove("has-avatar");
      current.setAttribute("aria-label","Ustaw avatar");
      btn.textContent="Ustaw";
    }
  }

  function renderList(){
    var list=document.getElementById("szpAvatarList");
    if(!list)return;

    list.innerHTML=avatars.map(function(a){
      return '<button class="szp-avatar-option '+(a.id===currentAvatarId?'on':'')+'" type="button" data-avatar="'+esc(a.id)+'">'+
        '<div class="szp-avatar-option-img">'+cleanSvg(a.svg)+'</div>'+
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
    if(!avatars.length){setMsg("Brak avatarów.","err");return;}
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
      renderCurrent(null);
      setMsg("Zaloguj się.","err");
      return;
    }

    await loadAvatars();

    var c=await client();
    var p=await c.from("profiles").select("avatar_key").eq("id",s.user.id).single();
    if(p.error){
      renderCurrent(null);
      setMsg("Błąd avatara.","err");
      return;
    }

    var key=(p.data&&p.data.avatar_key)||null;
    if(!getAvatar(key))key=null;

    renderCurrent(key);
    setMsg("");
  }

  async function save(id){
    var avatar=getAvatar(id);
    if(!avatar)return;

    setMsg("Zapisuję...","");

    var s=await session();
    if(!s||!s.user){setMsg("Zaloguj się.","err");return;}

    var c=await client();
    var r=await c.from("profiles").update({avatar_key:avatar.id}).eq("id",s.user.id);
    if(r.error){
      console.warn("Avatar save error:",r.error);
      setMsg("Nie zapisano.","err");
      return;
    }

    renderCurrent(avatar.id);
    renderList();
    closeModal();
    setMsg("Zapisano.","ok");
    setTimeout(function(){setMsg("");},1500);
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
          renderCurrent(null);
          setMsg("Błąd avatarów.","err");
        });
      }
      if(tries>80)clearInterval(timer);
    },120);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
