# Checks the running Vaulter window is excluded from screen capture by asking Windows for its display affinity
# (what setContentProtection sets). Screenshots/recorders/Recall get black for WDA_MONITOR or WDA_EXCLUDEFROMCAPTURE.
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class W { [DllImport("user32.dll")] public static extern bool GetWindowDisplayAffinity(IntPtr h, out uint a); }
"@
$exe = Join-Path (Split-Path -Parent $PSScriptRoot) 'release\win-unpacked\Vaulter.exe'
Start-Process -FilePath $exe | Out-Null
$proc = $null
for ($i = 0; $i -lt 40 -and -not $proc; $i++) {
  Start-Sleep -Milliseconds 500
  $proc = Get-Process Vaulter -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -eq 'Vaulter' } | Select-Object -First 1
}
if (-not $proc) { 'FAIL  Vaulter window never appeared'; exit 1 }
$aff = 0; [W]::GetWindowDisplayAffinity($proc.MainWindowHandle, [ref]$aff) | Out-Null
Get-Process Vaulter -ErrorAction SilentlyContinue | Stop-Process -Force
$name = @{ 0 = 'WDA_NONE (capturable)'; 1 = 'WDA_MONITOR'; 17 = 'WDA_EXCLUDEFROMCAPTURE' }[[int]$aff]
"display affinity: $aff ($name)"
if ($aff -eq 1 -or $aff -eq 17) { 'PASS  window is excluded from screen capture'; exit 0 } else { 'FAIL  window content is capturable'; exit 1 }
