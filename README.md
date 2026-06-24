# Szpilplac

Codzienne familockowe gry i zagadki ze śląskiego escape roomu [Starzik](https://www.familock.pl) w Świętochłowicach.

**→ [szpilplac.familock.pl](https://szpilplac.familock.pl)**

---

## Gry

| Gra | Status | Opis |
|-----|--------|------|
| **Słōwko** | ✅ aktywna | Zgadnij śląskie słowo dnia w 6 próbach |
| **Kłōdka** | 🔜 wkrótce | Złam 4-cyfrowy kod — codziennie nowy |
| **Fotka** | 🔜 wkrótce | Zgadnij przedmiot ze Starzika po zdjęciu |

---

## Słōwko

Codzienna gra słowna w stylu Wordle, ale po śląsku.

- Jedno śląskie słowo dziennie, długość zmienna (4–7 liter)
- 6 prób niezależnie od długości słowa
- Słownik zweryfikowany na podstawie [bonclok.pl](https://bonclok.pl/slowniczek-wyrazow-slaskich/) i [slunski-chachor.com](https://slunski-chachor.com)
- Pisownia uproszczona (centralna, bezdyftongiczna) — standardowe litery PL, bez znaków specjalnych ō/ô/ŏ
- Interfejs w dwóch językach: polski i śląski
- Motyw jasny / ciemny / systemowy
- Statystyki i seria w localStorage
- Udostępnianie wyniku (emoji grid)

**Słownik:** 93 słowa (18 × 4 litery, 39 × 5 liter, 27 × 6 liter, 9 × 7 liter)

---

## Stack

- Vanilla JS — zero frameworków, zero bundlera
- [Cloudflare Pages](https://pages.cloudflare.com) — hosting
- [Supabase](https://supabase.com) — opcjonalny backend ukrywający słowo dnia przed klientem

### Tryb lokalny (domyślny)

Słowa są w pliku `slowko.html` w tablicy `LOCAL_WORDS`. Gra działa w pełni bez Supabase — słowo dnia wybierane deterministycznie z seeda daty, po stronie klienta.

### Tryb Supabase (opcjonalny)

Słowa leżą w tabeli zablokowanej przez RLS — klient nigdy jej nie czyta bezpośrednio. Komunikacja tylko przez trzy RPC:

| Funkcja | Kiedy | Zwraca |
|---------|-------|--------|
| `wihajster_today()` | start gry | długość słowa + numer dnia |
| `wihajster_guess(p_guess)` | każda próba | ocena liter (correct/present/absent) |
| `wihajster_reveal()` | koniec gry | pełne słowo + znaczenie po polsku |

Wystarczy `anon key` — gra nie wymaga logowania użytkowników.

---

## Struktura plików

```
index.html          # hub Szpilplac — menu gier
slowko.html         # gra Słōwko
supabase.sql        # schemat bazy + seed słownika (opcjonalne)
README.md
```

Docelowa struktura przy rozbudowie o kolejne gry:

```
index.html
slowko/
  index.html
klodka/
  index.html
fotka/
  index.html
_core/
  tokens.css        # wspólne tokeny CSS (kolory, typografia)
```

---

## Uruchomienie lokalne

Wystarczy otworzyć `index.html` w przeglądarce. Nie ma żadnego kroku budowania.

```bash
# opcjonalnie — lokalny serwer żeby uniknąć cors przy localStorage
npx serve .
# lub
python3 -m http.server
```

---

## Konfiguracja Supabase

1. Uruchom `supabase.sql` w Supabase → SQL Editor
2. Uzupełnij w `slowko.html`:

```js
var SUPABASE_URL      = "https://twojprojekt.supabase.co";
var SUPABASE_ANON_KEY = "twoj-anon-key";
```

3. Ustaw datę startu (musi być zgodna w obu miejscach):
   - w `slowko.html`: `new Date(2026, 5, 23)` (miesiące od 0)
   - w `supabase.sql`: funkcja `wihajster_epoch()`

Bez uzupełnienia URL/key gra automatycznie wraca do trybu lokalnego.

---

## Edycja słownika

Słowa edytujesz w `slowko.html` w tablicy `LOCAL_WORDS`:

```js
var LOCAL_WORDS = [
  {w:"ANCUG", pl:"garnitur"},
  {w:"STARZIK", pl:"dziadek"},
  // ...
];
```

Zasady:
- Wielkie litery, standardowe znaki PL (A–Ź + Ą Ć Ę Ł Ń Ó Ś Ź Ż)
- Długość 4–7 liter (liczba punktów kodowych, nie bajtów — Ł, Ż itp. liczą się jako 1)
- Pisownia śląska bez ō/ô — ŁOKNO (nie: łôkno), RECHTOR (nie: rechtōr), WONGEL (nie: wōngel)
- Pole `pl` to tłumaczenie pokazywane po zakończeniu gry

Jeśli używasz Supabase, po edycji uruchom ponownie sekcję INSERT z `supabase.sql` (jest `on conflict do nothing` — bezpieczne przy ponownym uruchomieniu).

---

## Motyw i język

Wybór motywu (jasny/ciemny/systemowy) zapisywany pod kluczem `szpilplac_theme`.  
Wybór języka (PL/ŚL) zapisywany pod kluczem `familock_lang` — wspólny dla wszystkich gier na Szpilplacu.

---

## Licencja

Kod — MIT.  
Słownik śląski pochodzi ze źródeł: [bonclok.pl](https://bonclok.pl) i [slunski-chachor.com](https://slunski-chachor.com) — prawa autorskie należą do ich właścicieli.

---

*Familock · escape room Starzik · Świętochłowice*  
[familock.pl](https://www.familock.pl) · [gra.familock.pl](https://gra.familock.pl)
