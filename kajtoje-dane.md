# Kaj to je? — wymagania danych gry

Stan: silnik gry zapisany w `kajtoje.html`. Brak zatwierdzonego katalogu 75 miast, więc gra celowo pokazuje komunikat o braku danych zamiast fikcyjnych konturów lub herbów.

## Pliki wymagane do uruchomienia

1. `kajtoje-data.json`, format poniżej. Dopiero po audycie wszystkich 75 miast ustaw `verified: true`.
2. `kajtoje-herby/<identyfikator>.svg`, oficjalne herby zgodne z aktami prawnymi danego miasta.

Przykładowy FORMAT rekordu (to wyłącznie wzór pól, nie rzeczywiste dane, nie włączać jako baza produkcyjna):

```json
{
  "schema": 1,
  "verified": false,
  "cities": [
    {
      "id": "0000000",
      "name": "PRZYKŁAD",
      "center": [50.0, 19.0],
      "contour": {
        "viewBox": [0, 0, 100, 100],
        "path": "M 10 10 L 90 10 L 90 90 L 10 90 Z"
      },
      "herb": "/kajtoje-herby/0000000.svg",
      "sources": {
        "border": "URL do urzędowej wersji danych PRG",
        "herb": "URL do statutu / uchwały / BIP miasta"
      },
      "questions": [
        {
          "prompt": "Pytanie o miasto?",
          "options": ["Odpowiedź A", "Odpowiedź B", "Odpowiedź C", "Odpowiedź D"],
          "correct": 0,
          "source": "URL do GUS / PRG",
          "asOf": "2026-01-01"
        }
      ]
    }
  ]
}
```

## Źródła urzędowe

* Miasta i identyfikatory: GUS TERYT, https://eteryt.stat.gov.pl/
* Kontury miast, nie granice gmin miejsko-wiejskich: GUGiK PRG, https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/
* WFS: https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WFS/AdministrativeBoundaries
* Ludność: GUS BDL, https://bdl.stat.gov.pl/
* Herby: urzędowy statut miasta / oficjalny BIP / obowiązująca uchwała.

## Kryteria odbioru

* 75 unikatowych miast woj. śląskiego na dzień referencyjny, zgodność z TERYT.
* Granice każdego miasta w poprawnym układzie północ–góra, wieloczęściowe geometrie bez ucięć; uproszczenie bez zniekształcania kształtu.
* Dla każdego miasta urzędowy herb z dokumentem źródłowym i kontrolą możliwości użycia.
* Dla wszystkich pytań dokładnie jedna prawdziwa odpowiedź. Przy pytaniach o sąsiadów wykluczyć inne rzeczywiste sąsiedztwa.
* Dla ludności zawsze jeden rocznik i jedna definicja (miasto, nie gmina miejsko-wiejska), liczby podane w przedziałach niewprowadzających w błąd.
* Powierzchnie liczone/odczytywane z tego samego źródła i okresu; nie mieszać jednostek.
* Weryfikacja wzrokowa wszystkich 75 konturów i 75 herbów.
* Pytania i geometrię utrwalać dla zagadki dnia, by wyniki były porównywalne.

## Logika silnika

Runda 1: 6 prób, punktacja 60/50/40/30/20/10; w przypadku przegranej brak dalszych rund.
Runda 2: 4 herby, jedna próba, 20 punktów.
Runda 3: 4 warianty, jedna próba, 20 punktów.
Codzienny wybór jest deterministyczny według daty polskiej. Wybór pytań rotuje wraz z powrotem miast. Stan zapisany w localStorage pod kluczem `kajtoje_v1` z datą i ID miasta.

## Uwagi o wdrożeniu

Silnik nie pobiera granic z usług GUGiK w czasie każdej gry. Dane należy pozyskać i sprawdzić wcześniej, a następnie umieścić jako statyczny zasób. `verified: true` to znacznik zatwierdzenia danych przez redaktora, a nie dowód automatycznej poprawności. Nie należy zmieniać go bez audytu.

Nie dodawać gry do menu głównego, dopóki nie ma pełnych danych i testów. Nie trzeba zmieniać innych gier.
## Aktualny postęp prac (2026-11-04)

* Zapisano katalog 75 nazw w `kajtoje-katalog.json`, stan `do_weryfikacji_teryt`. Nie używać jako listy oficjalnie zatwierdzonej.
* Dodano `kajtoje-weryfikacja.json`: 75 kart audytu z oddzielnymi stanami dla TERYT, granic, herbów, ludności, powierzchni, sąsiadów i pytań. Puste wartości są celowe.
* Dodano `kajtoje-import.py`: pobiera warstwę gmin z państwowego PRG, filtruje kod województwa i typ jednostki, wyodrębnia kontury kandydatów oraz tworzy `kajtoje-granice-robocze.json` i `kajtoje-audyt-granic.json`. Skrypt wymaga dostępu do Internetu, a po uruchomieniu należy porównać wynik z oficjalnym TERYT i dokonać oględzin wszystkich konturów. Jeśli usługa lub jej kodowanie się zmieniły, skrypt zakończy się błędem zamiast publikować dane.
* Nie przygotowano jeszcze zweryfikowanych 75 herbów i wartości GUS. Nie ma `kajtoje-data.json`, a więc gra nie podaje niepotwierdzonych odpowiedzi.

Komenda importu w katalogu repozytorium: `python kajtoje-import.py` (Python 3.9+, bez zewnętrznych bibliotek). Generowane pliki są robocze. `verified: true` wolno ustawić dopiero po zakończeniu całego audytu.
