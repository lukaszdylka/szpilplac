/* Szpilplac achievement-toast.js v114 */
(function(){
  "use strict";

  var VERSION = "v114";
  var queue = [];
  var showing = false;
  var seen = {};

  function inRaja(){
    return /\/raja\/?/.test(location.pathname);
  }
  function root(path){
    return (inRaja() ? "../" : "") + path;
  }
  function esc(x){
    return String(x == null ? "" : x).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function fallbackSvg(){
    return '<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#a3743d"/><path d="M52 58l10 34-12-6-10 6 6-30z" fill="#a3743d"/><circle cx="40" cy="40" r="36" fill="#c49050" stroke="#161310" stroke-width="2"/><circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/><g transform="translate(22,22) scale(1.5)" fill="none" stroke="#161310" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9z"/></g></svg>';
  }
  function injectStyle(){
    if(document.getElementById("szpAchievementToastStyle"))return;
    var st = document.createElement("style");
    st.id = "szpAchievementToastStyle";
    st.textContent =
      ".szp-ach-banner{position:fixed;right:18px;bottom:18px;z-index:10050;width:min(390px,calc(100vw - 28px));display:grid;grid-template-columns:58px 1fr;gap:12px;align-items:center;padding:14px 15px 16px;border:1px solid rgba(191,138,58,.82);border-radius:20px;background:var(--surface,#fbf7ee);color:var(--ink,#23201a);box-shadow:0 24px 70px -28px rgba(0,0,0,.78);overflow:hidden;opacity:0;transform:translateY(18px) scale(.985);pointer-events:auto;transition:opacity .18s ease,transform .18s ease}" +
      ".szp-ach-banner.on{opacity:1;transform:translateY(0) scale(1)}" +
      ".szp-ach-banner .ico{width:58px;height:68px;display:grid;place-items:center}" +
      ".szp-ach-banner .ico svg{width:58px;height:68px;display:block}" +
      ".szp-ach-banner .k{font-size:10.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--green,#2f4a39)}" +
      "[data-theme=dark] .szp-ach-banner .k{color:var(--gold,#d4a04a)}" +
      ".szp-ach-banner .t{margin-top:2px;font-family:Oswald,system-ui,sans-serif;font-size:23px;line-height:1.04;text-transform:uppercase;color:var(--ink,#23201a)}" +
      ".szp-ach-banner .d{margin-top:4px;font-size:12px;line-height:1.35;color:var(--ink2,#6a6150)}" +
      ".szp-ach-banner .go{display:inline-flex;margin-top:7px;font-size:12px;font-weight:900;color:var(--green,#2f4a39);text-decoration:underline;text-underline-offset:2px}" +
      "[data-theme=dark] .szp-ach-banner .go{color:var(--gold,#d4a04a)}" +
      ".szp-ach-banner .timer{position:absolute;left:0;bottom:0;height:4px;width:100%;background:var(--gold,#bf8a3a);transform-origin:left center;animation:szpAchTimer 5s linear forwards}" +
      "@keyframes szpAchTimer{from{transform:scaleX(1)}to{transform:scaleX(0)}}" +
      "@media(max-width:560px){.szp-ach-banner{left:12px;right:12px;bottom:12px;width:auto;grid-template-columns:50px 1fr;padding:12px 13px 15px}.szp-ach-banner .ico,.szp-ach-banner .ico svg{width:50px;height:60px}.szp-ach-banner .t{font-size:20px}}";
    document.head.appendChild(st);
  }
  function normalize(row){
    row = row || {};
    return {
      id: row.achievement_id || row.id || row.code || row.label || row.name || ("ach-" + Date.now()),
      label: row.label || row.name || "Nowa odznaka",
      description: row.description || "",
      svg: row.svg || row.iconSvg || ""
    };
  }
  function showNext(){
    if(showing)return;
    if(!queue.length)return;

    showing = true;
    injectStyle();

    var row = normalize(queue.shift());
    var id = String(row.id || row.label);
    if(seen[id]){
      showing = false;
      setTimeout(showNext,60);
      return;
    }
    seen[id] = true;

    var old = document.querySelector(".szp-ach-banner");
    if(old)old.remove();

    var el = document.createElement("div");
    el.className = "szp-ach-banner";
    el.setAttribute("role","status");
    el.setAttribute("aria-live","polite");
    el.innerHTML =
      '<div class="ico">'+(row.svg || fallbackSvg())+'</div>' +
      '<div class="body">' +
        '<div class="k">Nowa odznaka</div>' +
        '<div class="t">'+esc(row.label)+'</div>' +
        (row.description ? '<div class="d">'+esc(row.description)+'</div>' : '') +
        '<a class="go" href="'+root("konto.html")+'">Sprawdź w profilu</a>' +
      '</div>' +
      '<div class="timer" aria-hidden="true"></div>';

    document.body.appendChild(el);
    setTimeout(function(){el.classList.add("on");},30);
    setTimeout(function(){el.classList.remove("on");},5000);
    setTimeout(function(){
      if(el && el.parentNode)el.parentNode.removeChild(el);
      showing = false;
      setTimeout(showNext,180);
    },5250);
  }
  function show(row){
    if(!row)return;
    queue.push(row);
    showNext();
  }
  function showMany(rows){
    if(!Array.isArray(rows))return;
    rows.forEach(show);
  }

  window.SZP_ACHIEVEMENT_TOAST = {
    version:VERSION,
    show:show,
    showMany:showMany
  };

  console.info("Szpilplac achievement-toast.js " + VERSION);
})();
