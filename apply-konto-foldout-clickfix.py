from pathlib import Path
import shutil
from datetime import datetime
import re

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_dir = ROOT / f"_backup_konto_foldout_clickfix_{stamp}"
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
src_js = HERE / "konto-foldout-clickfix.js"
dst_js = ROOT / "konto-foldout-clickfix.js"

if not konto.exists():
    raise SystemExit("Nie widzę konto.html. Uruchom skrypt w głównym folderze repo szpilplac.")
if not src_js.exists():
    raise SystemExit("Brakuje konto-foldout-clickfix.js z paczki.")

backup(konto)
backup(dst_js)
backup(sw)
backup(gitignore)

shutil.copy2(src_js, dst_js)

html = read(konto)

# Usuń ewentualną starą wersję clickfixa i dopnij świeżą za dashboardem.
html = re.sub(r'\n?<script src="konto-foldout-clickfix\.js\?v=[^"]+"></script>', '', html)
tag = '<script src="konto-foldout-clickfix.js?v=1"></script>'

anchor = '<script src="konto-dashboard.js?v=050"></script>'
if anchor in html:
    html = html.replace(anchor, anchor + "\n" + tag)
elif '</body>' in html:
    html = html.replace('</body>', tag + "\n</body>")
else:
    html += "\n" + tag + "\n"

# Bump cache.
html = re.sub(r'pwa-push\.js\?v=[^"]+', 'pwa-push.js?v=6', html)
write(konto, html)

if sw.exists():
    txt = read(sw)
    txt = re.sub(r'szpilplac-pwa-v\d+', 'szpilplac-pwa-v6', txt)
    txt = re.sub(r'Szpilplac PWA Service Worker v\d+', 'Szpilplac PWA Service Worker v6', txt)
    write(sw, txt)

gi = read(gitignore) if gitignore.exists() else ""
for line in [
    "# Szpilplac local apply helpers",
    "_backup_konto_foldout_clickfix_*/",
    "apply-konto-foldout-clickfix.py",
    "apply-konto-foldout-clickfix.bat",
]:
    if line not in gi:
        gi += ("\n" if gi and not gi.endswith("\n") else "") + line + "\n"
write(gitignore, gi)

print("OK: dodano jawny handler kliknięcia dla zakładek konta.")
print("OK: konto.html ładuje konto-foldout-clickfix.js?v=1.")
print("OK: odświeżono cache PWA do v6.")
print(f"Backup: {backup_dir.name}")
