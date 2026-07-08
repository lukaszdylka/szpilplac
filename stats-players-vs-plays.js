/*
  Szpilplac stats-players-vs-plays.js v1
  Dodaje do stats.html sekcję "Rozgrywki wszystkich graczy".
*/
(function(){
  "use strict";

  var VERSION = "v1";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var sb = null;

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function num(v){var n = Number(v);return Number.isFinite(n) ? n : 0;}
  function fmtInt(v){return new Intl.NumberFormat("pl-PL").format(num(v));}
  function fmtPct(v){return fmtInt(v) + "%";}
  function fmtDate(v){if(!v)return "—";try{return new Date(v).toLocaleString("pl-PL");}catch(e){return String(v);}}
  function gameName(v){
    var k = String(v || "").toLowerCase();
    return {slowko:"Słōwko",klodka:"Kłōdka",zorta:"Raja",raja:"Raja",cuzamen:"Cuzamen"}[k] || v;
  }

  function client(){
    if(sb)return sb;
    if(window.sb){sb = window.sb;return sb;}
    var cfg = window.SZPILPLAC_CONFIG || {};
    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase)return null;
    sb = window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
      auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}
    });
    return sb;
  }

  async function tryView(name,limit){
    try{
      var c = client();
      if(!c)return {ok:false,data:[],error:"no_client"};
      var q = c.from(name).select("*");
      if(limit)q = q.limit(limit);
      var r = await q;
      if(r.error)throw r.error;
      return {ok:true,data:r.data || []};
    }catch(e){
      console.warn("Stats all plays skipped",name,e.message || e);
      return {ok:false,data:[],error:e.message || String(e)};
    }
  }

  function stat(label,value,hint){
    return '<div class="stat"><div class="label">'+esc(label)+'</div><div class="value">'+esc(value)+'</div>'+(hint?'<div class="hint">'+esc(hint)+'</div>':'')+'</div>';
  }

  function table(rows){
    if(!rows || !rows.length)return '<div class="empty">Brak danych o rozgrywkach wszystkich graczy.</div>';
    var cols = [
      ["game","Gra",function(v){return gameName(v);}],
      ["plays_today","Gry dziś",fmtInt],
      ["players_today","Gracze dziś",fmtInt],
      ["plays_7d","Gry 7 dni",fmtInt],
      ["players_7d","Gracze 7 dni",fmtInt],
      ["plays_30d","Gry 30 dni",fmtInt],
      ["players_30d","Gracze 30 dni",fmtInt],
      ["plays","Gry razem",fmtInt],
      ["players_devices","Gracze/urządzenia",fmtInt],
      ["wins","Wygrane",fmtInt],
      ["win_pct","Skuteczność",fmtPct],
      ["last_play","Ostatnia gra",fmtDate]
    ];
    return '<div class="table-wrap"><table><thead><tr>'+
      cols.map(function(c){return '<th>'+esc(c[1])+'</th>';}).join("")+
      '</tr></thead><tbody>'+
      rows.map(function(r){
        return '<tr>'+cols.map(function(c){
          var v = r[c[0]];
          return '<td>'+esc(c[2] ? c[2](v) : v)+'</td>';
        }).join("")+'</tr>';
      }).join("")+
      '</tbody></table></div>';
  }

  function ensureSection(){
    var existing = document.getElementById("allPlaysCard");
    if(existing)return existing;
    var events = document.getElementById("eventsCard");
    var section = document.createElement("section");
    section.className = "card hidden";
    section.id = "allPlaysCard";
    section.innerHTML =
      '<h2>Rozgrywki wszystkich graczy</h2>'+
      '<p class="muted">Tu liczymy także osoby bez konta. „Gracze” oznaczają unikalne urządzenia/przeglądarki z anonimowym identyfikatorem, nie formalne konta.</p>'+
      '<div id="allPlaysOverview" style="margin:12px 0;"></div>'+
      '<div id="allPlaysByGame"></div>';
    if(events && events.parentNode)events.parentNode.insertBefore(section,events);
    else{var main=document.querySelector("main");if(main)main.appendChild(section);}
    return section;
  }

  async function render(){
    var section = ensureSection();
    if(!section)return;
    var overview = await tryView("stats_admin_all_plays_overview",1);
    var byGame = await tryView("stats_admin_all_plays_by_game",40);
    if(!overview.ok && !byGame.ok){section.classList.add("hidden");return;}
    var o = overview.data && overview.data[0] ? overview.data[0] : {};
    document.getElementById("allPlaysOverview").innerHTML =
      '<div class="grid">'+
        stat("Gry dziś",fmtInt(o.plays_today || 0),"wszystkie zakończone gry")+
        stat("Gracze dziś",fmtInt(o.players_today || 0),"unikalne urządzenia")+
        stat("Gry 7 dni",fmtInt(o.plays_7d || 0),"ostatnie 7 dni")+
        stat("Gracze 7 dni",fmtInt(o.players_7d || 0),"unikalne urządzenia")+
        stat("Gry 30 dni",fmtInt(o.plays_30d || 0),"ostatnie 30 dni")+
        stat("Gracze 30 dni",fmtInt(o.players_30d || 0),"unikalne urządzenia")+
        stat("Wygrane",fmtInt(o.wins || 0),"wszystkie gry")+
        stat("Skuteczność",fmtPct(o.win_pct || 0),"wygrane / gry")+
      '</div>';
    document.getElementById("allPlaysByGame").innerHTML = table(byGame.data || []);
    section.classList.remove("hidden");
  }

  function schedule(){
    setTimeout(render,1200);
    setTimeout(render,2600);
    var btn = document.getElementById("refreshBtn");
    if(btn)btn.addEventListener("click",function(){setTimeout(render,1800);});
  }

  console.info("Szpilplac stats-players-vs-plays.js " + VERSION);
  if(document.readyState === "loading")document.addEventListener("DOMContentLoaded",schedule);
  else schedule();
})();
