#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_weekly_label_fix"
BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        target = BACKUP / f"{path.name}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        shutil.copy2(path, target)

def patch_file(path, replacers):
    if not path.exists():
        print(f"Pominięto, brak pliku: {path}")
        return False
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in replacers:
        text = text.replace(old, new)
    if text == original:
        print(f"Bez zmian: {path}")
        return False
    backup(path)
    path.write_text(text, encoding="utf-8")
    print(f"Zaktualizowano: {path}")
    return True

konto_dashboard = ROOT / "konto-dashboard.js"
konto_html = ROOT / "konto.html"

changed = False

changed |= patch_file(konto_dashboard, [
    ("Szpilplac Konto Dashboard v39", "Szpilplac Konto Dashboard v40"),
    ('var VERSION = "v39";', 'var VERSION = "v40";'),
    (
        'if(note){var txt=count>=7?"Tygodniowy cel gotowy w tym tygodniu!":"Jeszcze "+(7-count)+" dni do celu w tym tygodniu.";if(series>0)txt+=" · "+series+" "+weekWord(series)+" w serii.";note.textContent=txt;}',
        'if(note){var txt=count>=7?"Tygodniowy cel gotowy w tym tygodniu!":"Jeszcze "+(7-count)+" dni do celu w tym tygodniu.";txt+=" · Zagrane pełne tygodnie: "+series+" "+weekWord(series)+".";note.textContent=txt;}'
    ),
])

changed |= patch_file(konto_html, [
    ('konto-dashboard.js?v=039', 'konto-dashboard.js?v=040'),
    ('konto-dashboard.js?v=39', 'konto-dashboard.js?v=040'),
])

if changed:
    print("\nOK: profil będzie zawsze pokazywał zapis o zagranych pełnych tygodniach.")
    print("Po wdrożeniu w konsoli powinno być: Szpilplac konto-dashboard.js v40")
else:
    print("\nNie wprowadzono zmian. Możliwe, że patch już był wykonany albo plik ma inną wersję.")
