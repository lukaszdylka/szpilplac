/*
  Szpilplac Konto Legal Bridge v19
  --------------------------------
  Automatyzuje formularz rejestracji:
  - podmienia checkbox regulaminu na wersję z linkami,
  - podmienia zgodę marketingową na dokładną treść,
  - ustawia wersje dokumentów na 2026-06-30,
  - dodaje linki prawne do stopki konta,
  - nie rusza logiki logowania, profilu, rankingu ani Supabase.

  Wgraj plik i dołącz w konto.html przed </body>:
  <script src="konto-legal-bridge.js?v=19"></script>
*/

(function(){
  "use strict";

  var TERMS_VERSION = "2026-06-30";
  var PRIVACY_VERSION = "2026-06-30";

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }

  function stopLinkToggle(){
    document.querySelectorAll(".szp-legal-inline a").forEach(function(a){
      a.addEventListener("click",function(e){
        e.stopPropagation();
      });
    });
  }

  function setDocumentVersions(){
    try{
      window.TERMS_VERSION = TERMS_VERSION;
      window.PRIVACY_VERSION = PRIVACY_VERSION;
    }catch(e){}
  }

  function injectStyle(){
    if(document.getElementById("szpKontoLegalStyle"))return;

    var style=document.createElement("style");
    style.id="szpKontoLegalStyle";
    style.textContent=
      ".szp-legal-inline a{color:var(--green);font-weight:900;text-decoration:underline;text-underline-offset:2px}" +
      ".szp-legal-note{font-size:11.5px;line-height:1.45;color:var(--ink2);background:var(--surface2);border:1px dashed var(--line);border-radius:10px;padding:10px 11px;margin-top:-3px}" +
      ".szp-legal-note b{color:var(--ink)}" +
      ".szp-legal-footer{width:100%;max-width:520px;margin:12px auto 0;text-align:center;color:var(--ink2);font-size:11.5px;line-height:1.7}" +
      ".szp-legal-footer nav{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}" +
      ".szp-legal-footer a{color:var(--green);font-weight:900;text-decoration:none}" +
      ".szp-legal-footer a:hover{text-decoration:underline}";
    document.head.appendChild(style);
  }

  function patchCheckboxes(){
    var terms = document.getElementById("regTerms");
    var marketing = document.getElementById("regMarketing");

    if(terms){
      terms.required = true;
      var termsLabel = terms.closest("label");
      if(termsLabel && !termsLabel.dataset.legalPatched){
        termsLabel.dataset.legalPatched = "1";
        var span = termsLabel.querySelector("span") || document.createElement("span");
        span.className = "szp-legal-inline";
        span.innerHTML =
          'Akceptuję <a href="regulamin.html" target="_blank" rel="noopener">Regulamin Szpilplaca</a> ' +
          'i zapoznałem/am się z <a href="polityka-prywatnosci.html" target="_blank" rel="noopener">Polityką prywatności</a>.';
        if(!span.parentNode)termsLabel.appendChild(span);
      }
    }

    if(marketing){
      marketing.required = false;
      var marketingLabel = marketing.closest("label");
      if(marketingLabel && !marketingLabel.dataset.legalPatched){
        marketingLabel.dataset.legalPatched = "1";
        var mspan = marketingLabel.querySelector("span") || document.createElement("span");
        mspan.className = "szp-legal-inline";
        mspan.innerHTML =
          'Chcę otrzymywać e-mailem informacje o nowościach, promocjach, konkursach i wydarzeniach Familock/Szpilplac. ' +
          '<a href="mailing.html" target="_blank" rel="noopener">Więcej o mailingu</a>.';
        if(!mspan.parentNode)marketingLabel.appendChild(mspan);

        if(!document.getElementById("szpMarketingLegalNote")){
          var note=document.createElement("div");
          note.id="szpMarketingLegalNote";
          note.className="szp-legal-note";
          note.innerHTML='<b>Zgoda marketingowa jest dobrowolna.</b> Możesz założyć konto bez tej zgody. Na obecnym etapie zgoda może być zapisywana w bazie, a właściwy mailing zostanie podłączony osobno.';
          marketingLabel.insertAdjacentElement("afterend",note);
        }
      }
    }

    stopLinkToggle();
  }

  function patchValidationMessage(){
    var form = document.getElementById("registerForm");
    var terms = document.getElementById("regTerms");
    if(!form || !terms || form.dataset.legalSubmitPatched)return;

    form.dataset.legalSubmitPatched = "1";

    form.addEventListener("submit",function(e){
      if(!terms.checked){
        try{
          terms.setCustomValidity("Akceptacja regulaminu i zapoznanie się z polityką prywatności są wymagane do założenia konta.");
          terms.reportValidity();
          setTimeout(function(){terms.setCustomValidity("");},2000);
        }catch(err){}
      }
    }, true);
  }

  function injectFooterLinks(){
    if(document.getElementById("szpKontoLegalFooter"))return;

    var box=document.createElement("div");
    box.id="szpKontoLegalFooter";
    box.className="szp-legal-footer";
    box.innerHTML='<nav>' +
      '<a href="regulamin.html">Regulamin</a>' +
      '<span>·</span>' +
      '<a href="polityka-prywatnosci.html">Prywatność</a>' +
      '<span>·</span>' +
      '<a href="cookies.html">Cookies</a>' +
      '<span>·</span>' +
      '<a href="mailing.html">Mailing</a>' +
      '</nav>';

    var footer=document.querySelector("footer");
    if(footer)footer.appendChild(box);
    else document.body.appendChild(box);
  }

  function boot(){
    console.info("Szpilplac konto-legal-bridge.js v19");
    injectStyle();
    setDocumentVersions();
    patchCheckboxes();
    patchValidationMessage();
    injectFooterLinks();

    // Po przełączeniu zakładek albo dynamicznym odświeżeniu profilu niczego nie dublujemy,
    // ale kontrolnie odświeżamy stan formularza.
    setTimeout(function(){
      setDocumentVersions();
      patchCheckboxes();
      patchValidationMessage();
      injectFooterLinks();
    },300);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
