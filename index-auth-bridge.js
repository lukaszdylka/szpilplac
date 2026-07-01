/*
  Szpilplac Index Auth Bridge v18
  -------------------------------
  Konto na stronie głównej bez górnego paska:
  - poprawia rozmiar hero
  - dodaje przyciski Załóż konto i Zaloguj w panelu gościa
  - otwiera osobne panele rejestracji, logowania i resetu hasła
  - wspiera PL i ŚL
*/

(function(){
  "use strict";

  var VERSION = "v18";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var TERMS_VERSION = "2026-06-29";
  var PRIVACY_VERSION = "2026-06-29";
  var LOGIN_RE = /^[A-Za-z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,24}$/;
  var sb = null;
  var mode = "register";
  var busy = false;

  var VOIVODESHIPS = [
    "dolnośląskie","kujawsko-pomorskie","lubelskie","lubuskie","łódzkie","małopolskie","mazowieckie","opolskie","podkarpackie","podlaskie","pomorskie","śląskie","świętokrzyskie","warmińsko-mazurskie","wielkopolskie","zachodniopomorskie"
  ];

  var TEXT = {
    pl:{
      register:"Załóż konto",login:"Zaloguj",loginTitle:"Zaloguj się",reset:"Reset hasła",close:"Zamknij",ranking:"Ranking",
      guestLabel:"Grasz bez konta",guestName:"Gość",guestSub:"Gry działają normalnie. Konto zapisze punkty, ranking i historię.",
      regIntro:"Zapisuj wyniki, ranking i rangę na swoim koncie.",loginIntro:"Wpisz e-mail i hasło. Po zalogowaniu wrócisz na Szpilplac.",resetIntro:"Wpisz e-mail, a wyślemy link do ustawienia nowego hasła.",
      nick:"Login do rankingu",nickHint:"3-24 znaki. Litery, cyfry, podkreślenie, myślnik i polskie znaki.",email:"E-mail",password:"Hasło",password2:"Powtórz hasło",voiv:"Województwo",city:"Miejscowość",optional:"opcjonalnie",none:"Nie podaję",
      terms:"Akceptuję regulamin Szpilplaca i politykę prywatności.",marketing:"Chcę dostawać informacje o Familocku, promocjach i nowościach. Opcjonalne.",
      submitRegister:"Załóż konto",submitLogin:"Zaloguj się",submitReset:"Wyślij link resetujący",forgot:"Nie pamiętasz hasła?",haveAccount:"Masz już konto?",noAccount:"Nie masz konta?",backLogin:"Wróć do logowania",
      creating:"Tworzę konto i wysyłam mail potwierdzający...",createdSession:"Konto utworzone i jesteś zalogowany.",createdMail:"Konto utworzone. Sprawdź maila i kliknij link potwierdzający konto.",
      logging:"Loguję...",logged:"Zalogowano. Odświeżam panel gracza...",resetting:"Wysyłam link do resetu hasła...",resetSent:"Wysłano link do resetu hasła. Sprawdź skrzynkę i kliknij najnowszy link.",
      loginBad:"Login musi mieć 3-24 znaki i może zawierać litery, cyfry, podkreślenie, myślnik oraz polskie znaki.",passShort:"Hasło musi mieć minimum 8 znaków.",passDiff:"Hasła nie są takie same.",termsBad:"Musisz zaakceptować regulamin i politykę prywatności.",
      errRegister:"Nie udało się założyć konta: ",errLogin:"Nie udało się zalogować: ",errReset:"Nie udało się wysłać resetu hasła: ",configErr:"Brak konfiguracji Supabase.",libErr:"Nie załadowano biblioteki Supabase JS.",
      already:"Ten e-mail ma już konto. Spróbuj się zalogować albo zresetować hasło.",invalid:"Nieprawidłowy e-mail albo hasło.",emailConfirm:"Najpierw potwierdź e-mail linkiem z wiadomości.",duplicate:"Ten login jest już zajęty.",unknown:"Nieznany błąd."
    },
    szl:{
      register:"Załōż kōnto",login:"Zaloguj",loginTitle:"Zaloguj sie",reset:"Reset hasła",close:"Zawrzij",ranking:"Ranking",
      guestLabel:"Szpilosz bez kōnta",guestName:"Gość",guestSub:"Szpile fungujōm normalnie. Kōnto spamiyntuje punkty, ranking i historyjo.",
      regIntro:"Spamiyntuj wyniki, ranking i ranga na swoim kōncie.",loginIntro:"Wpisz e-mail i hasło. Po zalogowaniu wrōcisz na Szpilplac.",resetIntro:"Wpisz e-mail, a wyślymy link do nastawiynio nowego hasła.",
      nick:"Login do rankingu",nickHint:"3-24 znaki. Litery, cyfry, podkryślyni, myślnik i polskie znaki.",email:"E-mail",password:"Hasło",password2:"Powtōrz hasło",voiv:"Wojewōdztwo",city:"Miyjscowość",optional:"niyobowionzkowo",none:"Niy podŏwōm",
      terms:"Akceptuja regulamin Szpilplaca i polityka prywatności.",marketing:"Chca dostŏwać wieści ô Familocku, promocjach i nowościach. Niyobowionzkowe.",
      submitRegister:"Załōż kōnto",submitLogin:"Zaloguj sie",submitReset:"Wyślij link resetujōncy",forgot:"Niy pamiyntosz hasła?",haveAccount:"Mosz już kōnto?",noAccount:"Niy mosz kōnta?",backLogin:"Wrōć do logowanio",
      creating:"Tworza kōnto i wysyłōm mail potwiyrdzajōncy...",createdSession:"Kōnto utworzōne i jeżeś zalogowany.",createdMail:"Kōnto utworzōne. Wejrzij do maila i kliknij link potwiyrdzajōncy kōnto.",
      logging:"Loguja...",logged:"Zalogowano. Ôdświyżōm panel grŏcza...",resetting:"Wysyłōm link do resetu hasła...",resetSent:"Wysłano link do resetu hasła. Wejrzij do skrzinki i kliknij nojświyższy link.",
      loginBad:"Login musi mieć 3-24 znaki i może mieć litery, cyfry, podkryślyni, myślnik i polskie znaki.",passShort:"Hasło musi mieć minimum 8 znakōw.",passDiff:"Hasła niy sōm take same.",termsBad:"Musisz zaakceptować regulamin i polityka prywatności.",
      errRegister:"Niy szło założyć kōnta: ",errLogin:"Niy szło zalogować: ",errReset:"Niy szło wysłać resetu hasła: ",configErr:"Brak konfiguracyji Supabase.",libErr:"Niy załadowała sie biblioteka Supabase JS.",
      already:"Tyn e-mail mŏ już kōnto. Sprōbuj sie zalogować abo zresetować hasło.",invalid:"Niydobry e-mail abo hasło.",emailConfirm:"Nojpiyrw potwiyrdź e-mail linkym z wiadōmości.",duplicate:"Tyn login je już zajynty.",unknown:"Niyznany błōnd."
    }
  };

  function lang(){
    try{return localStorage.getItem("familock_lang")==="szl" ? "szl" : "pl";}catch(e){return "pl";}
  }
  function t(k){var pack=TEXT[lang()]||TEXT.pl;return pack[k]||TEXT.pl[k]||k;}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
  function cleanCity(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,80);}
  function opt(v){var s=String(v||"").trim();return s?s:null;}

  function injectStyle(){
    if(document.getElementById("szpIndexAuthStyle"))return;
    var style=document.createElement("style");
    style.id="szpIndexAuthStyle";
    style.textContent =
      "#szpIndexAuth{display:none!important}"+
      ".szp-home-title{font-size:clamp(30px,5.15vw,54px)!important;line-height:1.08!important}"+
      "@media(max-width:420px){.szp-home-title{font-size:34px!important;line-height:1.08!important}}"+
      ".szp-player-actions.szp-auth-actions{grid-template-columns:1fr 1fr}"+
      ".szp-auth-actions .szp-auth-ranking{grid-column:1/-1;min-height:34px}"+
      ".szp-auth-actions button.szp-home-btn{border:0;cursor:pointer;font-family:inherit}"+
      ".szp-auth-scrim{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.58);display:none;align-items:center;justify-content:center;padding:16px}"+
      ".szp-auth-scrim.open{display:flex}"+
      ".szp-auth-modal{width:100%;max-width:440px;max-height:90vh;overflow:auto;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);border:1px solid var(--line,#c9bfa6);border-radius:18px;box-shadow:0 24px 54px -18px rgba(0,0,0,.65);padding:20px;position:relative}"+
      ".szp-auth-close{position:absolute;right:12px;top:12px;width:34px;height:34px;border-radius:999px;border:1px solid var(--line,#c9bfa6);background:var(--surface2,#f3ecda);color:var(--ink2,#6a6150);font-size:20px;line-height:1;display:grid;place-items:center}"+
      ".szp-auth-title{font-family:Oswald,system-ui,sans-serif;font-size:25px;text-transform:uppercase;letter-spacing:.03em;line-height:1.04;margin:0 42px 7px 0}"+
      ".szp-auth-intro{font-size:13px;line-height:1.45;color:var(--ink2,#6a6150);margin:0 0 15px}"+
      ".szp-auth-form{display:grid;gap:12px}"+
      ".szp-auth-field{display:grid;gap:6px;font-size:13px;font-weight:900}"+
      ".szp-auth-field small,.szp-auth-small{font-size:11.5px;font-weight:600;color:var(--ink2,#6a6150);line-height:1.35}"+
      ".szp-auth-field input,.szp-auth-field select{width:100%;border:1px solid var(--line,#c9bfa6);border-radius:11px;padding:12px;background:#e8eef9;color:#000;font:inherit;font-size:15px;outline:none}"+
      ".szp-auth-field input:focus,.szp-auth-field select:focus{border-color:var(--gold,#bf8a3a);box-shadow:0 0 0 3px rgba(191,138,58,.2)}"+
      ".szp-auth-check{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;line-height:1.4;color:var(--ink2,#6a6150)}"+
      ".szp-auth-check input{margin-top:3px;accent-color:var(--green,#2f4a39)}"+
      ".szp-auth-submit{border-radius:12px;padding:12px 15px;background:var(--green,#2f4a39);color:#fff;font-weight:900;font-size:14px;text-align:center;border:0;cursor:pointer}"+
      ".szp-auth-submit.gold{background:var(--gold,#bf8a3a);color:#20170d}"+
      ".szp-auth-submit:disabled{opacity:.55;cursor:not-allowed}"+
      ".szp-auth-links{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;margin-top:13px;font-size:12.5px;color:var(--ink2,#6a6150)}"+
      ".szp-auth-links button{font:inherit;font-weight:900;color:var(--green,#2f4a39);text-decoration:underline;padding:0;border:0;background:transparent;cursor:pointer}"+
      ".szp-auth-msg{border:1px solid var(--line,#c9bfa6);border-radius:12px;padding:11px 13px;background:var(--surface2,#f3ecda);color:var(--ink2,#6a6150);font-size:13px;line-height:1.45;white-space:pre-wrap;margin:0 0 13px}"+
      ".szp-auth-msg.ok{border-color:var(--correct,#3f8a5a);color:var(--correct,#3f8a5a);background:rgba(63,138,90,.1)}"+
      ".szp-auth-msg.err{border-color:#b5482f;color:#b5482f;background:rgba(181,72,47,.1)}";
    document.head.appendChild(style);
  }

  function loadScript(src,testFn){
    if(typeof testFn==="function" && testFn())return Promise.resolve();
    return new Promise(function(resolve,reject){
      var existing=Array.prototype.slice.call(document.scripts||[]).find(function(s){return s.src && s.src.indexOf(src.split("?")[0])!==-1;});
      if(existing){
        if(typeof testFn!=="function" || testFn())return resolve();
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
    if(sb)return sb;
    await loadScript("config.js?v=18",function(){return !!window.SZPILPLAC_CONFIG;});
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",function(){return !!window.supabase;});
    var cfg=window.SZPILPLAC_CONFIG||{};
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)throw new Error(t("configErr"));
    if(!window.supabase)throw new Error(t("libErr"));
    if(window.__SZPILPLAC_SUPABASE_CLIENT){sb=window.__SZPILPLAC_SUPABASE_CLIENT;return sb;}
    sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    window.__SZPILPLAC_SUPABASE_CLIENT=sb;
    return sb;
  }

  function niceError(error){
    var msg=error && error.message ? error.message : String(error||t("unknown"));
    if(msg.indexOf("User already registered")!==-1)return t("already");
    if(msg.indexOf("Invalid login credentials")!==-1)return t("invalid");
    if(msg.indexOf("Email not confirmed")!==-1)return t("emailConfirm");
    if(msg.indexOf("duplicate key")!==-1)return t("duplicate");
    return msg;
  }

  function redirectUrl(q){return new URL("konto.html"+(q||""),location.href).toString();}

  function modal(){
    var scrim=document.getElementById("szpAuthScrim");
    if(scrim)return scrim;
    scrim=document.createElement("div");
    scrim.id="szpAuthScrim";
    scrim.className="szp-auth-scrim";
    scrim.innerHTML='<div class="szp-auth-modal" role="dialog" aria-modal="true" aria-labelledby="szpAuthTitle"><button type="button" class="szp-auth-close" id="szpAuthClose" aria-label="'+esc(t("close"))+'">×</button><div id="szpAuthBody"></div></div>';
    document.body.appendChild(scrim);
    scrim.addEventListener("click",function(e){if(e.target===scrim)closeAuth();});
    document.getElementById("szpAuthClose").addEventListener("click",closeAuth);
    scrim.addEventListener("submit",onSubmit);
    scrim.addEventListener("click",function(e){
      var b=e.target&&e.target.closest?e.target.closest("[data-szp-auth-mode]"):null;
      if(b){e.preventDefault();openAuth(b.getAttribute("data-szp-auth-mode"));}
    });
    return scrim;
  }

  function setMsg(text,type){
    var box=document.getElementById("szpAuthMsg");
    if(!box)return;
    box.textContent=text||"";
    box.className="szp-auth-msg"+(type?" "+type:"");
    box.style.display=text?"block":"none";
  }

  function optionsHtml(){
    return '<option value="">'+esc(t("none"))+'</option>'+VOIVODESHIPS.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join("");
  }

  function renderAuth(){
    var body=document.getElementById("szpAuthBody");
    if(!body)return;
    var html='<div id="szpAuthMsg" class="szp-auth-msg" style="display:none"></div>';

    if(mode==="login"){
      html += '<h2 class="szp-auth-title" id="szpAuthTitle">'+esc(t("loginTitle"))+'</h2>'+
        '<p class="szp-auth-intro">'+esc(t("loginIntro"))+'</p>'+
        '<form class="szp-auth-form" id="szpLoginForm">'+
          '<label class="szp-auth-field">'+esc(t("email"))+'<input id="szpLoginEmail" type="email" autocomplete="email" required></label>'+
          '<label class="szp-auth-field">'+esc(t("password"))+'<input id="szpLoginPassword" type="password" autocomplete="current-password" required></label>'+
          '<button class="szp-auth-submit" type="submit">'+esc(t("submitLogin"))+'</button>'+
        '</form>'+
        '<div class="szp-auth-links"><span>'+esc(t("forgot"))+'</span><button type="button" data-szp-auth-mode="reset">'+esc(t("reset"))+'</button><span>'+esc(t("noAccount"))+'</span><button type="button" data-szp-auth-mode="register">'+esc(t("register"))+'</button></div>';
    }else if(mode==="reset"){
      html += '<h2 class="szp-auth-title" id="szpAuthTitle">'+esc(t("reset"))+'</h2>'+
        '<p class="szp-auth-intro">'+esc(t("resetIntro"))+'</p>'+
        '<form class="szp-auth-form" id="szpResetForm">'+
          '<label class="szp-auth-field">'+esc(t("email"))+'<input id="szpResetEmail" type="email" autocomplete="email" required></label>'+
          '<button class="szp-auth-submit" type="submit">'+esc(t("submitReset"))+'</button>'+
        '</form>'+
        '<div class="szp-auth-links"><button type="button" data-szp-auth-mode="login">'+esc(t("backLogin"))+'</button></div>';
    }else{
      html += '<h2 class="szp-auth-title" id="szpAuthTitle">'+esc(t("register"))+'</h2>'+
        '<p class="szp-auth-intro">'+esc(t("regIntro"))+'</p>'+
        '<form class="szp-auth-form" id="szpRegisterForm">'+
          '<label class="szp-auth-field">'+esc(t("nick"))+'<input id="szpRegLogin" type="text" autocomplete="nickname" placeholder="Starzik92" required minlength="3" maxlength="24"><small>'+esc(t("nickHint"))+'</small></label>'+
          '<label class="szp-auth-field">'+esc(t("voiv"))+' <small>'+esc(t("optional"))+'</small><select id="szpRegVoiv">'+optionsHtml()+'</select></label>'+
          '<label class="szp-auth-field">'+esc(t("city"))+' <small>'+esc(t("optional"))+'</small><input id="szpRegCity" type="text" autocomplete="address-level2" placeholder="Chorzów" maxlength="80"></label>'+
          '<label class="szp-auth-field">'+esc(t("email"))+'<input id="szpRegEmail" type="email" autocomplete="email" required></label>'+
          '<label class="szp-auth-field">'+esc(t("password"))+'<input id="szpRegPassword" type="password" autocomplete="new-password" required minlength="8"></label>'+
          '<label class="szp-auth-field">'+esc(t("password2"))+'<input id="szpRegPassword2" type="password" autocomplete="new-password" required minlength="8"></label>'+
          '<label class="szp-auth-check"><input id="szpRegTerms" type="checkbox" required><span>'+esc(t("terms"))+'</span></label>'+
          '<label class="szp-auth-check"><input id="szpRegMarketing" type="checkbox"><span>'+esc(t("marketing"))+'</span></label>'+
          '<button class="szp-auth-submit gold" type="submit">'+esc(t("submitRegister"))+'</button>'+
        '</form>'+
        '<div class="szp-auth-links"><span>'+esc(t("haveAccount"))+'</span><button type="button" data-szp-auth-mode="login">'+esc(t("login"))+'</button></div>';
    }

    body.innerHTML=html;
  }

  function openAuth(nextMode){
    mode=nextMode||"register";
    injectStyle();
    var scrim=modal();
    renderAuth();
    scrim.classList.add("open");
    setTimeout(function(){var first=scrim.querySelector("input");if(first)first.focus();},60);
  }

  function closeAuth(){
    var scrim=document.getElementById("szpAuthScrim");
    if(scrim)scrim.classList.remove("open");
  }

  function setFormBusy(form,on){
    busy=!!on;
    Array.prototype.forEach.call(form.querySelectorAll("button,input,select"),function(el){el.disabled=!!on;});
  }

  async function onSubmit(e){
    var form=e.target;
    if(!form || !form.id || busy)return;
    if(form.id!=="szpRegisterForm" && form.id!=="szpLoginForm" && form.id!=="szpResetForm")return;
    e.preventDefault();
    setMsg("");

    try{
      var c=await client();

      if(form.id==="szpLoginForm"){
        setFormBusy(form,true);setMsg(t("logging"));
        var lr=await c.auth.signInWithPassword({email:document.getElementById("szpLoginEmail").value.trim(),password:document.getElementById("szpLoginPassword").value});
        if(lr.error)throw lr.error;
        setMsg(t("logged"),"ok");
        setTimeout(function(){closeAuth();location.reload();},700);
        return;
      }

      if(form.id==="szpResetForm"){
        setFormBusy(form,true);setMsg(t("resetting"));
        var rr=await c.auth.resetPasswordForEmail(document.getElementById("szpResetEmail").value.trim(),{redirectTo:redirectUrl("?reset=1")});
        if(rr.error)throw rr.error;
        setMsg(t("resetSent"),"ok");
        return;
      }

      var login=document.getElementById("szpRegLogin").value.trim();
      var email=document.getElementById("szpRegEmail").value.trim();
      var password=document.getElementById("szpRegPassword").value;
      var password2=document.getElementById("szpRegPassword2").value;
      if(!LOGIN_RE.test(login)){setMsg(t("loginBad"),"err");return;}
      if(password.length<8){setMsg(t("passShort"),"err");return;}
      if(password!==password2){setMsg(t("passDiff"),"err");return;}
      if(!document.getElementById("szpRegTerms").checked){setMsg(t("termsBad"),"err");return;}

      setFormBusy(form,true);setMsg(t("creating"));
      var vr=document.getElementById("szpRegVoiv").value;
      var city=cleanCity(document.getElementById("szpRegCity").value);
      var sr=await c.auth.signUp({
        email:email,
        password:password,
        options:{
          emailRedirectTo:redirectUrl("?confirmed=1"),
          data:{login:login,display_name:login,terms_version:TERMS_VERSION,privacy_version:PRIVACY_VERSION,marketing_consent:document.getElementById("szpRegMarketing").checked,voivodeship:opt(vr),city:opt(city)}
        }
      });
      if(sr.error)throw sr.error;
      if(sr.data && sr.data.session && sr.data.session.user){
        setMsg(t("createdSession"),"ok");
        setTimeout(function(){closeAuth();location.reload();},900);
      }else{
        setMsg(t("createdMail"),"ok");
        mode="login";
        setTimeout(function(){renderAuth();setMsg(t("createdMail"),"ok");},900);
      }
    }catch(err){
      var prefix=form.id==="szpLoginForm"?t("errLogin"):(form.id==="szpResetForm"?t("errReset"):t("errRegister"));
      setMsg(prefix+niceError(err),"err");
    }finally{
      if(form && form.id)setFormBusy(form,false);
    }
  }

  function decorateGuestCard(){
    injectStyle();
    var old=document.getElementById("szpIndexAuth");
    if(old)old.remove();

    var card=document.getElementById("szpPlayerCard");
    if(!card)return;

    var label=card.querySelector(".szp-player-label");
    var isGuest=label && /bez konta|bez kōnta/i.test(label.textContent||"");
    if(!isGuest)return;

    var login=card.querySelector(".szp-player-login");
    var sub=card.querySelector(".szp-player-sub");
    if(label)label.textContent=t("guestLabel");
    if(login)login.textContent=t("guestName");
    if(sub)sub.textContent=t("guestSub");

    var actions=card.querySelector(".szp-player-actions");
    if(!actions)return;
    if(actions.querySelector("[data-szp-auth-open]"))return;
    actions.className="szp-player-actions szp-auth-actions";
    actions.innerHTML=
      '<button type="button" class="szp-home-btn gold" data-szp-auth-open="register">'+esc(t("register"))+'</button>'+
      '<button type="button" class="szp-home-btn secondary" data-szp-auth-open="login">'+esc(t("login"))+'</button>'+
      '<a class="szp-home-btn secondary szp-auth-ranking" href="ranking.html">'+esc(t("ranking"))+'</a>';
  }

  function boot(){
    console.info("Szpilplac index-auth-bridge.js " + VERSION);
    injectStyle();

    document.addEventListener("click",function(e){
      var btn=e.target && e.target.closest ? e.target.closest("[data-szp-auth-open]") : null;
      if(btn){e.preventDefault();openAuth(btn.getAttribute("data-szp-auth-open")||"register");}
    });

    document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAuth();});

    var run=function(){decorateGuestCard();};
    run();
    var timer=setInterval(run,300);
    setTimeout(function(){clearInterval(timer);},10000);

    var mo=new MutationObserver(function(){decorateGuestCard();});
    if(document.body)mo.observe(document.body,{childList:true,subtree:true});

    document.addEventListener("click",function(e){
      if(e.target && (e.target.id==="lPl" || e.target.id==="lSzl")){
        setTimeout(function(){
          decorateGuestCard();
          var scrim=document.getElementById("szpAuthScrim");
          if(scrim && scrim.classList.contains("open"))renderAuth();
        },80);
      }
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
