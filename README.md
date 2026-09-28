<p align="center"><img src="build/icon-512.png" width="96" alt="Vaulter"></p>

<h1 align="center">Vaulter</h1>
<p align="center">An encrypted, offline vault for your API keys. Windows desktop app.</p>

---

Vaulter keeps every API key you own in one place, encrypted on your own machine. It never syncs anywhere
and never sends a key over the network.

- **Paste a key, it figures out the rest**: recognises 260+ providers (OpenAI, Anthropic, ElevenLabs, Groq,
  Stripe, Supabase…) by their key prefix and fills in the name, env variable and logo.
- **Folders**: group keys (say, all your Gemini keys) in folders with a company logo or one of 10 emoticons
  in 8 colours and 5 styles. Drag a key onto a folder to file it; search looks inside every folder.
- **Paste many keys at once**: paste several keys (one per line, space/comma separated, or `.env` lines) into
  the editor or anywhere in the vault, and they're saved as "Gemini key 1", "Gemini key 2"… in the folder you're in,
  continuing the numbering and skipping keys you already have.
- **Search, tags, pins, grid / list view**, rotation reminders, copy as `.env`, import from `.env`.
- **Copies stay private**: copied keys are kept out of Windows clipboard history (Win+V) and cloud clipboard,
  and the clipboard is cleared after 30s.
- **Automatic encrypted backups** every day, to any folder you pick (OneDrive, Google Drive, USB…).
- Light / dark mode, a pre-rendered glass orb that runs smoothly on any laptop.

## Install

1. Download **`Vaulter-Setup-x.y.z.exe`** and **`SHA256SUMS.txt`** from the [Releases](../../releases) page.
2. **Check the download is genuine** (the installer isn't code-signed yet, so this is how you know it's mine).
   In PowerShell, in your Downloads folder:
   ```powershell
   (Get-FileHash '.\Vaulter-Setup-2.0.0.exe' -Algorithm SHA256).Hash
   ```
   The result must match the line for that file in `SHA256SUMS.txt` (upper/lower case doesn't matter).
   If it doesn't match, delete the file and don't run it.
3. Run it. Windows may say *"Windows protected your PC"* because the installer isn't code-signed yet.
   Click **More info → Run anyway**, then **Yes** on the admin prompt: Vaulter installs into Program Files,
   where its files can't be modified without admin rights.
4. Create a master password (Vaulter only accepts strong ones; **Generate strong password** makes one for you)
   and **save the recovery code it shows you**. It's the only way back in if you forget the password.

## Where your data lives

| What | Where | Survives uninstall? |
|---|---|---|
| The vault (encrypted) | `%APPDATA%\Vaulter\vault.json` | Yes: the uninstaller leaves it |
| Automatic backups (encrypted, one per day, last 30) | `Documents\Vaulter Backups` (change it in Settings) | Yes |
| Exported backups | wherever you save them | Yes |

Every file is encrypted. It opens only with your master password or your recovery code.

### Backing up

- **Automatic (recommended):** Settings → *Automatic backups* → **Change folder** → pick a OneDrive / Google Drive /
  Dropbox folder. Every change is then backed up off your machine, still encrypted.
- **Manual:** Settings → **Export encrypted backup** → save the `.json` to a USB stick or cloud drive.
- **Recovery code:** keep it on paper or in a password manager, not only on this PC.

### Restoring (new PC, reinstall, or after deleting the app)

Install Vaulter, then on the first screen click **Restore from a backup file** and pick any backup `.json`
(from `Documents\Vaulter Backups`, your cloud folder, or an export). Unlock it with the password or the
recovery code it was made with.

## Security

- AES-256-GCM encryption. The key is protected by your password through **Argon2id** (64 MiB of memory,
  3 passes), which makes cracking a stolen vault or backup on GPUs far more expensive. Vaults from older
  versions upgrade automatically the next time you unlock. A separate 100-bit recovery code can also unlock the vault.
- Only strong master passwords are accepted; changing it re-encrypts everything under a new key and issues a
  new recovery code.
- Locks when your session time runs out (activity doesn't extend it), when Windows locks or sleeps, and
  optionally when minimized. Locking wipes open fields and a copied key still on the clipboard.
- Copied keys stay out of Windows clipboard history and cloud clipboard, and are cleared after 30s.
- Hardened Electron: sandboxed renderer, strict Content-Security-Policy, all permission requests denied,
  window excluded from screenshots and screen recording, fuses disable Node-mode, the debugger and
  `NODE_OPTIONS`, and the app refuses to start with Chromium debugging switches.
- Installs into Program Files, so the app's own files need admin rights to change.
- The only network requests are optional logo lookups (the provider's domain only, never a key). You can
  turn them off in Settings.

**What it can't protect against:** malware already running on your PC as you (it could log your keystrokes
or read the screen while the vault is open), or someone using your computer while the vault is unlocked.
Use a strong master password, lock with Win+L when you step away, and keep your recovery code offline.

## Build from source

Requires Node.js 20+ on Windows.

```bash
npm ci
npm test            # provider detection, crypto (Argon2id + legacy vaults), clipboard protection
npm run app         # build and run
npm run dist        # build the installer + SHA256SUMS.txt into release/
npm run verify      # check the packaged exe's hardening (fuses, capture protection, no debug switches)
```

`npm run render:orb` re-renders the orb videos (see `scripts/render-orb.cjs`; needs `npx vite --port 8766`
running).

## License

MIT
