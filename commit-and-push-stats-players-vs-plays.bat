@echo off
echo ==========================================
echo Szpilplac - statystyki: konta vs gry vs gracze
echo ==========================================
echo.

python apply-stats-players-vs-plays.py

echo.
echo Git status:
git status

echo.
echo Commit i push...
git add .gitignore slowko.html klodka.html raja/index.html game-result-actions.js stats.html sql/stats-players-vs-plays.sql apply-stats-players-vs-plays.py
git commit -m "Separate account activity from all player game stats"
git push origin main

echo.
echo WAZNE:
echo Uruchom w Supabase SQL Editor:
echo sql/stats-players-vs-plays.sql
echo.
pause
