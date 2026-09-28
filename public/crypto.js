'use strict';
/* ================= Vaulter crypto =================
 * A random 256-bit data key (DEK) encrypts the vault with AES-256-GCM. The DEK is stored twice, wrapped:
 *  - by a key derived from the master password with Argon2id (64 MiB, 3 passes): memory-hard, so every guess
 *    against a stolen file costs real RAM and GPUs lose most of their advantage;
 *  - by a key derived from the 100-bit recovery code with PBKDF2 (the code's entropy is the protection there).
 * Vaults written by older versions (PBKDF2 password wrap) still open, and are upgraded on the next unlock.
 * Same container as KeyVault v2, so every old vault and backup keeps working.
 * Depends on window.hashwasm (vendor/argon2.umd.min.js). Loaded before app.js; tested by scripts/test-crypto.cjs.
 */
const enc = new TextEncoder(), dec = new TextDecoder();
const STORE = 'keyvault.v2', UI_STORE = 'keyvault.ui', PW_ITER = 6e5, RC_ITER = 1e5;
const PW_KDF = Object.freeze({ kdf: 'argon2id', m: 65536, t: 3, p: 1 }); // m in KiB = 64 MiB
const rand = n => crypto.getRandomValues(new Uint8Array(n));
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function kekPbkdf2(pass, salt, iter) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
}
async function kekArgon2(pass, salt, { m, t, p }) {
  // bounds stop a tampered or malicious backup from demanding absurd memory/time
  if (!(m >= 19456 && m <= 1048576 && t >= 2 && t <= 10 && p >= 1 && p <= 4)) throw Error('format');
  const raw = await hashwasm.argon2id({ password: pass, salt, parallelism: p, iterations: t, memorySize: m, hashLength: 32, outputType: 'binary' });
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['wrapKey', 'unwrapKey']);
}
/** how: a PBKDF2 iteration count, or an Argon2id parameter object like PW_KDF */
async function wrap(dek, pass, how) {
  const salt = rand(16), iv = rand(12), argon = typeof how === 'object';
  const key = argon ? await kekArgon2(pass, salt, how) : await kekPbkdf2(pass, salt, how);
  const w = await crypto.subtle.wrapKey('raw', dek, key, { name: 'AES-GCM', iv });
  return { ...(argon ? { kdf: how.kdf, m: how.m, t: how.t, p: how.p } : { iter: how }), salt: b64(salt), iv: b64(iv), wk: b64(new Uint8Array(w)) };
}
async function unwrap(w, pass) {
  if (!w) throw Error('format');
  let key;
  if (w.kdf === 'argon2id') key = await kekArgon2(pass, unb64(w.salt), w);
  else if (w.iter >= 1e5 && w.iter <= 1e7) key = await kekPbkdf2(pass, unb64(w.salt), w.iter);
  else throw Error('format');
  try { return await crypto.subtle.unwrapKey('raw', unb64(w.wk), key, { name: 'AES-GCM', iv: unb64(w.iv) }, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); }
  catch { throw Error('password'); }
}
const isModernPw = w => w?.kdf === 'argon2id' && w.m >= PW_KDF.m && w.t >= PW_KDF.t;

const RC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function newCode() {
  let bits = 0, acc = 0, out = '';
  for (const b of rand(20)) { acc = acc << 8 | b; bits += 8; while (bits >= 5) { out += RC[acc >>> bits - 5 & 31]; bits -= 5; } acc &= (1 << bits) - 1; }
  return out.match(/.{4}/g).join('-');
}
const normCode = s => (s.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').match(/.{1,4}/g) || []).join('-');
const checkFmt = v => { if (!v || v.app !== 'keyvault' || v.v !== 2) throw Error('format'); };
async function decryptBlob(v, dek) {
  try { return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.iv) }, dek, unb64(v.ct)))); }
  catch { throw Error('corrupt'); }
}
async function seal(s, data) {
  const iv = rand(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, s.dek, enc.encode(JSON.stringify(data))));
  return { app: 'keyvault', v: 2, pw: s.pw, rc: s.rc, iv: b64(iv), ct: b64(ct) };
}
async function newDek() { return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); }
async function createVault(pass) {
  const dek = await newDek(), code = newCode();
  return { session: { dek, pw: await wrap(dek, pass, PW_KDF), rc: await wrap(dek, code, RC_ITER) }, code };
}
async function openVault(v, pass) {
  checkFmt(v);
  const dek = await unwrap(v.pw, pass);
  return { session: { dek, pw: v.pw, rc: v.rc }, data: await decryptBlob(v, dek) };
}
async function openWithCode(v, code) {
  checkFmt(v);
  const dek = await unwrap(v.rc, normCode(code));
  return { dek, data: await decryptBlob(v, dek) };
}
