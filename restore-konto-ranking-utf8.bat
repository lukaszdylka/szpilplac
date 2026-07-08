@echo off
echo ==========================================
echo Szpilplac - restore konto/ranking UTF-8
echo ==========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-konto-ranking-utf8.ps1"
echo.
pause
