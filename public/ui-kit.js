'use strict';
// Vaulter UI kit: themed replacements for every native control the browser/OS would otherwise draw
// (tooltips, right-click menus, autocomplete dropdowns, date pickers). Loaded before app.js.
const UIKit = (() => {
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const place = (pop, r, gap = 8) => { // below the anchor rect, flipped/clamped to stay on screen
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let x = Math.min(Math.max(8, r.left), innerWidth - w - 8), y = r.bottom + gap;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - gap);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  };
  // Popups go in the popover top layer: above modal dialogs, positioned against the window, and never
  // clipped by a dialog's scroll area or blur (which would trap position:fixed children).
  // Every open popup registers a closer; they all close when a dialog closes (Esc, ×, Save…) so nothing is orphaned.
  const closers = new Set([() => hideTip()]);
  // Watch the `open` attribute rather than the dialog `close` event: the event waits for a rendered frame,
  // the attribute change is synchronous however the dialog closes (Esc, ×, Save, code).
  new MutationObserver(ms => { if (ms.some(m => m.target.tagName === 'DIALOG' && !m.target.open)) closers.forEach(fn => fn()); })
    .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['open'] });
  const show = el => { el.setAttribute('popover', 'manual'); document.body.append(el); try { el.showPopover(); } catch {} };

  /* ---------- tooltips: every [title] becomes a themed tip ---------- */
  const tip = mk('div', 'vt-tip'); tip.setAttribute('role', 'tooltip');
  let tipFor = null, tipTimer;
  const hideTip = () => { clearTimeout(tipTimer); tip.classList.remove('on'); tipFor = null; };
  document.addEventListener('pointerover', e => {
    const t = e.target.closest?.('[title], [data-tip]');
    if (!t || t === tipFor) return;
    if (t.hasAttribute('title')) { t.dataset.tip = t.getAttribute('title'); t.removeAttribute('title'); }
    if (!t.dataset.tip) return;
    hideTip(); tipFor = t;
    tipTimer = setTimeout(() => {
      if (!t.isConnected || tipFor !== t) return;
      if (!tip.isConnected) show(tip); else try { tip.showPopover(); } catch {}
      tip.textContent = t.dataset.tip;
      const r = t.getBoundingClientRect();
      tip.style.left = '0px'; tip.style.top = '0px'; tip.classList.add('on');
      const w = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + 'px';
      tip.style.top = (r.top - tip.offsetHeight - 8 < 8 ? r.bottom + 8 : r.top - tip.offsetHeight - 8) + 'px';
    }, 450);
  });
  document.addEventListener('pointerout', e => { if (tipFor && !tipFor.contains(e.relatedTarget)) hideTip(); });
  ['pointerdown', 'keydown', 'scroll', 'blur'].forEach(ev => addEventListener(ev, hideTip, true));

  /* ---------- menus (right-click and anything else) ---------- */
  let openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }
  closers.add(closeMenu);
  /** items: [{ label, action, icon? (html) | iconEl? (Node), hint?, danger?, disabled?, active? } | '-'] */
  function menu(x, y, items, anchor) {
    closeMenu(); hideTip();
    const m = mk('div', 'vt-menu glass'); m.setAttribute('role', 'menu');
    for (const it of items) {
      if (it === '-') { m.append(mk('div', 'vt-sep')); continue; }
      const b = mk('button', 'vt-item' + (it.danger ? ' danger' : '') + (it.active ? ' active' : '')); b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.disabled = !!it.disabled;
      if (it.iconEl) b.append(it.iconEl); else b.innerHTML = it.icon || '';
      b.append(mk('span', 'vt-label', it.label));
      if (it.hint) b.append(mk('kbd', '', it.hint));
      b.onclick = () => { closeMenu(); it.action(); };
      m.append(b);
    }
    show(m); openMenu = m;
    place(m, { left: x, right: x, top: y, bottom: y }, 2);
    m.querySelector('.vt-item:not(:disabled)')?.focus();
    m.addEventListener('keydown', e => {
      const list = [...m.querySelectorAll('.vt-item:not(:disabled)')], i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
    });
  }
  addEventListener('pointerdown', e => { if (openMenu && !openMenu.contains(e.target)) closeMenu(); }, true);
  addEventListener('blur', closeMenu);
  addEventListener('resize', closeMenu);
  document.addEventListener('scroll', closeMenu, true);

  // Right-click: text fields get edit actions; the app can register menus for its own elements.
  const contextHandlers = [];
  const onContext = fn => contextHandlers.push(fn);
  const paste = async () => { try { return window.kvFs ? await kvFs.paste() : await navigator.clipboard.readText(); } catch { return ''; } };
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    const field = e.target.closest?.('input:not([type=checkbox]):not([type=file]), textarea');
    if (field && !field.disabled) {
      const sel = field.selectionEnd > field.selectionStart, secret = field.type === 'password', ro = field.readOnly;
      field.focus();
      return menu(e.clientX, e.clientY, [
        { label: 'Cut', hint: 'Ctrl+X', disabled: !sel || secret || ro, action: () => document.execCommand('cut') },
        { label: 'Copy', hint: 'Ctrl+C', disabled: !sel || secret, action: () => document.execCommand('copy') },
        { label: 'Paste', hint: 'Ctrl+V', disabled: ro, action: async () => { const t = await paste(); field.focus(); if (t) document.execCommand('insertText', false, t); } },
        '-',
        { label: 'Select all', hint: 'Ctrl+A', action: () => { field.focus(); field.select(); } },
      ], field);
    }
    for (const fn of contextHandlers) { const items = fn(e); if (items?.length) return menu(e.clientX, e.clientY, items, e.target); }
  });

  /* ---------- combobox: themed suggestions instead of <datalist> ---------- */
  /** source(query) -> [{ value, label?, sub?, icon? (html) | iconEl? (Node) }] */
  function combo(input, source, { onPick } = {}) {
    const pop = mk('div', 'vt-pop glass'); pop.setAttribute('role', 'listbox');
    let items = [], active = -1, picking = false;
    input.setAttribute('autocomplete', 'off'); input.setAttribute('role', 'combobox');
    const close = () => { pop.remove(); active = -1; };
    closers.add(close);
    const choose = it => { // tell the app the value changed, without re-opening the list we just closed
      input.value = it.value; close();
      picking = true; input.dispatchEvent(new Event('input', { bubbles: true })); picking = false;
      onPick?.(it);
    };
    const paint = () => pop.querySelectorAll('.vt-opt').forEach((o, i) => o.classList.toggle('on', i === active));
    const open = () => {
      items = source(input.value.trim()).slice(0, 8);
      if (!items.length || (items.length === 1 && items[0].value === input.value)) return close();
      pop.replaceChildren(...items.map((it, i) => {
        const o = mk('div', 'vt-opt'); o.setAttribute('role', 'option');
        if (it.iconEl) o.append(it.iconEl); else o.innerHTML = it.icon || '';
        const t = mk('div', 'vt-opt-t'); t.append(mk('b', '', it.label || it.value)); if (it.sub) t.append(mk('small', '', it.sub));
        o.append(t);
        o.onpointerdown = ev => { ev.preventDefault(); choose(it); };
        o.onpointerenter = () => { active = i; paint(); };
        return o;
      }));
      if (!pop.isConnected) show(pop);
      pop.style.width = input.offsetWidth + 'px';
      place(pop, input.getBoundingClientRect(), 6);
      active = -1; paint();
    };
    input.addEventListener('input', () => { if (!picking) open(); });
    input.addEventListener('focus', open);
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', e => {
      if (!pop.isConnected) { if (e.key === 'ArrowDown') { open(); e.preventDefault(); } return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; paint(); pop.children[active]?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') close();
    });
    return { close };
  }

  /* ---------- date picker: a themed calendar for a hidden ISO (yyyy-mm-dd) input ---------- */
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
  function datePicker(hidden, button, { placeholder = 'Pick a date' } = {}) {
    const refresh = () => {
      const d = parse(hidden.value);
      button.replaceChildren(mk('span', d ? '' : 'vt-ph', d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder));
      button.insertAdjacentHTML('beforeend', '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>');
    };
    const set = d => { hidden.value = d ? iso(d) : ''; refresh(); hidden.dispatchEvent(new Event('change', { bubbles: true })); };
    let view, pop = null;
    const close = () => { pop?.remove(); pop = null; };
    closers.add(close);
    const render = () => {
      const today = new Date(new Date().toDateString()), sel = parse(hidden.value);
      pop.replaceChildren();
      const head = mk('div', 'vt-cal-head');
      const nav = (label, delta) => { const b = mk('button', 'icon-btn', label); b.type = 'button'; b.onclick = () => { view.setMonth(view.getMonth() + delta); render(); }; return b; };
      head.append(nav('‹', -1), mk('b', '', view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })), nav('›', 1));
      const grid = mk('div', 'vt-cal-grid');
      for (const d of ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']) grid.append(mk('span', 'vt-dow', d));
      const first = new Date(view.getFullYear(), view.getMonth(), 1), start = (first.getDay() + 6) % 7;
      for (let i = 0; i < 42; i++) {
        const d = new Date(view.getFullYear(), view.getMonth(), 1 - start + i);
        const b = mk('button', 'vt-day', String(d.getDate())); b.type = 'button';
        if (d.getMonth() !== view.getMonth()) b.classList.add('out');
        if (+d === +today) b.classList.add('today');
        if (sel && +d === +sel) b.classList.add('sel');
        b.onclick = () => { set(d); close(); button.focus(); };
        grid.append(b);
      }
      const quick = mk('div', 'vt-cal-quick');
      for (const [label, fn] of [['+30 days', d => d.setDate(d.getDate() + 30)], ['+90 days', d => d.setDate(d.getDate() + 90)], ['+6 months', d => d.setMonth(d.getMonth() + 6)], ['+1 year', d => d.setFullYear(d.getFullYear() + 1)]]) {
        const b = mk('button', 'chip', label); b.type = 'button'; b.onclick = () => { const d = new Date(today); fn(d); set(d); close(); }; quick.append(b);
      }
      const clr = mk('button', 'chip', 'Clear'); clr.type = 'button'; clr.onclick = () => { set(null); close(); }; quick.append(clr);
      pop.append(head, grid, quick);
    };
    button.addEventListener('click', () => {
      if (pop) return close();
      view = parse(hidden.value) || new Date(); view.setDate(1);
      pop = mk('div', 'vt-cal glass'); pop.setAttribute('role', 'dialog');
      render(); show(pop); place(pop, button.getBoundingClientRect(), 6);
    });
    addEventListener('pointerdown', e => { if (pop && !pop.contains(e.target) && !button.contains(e.target)) close(); }, true);
    button.addEventListener('keydown', e => { if (e.key === 'Escape' && pop) { e.preventDefault(); e.stopPropagation(); close(); } });
    refresh();
    return { refresh, close };
  }

  return { menu, closeMenu, onContext, combo, datePicker };
})();
