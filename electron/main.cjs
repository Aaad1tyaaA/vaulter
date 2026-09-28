// Vaulter desktop shell: locked-down window, vault stored as a file, rolling encrypted backups,
// and a clipboard that keeps copied keys out of Windows clipboard history / cloud sync.
const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu, powerMonitor, clipboard } = require('electron')
const { pathToFileURL } = require('url')
const fs = require('fs')
const path = require('path')
const { copySecret, clearIfOurs, clearOnQuit } = require('./clipboard.cjs')

const DEV = !app.isPackaged

// Chromium honours debugging switches even when Electron's fuses block Node's --inspect. Anyone able to launch
// Vaulter with an extra argument could otherwise attach DevTools to the page and read an unlocked vault.
// The vault always starts locked, so refusing to start here exposes nothing.
const DEBUG_SWITCHES = ['remote-debugging-port', 'remote-debugging-pipe', 'remote-debugging-address', 'remote-allow-origins',
  'inspect', 'inspect-brk', 'inspect-port', 'js-flags', 'enable-logging', 'v', 'vmodule', 'auto-open-devtools-for-tabs']
if (!DEV && (DEBUG_SWITCHES.some(s => app.commandLine.hasSwitch(s)) || process.argv.some(a => /^--(remote-debugging|inspect)/i.test(a)))) {
  app.exit(1) // immediately: no window, no page, nothing for a debugger to attach to
}
const data = app.getPath('userData')
const VAULT = path.join(data, 'vault.json')
const CONFIG = path.join(data, 'config.json')
const KEEP = 30
const APP_URL = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href
let win = null

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const config = () => ({ backupDir: path.join(app.getPath('documents'), 'Vaulter Backups'), ...readJson(CONFIG, {}) })
const writeAtomic = (f, text) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', text); fs.renameSync(f + '.tmp', f) }

/* ---------------- backups ---------------- */
const BACKUP_RE = /^vaulter-\d{4}-\d{2}-\d{2}\.json$/
const today = () => `vaulter-${new Date().toISOString().slice(0, 10)}.json`
function backups() {
  const dir = config().backupDir
  try { return { dir, files: fs.readdirSync(dir).filter(f => BACKUP_RE.test(f)).sort() } }
  catch { return { dir, files: [] } }
}
// One encrypted copy per day (overwritten through the day), oldest pruned past KEEP.
function backup() {
  if (!fs.existsSync(VAULT)) return
  const { dir } = backups()
  fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(VAULT, path.join(dir, today()))
  const { files } = backups()
  files.slice(0, Math.max(0, files.length - KEEP)).forEach(f => fs.rmSync(path.join(dir, f)))
}
// Delete backups (all, or all but today's, which is re-encrypted with the current key on every save).
function purgeBackups(keepToday) {
  const { dir, files } = backups()
  const gone = files.filter(f => !(keepToday && f === today()))
  gone.forEach(f => fs.rmSync(path.join(dir, f), { force: true }))
  return gone.length
}

/* ---------------- IPC (only from our own window) ---------------- */
function trusted(e) {
  if (!win || e.sender !== win.webContents || !e.senderFrame) return false
  const url = e.senderFrame.url.split(/[?#]/)[0]
  return url === APP_URL || (DEV && url.startsWith('http://localhost:8766'))
}
const onSync = (ch, fn) => ipcMain.on(ch, (e, ...a) => {
  if (!trusted(e)) { e.returnValue = { error: 'forbidden' }; return }
  try { e.returnValue = fn(...a) } catch (err) { e.returnValue = { error: String(err.message || err) } }
})
const onAsync = (ch, fn) => ipcMain.handle(ch, (e, ...a) => { if (!trusted(e)) throw new Error('forbidden'); return fn(...a) })

onSync('kv:read', () => fs.existsSync(VAULT) ? fs.readFileSync(VAULT, 'utf8') : null)
onSync('kv:write', text => {
  if (typeof text !== 'string' || text.length > 50e6) throw new Error('bad vault payload')
  const v = JSON.parse(text)
  if (v?.app !== 'keyvault' || v?.v !== 2) throw new Error('not a vault')
  writeAtomic(VAULT, text); backup(); return true
})
onSync('kv:wipe', opts => { fs.rmSync(VAULT, { force: true }); return opts?.backups ? purgeBackups(false) : 0 })
onSync('kv:purgeBackups', () => purgeBackups(true))
onSync('kv:backupNow', () => { backup(); return true })
onSync('kv:backupInfo', () => {
  const { dir, files } = backups()
  const latest = files.length ? fs.statSync(path.join(dir, files[files.length - 1])).mtimeMs : null
  return { dir, count: files.length, latest }
})
onSync('kv:openBackupDir', () => { fs.mkdirSync(config().backupDir, { recursive: true }); shell.openPath(config().backupDir); return true })
onAsync('kv:chooseBackupDir', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Choose a backup folder (OneDrive, Google Drive, USB…)', properties: ['openDirectory', 'createDirectory'] })
  if (r.canceled || !r.filePaths[0]) return false
  writeAtomic(CONFIG, JSON.stringify({ ...readJson(CONFIG, {}), backupDir: r.filePaths[0] }))
  backup()
  return true
})
// Fresh install / deleted vault: offer the newest automatic backup for one-click restore.
onSync('kv:latestBackup', () => {
  const { dir, files } = backups()
  const name = files[files.length - 1]
  if (!name) return null
  const file = path.join(dir, name)
  return { name, dir, count: files.length, mtime: fs.statSync(file).mtimeMs, text: fs.readFileSync(file, 'utf8') }
})
// Native picker that opens straight in the backup folder (a web file input can't choose its start folder).
onAsync('kv:pickBackupFile', async () => {
  const dir = config().backupDir
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose a Vaulter backup', defaultPath: fs.existsSync(dir) ? dir : app.getPath('documents'),
    properties: ['openFile'], filters: [{ name: 'Vaulter backup', extensions: ['json'] }],
  })
  if (r.canceled || !r.filePaths[0]) return null
  const f = r.filePaths[0]
  if (fs.statSync(f).size > 50e6) throw new Error('file too large')
  return { name: path.basename(f), text: fs.readFileSync(f, 'utf8') }
})
// Paste for the custom right-click menu (the page itself is denied clipboard-read permission).
onAsync('kv:paste', () => clipboard.readText())
onAsync('kv:clearClipboard', () => clearIfOurs())
onAsync('kv:copy', (text, clearAfter) => {
  if (typeof text !== 'string' || text.length > 1e6) throw new Error('bad clipboard payload')
  return copySecret(text, Number(clearAfter) || 0)
})

/* ---------------- window ---------------- */
const safeExternal = url => {
  try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password && /^[a-z0-9.-]+$/i.test(u.hostname) }
  catch { return false }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 880, minWidth: 420, minHeight: 600,
    backgroundColor: '#000000',
    title: 'Vaulter',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
      backgroundThrottling: false, // the auto-lock countdown must keep running in the background
      spellcheck: false, devTools: DEV,
    },
  })
  win.setContentProtection(true) // keys can't be captured by screenshots, recorders or Recall
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { win = null })
  win.on('minimize', () => win.webContents.send('kv:minimize'))
  if (DEV && process.env.KV_LOG) { // dev diagnostics: page console + a snapshot of what rendered
    win.webContents.on('console-message', e => console.log('[page]', e.message))
    win.webContents.on('did-finish-load', () => setTimeout(async () => console.log('[probe]', await win.webContents.executeJavaScript(
      `JSON.stringify({ lockCard: document.querySelector('#lockCard h2')?.textContent, found: document.querySelector('#foundWhen')?.textContent, restoreBtn: document.querySelector('#useLatest')?.textContent, orbVideos: document.querySelectorAll('#orb-root video').length,
        orbReady: [...document.querySelectorAll('#orb-root video')].map(v => v.readyState), kvFs: !!window.kvFs, csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]') })`)), 2500))
  }
  if (process.env.KV_DEV && DEV) win.loadURL('http://localhost:8766')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

// Everything that could open, navigate or embed other content is shut for every webContents.
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => { if (safeExternal(url)) shell.openExternal(url); return { action: 'deny' } })
  contents.on('will-navigate', e => e.preventDefault())
  contents.on('will-redirect', e => e.preventDefault())
  contents.on('will-attach-webview', e => e.preventDefault())
})

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null) // no reload / devtools shortcuts
    const ses = session.defaultSession
    ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false)) // camera, mic, notifications, clipboard-read…
    ses.setPermissionCheckHandler(() => false)
    ses.setDevicePermissionHandler(() => false)
    // lock the vault whenever Windows locks, sleeps or switches user
    for (const ev of ['lock-screen', 'suspend', 'user-did-resign-active']) powerMonitor.on(ev, () => win?.webContents.send('kv:lock', ev))
    createWindow()
  })
  app.on('window-all-closed', () => app.quit())
  let quitReady = false // hold the quit until a copied key still on the clipboard has been cleared
  app.on('before-quit', e => {
    if (quitReady) return
    e.preventDefault()
    clearOnQuit().finally(() => { quitReady = true; app.quit() })
  })
}
