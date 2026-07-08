#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
from datetime import datetime
import shutil
ROOT=Path(__file__).resolve().parent
SRC=ROOT/"files"
BACKUP=ROOT/"_backup_kamraty_v2"
BACKUP.mkdir(exist_ok=True)
def backup(p):
    if p.exists():
        shutil.copy2(p,BACKUP/(p.as_posix().replace("/","__")+"."+datetime.now().strftime("%Y%m%d-%H%M%S")+".bak"))
def read(p): return p.read_text(encoding="utf-8")
def write(p,t):
    backup(p); p.parent.mkdir(parents=True,exist_ok=True); p.write_text(t,encoding="utf-8"); print("OK:",p)
def copy_file(name):
    s=SRC/name; d=ROOT/name
    if not s.exists(): raise SystemExit("Brak pliku w paczce: "+str(s))
    write(d,read(s))
def patch_ref(path):
    p=ROOT/path
    if not p.exists(): print("Pominięto:",p); return
    t=read(p); old=t
    t=t.replace('kamraty.js?v=1','kamraty.js?v=2')
    if 'kamraty.js?v=2' not in t:
        t=t.replace('</body>','<script src="kamraty.js?v=2"></script>\n</body>')
    if t!=old: write(p,t)
    else: print("Bez zmian:",p)
def patch_gitignore():
    p=ROOT/'.gitignore'; t=read(p) if p.exists() else ''
    if '_backup_*/' not in t: write(p,t.rstrip()+"\n\n# Local patch backups\n_backup_*/\n*.bak\n")
def main():
    copy_file(Path('kamraty.js'))
    copy_file(Path('gracz.html'))
    patch_ref('konto.html')
    patch_ref('ranking.html')
    patch_gitignore()
    print('\nGotowe. Commit/push i twarde odświeżenie strony Ctrl+F5.')
if __name__=='__main__': main()
