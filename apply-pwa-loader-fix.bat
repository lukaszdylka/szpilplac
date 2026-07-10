@echo off
echo ==========================================
echo Szpilplac - PWA loader fix
echo ==========================================
echo.
py "%~dp0apply-pwa-loader-fix.py"
echo.
echo Git status:
git status
echo.
echo Commit:
echo git add index.html konto.html ranking.html slowko.html klodka.html gracz.html nowosci.html .gitignore
echo git commit -m "Load PWA push on site pages"
echo git push origin main
echo.
pause
