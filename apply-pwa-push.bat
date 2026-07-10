@echo off
echo ==========================================
echo Szpilplac - PWA + powiadomienia
echo ==========================================
echo.
py "%~dp0apply-pwa-push.py"
echo.
echo Git status:
git status
echo.
pause
