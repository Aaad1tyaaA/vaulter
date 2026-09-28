'use strict';
/* ================= folders =================
 * Folders group keys. data.folders = [{ id, name, icon, created }]; a key belongs to one via entry.folder.
 * A folder's icon is either a company logo ({ type: 'brand', name, domain }) or an emoticon
 * ({ type: 'glyph', glyph: 0-9, color: 0-7, style: 0-4 }): 10 emoticons x 8 colours x 5 styles = 400 looks.
 * Loaded after app.js (uses its helpers: el, $, $$, icon, P, data, V, persist, render, paintLogo, toast, ask…).
 */
Object.assign(P, {
  folder: '<path d="M3 7.5a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  folderPlus: '<path d="M3 7.5a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 10.5v5.5M9.25 13.25h5.5"/>',
  shuffle: '<path d="M3 7h3.5c4 0 5 10 9 10H21M3 17h3.5c1.7 0 2.8-1.8 3.8-4M21 7h-5.5c-1.7 0-2.8 1.8-3.8 4M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  out: '<path d="M9 14l-5-5 5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>',
});

// 10 emoticons on a 24px grid, drawn as line art so every colour x style combination works.
// Eyes and other solid bits carry fill="currentColor"; everything else is stroked.
const FACE = '<circle cx="12" cy="12" r="9.5"/>';
const GLYPHS = [
  ['Smile', 'stroke', FACE + '<circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none"/><path d="M8 14c1.2 1.7 2.5 2.5 4 2.5s2.8-.8 4-2.5"/>'],
  ['Wink', 'stroke', FACE + '<circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none"/><path d="M13.8 10.4q1.5-1.5 3 0"/><path d="M8 14c1.2 1.7 2.5 2.5 4 2.5s2.8-.8 4-2.5"/>'],
  ['Laugh', 'stroke', FACE + '<path d="M7.3 10.2q1.4-1.6 2.8 0M13.9 10.2q1.4-1.6 2.8 0"/><path d="M7.5 13.5h9a4.5 4.5 0 0 1-9 0Z" fill="currentColor"/>'],
  ['Cool', 'stroke', FACE + '<path d="M5 9.5h14"/><path d="M6 9.5h5.2v1.1a2.6 2.6 0 0 1-5.2 0ZM12.8 9.5H18v1.1a2.6 2.6 0 0 1-5.2 0Z" fill="currentColor"/><path d="M9 15.6q3 1.8 6.2-.6"/>'],
  ['Love', 'stroke', FACE + '<path d="M9 12.2 7.1 10.4a1.1 1.1 0 0 1 1.9-1.5 1.1 1.1 0 0 1 1.9 1.5ZM15 12.2l-1.9-1.8a1.1 1.1 0 0 1 1.9-1.5 1.1 1.1 0 0 1 1.9 1.5Z" fill="currentColor" stroke-width="1.2"/><path d="M8.3 14.6c1.1 1.5 2.3 2.2 3.7 2.2s2.6-.7 3.7-2.2"/>'],
  ['Robot', 'stroke', '<rect x="4.5" y="6.5" width="15" height="13" rx="3.5"/><path d="M12 6.5V3.8"/><circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/><path d="M9 16h6M2.5 12v2.5M21.5 12v2.5"/>'],
  ['Alien', 'stroke', '<path d="M12 3c4.4 0 7.5 3.2 7.5 7.4 0 5.4-4.6 10.6-7.5 10.6S4.5 15.8 4.5 10.4C4.5 6.2 7.6 3 12 3Z"/><path d="M7.1 10.2c1.9-.2 3.3.6 3.7 2.3-1.9.2-3.3-.6-3.7-2.3ZM16.9 10.2c-1.9-.2-3.3.6-3.7 2.3 1.9.2 3.3-.6 3.7-2.3Z" fill="currentColor" stroke-width="1"/><path d="M11 16.6h2"/>'],
  ['Wow', 'stroke', FACE + '<circle cx="9" cy="9.6" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="9.6" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="15.4" r="2.2"/>'],
  ['Sleepy', 'stroke', FACE + '<path d="M7.4 10.6q1.4 1.4 2.8 0M13.8 10.6q1.4 1.4 2.8 0M10.4 15.4h3.2"/><path d="M16.6 2.6h3.4l-3.4 3.4h3.4" stroke-width="1.6"/>'],
  ['Ghost', 'stroke', '<path d="M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.2-1.6-2.1 1.6-2.2-1.6-2.2 1.6-2.1-1.6Z"/><circle cx="9.6" cy="10.8" r="1.4" fill="currentColor" stroke="none"/><circle cx="14.4" cy="10.8" r="1.4" fill="currentColor" stroke="none"/><ellipse cx="12" cy="14.6" rx="1.3" ry="1.6"/>'],
];
const FCOLORS = [['Sky', '#3b9dff'], ['Violet', '#7c5cff'], ['Pink', '#ff3d8b'], ['Amber', '#ffa51f'], ['Mint', '#12b886'], ['Coral', '#ff5a4e'], ['Teal', '#10b5c9'], ['Steel', '#8a94a6']];
const FSTYLES = ['Solid', 'Soft', 'Outline', 'Gradient', 'Glass'];
const QUICK_BRANDS = ['Google Gemini', 'OpenAI', 'Anthropic', 'ElevenLabs', 'Groq', 'Mistral AI', 'DeepSeek', 'Perplexity', 'xAI Grok', 'Hugging Face'];
const rnd = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const randomGlyph = () => ({ type: 'glyph', glyph: rnd(GLYPHS.length), color: rnd(FCOLORS.length), style: rnd(FSTYLES.length) });
const brandIcon = p => ({ type: 'brand', name: p.name, domain: p.domain });

const folders = () => data?.folders || [];
const folderById = id => folders().find(f => f.id === id) || null;
/** the folder a key is really in (keys pointing at a deleted folder count as unfiled) */
const folderOf = e => (e.folder && folderById(e.folder) ? e.folder : null);
const keysIn = id => data.entries.filter(e => folderOf(e) === id);

/** Renders a folder icon (company logo or glyph) into a new element. size: 'sm' | '' | 'lg' */
function folderIcon(f, size = '') {
  const ic = f?.icon || { type: 'glyph', glyph: 0, color: 0, style: 1 };
  const box = el('div', `fold-ico ${size}`.trim());
  if (ic.type === 'brand') {
    box.classList.add('is-brand');
    const logo = el('div', 'logo'); paintLogo(logo, { name: ic.name, domain: ic.domain }); box.append(logo);
    return box;
  }
  const [, mode, svg] = GLYPHS[ic.glyph] || GLYPHS[0];
  box.classList.add('glyph', 'st-' + (FSTYLES[ic.style] || 'Soft').toLowerCase());
  box.style.setProperty('--fc', (FCOLORS[ic.color] || FCOLORS[0])[1]);
  box.innerHTML = `<svg viewBox="0 0 24 24" class="${mode}" aria-hidden="true">${svg}</svg>`;
  return box;
}

/* ---------- navigation ---------- */
function openFolder(id) {
  V.folder = id; V.q = ''; V.tag = null; $('#q').value = '';
  render();
  $('.toolbar').scrollIntoView({ block: 'start', behavior: document.body.classList.contains('calm') ? 'auto' : 'smooth' });
}
function closeFolder() { V.folder = null; render(); }

/* ---------- moving keys ---------- */
async function moveKey(e, fid) {
  const to = fid ? folderById(fid) : null;
  if ((folderOf(e) || null) === (to?.id || null)) return;
  e.folder = to?.id || undefined;
  await persist(); render();
  Orb.react('pop');
  toast(to ? `${e.name} → ${to.name}` : `${e.name} moved out to All keys`, 'ok');
}
/** a themed menu of folders to move a key into (right-click → Move to folder…) */
function moveMenu(e, x, y) {
  const cur = folderOf(e);
  UIKit.menu(x, y, [
    ...folders().map(f => ({ label: f.name, iconEl: folderIcon(f, 'sm'), active: f.id === cur, disabled: f.id === cur, action: () => moveKey(e, f.id) })),
    ...(folders().length ? ['-'] : []),
    { label: 'No folder (All keys)', icon: icon('out'), disabled: !cur, action: () => moveKey(e, null) },
    { label: 'New folder…', icon: icon('folderPlus'), action: () => openFolderDialog(null, { moveKey: e }) },
  ]);
}

/* ---------- folder zone: tiles at the top level, breadcrumb inside a folder ---------- */
function renderFolders(list) {
  const zone = $('#folderZone');
  zone.replaceChildren();
  if (V.folder && !folderById(V.folder)) V.folder = null;
  if (V.folder) {
    const f = folderById(V.folder), n = keysIn(f.id).length;
    const bar = el('div', 'crumbs glass');
    const root = el('button', 'crumb-root'); root.type = 'button'; root.dataset.drop = 'root';
    root.innerHTML = icon('back'); root.append(el('span', '', 'All keys'));
    root.title = 'Back to all keys (Esc). Drop a key here to take it out of the folder.';
    root.onclick = closeFolder;
    const here = el('div', 'crumb-here'); here.append(folderIcon(f, 'sm'), el('b', '', f.name), el('span', 'muted', `${n} key${n === 1 ? '' : 's'}`));
    const edit = el('button', 'btn sm', 'Edit folder'); edit.type = 'button'; edit.onclick = () => openFolderDialog(f);
    const add = el('button', 'btn sm', 'Add key here'); add.type = 'button'; add.onclick = () => openEditor();
    bar.append(root, el('span', 'crumb-sep', '›'), here, el('span', 'sp'), add, edit);
    zone.append(bar);
    return;
  }
  const q = V.q.toLowerCase();
  const shown = folders().filter(f => !q || f.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  if (!folders().length) return;
  if (shown.length) {
    const head = el('div', 'sec-head');
    const add = el('button', 'linkish', '+ New folder'); add.type = 'button'; add.onclick = () => openFolderDialog();
    head.append(el('span', '', q ? 'Matching folders' : 'Folders'), el('b', '', String(shown.length)), el('span', 'sp'), add);
    const tiles = el('div', 'folders');
    shown.forEach((f, i) => tiles.append(folderTile(f, i)));
    zone.append(head, tiles);
  }
  if (list.length) {
    const kh = el('div', 'sec-head');
    kh.append(el('span', '', q ? 'Matching keys' : 'Keys'), el('b', '', String(list.length)));
    if (!q) kh.append(el('span', 'hint-sm', 'Drag a key onto a folder to file it'));
    zone.append(kh);
  }
}
function folderTile(f, i) {
  const inside = keysIn(f.id);
  const t = el('button', 'folder glass'); t.type = 'button';
  t.dataset.folder = f.id; t.dataset.drop = f.id; t.style.setProperty('--i', Math.min(i, 12));
  const row = el('div', 'folder-row');
  const meta = el('div', 'folder-meta');
  meta.append(el('b', '', f.name), el('span', '', `${inside.length} key${inside.length === 1 ? '' : 's'}`));
  row.append(folderIcon(f), meta);
  const minis = el('div', 'folder-minis');
  inside.slice(0, 5).forEach(e => { const m = el('div', 'logo mini'); paintLogo(m, e); m.title = e.name; minis.append(m); });
  if (inside.length > 5) minis.append(el('span', 'more', `+${inside.length - 5}`));
  if (!inside.length) minis.append(el('span', 'hint-sm', 'Empty · drag keys here'));
  t.append(row, minis);
  t.onclick = () => openFolder(f.id);
  return t;
}

/* ---------- drag a key card onto a folder (or onto "All keys" to take it out) ---------- */
const DRAG_TYPE = 'application/x-vaulter-key';
document.addEventListener('dragstart', ev => {
  const card = ev.target.closest?.('#grid .card');
  if (!card || !data) return;
  ev.dataTransfer.setData(DRAG_TYPE, card.dataset.id);
  ev.dataTransfer.effectAllowed = 'move';
  card.classList.add('dragging'); document.body.classList.add('dragging-key');
});
document.addEventListener('dragend', () => {
  $$('.card.dragging').forEach(c => c.classList.remove('dragging'));
  $$('[data-drop].drop').forEach(d => d.classList.remove('drop'));
  document.body.classList.remove('dragging-key');
});
document.addEventListener('dragover', ev => {
  const t = ev.target.closest?.('[data-drop]');
  if (!t || ![...ev.dataTransfer.types].includes(DRAG_TYPE)) return;
  ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
  $$('[data-drop].drop').forEach(d => d !== t && d.classList.remove('drop'));
  t.classList.add('drop');
});
document.addEventListener('dragleave', ev => {
  const t = ev.target.closest?.('[data-drop]');
  if (t && !t.contains(ev.relatedTarget)) t.classList.remove('drop');
});
document.addEventListener('drop', ev => {
  const t = ev.target.closest?.('[data-drop]'), id = ev.dataTransfer.getData(DRAG_TYPE);
  if (!t || !id) return;
  ev.preventDefault(); t.classList.remove('drop');
  const e = entry(id); if (!e) return;
  const r = t.getBoundingClientRect();
  pow(t.dataset.drop === 'root' ? 'OUT!' : 'FILED!', { getBoundingClientRect: () => r }, 'cool');
  moveKey(e, t.dataset.drop === 'root' ? null : t.dataset.drop);
});

/* ---------- right-click on a folder tile ---------- */
UIKit.onContext(ev => {
  const t = ev.target.closest?.('.folder[data-folder]'); if (!t || !data) return;
  const f = folderById(t.dataset.folder); if (!f) return;
  return [
    { label: 'Open', icon: icon('folder'), action: () => openFolder(f.id) },
    { label: 'Edit folder', icon: icon('edit'), action: () => openFolderDialog(f) },
    '-',
    { label: 'Delete folder', icon: icon('trash'), danger: true, action: () => deleteFolder(f) },
  ];
});

async function deleteFolder(f) {
  const n = keysIn(f.id).length;
  const ok = await ask({ title: `Delete “${f.name}”?`, text: n ? `The ${n} key${n === 1 ? '' : 's'} inside won't be deleted. They move back to All keys.` : 'The folder is empty.', ok: 'Delete folder', danger: true });
  if (!ok) return;
  data.entries.forEach(e => { if (e.folder === f.id) e.folder = undefined; });
  data.folders = folders().filter(x => x.id !== f.id);
  if (V.folder === f.id) V.folder = null;
  $('#folderDlg').open && $('#folderDlg').close();
  await persist(); render();
  toast(`Folder “${f.name}” deleted${n ? `, ${n} key${n === 1 ? '' : 's'} moved to All keys` : ''}`, 'warn');
}

/* ---------- folder dialog: name + icon (company logo or glyph × colour × style) ---------- */
const FD = { editing: null, icon: null, auto: true, then: null };
function fdPaint() {
  const ic = FD.icon;
  $('#fdPreview').replaceChildren(folderIcon({ icon: ic }, 'lg'));
  $$('#fdMode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === ic.type));
  $('#fdBrand').hidden = ic.type !== 'brand';
  $('#fdGlyph').hidden = ic.type !== 'glyph';
  $$('#fdBrands .brand-pick').forEach(b => b.classList.toggle('on', ic.type === 'brand' && b.dataset.domain === ic.domain));
  if (ic.type === 'glyph') {
    $$('#fdGlyphs button').forEach((b, i) => { b.classList.toggle('on', i === ic.glyph); b.replaceChildren(folderIcon({ icon: { ...ic, glyph: i } }, 'sm')); });
    $$('#fdColors button').forEach((b, i) => b.classList.toggle('on', i === ic.color));
    $$('#fdStyles button').forEach((b, i) => { b.setAttribute('aria-pressed', i === ic.style); });
  }
}
function fdSet(icon, manual = true) { FD.icon = icon; if (manual) FD.auto = false; fdPaint(); }
// the last glyph look is remembered, so switching tabs back and forth doesn't lose it
let fdLastGlyph = null;

function openFolderDialog(f = null, then = null) {
  FD.editing = f; FD.then = then; FD.auto = !f;
  FD.icon = f ? { ...f.icon } : randomGlyph();
  fdLastGlyph = FD.icon.type === 'glyph' ? { ...FD.icon } : randomGlyph();
  $('#fdTitle').textContent = f ? 'Edit folder' : 'New folder';
  $('#fdSub').textContent = f ? `${keysIn(f.id).length} key${keysIn(f.id).length === 1 ? '' : 's'} inside` : 'Group keys the way you think about them.';
  $('#fdName').value = f?.name || '';
  $('#fdBrandQ').value = '';
  $('#fdErr').textContent = '';
  $('#fdSave').textContent = f ? 'Save folder' : 'Create folder';
  $('#fdDelete').hidden = !f;
  buildBrandPicks();
  fdPaint();
  $('#folderDlg').showModal();
  setTimeout(() => $('#fdName').focus(), 60);
}

// quick picks: 10 AI companies. Built when the dialog opens: logos can only be fetched once the vault
// (and its "fetch logos online" setting) is unlocked.
function buildBrandPicks() {
  $('#fdBrands').replaceChildren(...QUICK_BRANDS.map(n => PROVIDERS.find(p => p.name === n)).filter(Boolean).map(p => {
    const b = el('button', 'brand-pick'); b.type = 'button'; b.dataset.domain = p.domain; b.title = p.name;
    const logo = el('div', 'logo'); paintLogo(logo, { name: p.name, domain: p.domain });
    b.append(logo, el('span', '', p.name.replace(/^Google /, '').replace(/ AI$/, '').replace(/ Grok$/, '')));
    b.onclick = () => fdSet(brandIcon(p));
    return b;
  }));
}
function buildFolderDialog() {
  // glyphs, colours, styles
  $('#fdGlyphs').replaceChildren(...GLYPHS.map(([name], i) => {
    const b = el('button', 'glyph-pick'); b.type = 'button'; b.title = name; b.setAttribute('aria-label', name);
    b.onclick = () => { fdLastGlyph = { ...FD.icon, type: 'glyph', glyph: i }; fdSet(fdLastGlyph); };
    return b;
  }));
  $('#fdColors').replaceChildren(...FCOLORS.map(([name, c], i) => {
    const b = el('button', 'swatch'); b.type = 'button'; b.title = name; b.setAttribute('aria-label', name); b.style.setProperty('--fc', c);
    b.onclick = () => { fdLastGlyph = { ...FD.icon, color: i }; fdSet(fdLastGlyph); };
    return b;
  }));
  $('#fdStyles').replaceChildren(...FSTYLES.map((name, i) => {
    const b = el('button', '', name); b.type = 'button';
    b.onclick = () => { fdLastGlyph = { ...FD.icon, style: i }; fdSet(fdLastGlyph); };
    return b;
  }));
  $('#fdShuffle').innerHTML = icon('shuffle') + '<span>Shuffle</span>';
  $('#fdShuffle').onclick = () => { fdLastGlyph = randomGlyph(); fdSet(fdLastGlyph); Orb.react('wow'); };
  $('#fdMode').onclick = ev => {
    const m = ev.target.closest('button')?.dataset.m; if (!m || m === FD.icon.type) return;
    if (m === 'glyph') fdSet(fdLastGlyph || randomGlyph());
    else { const p = providerByName($('#fdName').value) || PROVIDERS.find(x => x.name === 'Google Gemini'); fdSet(brandIcon(p)); }
  };
  // any of the 260+ companies
  UIKit.combo($('#fdBrandQ'), q => {
    const n = q.toLowerCase();
    return PROVIDERS.filter(p => !n || p.name.toLowerCase().includes(n) || p.domain.includes(n)).slice(0, 8)
      .map(p => { const lg = el('div', 'logo'); paintLogo(lg, { name: p.name, domain: p.domain }); return { value: p.name, sub: p.domain, iconEl: lg }; });
  }, { onPick: it => { const p = PROVIDERS.find(x => x.name === it.value); if (p) fdSet(brandIcon(p)); $('#fdBrandQ').value = ''; } });
  // typing a company's name picks its logo, until you choose an icon yourself
  $('#fdName').addEventListener('input', () => {
    if (!FD.auto) return;
    const p = providerByName($('#fdName').value);
    if (p) fdSet(brandIcon(p), false);
    else if (FD.icon.type === 'brand') fdSet(fdLastGlyph || randomGlyph(), false);
  });
  $('#fdDelete').onclick = () => FD.editing && deleteFolder(FD.editing);
  $('#fdForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const name = $('#fdName').value.trim().replace(/\s+/g, ' ');
    if (!name) return $('#fdErr').textContent = 'Give the folder a name.';
    if (name.length > 40) return $('#fdErr').textContent = 'Keep the name under 40 characters.';
    if (folders().some(f => f !== FD.editing && f.name.toLowerCase() === name.toLowerCase())) return $('#fdErr').textContent = 'You already have a folder with that name.';
    const now = Date.now();
    let f = FD.editing;
    if (f) Object.assign(f, { name, icon: FD.icon, updated: now });
    else { f = { id: uid(), name, icon: FD.icon, created: now, updated: now }; data.folders = [...folders(), f]; }
    if (FD.then?.moveKey) FD.then.moveKey.folder = f.id;
    if (FD.then?.pickFor) FD.then.pickFor(f.id);
    const r = $('#fdSave').getBoundingClientRect();
    $('#folderDlg').close(); await persist(); render();
    pow(FD.editing ? 'SAVED!' : 'NEW DIGS!', { getBoundingClientRect: () => r }, 'cool'); Orb.react('happy');
    toast(FD.editing ? `Folder “${name}” updated` : FD.then?.moveKey ? `Created “${name}” and moved ${FD.then.moveKey.name} in` : `Folder “${name}” created`, 'ok');
  });
}

/* ---------- the key editor's Folder field (a themed picker, not a native <select>) ---------- */
function folderFieldPaint() {
  const f = folderById($('#fFolder').value), btn = $('#fFolderBtn');
  btn.replaceChildren();
  if (f) btn.append(folderIcon(f, 'sm'), el('span', 'ff-name', f.name));
  else { const i = el('span', 'ff-none'); i.innerHTML = icon('folder'); btn.append(i, el('span', 'vt-ph', 'No folder')); }
  btn.insertAdjacentHTML('beforeend', '<svg class="i chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>');
}
function folderFieldSet(id) {
  $('#fFolder').value = id || ''; folderFieldPaint();
  // bulk paste names keys after the folder ("Gemini key 1"…) unless you typed your own name
  if (edBulk) {
    if ($('#fName').value === autoFilled.name) { const b = bulkBase(); $('#fName').value = b; autoFilled.name = b; }
    paintBulk();
  }
}
function folderFieldMenu() {
  const r = $('#fFolderBtn').getBoundingClientRect(), cur = $('#fFolder').value;
  UIKit.menu(r.left, r.bottom + 4, [
    { label: 'No folder', icon: icon('out'), active: !cur, action: () => folderFieldSet('') },
    ...(folders().length ? ['-'] : []),
    ...folders().map(f => ({ label: f.name, iconEl: folderIcon(f, 'sm'), active: f.id === cur, action: () => folderFieldSet(f.id) })),
    '-',
    { label: 'New folder…', icon: icon('folderPlus'), action: () => openFolderDialog(null, { pickFor: folderFieldSet }) },
  ], $('#fFolderBtn'));
}

/* ---------- boot ---------- */
buildFolderDialog();
$('#fFolderBtn').onclick = folderFieldMenu;
$('#btnFolder').innerHTML = icon('folderPlus');
$('#btnFolder').onclick = () => openFolderDialog();
