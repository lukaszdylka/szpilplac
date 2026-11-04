#!/usr/bin/env python3
"""Kaj to je?: bezpieczny audyt wyeksportowanych miejskich geometrii PRG.

Wymaga pliku GeoJSON wyeksportowanego z właściwej warstwy miast PRG,
po uprzednim sprawdzeniu schematu warstwy. Nie wykorzystuje warstwy
Gminy z PRG_gugik_wyszukiwarka: zawiera granice całych gmin.
Uruchomienie: python kajtoje-import.py granice-miast.geojson
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent

def audit(path):
    catalog = json.loads((ROOT / "kajtoje-katalog.json").read_text(encoding="utf-8"))
    expected = set(catalog["cities"])
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("type") != "FeatureCollection":
        raise ValueError("Wymagany GeoJSON FeatureCollection wyeksportowany z PRG")
    provenance = raw.get("provenance", {})
    # Wymagane ręczne udokumentowanie rodzaju jednostek i linku do źródła.
    if provenance.get("unitType") != "city" or not provenance.get("officialSourceUrl"):
        raise ValueError("Brak udokumentowanej warstwy samych miast; nie używaj warstwy gmin")
    output, issues = [], []
    seen = set()
    for f in raw.get("features", []):
        props = f.get("properties") or {}
        name = props.get("name") or props.get("nazwa") or props.get("NAZWA")
        if name not in expected:
            continue
        if name in seen:
            issues.append({"city":name,"error":"duplikat nazwy"})
            continue
        seen.add(name)
        code = str(props.get("teryt") or props.get("TERYT") or props.get("id") or "")
        geom = f.get("geometry") or {}
        if len(code) != 7 or not code.isdigit() or not code.startswith("24") or code[-1] != "4":
            issues.append({"city":name,"error":"brak potwierdzonego kodu miejskiej części gminy; sprawdź TERYT"})
            continue
        if geom.get("type") not in ("Polygon","MultiPolygon"):
            issues.append({"city":name,"error":"nieprawidłowa geometria"})
            continue
        coords = geom.get("coordinates")
        if not coords:
            issues.append({"city":name,"error":"pusta geometria"})
            continue
        # Zachowujemy oryginalny GeoJSON 1:1, bez stratnego przekształcania;
        # SVG powstaje dopiero w dalszym, kontrolowanym procesie.
        output.append({"id":code,"name":name,"geometry":geom,"source":provenance["officialSourceUrl"],
                       "referenceDate":provenance.get("referenceDate")})
    for name in sorted(expected-seen):
        issues.append({"city":name,"error":"brak w wejściowym GeoJSON"})
    if len({r["id"] for r in output}) != len(output):
        issues.append({"city":"ALL","error":"powtarzające się identyfikatory TERYT"})
    report = {"status":"NOT_VERIFIED","count":len(output),"expected":75,
              "issues":issues,"source":provenance,"terytIndependentComparison":False,
              "visualInspection":False}
    (ROOT/"kajtoje-audyt-granic.json").write_text(
        json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (ROOT/"kajtoje-granice-robocze.json").write_text(
        json.dumps({"status":"NOT_VERIFIED","features":output},ensure_ascii=False)+"\n",encoding="utf-8")
    print("Znaleziono:",len(output),"/75. Problemy:",len(issues))
    if issues:
        raise SystemExit("Baza niekompletna, zajrzyj do kajtoje-audyt-granic.json")
    print("Kontrola formalna bez błędów; wymagana niezależna weryfikacja TERYT i konturów.")

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("Użycie: python kajtoje-import.py granice-miast.geojson")
    audit(pathlib.Path(sys.argv[1]))
