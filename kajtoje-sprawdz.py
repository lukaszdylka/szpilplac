#!/usr/bin/env python3
"""Kaj to je? Kontrola gotowości publikacji. Domyślnie tryb tylko do odczytu.

python kajtoje-sprawdz.py

Weryfikuje kompletność listy, 75 geometrii, rekordów źródłowych,
herbów i pytań. Nie pozwala oznaczyć niepełnej bazy jako gotowej.
"""
import json
import pathlib
import re
import sys
ROOT=pathlib.Path(__file__).resolve().parent
ERRORS=[]

def load(name):
    path=ROOT/name
    if not path.is_file():
        ERRORS.append(f"Brakuje: {name}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        ERRORS.append(f"Niepoprawny JSON {name}: {e}")
        return None

def check():
    catalog=load("kajtoje-katalog.json")
    review=load("kajtoje-weryfikacja.json")
    boundary=load("kajtoje-granice-robocze.json")
    game=load("kajtoje-data.json")
    if catalog:
        names=catalog.get("cities",[])
        if len(names)!=75 or len(set(names))!=75:
            ERRORS.append("Katalog: nie ma 75 unikatowych miast")
    else:
        names=[]
    if boundary:
        records=boundary.get("cities",[])
        if len(records)!=75 or {r.get("name") for r in records}!=set(names):
            ERRORS.append("Granice: lista obiektów nie zgadza się z katalogiem")
        if len({r.get("id") for r in records})!=len(records):
            ERRORS.append("Granice: powielone identyfikatory")
    if review:
        records=review.get("cities",[])
        if {r.get("name") for r in records}!=set(names):
            ERRORS.append("Weryfikacja: lista nie zgadza się z katalogiem")
        checks=["boundary","herb","population","area","neighbors","questions"]
        for r in records:
            city=r.get("name","?")
            if not re.fullmatch(r"24\d{4}[14]",str(r.get("teryt") or "")):
                ERRORS.append(city+": brak sprawdzonego TERYT")
            for key in checks:
                value=r.get(key) or {}
                if value.get("validated") is not True:
                    ERRORS.append(city+": niezatwierdzone "+key)
            if not (r.get("herb") or {}).get("source"):
                ERRORS.append(city+": brak źródła herbu")
            if not (r.get("boundary") or {}).get("source"):
                ERRORS.append(city+": brak źródła konturu")
    if game:
        cities=game.get("cities",[])
        if game.get("schema")!=1 or game.get("verified") is not True:
            ERRORS.append("Dane gry niezatwierdzone")
        if len(cities)!=75 or {r.get("name") for r in cities}!=set(names):
            ERRORS.append("Dane gry: niezgodna lista 75 miast")
        for r in cities:
            city=r.get("name","?")
            heraldry=r.get("herb","")
            if not isinstance(heraldry,str) or not heraldry.startswith("/kajtoje-herby/") or not (ROOT/heraldry.lstrip("/")).is_file():
                ERRORS.append(city+": brak lokalnego pliku herbu")
            if not (r.get("contour") or {}).get("path"):
                ERRORS.append(city+": brak konturu")
            for q in r.get("questions",[]):
                if len(q.get("options",[]))!=4 or not isinstance(q.get("correct"),int) or q["correct"] not in range(4) or not q.get("source") or not q.get("asOf"):
                    ERRORS.append(city+": błędne pytanie")
            if not r.get("questions"):
                ERRORS.append(city+": brak pytań")
    if ERRORS:
        print("KAJ TO JE?: NIEGOTOWE ("+str(len(ERRORS))+" problemów)")
        for issue in ERRORS[:40]:
            print(" • "+issue)
        if len(ERRORS)>40:
            print(" • ... oraz",len(ERRORS)-40,"kolejnych")
        return 1
    print("KAJ TO JE?: kontrole formalne zaliczone. Nadal zalecany przegląd merytoryczny.")
    return 0

if __name__=="__main__":
    sys.exit(check())
