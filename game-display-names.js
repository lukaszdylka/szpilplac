/*
  Szpilplac Game Display Names v25
  --------------------------------
  Publiczne nazwy gier w UI.
  Baza może dalej używać identyfikatorów technicznych, np. zorta.
*/

(function(){
  "use strict";

  var MAP = {
    "slowko": "Słōwko",
    "słōwko": "Słōwko",
    "klodka": "Kłōdka",
    "kłōdka": "Kłōdka",
    "zorta": "Raja",
    "raja": "Raja",
    "cuzamen": "Cuzamen"
  };

  function niceGameName(value){
    var raw = String(value == null ? "" : value);
    var key = raw.toLowerCase().trim();
    return MAP[key] || raw;
  }

  function replaceTextNode(node){
    if(!node || node.nodeType !== 3)return;

    var before = node.nodeValue;
    if(!before || before.toLowerCase().indexOf("zorta") === -1)return;

    var after = before
      .replace(/\bzorta\b/gi, "Raja")
      .replace(/\bZorta\b/g, "Raja");

    if(after !== before)node.nodeValue = after;
  }

  function walk(root){
    if(!root)return;

    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode:function(node){
          var p = node.parentNode;
          if(!p)return NodeFilter.FILTER_REJECT;
          var tag = p.nodeName ? p.nodeName.toLowerCase() : "";
          if(tag === "script" || tag === "style" || tag === "textarea")return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var nodes = [];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(replaceTextNode);
  }

  function patchKnownResultPills(){
    document.querySelectorAll(".pill").forEach(function(el){
      var txt = el.textContent || "";
      if(txt.toLowerCase().indexOf("zorta") === -1)return;
      el.textContent = txt.replace(/\bzorta\b/gi, "Raja");
    });
  }

  function patch(){
    walk(document.body);
    patchKnownResultPills();
  }

  window.SZPILPLAC_GAME_NAME = niceGameName;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", patch);
  }else{
    patch();
  }

  var obs = new MutationObserver(function(muts){
    var run = false;
    muts.forEach(function(m){
      if(m.type === "childList" && m.addedNodes && m.addedNodes.length)run = true;
      if(m.type === "characterData")replaceTextNode(m.target);
    });
    if(run)patch();
  });

  try{
    obs.observe(document.documentElement, {childList:true, subtree:true, characterData:true});
  }catch(e){}

  console.info("Szpilplac game-display-names.js v25");
})();
