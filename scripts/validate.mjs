import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {execFileSync} from "node:child_process";

const root=path.resolve(process.cwd());
const errors=[];

function fail(message){errors.push(message);}
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{
    if(entry.name===".git"||entry.name==="node_modules")return [];
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

const files=walk(root);
const htmlFiles=files.filter((file)=>file.endsWith(".html"));

for(const file of files.filter((file)=>file.endsWith(".js"))){
  try{execFileSync(process.execPath,["--check",file],{stdio:"pipe"});}
  catch(error){fail(`Błąd składni JS: ${path.relative(root,file)}\n${error.stderr?.toString()||error.message}`);}
}

for(const file of htmlFiles){
  const relative=path.relative(root,file).replaceAll("\\","/");
  try{
    const html=fs.readFileSync(file,"utf8");
    const pattern=/<script(?![^>]*\bsrc\s*=)([^>]*)>([\s\S]*?)<\/script>/gi;
    let match,index=0;
    while((match=pattern.exec(html))){
      const attrs=match[1]||"";
      if(/\btype\s*=\s*["'](?!text\/javascript|application\/javascript|module)[^"']+["']/i.test(attrs))continue;
      const code=match[2].trim();
      if(!code)continue;
      index+=1;
      try{new vm.Script(code,{filename:`${relative}#inline-${index}`});}
      catch(error){fail(`Błąd składni skryptu osadzonego: ${relative} (#${index})\n${error.message}`);}
    }
  }catch(error){fail(`Nie udało się sprawdzić skryptów w ${relative}: ${error.message}`);}
}

try{JSON.parse(fs.readFileSync(path.join(root,"manifest.webmanifest"),"utf8"));}
catch(error){fail(`Niepoprawny manifest.webmanifest: ${error.message}`);}

try{
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,"raja/puzzles.js"),"utf8"),context,{filename:"raja/puzzles.js"});
  const puzzles=context.window.RAJA_WEEKLY_PUZZLES;
  if(!Array.isArray(puzzles)||puzzles.length!==52)fail("Raja musi zawierać dokładnie 52 zestawy.");
  else puzzles.forEach((puzzle,index)=>{
    if(puzzle.id!==index+1)fail(`Raja: nieprawidłowe id zestawu na pozycji ${index+1}.`);
    if(!puzzle.category||!puzzle.criterion)fail(`Raja #${puzzle.id}: brak kategorii albo kryterium.`);
    if(!Array.isArray(puzzle.items)||puzzle.items.length!==5)fail(`Raja #${puzzle.id}: zestaw musi mieć 5 elementów.`);
    const names=(puzzle.items||[]).map((item)=>String(item.name||"").trim());
    if(new Set(names).size!==names.length)fail(`Raja #${puzzle.id}: powtarzające się nazwy.`);
  });
}catch(error){fail(`Nie udało się sprawdzić Rai: ${error.message}`);}

const buildText=fs.readFileSync(path.join(root,"build-version.js"),"utf8");
const buildMatch=buildText.match(/SZP_BUILD_ID="([^"]+)"/);
if(!buildMatch)fail("Brak SZP_BUILD_ID w build-version.js.");
else{
  const expected=buildMatch[1];
  for(const file of ["topbar-common.js","sw.js","site-events.js","analytics.js"]){
    const text=fs.readFileSync(path.join(root,file),"utf8");
    if(!text.includes(expected))fail(`${file} nie zawiera aktualnej wersji ${expected}.`);
  }
}

const topbar=fs.readFileSync(path.join(root,"topbar-common.js"),"utf8");
const legacyTracker=fs.readFileSync(path.join(root,"analytics.js"),"utf8");
const serviceWorker=fs.readFileSync(path.join(root,"sw.js"),"utf8");
const stats=fs.readFileSync(path.join(root,"stats.html"),"utf8");
const analyticsSql=fs.readFileSync(path.join(root,"sql/admin-analytics-v5-separate-events-table.sql"),"utf8");

if(!topbar.includes('/site-events.js'))fail("topbar-common.js nie ładuje site-events.js.");
if(!legacyTracker.includes('/site-events.js'))fail("analytics.js nie przekierowuje starych wersji do site-events.js.");
if(!serviceWorker.includes('"/site-events.js"'))fail("sw.js nie przechowuje site-events.js w cache PWA.");
if(!stats.includes("stats_admin_analytics_health"))fail("stats.html nie odczytuje diagnostyki analityki v5.");
if(!stats.includes("admin-analytics-v5-separate-events-table.sql"))fail("stats.html nie wskazuje aktualnego SQL v5.");
if(!analyticsSql.includes("create table if not exists public.szpilplac_analytics_events"))fail("SQL v5 nie tworzy osobnej tabeli analityki.");
if(!analyticsSql.includes("stats_admin_analytics_health"))fail("SQL v5 nie tworzy widoku diagnostycznego.");

const publicPages=[
  "index.html",
  "slowko.html",
  "cuzamen.html",
  "klodka.html",
  "gierki.html",
  "minigra.html",
  "kopalnia.html",
  "na-wiyrch.html",
  "bandyta.html",
  "pong.html",
  "konto.html",
  "ranking.html",
  "nowosci.html",
  "raja/index.html"
];

for(const relative of publicPages){
  const file=path.join(root,relative);
  if(!fs.existsSync(file)){fail(`Brak publicznej strony ${relative}.`);continue;}
  const html=fs.readFileSync(file,"utf8");
  if(!/(?:topbar-common|site-events|analytics)\.js/i.test(html)){
    fail(`${relative} nie uruchamia wspólnego modułu zdarzeń.`);
  }
}

if(errors.length){
  console.error(errors.join("\n\n"));
  process.exit(1);
}
console.log(`Walidacja zakończona: ${files.length} plików, brak błędów.`);
