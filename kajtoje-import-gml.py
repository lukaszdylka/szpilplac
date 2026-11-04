#!/usr/bin/env python3
"""Wczytaj lokalny plik A04_Granice_miast.gml do audytu Kaj to je?.

Użycie:
  python3 kajtoje-import-gml.py ms_A04_Granice_miast.gml --reference-date 2026-11-04

Wymaga zainstalowanego GDAL (ogrinfo, ogr2ogr). Nie łączy się z WFS.
"""
import argparse
import datetime
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
EXPORT = ROOT / "kajtoje-granice-z-prg.geojson"

def cmd(args, timeout=180):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError("GDAL: " + (result.stderr or result.stdout)[-5000:])
    return result.stdout

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("gml", type=pathlib.Path)
    parser.add_argument("--reference-date", required=True)
    args = parser.parse_args()
    datetime.date.fromisoformat(args.reference_date)
    path = args.gml.resolve()
    if not path.is_file() or path.stat().st_size < 1000:
        raise RuntimeError("Brak GML lub plik pusty")
    print("GML:", path, "bajtów:", path.stat().st_size, flush=True)
    # ogrinfo -ro file nie wykonuje żadnego zapytania sieciowego.
    info = cmd(["ogrinfo", "-ro", "-so", str(path)])
    print(info[:4500], flush=True)
    lines = re.findall(r"^\s*\d+:\s+([^\r\n]+)", info, re.MULTILINE)
    if not lines:
        raise RuntimeError("Nie wykryto warstwy w lokalnym GML")
    layers = [line.strip().split(" (", 1)[0] for line in lines]
    preferred = [layer for layer in layers if "A04_Granice_miast" in layer]
    if len(preferred) == 1:
        layer = preferred[0]
    elif len(layers) == 1:
        layer = layers[0]
    else:
        raise RuntimeError("Niejednoznaczne warstwy GML: " + repr(layers))
    print("Warstwa GML:", layer, flush=True)
    EXPORT.unlink(missing_ok=True)
    cmd(["ogr2ogr", "-overwrite", "-f", "GeoJSON", str(EXPORT), str(path),
         layer, "-t_srs", "EPSG:4326", "-lco", "RFC7946=YES"], timeout=240)
    with EXPORT.open(encoding="utf-8") as f:
        doc = json.load(f)
    if doc.get("type") != "FeatureCollection" or not isinstance(doc.get("features"), list):
        raise RuntimeError("Nieprawidłowy GeoJSON po konwersji GML")
    n = len(doc["features"])
    print("Wszystkie miasta w lokalnym GML:", n, flush=True)
    if n < 75:
        raise RuntimeError("GML zawiera mniej niż 75 obiektów. Niekompletny eksport?")
    first = doc["features"][0].get("properties") or {}
    print("Pola warstwy:", list(first), flush=True)
    print("Przykładowy rekord:", str(first)[:1500], flush=True)
    subprocess.run([sys.executable, str(ROOT / "kajtoje-import.py"),
                    str(EXPORT), "--reference-date", args.reference_date],
                   cwd=ROOT, check=True, timeout=180)
    print("Utworzono robocze granice i raport. Nie oznaczono ich jako zatwierdzone.")

if __name__ == "__main__":
    main()
