# Restore latest konto.html and ranking.html from GitHub with correct UTF-8 bytes.
# Run this from the main szpilplac repository folder.

$ErrorActionPreference = "Stop"

Write-Host "Szpilplac: przywracanie konto.html i ranking.html z GitHuba..." -ForegroundColor Cyan

$repo = "https://raw.githubusercontent.com/lukaszdylka/szpilplac/main"
$files = @("konto.html", "ranking.html")

$backupDir = "_backup_kodowanie_" + (Get-Date -Format "yyyyMMdd-HHmmss")
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file (Join-Path $backupDir $file) -Force
        Write-Host "Backup:" $file "->" $backupDir
    }

    $url = "$repo/$file"
    Write-Host "Pobieram:" $url
    Invoke-WebRequest -Uri $url -OutFile $file

    # Quick byte-level sanity check: file should contain UTF-8 bytes, not PowerShell-reencoded text.
    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $file))
    if ($bytes.Length -lt 1000) {
        throw "Plik $file wygląda podejrzanie mały. Przerwano."
    }
}

Write-Host ""
Write-Host "Gotowe. Sprawdź teraz:" -ForegroundColor Green
Write-Host "git status"
Write-Host ""
Write-Host "Jeśli jest OK:"
Write-Host "git add konto.html ranking.html"
Write-Host 'git commit -m "Restore UTF-8 konto and ranking files"'
Write-Host "git push origin main"
Write-Host ""
Write-Host "Nie używaj już: Get-Content ... | Set-Content ... -Encoding UTF8 dla dużych HTML-i." -ForegroundColor Yellow
