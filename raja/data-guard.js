(function(){
"use strict";
var p=window.RAJA_WEEKLY_PUZZLES;
if(!Array.isArray(p)||p.length!==52)throw new Error("Raja: wymagane są 52 zestawy.");
var lengths=p.find(function(x){return x.id===25;});
if(lengths){lengths.items.forEach(function(item){item.value=String(Array.from(item.name).length);});}
var alphabet=p.find(function(x){return x.id===50;});
if(alphabet)alphabet.criterion="rosnąco według miejsca litery w alfabecie łacińskim A–Z";
p.forEach(function(x){
  if(!x||!x.category||!x.criterion||!Array.isArray(x.items)||x.items.length!==5)throw new Error("Raja: błędny zestaw "+(x&&x.id||"?"));
  var names=x.items.map(function(i){return i&&i.name;});
  if(names.some(function(n){return !n;})||new Set(names).size!==5)throw new Error("Raja: nieunikalne elementy w zestawie "+x.id);
});
})();
