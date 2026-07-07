#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import re
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_mobile_update"
BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        target = BACKUP / f"{path.as_posix().replace('/', '__')}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

def read(path):
    return path.read_text(encoding="utf-8")

def write(path, text):
    backup(path)
    path.write_text(text, encoding="utf-8")
    print(f"Zaktualizowano: {path}")

def normalize_viewport(text):
    if 'name="viewport"' not in text and "name='viewport'" not in text:
        return text
    return re.sub(
        r'<meta\s+name=["\']viewport["\']\s+content=["\'][^"\']*["\']>',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        text,
        count=1,
        flags=re.I
    )

GLOBAL_MOBILE_CSS = """
/* SZPILPLAC MOBILE POLISH v1 */
@media(max-width:640px){
  html,body{max-width:100%;overflow-x:hidden}
  body{-webkit-text-size-adjust:100%}
  input,textarea,select{font-size:16px!important}
  button,
  input[type="button"],
  input[type="submit"],
  .btn,
  .small-btn,
  .icon-btn,
  .nav-btn,
  .game-tab,
  .footer-news-btn,
  a.btn{
    min-height:44px;
  }
  .controls,.topbar-right,.tile-actions,.actions{gap:8px!important}
  .card,.tile,.day-card,.result,.banner,.notice,.modal{border-radius:16px!important}
  .table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  table{min-width:560px}
  .site-footer{padding-bottom:96px}
}
@media(max-width:420px){
  .controls{justify-content:flex-start!important}
  .site-name,.brand,h1{word-break:keep-all}
}
"""

RAJA_CSS = """
/* SZPILPLAC RAJA MOBILE ARROWS ONLY v130 */
#settBtn{
  display:none!important;
}
#rajaOrderMobileHint{
  display:block;
  margin:0 0 10px;
  padding:10px 12px;
  border:1px dashed rgba(191,138,58,.55);
  border-radius:12px;
  background:rgba(191,138,58,.08);
  color:var(--ink2);
  font-size:12px;
  line-height:1.35;
  text-align:center;
}
.row.can-drag{
  cursor:default!important;
  touch-action:manipulation!important;
}
.row{
  touch-action:manipulation!important;
  user-select:none!important;
  -webkit-user-select:none!important;
}
.row.sel,
.row.selected,
.item.selected,
li.selected{
  outline:none!important;
  box-shadow:none!important;
}
.row.drag-source,
.row.drop-target,
.drag-ghost{
  display:none!important;
}
.row .moveBtns,
.item .moveBtns,
li .moveBtns{
  display:none!important;
}
.arrows{
  gap:6px!important;
}
.arrows button{
  width:46px!important;
  min-width:46px!important;
  height:40px!important;
  min-height:40px!important;
  border-radius:12px!important;
  font-size:18px!important;
  font-weight:900!important;
}
@media(max-width:430px){
  .wrap{padding-left:12px!important;padding-right:12px!important}
  .topbar{align-items:flex-start}
  .controls{gap:6px!important}
  .lang-tog button{min-height:36px!important;padding:7px 11px!important}
  .icon-btn{width:36px!important;height:36px!important}
  .brand h1{font-size:27px!important}
  .brand p{font-size:11.5px!important}
  .daynav button{width:42px!important;height:40px!important;font-size:24px!important}
  .daynav .wk{min-width:120px!important}
  .banner{padding:14px!important;margin-bottom:12px!important}
  .row{padding:10px 9px!important;gap:8px!important}
  .rank{width:30px!important;height:30px!important}
  .name{font-size:14px!important;line-height:1.22!important}
  .val{font-size:12px!important}
  .cta-check{min-height:52px!important;font-size:17px!important}
  .hint-btn{width:100%!important;min-height:48px!important}
}
"""

def inject_css(text, css, marker):
    if marker in text:
        return text
    idx = text.lower().find("</style>")
    if idx == -1:
        return text
    return text[:idx] + "\n" + css.strip() + "\n" + text[idx:]

def cut_raja_extra_script(text):
    marker = 'console.info("Szpilplac raja simple move fix v124");'
    if marker not in text:
        return text, False
    marker_pos = text.find(marker)
    start = text.rfind("<script", 0, marker_pos)
    end = text.find("</script>", marker_pos)
    if start != -1 and end != -1:
        return text[:start] + "\n" + text[end + len("</script>"):], True
    return text, False

def patch_raja():
    path = ROOT / "raja" / "index.html"
    if not path.exists():
        print("Pominięto: raja/index.html nie istnieje")
        return
    text = read(path)
    text = normalize_viewport(text)

    old = """    if(!locked){
      li.addEventListener("click",function(e){if(e.target.closest(".arrows"))return;if(suppressClick||dragMoved)return;pick(i);});
      attachDrag(li,i);
    }"""
    new = """    if(!locked){
      // Mobile-first v130: układanie wyłącznie strzałkami.
      // Wyłączone: tap-to-swap i drag/drop, bo na telefonach dawały za dużo sposobów układania.
    }"""
    if old in text:
        text = text.replace(old, new)
        print("Raja: wyłączono click-to-swap i drag/drop w renderList.")
    else:
        print("Uwaga: nie znaleziono dokładnego bloku click/drag w renderList; CSS i usunięcie skryptu nadal pomogą.")

    if 'id="rajaOrderMobileHint"' not in text:
        text = text.replace(
            '<ol id="list" class="list"></ol>',
            '<div id="rajaOrderMobileHint" class="order-mobile-hint">Użyj strzałek ↑ ↓ przy kafelkach. To jedyny sposób zmiany kolejności.</div>\n    <ol id="list" class="list"></ol>'
        )
        print("Raja: dodano statyczną instrukcję strzałek.")

    text, removed = cut_raja_extra_script(text)
    if removed:
        print("Raja: usunięto nadmiarowy skrypt doklejający drugie strzałki .moveBtns.")

    text = inject_css(text, RAJA_CSS, "SZPILPLAC RAJA MOBILE ARROWS ONLY v130")

    repl = {
        'raja-auth-bridge.js?v=125': 'raja-auth-bridge.js?v=126',
        '../game-result-actions.js?v=126': '../game-result-actions.js?v=127',
        '../game-save.js?v=125': '../game-save.js?v=126',
    }
    for a,b in repl.items():
        text = text.replace(a,b)

    write(path, text)

def patch_common_pages():
    pages = [
        "index.html",
        "slowko.html",
        "klodka.html",
        "ranking.html",
        "konto.html",
        "admin.html",
        "stats.html",
        "podpowiedzi.html",
        "game-results-admin.html",
        "mailing-admin.html",
        "avatar-admin.html",
        "odznaki-admin.html",
        "nowosci.html",
        "regulamin.html",
        "polityka-prywatnosci.html",
    ]
    for rel in pages:
        path = ROOT / rel
        if not path.exists():
            continue
        text = read(path)
        old_text = text
        text = normalize_viewport(text)
        text = inject_css(text, GLOBAL_MOBILE_CSS, "SZPILPLAC MOBILE POLISH v1")
        if text != old_text:
            write(path, text)

def main():
    patch_raja()
    patch_common_pages()
    print("\nGotowe. Backupy są w folderze:", BACKUP)
    print("W Rai po patchu kolejność zmieniasz tylko strzałkami ↑ ↓.")

if __name__ == "__main__":
    main()
