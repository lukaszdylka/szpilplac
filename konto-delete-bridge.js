/*
  Szpilplac Delete Account Bridge v38
  -----------------------------------
  Zamienia link mailowy usunięcia konta w samodzielne usuwanie konta przez profil gracza.
*/

(function(){
  "use strict";

  var VERSION = "v38";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var sb = null;
  var bound = false;

  function css(){
    if(document.getElementById("szpDeleteAccountStyle"))return;

    var style = document.createElement("style");
    style.id = "szpDeleteAccountStyle";
    style.textContent = `
      .szp-delete-modal{
        position:fixed;
        inset:0;
        z-index:10000;
        display:none;
        align-items:flex-end;
        justify-content:center;
        background:rgba(0,0,0,.48);
        padding:18px;
      }

      .szp-delete-modal.on{
        display:flex;
      }

      .szp-delete-box{
        width:min(520px,100%);
        background:var(--surface,#fbf7ee);
        border:1px solid var(--line,#c9bfa6);
        border-radius:20px;
        box-shadow:0 28px 80px -38px rgba(0,0,0,.85);
        padding:18px;
        color:var(--ink,#23201a);
      }

      .szp-delete-title{
        font-family:Oswald,system-ui,sans-serif;
        text-transform:uppercase;
        font-size:26px;
        line-height:1;
        margin:0 0 8px;
      }

      .szp-delete-text{
        font-size:13px;
        color:var(--ink2,#6a6150);
        line-height:1.5;
        margin:0 0 12px;
      }

      .szp-delete-warning{
        border:1px solid var(--danger,#b5482f);
        background:rgba(181,72,47,.1);
        color:var(--danger,#b5482f);
        border-radius:13px;
        padding:11px 12px;
        font-size:12.5px;
        line-height:1.45;
        font-weight:800;
        margin:12px 0;
      }

      .szp-delete-field{
        display:grid;
        gap:7px;
        margin:12px 0;
      }

      .szp-delete-field label{
        font-size:11px;
        font-weight:900;
        text-transform:uppercase;
        letter-spacing:.05em;
        color:var(--ink2,#6a6150);
      }

      .szp-delete-field input{
        width:100%;
        border:1px solid var(--line,#c9bfa6);
        border-radius:12px;
        background:#e8eef9;
        color:#000;
        font:inherit;
        font-size:15px;
        padding:12px;
        outline:none;
      }

      .szp-delete-actions{
        display:flex;
        gap:8px;
        justify-content:flex-end;
        flex-wrap:wrap;
        margin-top:14px;
      }

      .szp-delete-btn{
        border-radius:12px;
        padding:11px 14px;
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface2,#f3ecda);
        color:var(--ink,#23201a);
        font:inherit;
        font-size:13px;
        font-weight:900;
        cursor:pointer;
      }

      .szp-delete-btn.danger{
        background:var(--danger,#b5482f);
        border-color:var(--danger,#b5482f);
        color:#fff;
      }

      .szp-delete-btn:disabled{
        opacity:.5;
        cursor:not-allowed;
      }

      .szp-delete-msg{
        min-height:18px;
        font-size:12.5px;
        color:var(--ink2,#6a6150);
        line-height:1.4;
        margin-top:8px;
        white-space:pre-wrap;
      }

      .szp-delete-msg.err{
        color:var(--danger,#b5482f);
        font-weight:800;
      }

      .szp-delete-msg.ok{
        color:var(--ok,#3f8a5a);
        font-weight:800;
      }

      @media(max-width:520px){
        .szp-delete-box{
          border-radius:18px;
          padding:16px;
        }

        .szp-delete-actions{
          display:grid;
          grid-template-columns:1fr;
        }

        .szp-delete-btn{
          width:100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function client(){
    if(sb)return sb;

    var cfg = window.SZPILPLAC_CONFIG || {};
    if(!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
      throw new Error("Brak konfiguracji Supabase.");
    }

    if(window.__SZPILPLAC_SUPABASE_CLIENT){
      sb = window.__SZPILPLAC_SUPABASE_CLIENT;
      return sb;
    }

    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth:{
        storageKey:AUTH_STORAGE_KEY,
        detectSessionInUrl:false,
        persistSession:true,
        autoRefreshToken:true
      }
    });

    window.__SZPILPLAC_SUPABASE_CLIENT = sb;
    return sb;
  }

  function ensureModal(){
    css();

    var modal = document.getElementById("szpDeleteAccountModal");
    if(modal)return modal;

    modal = document.createElement("div");
    modal.id = "szpDeleteAccountModal";
    modal.className = "szp-delete-modal";
    modal.innerHTML =
      '<div class="szp-delete-box" role="dialog" aria-modal="true" aria-labelledby="szpDeleteTitle">'+
        '<h2 class="szp-delete-title" id="szpDeleteTitle">Usuń konto</h2>'+
        '<p class="szp-delete-text">To działanie usuwa konto gracza ze Szpilplaca.</p>'+
        '<div class="szp-delete-warning">Usunięte zostaną: profil, wyniki zapisane na koncie, historia wyników i zgody przypisane do konta. Tego nie można cofnąć.</div>'+
        '<div class="szp-delete-field">'+
          '<label for="szpDeleteConfirm">Wpisz USUN, żeby potwierdzić</label>'+
          '<input id="szpDeleteConfirm" type="text" autocomplete="off" inputmode="latin" placeholder="USUN">'+
        '</div>'+
        '<div class="szp-delete-msg" id="szpDeleteMsg"></div>'+
        '<div class="szp-delete-actions">'+
          '<button class="szp-delete-btn" id="szpDeleteCancel" type="button">Anuluj</button>'+
          '<button class="szp-delete-btn danger" id="szpDeleteDo" type="button" disabled>Usuń konto</button>'+
        '</div>'+
      '</div>';

    document.body.appendChild(modal);

    var input = document.getElementById("szpDeleteConfirm");
    var cancel = document.getElementById("szpDeleteCancel");
    var del = document.getElementById("szpDeleteDo");

    input.addEventListener("input", function(){
      var val = input.value.trim().toUpperCase();
      del.disabled = !(val === "USUN" || val === "USUŃ" || val === "USUN KONTO" || val === "USUŃ KONTO");
    });

    cancel.addEventListener("click", closeModal);
    del.addEventListener("click", deleteAccount);

    modal.addEventListener("click", function(e){
      if(e.target && e.target.id === "szpDeleteAccountModal")closeModal();
    });

    document.addEventListener("keydown", function(e){
      if(e.key === "Escape")closeModal();
    });

    return modal;
  }

  function setMsg(text, type){
    var msg = document.getElementById("szpDeleteMsg");
    if(!msg)return;
    msg.textContent = text || "";
    msg.className = "szp-delete-msg" + (type ? " " + type : "");
  }

  function openModal(){
    var modal = ensureModal();
    var input = document.getElementById("szpDeleteConfirm");
    var del = document.getElementById("szpDeleteDo");

    setMsg("");
    if(input)input.value = "";
    if(del)del.disabled = true;

    modal.classList.add("on");
    setTimeout(function(){
      if(input)input.focus();
    }, 60);
  }

  function closeModal(){
    var modal = document.getElementById("szpDeleteAccountModal");
    if(modal)modal.classList.remove("on");
  }

  async function deleteAccount(){
    var input = document.getElementById("szpDeleteConfirm");
    var del = document.getElementById("szpDeleteDo");
    var confirm = input ? input.value.trim() : "";

    if(del)del.disabled = true;
    setMsg("Usuwam konto...", "");

    try{
      var c = client();

      var session = await c.auth.getSession();
      if(!session || !session.data || !session.data.session){
        throw new Error("Nie jesteś zalogowany.");
      }

      var res = await c.rpc("szpilplac_delete_my_account", {
        p_confirm: confirm
      });

      if(res.error)throw res.error;

      setMsg("Konto zostało usunięte. Za chwilę wrócisz na Szpilplac.", "ok");

      try{ await c.auth.signOut({ scope:"local" }); }catch(e){}
      try{ localStorage.removeItem(AUTH_STORAGE_KEY); }catch(e){}

      setTimeout(function(){
        window.location.href = "index.html?konto=usuniete";
      }, 1300);

    }catch(err){
      console.warn("Delete account error:", err);
      var text = err && err.message ? err.message : "Nie udało się usunąć konta.";
      if(text.indexOf("administrator") !== -1 || text.indexOf("admin") !== -1){
        text = "Konto administratora nie może zostać usunięte z panelu gracza.";
      }
      setMsg(text, "err");
      if(del)del.disabled = false;
    }
  }

  function bind(){
    if(bound)return;

    var profile = document.getElementById("profileCard");
    if(!profile)return;

    var old = document.getElementById("deleteRequestBtn");
    var target = old;

    if(!target){
      var actions = profile.querySelector(".profile-actions");
      if(actions){
        target = document.createElement("button");
        target.id = "deleteRequestBtn";
        target.type = "button";
        target.className = "btn danger";
        target.textContent = "Usuń konto";
        actions.appendChild(target);
      }
    }

    if(!target)return;

    if(target.tagName && target.tagName.toLowerCase() === "a"){
      target.removeAttribute("href");
      target.removeAttribute("target");
      target.removeAttribute("rel");
      target.setAttribute("role", "button");
    }

    target.textContent = "Usuń konto";
    target.classList.remove("secondary");
    target.classList.add("danger");
    target.addEventListener("click", function(e){
      e.preventDefault();
      openModal();
    });

    bound = true;
  }

  function boot(){
    console.info("Szpilplac konto-delete-bridge.js " + VERSION);
    css();

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      bind();
      if(bound || tries > 80)clearInterval(timer);
    }, 150);

    var obs = new MutationObserver(function(){
      if(!bound)bind();
    });

    obs.observe(document.body, {
      childList:true,
      subtree:true
    });
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
