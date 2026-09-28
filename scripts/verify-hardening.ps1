# Verifies the packaged exe's lockdown:  powershell -File scripts\verify-hardening.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root 'release\win-unpacked\Vaulter.exe'
$fail = 0
function Check($name, $ok) { if ($ok) { "PASS  $name" } else { "FAIL  $name"; $script:fail++ } }
function StopVaulter { Get-Process Vaulter -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe } | Stop-Process -Force }

# 1. fuses are burned into the exe
$fuses = node (Join-Path $root 'node_modules\@electron\fuses\dist\bin.js') read --app $exe 2>&1 | Out-String
Check 'RunAsNode fuse disabled' ($fuses -match 'RunAsNode is Disabled')
Check 'NODE_OPTIONS fuse disabled' ($fuses -match 'EnableNodeOptionsEnvironmentVariable is Disabled')
Check 'Node CLI inspect fuse disabled' ($fuses -match 'EnableNodeCliInspectArguments is Disabled')
Check 'Asar integrity validation enabled' ($fuses -match 'EnableEmbeddedAsarIntegrityValidation is Enabled')
Check 'Only load app from asar enabled' ($fuses -match 'OnlyLoadAppFromAsar is Enabled')

# 2. ELECTRON_RUN_AS_NODE can't turn the exe into a Node interpreter
$marker = Join-Path $env:TEMP 'vaulter-node-escape.txt'
Remove-Item $marker -ErrorAction SilentlyContinue
$js = Join-Path $env:TEMP 'vaulter-escape.js'
Set-Content $js "require('fs').writeFileSync(process.argv[2] || '$($marker.Replace('\','\\'))', 'escaped')"
$env:ELECTRON_RUN_AS_NODE = '1'
Start-Process -FilePath $exe -ArgumentList $js | Out-Null
Start-Sleep -Seconds 4
$env:ELECTRON_RUN_AS_NODE = $null
StopVaulter
Check 'ELECTRON_RUN_AS_NODE blocked (no script ran)' (-not (Test-Path $marker))

# 3. --inspect doesn't open a debugger port
Start-Process -FilePath $exe -ArgumentList '--inspect=9339' | Out-Null
Start-Sleep -Seconds 5
$open = Test-NetConnection -ComputerName 127.0.0.1 -Port 9339 -InformationLevel Quiet -WarningAction SilentlyContinue
StopVaulter
Check '--inspect opens no debugger port' (-not $open)

"`n$fail failure(s)"
exit $fail
