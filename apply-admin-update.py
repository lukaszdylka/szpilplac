#!/usr/bin/env python3
from pathlib import Path
import re
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parent
backup_dir = ROOT / "_backup_admin_update"
backup_dir.mkdir(exist_ok=True)

def backup(path: Path):
    if path.exists():
        target = backup_dir / f"{path.name}.{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
        shutil.copy2(path, target)

def remove_if_exists(path: Path):
    if path.exists():
        backup(path)
        path.unlink()
        print(f"Usunięto: {path}")

# Sprzątanie po nieudanym workflow z poprzedniej próby.
remove_if_exists(ROOT / "tmp-test.txt")
remove_if_exists(ROOT / ".github" / "workflows" / "raja-next-page.yml")

podp = ROOT / "podpowiedzi.html"
if podp.exists():
    backup(podp)
    text = podp.read_text(encoding="utf-8")

    # Usuń przycisk „Słowa i kody dni”.
    text = re.sub(
        r'\s*<button class="btn-words" id="wordsBtn">[\s\S]*?</button>',
        '',
        text
    )

    # Usuń kartę podglądu dni — od words-card do login-panel.
    text = re.sub(
        r'\s*<div class="words-card" id="wordsCard">[\s\S]*?(?=\s*<div class="login-panel" id="loginPanel">)',
        '\n',
        text
    )

    # Usuń logikę JS „SŁOWA DNIA (admin)” razem z listenerami.
    text = re.sub(
        r'\n/\* ── SŁOWA DNIA \(admin\) ── \*/[\s\S]*?(?=\n/\* ── INIT ── \*/)',
        '\n/* ── SŁOWA I KODY DNIA przeniesione do game-results-admin.html ── */\n',
        text
    )

    # Usuń nieużywane style tego panelu, jeśli są obecne.
    text = re.sub(r'\n\.words-card[\s\S]*?(?=\n\.dr-word|\n</style>)', '\n', text)
    text = re.sub(r'\n\.dr-word[\s\S]*?(?=\n</style>)', '\n', text)

    podp.write_text(text, encoding="utf-8")
    print("Zaktualizowano: podpowiedzi.html — usunięto Słōwko/Kłōdkę z przyszłych dni.")
else:
    print("Nie znaleziono podpowiedzi.html — pominięto patch.")

print("Gotowe.")
