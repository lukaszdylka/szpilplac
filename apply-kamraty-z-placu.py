#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
from datetime import datetime
import shutil

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_kamraty"
BACKUP.mkdir(exist_ok=True)

def backup(p: Path):
    if p.exists():
        safe = p.as_posix().replace("/", "__")
        shutil.copy2(p, BACKUP / f"{safe}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak")

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def write(p: Path, text: str):
    backup(p)
    p.write_text(text, encoding="utf-8")
    print("OK:", p)

def patch_gitignore():
    p = ROOT / ".gitignore"
    text = read(p) if p.exists() else ""
    if "_backup_*/" not in text:
        write(p, text.rstrip() + "\n\n# Local patch backups\n_backup_*/\n*.bak\n")

def ensure_file(path: str):
    src = ROOT / path
    if not src.exists():
        raise SystemExit(f"Brakuje pliku z paczki: {path}")

def patch_konto():
    p = ROOT / "konto.html"
    if not p.exists():
        print("Pominięto: brak konto.html")
        return
    text = read(p)
    old = text
    text = text.replace('console.info("Szpilplac konto.html v124 google login linking");',
                        'console.info("Szpilplac konto.html v125 kamraty z placu");')
    if 'kamraty.js?v=1' not in text:
        text = text.replace('<script src="konto-dashboard.js?v=041"></script>',
                            '<script src="konto-dashboard.js?v=041"></script>\n<script src="kamraty.js?v=1"></script>')
    if text != old:
        write(p, text)
    else:
        print("Bez zmian: konto.html")

def patch_ranking():
    p = ROOT / "ranking.html"
    if not p.exists():
        print("Pominięto: brak ranking.html")
        return
    text = read(p)
    old = text
    text = text.replace('console.info("Szpilplac ranking.html v124 google login linking");',
                        'console.info("Szpilplac ranking.html v125 kamraty z placu");')
    target = 'return \'<div class="rank-row \'+(isMe ? "me" : "")+\'">\'+'
    repl = 'return \'<div class="rank-row \'+(isMe ? "me" : "")+\'" data-user-id="\'+esc(row.user_id || "")+\'" data-login="\'+esc(login)+\'">\'+'
    if target in text:
        text = text.replace(target, repl)
    elif 'data-user-id' in text:
        print("ranking.html ma już data-user-id")
    else:
        print("UWAGA: nie znaleziono dokładnego miejsca data-user-id w ranking.html")
    if 'kamraty.js?v=1' not in text:
        text = text.replace('</body>', '<script src="kamraty.js?v=1"></script>\n</body>')
    if text != old:
        write(p, text)
    else:
        print("Bez zmian: ranking.html")

def main():
    ensure_file("kamraty.js")
    ensure_file("gracz.html")
    ensure_file("sql/kamraty-z-placu.sql")
    patch_konto()
    patch_ranking()
    patch_gitignore()
    print("\nGotowe.")
    print("1) Commit/push zmian.")
    print("2) W Supabase SQL Editor uruchom: sql/kamraty-z-placu.sql")
    print("3) Wejdź na konto, włącz Profil publiczny i sprawdź ranking.")

if __name__ == "__main__":
    main()
