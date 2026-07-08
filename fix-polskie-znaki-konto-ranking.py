# -*- coding: utf-8 -*-
"""
Fix konto.html and ranking.html encoding once and safely.

What it does:
1. Backs up current konto.html and ranking.html.
2. Restores both files from a known-good Git commit with correct UTF-8 bytes.
3. Applies only byte-level replacements:
   - kamraty.js?v=1 -> kamraty.js?v=4
   - achievements-panel.js?v=126 -> achievements-panel.js?v=127 in konto.html
   - adds kamraty-achievements-bridge.js?v=1 after kamraty.js?v=4
4. Prints a small check for common mojibake markers.

Run from the main szpilplac repository folder:
    py fix-polskie-znaki-konto-ranking.py
"""

from pathlib import Path
from datetime import datetime
import subprocess
import shutil
import sys

GOOD_COMMIT = "689c763fb3612f5f246f392049ef87f7c856e923"
FILES = ["konto.html", "ranking.html"]
BRIDGE_LINE = b'<script src="kamraty-achievements-bridge.js?v=1"></script>'
KAMRATY_LINE = b'<script src="kamraty.js?v=4"></script>'

def run(cmd):
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True)

def main():
    root = Path.cwd()
    if not (root / ".git").exists():
        print("ERROR: Run this script from the main szpilplac repository folder.")
        sys.exit(1)

    backup = root / ("_backup_polskie_znaki_" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    backup.mkdir(exist_ok=True)

    for name in FILES:
        p = root / name
        if p.exists():
            shutil.copy2(p, backup / name)
            print("Backup:", name, "->", backup)

    run(["git", "fetch", "origin"])
    run(["git", "restore", "--source", GOOD_COMMIT, "--", "konto.html", "ranking.html"])

    for name in FILES:
        p = root / name
        data = p.read_bytes()

        # Byte-level patch only; no text decoding/re-encoding.
        data = data.replace(b"kamraty.js?v=1", b"kamraty.js?v=4")
        data = data.replace(b"kamraty.js?v=2", b"kamraty.js?v=4")
        data = data.replace(b"kamraty.js?v=3", b"kamraty.js?v=4")

        if name == "konto.html":
            data = data.replace(b"achievements-panel.js?v=126", b"achievements-panel.js?v=127")

        # Avoid duplicate bridge line.
        data = data.replace(KAMRATY_LINE + b"\n" + BRIDGE_LINE, KAMRATY_LINE)
        data = data.replace(KAMRATY_LINE + b"\r\n" + BRIDGE_LINE, KAMRATY_LINE)

        if BRIDGE_LINE not in data:
            if KAMRATY_LINE not in data:
                print("WARNING:", name, "does not contain kamraty.js?v=4 line.")
            else:
                data = data.replace(KAMRATY_LINE, KAMRATY_LINE + b"\n" + BRIDGE_LINE, 1)

        p.write_bytes(data)
        print("Fixed:", name)

    print()
    print("Quick mojibake check:")
    for name in FILES:
        text = (root / name).read_text(encoding="utf-8", errors="replace")
        bad = [m for m in ["Â", "Ä", "Å", "�"] if m in text]
        if bad:
            print("WARNING:", name, "still contains suspicious markers:", ", ".join(bad))
        else:
            print("OK:", name, "no common mojibake markers.")

    print()
    run(["git", "diff", "--", "konto.html", "ranking.html"])

    print()
    print("Now check the files locally. If OK, run:")
    print("  git add konto.html ranking.html")
    print('  git commit -m "Restore Polish characters in konto and ranking"')
    print("  git push origin main")
    print()
    print("Do not use Get-Content | Set-Content for these HTML files again.")

if __name__ == "__main__":
    main()
