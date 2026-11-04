#!/usr/bin/env python3
"""Kaj to je?: konwersja urzędowego eksportu PRG A04_Granice_miast (GeoJSON, EPSG:4326).

Przykład:
python kajtoje-import.py granice-miast.geojson --reference-date 2026-01-01

Wejście: GeoJSON wyeksportowany w QGIS z warstwy WFS A04_Granice_miast,
w układzie EPSG:4326 (WGS84). Skrypt NIE pobiera warstw GMIN.
Wyniki robocze wymagają niezależnej kontroli TERYT, kształtów i źródeł.
"""
import argparse
import json
import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
WFS = "https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WFS/AdministrativeBoundaries"
LAYER = "A04_Granice_miast"
NAME_FIELDS = ("NAZWA", "NAZWA_MIASTA", "nazwa", "name", "JPT_NAZWA_", "JPT_NAZWA")
ID_FIELDS = ("ID_JEDNOSTKI", "ID_TERYT", "TERYT", "teryt", "JPT_KOD_JE", "JPT_KOD")

def property_value(props, keys):
    for k in keys:
        value = props.get(k)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None

def extract_rings(geometry):
    kind = geometry.get("type")
    coords = geometry.get("coordinates")
    if kind == "Polygon":
        polygons = [coords]
    elif kind == "MultiPolygon":
        polygons = coords
    else:
        raise ValueError("Wymagany Polygon lub MultiPolygon")
    if not isinstance(polygons, list) or not polygons:
        raise ValueError("Brak geometrii")
    rings = []
    for poly in polygons:
        if not isinstance(poly, list) or not poly:
            raise ValueError("Pusty wielokąt")
        for ring in poly:
            if not isinstance(ring, list) or len(ring) < 4 or ring[0][:2] != ring[-1][:2]:
                raise ValueError("Otwarta lub niepełna obwiednia")
            for coord in ring:
                if len(coord) < 2 or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in coord[:2]):
                    raise ValueError("Nieprawidłowa współrzędna")
                lon, lat = coord[:2]
                if not (17 < lon < 22 and 48 < lat < 52):
                    raise ValueError("Poza zakresem woj. śląskiego; sprawdź układ EPSG:4326 i kolejność lon,lat")
            rings.append(ring)
    return rings

def to_contour(geometry):
    rings = extract_rings(geometry)
    pts = [coord for ring in rings for coord in ring]
    lons = [p[0] for p in pts]
    lats = [p[1] for p in pts]
    midlat = (min(lats) + max(lats)) / 2
    correction = math.cos(math.radians(midlat))
    west, east = min(lons), max(lons)
    north, south = max(lats), min(lats)
    width, height = (east-west)*correction, north-south
    if not width or not height:
        raise ValueError("Kontur o zerowym wymiarze")
    scale = 250/max(width,height)
    d = []
    for ring in rings:
        points = [((p[0]-west)*correction*scale, (north-p[1])*scale) for p in ring]
        d.append("M " + " L ".join(f"{x:.2f} {y:.2f}" for x,y in points) + " Z")
    return {"viewBox":[0,0,round(width*scale,2),round(height*scale,2)],
            "path":" ".join(d)}, [round(midlat,6),round((west+east)/2,6)]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("geojson",type=pathlib.Path)
    parser.add_argument("--reference-date",required=True,help="Data urzędowego stanu danych YYYY-MM-DD")
    args = parser.parse_args()
    if not re.fullmatch(r"20\d{2}-\d{2}-\d{2}",args.reference_date):
        parser.error("Wymagana data w formacie YYYY-MM-DD")
    catalog = json.loads((ROOT/"kajtoje-katalog.json").read_text(encoding="utf-8"))
    expected = set(catalog["cities"])
    if len(expected)!=75:
        raise RuntimeError("Katalog nie zawiera 75 unikatowych nazw")
    dataset=json.loads(args.geojson.read_text(encoding="utf-8"))
    if dataset.get("type")!="FeatureCollection" or not isinstance(dataset.get("features"),list):
        raise ValueError("Wymagany GeoJSON FeatureCollection")
    # QGIS zwykle nie zapisuje nazwy źródłowej warstwy, więc zapisz ją w raporcie
    # jako deklarację operatora, a nie automatycznie zweryfikowany fakt.
    crs=dataset.get("crs",{})
    if crs and "4326" not in json.dumps(crs):
        raise ValueError("GeoJSON nie ma układu EPSG:4326")
    print("GeoJSON feature count:",len(dataset["features"]),flush=True)
    if dataset["features"]:
        print("GeoJSON example property names:",sorted((dataset["features"][0].get("properties") or {}).keys()),flush=True)
        print("GeoJSON example properties:",str(dataset["features"][0].get("properties") or {})[:1000],flush=True)
    output,issues,seen=[],[],set()
    for feature in dataset["features"]:
        props=feature.get("properties") or {}
        name=property_value(props,NAME_FIELDS)
        if name not in expected:
            continue
        if name in seen:
            issues.append({"city":name,"error":"duplikat"})
            continue
        seen.add(name)
        teryt=property_value(props,ID_FIELDS)
        if not teryt or not re.fullmatch(r"24\d{4}[14]",teryt):
            issues.append({"city":name,"error":"brak poprawnego 7-cyfrowego identyfikatora TERYT rodzaju 1 lub 4"})
            continue
        try:
            contour,center=to_contour(feature.get("geometry") or {})
        except (ValueError,TypeError,IndexError) as exc:
            issues.append({"city":name,"error":str(exc)})
            continue
        output.append({"id":teryt,"name":name,"center":center,"contour":contour,
                       "sources":{"border":WFS+"; layer="+LAYER,"referenceDate":args.reference_date}})
    for missing in sorted(expected-seen):
        issues.append({"city":missing,"error":"brak na wejściu"})
    ids=[x["id"] for x in output]
    if len(set(ids))!=len(ids):
        issues.append({"city":"ALL","error":"duplikaty kodów TERYT"})
    report={"status":"NOT_VERIFIED","layerDeclared":LAYER,"source":WFS,
            "sourceLayerIndependentlyVerified":False,"referenceDateDeclared":args.reference_date,
            "officialTerytCompared":False,"visualReviewDone":False,
            "count":len(output),"expected":75,"issues":issues}
    (ROOT/"kajtoje-granice-robocze.json").write_text(
        json.dumps({"status":"NOT_VERIFIED","cities":output},ensure_ascii=False)+"\n",encoding="utf-8")
    (ROOT/"kajtoje-audyt-granic.json").write_text(
        json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Kontury:",len(output),"/75 | błędy:",len(issues))
    if issues:
        for issue in issues[:25]:
            print(issue["city"]+": "+issue["error"])
        raise SystemExit("Import niekompletny. Sprawdź kajtoje-audyt-granic.json")
    print("Komplet formalny. Wymagana niezależna kontrola PRG/TERYT i przegląd konturów.")
if __name__=="__main__":
    main()
