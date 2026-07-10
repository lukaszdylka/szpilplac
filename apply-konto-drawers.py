# -*- coding: utf-8 -*-
"""
Szpilplac — konto jako lekkie menu wysuwane

Dodaje:
- konto-drawers.js
- script tag w konto.html po pwa-push.js
- wpis do .gitignore na backupy lokalne

Nie rusza SQL, logiki gier, Kamratów ani powiadomień.
"""
from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
BACKUP = ROOT / ("_backup_konto_drawers_" + datetime.now().strftime("%Y%m%d-%H%M%S"))

def die(msg):
    print("ERROR:", msg)
    sys.exit(1)

def backup(path):
    if path.exists():
        BACKUP.mkdir(exist_ok=True)
        shutil.copy2(path, BACKUP / path.as_posix().replace("/", "__"))

def read(path):
    return path.read_text(encoding="utf-8", errors="replace")

def write(path, text):
    backup(path)
    path.write_text(text, encoding="utf-8", newline="\n")
    print("OK:", path)

def check_root():
    if not (ROOT / ".git").exists():
        die("Uruchom w głównym katalogu repo, tam gdzie jest folder .git")
    if not (ROOT / "konto.html").exists():
        die("Nie widzę konto.html")

def patch_konto_html():
    path = ROOT / "konto.html"
    text = read(path)

    # Usuń stare ewentualne podpięcia, żeby nie było duplikatów.
    text = text.replace('<script src="konto-drawers.js?v=1"></script>\n', '')
    text = text.replace('<script src="konto-drawers.js"></script>\n', '')

    tag = '<script src="konto-drawers.js?v=1"></script>\n'

    if '<script src="pwa-push.js?v=1"></script>' in text:
        text = text.replace(
            '<script src="pwa-push.js?v=1"></script>',
            '<script src="pwa-push.js?v=1"></script>\n' + tag.strip(),
            1
        )
    elif '<script src="kamraty-reaction-summary.js?v=1"></script>' in text:
        text = text.replace(
            '<script src="kamraty-reaction-summary.js?v=1"></script>',
            '<script src="kamraty-reaction-summary.js?v=1"></script>\n' + tag.strip(),
            1
        )
    elif '</body>' in text:
        text = text.replace('</body>', tag + '</body>', 1)
    else:
        die("Nie znalazłem miejsca na dodanie konto-drawers.js")

    text = text.replace("Szpilplac konto.html v125 kamraty z placu", "Szpilplac konto.html v126 light drawers")

    write(path, text)

def patch_gitignore():
    path = ROOT / ".gitignore"
    text = read(path) if path.exists() else ""
    changed = False
    if "_backup_*/" not in text:
        text = text.rstrip() + "\n\n# Local patch backups\n_backup_*/\n"
        changed = True
    if changed:
        write(path, text)

def copy_files():
    src = Path(__file__).resolve().parent / "konto-drawers.js"
    dst = ROOT / "konto-drawers.js"
    backup(dst)
    dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8", newline="\n")
    print("OK:", dst)

def main():
    check_root()
    copy_files()
    patch_konto_html()
    patch_gitignore()
    print()
    print("Gotowe.")
    print("Sprawdź konto.html po Ctrl+F5.")
    print()
    print("Commit:")
    print("git add konto.html konto-drawers.js .gitignore")
    print('git commit -m "Simplify account profile with drawers"')
    print("git push origin main")

if __name__ == "__main__":
    main()
