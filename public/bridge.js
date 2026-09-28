// Runs before app.js: applies the saved theme before first paint and sets up window.Orb, the bridge
// between the vanilla vault logic and the React orb (calls made before React mounts are replayed).
// apply the saved theme before first paint so there's no flash
try { document.documentElement.dataset.theme = JSON.parse(localStorage.getItem('keyvault.ui'))?.theme || 'dark'; } catch { document.documentElement.dataset.theme = 'dark'; }
// Bridge between the vanilla vault logic and the React orb. Calls made before React mounts are replayed.
window.Orb = (() => {
  const subs = new Set(), state = { mode: 'lock', sleepy: false, paused: false, theme: document.documentElement.dataset.theme, quality: (() => { try { return JSON.parse(localStorage.getItem('keyvault.ui'))?.orb || 'video'; } catch { return 'video'; } })() }, queue = [];
  const emit = e => subs.size ? subs.forEach(f => f(e, state)) : queue.push(e);
  return {
    state,
    subscribe(f) { subs.add(f); queue.splice(0).forEach(e => f(e, state)); return () => subs.delete(f); },
    react(kind) { emit({ type: 'react', kind }); },
    setMode(m) { state.mode = m; emit({ type: 'mode' }); },
    sleepy(on) { state.sleepy = on; emit({ type: 'sleepy' }); },
    setTheme(t) { state.theme = t; emit({ type: 'theme' }); },
    pause(on) { state.paused = on; emit({ type: 'pause' }); },
    setQuality(q) { state.quality = q; emit({ type: 'quality' }); },
  };
})();
