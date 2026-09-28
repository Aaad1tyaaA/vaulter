// Renders the orb loop for one theme into PNG frames, then encodes a seamless looping WebM + poster.
// Usage (with `npx vite` running on :8766):  npx electron scripts/render-orb.cjs dark|light
const { app, BrowserWindow, nativeImage } = require('electron')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const ffmpeg = require('ffmpeg-static')

const theme = process.argv.find(a => a === 'dark' || a === 'light') || 'dark'
const burst = process.argv.includes('burst') // the click-reaction clip instead of the idle loop
const name = burst ? `orb-${theme}-burst` : `orb-${theme}`
const OUT = 1080 // 2048 render, supersampled down
const root = path.join(__dirname, '..')
const tmp = path.join(require('os').tmpdir(), `vaulter-${name}`)
fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp, { recursive: true })
app.commandLine.appendSwitch('ignore-gpu-blocklist')

app.whenReady().then(async () => {
  // Hidden and offscreen windows lose GPU WebGL on some drivers (GPU process exit 34), so render in a real,
  // visible window made fully transparent. 960 CSS px × dpr 2.133 = a 2048px WebGL buffer.
  const win = new BrowserWindow({
    width: 960, height: 960, useContentSize: true, show: true, frame: false, opacity: 0,
    skipTaskbar: true, focusable: false, resizable: false,
    webPreferences: { backgroundThrottling: false },
  })
  // Vite may reload the page once while it optimizes deps on a cold start; retry instead of failing
  for (let attempt = 1; ; attempt++) {
    try { await win.loadURL(`http://localhost:8766/render.html?theme=${theme}${burst ? '&clip=burst' : ''}`); break }
    catch (e) { if (attempt >= 4) throw e; await new Promise(r => setTimeout(r, 2000)) }
  }
  win.webContents.on('console-message', (e) => console.log('[page]', e.message))
  await win.webContents.executeJavaScript('window.renderReady')
  await win.webContents.executeJavaScript('window.renderFrame(0)')
  const diag = await win.webContents.executeJavaScript('window.__diag ? window.__diag() : "no diag"')
  console.log('diag', JSON.stringify(diag))
  if (process.argv.includes('--diag')) { // quick look: render one mid-loop frame and stop
    const url = await win.webContents.executeJavaScript('window.renderFrame(40)')
    fs.writeFileSync(path.join(require('os').tmpdir(), `orb-preview-${name}.png`), nativeImage.createFromDataURL(url).resize({ width: 720, height: 720, quality: 'best' }).toPNG())
    app.quit(); return
  }
  const n = await win.webContents.executeJavaScript('window.LOOP_FRAMES')
  const fps = await win.webContents.executeJavaScript('window.CLIP_FPS')
  for (let i = 0; i < n; i++) {
    const url = await win.webContents.executeJavaScript(`window.renderFrame(${i})`)
    const img = nativeImage.createFromDataURL(url)
    if (img.isEmpty()) throw new Error(`frame ${i} came back empty`)
    fs.writeFileSync(path.join(tmp, `f${String(i).padStart(4, '0')}.png`), img.resize({ width: OUT, height: OUT, quality: 'best' }).toPNG())
    if (i % 30 === 0) console.log(`${name}: frame ${i}/${n}`)
  }
  const dest = path.join(root, 'public', 'orb')
  fs.mkdirSync(dest, { recursive: true })
  if (!burst) fs.copyFileSync(path.join(tmp, 'f0000.png'), path.join(dest, `${name}.png`))
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '26', '-row-mt', '1', '-deadline', 'good',
    path.join(dest, `${name}.webm`)], { stdio: 'inherit' })
  console.log(`${name}: wrote public/orb/${name}.webm`)
  fs.rmSync(tmp, { recursive: true, force: true })
  app.quit()
}).catch(e => { console.error(e); app.exit(1) })
