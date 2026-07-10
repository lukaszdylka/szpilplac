# -*- coding: utf-8 -*-
"""
Szpilplac — PWA + powiadomienia web push

Uruchom w głównym katalogu repo:
    py apply-pwa-push.py
"""
from pathlib import Path
from datetime import datetime
import shutil
import re
import sys

ROOT = Path.cwd()
SRC = Path(__file__).resolve().parent
BACKUP = ROOT / ("_backup_pwa_push_" + datetime.now().strftime("%Y%m%d-%H%M%S"))

HTML_FILES = [
    "index.html",
    "konto.html",
    "ranking.html",
    "slowko.html",
    "klodka.html",
    "gracz.html",
    "nowosci.html",
]

HEAD_SNIPPET = """<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#2f4a39">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Szpilplac">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="pwa-maskable.svg">"""

SCRIPT_SNIPPET = '<script src="pwa-push.js?v=1"></script>'

def die(msg):
    print("ERROR:", msg)
    sys.exit(1)

def backup(path: Path):
    if path.exists():
        BACKUP.mkdir(exist_ok=True)
        target = BACKUP / path.as_posix().replace("/", "__")
        shutil.copy2(path, target)

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")

def write(path: Path, text: str):
    backup(path)
    path.write_text(text, encoding="utf-8", newline="\n")
    print("OK:", path)

def copy_file(rel: str):
    src = SRC / rel
    dst = ROOT / rel
    if not src.exists():
        die(f"Brak pliku w paczce: {rel}")
    if dst.exists():
        backup(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print("OK:", dst)

def inject_html(path: Path):
    if not path.exists():
        print("Pominięto:", path)
        return
    text = read(path)
    changed = False

    if 'rel="manifest"' not in text and "</head>" in text:
        text = text.replace("</head>", HEAD_SNIPPET + "\n</head>", 1)
        changed = True

    if "pwa-push.js" not in text and "</body>" in text:
        text = text.replace("</body>", SCRIPT_SNIPPET + "\n</body>", 1)
        changed = True

    if changed:
        write(path, text)
    else:
        print("Bez zmian:", path)

def patch_config():
    path = ROOT / "config.js"
    if not path.exists():
        print("Pominięto config.js — brak pliku")
        return
    text = read(path)
    if "VAPID_PUBLIC_KEY" in text:
        print("config.js ma już VAPID_PUBLIC_KEY")
        return

    m = re.search(r'(SUPABASE_ANON_KEY\s*:\s*"[^"]+")(\s*\n\s*};)', text)
    if m:
        text = text[:m.start(1)] + m.group(1) + ',\n  VAPID_PUBLIC_KEY: ""' + text[m.end(1):]
        write(path, text)
        print("Dodano puste VAPID_PUBLIC_KEY w config.js — uzupełnij po wygenerowaniu kluczy.")
    else:
        print("UWAGA: Nie udało się automatycznie dodać VAPID_PUBLIC_KEY do config.js.")
        print("Dodaj ręcznie w window.SZPILPLAC_CONFIG:")
        print('  VAPID_PUBLIC_KEY: ""')

def patch_gitignore():
    path = ROOT / ".gitignore"
    text = read(path) if path.exists() else ""
    additions = []
    for line in ["_backup_*/", "*.bak"]:
        if line not in text:
            additions.append(line)
    if additions:
        text = text.rstrip() + "\n\n# Local patch backups\n" + "\n".join(additions) + "\n"
        write(path, text)

def main():
    if not (ROOT / ".git").exists():
        die("Uruchom skrypt w głównym katalogu repo, tam gdzie jest folder .git")

    for rel in [
        "manifest.webmanifest",
        "sw.js",
        "pwa-push.js",
        "pwa-icon.svg",
        "pwa-maskable.svg",
        "sql/pwa-push-notifications.sql",
        "supabase/functions/send-szpilplac-push/index.ts",
    ]:
        copy_file(rel)

    for html in HTML_FILES:
        inject_html(ROOT / html)

    patch_config()
    patch_gitignore()

    print()
    print("PWA + powiadomienia — pliki wdrożone.")
    print()
    print("Teraz w Supabase SQL Editor uruchom:")
    print("  sql/pwa-push-notifications.sql")
    print()
    print("Klucze VAPID:")
    print("  1. wygeneruj VAPID_PUBLIC_KEY i VAPID_PRIVATE_KEY")
    print("  2. publiczny wpisz do config.js")
    print("  3. prywatny ustaw jako secret w Supabase Edge Function")
    print()
    print("Commit:")
    print("  git add manifest.webmanifest sw.js pwa-push.js pwa-icon.svg pwa-maskable.svg config.js index.html konto.html ranking.html slowko.html klodka.html gracz.html nowosci.html sql/pwa-push-notifications.sql supabase/functions/send-szpilplac-push/index.ts .gitignore")
    print('  git commit -m "Add PWA and notification preferences"')
    print("  git push origin main")

if __name__ == "__main__":
    main()
