Szpilplac Auth v07 hardfix

Wgraj wszystkie pliki naraz:
- konto.html
- ranking.html
- auth-widget.js
- auth-diagnostyka.html

Najważniejsza zmiana:
ranking.html nie polega już tylko na evencie/getSession.
Najpierw czyta sesję bezpośrednio z localStorage pod kluczem:
szpilplac-auth-v05

To jest ten sam klucz, który auth-diagnostyka pokazała jako aktywny.

Po wgraniu:
1. /konto.html?v=07
2. zaloguj się
3. /auth-diagnostyka.html - ma pokazać Sesja v05 true
4. /ranking.html?v=07

W konsoli rankingu powinno być:
Szpilplac ranking.html v07-localStorage-hardfix
Szpilplac ranking localStorage session: hasStoredSession true
Szpilplac ranking auth final: hasUser true
