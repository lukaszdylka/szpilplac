#!/usr/bin/env python3
"""Static checks for the isolated Kaj to je? demo and the release gate."""
import json
import pathlib
import re
import subprocess
import tempfile

root=pathlib.Path(__file__).resolve().parent
html=(root/"kajtoje.html").read_text(encoding="utf-8")
demo=json.loads((root/"kajtoje-demo.json").read_text(encoding="utf-8"))
assert demo["demo"] is True and demo["verified"] is False
assert len(demo["cities"])==4
ids=set()
for c in demo["cities"]:
    assert c["id"] not in ids
    ids.add(c["id"])
    assert re.fullmatch(r"24\d{5}",c["id"])
    assert (root/c["herb"].lstrip("/")).is_file()
    assert c["contour"]["path"].startswith("M ")
    assert len(c["questions"])>=1
    for q in c["questions"]:
        assert len(q["options"])==4 and q["correct"] in range(4)
assert 'DEMO?' in html
assert 'const DATA_URL=DEMO?' in html
assert 'd.demo!==true:d.verified!==true' in html
assert 'PODGLĄD DEMONSTRACYJNY' in html
scripts=re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>",html,re.S)
assert len(scripts)>=2
with tempfile.TemporaryDirectory() as td:
    for i,content in enumerate(scripts):
        path=pathlib.Path(td)/(str(i)+".js")
        path.write_text(content,encoding="utf-8")
        subprocess.run(["node","--check",str(path)],check=True)
review=(root/"kajtoje-kontury.html").read_text(encoding="utf-8")
assert '/kajtoje-kontury.json' in review
assert 'mode-review' in review and 'mode-daily' in review
review_scripts=re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>",review,re.S)
assert len(review_scripts)==1
with tempfile.TemporaryDirectory() as td:
    path=pathlib.Path(td)/"contours-preview.js"
    path.write_text(review_scripts[0],encoding="utf-8")
    subprocess.run(["node","--check",str(path)],check=True)
import py_compile
py_compile.compile(str(root/"kajtoje-publikuj-kontury.py"),doraise=True)
print("PASS: contour preview JS and publication script syntax")
print("PASS: Fictional preview fixtures, asset paths and JS syntax")
