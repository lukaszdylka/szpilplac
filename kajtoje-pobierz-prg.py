#!/usr/bin/env python3
"""Pobierz urzędową warstwę PRG A04_Granice_miast i uruchom istniejący audyt.

Wymagania: GDAL (ogr2ogr) i Python 3.11+.
Wywołanie: python kajtoje-pobierz-prg.py --reference-date 2026-11-04

Nie ustawia verified=true ani nie publikuje żadnych danych.
"""
import argparse
import datetime
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
WFS = "https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WFS/AdministrativeBoundaries"
OUTPUT = ROOT / "kajtoje-granice-z-prg.geojson"

def run(cmd):
    print("Uruchamiam:", " ".join(str(x) for x in cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True, timeout=240)

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reference-date", required=True, help="Data sprawdzenia źródła YYYY-MM-DD")
    args = ap.parse_args()
    try:
        datetime.date.fromisoformat(args.reference_date)
    except ValueError:
        ap.error("Niepoprawna data")
    OUTPUT.unlink(missing_ok=True)
    source = "WFS:" + WFS
    # WFS commonly exposes feature types with the ms: prefix.
    # Discover the actual GDAL layer name rather than assuming it.
    listing = subprocess.run(["ogrinfo", "-ro", "-so", source], cwd=ROOT,
        check=True, capture_output=True, text=True, timeout=120).stdout
    matches = re.findall(r"^\s*\d+:\s+(\S*A04_Granice_miast)\s*(?:\(|$)", listing, flags=re.MULTILINE)
    if len(matches) != 1:
        raise RuntimeError("Nie udało się jednoznacznie ustalić warstwy A04 w WFS: "+listing[:2000])
    layer = matches[0]
    print("Urzędowa warstwa WFS:", layer, flush=True)
    # BBOX to filtr wyłącznie pobraniowy; nie zastępuje oficjalnego TERYT.
    # Warstwa A04 jest osobną warstwą miast, nie A03 (całe gminy).
    run(["ogr2ogr", "-overwrite", "-f", "GeoJSON", str(OUTPUT),
         source, layer,
         "-spat", "17.0", "48.0", "22.0", "52.0",
         "-t_srs", "EPSG:4326", "-lco", "RFC7946=YES"])
    if not OUTPUT.is_file() or OUTPUT.stat().st_size < 10000:
        raise RuntimeError("Eksport PRG jest pusty albo niekompletny")
    run([sys.executable, str(ROOT / "kajtoje-import.py"), str(OUTPUT),
         "--reference-date", args.reference_date])
    print("Powstały dane robocze. Weryfikacja TERYT i herbów pozostaje obowiązkowa.")

if __name__ == "__main__":
    main()
