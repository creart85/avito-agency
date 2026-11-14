@echo off
setlocal
set "AVITO_DRAFT_DIR=%~dp0dist"
set "AVITO_DRAFT_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
powershell -NoProfile -Command "$uri='http://127.0.0.1:4173/'; $ready=$false; try { $ready=(Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 2).Content.Contains('artur-gatin-avito-draft') } catch {}; if (-not $ready) { if (Test-Path -LiteralPath $env:AVITO_DRAFT_PYTHON) { Start-Process -FilePath $env:AVITO_DRAFT_PYTHON -ArgumentList @('-m','http.server','4173','--bind','127.0.0.1') -WorkingDirectory $env:AVITO_DRAFT_DIR -WindowStyle Hidden; Start-Sleep -Milliseconds 900; try { $ready=(Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 3).Content.Contains('artur-gatin-avito-draft') } catch {} } }; if ($ready) { Start-Process $uri } else { Write-Host 'Preview could not start. Return to the Codex chat for help.'; Read-Host 'Press Enter to close' }"
endlocal
