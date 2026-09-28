// Secret-safe clipboard for Vaulter (main process). Split out so scripts/test-clipboard.cjs tests the real code.
const { clipboard } = require('electron')
const { spawn } = require('child_process')
const readline = require('readline')

// A long-lived PowerShell helper sets the text together with the formats Windows honours for secrets:
// ExcludeClipboardContentFromMonitorProcessing, CanIncludeInClipboardHistory=0, CanUploadToCloudClipboard=0.
// Text travels over stdin as base64, never on a command line.
const CLIP_PS = `
Add-Type -AssemblyName System.Windows.Forms
$zero = { New-Object IO.MemoryStream(,[byte[]](0,0,0,0)) }
while ($null -ne ($line = [Console]::In.ReadLine())) {
  try {
    if ($line -eq 'CLEAR') { [System.Windows.Forms.Clipboard]::Clear() }
    else {
      $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($line))
      $d = New-Object System.Windows.Forms.DataObject
      $d.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $text)
      $d.SetData('ExcludeClipboardContentFromMonitorProcessing', (& $zero))
      $d.SetData('CanIncludeInClipboardHistory', (& $zero))
      $d.SetData('CanUploadToCloudClipboard', (& $zero))
      [System.Windows.Forms.Clipboard]::SetDataObject($d, $true)
    }
    [Console]::Out.WriteLine('ok')
  } catch { [Console]::Out.WriteLine('err') }
}`
let clipProc = null, clipLines = null, lastCopied = null, clearTimer = null
function clipHelper() {
  if (clipProc && clipProc.exitCode === null) return clipProc
  if (process.platform !== 'win32') return null
  clipProc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', Buffer.from(CLIP_PS, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] })
  clipLines = readline.createInterface({ input: clipProc.stdout })
  clipProc.on('exit', () => { clipProc = null })
  return clipProc
}
function helperSend(line) {
  const p = clipHelper()
  if (!p) return Promise.resolve(false)
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(false), 4000)
    clipLines.once('line', l => { clearTimeout(t); resolve(l.trim() === 'ok') })
    p.stdin.write(line + '\n')
  })
}
let clipQueue = Promise.resolve()
const clipSerial = fn => (clipQueue = clipQueue.then(fn, fn))
async function copySecret(text, clearAfter) {
  const ok = await clipSerial(() => helperSend(Buffer.from(String(text), 'utf8').toString('base64')))
  if (!ok) await clipboard.writeText(String(text)) // helper unavailable: still copy, just without the history opt-out
  lastCopied = String(text)
  clearTimeout(clearTimer)
  if (clearAfter > 0) clearTimer = setTimeout(clearIfOurs, clearAfter * 1000)
  return true
}
// Only clear if the clipboard still holds what we put there; never wipe something the user copied since.
// (Electron's readText/writeText are async; clear() is sync.)
async function clearIfOurs() {
  const mine = lastCopied
  lastCopied = null
  if (mine !== null && (await clipboard.readText()) === mine) clipboard.clear()
}

// On quit: clear a still-present copied key and stop the helper. main.cjs holds the quit until this resolves.
async function clearOnQuit() {
  clearTimeout(clearTimer)
  await clearIfOurs().catch(() => {})
  clipProc?.kill()
}

module.exports = { copySecret, clearIfOurs, clearOnQuit }
