Szpilplac Auth v06 - ranking fix

Wgraj wszystkie pliki naraz:
- konto.html
- ranking.html
- auth-widget.js
- auth-diagnostyka.html

Najważniejsza zmiana:
ranking.html pokazuje aktywną sesję od razu, zanim dociągnie profil gracza.
Dzięki temu nie powinien zostawać na "Grasz bez konta", jeśli sesja istnieje.

Po wgraniu sprawdź:
- /konto.html
- /ranking.html?v=06
- /auth-diagnostyka.html

W konsoli powinno być:
- Szpilplac konto.html v06
- Szpilplac ranking.html v05
- Szpilplac auth-widget.js v05
