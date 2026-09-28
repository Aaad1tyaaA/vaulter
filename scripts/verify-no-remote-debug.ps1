# Launches the packaged exe with Chromium's --remote-debugging-port and checks no DevTools endpoint appears.
$exe = Join-Path (Split-Path -Parent $PSScriptRoot) 'release\win-unpacked\Vaulter.exe'
Get-Process Vaulter -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process -FilePath $exe -ArgumentList '--remote-debugging-port=9229' | Out-Null
Start-Sleep -Seconds 6
$open = $false
try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://127.0.0.1:9229/json/list; $open = $true; "endpoint answered: $($r.Content.Substring(0, [Math]::Min(160, $r.Content.Length)))" } catch { }
Get-Process Vaulter -ErrorAction SilentlyContinue | Stop-Process -Force
if ($open) { 'FAIL  --remote-debugging-port exposes the page to DevTools'; exit 1 } else { 'PASS  --remote-debugging-port opens nothing'; exit 0 }
