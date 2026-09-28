// node scripts/test-crypto.cjs: tests public/crypto.js exactly as the app loads it.
// Covers: new vaults use Argon2id, round-trips, wrong password/code rejection, old PBKDF2 vaults still open,
// and tampered Argon2 parameters are refused instead of hanging the app.
const fs = require('fs')
const path = require('path')
const assert = require('assert')
globalThis.hashwasm = require('hash-wasm')
eval(fs.readFileSync(path.join(__dirname, '..', 'public', 'crypto.js'), 'utf8') +
  ';Object.assign(globalThis, { createVault, openVault, openWithCode, seal, wrap, unwrap, newDek, isModernPw, PW_KDF, PW_ITER, RC_ITER })')

const rejects = async (p, msg) => { try { await p } catch (e) { return e.message } assert.fail('expected rejection: ' + msg) }

;(async () => {
  const pass = 'mY-v4ult$Is~Gr8n0w?', data = { entries: [{ id: 'a', name: 'OpenAI', secret: 'sk-test-123' }], settings: {} }

  // 1. new vault: Argon2id password wrap, PBKDF2 recovery wrap, round-trips
  let t = Date.now()
  const { session, code } = await createVault(pass)
  console.log(`argon2id wrap took ${Date.now() - t}ms`)
  assert.strictEqual(session.pw.kdf, 'argon2id'); assert.strictEqual(session.pw.m, 65536); assert(isModernPw(session.pw))
  assert.strictEqual(session.rc.iter, RC_ITER)
  const blob = await seal(session, data)
  assert.deepStrictEqual((await openVault(blob, pass)).data, data)
  assert.deepStrictEqual((await openWithCode(blob, code.toLowerCase())).data, data)
  console.log('ok: new vault uses Argon2id and round-trips (password + recovery code)')

  // 2. wrong secrets are rejected as "password", not crashes
  assert.strictEqual(await rejects(openVault(blob, pass + 'x'), 'wrong password'), 'password')
  assert.strictEqual(await rejects(openWithCode(blob, 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH'), 'wrong code'), 'password')
  console.log('ok: wrong password and wrong recovery code are rejected')

  // 3. a vault from an older version (PBKDF2 password wrap) still opens, and can be upgraded
  const dek = await newDek()
  const legacy = await seal({ dek, pw: await wrap(dek, pass, PW_ITER), rc: await wrap(dek, code, RC_ITER) }, data)
  assert.strictEqual(legacy.pw.iter, PW_ITER); assert(!isModernPw(legacy.pw))
  const opened = await openVault(legacy, pass)
  assert.deepStrictEqual(opened.data, data)
  const upgraded = await seal({ ...opened.session, pw: await wrap(opened.session.dek, pass, PW_KDF) }, data)
  assert(isModernPw(upgraded.pw)); assert.deepStrictEqual((await openVault(upgraded, pass)).data, data)
  console.log('ok: legacy PBKDF2 vault opens and upgrades to Argon2id')

  // 4. tampered parameters in a backup are refused up front (no 4 GB allocation, no 1-pass downgrade)
  for (const bad of [{ m: 4194304 }, { t: 1 }, { m: 1024 }, { p: 64 }]) {
    const evil = { ...blob, pw: { ...blob.pw, ...bad } }
    assert.strictEqual(await rejects(openVault(evil, pass), JSON.stringify(bad)), 'format')
  }
  console.log('ok: tampered Argon2 parameters are rejected')
})().catch(e => { console.error('FAIL', e); process.exit(1) })
