const { contextBridge, ipcRenderer } = require('electron')

// Sync calls return { error } instead of throwing across the bridge; surface those as exceptions.
const sync = (ch, ...a) => {
  const r = ipcRenderer.sendSync(ch, ...a)
  if (r && typeof r === 'object' && typeof r.error === 'string') throw new Error(r.error)
  return r
}

contextBridge.exposeInMainWorld('kvFs', {
  read: () => sync('kv:read'),
  write: text => sync('kv:write', text),
  wipe: opts => sync('kv:wipe', { backups: !!opts?.backups }),
  purgeBackups: () => sync('kv:purgeBackups'),
  backupNow: () => sync('kv:backupNow'),
  backupInfo: () => sync('kv:backupInfo'),
  openBackupDir: () => sync('kv:openBackupDir'),
  chooseBackupDir: () => ipcRenderer.invoke('kv:chooseBackupDir'),
  copy: (text, clearAfter) => ipcRenderer.invoke('kv:copy', String(text), Number(clearAfter) || 0),
  paste: () => ipcRenderer.invoke('kv:paste'),
  latestBackup: () => sync('kv:latestBackup'),
  pickBackupFile: () => ipcRenderer.invoke('kv:pickBackupFile'),
  onLock: cb => { ipcRenderer.on('kv:lock', () => cb()) },
  onMinimize: cb => { ipcRenderer.on('kv:minimize', () => cb()) },
  clearClipboard: () => ipcRenderer.invoke('kv:clearClipboard'),
})
