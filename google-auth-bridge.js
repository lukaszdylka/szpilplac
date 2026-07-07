"use strict";
/*
  Szpilplac v124 — Google login + identity linking
  - Google jako dodatkowa metoda logowania
  - Podłączanie Google do istniejącego konta przez linkIdentity()
  - Nowe konto Google musi dokończyć profil gracza: nick + zgody
  - Nie zmienia profilu istniejącego gracza
*/
(function(){
  var VERSION = "v124";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var LOGIN_RE = /^[A-Za-z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,24}$/;
  var VOIVODESHIPS = [
    "dolnośląskie","kujawsko-pomorskie","lubelskie","lubuskie","łódzkie","małopolskie","mazowieckie","opolskie","podkarpackie","podlaskie","pomorskie","śląskie","świętokrzyskie","warmińsko-mazurskie","wielkopolskie","zachodniopomorskie"
  ];

  function qs(sel,root){return (root||document).querySelector(sel);}
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function setMsg(text,type){
    var box = document.getElementById("globalMsg");
    if(!box)return;
    box.textContent = text || "";
    box.className = "msg" + (text ? " " + (type || "info") : " hidden");
  }
  function cleanCity(value){
    return String(value || "").trim().replace(/\s+/g," ").slice(0,80);
  }
  function normalizeOptional(value){
    var v = String(value || "").trim();
    return v ? v : null;
  }
  function appUrl(extra){
    var url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/[^\/]*$/,"/konto.html");
    url.search = extra || "";
    url.hash = "";
    return url.toString();
  }
  function getClient(){
    if(window.__SZPILPLAC_SUPABASE_CLIENT)return window.__SZPILPLAC_SUPABASE_CLIENT;
    var cfg = window.SZPILPLAC_CONFIG || {};
    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase)return null;
    var c = window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
      auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}
    });
    window.__SZPILPLAC_SUPABASE_CLIENT = c;
    return c;
  }
  async function session(){
    var c = getClient();
    if(!c)return null;
    try{
      var r = await c.auth.getSession();
      return r && r.data ? r.data.session : null;
    }catch(e){return null;}
  }
  async function currentProfile(userId){
    var c = getClient();
    if(!c || !userId)return null;
    try{
      var r = await c.from("profiles")
        .select("id,login,display_name,rank_name,show_in_ranking,voivodeship,city")
        .eq("id",userId)
        .maybeSingle();
      if(r && !r.error && r.data)return r.data;
    }catch(e){}
    return null;
  }
  async function googleConnected(){
    var c = getClient();
    if(!c)return false;

    try{
      if(c.auth.getUserIdentities){
        var ids = await c.auth.getUserIdentities();
        var list = ids && ids.data && Array.isArray(ids.data.identities) ? ids.data.identities : [];
        if(list.some(function(x){return String(x.provider || "").toLowerCase() === "google";}))return true;
      }
    }catch(e){}

    try{
      var r = await c.auth.getUser();
      var user = r && r.data ? r.data.user : null;
      var providers = user && user.app_metadata ? (user.app_metadata.providers || []) : [];
      if(Array.isArray(providers) && providers.map(String).map(function(x){return x.toLowerCase();}).indexOf("google") !== -1)return true;
      if(user && user.app_metadata && String(user.app_metadata.provider || "").toLowerCase() === "google")return true;
    }catch(e){}

    return false;
  }
  function niceOAuthError(err){
    var raw = String((err && err.message) || err || "");
    var low = raw.toLowerCase();
    if(low.indexOf("provider is not enabled") !== -1 || low.indexOf("provider not enabled") !== -1){
      return "Google nie jest jeszcze włączone w Supabase.";
    }
    if(low.indexOf("manual linking") !== -1 || low.indexOf("linking") !== -1){
      return "W Supabase trzeba włączyć ręczne łączenie tożsamości.";
    }
    if(low.indexOf("redirect") !== -1){
      return "Brakuje adresu powrotu w Redirect URLs w Supabase.";
    }
    return raw || "Nieznany błąd Google.";
  }

  async function signInGoogle(){
    var c = getClient();
    if(!c){setMsg("Nie udało się przygotować logowania Google.","err");return;}
    try{
      localStorage.setItem("szp_google_auth_flow","signin");
      setMsg("Przenoszę do logowania Google...","info");
      var r = await c.auth.signInWithOAuth({
        provider:"google",
        options:{
          redirectTo:appUrl("?auth=google"),
          scopes:"openid email profile"
        }
      });
      if(r && r.error)throw r.error;
    }catch(e){
      setMsg("Nie udało się uruchomić Google: "+niceOAuthError(e),"err");
    }
  }

  async function linkGoogle(){
    var c = getClient();
    if(!c){setMsg("Nie udało się przygotować podłączenia Google.","err");return;}
    try{
      var s = await session();
      if(!s || !s.user){setMsg("Najpierw zaloguj się normalnie na konto, do którego chcesz podłączyć Google.","err");return;}
      localStorage.setItem("szp_google_auth_flow","link");
      setMsg("Przenoszę do Google, żeby podłączyć konto...","info");

      var r;
      try{
        r = await c.auth.linkIdentity({
          provider:"google",
          options:{
            redirectTo:appUrl("?auth=google-linked"),
            scopes:"openid email profile"
          }
        });
      }catch(firstErr){
        r = await c.auth.linkIdentity({provider:"google"});
      }

      if(r && r.error)throw r.error;
    }catch(e){
      setMsg("Nie udało się podłączyć Google: "+niceOAuthError(e),"err");
    }
  }

  function googleIcon(){
    return '<span class="gmark" aria-hidden="true">G</span>';
  }

  function injectStyles(){
    if(document.getElementById("szpGoogleAuthStyles"))return;
    var css = document.createElement("style");
    css.id = "szpGoogleAuthStyles";
    css.textContent = [
      ".google-auth-box{margin:14px 0 0;padding-top:14px;border-top:1px solid var(--line)}",
      ".google-sep{display:flex;align-items:center;gap:10px;margin:0 0 12px;color:var(--muted);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}",
      ".google-sep:before,.google-sep:after{content:'';height:1px;background:var(--line);flex:1}",
      ".google-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px}",
      ".gmark{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;background:#fff;color:#202124;font-weight:900;font-family:Arial,sans-serif;box-shadow:0 0 0 1px rgba(0,0,0,.15)}",
      ".google-link-card{margin:18px 0;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--surface2)}",
      ".google-link-card h3{margin:0 0 6px;font-size:15px}",
      ".google-link-card p{margin:0 0 12px;color:var(--ink2);font-size:13px;line-height:1.45}",
      ".google-status{font-weight:900}",
      ".google-status.ok{color:var(--green)}",
      ".google-status.warn{color:var(--gold)}",
      ".google-complete-card{margin:18px 0;padding:16px;border:1px solid rgba(196,144,80,.65);border-radius:18px;background:rgba(196,144,80,.09)}",
      ".google-complete-card h2{margin:0 0 8px}",
      ".google-complete-card .intro{margin-bottom:14px}",
      ".google-complete-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}",
      "@media(max-width:620px){.google-complete-actions{display:grid}.google-complete-actions .btn{width:100%}}"
    ].join("\n");
    document.head.appendChild(css);
  }

  function injectLoginButtons(){
    var login = document.getElementById("login");
    var register = document.getElementById("register");

    [login,register].forEach(function(panel){
      if(!panel || panel.querySelector(".google-auth-box"))return;
      var box = document.createElement("div");
      box.className = "google-auth-box";
      box.innerHTML =
        '<div class="google-sep">albo</div>'+
        '<button class="btn secondary google-btn js-google-signin" type="button">'+googleIcon()+' Zaloguj przez Google</button>'+
        '<div class="small" style="margin-top:8px;">Nowe konto Google i tak dokończy profil: nick, zgody i avatar w Szpilplacu.</div>';
      panel.appendChild(box);
    });

    qsa(".js-google-signin").forEach(function(btn){
      if(btn.dataset.bound)return;
      btn.dataset.bound = "1";
      btn.addEventListener("click",signInGoogle);
    });
  }

  function voivodeshipOptions(selected){
    return '<option value="">Nie podaję</option>' + VOIVODESHIPS.map(function(v){
      return '<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(v)+'</option>';
    }).join("");
  }

  function removeCompleteProfileBox(){
    var old = document.getElementById("googleCompleteProfileBox");
    if(old)old.remove();
  }

  function injectCompleteProfileBox(user){
    var profileCard = document.getElementById("profileCard");
    var intro = document.getElementById("profileIntro");
    if(!profileCard || document.getElementById("googleCompleteProfileBox"))return;

    var box = document.createElement("div");
    box.className = "google-complete-card";
    box.id = "googleCompleteProfileBox";
    box.innerHTML =
      '<h2>Dokończ profil gracza</h2>'+
      '<p class="intro">Google służy tylko do logowania. Publiczny nick, ranking i avatar ustawiasz w Szpilplacu.</p>'+
      '<form id="googleCompleteProfileForm">'+
        '<label class="field">Login do rankingu<input id="googleProfileLogin" type="text" autocomplete="nickname" required minlength="3" maxlength="24" placeholder="np. Starzik92"></label>'+
        '<div class="small">3–24 znaki. Dozwolone: litery, cyfry, podkreślenie, myślnik i polskie znaki.</div>'+
        '<label class="field">Województwo <span class="small" style="font-weight:600;">opcjonalnie</span><select id="googleProfileVoivodeship">'+voivodeshipOptions("")+'</select></label>'+
        '<label class="field">Miejscowość <span class="small" style="font-weight:600;">opcjonalnie</span><input id="googleProfileCity" type="text" maxlength="80" placeholder="np. Chorzów"></label>'+
        '<label class="check"><input id="googleProfileTerms" type="checkbox" required><span>Akceptuję regulamin Szpilplaca i politykę prywatności.</span></label>'+
        '<label class="check"><input id="googleProfileMarketing" type="checkbox"><span>Chcę dostawać informacje o Familocku, promocjach i nowościach. Opcjonalne.</span></label>'+
        '<div class="google-complete-actions">'+
          '<button class="btn" type="submit">Zapisz profil gracza</button>'+
          '<button class="btn secondary" id="googleCompleteLogout" type="button">Wyloguj</button>'+
        '</div>'+
      '</form>';

    var anchor = document.querySelector(".profile-summary");
    if(anchor && anchor.parentNode)anchor.parentNode.insertBefore(box,anchor);
    else if(intro && intro.parentNode)intro.parentNode.insertBefore(box,intro.nextSibling);
    else profileCard.insertBefore(box,profileCard.firstChild);

    var form = document.getElementById("googleCompleteProfileForm");
    form.addEventListener("submit",async function(e){
      e.preventDefault();
      var c = getClient();
      var s = await session();
      if(!c || !s || !s.user){setMsg("Sesja wygasła. Zaloguj się jeszcze raz przez Google.","err");return;}

      var login = document.getElementById("googleProfileLogin").value.trim();
      var voivodeship = normalizeOptional(document.getElementById("googleProfileVoivodeship").value);
      var city = normalizeOptional(cleanCity(document.getElementById("googleProfileCity").value));
      var terms = document.getElementById("googleProfileTerms").checked;
      var marketing = document.getElementById("googleProfileMarketing").checked;

      if(!LOGIN_RE.test(login)){
        setMsg("Login musi mieć 3–24 znaki i może zawierać litery, cyfry, podkreślenie, myślnik oraz polskie znaki.","err");
        return;
      }
      if(!terms){
        setMsg("Musisz zaakceptować regulamin i politykę prywatności.","err");
        return;
      }

      try{
        form.querySelectorAll("button,input,select").forEach(function(el){el.disabled=true;});
        setMsg("Zapisuję profil gracza...","info");

        var payload = {
          id:s.user.id,
          login:login,
          display_name:login,
          voivodeship:voivodeship,
          city:city,
          show_in_ranking:true
        };

        var res = await c.from("profiles").upsert(payload,{onConflict:"id"}).select("id").single();
        if(res.error)throw res.error;

        try{
          await c.auth.updateUser({
            data:{
              login:login,
              display_name:login,
              terms_version:window.TERMS_VERSION || "2026-06-30",
              privacy_version:window.PRIVACY_VERSION || "2026-06-30",
              marketing_consent:!!marketing,
              profile_completed:true
            }
          });
        }catch(metaErr){}

        setMsg("Profil zapisany. Teraz możesz wybrać avatar w ustawieniach konta.","ok");
        setTimeout(function(){
          var url = new URL(window.location.href);
          url.search = "?profile=done";
          url.hash = "";
          window.location.href = url.toString();
        },700);
      }catch(err){
        form.querySelectorAll("button,input,select").forEach(function(el){el.disabled=false;});
        var msg = String((err && err.message) || err || "");
        if(msg.toLowerCase().indexOf("duplicate") !== -1 || msg.toLowerCase().indexOf("unique") !== -1){
          setMsg("Ten login jest już zajęty. Wybierz inny.","err");
        }else{
          setMsg("Nie udało się zapisać profilu: "+msg,"err");
        }
      }
    });

    var logout = document.getElementById("googleCompleteLogout");
    if(logout){
      logout.addEventListener("click",async function(){
        var c = getClient();
        if(c)try{await c.auth.signOut();}catch(e){}
        try{localStorage.removeItem(AUTH_STORAGE_KEY);}catch(e){}
        window.location.href = appUrl("?login=1");
      });
    }
  }

  function injectProfileGoogleStatus(connected){
    var profileCard = document.getElementById("profileCard");
    if(!profileCard)return;

    var row = document.getElementById("googleProviderRow");
    if(!row){
      row = document.createElement("div");
      row.className = "profile-row";
      row.id = "googleProviderRow";
      row.innerHTML = '<strong>Google</strong><span id="googleProviderStatus"></span>';
      var pEmailRow = document.getElementById("pEmail");
      if(pEmailRow && pEmailRow.parentNode && pEmailRow.parentNode.parentNode){
        pEmailRow.parentNode.parentNode.insertBefore(row,pEmailRow.parentNode.nextSibling);
      }else{
        profileCard.appendChild(row);
      }
    }

    var status = document.getElementById("googleProviderStatus");
    if(status){
      status.innerHTML = connected
        ? '<span class="google-status ok">podłączone</span>'
        : '<span class="google-status warn">niepodłączone</span>';
    }

    var actions = document.querySelector(".profile-actions");
    if(actions && !document.getElementById("connectGoogleBtn")){
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn secondary";
      btn.id = "connectGoogleBtn";
      btn.innerHTML = googleIcon() + " Podłącz Google";
      btn.addEventListener("click",linkGoogle);
      var logoutBtn = document.getElementById("logoutBtn");
      if(logoutBtn && logoutBtn.parentNode === actions)actions.insertBefore(btn,logoutBtn);
      else actions.appendChild(btn);
    }

    var connectBtn = document.getElementById("connectGoogleBtn");
    if(connectBtn){
      connectBtn.style.display = connected ? "none" : "";
    }
  }

  async function refreshGoogleUi(){
    injectStyles();
    injectLoginButtons();

    var s = await session();
    if(!s || !s.user)return;

    var profile = await currentProfile(s.user.id);
    if(profile){
      removeCompleteProfileBox();
    }else{
      injectCompleteProfileBox(s.user);
    }

    var connected = await googleConnected();
    injectProfileGoogleStatus(connected);
  }

  function announceOAuthReturn(){
    var params = new URLSearchParams(window.location.search);
    if(params.get("auth") === "google"){
      setMsg("Zalogowano przez Google. Sprawdzam profil gracza...","ok");
    }
    if(params.get("auth") === "google-linked"){
      setMsg("Google wróciło do Szpilplaca. Sprawdzam podłączenie...","ok");
    }
    if(params.get("profile") === "done"){
      setMsg("Profil gracza zapisany. Możesz teraz wybrać avatar i grać z zapisem na koncie.","ok");
    }
  }

  function boot(){
    injectStyles();
    injectLoginButtons();
    announceOAuthReturn();

    setTimeout(refreshGoogleUi,400);
    setTimeout(refreshGoogleUi,1200);
    setTimeout(refreshGoogleUi,2500);

    var c = getClient();
    if(c && c.auth && c.auth.onAuthStateChange){
      c.auth.onAuthStateChange(function(){
        setTimeout(refreshGoogleUi,450);
      });
    }
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();

  window.SZP_GOOGLE_AUTH = {
    signIn:signInGoogle,
    link:linkGoogle,
    refresh:refreshGoogleUi
  };

  console.info("Szpilplac google-auth-bridge.js "+VERSION);
})();
