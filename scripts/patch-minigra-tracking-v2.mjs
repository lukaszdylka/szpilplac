import fs from "node:fs";

const file = "minigra.html";
let html = fs.readFileSync(file, "utf8");

function replaceOnce(from, to, label) {
  if (!html.includes(from)) throw new Error(`Nie znaleziono fragmentu: ${label}`);
  html = html.replace(from, to);
}

replaceOnce(
  '  var lastFinish=0;\n  var trackingInline=false;\n  var VISITOR_KEY="szpilplac_minigry_visitor_v1";',
  '  var lastFinish=0;\n  var runFinished=false;\n  var trackingInline=false;\n  var VISITOR_KEY="szpilplac_visitor_id_v1";\n  var LEGACY_VISITOR_KEY="szpilplac_minigry_visitor_v1";',
  "zmienne sesji"
);

replaceOnce(
  '      var id=localStorage.getItem(VISITOR_KEY);\n      if(id)return id;\n      id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():("v-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));\n      localStorage.setItem(VISITOR_KEY,id);\n      return id;',
  '      var id=localStorage.getItem(VISITOR_KEY)||localStorage.getItem(LEGACY_VISITOR_KEY);\n      if(!id)id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():("v-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));\n      localStorage.setItem(VISITOR_KEY,id);\n      localStorage.setItem(LEGACY_VISITOR_KEY,id);\n      return id;',
  "wspólny identyfikator odwiedzającego"
);

replaceOnce(
  'var bridge=\'<script>(function(){"use strict";var begun=Date.now(),sent=false,memory=',
  'var bridge=\'<script>(function(){"use strict";var begun=Date.now(),sent=false,finished=false,memory=',
  "stan bridge"
);

replaceOnce(
  'function start(){if(sent)return;sent=true;begun=Date.now();post("start");}',
  'function start(){if(finished){finished=false;sent=false;}if(sent)return;sent=true;begun=Date.now();post("start");}',
  "start bridge"
);

replaceOnce(
  'finish:function(data){data=data||{};if(data.duration_ms==null)data.duration_ms=Date.now()-begun;post("finish",data);}',
  'finish:function(data){data=data||{};if(finished)return;if(!sent)start();finished=true;if(data.duration_ms==null)data.duration_ms=Date.now()-begun;post("finish",data);}',
  "finish bridge"
);

replaceOnce(
  'addEventListener("pointerdown",start,{once:true,capture:true});addEventListener("keydown",start,{once:true,capture:true});',
  'addEventListener("pointerdown",start,{capture:true});addEventListener("keydown",start,{capture:true});',
  "stałe nasłuchiwanie bridge"
);

replaceOnce(
  '          function start(){if(startSent)return;startSent=true;startedAt=Date.now();track("start");}\n          child.addEventListener("pointerdown",start,{once:true,capture:true});\n          child.addEventListener("keydown",start,{once:true,capture:true});',
  '          function start(){if(runFinished){runFinished=false;startSent=false;}if(startSent)return;startSent=true;startedAt=Date.now();track("start");}\n          child.addEventListener("pointerdown",start,{capture:true});\n          child.addEventListener("keydown",start,{capture:true});',
  "fallback zaufanej ramki"
);

replaceOnce(
  '    if(message.type==="start"&&!startSent){startSent=true;startedAt=Date.now();track("start");}\n    if(message.type==="finish"){\n      if(!startSent)return;\n      var now=Date.now();if(now-lastFinish<800)return;lastFinish=now;',
  '    if(message.type==="start"){\n      if(runFinished){runFinished=false;startSent=false;}\n      if(!startSent){startSent=true;startedAt=Date.now();track("start");}\n    }\n    if(message.type==="finish"){\n      if(runFinished)return;\n      if(!startSent){startSent=true;startedAt=Date.now();track("start");}\n      runFinished=true;\n      var now=Date.now();lastFinish=now;',
  "obsługa wiadomości rodzica"
);

fs.writeFileSync(file, html);
console.log("Poprawiono tracker w minigra.html");
