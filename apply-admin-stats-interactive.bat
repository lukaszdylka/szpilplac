@echo off
echo ==========================================
echo Szpilplac - admin + stats layout
echo ==========================================
echo.
py "%~dp0apply-admin-stats-interactive.py"
echo.
echo Git status:
git status
echo.
echo Jezeli wszystko wyglada dobrze:
echo git add admin.html stats.html admin-enhance.js stats-responsive-fix.js .gitignore
echo git commit -m "Improve admin actions and stats layout"
echo git push origin main
echo.
pause
