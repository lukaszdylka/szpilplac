/* Szpilplac konto-bottom-foldouts v1
   Przenosi dynamiczne moduły konta do natywnych dolnych <details>.
   Nie przechwytuje kliknięć i nie blokuje elementów w środku. */
(function(){
  "use strict";
  var VERSION = "v1";
  var installed = false;
  var ticking = false;
  function isKonto(){ return location.pathname.indexOf("konto") !== -1; }
  function ensureShell(){
    if(!isKonto()) return null;
    var profile = document.getElementById("profileCard");
    if(!profile) return null;
    var wrap = document.getElementById("kontoBottomFoldouts");
    if(!wrap){
      wrap = document.createElement("section");
      wrap.id = "kontoBottomFoldouts";
      wrap.className = "konto-bottom-foldouts";
      wrap.setAttribute("aria-label","Kamraty i powiadomienia");
      wrap.innerHTML = '<details class="konto-bottom-foldout" id="kontoKamratyFoldout"><summary><span>Kamraty z placu<small>Profil publiczny, reakcje i porównania z kamratami.</small></span></summary><div class="konto-bottom-foldout-body" id="kontoKamratySlot"><div class="muted">Ładuję Kamratów z placu...</div></div></details><details class="konto-bottom-foldout" id="kontoNotificationsFoldout"><summary><span>Powiadomienia<small>Ustawienia PWA, przypomnień i typów powiadomień.</small></span></summary><div class="konto-bottom-foldout-body" id="kontoNotificationsSlot"><div class="muted">Ładuję powiadomienia...</div></div></details>';
      profile.appendChild(wrap);
    }
    return wrap;
  }
  function clearPlaceholder(slot){
    if(!slot) return;
    var first = slot.firstElementChild;
    if(first && first.classList && first.classList.contains("muted") && slot.children.length === 1) first.remove();
  }
  function moveInto(slot,node){
    if(!slot || !node) return false;
    if(node === slot || node.contains(slot)) return false;
    if(node.parentNode === slot) return false;
    clearPlaceholder(slot);
    slot.appendChild(node);
    return true;
  }
  function tick(){
    if(!isKonto()) return;
    var shell = ensureShell();
    if(!shell) return;
    moveInto(document.getElementById("kontoKamratySlot"), document.getElementById("kamratyPanel"));
    moveInto(document.getElementById("kontoNotificationsSlot"), document.getElementById("szpNotifyCard"));
    var profile = document.getElementById("profileCard");
    if(profile && shell.parentNode === profile && profile.lastElementChild !== shell) profile.appendChild(shell);
  }
  function schedule(){
    if(ticking) return;
    ticking = true;
    setTimeout(function(){ ticking = false; tick(); }, 80);
  }
  function boot(){
    if(installed) return;
    installed = true;
    tick();
    var n = 0;
    var timer = setInterval(function(){ n++; tick(); if(n >= 30) clearInterval(timer); }, 500);
    try{ new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  }
  window.SZP_KONTO_BOTTOM_FOLDOUTS = {version:VERSION, refresh:tick};
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
