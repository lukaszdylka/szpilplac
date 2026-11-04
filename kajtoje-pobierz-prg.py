#!/usr/bin/env python3
"""Pobierz urzędową warstwę PRG A04_Granice_miast i uruchom istniejący audyt.

Wymagania: GDAL (ogr2ogr) i Python 3.11+.
Wywołanie: python kajtoje-pobierz-prg.py --reference-date 2026-11-04

Nie ustawia verified=true ani nie publikuje żadnych danych.
"""
import argparse
import datetime
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
WFS = "https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WFS/AdministrativeBoundaries"
OUTPUT = ROOT / "kajtoje-granice-z-prg.geojson"

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
    # A04 obejmuje wszystkie miasta Polski. Filtr przestrzenny WFS bywa
    # interpretowany w kolejności osi zależnej od CRS, co może dać 0 obiektów
    # mimo kodu wyjścia 0. Najpierw diagnostyka, potem pełny eksport.
    details = subprocess.run(["ogrinfo","-ro","-so","-al",source,layer],
        cwd=ROOT,capture_output=True,text=True,timeout=120)
    print("Ogrinfo layer schema / diagnostics:", (details.stdout+"\\n"+details.stderr)[-8000:], flush=True)
    if details.returncode != 0:
        raise RuntimeError("Nie udało się odczytać warstwy A04 z WFS")
    # Bez -spat: nie ryzykuj pustego wyniku wskutek zamiany osi / bbox.
    # Dane całej Polski są pobierane tylko jako plik roboczy do audytu.
    command=["ogr2ogr","-overwrite","-f","GeoJSON",str(OUTPUT),
             source,layer,"-t_srs","EPSG:4326","-lco","RFC7946=YES"]
    result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=600)
    print("ogr2ogr stdout:",result.stdout[-3000:],flush=True)
    print("ogr2ogr stderr:",result.stderr[-5000:],flush=True)
    if result.returncode != 0:
        raise RuntimeError("Eksport PRG nie powiódł się. Kod: "+str(result.returncode))
    if not OUTPUT.is_file():
        raise RuntimeError("Eksport PRG nie stworzył pliku")
    size=OUTPUT.stat().st_size
    print("Rozmiar pobranego GeoJSON:",size,"bajtów",flush=True)
    with OUTPUT.open(encoding="utf-8") as fh:
        obj=json.load(fh)
    if obj.get("type")!="FeatureCollection" or not isinstance(obj.get("features"),list):
        raise RuntimeError("GeoJSON ma nieprawidłowy format")
    print("Liczba obiektów w eksporcie:",len(obj["features"]),flush=True)
    if len(obj["features"])<75:
        raise RuntimeError("Warstwa A04 zwróciła mniej niż 75 miast, sprawdź WFS")
    run([sys.executable, str(ROOT / "kajtoje-import.py"), str(OUTPUT),
         "--reference-date", args.reference_date])
    print("Powstały dane robocze. Weryfikacja TERYT i herbów pozostaje obowiązkowa.")

if __name__ == "__main__":
    main()
