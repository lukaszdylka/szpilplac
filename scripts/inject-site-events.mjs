import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.cwd());
const pages=[
  "slowko.html",
  "cuzamen.html",
  "klodka.html",
  "kopalnia.html",
  "na-wiyrch.html",
  "bandyta.html",
  "pong.html",
  "nowosci.html",
  "raja/index.html"
];

const buildText=fs.readFileSync(path.join(root,"build-version.js"),"utf8");
const build=buildText.match(/SZP_BUILD_ID="([^"]+)"/)?.[1];
if(!build)throw new Error("Nie znaleziono SZP_BUILD_ID.");

const tag=`<script src="/site-events.js?v=${build}"></script>`;
let changed=0;

for(const relative of pages){
  const file=path.join(root,relative);
  let html=fs.readFileSync(file,"utf8");
  if(/site-events\.js/i.test(html))continue;
  if(!/<\/head>/i.test(html))throw new Error(`${relative}: brak </head>.`);
  html=html.replace(/<\/head>/i,`${tag}\n</head>`);
  fs.writeFileSync(file,html);
  changed+=1;
  console.log(`Dodano tracker: ${relative}`);
}

console.log(`Zmieniono ${changed} plików.`);
