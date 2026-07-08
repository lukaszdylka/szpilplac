@echo off
echo ==========================================
echo Szpilplac - odznaki Kamraty z placu
echo ==========================================
echo.

python apply-kamraty-achievements.py

echo.
echo Git status:
git status

echo.
echo Commit i push...
git add .gitignore achievements-panel.js konto.html ranking.html gracz.html kamraty-achievements-bridge.js sql/kamraty-achievements.sql apply-kamraty-achievements.py
git commit -m "Add Kamraty achievements"
git push origin main

echo.
echo WAZNE:
echo Teraz uruchom w Supabase SQL Editor:
echo sql/kamraty-achievements.sql
echo.
pause
