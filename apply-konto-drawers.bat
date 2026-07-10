@echo off
echo ==========================================
echo Szpilplac - konto: menu wysuwane
echo ==========================================
echo.
py "%~dp0apply-konto-drawers.py"
echo.
echo Git status:
git status
echo.
echo Jezeli wyglada dobrze:
echo git add konto.html konto-drawers.js .gitignore
echo git commit -m "Simplify account profile with drawers"
echo git push origin main
echo.
pause
