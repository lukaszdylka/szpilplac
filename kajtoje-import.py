#!/usr/bin/env python3
"""Import administracyjnych granic miast dla Kaj to je? z urzędowego PRG.
Nie zatwierdza publikacji: wymaga osobnego audytu TERYT, herbów i pytań.
Uruchom w katalogu repo: python kajtoje-import.py
"""
import json
import math
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
PRG = "https://mapy.geoportal.gov.pl/wss/ims/maps/PRG_gugik_wyszukiwarka/MapServer/0/query"
API_SOURCE = "https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/"

def fetch_features():
    params = {
        "where": "teryt LIKE '24%'",
        "outFields": "teryt,nazwa",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "json"
    }
    uri = PRG + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(uri, headers={
        "User-Agent": "Szpilplac-Kajtoje-Data-Audit/1.0"
    }), timeout=90) as reply:
        result = json.load(reply)
    if "error" in result:
        raise RuntimeError("Błąd PRG: " + str(result["error"]))
    if not isinstance(result.get("features"), list):
        raise RuntimeError("Odpowiedź PRG nie zawiera listy obiektów.")
    if result.get("exceededTransferLimit"):
        raise RuntimeError("PRG ograniczył liczbę obiektów. Wymagana paginacja.")
    return result["features"], uri

def ring_to_svg(ring, minx, maxy, scale, tolerance=0.0):
    pts = []
    for xy in ring:
        if not isinstance(xy, list) or len(xy) < 2:
            raise ValueError("Niepoprawny punkt geometrii PRG")
        lon, lat = xy[:2]
        if not (17 <= lon <= 22 and 48 <= lat <= 52):
            raise ValueError("Geometria poza województwem śląskim lub błędny CRS")
        x, y = (lon - minx) * scale, (maxy - lat) * scale
        if not pts or math.hypot(x - pts[-1][0], y - pts[-1][1]) >= tolerance:
            pts.append((x, y))
    if len(pts) < 3:
        raise ValueError("Za mało punktów w obwodzie")
    return "M " + " L ".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"

def contour(geom):
    rings = geom.get("rings", [])
    if not rings:
        raise ValueError("Brak wielokąta")
    all_pts = [p for ring in rings for p in ring]
    midlat = sum(p[1] for p in all_pts) / len(all_pts)
    coslat = math.cos(math.radians(midlat))
    west = min(p[0] * coslat for p in all_pts)
    east = max(p[0] * coslat for p in all_pts)
    north = max(p[1] for p in all_pts)
    south = min(p[1] for p in all_pts)
    width, height = east - west, north - south
    if width <= 0 or height <= 0:
        raise ValueError("Nieprawidłowa wielkość miasta")
    scale = 240 / max(width, height)
    path = []
    for ring in rings:
        projected = [[p[0] * coslat, p[1]] for p in ring]
        path.append(ring_to_svg(projected, west, north, scale, tolerance=0.0))
    center = [sum(p[1] for p in all_pts) / len(all_pts), sum(p[0] for p in all_pts) / len(all_pts)]
    return {"viewBox": [0, 0, round(width * scale, 2), round(height * scale, 2)],
            "path": " ".join(path)}, [round(center[0], 6), round(center[1], 6)]

def main():
    catalog = json.loads((ROOT / "kajtoje-katalog.json").read_text(encoding="utf-8"))
    names = catalog["cities"]
    if len(names) != 75 or len(set(names)) != 75:
        raise RuntimeError("Katalog nie zawiera 75 unikatowych nazw")
    features, source_query = fetch_features()
    by_name = {}
    for f in features:
        a = f.get("attributes", {})
        name, teryt = a.get("nazwa"), str(a.get("teryt") or "")
        if name in names and len(teryt) == 7 and teryt.startswith("24") and teryt[-1] in "14":
            by_name.setdefault(name, []).append(f)

    records, findings = [], []
    for name in names:
        matches = by_name.get(name, [])
        if len(matches) != 1:
            findings.append({"city": name, "issue": f"Znaleziono {len(matches)} pasujących obiektów PRG; sprawdź TERYT"})
            continue
        item = matches[0]
        try:
            svg, center = contour(item.get("geometry") or {})
        except ValueError as ex:
            findings.append({"city": name, "issue": str(ex)})
            continue
        records.append({"id": str(item["attributes"]["teryt"]), "name": name,
                        "center": center, "contour": svg,
                        "borderSource": source_query, "boundaryReferenceDate": "WYMAGA POTWIERDZENIA"})
    if len({r["id"] for r in records}) != len(records):
        raise RuntimeError("Duplikaty identyfikatorów TERYT")
    audit = {"source": API_SOURCE, "query": source_query, "catalog": catalog["source"],
             "officialTerytComparisonDone": False, "visualReviewDone": False,
             "records": len(records), "expected": 75, "issues": findings}
    (ROOT / "kajtoje-granice-robocze.json").write_text(
        json.dumps({"status": "DO_WERYFIKACJI", "cities": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (ROOT / "kajtoje-audyt-granic.json").write_text(
        json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("PRG:", len(records), "/ 75; niejednoznaczne:", len(findings))
    for item in findings:
        print(item["city"] + ": " + item["issue"])
    if findings:
        raise SystemExit("Niekompletne dane; sprawdź raport. Nie publikuj.")

if __name__ == "__main__":
    main()
