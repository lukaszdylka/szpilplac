@echo off
echo ==========================================
echo Szpilplac - Kamraty z placu v4
echo ==========================================
echo.

python apply-kamraty-v4.py

echo.
echo Git status:
git status

echo.
echo Commit i push...
git add .gitignore konto.html ranking.html kamraty.js gracz.html sql/kamraty-v4.sql apply-kamraty-v4.py files/kamraty.js files/gracz.html files/kamraty-v4.sql
git commit -m "Polish Kamraty z placu UI"
git push origin main

echo.
echo WAZNE:
echo Uruchom w Supabase SQL Editor:
echo sql/kamraty-v4.sql
echo.
pause
