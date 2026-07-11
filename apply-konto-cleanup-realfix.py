from pathlib import Path
import shutil
from datetime import datetime
import re

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_dir = ROOT / f"_backup_konto_cleanup_realfix_{stamp}"
backup_dir.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        shutil.copy2(path, backup_dir / path.name)

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write(path: Path, text: str):
    path.write_text(text, encoding="utf-8", newline="\n")

konto = ROOT / "konto.html"
sw = ROOT / "sw.js"
gitignore = ROOT / ".gitignore"
src_js = HERE / "konto-profile-cleanup.js"
dst_js = ROOT / "konto-profile-cleanup.js"

if not konto.exists():
    raise SystemExit("Nie widzę konto.html. Uruchom skrypt w głównym folderze repo szpilplac.")
if not src_js.exists():
    raise SystemExit("Brakuje pliku konto-profile-cleanup.js z paczki.")

backup(konto)
backup(dst_js)
backup(sw)
backup(gitignore)

shutil.copy2(src_js, dst_js)
html = read(konto)
html = re.sub(r'\n?<script src="konto-profile-cleanup\.js\?v=[^"]+"></script>', '', html)
html = html.replace('konto-drawers.js?v=2', 'konto-drawers.js?v=3')
html = html.replace('konto-drawers-fix.js?v=2', 'konto-drawers-fix.js?v=3')
html = html.replace('pwa-push.js?v=2', 'pwa-push.js?v=3')
anchor = '<script src="konto-drawers-fix.js?v=3"></script>'
tag = '<script src="konto-profile-cleanup.js?v=3"></script>'
if anchor in html:
    html = html.replace(anchor, anchor + "\n" + tag)
elif '</body>' in html:
    html = html.replace('</body>', tag + "\n</body>")
else:
    html += "\n" + tag + "\n"
write(konto, html)

if sw.exists():
    txt = read(sw)
    txt = txt.replace("szpilplac-pwa-v1", "szpilplac-pwa-v3")
    txt = txt.replace("szpilplac-pwa-v2", "szpilplac-pwa-v3")
    txt = txt.replace("Szpilplac PWA Service Worker v1", "Szpilplac PWA Service Worker v3")
    txt = txt.replace("Szpilplac PWA Service Worker v2", "Szpilplac PWA Service Worker v3")
    write(sw, txt)

gi = read(gitignore) if gitignore.exists() else ""
for line in [
    "# Szpilplac local apply helpers",
    "_backup_konto_cleanup_realfix_*/",
    "apply-konto-cleanup-realfix.py",
    "apply-konto-cleanup-realfix.bat",
]:
    if line not in gi:
        gi += ("\n" if gi and not gi.endswith("\n") else "") + line + "\n"
write(gitignore, gi)

print("OK: naprawiono konto-profile-cleanup.js — teraz ma prawdziwe nowe linie.")
print("OK: konto.html ładuje konto-profile-cleanup.js?v=3.")
print("OK: odświeżono cache service workera do v3.")
print(f"Backup: {backup_dir.name}")
