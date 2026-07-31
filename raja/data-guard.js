(function(){
"use strict";
var p=window.RAJA_WEEKLY_PUZZLES;
if(!Array.isArray(p)||p.length!==52)throw new Error("Raja: wymagane są 52 zestawy.");
p.forEach(function(x,index){
  if(!x||x.id!==index+1||!x.category||!x.criterion||!Array.isArray(x.items)||x.items.length!==5){
    throw new Error("Raja: błędny zestaw "+(x&&x.id||"?"));
  }
  var names=x.items.map(function(item){return item&&item.name;});
  var values=x.items.map(function(item){return item&&item.value;});
  if(names.some(function(name){return !name;})||new Set(names).size!==5){
    throw new Error("Raja: nieunikalne elementy w zestawie "+x.id);
  }
  if(values.some(function(value){return value===undefined||value===null||String(value).trim()==="";})){
    throw new Error("Raja: brak objaśnienia w zestawie "+x.id);
  }
});
})();
