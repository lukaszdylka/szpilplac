from pathlib import Path

files = ["konto.html", "ranking.html"]

bridge = b'<script src="kamraty-achievements-bridge.js?v=1"></script>'
kamraty = b'<script src="kamraty.js?v=4"></script>'

for file in files:
    p = Path(file)
    b = p.read_bytes()

    b = b.replace(b"kamraty.js?v=1", b"kamraty.js?v=4")
    b = b.replace(b"kamraty.js?v=2", b"kamraty.js?v=4")
    b = b.replace(b"kamraty.js?v=3", b"kamraty.js?v=4")

    if file == "konto.html":
        b = b.replace(b"achievements-panel.js?v=126", b"achievements-panel.js?v=127")

    b = b.replace(kamraty + b"\r\n" + bridge, kamraty)
    b = b.replace(kamraty + b"\n" + bridge, kamraty)

    if bridge not in b and kamraty in b:
        b = b.replace(kamraty, kamraty + b"\n" + bridge, 1)

    p.write_bytes(b)

    text = p.read_text(encoding="utf-8", errors="replace")
    bad = [x for x in ["?", "?", "?", "?"] if x in text]
    print(file, "OK" if not bad else "UWAGA: " + ",".join(bad))
