// Verifies the secret-safe clipboard with the real module:  electron scripts/test-clipboard.cjs
// 1) a copied value carries the Windows "keep out of clipboard history / cloud" formats
// 2) auto-clear wipes it  3) auto-clear leaves alone anything the user copied afterwards
const { app, clipboard } = require('electron')
const { execFileSync } = require('child_process')
const assert = require('assert')
const { copySecret } = require('../electron/clipboard.cjs')

const formats = () => execFileSync('powershell.exe', ['-NoProfile', '-STA', '-Command',
  'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::GetDataObject().GetFormats() -join ","'], { encoding: 'utf8' }).trim().split(',')
const wait = ms => new Promise(r => setTimeout(r, ms))

app.whenReady().then(async () => {
  const secret = 'sk-test-' + Math.random().toString(36).slice(2)
  await copySecret(secret, 1)
  assert.strictEqual(await clipboard.readText(), secret, 'text was copied')
  const f = formats()
  for (const want of ['ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory', 'CanUploadToCloudClipboard'])
    assert(f.includes(want), `missing clipboard format ${want} (have: ${f.join(', ')})`)
  console.log('ok: copied with history/cloud exclusion formats')

  await wait(1800)
  assert.strictEqual(await clipboard.readText(), '', 'auto-clear wiped the secret')
  console.log('ok: auto-cleared after 1s')

  await copySecret(secret, 1)
  await clipboard.writeText('something the user copied')
  await wait(1800)
  assert.strictEqual(await clipboard.readText(), 'something the user copied', 'did not wipe the user\'s own copy')
  console.log('ok: left the user\'s later copy alone')
  clipboard.clear()
  app.exit(0)
}).catch(e => { console.error('FAIL', e.message); app.exit(1) })
