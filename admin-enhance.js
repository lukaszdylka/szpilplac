/* Szpilplac admin-enhance.js v1
   Bezpieczna nakładka na admin.html:
   - dodaje szybkie działania,
   - nie zapisuje nic w bazie,
   - nie zmienia logiki istniejących paneli.
*/
(function(){
  "use strict";
  var VERSION = "v1";
  var mounted = false;

  function esc(x){
    return String(x == null ? "" : x).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function injectStyle(){
    if(document.getElementById("adminEnhanceStyle"))return;
    var s = document.createElement("style");
    s.id = "adminEnhanceStyle";
    s.textContent = `
      .admin-fast-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .admin-fast-card{padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--surface2);min-width:0}
      .admin-fast-card h3{margin:0 0 6px;font-family:Oswald,system-ui,sans-serif;font-size:18px;line-height:1;text-transform:uppercase;letter-spacing:.03em}
      .admin-fast-card p{margin:0 0 10px;color:var(--ink2);font-size:12px;line-height:1.45}
      .admin-fast-actions{display:flex;flex-wrap:wrap;gap:7px}
      .admin-fast-actions a,.admin-fast-actions button{
        min-height:34px;display:inline-flex;align-items:center;justify-content:center;
        padding:7px 10px;border:1px solid var(--line);border-radius:999px;background:var(--surface);
        color:var(--ink);font-size:11.5px;font-weight:900;text-decoration:none;cursor:pointer
      }
      .admin-fast-actions a:hover,.admin-fast-actions button:hover{color:var(--green);border-color:rgba(191,138,58,.65);transform:translateY(-1px)}
      .admin-fast-note{margin-top:10px;color:var(--ink2);font-size:11.5px;line-height:1.45}
      .admin-mini-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .admin-mini-tools button,.admin-mini-tools a{
        min-height:36px;display:inline-flex;align-items:center;justify-content:center;padding:8px 11px;
        border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:var(--ink);font-size:12px;font-weight:900;text-decoration:none;cursor:pointer
      }
      .admin-mini-tools button:hover,.admin-mini-tools a:hover{background:var(--surface);color:var(--green)}
      .admin-toast{
        position:fixed;left:50%;bottom:18px;z-index:9999;transform:translateX(-50%);
        max-width:min(520px,calc(100vw - 24px));padding:11px 13px;border:1px solid var(--line);
        border-radius:14px;background:var(--surface);color:var(--ink);box-shadow:0 20px 50px -30px rgba(0,0,0,.7);
        font-size:12.5px;font-weight:800;line-height:1.4;display:none
      }
      .admin-toast.show{display:block}
      @media(max-width:980px){.admin-fast-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.admin-fast-grid{grid-template-columns:1fr}.admin-fast-actions a,.admin-fast-actions button{width:100%}.admin-mini-tools{display:grid}.admin-mini-tools button,.admin-mini-tools a{width:100%}}
    `;
    document.head.appendChild(s);
  }
  function toast(text){
    var el = document.getElementById("adminEnhanceToast");
    if(!el){
      el = document.createElement("div");
      el.id = "adminEnhanceToast";
      el.className = "admin-toast";
      document.body.appendChild(el);
    }
    el.textContent = text || "";
    el.classList.add("show");
    clearTimeout(el.__t);
    el.__t = setTimeout(function(){el.classList.remove("show");},3600);
  }
  function copyText(text,ok){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){toast(ok || "Skopiowano.");}).catch(function(){fallbackCopy(text,ok);});
    }else fallbackCopy(text,ok);
  }
  function fallbackCopy(text,ok){
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{document.execCommand("copy");toast(ok || "Skopiowano.");}
    catch(e){toast("Nie udało się skopiować. Zaznacz ręcznie z konsoli.");}
    ta.remove();
  }
  function card(title,desc,actions){
    return '<article class="admin-fast-card"><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p><div class="admin-fast-actions">'+actions.map(function(a){
      if(a.copy)return '<button type="button" data-copy="'+esc(a.copy)+'">'+esc(a.label)+'</button>';
      return '<a href="'+esc(a.href)+'" '+(a.blank?'target="_blank" rel="noopener"':'')+'>'+esc(a.label)+'</a>';
    }).join("")+'</div></article>';
  }
  function mount(){
    if(mounted)return;
    var hub = document.getElementById("hubCard");
    if(!hub || hub.classList.contains("hidden"))return;
    mounted = true;
    injectStyle();

    var html = '<section class="card" id="adminFastCard">'+
      '<div class="section-title"><h2>Szybkie działania</h2><span class="section-note">Najczęstsze rzeczy pod ręką — bez zapisu w bazie z tej nakładki.</span></div>'+
      '<div class="admin-fast-grid">'+
        card("Treści i start","Nowości, strona główna i komunikat pierwszego wejścia.",[
          {label:"Nowości",href:"nowosci.html"},
          {label:"Strona główna",href:"index.html"},
          {label:"Kod resetu okienka",copy:"SZP_WELCOME_MODAL.reset(); location.reload();"}
        ])+
        card("Gry dzienne","Podpowiedzi, wyniki i szybkie wejście do gier.",[
          {label:"Podpowiedzi",href:"podpowiedzi.html"},
          {label:"Wyniki gier",href:"game-results-admin.html"},
          {label:"Kłōdka tyg.",href:"podpowiedzi_klodka_tygodniowki.html"}
        ])+
        card("Społeczność","Ranking, kamraty, odznaki i avatar gracza.",[
          {label:"Ranking",href:"ranking.html"},
          {label:"Odznaki",href:"odznaki-admin.html"},
          {label:"Avatary",href:"avatar-admin.html"}
        ])+
        card("Kontrola","Statystyki, mailing i diagnostyka techniczna.",[
          {label:"Statystyki",href:"stats.html"},
          {label:"Mailing",href:"mailing-admin.html"},
          {label:"Auth",href:"auth-diagnostyka.html"}
        ])+
      '</div>'+
      '<div class="admin-mini-tools">'+
        '<button type="button" data-admin-hard-refresh>Odśwież panel</button>'+
        '<button type="button" data-copy="git status\\ngit add -A\\ngit commit -m \\"Update Szpilplac\\"\\ngit push origin main">Kopiuj mini-commit</button>'+
        '<button type="button" data-copy="Ctrl+F5, potem sprawdź: index.html, ranking.html, konto.html, gracz.html, stats.html">Kopiuj checklistę testu</button>'+
        '<a href="https://supabase.com/dashboard" target="_blank" rel="noopener">Supabase</a>'+
      '</div>'+
      '<p class="admin-fast-note">To jest bezpieczna warstwa skrótów. Prawdziwe edytory treści robimy dalej jako osobne panele, żeby nie mieszać logiki i nie psuć istniejących gier.</p>'+
    '</section>';

    hub.insertAdjacentHTML("beforebegin",html);

    document.addEventListener("click",function(e){
      var copy = e.target && e.target.closest ? e.target.closest("[data-copy]") : null;
      if(copy){copyText(copy.getAttribute("data-copy"),"Skopiowano do schowka.");return;}
      var ref = e.target && e.target.closest ? e.target.closest("[data-admin-hard-refresh]") : null;
      if(ref){location.reload();return;}
    });
    console.info("Szpilplac admin-enhance.js "+VERSION);
  }
  function scan(){mount();}
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",scan); else scan();
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  setInterval(scan,1500);
})();
