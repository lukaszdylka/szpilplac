/*
  Szpilplac Ranking Rules v41
  ---------------------------
  Rozbudowuje sekcję „Jak liczymy?” w ranking.html.
*/

(function(){
  "use strict";

  var VERSION = "v41";

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }

  function lang(){
    try{
      var l = localStorage.getItem("familock_lang") || document.documentElement.lang || "pl";
      return l === "szl" ? "szl" : "pl";
    }catch(e){
      return "pl";
    }
  }

  function injectStyle(){
    if(document.getElementById("szpRankingRulesStyle"))return;

    var style = document.createElement("style");
    style.id = "szpRankingRulesStyle";
    style.textContent = `
      .szp-rules-card{
        overflow:hidden;
      }

      .szp-rules-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
        margin-bottom:12px;
      }

      .szp-rules-head h2{
        margin:0 0 5px;
      }

      .szp-rules-lead{
        margin:0;
        color:var(--ink2,#6a6150);
        font-size:12.5px;
        line-height:1.5;
      }

      .szp-rules-mark{
        flex:0 0 auto;
        width:44px;
        height:44px;
        border-radius:14px;
        display:grid;
        place-items:center;
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface2,#f3ecda);
        color:var(--green,#2f4a39);
      }

      .szp-rules-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        margin-top:12px;
      }

      .szp-rule-box{
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface2,#f3ecda);
        border-radius:14px;
        padding:12px;
      }

      .szp-rule-box.wide{
        grid-column:1 / -1;
      }

      .szp-rule-title{
        font-family:Oswald,system-ui,sans-serif;
        font-size:17px;
        text-transform:uppercase;
        letter-spacing:.03em;
        color:var(--ink,#23201a);
        line-height:1;
        margin-bottom:7px;
      }

      .szp-rule-text{
        color:var(--ink2,#6a6150);
        font-size:12px;
        line-height:1.45;
      }

      .szp-rule-list{
        list-style:none;
        padding:0;
        margin:8px 0 0;
        display:grid;
        gap:5px;
      }

      .szp-rule-list li{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:8px;
        border-top:1px dashed var(--line,#c9bfa6);
        padding-top:5px;
        font-size:12px;
        color:var(--ink2,#6a6150);
      }

      .szp-rule-list li:first-child{
        border-top:0;
        padding-top:0;
      }

      .szp-rule-list b{
        color:var(--ink,#23201a);
        font-weight:900;
      }

      .szp-rule-list span:last-child{
        text-align:right;
        white-space:nowrap;
        font-weight:900;
        color:var(--green,#2f4a39);
      }

      .szp-rank-track{
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        margin-top:9px;
      }

      .szp-rank-pill{
        border:1px solid var(--line,#c9bfa6);
        background:var(--surface,#fbf7ee);
        border-radius:999px;
        padding:7px 10px;
        font-size:11px;
        font-weight:900;
        color:var(--ink,#23201a);
      }

      .szp-rank-pill small{
        color:var(--ink2,#6a6150);
        font-weight:800;
        margin-left:4px;
      }

      .szp-rules-note{
        margin-top:12px;
        border:1px solid rgba(191,138,58,.42);
        background:rgba(191,138,58,.10);
        color:var(--ink2,#6a6150);
        border-radius:13px;
        padding:10px 11px;
        font-size:12px;
        line-height:1.45;
      }

      .szp-rules-note b{
        color:var(--ink,#23201a);
      }

      @media(max-width:520px){
        .szp-rules-grid{
          grid-template-columns:1fr;
        }

        .szp-rules-head{
          align-items:center;
        }

        .szp-rules-mark{
          width:38px;
          height:38px;
          border-radius:12px;
        }

        .szp-rule-list li{
          display:block;
        }

        .szp-rule-list span:last-child{
          display:block;
          text-align:left;
          margin-top:2px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  var COPY = {
    pl:{
      title:"Jak działa punktacja?",
      lead:"Ranking premiuje dobre wyniki, ale też regularne wracanie do gier. Im mniej prób i podpowiedzi, tym więcej punktów.",
      generalTitle:"Najważniejsze zasady",
      generalText:"Konto nie jest wymagane do gry, ale tylko konto zapisuje wynik do rankingu. Jeżeli gracz ukryje profil, nie będzie widoczny publicznie.",
      slowkoTitle:"Słōwko",
      slowkoText:"Codzienne hasło. Najwięcej punktów dostaje się za szybkie odgadnięcie.",
      klodkaTitle:"Kłōdka",
      klodkaText:"Kod dnia i tygodniówka. Mniej prób oznacza więcej punktów.",
      rajaTitle:"Raja",
      rajaText:"Tygodniowa układanka. Podpowiedź pomaga, ale obniża wynik.",
      ranksTitle:"Rangi",
      ranksText:"Rangi pokazują łączny postęp gracza. Pierwszy awans jest szybki, kolejne wymagają coraz więcej regularnej gry.",
      note:"Punktacja może być jeszcze delikatnie dostrajana, ale zasada zostaje taka sama: lepszy wynik, mniej prób i regularna gra dają wyższą pozycję.",
      account:"Wyniki zapisują się tylko na koncie gracza.",
      archive:"Archiwalne gry służą do zabawy i ćwiczenia — ranking opiera się na aktualnych grach.",
      hidden:"Gracz może ukryć się z publicznego rankingu w profilu.",
      hint:"Podpowiedzi obniżają wynik, ale nie psują zabawy.",
      slowkoRows:[
        ["1. próba","100 pkt"],
        ["2. próba","85 pkt"],
        ["3. próba","70 pkt"],
        ["4. próba","55 pkt"],
        ["5. próba","40 pkt"],
        ["6. próba","25 pkt"],
        ["Nieudane podejście","5 pkt"],
        ["Podpowiedź","-15 pkt"]
      ],
      klodkaRows:[
        ["Kłōdka dzienna","do 120 pkt"],
        ["Kłōdka tygodniowa","do 150 pkt"],
        ["Kolejne próby","mniej punktów"],
        ["Nieudane podejście","5 pkt"]
      ],
      rajaRows:[
        ["1. próba","150 pkt"],
        ["2. próba","120 pkt"],
        ["3. próba","90 pkt"],
        ["4. próba","60 pkt"],
        ["Nieudane podejście","5 pkt"],
        ["Podpowiedź","-25 pkt"]
      ],
      ranks:[
        ["Gorol","0 pkt"],
        ["Bajtel","100 pkt"],
        ["Karlus","500 pkt"],
        ["Chop","1500 pkt"],
        ["Grubiorz","4000 pkt"],
        ["Hajer","8000 pkt"],
        ["Przodowy","15000 pkt"],
        ["Sztajger","25000 pkt"]
      ]
    },
    szl:{
      title:"Jak funguje punktacyjo?",
      lead:"Ranking daje punkty za dobre wyniki i regularne wracanie do szpilōw. Im mynij prōb i podpowiedzi, tym wiyncyj punktōw.",
      generalTitle:"Nojważniyjsze zasady",
      generalText:"Kōnto niy je potrzebne do szpilu, ale ino kōnto spamiyntuje wynik w rankingu. Jak gracz skryje profil, niy bydzie widoczny publicznie.",
      slowkoTitle:"Słōwko",
      slowkoText:"Codziynne hasło. Nojwiyncyj punktōw je za gibkie ôdgadniyńcie.",
      klodkaTitle:"Kłōdka",
      klodkaText:"Kod dnia i tydniōwka. Mynij prōb znaczy wiyncyj punktōw.",
      rajaTitle:"Raja",
      rajaText:"Tydniowo ukłŏdanka. Podpowiydź pōmoże, ale ôbnizŏ wynik.",
      ranksTitle:"Rangi",
      ranksText:"Rangi pokŏzujōm postymp gracza. Piyrszy awans je gibki, dalsze trza już wyszpilać regularnie.",
      note:"Punktacyjo może być jeszcze lekko rychtowano, ale zasada zostaje tako sama: lepszy wynik, mynij prōb i regularno gra dajōm wyższe miejsce.",
      account:"Wyniki spamiyntujōm sie ino na kōncie gracza.",
      archive:"Archiwalne szpile sōm do zabawy i ćwiczynio — ranking opiyrŏ sie na aktualnych szpilach.",
      hidden:"Gracz może sie skryć z publicznego rankingu w profilu.",
      hint:"Podpowiydzi ôbnizajōm wynik, ale niy psujōm zabawy.",
      slowkoRows:[
        ["1. prōba","100 pkt"],
        ["2. prōba","85 pkt"],
        ["3. prōba","70 pkt"],
        ["4. prōba","55 pkt"],
        ["5. prōba","40 pkt"],
        ["6. prōba","25 pkt"],
        ["Niyudany szpil","5 pkt"],
        ["Podpowiydź","-15 pkt"]
      ],
      klodkaRows:[
        ["Kłōdka dziynno","do 120 pkt"],
        ["Kłōdka tydniowo","do 150 pkt"],
        ["Dalsze prōby","mynij punktōw"],
        ["Niyudany szpil","5 pkt"]
      ],
      rajaRows:[
        ["1. prōba","150 pkt"],
        ["2. prōba","120 pkt"],
        ["3. prōba","90 pkt"],
        ["4. prōba","60 pkt"],
        ["Niyudany szpil","5 pkt"],
        ["Podpowiydź","-25 pkt"]
      ],
      ranks:[
        ["Gorol","0 pkt"],
        ["Bajtel","100 pkt"],
        ["Karlus","500 pkt"],
        ["Chop","1500 pkt"],
        ["Grubiorz","4000 pkt"],
        ["Hajer","8000 pkt"],
        ["Przodowy","15000 pkt"],
        ["Sztajger","25000 pkt"]
      ]
    }
  };

  function rows(items){
    return '<ul class="szp-rule-list">'+items.map(function(item){
      return '<li><span>'+esc(item[0])+'</span><span>'+esc(item[1])+'</span></li>';
    }).join("")+'</ul>';
  }

  function findRulesCard(){
    var h = Array.prototype.slice.call(document.querySelectorAll("section.card h2")).find(function(el){
      var text = String(el.textContent || "").toLowerCase();
      var i18n = el.getAttribute("data-i18n") || "";
      return i18n === "howTitle" || text.indexOf("jak liczymy") !== -1 || text.indexOf("punkt") !== -1;
    });

    if(h)return h.closest("section.card");

    var main = document.querySelector("main");
    if(!main)return null;

    var card = document.createElement("section");
    card.className = "card";
    main.appendChild(card);
    return card;
  }

  function render(){
    injectStyle();

    var card = findRulesCard();
    if(!card)return;

    var c = COPY[lang()] || COPY.pl;
    card.classList.add("szp-rules-card");

    card.innerHTML =
      '<div class="szp-rules-head">'+
        '<div>'+
          '<h2>'+esc(c.title)+'</h2>'+
          '<p class="szp-rules-lead">'+esc(c.lead)+'</p>'+
        '</div>'+
        '<div class="szp-rules-mark" aria-hidden="true">'+
          '<svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+
            '<path d="M4 17V9"/><path d="M10 17V4"/><path d="M16 17v-6"/><path d="M3 17h14"/>'+
          '</svg>'+
        '</div>'+
      '</div>'+

      '<div class="szp-rules-grid">'+
        '<div class="szp-rule-box wide">'+
          '<div class="szp-rule-title">'+esc(c.generalTitle)+'</div>'+
          '<div class="szp-rule-text">'+esc(c.generalText)+'</div>'+
          rows([[c.account,""],[c.archive,""],[c.hidden,""],[c.hint,""]]).replace(/<span><\/span>/g,"")+
        '</div>'+

        '<div class="szp-rule-box">'+
          '<div class="szp-rule-title">'+esc(c.slowkoTitle)+'</div>'+
          '<div class="szp-rule-text">'+esc(c.slowkoText)+'</div>'+
          rows(c.slowkoRows)+
        '</div>'+

        '<div class="szp-rule-box">'+
          '<div class="szp-rule-title">'+esc(c.klodkaTitle)+'</div>'+
          '<div class="szp-rule-text">'+esc(c.klodkaText)+'</div>'+
          rows(c.klodkaRows)+
        '</div>'+

        '<div class="szp-rule-box">'+
          '<div class="szp-rule-title">'+esc(c.rajaTitle)+'</div>'+
          '<div class="szp-rule-text">'+esc(c.rajaText)+'</div>'+
          rows(c.rajaRows)+
        '</div>'+

        '<div class="szp-rule-box">'+
          '<div class="szp-rule-title">'+esc(c.ranksTitle)+'</div>'+
          '<div class="szp-rule-text">'+esc(c.ranksText)+'</div>'+
          '<div class="szp-rank-track">'+c.ranks.map(function(r){return '<span class="szp-rank-pill">'+esc(r[0])+'<small>'+esc(r[1])+'</small></span>';}).join("")+'</div>'+
        '</div>'+
      '</div>'+

      '<div class="szp-rules-note"><b>'+esc(c.title)+'</b><br>'+esc(c.note)+'</div>';
  }

  function boot(){
    console.info("Szpilplac ranking-rules.js " + VERSION);
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if(document.querySelector("main")){
        clearInterval(timer);
        render();
      }
      if(tries > 80)clearInterval(timer);
    }, 120);

    ["lPl","lSzl"].forEach(function(id){
      var btn = document.getElementById(id);
      if(btn && !btn.dataset.rulesV41){
        btn.dataset.rulesV41 = "1";
        btn.addEventListener("click", function(){
          setTimeout(render, 80);
          setTimeout(render, 300);
        });
      }
    });

    window.addEventListener("pageshow", function(){setTimeout(render, 120);});
  }

  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();