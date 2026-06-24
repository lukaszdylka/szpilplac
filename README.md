# Szpilplac

**Szpilplac** (śl. *plac zabaw*) to codzienny hub z grami słownymi i logicznymi po śląsku — zbudowany dla escape roomu [Starzik](https://www.familock.pl) w Świętochłowicach.

➡️ **[szpilplac.familock.pl](https://szpilplac.familock.pl)**

---

## Gry

### 🔤 Słōwko
Codzienna gra słowna w stylu Wordle — ale po śląsku.

Każdego dnia jedno śląskie słowo do odgadnięcia w 6 próbach. Długość słowa zmienia się każdego dnia (4–7 liter). Po każdej próbie kafelki pokazują, które litery są na właściwym miejscu, które są w słowie, a których w ogóle nie ma.

Dodatkowe funkcje:
- **Archiwum** — kalendarz z poprzednimi dniami; podgląd własnego wyniku jeśli się grało
- **Wskazówka** — opcjonalne tłumaczenie słowa po polsku; włączane w ustawieniach — na żądanie lub automatycznie po wybranej liczbie prób
- **Tryb testowy** — dostępny przez URL dla testujących, z większą liczbą prób i pełnym dostępem do archiwum

### 🔢 Kłōdka
*(wkrótce)* Zgadnij 4-cyfrowy kod do kłódki — codziennie nowy.

### 🔲 Cuzamen Szpil
*(wkrótce)* Znajdź cztery grupy po cztery śląskie słowa — w stylu NYT Connections.

---

## Słownik

Słowa śląskie zweryfikowane na podstawie:
- [bonclok.pl](https://bonclok.pl/slowniczek-wyrazow-slaskich/)
- [slunski-chachor.com](https://slunski-chachor.com)

Pisownia uproszczona — centralna, bezdyftongiczna. Standardowe litery polskie, bez znaków specjalnych ō/ô/ŏ.

---

## Technologie

- **Vanilla JS** — zero frameworków, zero bundlera
- **Cloudflare Pages** — hosting
- **Supabase** — backend: słowa ukryte za RLS, ocena liter po stronie serwera

Słowo dnia nigdy nie pojawia się w HTML — klient zna tylko jego długość. Supabase ocenia każdą próbę po stronie serwera i ujawnia słowo dopiero po zakończeniu gry.

---

## Projekt

Szpilplac to projekt [Familock](https://www.familock.pl) — escape roomu *Starzik* w Świętochłowicach, opartego na śląskim klimacie familoka. Gracze wcielają się w pracowników opieki społecznej, którzy badają tajemnicze zniknięcie starszego mężczyzny — Józefa.

Więcej o escape roomie: [familock.pl](https://www.familock.pl)  
Gra point&click online: [gra.familock.pl](https://gra.familock.pl)

---

*Made in Świyntochłowice* 🏭
