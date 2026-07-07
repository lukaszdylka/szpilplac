@echo off
echo ==========================================
echo Szpilplac - weekly label fix
echo ==========================================
echo.

python apply-weekly-label-fix.py

echo.
echo Git status:
git status

echo.
echo Commit i push...
git add konto-dashboard.js konto.html apply-weekly-label-fix.py
git commit -m "Show full weekly streak count in profile"
git push origin main

echo.
pause
