@echo off
echo ==========================================
echo Szpilplac - Kamraty z placu v2
echo ==========================================
echo.
python apply-kamraty-v2.py

echo.
echo Git status:
git status

echo.
echo Commit i push...
git add .gitignore kamraty.js gracz.html konto.html ranking.html apply-kamraty-v2.py files/kamraty.js files/gracz.html
git commit -m "Improve Kamraty z placu feedback and theme"
git push origin main

echo.
echo Gotowe. Po wdrozeniu zrob Ctrl+F5 na ranking.html, gracz.html i konto.html.
pause
