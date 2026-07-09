from pathlib import Path

# Bezpieczna poprawka klikni?? Kamrat?w w rankingu.
# Dzia?a bajtowo, nie psuje polskich znak?w.

p = Path("kamraty.js")
b = p.read_bytes()

old = b'''    if(location.pathname.indexOf("ranking") !== -1){
      setTimeout(enhanceRankingRows,800);
      new MutationObserver(function(){setTimeout(enhanceRankingRows,120);}).observe(document.body,{childList:true,subtree:true});
      document.addEventListener("click",function(e){if(e.target && e.target.closest && e.target.closest(".tab"))setTimeout(enhanceRankingRows,800);});
    }'''

new = b'''    if(location.pathname.indexOf("ranking") !== -1){
      setTimeout(enhanceRankingRows,500);
      setTimeout(enhanceRankingRows,1200);
      setTimeout(enhanceRankingRows,2500);
      document.addEventListener("click",function(e){
        if(e.target && e.target.closest && e.target.closest(".tab")){
          setTimeout(enhanceRankingRows,500);
          setTimeout(enhanceRankingRows,1200);
        }
      });
    }'''

if old not in b:
    raise SystemExit("Nie znaleziono starego bloku rankingu w kamraty.js ? przerwano bez zmian.")

b = b.replace(old, new)
b = b.replace(b'var VERSION = "v4";', b'var VERSION = "v5";')

p.write_bytes(b)

for html in ["konto.html", "ranking.html", "gracz.html"]:
    hp = Path(html)
    if hp.exists():
        hb = hp.read_bytes()
        hb = hb.replace(b"kamraty.js?v=4", b"kamraty.js?v=5")
        hp.write_bytes(hb)

print("OK: kamraty.js -> v5, HTML-e -> kamraty.js?v=5")
