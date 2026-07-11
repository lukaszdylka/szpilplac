from pathlib import Path
import shutil
from datetime import datetime
import re

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_dir = ROOT / f"_backup_konto_final_layout_{stamp}"
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

# Jedna stabilna wersja dashboardu.
shutil.copy2(src_dashboard, dashboard)

html = read(konto)

# Usuń stare nakładki, żeby nie było walki DOM.
html = re.sub(r'\n?<script src="konto-drawers\.js\?v=[^"]+"></script>', '', html)
html = re.sub(r'\n?<script src="konto-drawers-fix\.js\?v=[^"]+"></script>', '', html)
html = re.sub(r'\n?<script src="konto-profile-cleanup\.js\?v=[^"]+"></script>', '', html)
html = re.sub(r'\n?<script src="konto-layout-stable\.js\?v=[^"]+"></script>', '', html)

# Prawidłowa wersja dashboardu.
html = re.sub(r'konto-dashboard\.js\?v=[^"]+', 'konto-dashboard.js?v=050', html)

# Bump PWA push, żeby też się odświeżył.
html = re.sub(r'pwa-push\.js\?v=[^"]+', 'pwa-push.js?v=5', html)

write(konto, html)

# Service worker cache bump.
if sw.exists():
    txt = read(sw)
    txt = re.sub(r'szpilplac-pwa-v\d+', 'szpilplac-pwa-v5', txt)
    txt = re.sub(r'Szpilplac PWA Service Worker v\d+', 'Szpilplac PWA Service Worker v5', txt)
    write(sw, txt)

gi = read(gitignore) if gitignore.exists() else ""
for line in [
    "# Szpilplac local apply helpers",
    "_backup_konto_final_layout_*/",
    "apply-konto-final-layout.py",
    "apply-konto-final-layout.bat",
]:
    if line not in gi:
        gi += ("\n" if gi and not gi.endswith("\n") else "") + line + "\n"
write(gitignore, gi)

print("OK: konto ma teraz jeden stabilny dashboard v50.")
print("OK: usunięto stare nakładki drawers/cleanup z konto.html.")
print("OK: odświeżono cache PWA do v5.")
print(f"Backup: {backup_dir.name}")
