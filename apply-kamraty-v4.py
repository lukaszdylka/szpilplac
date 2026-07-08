#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
from datetime import datetime
import shutil

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_kamraty_v4"
BACKUP.mkdir(exist_ok=True)
HERE = Path(__file__).resolve().parent
FILES = HERE / "files"

def backup(p: Path):
    if p.exists():
        safe = p.as_posix().replace("/", "__")
        shutil.copy2(p, BACKUP / f"{safe}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak")

def write_file(path: Path, content: str):
    backup(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("OK:", path)

def read_file(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def copy_from_files(name: str, dest: Path):
    src = FILES / name
    if not src.exists():
        raise FileNotFoundError(src)
    write_file(dest, read_file(src))

def patch_refs():
    # konto.html + ranking.html mają ładować v4, żeby przeglądarka nie trzymała starego kamraty.js
    for name in ["konto.html", "ranking.html"]:
      p = ROOT / name
      if not p.exists():
        continue
      txt = read_file(p)
      old = txt
      txt = txt.replace('kamraty.js?v=1', 'kamraty.js?v=4')
      txt = txt.replace('kamraty.js?v=2', 'kamraty.js?v=4')
      txt = txt.replace('kamraty.js?v=3', 'kamraty.js?v=4')
      if 'kamraty.js?v=4' not in txt:
          txt = txt.replace('</body>', '<script src="kamraty.js?v=4"></script>\n</body>')
      if txt != old:
        write_file(p, txt)

def patch_gitignore():
    p = ROOT / ".gitignore"
    txt = read_file(p) if p.exists() else ""
    if "_backup_*/" not in txt:
        write_file(p, txt.rstrip()+"\n\n# Local patch backups\n_backup_*/\n*.bak\n")

def main():
    copy_from_files("kamraty.js", ROOT / "kamraty.js")
    copy_from_files("gracz.html", ROOT / "gracz.html")
    copy_from_files("kamraty-v4.sql", ROOT / "sql" / "kamraty-v4.sql")
    patch_refs()
    patch_gitignore()
    print("\nGotowe.")
    print("1. Commit/push zmian.")
    print("2. W Supabase SQL Editor uruchom: sql/kamraty-v4.sql")
    print("3. Zrób Ctrl+F5 na konto.html, ranking.html i gracz.html")

if __name__ == "__main__":
    main()
