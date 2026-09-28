'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const DAY = 864e5;

// crypto (key derivation, wrapping, sealing) lives in crypto.js, loaded before this file
const fsv = window.kvFs; // desktop app: vault is a file on disk with automatic backups
const readVault = () => { try { const s = fsv ? fsv.read() : localStorage.getItem(STORE); return s ? JSON.parse(s) : null; } catch { return null; } };
const writeVault = v => fsv ? fsv.write(JSON.stringify(v)) : localStorage.setItem(STORE, JSON.stringify(v));
const ui = (() => { try { return JSON.parse(localStorage.getItem(UI_STORE)) || {}; } catch { return {}; } })();
const saveUi = () => { try { localStorage.setItem(UI_STORE, JSON.stringify(ui)); } catch {} };

/* ================= master password policy ================= */
// Only a genuinely strong password is accepted when creating or changing one (unlocking is unaffected).
const COMMON = ['password', 'passw0rd', 'qwerty', 'azerty', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', 'sunshine',
  'princess', 'football', 'baseball', 'master', 'secret', 'trustno1', 'login', 'hello', 'vaulter', 'keyvault', 'abc123', 'changeme'];
const ROWS = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx'];
function hasRun(p) { // 4+ steps of a sequence or keyboard row, either direction: abcd, 4321, qwer, lkjh…
  const s = p.toLowerCase();
  for (const row of ROWS) for (const r of [row, [...row].reverse().join('')])
    for (let i = 0; i + 4 <= r.length; i++) if (s.includes(r.slice(i, i + 4))) return true;
  return false;
}
function pwChecks(p) {
  const lower = p.toLowerCase();
  return [
    ['At least 8 characters', p.length >= 8],
    ['Upper and lowercase letters', /[a-z]/.test(p) && /[A-Z]/.test(p)],
    ['A number', /\d/.test(p)],
    ['A symbol like ! @ # $ % &', /[^A-Za-z0-9\s]/.test(p)],
    ['6+ different characters', new Set(p).size >= 6],
    ['No character 3× in a row', !!p && !/(.)\1\1/.test(p)],
    ['No runs like abcd, 1234, qwer', !!p && !hasRun(p)],
    ['No common words (password, admin…)', !!p && !COMMON.some(w => lower.includes(w))],
  ];
}
const pwOk = p => pwChecks(p).every(([, ok]) => ok);
function genPassword() { // 22 chars from an unambiguous set, re-rolled until it passes every rule
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*-_=+?'];
  const all = sets.join(''), pickFrom = s => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  for (;;) {
    const chars = [...sets.map(pickFrom), ...Array.from({ length: 18 }, () => pickFrom(all))];
    for (let i = chars.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
    const p = chars.join('');
    if (pwOk(p)) return p;
  }
}
// Wires a live checklist + meter + generator to a password field and its confirm field.
function pwPolicyUI({ input, confirm, rules, meter, gen, onGenerate }) {
  const paint = () => {
    const checks = pwChecks(input.value), passed = checks.filter(([, ok]) => ok).length;
    rules.replaceChildren(...checks.map(([label, ok]) => { const li = el('li', ok ? 'ok' : '', label); return li; }));
    if (meter) meter.dataset.s = !input.value ? 0 : passed === checks.length ? 4 : Math.max(1, Math.floor(passed / checks.length * 3));
  };
  input.addEventListener('input', paint);
  gen?.addEventListener('click', async () => {
    const p = genPassword();
    input.value = p; if (confirm) confirm.value = p;
    input.type = 'text'; if (confirm) confirm.type = 'text';
    paint(); onGenerate?.(p);
  });
  paint();
}


/* ================= state ================= */
let session = null, data = null, writing = Promise.resolve();
const defaults = () => ({ entries: [], folders: [], settings: { autoLock: 5, lastBackup: null, clip: 30, logos: true, lockOnMinimize: false } });
const normalize = d => ({ entries: Array.isArray(d?.entries) ? d.entries : [], folders: Array.isArray(d?.folders) ? d.folders : [], settings: { ...defaults().settings, ...(d?.settings || {}) } });
const uid = () => crypto.randomUUID ? crypto.randomUUID() : b64(rand(12));
function persist() {
  const snap = JSON.parse(JSON.stringify(data)), s = session;
  writing = writing.then(async () => writeVault(await seal(s, snap))).catch(e => toast('Could not save: ' + e.message, 'bad'));
  return writing;
}

/* ================= icons ================= */
const P = {
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15V6a3 3 0 0 1 3-3h9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  pin: '<path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1 6.1L12 17l-5.5 3 1-6.1L3 9.5l6.2-.9L12 3Z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  env: '<path d="M8 6 3 12l5 6M16 6l5 6-5 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24">${P[n]}</svg>`;
const iconBtn = (n, label, act) => { const b = el('button', 'icon-btn'); b.type = 'button'; b.innerHTML = icon(n); b.title = label; b.setAttribute('aria-label', label); if (act) b.dataset.act = act; return b; };

/* ================= comic bursts ================= */
function pow(word, at, kind = '') {
  if (document.body.classList.contains('calm')) return;
  const r = at?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const b = el('div', 'pow ' + kind, word);
  b.style.left = r.left + r.width / 2 + 'px'; b.style.top = r.top + r.height / 2 + 'px';
  b.style.rotate = (Math.random() * 16 - 8) + 'deg';
  document.body.append(b); setTimeout(() => b.remove(), 950);
}

/* ================= toasts ================= */
function toast(msg, kind = 'ok', mood) {
  const t = el('div', 'toast glass ' + kind); t.append(el('i'), el('span', '', msg));
  $('#toasts').append(t);
  if ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2800);
  if (mood) Orb.react(mood);
}

/* ================= logos ================= */
const HUES = [['#5b6cff', '#a8dcff'], ['#ff6aa8', '#ffc58a'], ['#2ee6a6', '#7cc7ff'], ['#a770ff', '#ff8fd8'], ['#ff8a4c', '#ffd66b'], ['#35c3ff', '#8a7bff']];
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const cleanDomain = s => (s || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
const validDomain = d => /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(d);
const domainFor = e => {
  const d = cleanDomain(e.domain);
  if (validDomain(d)) return d;
  const p = providerByName(e.name) || (e.provider && providerByName(e.provider));
  return p ? p.domain : null;
};
function monogram(box, name) {
  const [a, b] = HUES[hash(name || '?') % HUES.length];
  box.className = box.className.replace(/\b(custom|mono-l)\b/g, '').trim() + ' mono-l';
  box.style.setProperty('--g', `linear-gradient(135deg, ${a}, ${b})`);
  box.replaceChildren(document.createTextNode(((name || '?').trim()[0] || '?').toUpperCase()));
}
function paintLogo(box, e) {
  box.classList.remove('custom', 'mono-l');
  if (e.logo && /^data:image\/(png|jpeg|webp|gif);base64,/.test(e.logo)) {
    const img = new Image(); img.alt = ''; img.src = e.logo;
    box.classList.add('custom'); box.replaceChildren(img); return;
  }
  const d = domainFor(e);
  if (!d || !data?.settings.logos) return monogram(box, e.name);
  const srcs = [`https://www.google.com/s2/favicons?domain=${d}&sz=128`, `https://icons.duckduckgo.com/ip3/${d}.ico`];
  const img = new Image(); img.alt = ''; img.referrerPolicy = 'no-referrer';
  let i = 0;
  const next = () => (++i < srcs.length ? (img.src = srcs[i]) : monogram(box, e.name));
  img.onerror = next;
  img.onload = () => { if (img.naturalWidth <= 16 && i === 0) next(); }; // google's "unknown" globe is 16px
  img.src = srcs[0];
  monogram(box, e.name); // shown until the image arrives
  img.addEventListener('load', () => { if (img.naturalWidth > 16 || i > 0) { box.classList.remove('mono-l'); box.replaceChildren(img); } });
}
function imageToLogo(file) {
  return new Promise((res, rej) => {
    if (!file || !file.type.startsWith('image/')) return rej(Error('Not an image'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), s = Math.max(128 / img.width, 128 / img.height);
      g.drawImage(img, (128 - img.width * s) / 2, (128 - img.height * s) / 2, img.width * s, img.height * s);
      URL.revokeObjectURL(url); res(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(Error('Could not read that image')); };
    img.src = url;
  });
}

/* ================= lock screen ================= */
const lockCard = $('#lockCard');
const pwField = (id, ph, ac) => `<div class="pw-wrap"><input class="input" type="password" id="${id}" placeholder="${ph}" autocomplete="${ac}" required><button type="button" class="icon-btn" data-eye="${id}" aria-label="Show password">${icon('eye')}</button></div>`;

function lockStep(step, extra) {
  // No vault but automatic backups exist (reinstall, or the vault file was deleted): offer them first.
  let latest = null;
  if (step === 'welcome' && !extra?.fresh && fsv) { try { latest = fsv.latestBackup(); } catch {} if (latest) step = 'found'; }
  const T = {
    welcome: `<h2>Welcome <em>aboard.</em></h2><p>Create a master password. It encrypts everything and never leaves this device.</p>
      <form id="lf">${pwField('p1', 'Master password', 'new-password')}
        <div class="pw-tools"><div class="meter" id="meter"><i></i><i></i><i></i><i></i></div><button type="button" class="btn sm" id="pwGen">Generate strong password</button></div>
        <ul class="pw-rules" id="pwRules"></ul>
        ${pwField('p2', 'Repeat it', 'new-password')}
        <label class="check"><input type="checkbox" id="setupLogos" checked> Show provider logos. Looks up each provider's icon by its website; only the domain is sent, never a key.</label>
        <p class="err" id="lerr"></p>
        <button class="btn primary">Create vault</button>
        <div class="row"><button type="button" class="linkish" id="restore">Restore from a backup file</button></div></form>`,
    unlock: `<h2>Welcome <em>back.</em></h2><p>Enter your master password to open the vault.</p>
      <form id="lf">${pwField('p1', 'Master password', 'current-password')}
        <span class="caps" id="caps" hidden>Caps Lock is on</span>
        <p class="err" id="lerr"></p>
        <button class="btn primary" id="go">Unlock</button>
        <div class="row"><button type="button" class="linkish" id="forgot">Forgot password?</button><button type="button" class="linkish" id="restore">Restore backup</button></div></form>`,
    recover: `<h2>Reset <em>password.</em></h2><p>Use the recovery code you saved when you created the vault.</p>
      <form id="lf"><input class="input mono" id="rc" placeholder="XXXX-XXXX-XXXX-XXXX-…" autocomplete="off" spellcheck="false" required>
        ${pwField('p1', 'New master password', 'new-password')}
        <div class="pw-tools"><div class="meter" id="meter"><i></i><i></i><i></i><i></i></div><button type="button" class="btn sm" id="pwGen">Generate strong password</button></div>
        <ul class="pw-rules" id="pwRules"></ul>
        ${pwField('p2', 'Repeat it', 'new-password')}
        <p class="err" id="lerr"></p>
        <button class="btn primary">Reset &amp; unlock</button>
        <div class="row"><button type="button" class="linkish" id="back">Back</button></div></form>`,
    code: `<h2>Your recovery <em>code.</em></h2><p>If you forget your password, this is the only way back in. Save it somewhere safe, off this computer.</p>
      <form id="lf"><div class="code-box" id="codeBox"></div>
        <div class="row"><button type="button" class="btn sm" id="cCopy">${icon('copy')} Copy</button><button type="button" class="btn sm" id="cSave">Download .txt</button></div>
        <label class="check"><input type="checkbox" id="saved"> I've saved my recovery code somewhere safe.</label>
        <button class="btn primary" id="go" disabled>Enter the vault</button></form>`,
    found: `<h2>Welcome <em>back.</em></h2><p>Vaulter found your encrypted backups on this PC. Restore them to pick up where you left off.</p>
      <form id="lf"><div class="found"><b id="foundWhen"></b><span id="foundWhere"></span></div>
        <button class="btn primary" id="useLatest">Restore newest backup</button>
        <button type="button" class="btn" id="pickOther">Choose another backup file…</button>
        <div class="row"><button type="button" class="linkish" id="fresh">Start a new empty vault instead</button></div></form>`,
    restore: `<h2>Restore <em>backup.</em></h2><p>Unlock the backup file with the password (or recovery code) it was made with.</p>
      <form id="lf">${pwField('p1', 'Password or recovery code', 'current-password')}
        <p class="err" id="lerr"></p>
        <button class="btn primary">Restore</button>
        <div class="row"><button type="button" class="linkish" id="back">Back</button></div></form>`,
  };
  lockCard.innerHTML = T[step];
  lockCard.style.animation = 'none'; void lockCard.offsetWidth; lockCard.style.animation = '';
  const f = $('#lf'), err = m => { $('#lerr').textContent = m; lockCard.classList.remove('shake'); void lockCard.offsetWidth; lockCard.classList.add('shake'); Orb.react('sad'); pow('NOPE!', lockCard, 'bad'); };
  const busy = (b, label) => { const btn = f.querySelector('.btn.primary'); btn.disabled = b; if (label) btn.textContent = label; };
  $$('[data-eye]', lockCard).forEach(b => b.onclick = () => { const i = $('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; b.innerHTML = icon(i.type === 'password' ? 'eye' : 'eyeOff'); });
  if ($('#pwRules')) pwPolicyUI({ input: $('#p1'), confirm: $('#p2'), rules: $('#pwRules'), meter: $('#meter'), gen: $('#pwGen'),
    onGenerate: p => { if (fsv) fsv.copy(p, 60); toast(fsv ? 'Strong password generated and copied. Save it in your password manager.' : 'Strong password generated. Save it somewhere safe.', 'ok'); } });
  if (step === 'found') {
    const when = new Date(latest.mtime);
    $('#foundWhen').textContent = `${latest.count} backup${latest.count > 1 ? 's' : ''} · newest ${when.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    $('#foundWhere').textContent = latest.dir;
    f.onsubmit = e => { e.preventDefault(); try { const v = JSON.parse(latest.text); checkFmt(v); lockStep('restore', v); } catch { err('That backup file is damaged. Try another one.'); } };
    $('#pickOther').onclick = pickBackup;
    $('#fresh').onclick = () => lockStep('welcome', { fresh: true });
  }
  $('#restore') && ($('#restore').onclick = pickBackup);
  $('#back') && ($('#back').onclick = () => lockStep(readVault() ? 'unlock' : 'welcome'));
  $('#forgot') && ($('#forgot').onclick = () => lockStep('recover'));
  setTimeout(() => f.querySelector('input')?.focus(), 350);

  if (step === 'welcome' || step === 'recover') f.onsubmit = async e => {
    e.preventDefault();
    const p1 = $('#p1').value, p2 = $('#p2').value;
    if (!pwOk(p1)) return err('Your password needs to meet every rule above.');
    if (p1 !== p2) return err("Those passwords don't match.");
    busy(true, step === 'welcome' ? 'Forging vault…' : 'Resetting…');
    try {
      if (step === 'welcome') {
        const r = await createVault(p1);
        session = r.session; data = defaults(); data.settings.logos = $('#setupLogos').checked; await persist();
        lockStep('code', r.code);
      } else {
        const v = readVault();
        const { dek, data: d } = await openWithCode(v, $('#rc').value);
        const code = newCode();
        session = { dek, pw: await wrap(dek, p1, PW_KDF), rc: await wrap(dek, code, RC_ITER) };
        data = normalize(d); await persist();
        lockStep('code', code);
      }
    } catch (x) { busy(false, step === 'welcome' ? 'Create vault' : 'Reset & unlock'); err(x.message === 'password' ? "That recovery code doesn't match." : 'Something went wrong: ' + x.message); }
  };
  if (step === 'unlock') {
    const p = $('#p1');
    p.addEventListener('keyup', e => $('#caps').hidden = !e.getModifierState?.('CapsLock'));
    const btn = $('#go');
    const cooldown = () => { // after 3 wrong tries: 1s, 2s, 4s… up to 30s before the next attempt
      const left = Math.ceil(((ui.waitUntil || 0) - Date.now()) / 1000);
      if (left > 0 && btn.isConnected) { btn.disabled = true; btn.textContent = `Try again in ${left}s`; setTimeout(cooldown, 250); }
      else if (btn.isConnected && btn.textContent.startsWith('Try again')) { btn.disabled = false; btn.textContent = 'Unlock'; }
    };
    cooldown();
    f.onsubmit = async e => {
      e.preventDefault();
      if (Date.now() < (ui.waitUntil || 0)) return;
      busy(true, 'Decrypting…');
      try {
        const r = await openVault(readVault(), p.value);
        ui.fails = 0; ui.waitUntil = 0; saveUi();
        V.weakPw = !pwOk(p.value);
        session = r.session; data = normalize(r.data);
        const upgrade = !isModernPw(session.pw);
        if (upgrade) { busy(true, 'Upgrading protection…'); session = { ...session, pw: await wrap(session.dek, p.value, PW_KDF) }; await persist(); }
        enterVault();
        if (upgrade) setTimeout(() => toast('Password protection upgraded to Argon2id', 'ok'), 1600);
      } catch (x) {
        busy(false, 'Unlock'); p.select();
        if (x.message === 'password') {
          ui.fails = (ui.fails || 0) + 1;
          if (ui.fails >= 3) ui.waitUntil = Date.now() + Math.min(30, 2 ** (ui.fails - 3)) * 1000;
          saveUi(); cooldown();
        }
        err(x.message === 'password' ? 'Wrong password. Try again.' : x.message === 'format' ? 'The stored vault looks damaged.' : 'Could not decrypt: ' + x.message);
      }
    };
  }
  if (step === 'code') {
    $('#codeBox').textContent = extra;
    $('#cCopy').onclick = () => (fsv ? fsv.copy(extra, 60) : navigator.clipboard.writeText(extra)).then(() => toast('Recovery code copied'));
    $('#cSave').onclick = () => { download(`Vaulter recovery code\n\n${extra}\n\nKeep this safe and offline. It resets your master password.\n`, 'vaulter-recovery-code.txt'); codeFileWarning(); };
    $('#saved').onchange = e => $('#go').disabled = !e.target.checked;
    f.onsubmit = e => { e.preventDefault(); enterVault(); };
  }
  if (step === 'restore') f.onsubmit = async e => {
    e.preventDefault();
    const secret = $('#p1').value; busy(true, 'Decrypting…');
    try {
      let r;
      try { r = await openVault(extra, secret); }
      catch (x) {
        if (x.message !== 'password') throw x;
        const c = await openWithCode(extra, secret);
        r = { session: { dek: c.dek, pw: extra.pw, rc: extra.rc }, data: c.data };
      }
      writeVault(extra); session = r.session; data = normalize(r.data);
      if (!isModernPw(session.pw) && session.pw === extra.pw) { // opened with the password (not the code): upgrade it
        try { await unwrap(extra.pw, secret); session = { ...session, pw: await wrap(session.dek, secret, PW_KDF) }; await persist(); } catch {}
      }
      toast(`Restored ${data.entries.length} keys`, 'ok'); enterVault();
    } catch (x) { busy(false, 'Restore'); err(x.message === 'password' ? "That doesn't unlock this backup." : 'Not a Vaulter backup file.'); }
  };
}
async function pickBackup() {
  let text;
  if (fsv) { const r = await fsv.pickBackupFile().catch(() => null); if (!r) return; text = r.text; }
  else { const file = await pickFile('.json,application/json'); if (!file) return; text = await file.text(); }
  try { const v = JSON.parse(text); checkFmt(v); lockStep('restore', v); }
  catch { toast('That file is not a Vaulter backup.', 'bad', 'sad'); }
}
function codeFileWarning() {
  setTimeout(() => toast('Saved to Downloads. That file unlocks your vault: move it offline or print it, then delete it.', 'warn'), 400);
}
function pickFile(accept) {
  return new Promise(res => { const i = el('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0]); i.click(); });
}
function download(text, name, type = 'text/plain') {
  const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================= vault ================= */
const V = { q: '', tag: null, sort: ui.sort || 'recent', view: ui.view || 'grid', sel: 0, shown: [] };
const cards = new Map(); // id -> { node, key }

function enterVault() {
  $('#lock').classList.add('leaving');
  Orb.react('warp'); Orb.setMode('vault'); placeThemeBtn(true); pow('ZAP!', null, 'cool');
  setTimeout(() => {
    $('#lock').hidden = true; $('#lock').classList.remove('leaving');
    const v = $('#vault'); v.hidden = false; v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
    $$('.hero, .toolbar, .top, .chips, .grid, .foot, .banner', v).forEach(n => n.style.setProperty('--k', n.style.getPropertyValue('--k') || 0));
    render(); countUp(); resetIdle();
    const due = data.entries.filter(e => dueIn(e) !== null && dueIn(e) <= 14).length;
    toast(data.entries.length ? (due ? `Unlocked. ${due} key${due > 1 ? 's' : ''} due for rotation.` : 'Unlocked. Welcome back.') : 'Vault ready. Add your first key.', due ? 'warn' : 'ok', 'happy');
  }, 650);
}
function scrub() { // clear every field that may hold a secret or password, and a copied key still on the clipboard
  for (const id of ['fSecret', 'fName', 'fEnv', 'fNote', 'pwOld', 'pwNew', 'pwNew2', 'q']) { const i = document.getElementById(id); if (i) i.value = ''; }
  $('#askBody').replaceChildren();
  Object.values(revealTimers).forEach(clearTimeout);
  fsv?.clearClipboard?.().catch?.(() => {});
}
function lock(reason) {
  session = null; data = null; scrub(); V.folder = null;
  cards.forEach(c => c.node.remove()); cards.clear();
  $$('dialog[open]').forEach(d => d.close());
  clearInterval(idleTick); Orb.sleepy(false);
  $('#vault').hidden = true; $('#lock').hidden = false;
  Orb.setMode('lock'); Orb.react('warp'); placeThemeBtn(false);
  lockStep('unlock');
  if (reason) toast(reason, 'warn');
}

const dueIn = e => e.expires ? Math.ceil((new Date(e.expires + 'T00:00:00') - new Date(new Date().toDateString())) / DAY) : null;
const ago = t => {
  if (!t) return null;
  const s = (Date.now() - t) / 1000;
  return s < 60 ? 'just now' : s < 3600 ? `${s / 60 | 0}m ago` : s < 86400 ? `${s / 3600 | 0}h ago` : s < 2592000 ? `${s / 86400 | 0}d ago` : `${s / 2592000 | 0}mo ago`;
};
const mask = s => s.length > 10 ? '•'.repeat(14) + ' ' + s.slice(-4) : '•'.repeat(16);
const providerName = e => e.provider || providerByName(e.name)?.name || detectProvider(e.secret)?.name || '';

const inScope = e => { const f = folderOf(e); return V.folder ? f === V.folder : V.q ? true : !f; };
function filtered() {
  const toks = V.q.toLowerCase().split(/\s+/).filter(Boolean);
  return data.entries
    .filter(e => inScope(e) && (!V.tag || e.tag === V.tag) && toks.every(t => [e.name, e.env, e.tag, e.note, e.domain, e.plan, providerName(e), folderById(folderOf(e))?.name].some(f => f && f.toLowerCase().includes(t))))
    .sort((a, b) => (!!b.pinned - !!a.pinned) || (V.sort === 'az' ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) : V.sort === 'used' ? (b.uses || 0) - (a.uses || 0) : (b.updated || 0) - (a.updated || 0)));
}

function buildCard(e) {
  const c = el('article', 'card glass' + (e.pinned ? ' pinned' : '')); c.dataset.id = e.id; c.tabIndex = -1; c.draggable = true;
  const top = el('div', 'card-top');
  const logo = el('div', 'logo'); paintLogo(logo, e);
  const meta = el('div', 'meta'); const h = el('h3', '', e.name);
  const prov = providerName(e);
  const fid = folderOf(e), fname = fid && fid !== V.folder ? folderById(fid).name : '';
  const sub = el('p', 'sub', [prov && prov.toLowerCase() !== e.name.toLowerCase() ? prov : '', cleanDomain(e.domain) || domainFor(e) || '', e.plan].filter(Boolean).join(' · ') || 'API key');
  if (fname) { const tag = el('span', 'in-folder'); tag.append(folderIcon(folderById(fid), 'xs'), document.createTextNode(fname)); sub.prepend(tag); }
  meta.append(h, sub);
  const pin = iconBtn('pin', e.pinned ? 'Unpin' : 'Pin to top', 'pin'); if (e.pinned) pin.classList.add('on');
  const acts = el('div', 'acts'); acts.append(iconBtn('edit', 'Edit', 'edit'));
  if (domainFor(e)) acts.append(iconBtn('ext', 'Open provider site', 'open'));
  acts.append(iconBtn('trash', 'Delete', 'del'));
  if (!e.pinned) acts.prepend(pin);
  top.append(logo, meta, ...(e.pinned ? [pin] : []), acts);

  const sec = el('div', 'secret');
  const val = el('span', 'val', mask(e.secret));
  sec.append(val, iconBtn('eye', 'Reveal', 'reveal'), iconBtn('copy', 'Copy secret', 'copy'));

  const foot = el('div', 'card-foot');
  if (e.env) { const code = el('code', 'envc', e.env); code.title = 'Click to copy as ' + e.env + '=…'; code.dataset.act = 'env'; code.style.cursor = 'pointer'; foot.append(code); }
  if (e.tag) foot.append(el('span', 'badge tag tagb', e.tag));
  const d = dueIn(e);
  if (d !== null) foot.append(el('span', 'badge rot ' + (d < 0 ? 'bad' : d <= 14 ? 'warn' : 'tag'), d < 0 ? `Rotate: ${-d}d overdue` : d === 0 ? 'Rotate today' : d <= 14 ? `Rotate in ${d}d` : `Rotate by ${new Date(e.expires + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`));
  foot.append(el('span', 'sp'));
  foot.append(el('span', 'used', e.lastUsed ? `Copied ${ago(e.lastUsed)}${e.uses > 1 ? ` · ${e.uses}×` : ''}` : `Added ${ago(e.created) || ''}`));
  if (e.note) c.title = e.note;
  c.append(top, sec, foot);
  return c;
}

function render() {
  if (!data) return;
  const list = filtered(); V.shown = list;
  V.sel = Math.min(V.sel, Math.max(0, list.length - 1));
  renderFolders(list);
  const grid = $('#grid'); grid.classList.toggle('list', V.view === 'list');
  $('#listHead').hidden = V.view !== 'list' || !list.length;
  const keep = new Set(list.map(e => e.id));
  for (const [id, c] of cards) if (!keep.has(id)) { c.node.remove(); cards.delete(id); }
  list.forEach((e, i) => {
    const fid = folderOf(e), key = [e.updated, e.pinned, e.uses, e.lastUsed, data.settings.logos, fid, fid && folderById(fid).name, fid && JSON.stringify(folderById(fid).icon), fid === V.folder].join('|');
    let c = cards.get(e.id);
    if (!c || c.key !== key) {
      const node = buildCard(e); node.style.setProperty('--i', c ? 0 : Math.min(i, 14));
      if (c) { c.node.replaceWith(node); node.style.animation = 'none'; }
      c = { node, key }; cards.set(e.id, c);
    }
    const h = $('h3', c.node);
    if (V.q) highlight(h, e.name, V.q.split(/\s+/)[0]); else if (h.firstElementChild) h.textContent = e.name;
    c.node.classList.toggle('sel', !!V.q && i === V.sel);
    if (grid.children[i] !== c.node) grid.insertBefore(c.node, grid.children[i] || null);
  });

  // chips
  const scope = data.entries.filter(inScope);
  const tags = [...new Set(scope.map(e => e.tag).filter(Boolean))].sort();
  if (V.tag && !tags.includes(V.tag)) V.tag = null;
  const chips = $('#chips'); chips.replaceChildren();
  if (tags.length) [null, ...tags].forEach(t => {
    const b = el('button', 'chip', t || 'All'); b.type = 'button';
    b.append(el('b', '', String(t ? scope.filter(e => e.tag === t).length : scope.length)));
    b.setAttribute('aria-pressed', V.tag === t); b.onclick = () => { V.tag = t; render(); };
    chips.append(b);
  });

  // stats + banner
  const due = data.entries.filter(e => dueIn(e) !== null && dueIn(e) <= 14).length;
  $('#stTotal').dataset.to = data.entries.length;
  $('#stProv').dataset.to = new Set(data.entries.map(e => (providerName(e) || e.name).toLowerCase())).size;
  $('#stDue').dataset.to = due; $('#stDueBox').classList.toggle('warn', due > 0);
  countUp(true);
  const lb = data.settings.lastBackup, needBackup = !fsv && data.entries.length > 0 && (!lb || Date.now() - lb > 30 * DAY);
  const banner = $('#banner'); banner.hidden = !needBackup && !V.weakPw;
  if (V.weakPw) {
    banner.replaceChildren(el('span', '', "Your master password is weaker than Vaulter's standard. Anyone who copies your backup file could guess it faster."));
    const b = el('button', 'btn sm', 'Change it'); b.onclick = () => { openSettings(); settingsTab('security'); setTimeout(() => { $('#pwOld').scrollIntoView({ block: 'center' }); $('#pwOld').focus(); }, 200); }; banner.append(b);
  } else if (needBackup) {
    banner.replaceChildren(el('span', '', lb ? `Last backup was ${ago(lb)}. Clearing browser data would erase this vault.` : "You haven't exported a backup yet. Clearing browser data would erase this vault."));
    const b = el('button', 'btn sm', 'Back up now'); b.onclick = exportBackup; banner.append(b);
  }

  // empty
  const allFiled = !V.folder && !V.q && !V.tag && folders().length > 0;
  const empty = $('#empty'); empty.hidden = list.length > 0 || allFiled;
  if (!list.length && V.folder && !V.q && !V.tag) {
    const f = folderById(V.folder);
    empty.replaceChildren(el('h2', '', 'Empty folder.'), el('p', '', `Add a key here, or go back to All keys and drag keys onto “${f.name}”.`));
    const b = el('button', 'btn primary', 'Add a key here'); b.onclick = () => openEditor(); empty.append(b);
  } else if (!list.length && !allFiled) {
    const none = !data.entries.length;
    empty.replaceChildren(el('h2', '', none ? 'Empty space.' : 'Nothing out here.'),
      el('p', '', none ? 'Paste your first API key. Vaulter spots the provider, grabs its logo, and names the env var for you.' : `No keys match “${V.q || V.tag}”. Try a provider, env var, or tag.`));
    const b = el('button', 'btn primary', none ? 'Add your first key' : 'Clear search');
    b.onclick = () => none ? openEditor() : (V.q = '', V.tag = null, $('#q').value = '', render());
    empty.append(b);
  }
  $$('#sort button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === V.sort));
  $$('#viewSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === V.view));
}
function highlight(h, text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) { h.textContent = text; return; }
  const m = el('mark', '', text.slice(i, i + q.length));
  h.replaceChildren(text.slice(0, i), m, text.slice(i + q.length));
}
function countUp(soft) {
  $$('[data-to]').forEach(b => {
    const to = +b.dataset.to, from = soft ? +b.textContent || 0 : 0;
    if (from === to && soft) return;
    const t0 = performance.now(), dur = soft ? 400 : 1200;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 4; b.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ---- card actions ---- */
const entry = id => data.entries.find(e => e.id === id);
let clipTimer, revealTimers = {};
async function copyText(text, from, what = 'Copied') {
  const sec = data.settings.clip;
  try { if (fsv) await fsv.copy(text, sec); else await navigator.clipboard.writeText(text); }
  catch { toast('Clipboard blocked. Click the window first.', 'bad'); return false; }
  const r = from?.getBoundingClientRect();
  if (r) { Orb.react('pop'); pow(['COPIED!', 'YOINK!', 'GOT IT!'][Math.random() * 3 | 0], from); }
  clearTimeout(clipTimer);
  if (sec && !fsv) clipTimer = setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), sec * 1000);
  toast(sec ? `${what} · clipboard clears in ${sec}s` : what, 'ok');
  return true;
}
async function copyEntry(e, from, asEnv) {
  if (!await copyText(asEnv ? `${e.env}=${e.secret}` : e.secret, from, asEnv ? `${e.env}=… copied` : `${e.name} copied`)) return;
  e.uses = (e.uses || 0) + 1; e.lastUsed = Date.now();
  const node = cards.get(e.id)?.node; node?.classList.remove('flash'); void node?.offsetWidth; node?.classList.add('flash');
  if (Math.random() < .35) Orb.react('wow');
  persist(); setTimeout(render, 700);
}
function reveal(e, card) {
  const v = $('.val', card), btn = $('[data-act=reveal]', card);
  clearTimeout(revealTimers[e.id]);
  if (v.classList.contains('open')) { v.classList.remove('open'); v.textContent = mask(e.secret); btn.innerHTML = icon('eye'); return; }
  v.classList.add('open'); btn.innerHTML = icon('eyeOff');
  scramble(v, e.secret);
  revealTimers[e.id] = setTimeout(() => { if (v.isConnected && v.classList.contains('open')) reveal(e, card); }, 20000);
}
function scramble(node, text) {
  if (document.body.classList.contains('calm')) { node.textContent = text; return; }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789_-+=/';
  const t0 = performance.now(), dur = Math.min(900, 300 + text.length * 6);
  const step = now => {
    const k = (now - t0) / dur, n = Math.floor(k * text.length);
    let s = text.slice(0, n);
    for (let i = n; i < text.length; i++) s += text[i] === '-' || text[i] === '_' ? text[i] : chars[Math.random() * chars.length | 0];
    node.textContent = s;
    if (k < 1 && node.classList.contains('open')) requestAnimationFrame(step); else if (node.classList.contains('open')) node.textContent = text;
  };
  requestAnimationFrame(step);
}
$('#grid').addEventListener('click', ev => {
  const card = ev.target.closest('.card'); if (!card) return;
  const act = ev.target.closest('[data-act]')?.dataset.act, e = entry(card.dataset.id);
  if (!e || !act) return;
  if (act === 'copy') copyEntry(e, ev.target.closest('button'));
  if (act === 'env') copyEntry(e, ev.target, true);
  if (act === 'reveal') reveal(e, card);
  if (act === 'edit') openEditor(e);
  if (act === 'open') window.open('https://' + domainFor(e), '_blank', 'noopener');
  if (act === 'pin') { e.pinned = !e.pinned; persist(); render(); if (e.pinned) Orb.react('wow'); }
  if (act === 'del') ask({ title: `Delete ${e.name}?`, text: 'It will be gone from this vault. Remember to revoke it at the provider too.', ok: 'Delete', danger: true }).then(ok => {
    if (!ok) return;
    card.classList.add('gone');
    Orb.react('pop'); pow('BOOM!', card, 'bad');
    setTimeout(() => { data.entries = data.entries.filter(x => x !== e); persist(); render(); }, 450);
    toast(`${e.name} deleted`, 'warn', 'sad');
  });
});
// spotlight + tilt
$('#grid').addEventListener('pointermove', ev => {
  const c = ev.target.closest('.card'); if (!c) return;
  const r = c.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
  c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
  if (V.view === 'grid' && !document.body.classList.contains('calm')) { c.style.setProperty('--ry', ((x / r.width) - .5) * 7 + 'deg'); c.style.setProperty('--rx', (.5 - (y / r.height)) * 7 + 'deg'); }
});
$('#grid').addEventListener('pointerout', ev => { const c = ev.target.closest('.card'); if (c && !c.contains(ev.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
// magnetic primary buttons
document.addEventListener('pointermove', ev => {
  const b = ev.target.closest?.('.magnetic');
  $$('.magnetic').forEach(m => { if (m !== b) m.style.transform = ''; });
  if (!b || document.body.classList.contains('calm')) return;
  const r = b.getBoundingClientRect();
  b.style.transform = `translate(${(ev.clientX - r.left - r.width / 2) * .25}px, ${(ev.clientY - r.top - r.height / 2) * .35}px)`;
});

/* ---- toolbar ---- */
$('#q').addEventListener('input', e => { V.q = e.target.value.trim(); V.sel = 0; render(); });
$('#q').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); V.sel = Math.max(0, Math.min(V.shown.length - 1, V.sel + (e.key === 'ArrowDown' ? 1 : -1))); render(); cards.get(V.shown[V.sel]?.id)?.node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  if (e.key === 'Enter' && V.shown[V.sel]) { e.preventDefault(); const x = V.shown[V.sel]; copyEntry(x, $('[data-act=copy]', cards.get(x.id).node)); }
  if (e.key === 'Escape') { e.target.value = ''; V.q = ''; render(); e.target.blur(); }
});
$('#sort').onclick = e => { const v = e.target.closest('button')?.dataset.v; if (v) { V.sort = ui.sort = v; saveUi(); render(); } };
$('#viewSeg').onclick = e => { const v = e.target.closest('button')?.dataset.v; if (v) { V.view = ui.view = v; saveUi(); cards.forEach(c => c.node.style.setProperty('--i', 0)); render(); } };
$('#btnEnv').onclick = e => {
  const lines = V.shown.filter(x => x.env).map(x => `${x.env}=${x.secret}`);
  if (!lines.length) return toast('No visible keys have an env variable name.', 'warn');
  copyText(lines.join('\n') + '\n', e.currentTarget, `${lines.length} line${lines.length > 1 ? 's' : ''} of .env copied`);
};
$('#btnAdd').onclick = () => openEditor();
$('#timer').onclick = () => lock();
$('#btnSettings').onclick = openSettings;

/* ================= editor ================= */
const ed = $('#editor');
let edEntry = null, edLogo = null, autoFilled = { name: '', env: '', domain: '' };
function envFrom(name) { return name ? name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') + '_API_KEY' : ''; }
function openEditor(e = null) {
  if (typeof exitBulk === 'function') exitBulk();
  $('#edSave').disabled = false;
  edEntry = e; edLogo = e?.logo || null; autoFilled = { name: '', env: '', domain: '' };
  $('#edTitle').textContent = e ? 'Edit key' : 'New key';
  $('#edSub').textContent = e ? `Added ${new Date(e.created).toLocaleDateString()}` : "Paste it. We'll figure out whose it is.";
  $('#fSecret').value = e?.secret || ''; $('#fSecret').type = 'password'; $('#fSecretEye').innerHTML = icon('eye');
  $('#fName').value = e?.name || ''; $('#fEnv').value = e?.env || ''; $('#fDomain').value = e?.domain || '';
  $('#fTag').value = e?.tag || ''; $('#fExp').value = e?.expires || ''; $('#fNote').value = e?.note || ''; $('#fPlan').value = e?.plan || '';
  $('#fHint').textContent = ''; $('#edErr').textContent = '';
  expUI.refresh();
  folderFieldSet(e ? folderOf(e) : V.folder);
  edPreview();
  ed.showModal();
  setTimeout(() => (e ? $('#fName') : $('#fSecret')).focus(), 60);
}
function edPreview() {
  const draft = { name: $('#fName').value.trim() || '?', domain: $('#fDomain').value, logo: edLogo };
  paintLogo($('#edLogo'), draft);
  $('#fLogoClear').hidden = !edLogo;
  const d = domainFor(draft);
  $('#fDomain').placeholder = d && !cleanDomain($('#fDomain').value) ? d + ' (auto)' : 'elevenlabs.io';
}
let edT;
const edPreviewSoon = () => { clearTimeout(edT); edT = setTimeout(edPreview, 250); };
const setAuto = (id, key, v) => { const i = $(id); if (!i.value || i.value === autoFilled[key]) { i.value = v; autoFilled[key] = v; } };
$('#fSecret').addEventListener('input', () => {
  if (!edEntry && /\s/.test($('#fSecret').value.trim())) { const ks = parseKeys($('#fSecret').value); if (ks.length >= 2) return enterBulk(ks); }
  const s = $('#fSecret').value.trim(), p = detectProvider(s);
  $('#fHint').textContent = p ? `✦ Looks like a ${p.name} key` : '';
  if (p && !edEntry) { setAuto('#fName', 'name', p.name); setAuto('#fEnv', 'env', p.env); Orb.react('wow'); }
  const dup = data.entries.find(x => x.secret === s && x !== edEntry);
  if (dup) $('#fHint').textContent = `⚠ Already saved as “${dup.name}”`;
  edPreviewSoon();
});
$('#fName').addEventListener('input', () => {
  const p = providerByName($('#fName').value);
  setAuto('#fEnv', 'env', p ? p.env : envFrom($('#fName').value.trim()));
  edPreviewSoon();
});
$('#fDomain').addEventListener('input', edPreviewSoon);

/* ---------- bulk paste: several keys at once become "Name key 1", "Name key 2"… ---------- */
// Accepts keys separated by new lines, spaces, commas, semicolons or pipes, plus `.env` lines (NAME=value)
// and "label: value" lines. Only key-shaped tokens count (16+ printable characters, not a URL).
function parseKeys(text) {
  const out = [], seen = new Set();
  for (const rawLine of String(text || '').split(/[\r\n]+/)) {
    const line = rawLine.trim(); if (!line || line.startsWith('#')) continue;
    const kv = line.match(/^(?:export\s+)?([A-Za-z_][\w .-]{0,40}?)\s*(=|:\s)\s*(.+)$/);
    const parts = kv ? [kv[3]] : line.split(/[\s,;|]+/);
    for (let p of parts) {
      p = p.trim().replace(/^['"`]+|['"`,;]+$/g, '');
      if (p.length >= 16 && /^[\x21-\x7e]+$/.test(p) && !/^https?:\/\//i.test(p) && !seen.has(p)) {
        seen.add(p); out.push({ secret: p, envName: kv?.[2] === '=' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(kv[1]) ? kv[1].toUpperCase() : '' }); // only NAME=value sets an env name
      }
    }
  }
  return out;
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function nextKeyNumber(base) { // continue numbering after any existing "Base key N"
  const re = new RegExp('^' + escRe(base) + ' key (\\d+)$', 'i');
  return 1 + Math.max(0, ...data.entries.map(e => +(re.exec(e.name)?.[1] || 0)));
}
let edBulk = null;
function bulkBase() {
  const fid = $('#fFolder').value, f = folderById(fid);
  if (f) return f.name;
  const provs = [...new Set(edBulk.map(k => detectProvider(k.secret)?.name || ''))];
  return provs.length === 1 && provs[0] ? provs[0] : 'API';
}
function enterBulk(keys) {
  edBulk = keys;
  const s = $('#fSecret'); s.value = ''; s.required = false; s.disabled = true; s.placeholder = `${keys.length} keys pasted, listed below`;
  $('#fSecretEye').hidden = true;
  $('#fHint').textContent = '';
  $('#edBulk').hidden = false;
  $('#fNameLabel').textContent = 'Name (each key gets a number)';
  const base = bulkBase(); $('#fName').value = base; autoFilled.name = base;
  const p = providerByName(base) || detectProvider(keys[0].secret);
  $('#fEnv').value = p ? p.env : envFrom(base); autoFilled.env = $('#fEnv').value;
  paintBulk(); edPreview();
  Orb.react('wow');
}
function exitBulk() {
  edBulk = null;
  const s = $('#fSecret'); s.required = true; s.disabled = false; s.placeholder = 'sk-…, AIza…, hf_…';
  $('#fSecretEye').hidden = false;
  $('#edBulk').hidden = true;
  $('#fNameLabel').textContent = 'Name';
  $('#edSave').textContent = 'Save key';
}
function bulkPlan() { // what will be saved, with numbers and env names
  const base = $('#fName').value.trim() || bulkBase(), env = $('#fEnv').value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  let n = nextKeyNumber(base);
  return edBulk.map(k => {
    const dup = data.entries.find(e => e.secret === k.secret);
    if (dup) return { ...k, dup };
    const num = n++;
    return { ...k, num, name: `${base} key ${num}`, env: k.envName || (env ? `${env}_${num}` : ''), prov: detectProvider(k.secret) };
  });
}
function paintBulk() {
  if (!edBulk) return;
  const plan = bulkPlan(), fresh = plan.filter(k => !k.dup), dups = plan.length - fresh.length;
  $('#bulkTitle').textContent = `${plan.length} keys detected`;
  $('#bulkNote').textContent = fresh.length
    ? `They'll be saved as ${fresh[0].name}${fresh.length > 1 ? ` to ${fresh[fresh.length - 1].name.replace(/.* key /, 'key ')}` : ''}${dups ? `, skipping ${dups} already in your vault` : ''}. Folder, tag and rotation below apply to all of them.`
    : 'Every one of these is already in your vault.';
  $('#bulkList').replaceChildren(...plan.map(k => {
    const li = el('li', k.dup ? 'dup' : '');
    const lg = el('div', 'logo'); paintLogo(lg, { name: k.prov?.name || $('#fName').value || 'Key', domain: k.prov?.domain || cleanDomain($('#fDomain').value) });
    const t = el('div', 'bulk-t');
    t.append(el('b', '', k.dup ? `Already saved as “${k.dup.name}”` : k.name), el('span', 'mono', mask(k.secret) + (k.env ? `  ·  ${k.env}` : '')));
    li.append(lg, t, el('span', 'bulk-prov', k.dup ? 'skipped' : k.prov?.name || ''));
    return li;
  }));
  $('#edSave').textContent = fresh.length ? `Save ${fresh.length} key${fresh.length > 1 ? 's' : ''}` : 'Nothing new to save';
  $('#edSave').disabled = !fresh.length;
}
async function saveBulk() {
  const plan = bulkPlan().filter(k => !k.dup), now = Date.now();
  const shared = {
    domain: cleanDomain($('#fDomain').value), logo: edLogo || undefined,
    tag: $('#fTag').value.trim(), expires: $('#fExp').value, note: $('#fNote').value.trim(), plan: $('#fPlan').value.trim(),
    folder: folderById($('#fFolder').value) ? $('#fFolder').value : undefined,
  };
  // key 1 gets the newest timestamp, so "Recent" lists a batch as 1, 2, 3…
  plan.forEach((k, i) => data.entries.push({
    id: uid(), created: now - i, updated: now - i, uses: 0, name: k.name, secret: k.secret, env: k.env,
    provider: k.prov?.name || providerByName($('#fName').value)?.name || '', ...shared,
  }));
  const r = $('#edSave').getBoundingClientRect();
  ed.close(); await persist(); render();
  Orb.react('happy'); pow(`${plan.length}× KA-CHING!`, { getBoundingClientRect: () => r });
  toast(`Saved ${plan.length} keys: ${plan[0].name}${plan.length > 1 ? ` to ${plan[plan.length - 1].name.replace(/.* key /, 'key ')}` : ''}`, 'ok');
}
$('#fSecret').addEventListener('paste', ev => {
  if (edEntry) return; // editing one key: plain paste
  const keys = parseKeys(ev.clipboardData?.getData('text'));
  if (keys.length >= 2) { ev.preventDefault(); enterBulk(keys); }
});
['#fName', '#fEnv', '#fDomain'].forEach(id => $(id).addEventListener('input', () => edBulk && paintBulk()));
$('#bulkClear').onclick = () => { exitBulk(); $('#edSave').disabled = false; $('#fSecret').focus(); };
// paste keys anywhere in the vault (not into a field) to add them
document.addEventListener('paste', ev => {
  if (!data || $$('dialog[open]').length || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  const text = ev.clipboardData?.getData('text'), keys = parseKeys(text);
  if (!keys.length) return;
  ev.preventDefault(); openEditor();
  if (keys.length >= 2) enterBulk(keys);
  else { $('#fSecret').value = keys[0].secret; $('#fSecret').dispatchEvent(new Event('input')); }
});

$('#fSecretEye').onclick = () => { const i = $('#fSecret'); i.type = i.type === 'password' ? 'text' : 'password'; $('#fSecretEye').innerHTML = icon(i.type === 'password' ? 'eye' : 'eyeOff'); };
$('#fLogoUp').onclick = () => $('#fLogoFile').click();
$('#fLogoFile').onchange = e => setLogoFile(e.target.files[0]);
$('#fLogoClear').onclick = () => { edLogo = null; edPreview(); };
async function setLogoFile(f) {
  try { edLogo = await imageToLogo(f); edPreview(); Orb.react('wow'); }
  catch (x) { $('#edErr').textContent = x.message; }
}
const pick = $('#logoPick');
['dragenter', 'dragover'].forEach(t => ed.addEventListener(t, e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); pick.classList.add('drag'); } }));
['dragleave', 'drop'].forEach(t => ed.addEventListener(t, () => pick.classList.remove('drag')));
ed.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) setLogoFile(e.dataTransfer.files[0]); });
ed.addEventListener('paste', e => { const f = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/')); if (f) { e.preventDefault(); setLogoFile(f); } });
$('#edForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const secret = $('#fSecret').value.trim(), name = $('#fName').value.trim();
  const domain = cleanDomain($('#fDomain').value);
  if (edBulk) { if (!name) return $('#edErr').textContent = 'Give the keys a name.'; return saveBulk(); }
  if (!secret || !name) return $('#edErr').textContent = 'A secret and a name are required.';
  if (domain && !validDomain(domain)) return $('#edErr').textContent = 'Website should look like example.com';
  const now = Date.now();
  const fields = {
    name, secret, domain, logo: edLogo || undefined,
    env: $('#fEnv').value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
    tag: $('#fTag').value.trim(), expires: $('#fExp').value, note: $('#fNote').value.trim(), plan: $('#fPlan').value.trim(),
    provider: detectProvider(secret)?.name || providerByName(name)?.name || '', updated: now,
    folder: folderById($('#fFolder').value) ? $('#fFolder').value : undefined,
  };
  if (edEntry) Object.assign(edEntry, fields);
  else data.entries.push({ id: uid(), created: now, uses: 0, ...fields });
  const r = $('#edSave').getBoundingClientRect();
  ed.close(); await persist(); render();
  Orb.react('pop'); pow(edEntry ? 'SAVED!' : 'KA-CHING!', $('#btnAdd'));
  toast(edEntry ? 'Changes locked in.' : `${name} secured.`, 'ok', 'happy');
});

/* ================= dialogs ================= */
$$('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  $$('[data-close]', d).forEach(b => { if (!b.textContent.trim()) b.innerHTML = icon('x'); });
});
function ask({ title, text, ok = 'OK', danger, input, placeholder, type = 'text' }) {
  const d = $('#ask');
  $('#askTitle').textContent = title; $('#askText').textContent = text || ''; $('#askErr').textContent = '';
  const btn = $('#askOk'); btn.textContent = ok; btn.className = 'btn ' + (danger ? 'danger' : 'primary');
  const body = $('#askBody'); body.replaceChildren();
  let field;
  if (input) { field = el(input === 'area' ? 'textarea' : 'input', 'input' + (input === 'area' ? ' mono' : '')); field.type = type; field.placeholder = placeholder || ''; if (input === 'area') field.rows = 8; field.spellcheck = false; body.append(field); }
  d.showModal(); setTimeout(() => (field || btn).focus(), 60);
  return new Promise(res => {
    const done = v => { d.removeEventListener('close', onClose); $('#askForm').onsubmit = null; res(v); };
    const onClose = () => done(false);
    d.addEventListener('close', onClose);
    $('#askForm').onsubmit = e => { e.preventDefault(); const v = field ? field.value : true; d.removeEventListener('close', onClose); d.close(); done(v); };
  });
}

/* ================= settings ================= */
function settingsTab(t) {
  ui.setTab = t; saveUi();
  $$('#setTabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t));
  let first = true;
  $$('#settings section.set').forEach(s => {
    const on = s.dataset.tab === t && !s.hidden;
    s.classList.toggle('off', s.dataset.tab !== t);
    s.classList.toggle('first', on && first); if (on) first = false;
  });
  $('#settings').scrollTop = 0;
}
$('#setTabs').onclick = e => { const t = e.target.closest('button')?.dataset.t; if (t) settingsTab(t); };
function openSettings() {
  const s = data.settings;
  const opts = (box, vals, cur, fmt, set) => {
    box.replaceChildren(...vals.map(v => { const b = el('button', 'btn sm' + (v === cur ? ' primary' : ''), fmt(v)); b.type = 'button'; b.onclick = () => { set(v); persist(); openSettings(); }; return b; }));
  };
  opts($('#optLock'), [1, 5, 15, 30, 60, 0], s.autoLock, v => v ? `${v} min` : 'Never', v => { s.autoLock = v; tickIdle(); });
  opts($('#optClip'), [15, 30, 60, 0], s.clip, v => v ? `${v}s` : 'Never', v => s.clip = v);
  $('#optLogos').checked = s.logos;
  $('#optCalm').checked = !!ui.calm;
  $('#optMinLock').checked = !!s.lockOnMinimize;
  $('#optOrb').replaceChildren(...[['video', 'Video'], ['live', 'Live 3D'], ['off', 'Off']].map(([v, label]) => {
    const b = el('button', 'btn sm' + ((ui.orb || 'video') === v ? ' primary' : ''), label); b.type = 'button';
    b.onclick = () => { ui.orb = v; saveUi(); Orb.setQuality(v); openSettings(); };
    return b;
  }));
  $('#lastBackup').textContent = s.lastBackup ? `Last backup: ${new Date(s.lastBackup).toLocaleString()}.` : 'No backup exported yet.';
  $('#pwErr').textContent = '';
  if (!$('#settings').open) { $('#settings').showModal(); settingsTab(ui.setTab || 'security'); }
}
$('#optLogos').onchange = e => { data.settings.logos = e.target.checked; persist(); render(); };
$('#optMinLock').onchange = e => { data.settings.lockOnMinimize = e.target.checked; persist(); };
$('#optCalm').onchange = e => { ui.calm = e.target.checked; saveUi(); document.body.classList.toggle('calm', ui.calm); };
$('#pwForm').onsubmit = async e => {
  e.preventDefault();
  const err = $('#pwErr'), n = $('#pwNew').value;
  if (!pwOk(n)) return err.textContent = 'The new password needs to meet every rule.';
  if (n !== $('#pwNew2').value) return err.textContent = "New passwords don't match.";
  try { await unwrap(session.pw, $('#pwOld').value); }
  catch { err.textContent = 'Current password is wrong.'; Orb.react('sad'); return; }
  const btn = e.target.querySelector('button:not([type=button])'); btn.disabled = true; btn.textContent = 'Re-encrypting…';
  // New data key + new recovery code: anything encrypted before (old backups, the old code) can't open the new vault.
  const dek = await newDek(), code = newCode();
  session = { dek, pw: await wrap(dek, n, PW_KDF), rc: await wrap(dek, code, RC_ITER) };
  await persist(); e.target.reset(); err.textContent = ''; btn.disabled = false; btn.textContent = 'Change password';
  $('#pwNew').type = $('#pwNew2').type = 'password'; $('#pwNew').dispatchEvent(new Event('input'));
  V.weakPw = false; render();
  await showCode(code, 'Password changed', 'Everything was re-encrypted with a new key, so your old recovery code no longer works. Save this new one.');
  if (fsv) {
    const older = fsv.backupInfo().count - 1;
    if (older > 0 && await ask({ title: 'Delete old backups?', text: `${older} older automatic backup${older > 1 ? 's' : ''} can still be opened with your OLD password or recovery code. Today's backup already uses the new key and is kept. Backups you exported yourself aren't touched.`, ok: 'Delete old backups', danger: true }))
      toast(`Deleted ${fsv.purgeBackups()} old backup${older > 1 ? 's' : ''}`, 'ok');
  }
  toast('Master password changed', 'ok', 'happy');
};
async function showCode(code, title, text) {
  const p = ask({ title, text, ok: 'I saved it', input: 'text' });
  const f = $('#askBody input'); f.value = code; f.readOnly = true; f.classList.add('mono'); f.style.textAlign = 'center';
  const dl = el('button', 'btn sm', 'Download .txt'); dl.type = 'button'; dl.style.marginTop = '10px';
  dl.onclick = () => { download(`Vaulter recovery code\n\n${code}\n`, 'vaulter-recovery-code.txt'); codeFileWarning(); };
  $('#askBody').append(dl);
  await p;
}
$('#btnNewCode').onclick = async () => {
  if (!await ask({ title: 'New recovery code?', text: 'Your old recovery code will stop working.', ok: 'Generate' })) return;
  const code = newCode();
  session = { ...session, rc: await wrap(session.dek, code, RC_ITER) };
  await persist();
  await showCode(code, 'New recovery code', 'Save this now. It will not be shown again.');
  toast('Recovery code replaced', 'ok');
};
async function exportBackup() {
  await writing;
  const v = readVault(); if (!v) return toast('Nothing saved yet.', 'bad');
  download(JSON.stringify(v, null, 2), `vaulter-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  data.settings.lastBackup = Date.now(); persist(); render();
  toast('Encrypted backup downloaded', 'ok', 'happy');
  if ($('#settings').open) openSettings();
}
$('#btnExport').onclick = exportBackup;
$('#btnImport').onclick = async () => {
  const file = await pickFile('.json,application/json'); if (!file) return;
  let v; try { v = JSON.parse(await file.text()); checkFmt(v); } catch { return toast('Not a Vaulter backup file.', 'bad', 'sad'); }
  const secret = await ask({ title: 'Unlock backup', text: 'Password or recovery code for that backup.', ok: 'Merge keys', input: 'text', type: 'password' });
  if (!secret) return;
  let d;
  try { d = (await openVault(v, secret)).data; }
  catch { try { d = (await openWithCode(v, secret)).data; } catch { return toast("That doesn't unlock the backup.", 'bad', 'sad'); } }
  const inc = normalize(d), incoming = inc.entries; let added = 0, updated = 0;
  for (const f of inc.folders) if (!folders().some(x => x.id === f.id)) data.folders = [...folders(), f];
  for (const x of incoming) {
    const cur = data.entries.find(e => e.id === x.id);
    if (!cur) { data.entries.push(x); added++; }
    else if ((x.updated || 0) > (cur.updated || 0)) { Object.assign(cur, x); updated++; }
  }
  await persist(); render();
  toast(`Merged: ${added} new, ${updated} updated`, 'ok', 'happy');
};
$('#btnImportEnv').onclick = async () => {
  const text = await ask({ title: 'Import .env', text: 'Paste KEY=value lines. Providers are detected automatically.', ok: 'Import', input: 'area', placeholder: 'OPENAI_API_KEY=sk-…\nELEVENLABS_API_KEY=sk_…' });
  if (!text) return;
  const now = Date.now(); let n = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const secret = m[2].replace(/^(['"])(.*)\1$/, '$2').trim();
    if (!secret || data.entries.some(e => e.secret === secret)) continue;
    const p = detectProvider(secret) || providerByName(m[1].replace(/_(API_)?(KEY|TOKEN|SECRET)$/i, ''));
    data.entries.push({ id: uid(), name: p?.name || m[1].replace(/_(API_)?(KEY|TOKEN|SECRET)$/i, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()), secret, env: m[1], provider: p?.name || '', created: now + n, updated: now + n, uses: 0, folder: V.folder || undefined });
    n++;
  }
  await persist(); render();
  toast(n ? `Imported ${n} key${n > 1 ? 's' : ''}` : 'Nothing new to import', n ? 'ok' : 'warn', n ? 'happy' : 'sad');
};
$('#btnExportEnv').onclick = async () => {
  if (!await ask({ title: 'Download plain .env?', text: 'This file is NOT encrypted. Anyone who opens it can read every key.', ok: 'Download anyway', danger: true })) return;
  download(data.entries.filter(e => e.env).map(e => `${e.env}=${e.secret}`).join('\n') + '\n', '.env');
};
$('#btnWipe').onclick = async () => {
  const v = await ask({ title: 'Erase this vault?', text: 'Type DELETE to erase every key from this browser. This cannot be undone.', ok: 'Erase forever', danger: true, input: 'text', placeholder: 'DELETE' });
  if (v !== 'DELETE') { if (v !== false) toast('Not erased. Type DELETE exactly.', 'warn'); return; }
  let wipeBackups = false;
  if (fsv) {
    const info = fsv.backupInfo();
    if (info.count) wipeBackups = await ask({ title: 'Also delete backups?', text: `${info.count} encrypted backup${info.count > 1 ? 's are' : ' is'} in ${info.dir}. They can still restore this vault with your password. Delete them too?`, ok: 'Delete backups too', danger: true });
  }
  await writing; fsv ? fsv.wipe({ backups: wipeBackups }) : localStorage.removeItem(STORE);
  session = null; data = null; cards.forEach(c => c.node.remove()); cards.clear();
  $$('dialog[open]').forEach(d => d.close());
  $('#vault').hidden = true; $('#lock').hidden = false; Orb.setMode('lock'); placeThemeBtn(false); lockStep('welcome');
  toast('Vault erased', 'warn', 'sad');
};

/* ================= session timer ================= */
// A hard limit counted from the moment of unlock. Moving the mouse, typing or switching back to the window
// never extends it; when it runs out the vault locks, full stop.
let sessionStart = 0, idleTick, warned = false;
function resetIdle() { // called once per unlock
  sessionStart = Date.now(); warned = false; Orb.sleepy(false);
  clearInterval(idleTick); idleTick = setInterval(tickIdle, 1000); tickIdle();
}
function tickIdle() {
  if (!data) return;
  const mins = data.settings.autoLock, t = $('#timer');
  if (!mins) { $('#timerTxt').textContent = 'Lock'; $('.prog', t).style.strokeDashoffset = 0; t.classList.remove('low'); return; }
  const left = Math.max(0, mins * 60 - (Date.now() - sessionStart) / 1000 | 0);
  $('#timerTxt').textContent = `${left / 60 | 0}:${String(left % 60).padStart(2, '0')}`;
  $('.prog', t).style.strokeDashoffset = 62.8 * (1 - left / (mins * 60));
  t.classList.toggle('low', left <= 30);
  if (left <= 30 && !warned) { warned = true; Orb.sleepy(true); toast('Session ends in 30s. Vaulter will lock.', 'warn'); }
  if (left <= 0) lock(`Locked: your ${mins}-minute session ended`);
}
// Background windows get their timers throttled; catch up (and lock if overdue) the moment we're visible again.
addEventListener('focus', () => data && tickIdle());
document.addEventListener('visibilitychange', () => { if (!document.hidden && data) tickIdle(); });

/* ================= keyboard ================= */
addEventListener('keydown', e => {
  if (!data || $$('dialog[open]').length || typeof e.key !== 'string') return; // autofill fires key events without a key
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName), key = e.key.toLowerCase();
  if ((key === '/' && !typing) || (key === 'k' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); $('#q').focus(); $('#q').select(); }
  else if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  else if (key === 'n') { e.preventDefault(); openEditor(); }
  else if (key === 'f') { e.preventDefault(); openFolderDialog(); }
  else if ((key === 'escape' || key === 'backspace') && V.folder) { e.preventDefault(); closeFolder(); }
  else if (key === 'l') lock();
});

/* ================= automatic backups (desktop app) ================= */
if (fsv) {
  $('#autoBackup').hidden = false;
  const show = () => {
    const i = fsv.backupInfo();
    $('#abDir').textContent = i.dir;
    $('#abInfo').textContent = i.count ? `${i.count} backup${i.count > 1 ? 's' : ''} · newest ${new Date(i.latest).toLocaleString()}` : 'No automatic backups yet.';
  };
  $('#abChange').onclick = async () => { if (await fsv.chooseBackupDir()) { show(); toast('Backup folder changed', 'ok'); } };
  $('#abOpen').onclick = () => fsv.openBackupDir();
  $('#abNow').onclick = async () => { await writing; fsv.backupNow(); data.settings.lastBackup = Date.now(); persist(); show(); toast('Encrypted backup saved', 'ok', 'happy'); };
  $('#btnSettings').addEventListener('click', show);
}

/* ================= theme: wave flood from the click point ================= */
let themeBusy = false, ring = null;
// the one theme button floats on the lock screen and docks into the header inside the vault
function placeThemeBtn(inVault) {
  const b = $('#themeBtn');
  b.classList.toggle('theme-float', !inVault);
  if (inVault) $('.top-actions').prepend(b); else document.body.prepend(b);
}
function paintThemeButtons() {
  const light = document.documentElement.dataset.theme === 'light';
  $$('[data-theme-toggle]').forEach(b => b.innerHTML = icon(light ? 'moon' : 'sun'));
}
function setTheme(next, x = innerWidth - 40, y = 40) {
  if (themeBusy) return; // ignore double-clicks mid-wave
  const apply = () => {
    document.documentElement.dataset.theme = next; ui.theme = next; saveUi();
    Orb.setTheme(next); paintThemeButtons();
    if (ring) document.body.append(ring);
    // let the orb draw one frame in the new theme, then freeze it so the wave has the GPU to itself
    return new Promise(r => {
      let done = false;
      const go = () => { if (done) return; done = true; Orb.pause(true); r(); };
      requestAnimationFrame(() => requestAnimationFrame(go));
      setTimeout(go, 120); // hidden/minimized windows don't fire frames; never stall the transition
    });
  };
  if (!document.startViewTransition || document.body.classList.contains('calm')) return apply().then(() => Orb.pause(false));
  themeBusy = true;
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  ring = el('div', 'wave-ring');
  Object.assign(ring.style, { left: x - R + 'px', top: y - R + 'px', width: R * 2 + 'px', height: R * 2 + 'px' });
  const easing = 'cubic-bezier(.65, 0, .35, 1)', duration = 850;
  const vt = document.startViewTransition(apply);
  vt.ready.catch(() => {}).then(() => {
    if (!document.documentElement.getAnimations) return;
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
      { duration, easing, pseudoElement: '::view-transition-new(root)' });
    // the crest: same easing and size as the circle, scaled on the compositor, fading as it reaches the edges
    ring.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(.7)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 0 }], { duration, easing });
  });
  vt.finished.catch(() => {}).finally(() => { themeBusy = false; Orb.pause(false); ring?.remove(); ring = null; });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-theme-toggle]'); if (!b) return;
  const r = b.getBoundingClientRect();
  setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', r.left + r.width / 2, r.top + r.height / 2);
});
paintThemeButtons();

/* ================= lock with Windows (screen lock, sleep, user switch) ================= */
fsv?.onLock(() => { if (data) lock('Locked because Windows locked'); });
fsv?.onMinimize(() => { if (data?.settings.lockOnMinimize) lock('Locked when minimized'); });

/* ================= themed controls ================= */
function providerLogo(p) { const b = el('div', 'logo'); paintLogo(b, { name: p.name, domain: p.domain }); return b; }
UIKit.combo($('#fName'), q => {
  const n = q.toLowerCase();
  const hits = PROVIDERS.filter(p => !n || p.name.toLowerCase().includes(n) || p.domain.includes(n));
  hits.sort((a, b) => (b.name.toLowerCase().startsWith(n)) - (a.name.toLowerCase().startsWith(n)));
  return hits.slice(0, 8).map(p => ({ value: p.name, sub: `${p.domain} · ${p.env}`, iconEl: providerLogo(p) }));
});
UIKit.combo($('#fTag'), q => {
  const n = q.toLowerCase(), counts = {};
  for (const e of data?.entries || []) if (e.tag) counts[e.tag] = (counts[e.tag] || 0) + 1;
  return Object.keys(counts).filter(t => t.toLowerCase().includes(n)).sort()
    .map(t => ({ value: t, sub: `${counts[t]} key${counts[t] > 1 ? 's' : ''}` }));
});
const expUI = UIKit.datePicker($('#fExp'), $('#fExpBtn'), { placeholder: 'No reminder' });
pwPolicyUI({ input: $('#pwNew'), confirm: $('#pwNew2'), rules: $('#pwRulesSet'), meter: $('#pwMeterSet'), gen: $('#pwGenSet'),
  onGenerate: p => { fsv?.copy(p, 60); toast('Strong password generated and copied. Save it before you confirm.', 'ok'); } });
// right-click on a key card
UIKit.onContext(e => {
  const card = e.target.closest?.('#grid .card'); if (!card || !data) return;
  const x = entry(card.dataset.id); if (!x) return;
  const btn = act => card.querySelector(`[data-act=${act}]`), open = $('.val', card).classList.contains('open');
  return [
    { label: 'Copy key', icon: icon('copy'), action: () => copyEntry(x, btn('copy')) },
    ...(x.env ? [{ label: `Copy as ${x.env}=…`, icon: icon('env'), action: () => copyEntry(x, btn('copy'), true) }] : []),
    { label: open ? 'Hide key' : 'Reveal key', icon: icon(open ? 'eyeOff' : 'eye'), action: () => reveal(x, card) },
    '-',
    { label: 'Edit', icon: icon('edit'), action: () => openEditor(x) },
    { label: x.pinned ? 'Unpin' : 'Pin to top', icon: icon('pin'), action: () => btn('pin').click() },
    { label: 'Move to folder…', icon: icon('folder'), action: () => moveMenu(x, e.clientX, e.clientY) },
    ...(domainFor(x) ? [{ label: 'Open provider site', icon: icon('ext'), action: () => btn('open').click() }] : []),
    '-',
    { label: 'Delete', icon: icon('trash'), danger: true, action: () => btn('del').click() },
  ];
});

/* ================= boot ================= */
document.body.classList.toggle('calm', ui.calm ?? matchMedia('(prefers-reduced-motion: reduce)').matches);
$('.split').innerHTML = [...'Vaulter'].map((c, i) => `<span class="chrome-text" style="--d:${i}">${c}</span>`).join('');
$('#btnSettings').innerHTML = icon('gear');
$('#viewSeg [data-v=grid]').innerHTML = icon('grid');
$('#viewSeg [data-v=list]').innerHTML = icon('list');
if (!globalThis.crypto?.subtle) lockCard.innerHTML = '<h2>Unsupported <em>browser.</em></h2><p>Vaulter needs Web Crypto. Open it in Chrome or Edge.</p>';
else lockStep(readVault() ? 'unlock' : 'welcome');
