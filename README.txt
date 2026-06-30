Szpilplac Auth v08 login fix

Wgraj wszystkie pliki naraz:
- konto.html
- ranking.html
- auth-widget.js
- auth-diagnostyka.html

Najważniejsza poprawka:
konto.html po evencie SIGNED_IN natychmiast pokazuje profil.
Jeśli signInWithPassword() nie zwróci odpowiedzi, ale sesja już istnieje,
strona traktuje logowanie jako udane, a nie jako błąd timeoutu.

Po wgraniu:
1. /auth-diagnostyka.html -> Wyczyść lokalne sesje auth
2. /konto.html?v=08 -> zaloguj się
3. /ranking.html?v=08
