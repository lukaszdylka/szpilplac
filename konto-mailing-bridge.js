/*
  Szpilplac Konto Mailing Bridge v20
  ----------------------------------
  Dodaje do profilu gracza sekcję zgody mailingowej.
  Działa przez RPC:
  - szpilplac_get_my_marketing_consent()
  - szpilplac_set_marketing_consent(boolean)

  Dołącz w konto.html przed </body>:
  <script src="konto-mailing-bridge.js?v=20"></script>
*/

(function(){
  "use strict";

  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var sb=null;

  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}

  function injectStyle(){
    if(document.getElementById("szpMailingBridgeStyle"))return;
    var st=document.createElement("style");
    st.id="szpMailingBridgeStyle";
    st.textContent=
      ".szp-mailing-box{margin-top:16px;padding:14px;border:1px dashed var(--line);border-radius:12px;background:var(--surface2)}"+
      ".szp-mailing-box h3{font-family:Oswald;text-transform:uppercase;letter-spacing:.03em;font-size:17px;margin:0 0 8px}"+
      ".szp-mailing-box p{font-size:12.5px;color:var(--ink2);line-height:1.45;margin:0 0 10px}"+
      ".szp-mailing-box label{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--ink2);line-height:1.4}"+
      ".szp-mailing-box input{margin-top:3px;accent-color:var(--green)}"+
      ".szp-mailing-box a{color:var(--green);font-weight:900;text-decoration:underline;text-underline-offset:2px}"+
      ".szp-mailing-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:11px}"+
      ".szp-mailing-msg{font-size:12px;color:var(--ink2)}";
    document.head.appendChild(st);
  }

  function createClient(){
    if(sb)return sb;
    var cfg=window.SZPILPLAC_CONFIG||{};
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||!window.supabase)return null;
    sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
      auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}
    });
    return sb;
  }

  function ensureBox(){
    var profile=document.getElementById("profileCard");
    if(!profile)return null;

    var box=document.getElementById("szpMailingBox");
    if(box)return box;

    box=document.createElement("div");
    box.id="szpMailingBox";
    box.className="szp-mailing-box";
    box.innerHTML=
      '<h3>Mailing Familock/Szpilplac</h3>'+
      '<p>Możesz dobrowolnie zgodzić się na e-maile o nowościach, promocjach, konkursach i wydarzeniach. Konto działa również bez tej zgody.</p>'+
      '<label><input type="checkbox" id="szpMarketingConsent"> <span>Chcę otrzymywać e-mailem informacje o nowościach, promocjach, konkursach i wydarzeniach Familock/Szpilplac. <a href="mailing.html" target="_blank" rel="noopener">Więcej o mailingu</a>.</span></label>'+
      '<div class="szp-mailing-actions">'+
      '<button class="btn secondary" type="button" id="szpSaveMarketing">Zapisz zgodę</button>'+
      '<span class="szp-mailing-msg" id="szpMailingMsg"></span>'+
      '</div>';

    var actions=profile.querySelector(".profile-actions");
    if(actions)actions.insertAdjacentElement("afterend",box);
    else profile.appendChild(box);

    document.getElementById("szpSaveMarketing").addEventListener("click",saveConsent);
    return box;
  }

  function setMsg(text,ok){
    var el=document.getElementById("szpMailingMsg");
    if(!el)return;
    el.textContent=text||"";
    el.style.color=ok?"var(--ok)":"var(--ink2)";
  }

  async function hasSession(){
    var client=createClient();
    if(!client)return false;
    try{
      var r=await client.auth.getSession();
      return !!(r&&r.data&&r.data.session);
    }catch(e){return false;}
  }

  async function loadConsent(){
    if(!ensureBox())return;
    var client=createClient();
    if(!client)return;

    if(!(await hasSession()))return;

    try{
      var res=await client.rpc("szpilplac_get_my_marketing_consent");
      if(res.error)throw res.error;
      var row=(res.data&&res.data[0])||null;
      var cb=document.getElementById("szpMarketingConsent");
      if(cb)cb.checked=!!(row&&row.marketing_consent);
      if(row&&row.marketing_consent_at){
        setMsg("Zgoda zapisana: "+new Date(row.marketing_consent_at).toLocaleString("pl-PL"),true);
      }else{
        setMsg("Brak aktywnej zgody marketingowej.",false);
      }
    }catch(err){
      setMsg("Nie udało się odczytać zgody. Uruchom SQL v20.",false);
      console.warn("mailing consent load error",err);
    }
  }

  async function saveConsent(){
    var client=createClient();
    if(!client)return;
    var cb=document.getElementById("szpMarketingConsent");
    var btn=document.getElementById("szpSaveMarketing");
    if(!cb||!btn)return;

    btn.disabled=true;
    setMsg("Zapisuję...",false);

    try{
      var res=await client.rpc("szpilplac_set_marketing_consent",{p_marketing_consent:!!cb.checked});
      if(res.error)throw res.error;
      if(cb.checked)setMsg("Zgoda marketingowa zapisana.",true);
      else setMsg("Zgoda marketingowa wycofana.",true);
    }catch(err){
      setMsg("Nie udało się zapisać zgody.",false);
      console.warn("mailing consent save error",err);
    }finally{
      btn.disabled=false;
    }
  }

  function boot(){
    console.info("Szpilplac konto-mailing-bridge.js v20");
    injectStyle();

    var tries=0;
    var timer=setInterval(function(){
      tries++;
      ensureBox();
      if(document.getElementById("profileCard")){
        loadConsent();
        clearInterval(timer);
      }
      if(tries>60)clearInterval(timer);
    },300);

    window.addEventListener("focus",loadConsent);
    document.addEventListener("visibilitychange",function(){if(!document.hidden)loadConsent();});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
