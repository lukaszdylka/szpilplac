# -*- coding: utf-8 -*-
"""
Szpilplac — PWA loader fix

Naprawia przypadek, gdy pliki PWA/push są w repo, ale strony ich nie ładują.
Dodaje link do manifestu w <head> i skrypt pwa-push.js przed </body>.
"""
from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
BACKUP = ROOT / ("_backup_pwa_loader_fix_" + datetime.now().strftime("%Y%m%d-%H%M%S"))

HTML_FILES = [
    "index.html",
    "konto.html",
    "ranking.html",
    "slowko.html",
    "klodka.html",
    "gracz.html",
    "nowosci.html",
]

MANIFEST_LINE = '<link rel="manifest" href="/manifest.webmanifest">'
THEME_LINE = '<meta name="theme-color" content="#2f4a39">'
SCRIPT_LINE = '<script src="pwa-push.js?v=1"></script>'


def die(msg):
    print("ERROR:", msg)
    sys.exit(1)


def read(path):
    return path.read_text(encoding="utf-8", errors="replace")


def write(path, text):
    BACKUP.mkdir(exist_ok=True)
    shutil.copy2(path, BACKUP / path.name)
    path.write_text(text, encoding="utf-8", newline="\n")
    print("OK:", path)


def add_head_links(text):
    changed = False
    if MANIFEST_LINE not in text:
        marker = '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'
        if marker in text:
            text = text.replace(marker, marker + "\n" + MANIFEST_LINE, 1)
        elif "</head>" in text:
            text = text.replace("</head>", MANIFEST_LINE + "\n</head>", 1)
        else:
            print("  - brak </head>, pomijam manifest")
        changed = True
    if THEME_LINE not in text:
        if "</head>" in text:
            text = text.replace("</head>", THEME_LINE + "\n</head>", 1)
            changed = True
    return text, changed


def add_pwa_script(text):
    if 'src="pwa-push.js' in text or "src='pwa-push.js" in text:
        return text, False
    if "</body>" not in text:
        return text, False
    return text.replace("</body>", SCRIPT_LINE + "\n</body>", 1), True


def main():
    if not (ROOT / ".git").exists():
        die("Uruchom w głównym katalogu repo, tam gdzie jest folder .git")

    required = ["manifest.webmanifest", "sw.js", "pwa-push.js"]
    missing = [x for x in required if not (ROOT / x).exists()]
    if missing:
        print("UWAGA: brakuje plików PWA:", ", ".join(missing))
        print("Najpierw wrzuć pliki z paczki szpilplac-pwa-push-pack.zip")

    for name in HTML_FILES:
        path = ROOT / name
        if not path.exists():
            print("Pominięto", name, "— brak pliku")
            continue
        text = read(path)
        original = text
        text, ch1 = add_head_links(text)
        text, ch2 = add_pwa_script(text)
        if text != original:
            write(path, text)
        else:
            print("Bez zmian:", path)

    gi = ROOT / ".gitignore"
    if gi.exists():
        g = read(gi)
    else:
        g = ""
    if "_backup_*/" not in g:
        if g and not g.endswith("\n"):
            g += "\n"
        g += "\n# Local patch backups\n_backup_*/\n"
        if gi.exists():
            shutil.copy2(gi, BACKUP / ".gitignore")
        gi.write_text(g, encoding="utf-8", newline="\n")
        print("OK:", gi)

    print("\nGotowe. Commit:")
    print("git add index.html konto.html ranking.html slowko.html klodka.html gracz.html nowosci.html .gitignore")
    print('git commit -m "Load PWA push on site pages"')
    print("git push origin main")


if __name__ == "__main__":
    main()
