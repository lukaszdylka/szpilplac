/*
  Szpilplac v42
  -------------
  Strona główna:
  - mniejszy hero title i większy odstęp między liniami
  - ukrycie zbędnego górnego paska logowania
  - osobne przyciski: Załóż konto / Zaloguj / Ranking
  - osobne wyskakujące panele: rejestracja, logowanie, reset hasła
*/

(function(){
  "use strict";

  var VERSION = "v42";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var TERMS_VERSION = "2026-06-29";
  var PRIVACY_VERSION = "2026-06-29";
  var LOGIN_RE = /^[A-Za-z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,24}$/;
  var sb = null;
  var mode = "login";
  var busy = false;

  var VOIVODESHIPS = [
    "dolnośląskie","kujawsko-pomorskie","lubelskie","lubuskie","łódzkie","małopolskie","mazowieckie","opolskie","podkarpackie","podlaskie","pomorskie","śląskie","świętokrzyskie","warmińsko-mazurskie","wielkopolskie","zachodniopomorskie"
  ];

  var TEXT = {
    pl:{
      register:"Załóż konto",
      login:"Zaloguj",
      loginTitle:"Zaloguj się",
      reset:"Reset hasła",
      ranking:"Ranking",
      close:"Zamknij",
      guestLabel:"Grasz bez konta",
      guestName:"Gość",
      guestSub:"Gry działają normalnie. Konto zapisze punkty, ranking i historię.",
      regIntro:"Utwórz konto gracza, żeby zapisywać wyniki, punkty, rangę i historię gier.",
      loginIntro:"Zaloguj się e-mailem i hasłem. Po zalogowaniu wrócisz na Szpilplac.",
      resetIntro:"Wpisz e-mail konta. Wyślemy link do ustawienia nowego hasła.",
      nick:"Login do rankingu",
      nickHint:"3-24 znaki. Litery, cyfry, podkreślenie, myślnik i polskie znaki.",
      email:"E-mail",
      password:"Hasło",
      password2:"Powtórz hasło",
      voiv:"Województwo",
      city:"Miejscowość",
      optional:"opcjonalnie",
      none:"Nie podaję",
      terms:"Akceptuję regulamin Szpilplaca i politykę prywatności.",
      marketing:"Chcę dostawać e-maile o Familocku, promocjach, konkursach i nowościach. Opcjonalne.",
      submitRegister:"Załóż konto",
      submitLogin:"Zaloguj się",
      submitReset:"Wyślij link resetujący",
      forgot:"Nie pamiętasz hasła?",
      haveAccount:"Masz już konto?",
      noAccount:"Nie masz konta?",
      backLogin:"Wróć do logowania",
      creating:"Tworzę konto...",
      createdSession:"Konto utworzone. Odświeżam panel gracza...",
      createdMail:"Konto utworzone. Sprawdź maila i kliknij link potwierdzający konto.",
      logging:"Loguję...",
      logged:"Zalogowano. Odświeżam Szpilplac...",
      resetting:"Wysyłam link do resetu hasła...",
      resetSent:"Wysłano link do resetu hasła. Sprawdź skrzynkę i kliknij najnowszy link.",
      loginBad:"Login musi mieć 3-24 znaki i może zawierać litery, cyfry, podkreślenie, myślnik oraz polskie znaki.",
      passShort:"Hasło musi mieć minimum 8 znaków.",
      passDiff:"Hasła nie są takie same.",
      termsBad:"Musisz zaakceptować regulamin i politykę prywatności.",
      errRegister:"Nie udało się założyć konta: ",
      errLogin:"Nie udało się zalogować: ",
      errReset:"Nie udało się wysłać resetu hasła: ",
      configErr:"Brak konfiguracji Supabase.",
      libErr:"Nie załadowano biblioteki Supabase JS.",
      already:"Ten e-mail ma już konto. Spróbuj się zalogować albo zresetować hasło.",
      invalid:"Nieprawidłowy e-mail albo hasło.",
      emailConfirm:"Najpierw potwierdź e-mail linkiem z wiadomości.",
      duplicate:"Ten login jest już zajęty.",
      unknown:"Nieznany błąd."
    },
    szl:{
      register:"Załōż kōnto",
      login:"Zaloguj",
      loginTitle:"Zaloguj sie",
      reset:"Reset hasła",
      ranking:"Ranking",
      close:"Zawrzij",
      guestLabel:"Szpilosz bez kōnta",
      guestName:"Gość",
      guestSub:"Szpile fungujōm normalnie. Kōnto spamiyntuje punkty, ranking i historyjo.",
      regIntro:"Utwōrz kōnto gracza, coby spamiyntować wyniki, punkty, ranga i historyjo szpilōw.",
      loginIntro:"Zaloguj sie e-mailem i hasłym. Po zalogowaniu wrōcisz na Szpilplac.",
      resetIntro:"Wpisz e-mail kōnta. Wyślymy link do nastawiynio nowego hasła.",
      nick:"Login do rankingu",
      nickHint:"3-24 znaki. Litery, cyfry, podkryślyni, myślnik i polskie znaki.",
      email:"E-mail",
      password:"Hasło",
      password2:"Powtōrz hasło",
      voiv:"Wojewōdztwo",
      city:"Miyjscowość",
      optional:"niyobowionzkowo",
      none:"Niy podŏwōm",
      terms:"Akceptuja regulamin Szpilplaca i polityka prywatności.",
      marketing:"Chca dostŏwać e-maile ô Familocku, promocjach, kōnkursach i nowościach. Niyobowionzkowe.",
      submitRegister:"Załōż kōnto",
      submitLogin:"Zaloguj sie",
      submitReset:"Wyślij link resetujōncy",
      forgot:"Niy pamiyntosz hasła?",
      haveAccount:"Mosz już kōnto?",
      noAccount:"Niy mosz kōnta?",
      backLogin:"Wrōć do logowanio",
      creating:"Tworza kōnto...",
      createdSession:"Kōnto utworzōne. Ôdświyżōm panel gracza...",
      createdMail:"Kōnto utworzōne. Wejrzij do maila i kliknij link potwiyrdzajōncy kōnto.",
      logging:"Loguja...",
      logged:"Zalogowano. Ôdświyżōm Szpilplac...",
      resetting:"Wysyłōm link do resetu hasła...",
      resetSent:"Wysłano link do resetu hasła. Wejrzij do skrzinki i kliknij nojświyższy link.",
      loginBad:"Login musi mieć 3-24 znaki i może mieć litery, cyfry, podkryślyni, myślnik i polskie znaki.",
      passShort:"Hasło musi mieć minimum 8 znakōw.",
      passDiff:"Hasła niy sōm take same.",
      termsBad:"Musisz zaakceptować regulamin i polityka prywatności.",
      errRegister:"Niy szło założyć kōnta: ",
      errLogin:"Niy szło zalogować: ",
      errReset:"Niy szło wysłać resetu hasła: ",
      configErr:"Brak kōnfiguracyje Supabase.",
      libErr:"Niy załadowała sie biblioteka Supabase JS.",
      already:"Tyn e-mail mŏ już kōnto. Sprōbuj sie zalogować abo zresetować hasło.",
      invalid:"Niydobry e-mail abo hasło.",
      emailConfirm:"Nojpiyrw potwiyrdź e-mail linkym z wiadōmości.",
      duplicate:"Tyn login je już zajynty.",
      unknown:"Niyznany błōnd."
    }
  };

  function currentLang(){
    try{
      var l = localStorage.getItem("familock_lang") || document.documentElement.lang || "pl";
      return l === "szl" ? "szl" : "pl";
    }catch(e){
      return "pl";
    }
  }

  function t(key){
    var pack = TEXT[currentLang()] || TEXT.pl;
    return pack[key] || TEXT.pl[key] || key;
  }

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }

  function cleanCity(v){
    return String(v || "").trim().replace(/\s+/g, " ").slice(0, 80);
  }

  function opt(v){
    var s = String(v || "").trim();
    return s ? s : null;
  }

  function injectStyle(){
    if(document.getElementById("szpIndexAuthPanelsStyle"))return;

    var style = document.createElement("style");
    style.id = "szpIndexAuthPanelsStyle";
    style.textContent = `
      #szpIndexAuth,
      .szp-index-auth,
      [data-szp-index-auth="strip"]{
        display:none !important;
      }

      .hero h1,
      .szp-home-title{
        font-size:clamp(30px,4.55vw,54px) !important;
        line-height:1.09 !important;
        letter-spacing:.005em !important;
      }

      .hero{
        padding-top:22px !important;
        padding-bottom:22px !important;
      }

      @media(max-width:520px){
        .hero h1,
        .szp-home-title{
          font-size:34px !important;
          line-height:1.08 !important;
        }
      }

      .actions.szp-auth-guest-actions,
      .szp-player-actions.szp-auth-guest-actions{
        display:grid !important;
        grid-template-columns:1fr 1fr !important;
        gap:8px !important;
      }

      .szp-auth-guest-actions .szp-auth-ranking{
        grid-column:1 / -1;
      }

      .szp-auth-guest-actions button{
        font-family:inherit;
        cursor:pointer;
        border:0;
      }

      .szp-auth-scrim{
        position:fixed;
        inset:0;
        z-index:10020;
        background:rgba(0,0,0,.58);
        display:none;
        align-items:center;
        justify-content:center;
        padding:16px;
      }

      .szp-auth-scrim.open{
        display:flex;
      }

      .szp-auth-modal{
        width:100%;
        max-width:456px;
        max-height:90vh;
        overflow:auto;
        background:var(--surface,#fbf7ee);
        color:var(--ink,#23201a);
        border:1px solid var(--line,#c9bfa6);
        border-radius:18px;
        box-shadow:0 24px 54px -18px rgba(0,0,0,.65);
        padding:20px;
        position:relative;
      }

      .szp-auth-close{
        position:absolute;
        right:12px;
        top:12px;
        width:34px;
        height:34px;
        border-radius:999px;
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface2,#f3ecda);
        color:var(--ink2,#6a6150);
        font-size:20px;
        line-height:1;
        display:grid;
        place-items:center;
        cursor:pointer;
      }

      .szp-auth-title{
        font-family:Oswald,system-ui,sans-serif;
        font-size:25px;
        text-transform:uppercase;
        letter-spacing:.03em;
        line-height:1.04;
        margin:0 42px 7px 0;
      }

      .szp-auth-intro{
        font-size:13px;
        line-height:1.45;
        color:var(--ink2,#6a6150);
        margin:0 0 15px;
      }

      .szp-auth-form{
        display:grid;
        gap:12px;
      }

      .szp-auth-field{
        display:grid;
        gap:6px;
        font-size:13px;
        font-weight:900;
      }

      .szp-auth-field small,
      .szp-auth-small{
        font-size:11.5px;
        font-weight:600;
        color:var(--ink2,#6a6150);
        line-height:1.35;
      }

      .szp-auth-field input,
      .szp-auth-field select{
        width:100%;
        border:1px solid var(--line,#c9bfa6);
        border-radius:11px;
        padding:12px;
        background:#e8eef9;
        color:#000;
        font:inherit;
        font-size:15px;
        outline:none;
      }

      .szp-auth-field input:focus,
      .szp-auth-field select:focus{
        border-color:var(--gold,#bf8a3a);
        box-shadow:0 0 0 3px rgba(191,138,58,.2);
      }

      .szp-auth-check{
        display:flex;
        align-items:flex-start;
        gap:9px;
        font-size:12.5px;
        line-height:1.4;
        color:var(--ink2,#6a6150);
      }

      .szp-auth-check input{
        margin-top:3px;
        accent-color:var(--green,#2f4a39);
      }

      .szp-auth-check a{
        color:var(--green,#2f4a39);
        font-weight:900;
      }

      .szp-auth-submit{
        border-radius:12px;
        padding:12px 15px;
        background:var(--green,#2f4a39);
        color:#fff;
        font-weight:900;
        font-size:14px;
        text-align:center;
        border:0;
        cursor:pointer;
      }

      .szp-auth-submit.gold{
        background:var(--gold,#bf8a3a);
        color:#20170d;
      }

      .szp-auth-submit:disabled{
        opacity:.55;
        cursor:not-allowed;
      }

      .szp-auth-links{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
        justify-content:center;
        margin-top:13px;
        font-size:12.5px;
        color:var(--ink2,#6a6150);
      }

      .szp-auth-links button{
        font:inherit;
        font-weight:900;
        color:var(--green,#2f4a39);
        text-decoration:underline;
        padding:0;
        border:0;
        background:transparent;
        cursor:pointer;
      }

      .szp-auth-msg{
        border:1px solid var(--line,#c9bfa6);
        border-radius:12px;
        padding:11px 13px;
        background:var(--surface2,#f3ecda);
        color:var(--ink2,#6a6150);
        font-size:13px;
        line-height:1.45;
        white-space:pre-wrap;
        margin:0 0 13px;
      }

      .szp-auth-msg.ok{
        border-color:var(--correct,#3f8a5a);
        color:var(--correct,#3f8a5a);
        background:rgba(63,138,90,.1);
      }

      .szp-auth-msg.err{
        border-color:#b5482f;
        color:#b5482f;
        background:rgba(181,72,47,.1);
      }
    `;

    document.head.appendChild(style);
  }

  function loadScript(src, testFn){
    if(typeof testFn === "function" && testFn())return Promise.resolve();

    return new Promise(function(resolve, reject){
      var existing = Array.prototype.slice.call(document.scripts || []).find(function(s){
        return s.src && s.src.indexOf(src.split("?")[0]) !== -1;
      });

      if(existing){
        if(typeof testFn !== "function" || testFn())return resolve();
        existing.addEventListener("load", resolve, {once:true});
        existing.addEventListener("error", reject, {once:true});
        return;
      }

      var sc = document.createElement("script");
      sc.src = src;
      sc.async = false;
      sc.onload = resolve;
      sc.onerror = function(){reject(new Error("Nie załadowano " + src));};
      document.head.appendChild(sc);
    });
  }

  async function client(){
    if(sb)return sb;

    await loadScript("config.js", function(){
      return !!window.SZPILPLAC_CONFIG;
    });

    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", function(){
      return !!window.supabase;
    });

    var cfg = window.SZPILPLAC_CONFIG || {};
    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY)throw new Error(t("configErr"));
    if(!window.supabase)throw new Error(t("libErr"));

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

  function niceError(err){
    var msg = err && err.message ? err.message : String(err || t("unknown"));
    var low = msg.toLowerCase();

    if(low.indexOf("already") !== -1 || low.indexOf("registered") !== -1 || low.indexOf("user already") !== -1)return t("already");
    if(low.indexOf("invalid login credentials") !== -1 || low.indexOf("invalid") !== -1)return t("invalid");
    if(low.indexOf("email not confirmed") !== -1 || low.indexOf("not confirmed") !== -1)return t("emailConfirm");
    if(low.indexOf("duplicate") !== -1 || low.indexOf("unique") !== -1 || low.indexOf("profiles_login_key") !== -1)return t("duplicate");

    return msg;
  }

  function setMsg(text, type){
    var el = document.getElementById("szpAuthPanelMsg");
    if(!el)return;

    if(!text){
      el.style.display = "none";
      el.textContent = "";
      el.className = "szp-auth-msg";
      return;
    }

    el.style.display = "block";
    el.textContent = text;
    el.className = "szp-auth-msg" + (type ? " " + type : "");
  }

  function ensureModal(){
    injectStyle();

    var modal = document.getElementById("szpAuthPanel");
    if(modal)return modal;

    modal = document.createElement("div");
    modal.id = "szpAuthPanel";
    modal.className = "szp-auth-scrim";
    modal.innerHTML =
      '<div class="szp-auth-modal" role="dialog" aria-modal="true" aria-labelledby="szpAuthPanelTitle">'+
        '<button class="szp-auth-close" id="szpAuthPanelClose" type="button" aria-label="'+esc(t("close"))+'">×</button>'+
        '<h2 class="szp-auth-title" id="szpAuthPanelTitle"></h2>'+
        '<p class="szp-auth-intro" id="szpAuthPanelIntro"></p>'+
        '<div class="szp-auth-msg" id="szpAuthPanelMsg" style="display:none"></div>'+
        '<form class="szp-auth-form" id="szpAuthPanelForm"></form>'+
        '<div class="szp-auth-links" id="szpAuthPanelLinks"></div>'+
      '</div>';

    document.body.appendChild(modal);

    document.getElementById("szpAuthPanelClose").addEventListener("click", closeModal);
    modal.addEventListener("click", function(e){
      if(e.target === modal)closeModal();
    });

    document.addEventListener("keydown", function(e){
      if(e.key === "Escape")closeModal();
    });

    document.getElementById("szpAuthPanelForm").addEventListener("submit", function(e){
      e.preventDefault();
      submitMode();
    });

    return modal;
  }

  function openModal(nextMode){
    mode = nextMode || "login";
    var modal = ensureModal();
    renderModal();
    modal.classList.add("open");

    setTimeout(function(){
      var first = modal.querySelector("input,select,button");
      if(first)first.focus();
    }, 60);
  }

  function closeModal(){
    var modal = document.getElementById("szpAuthPanel");
    if(modal)modal.classList.remove("open");
    busy = false;
  }

  function optionVoivodeships(){
    var out = '<option value="">'+esc(t("none"))+'</option>';
    VOIVODESHIPS.forEach(function(v){
      out += '<option value="'+esc(v)+'">'+esc(v)+'</option>';
    });
    return out;
  }

  function renderModal(){
    var title = document.getElementById("szpAuthPanelTitle");
    var intro = document.getElementById("szpAuthPanelIntro");
    var form = document.getElementById("szpAuthPanelForm");
    var links = document.getElementById("szpAuthPanelLinks");
    if(!title || !intro || !form || !links)return;

    setMsg("");

    if(mode === "register"){
      title.textContent = t("register");
      intro.textContent = t("regIntro");
      form.innerHTML =
        '<label class="szp-auth-field">'+esc(t("nick"))+
          '<input id="szpRegLogin" type="text" autocomplete="nickname" minlength="3" maxlength="24" required>'+
          '<small>'+esc(t("nickHint"))+'</small>'+
        '</label>'+
        '<label class="szp-auth-field">'+esc(t("email"))+
          '<input id="szpRegEmail" type="email" autocomplete="email" required>'+
        '</label>'+
        '<label class="szp-auth-field">'+esc(t("password"))+
          '<input id="szpRegPassword" type="password" autocomplete="new-password" minlength="8" required>'+
        '</label>'+
        '<label class="szp-auth-field">'+esc(t("password2"))+
          '<input id="szpRegPassword2" type="password" autocomplete="new-password" minlength="8" required>'+
        '</label>'+
        '<label class="szp-auth-field">'+esc(t("voiv"))+' <small>'+esc(t("optional"))+'</small>'+
          '<select id="szpRegVoiv">'+optionVoivodeships()+'</select>'+
        '</label>'+
        '<label class="szp-auth-field">'+esc(t("city"))+' <small>'+esc(t("optional"))+'</small>'+
          '<input id="szpRegCity" type="text" autocomplete="address-level2" maxlength="80">'+
        '</label>'+
        '<label class="szp-auth-check">'+
          '<input id="szpRegTerms" type="checkbox" required>'+
          '<span>'+esc(t("terms"))+' <a href="regulamin.html" target="_blank" rel="noopener">Regulamin</a> · <a href="polityka-prywatnosci.html" target="_blank" rel="noopener">Prywatność</a></span>'+
        '</label>'+
        '<label class="szp-auth-check">'+
          '<input id="szpRegMarketing" type="checkbox">'+
          '<span>'+esc(t("marketing"))+' <a href="mailing.html" target="_blank" rel="noopener">Mailing</a></span>'+
        '</label>'+
        '<button class="szp-auth-submit gold" id="szpAuthSubmit" type="submit">'+esc(t("submitRegister"))+'</button>';

      links.innerHTML =
        '<span>'+esc(t("haveAccount"))+'</span><button type="button" data-mode="login">'+esc(t("login"))+'</button>'+
        '<button type="button" data-mode="reset">'+esc(t("forgot"))+'</button>';
    }

    if(mode === "login"){
      title.textContent = t("loginTitle");
      intro.textContent = t("loginIntro");
      form.innerHTML =
        '<label class="szp-auth-field">'+esc(t("email"))+
          '<input id="szpLoginEmail" type="email" autocomplete="email" required>'+
        '</label>'+
        '<label class="szp-auth-field">'+esc(t("password"))+
          '<input id="szpLoginPassword" type="password" autocomplete="current-password" required>'+
        '</label>'+
        '<button class="szp-auth-submit" id="szpAuthSubmit" type="submit">'+esc(t("submitLogin"))+'</button>';

      links.innerHTML =
        '<span>'+esc(t("noAccount"))+'</span><button type="button" data-mode="register">'+esc(t("register"))+'</button>'+
        '<button type="button" data-mode="reset">'+esc(t("forgot"))+'</button>';
    }

    if(mode === "reset"){
      title.textContent = t("reset");
      intro.textContent = t("resetIntro");
      form.innerHTML =
        '<label class="szp-auth-field">'+esc(t("email"))+
          '<input id="szpResetEmail" type="email" autocomplete="email" required>'+
        '</label>'+
        '<button class="szp-auth-submit" id="szpAuthSubmit" type="submit">'+esc(t("submitReset"))+'</button>';

      links.innerHTML =
        '<button type="button" data-mode="login">'+esc(t("backLogin"))+'</button>'+
        '<button type="button" data-mode="register">'+esc(t("register"))+'</button>';
    }

    links.querySelectorAll("[data-mode]").forEach(function(btn){
      btn.addEventListener("click", function(){
        mode = btn.getAttribute("data-mode") || "login";
        renderModal();
      });
    });
  }

  function setBusy(flag, text){
    busy = !!flag;
    var submit = document.getElementById("szpAuthSubmit");
    if(submit)submit.disabled = busy;
    if(text)setMsg(text, "");
  }

  async function checkLoginAvailable(login){
    var c = await client();

    try{
      var res = await c.rpc("is_login_available", {
        p_login: login
      });

      if(res.error)return true;
      return res.data === true;
    }catch(e){
      return true;
    }
  }

  async function ensureProfileAfterSession(data, formData){
    if(!data || !data.user || !data.session)return;

    var c = await client();
    var userId = data.user.id;

    try{
      await c.from("profiles").upsert({
        id:userId,
        login:formData.login,
        display_name:formData.login,
        voivodeship:formData.voivodeship,
        city:formData.city,
        show_in_ranking:true
      }, {onConflict:"id"});
    }catch(e){}

    try{
      await c.from("user_consents").insert({
        user_id:userId,
        terms_version:TERMS_VERSION,
        privacy_version:PRIVACY_VERSION,
        marketing_consent:!!formData.marketing_consent,
        marketing_consent_at:formData.marketing_consent ? new Date().toISOString() : null
      });
    }catch(e){}
  }

  async function submitRegister(){
    var login = document.getElementById("szpRegLogin").value.trim();
    var email = document.getElementById("szpRegEmail").value.trim();
    var p1 = document.getElementById("szpRegPassword").value;
    var p2 = document.getElementById("szpRegPassword2").value;
    var voiv = opt(document.getElementById("szpRegVoiv").value);
    var city = cleanCity(document.getElementById("szpRegCity").value);
    var terms = document.getElementById("szpRegTerms").checked;
    var marketing = document.getElementById("szpRegMarketing").checked;

    if(!LOGIN_RE.test(login))throw new Error(t("loginBad"));
    if(p1.length < 8)throw new Error(t("passShort"));
    if(p1 !== p2)throw new Error(t("passDiff"));
    if(!terms)throw new Error(t("termsBad"));

    setBusy(true, t("creating"));

    var available = await checkLoginAvailable(login);
    if(!available)throw new Error(t("duplicate"));

    var c = await client();
    var redirectTo = window.location.origin + "/konto.html";

    var formData = {
      login:login,
      voivodeship:voiv,
      city:city || null,
      marketing_consent:marketing
    };

    var res = await c.auth.signUp({
      email:email,
      password:p1,
      options:{
        emailRedirectTo:redirectTo,
        data:{
          login:login,
          display_name:login,
          voivodeship:voiv,
          city:city || null,
          terms_version:TERMS_VERSION,
          privacy_version:PRIVACY_VERSION,
          terms_accepted:true,
          privacy_accepted:true,
          marketing_consent:marketing
        }
      }
    });

    if(res.error)throw res.error;

    await ensureProfileAfterSession(res.data, formData);

    if(res.data && res.data.session){
      setMsg(t("createdSession"), "ok");
      setTimeout(function(){
        window.location.reload();
      }, 1200);
    }else{
      setMsg(t("createdMail"), "ok");
    }
  }

  async function submitLogin(){
    var email = document.getElementById("szpLoginEmail").value.trim();
    var password = document.getElementById("szpLoginPassword").value;

    setBusy(true, t("logging"));

    var c = await client();
    var res = await c.auth.signInWithPassword({
      email:email,
      password:password
    });

    if(res.error)throw res.error;

    setMsg(t("logged"), "ok");
    setTimeout(function(){
      window.location.reload();
    }, 900);
  }

  async function submitReset(){
    var email = document.getElementById("szpResetEmail").value.trim();

    setBusy(true, t("resetting"));

    var c = await client();
    var redirectTo = window.location.origin + "/konto.html";

    var res = await c.auth.resetPasswordForEmail(email, {
      redirectTo:redirectTo
    });

    if(res.error)throw res.error;

    setMsg(t("resetSent"), "ok");
  }

  async function submitMode(){
    if(busy)return;

    try{
      if(mode === "register")await submitRegister();
      else if(mode === "login")await submitLogin();
      else await submitReset();
    }catch(err){
      var prefix = mode === "register" ? t("errRegister") : (mode === "login" ? t("errLogin") : t("errReset"));
      setMsg(prefix + niceError(err), "err");
    }finally{
      setBusy(false);
    }
  }

  function isGuestCard(card){
    if(!card)return false;

    var text = (card.textContent || "").toLowerCase();
    return text.indexOf("gość") !== -1 || text.indexOf("gosc") !== -1 || text.indexOf("grasz bez konta") !== -1 || text.indexOf("szpilosz bez") !== -1;
  }

  function patchGuestActions(){
    var card = document.getElementById("playerCard") || document.getElementById("szpPlayerCard");
    if(!card || !isGuestCard(card))return;

    var actions = card.querySelector(".actions") || card.querySelector(".szp-player-actions");
    if(!actions)return;

    if(actions.dataset.szpAuthPanels === VERSION)return;
    actions.dataset.szpAuthPanels = VERSION;
    actions.classList.add("szp-auth-guest-actions");

    actions.innerHTML =
      '<button class="btn gold szp-home-btn gold" type="button" data-szp-auth-open="register">'+esc(t("register"))+'</button>'+
      '<button class="btn secondary szp-home-btn secondary" type="button" data-szp-auth-open="login">'+esc(t("login"))+'</button>'+
      '<a class="btn secondary szp-home-btn secondary szp-auth-ranking" href="ranking.html">'+esc(t("ranking"))+'</a>';

    actions.querySelectorAll("[data-szp-auth-open]").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.preventDefault();
        openModal(btn.getAttribute("data-szp-auth-open") || "login");
      });
    });
  }

  function patchTopButtons(){
    document.querySelectorAll("a[href='konto.html'], a[href='konto.html#register'], a[href='konto.html?mode=register']").forEach(function(a){
      var txt = String(a.textContent || "").toLowerCase();
      if(txt.indexOf("załóż") !== -1 || txt.indexOf("zaloguj") !== -1 || txt.indexOf("konto") !== -1){
        a.addEventListener("click", function(e){
          if(document.getElementById("playerCard") || document.getElementById("szpPlayerCard")){
            e.preventDefault();
            openModal("register");
          }
        });
      }
    });
  }

  function boot(){
    console.info("Szpilplac index-auth-panels.js " + VERSION);
    injectStyle();
    ensureModal();

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      patchGuestActions();
      patchTopButtons();
      if(tries > 80)clearInterval(timer);
    }, 150);

    var obs = new MutationObserver(function(){
      patchGuestActions();
      patchTopButtons();
    });

    obs.observe(document.body, {
      childList:true,
      subtree:true,
      characterData:true
    });

    window.SZPILPLAC_OPEN_AUTH = openModal;
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();