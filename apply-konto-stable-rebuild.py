from pathlib import Path
import shutil
from datetime import datetime
import re

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_dir = ROOT / f"_backup_konto_stable_rebuild_{stamp}"
backup_dir.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        shutil.copy2(path, backup_dir / path.name)

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write(path: Path, text: str):
    path.write_text(text, encoding="utf-8", newline="\n")

konto = ROOT / "konto.html"
dashboard = ROOT / "konto-dashboard.js"
src_dashboard = HERE / "konto-dashboard.js"
sw = ROOT / "sw.js"
gitignore = ROOT / ".gitignore"

if not konto.exists():
    raise SystemExit("Nie widzę konto.html. Uruchom skrypt w głównym folderze repo szpilplac.")
if not src_dashboard.exists():
    raise SystemExit("Brakuje konto-dashboard.js z paczki.")

backup(konto)
backup(dashboard)
backup(sw)
backup(gitignore)

# 1. Nadpisz konto-dashboard.js jedną stabilną wersją.
shutil.copy2(src_dashboard, dashboard)

# 2. Wyczyść HTML z nakładek, które przechwytują/przestawiają kliknięcia.
html = read(konto)
for name in [
    "konto-drawers.js",
    "konto-drawers-fix.js",
    "konto-profile-cleanup.js",
    "konto-foldout-clickfix.js",
    "konto-layout-stable.js"
]:
    html = re.sub(r'\n?<script src="' + re.escape(name) + r'\?v=[^"]+"></script>', '', html)

# 3. Dashboard ma być świeżą wersją i ładować się tylko raz.
if re.search(r'konto-dashboard\.js\?v=[^"]+', html):
    html = re.sub(r'konto-dashboard\.js\?v=[^"]+', 'konto-dashboard.js?v=061', html)
else:
    anchor = '<script src="avatar-select.js?v=125"></script>'
    tag = '<script src="konto-dashboard.js?v=061"></script>'
    if anchor in html:
        html = html.replace(anchor, anchor + "\n" + tag)
    elif "</body>" in html:
        html = html.replace("</body>", tag + "\n</body>")
    else:
        html += "\n" + tag + "\n"

# 4. Podbij PWA, żeby nie trzymało starego konto.html/skryptów.
html = re.sub(r'pwa-push\.js\?v=[^"]+', 'pwa-push.js?v=7', html)
write(konto, html)

# 5. Service worker cache bump.
if sw.exists():
    txt = read(sw)
    txt = re.sub(r'szpilplac-pwa-v\d+', 'szpilplac-pwa-v7', txt)
    txt = re.sub(r'Szpilplac PWA Service Worker v\d+', 'Szpilplac PWA Service Worker v7', txt)
    write(sw, txt)

gi = read(gitignore) if gitignore.exists() else ""
for line in [
    "# Szpilplac local apply helpers",
    "_backup_konto_stable_rebuild_*/",
    "apply-konto-stable-rebuild.py",
    "apply-konto-stable-rebuild.bat",
]:
    if line not in gi:
        gi += ("\n" if gi and not gi.endswith("\n") else "") + line + "\n"
write(gitignore, gi)

print("OK: odbudowano konto na jednym stabilnym dashboardzie.")
print("OK: usunięto clickfix/drawers/cleanup z konto.html.")
print("OK: konto-dashboard.js ładuje się jako v061.")
print("OK: cache PWA ustawiony na v7.")
print(f"Backup: {backup_dir.name}")
