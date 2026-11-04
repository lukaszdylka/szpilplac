#!/usr/bin/env python3
"""Build unverified contour-only review dataset from successful GUGiK A04 audit.

This does NOT verify coats of arms, questions, or final production launch.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
read = lambda name: json.loads((ROOT / name).read_text(encoding="utf-8"))
report = read("kajtoje-audyt-granic.json")
raw = read("kajtoje-granice-robocze.json")
catalog = read("kajtoje-katalog.json")
cities = raw["cities"]
names = catalog["cities"]

assert report["count"] == report["expected"] == 75, "Incomplete audit"
assert report["issues"] == [], "Audit reported errors"
assert report["regionFeatureCount"] == 75, "Unexpected region count"
assert len(cities) == len(names) == 75
assert len({c["id"] for c in cities}) == 75
assert {c["name"] for c in cities} == set(names), "Names differ from catalog"

for c in cities:
    assert re.fullmatch(r"24\d{4}[14]", c["id"]), c["name"]
    assert len(c["center"]) == 2 and all(isinstance(v, (int, float)) for v in c["center"])
    shape = c["contour"]
    assert len(shape["viewBox"]) == 4 and all(isinstance(v, (int, float)) for v in shape["viewBox"])
    assert shape["path"].startswith("M ") and shape["path"].endswith(" Z"), c["name"]

by_name = {c["name"]: c for c in cities}
data = {
    "schema": 1,
    "mode": "outlines-review",
    "geometriesAudited": True,
    "officialTerytIndependentlyVerified": False,
    "visualReviewDone": False,
    "referenceDate": report["referenceDateDeclared"],
    "source": report["source"],
    "cities": [by_name[n] for n in names],
}
target = ROOT / "kajtoje-kontury.json"
target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Review outlines published: {len(cities)} cities, {target.stat().st_size} bytes")
