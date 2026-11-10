// Encrypted vault backups. Pure file juggling: the files are already encrypted, nothing here decrypts.
const fs = require('fs')
const path = require('path')

module.exports = ({ VAULT, CONFIG, KEEP, dir: getDir, readJson, writeAtomic }) => {
  // Every vault gets its own id, so two vaults on one PC (a reinstall, a test run, a friend's account sharing a
  // OneDrive folder) never overwrite each other's backups. Files:
  //   <dir>/vaulter-<id>-YYYY-MM-DD.json             one per day, overwritten through the day, last KEEP days
  //   <dir>/Recent/vaulter-<id>-YYYY-MM-DD-HHMM.json  the vault as it was BEFORE a change, at most every
  //                                                  SNAP_GAP, last KEEP_RECENT: undoes a bad edit made today
  const KEEP_RECENT = 12, SNAP_GAP = 10 * 60e3
  const DAY_RE = /^vaulter-(?:([0-9a-f]{8})-)?(\d{4}-\d{2}-\d{2})\.json$/ // old builds wrote vaulter-YYYY-MM-DD.json
  const pad = n => String(n).padStart(2, '0')
  const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const localMinute = (d = new Date()) => `${localDay(d)}-${pad(d.getHours())}${pad(d.getMinutes())}`
  function vaultId(fresh) {
    const c = readJson(CONFIG, {})
    if (c.vaultId && !fresh) return c.vaultId
    const id = require('crypto').randomBytes(4).toString('hex')
    writeAtomic(CONFIG, JSON.stringify({ ...c, vaultId: id }))
    return id
  }
  const list = dir => { try { return fs.readdirSync(dir) } catch { return [] } }
  function backups() {
    const dir = getDir(), id = vaultId(), mine = f => f.startsWith(`vaulter-${id}-`) && f.endsWith('.json')
    return { dir, id, files: list(dir).filter(f => DAY_RE.test(f) && mine(f)).sort(), recent: list(path.join(dir, 'Recent')).filter(mine).sort() }
  }
  const prune = (dir, files, keep) => files.slice(0, Math.max(0, files.length - keep)).forEach(f => fs.rmSync(path.join(dir, f), { force: true }))
  function snapshot() { // keep the current vault before it's replaced
    if (!fs.existsSync(VAULT)) return
    const { dir, id, recent } = backups(), rdir = path.join(dir, 'Recent')
    const last = recent.length && fs.statSync(path.join(rdir, recent[recent.length - 1])).mtimeMs
    if (last && Date.now() - last < SNAP_GAP) return
    fs.mkdirSync(rdir, { recursive: true })
    const f = path.join(rdir, `vaulter-${id}-${localMinute()}.json`)
    fs.copyFileSync(VAULT, f); fs.utimesSync(f, new Date(), new Date()) // copyFile keeps the vault's old mtime
    prune(rdir, backups().recent, KEEP_RECENT)
  }
  function backup() {
    if (!fs.existsSync(VAULT)) return
    const { dir, id } = backups()
    fs.mkdirSync(dir, { recursive: true })
    const f = path.join(dir, `vaulter-${id}-${localDay()}.json`)
    fs.copyFileSync(VAULT, f); fs.utimesSync(f, new Date(), new Date())
    prune(dir, backups().files, KEEP)
  }
  // Delete this vault's backups (all, or all but today's, which is re-encrypted with the current key on every save).
  function purgeBackups(keepToday) {
    const { dir, id, files, recent } = backups(), today = `vaulter-${id}-${localDay()}.json`
    const gone = files.filter(f => !(keepToday && f === today)).map(f => path.join(dir, f)).concat(recent.map(f => path.join(dir, 'Recent', f)))
    gone.forEach(f => fs.rmSync(f, { force: true }))
    return gone.length
  }
  // Newest daily backup of ANY vault in the folder (a fresh install doesn't know its old id yet).
  function newestBackup() {
    const dir = getDir()
    return list(dir).filter(f => DAY_RE.test(f)).map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0]
  }
  return { snapshot, backup, backups, purgeBackups, newestBackup, vaultId, list, DAY_RE }
}
