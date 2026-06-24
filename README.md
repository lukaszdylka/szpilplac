# Szpilplac

Codzienne familockowe gry i zagadki ze śląskiego escape roomu [Starzik](https://www.familock.pl) w Świętochłowicach.

**→ [szpilplac.familock.pl](https://szpilplac.familock.pl)**

---

## Gry

| Gra | Status | Opis |
|-----|--------|------|
| **Słōwko** | ✅ aktywna | Zgadnij śląskie słowo dnia w 6 próbach |
| **Kłōdka** | 🔜 wkrótce | Złam 4-cyfrowy kod — codziennie nowy |
| **Cuzamen Szpil** | 🔜 wkrótce | Znajdź cztery grupy po cztery słowa |

### Aktywowanie gier

W `index.html` na górze sekcji `<script>` są dwie zmienne:

```js
var ACTIVE_KLODKA  = false;   // zmień na true żeby aktywować Kłōdkę
var ACTIVE_CUZAMEN = false;   // zmień na true żeby aktywować Cuzamen Szpil
```

`false` = kafelek widoczny w menu jako „wkrótce" (nieklikalne).  
`true` = kafelek aktywny, linkuje do gry.

---

## Słōwko

Codzienna gra słowna w stylu Wordle, ale po śląsku.

- Jedno śląskie słowo dziennie, długość zmienna (4–7 liter)
- 6 prób niezależnie od długości słowa
- Słownik zweryfikowany na podstawie [bonclok.pl](https://bonclok.pl/slowniczek-wyrazow-slaskich/) i [slunski-chachor.com](https://slunski-chachor.com)
- Pisownia uproszczona (centralna, bezdyftongiczna) — standardowe litery PL, bez ō/ô/ŏ
- Interfejs w dwóch językach: polski i śląski
- Motyw jasny / ciemny / systemowy
- Statystyki i seria w localStorage
- Udostępnianie wyniku (emoji grid)

**Słownik:** 93 słowa (18 × 4 litery, 39 × 5 liter, 27 × 6 liter, 9 × 7 liter)

---

## Cuzamen Szpil

Codzienna gra grupowania w stylu NYT Connections, ale po śląsku.

- 16 śląskich słów na planszy — znajdź 4 grupy po 4
- Każda grupa ma jeden wspólny mianownik; trudność rośnie od 🟩 do 🟫
- 4 błędy dozwolone
- Postęp zapisany w localStorage (powrót w ciągu dnia)
- Udostępnianie wyniku (emoji grid)

**Zestawy** — w pliku `cuzamen.html` w tablicy `SETS`:

```js
var SETS = [
  {
    no: 1,
    cats: [
      { color: 0, label: { pl: "Jedzenie",             szl: "Jodło"          }, words: ["WUSZT","KOLOCZ","WODZIONKA","KRUPNIOK"] },
      { color: 1, label: { pl: "Mieszkanie / familok", szl: "Chałpa / familok"}, words: ["SZRANK","BIFYJ","ANTRYJ","IZBA"]       },
      { color: 2, label: { pl: "Kolory kart do gry",   szl: "Farby kart"     }, words: ["HERC","GRIN","KROJC","SZEL"]           },
      { color: 3, label: { pl: "Kolej i transport",    szl: "Kolej i bana"   }, words: ["CUG","BANA","GLAJZA","BANHOF"]         }
    ]
  }
  /* kolejne zestawy tutaj */
];
```

Kolor 0 = najłatwiejszy (🟩), 3 = najtrudniejszy / podchwytliwy (🟫).  
Gra dobiera zestaw po numerze dnia od daty startu — działa jak Słōwko, bez backendu.

---

## Stack

- Vanilla JS — zero frameworków, zero bundlera
- [Cloudflare Pages](https://pages.cloudflare.com) — hosting
- [Supabase](https://supabase.com) — opcjonalny backend ukrywający słowo dnia (tylko Słōwko)

### Tryb lokalny (domyślny)

Słowa i zestawy są w plikach HTML. Gry działają w pełni bez Supabase — treść dnia wybierana deterministycznie z seeda daty.

### Tryb Supabase (opcjonalny, tylko Słōwko)

Słowa leżą w tabeli zablokowanej przez RLS. Klient komunikuje się przez trzy RPC:

| Funkcja | Kiedy | Zwraca |
|---------|-------|--------|
| `wihajster_today()` | start gry | długość słowa + numer dnia |
| `wihajster_guess(p_guess)` | każda próba | ocena liter (correct/present/absent) |
| `wihajster_reveal()` | koniec gry | pełne słowo + znaczenie |

Wystarczy `anon key` — gra nie wymaga logowania użytkowników.

---

## Struktura plików

```
index.html          # hub Szpilplac — menu gier
slowko.html         # Słōwko (Wordle po śląsku)
cuzamen.html        # Cuzamen Szpil (Connections po śląsku)
supabase.sql        # schemat bazy + seed słownika (opcjonalne)
README.md
```

Docelowa struktura przy rozbudowie o Kłōdkę:

```
index.html
slowko.html
cuzamen.html
klodka.html
_core/
  tokens.css        # wspólne tokeny CSS (kolory, typografia)
```

---

## Uruchomienie lokalne

Wystarczy otworzyć `index.html` w przeglądarce — brak kroku budowania.

```bash
# opcjonalnie — lokalny serwer (lepszy localStorage między stronami)
npx serve .
# lub
python3 -m http.server
```

---

## Konfiguracja Supabase (Słōwko)

1. Uruchom `supabase.sql` w Supabase → SQL Editor
2. Uzupełnij w `slowko.html`:

```js
var SUPABASE_URL      = "https://twojprojekt.supabase.co";
var SUPABASE_ANON_KEY = "twoj-anon-key";
```

3. Ustaw datę startu (musi być zgodna w obu miejscach):
   - `slowko.html`: `new Date(2026, 5, 23)`
   - `supabase.sql`: funkcja `wihajster_epoch()`

Bez uzupełnienia URL/key gra automatycznie wraca do trybu lokalnego.

---

## Edycja słownika (Słōwko)

Edytujesz tablicę `LOCAL_WORDS` w `slowko.html`:

```js
var LOCAL_WORDS = [
  {w:"ANCUG",   pl:"garnitur"},
  {w:"STARZIK", pl:"dziadek"},
  // ...
];
```

Zasady:
- Wielkie litery, znaki PL (A–Ż + Ą Ć Ę Ł Ń Ó Ś Ź Ż)
- Długość 4–7 liter (Ł, Ż itp. liczą się jako 1 znak)
- Pisownia śląska bez ō/ô: ŁOKNO, RECHTOR, WONGEL
- `pl` — tłumaczenie pokazywane po zakończeniu gry

---

## Dodawanie zestawów (Cuzamen Szpil)

Dopisz kolejny obiekt do tablicy `SETS` w `cuzamen.html`. Gra automatycznie dobiera zestaw po numerze dnia.

Wskazówka do układania: **jedna kategoria powinna być podchwytliwa** — słowo, które pasuje do dwóch grup, ale należy tylko do jednej.

---

## Motyw i język

| Klucz localStorage | Wartości | Opis |
|--------------------|----------|------|
| `szpilplac_theme` | `system` / `light` / `dark` | motyw — wspólny dla wszystkich gier |
| `familock_lang`   | `pl` / `szl` | język interfejsu — wspólny dla wszystkich gier |

---

## Licencja

Kod — MIT.  
Słownik śląski pochodzi ze źródeł: [bonclok.pl](https://bonclok.pl) i [slunski-chachor.com](https://slunski-chachor.com) — prawa autorskie należą do ich właścicieli.

---

*Familock · escape room Starzik · Świętochłowice*  
[familock.pl](https://www.familock.pl) · [gra.familock.pl](https://gra.familock.pl)
