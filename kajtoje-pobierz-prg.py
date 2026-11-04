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
    # Nazwa została już potwierdzona przez wcześniejszy udany eksport 1050
    # obiektów. Nie pytaj ponownie ogrinfo: niepotrzebnie blokuje WFS.
    layer = "ms:A04_Granice_miast"
    print("Warstwa urzędowa (potwierdzona wcześniejszym eksportem):", layer, flush=True)
    # Bez -spat: nie ryzykuj pustego wyniku wskutek zamiany osi / bbox.
    # Dane całej Polski są pobierane tylko jako plik roboczy do audytu.
    command=["ogr2ogr","-overwrite","-f","GeoJSON",str(OUTPUT),
             source,layer,"-t_srs","EPSG:4326","-lco","RFC7946=YES"]
    # Ograniczony retry na przejściowe błędy serwera; każda próba zaczyna
    # od usunięcia niekompletnego eksportu.
    import time
    for attempt in range(1,4):
        OUTPUT.unlink(missing_ok=True)
        print(f"Eksport PRG: próba {attempt}/3",flush=True)
        try:
            result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
            print("ogr2ogr stdout:",result.stdout[-1000:],flush=True)
            print("ogr2ogr stderr:",result.stderr[-3000:],flush=True)
            if result.returncode==0 and OUTPUT.is_file() and OUTPUT.stat().st_size>10000:
                break
        except subprocess.TimeoutExpired:
            print("Przekroczony czas pobierania z serwera GUGiK",flush=True)
        if attempt==3:
            raise RuntimeError("Nie udało się pobrać PRG po 3 próbach; użyj lokalnego GML A04")
        time.sleep(5)
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
    subprocess.run([sys.executable, str(ROOT / "kajtoje-import.py"), str(OUTPUT),
                    "--reference-date", args.reference_date],
                   cwd=ROOT, check=True, timeout=240)
    print("Powstały dane robocze. Weryfikacja TERYT i herbów pozostaje obowiązkowa.")

if __name__ == "__main__":
    main()
