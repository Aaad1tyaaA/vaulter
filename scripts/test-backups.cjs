// Backups: two vaults sharing a folder never overwrite each other, the pre-change snapshot keeps the OLD
// vault, and purge only touches this vault's files.
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vaulter-bk-')), bk = path.join(root, 'bk')
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const writeAtomic = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t) }
const make = name => {
  const VAULT = path.join(root, name, 'vault.json'), CONFIG = path.join(root, name, 'config.json')
  const b = require('../electron/backups.cjs')({ VAULT, CONFIG, KEEP: 30, dir: () => bk, readJson, writeAtomic })
  const write = text => { if (!fs.existsSync(VAULT)) b.vaultId(true); b.snapshot(); writeAtomic(VAULT, text); b.backup() } // as kv:write
  return { ...b, write }
}
try {
  fs.mkdirSync(bk, { recursive: true })
  fs.writeFileSync(path.join(bk, 'vaulter-2026-09-28.json'), 'legacy') // from an older build: left alone
  const a = make('a'), b = make('b')
  a.write('A1'); b.write('B1'); a.write('A2')
  const day = f => fs.readFileSync(path.join(bk, f), 'utf8')
  assert.notStrictEqual(a.vaultId(), b.vaultId())
  assert.strictEqual(day(a.backups().files[0]), 'A2')
  assert.strictEqual(day(b.backups().files[0]), 'B1')
  assert.deepStrictEqual(a.backups().recent.map(f => day(path.join('Recent', f))), ['A1']) // before the change
  assert.strictEqual(b.backups().recent.length, 0) // first save has nothing to snapshot
  assert.strictEqual(a.newestBackup().f, a.backups().files[0])
  assert.strictEqual(a.purgeBackups(true), 1) // A's snapshot; today's daily stays
  assert.strictEqual(b.purgeBackups(false), 1)
  assert.ok(fs.existsSync(path.join(bk, 'vaulter-2026-09-28.json')) && a.backups().files.length === 1)
  console.log('backups ok')
} finally { fs.rmSync(root, { recursive: true, force: true }) }
