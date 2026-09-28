<p align="center"><img src="build/icon-512.png" width="96" alt="Vaulter"></p>

<h1 align="center">Vaulter</h1>
<p align="center">An encrypted, offline vault for your API keys. Windows desktop app.</p>

<p align="center">
  <a href="https://github.com/Aaad1tyaaA/vaulter/releases/latest"><b>⬇ Download the latest version</b></a>
  &nbsp;·&nbsp; Windows 10 / 11 (64-bit) &nbsp;·&nbsp; <a href="#install">Step-by-step install guide</a>
</p>

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

**Needs:** Windows 10 or 11, 64-bit. About 400 MB of disk space. No account, no internet needed after install.

### 1. Download

1. Open the **[latest release page](https://github.com/Aaad1tyaaA/vaulter/releases/latest)**.
2. Scroll down to **Assets** and click **`Vaulter-Setup-2.0.0.exe`** (the version number may be newer).
   Also download **`SHA256SUMS.txt`** if you want to do the check in step 2.
3. Your browser may warn that the file *"isn't commonly downloaded"*, because it's new and unsigned:
   - **Edge:** hover the download → click **⋯** → **Keep** → **Show more** → **Keep anyway**.
   - **Chrome:** click **Keep** (or open the downloads list with Ctrl+J → **Keep dangerous file**).

### 2. Check the download is genuine (optional, recommended)

The installer isn't code-signed yet, so this is how you know the file is exactly the one published here.

1. Open your **Downloads** folder, click the address bar, type `powershell` and press **Enter**.
2. Paste this and press **Enter**:
   ```powershell
   (Get-FileHash '.\Vaulter-Setup-2.0.0.exe' -Algorithm SHA256).Hash
   ```
3. Compare the long code it prints with the line in `SHA256SUMS.txt` (also shown in the release notes).
   Capital vs small letters don't matter. **If they don't match, delete the file and don't run it.**

### 3. Install

1. Double-click **`Vaulter-Setup-2.0.0.exe`**.
2. Windows shows a blue box: *"Windows protected your PC"*. This appears for any app that isn't code-signed yet.
   Click **More info** (the small link under the text), then **Run anyway**.
3. Click **Yes** on the *"Do you want to allow this app to make changes?"* prompt. Vaulter installs into
   Program Files, where its files can't be tampered with without admin rights.
4. In the installer, keep the suggested folder (or pick another), click **Install**, then **Finish**.

Vaulter is now on your **desktop** and in the **Start menu**.

### 4. First launch

1. Open **Vaulter**.
2. Create your **master password**. Vaulter only accepts strong ones: 16+ characters mixing upper and lower
   case, numbers and symbols. Click **Generate strong password** to have one made for you, and save it in your
   password manager.
3. Vaulter shows your **recovery code**. **Write it down or save it somewhere off this PC.** It's the only
   way back in if you forget the password. Tick *"I've saved my recovery code"* and click **Enter the vault**.
4. Recommended: open **Settings (⚙) → Backups → Automatic backups → Change folder** and pick a OneDrive,
   Google Drive or Dropbox folder, so your encrypted backups live off your PC too.

Then paste your first API key with **New key** (or just press **Ctrl+V** anywhere in the vault).

### Updating to a new version

Download the new `Vaulter-Setup-x.y.z.exe` from the [latest release](https://github.com/Aaad1tyaaA/vaulter/releases/latest)
and run it the same way. It installs over the old version. **Your keys, folders and backups are kept.**

### Uninstalling

**Windows Settings → Apps → Installed apps → Vaulter → ⋯ → Uninstall.**
Your encrypted vault (`%APPDATA%\Vaulter`) and backups (`Documents\Vaulter Backups`) are **not** deleted, so
reinstalling picks up where you left off. Delete those two folders too if you want everything gone.

### Troubleshooting

| Problem | Fix |
|---|---|
| No **Run anyway** button on the blue Windows box | Click the small **More info** link first. |
| Browser deleted or blocked the download | Use the browser's downloads list (Ctrl+J) and choose **Keep / Keep anyway**. |
| Antivirus quarantined the installer | It's flagged only for being new and unsigned. Check the SHA-256 (step 2), then restore it from quarantine. |
| "Vaulter found your encrypted backups" on first launch | You've used Vaulter on this PC before. Click **Restore newest backup** and unlock it with your old password or recovery code. |
| Forgot the master password | On the unlock screen click **Forgot password?** and enter your recovery code. |
| Vault locks while I'm using it | That's the session timer. Change it in **Settings → Security → Lock the vault this long after unlocking**. |

## Where your data lives

| What | Where | Survives uninstall? |
|---|---|---|
| The vault (encrypted) | `%APPDATA%\Vaulter\vault.json` | Yes: the uninstaller leaves it |
| Automatic backups (encrypted, one per day, last 30) | `Documents\Vaulter Backups` (change it in Settings) | Yes |
| Exported backups | wherever you save them | Yes |

Every file is encrypted. It opens only with your master password or your recovery code.

### Backing up

- **Automatic (recommended):** Settings → **Backups** → *Automatic backups* → **Change folder** → pick a OneDrive /
  Google Drive / Dropbox folder. Every change is then backed up off your machine, still encrypted.
- **Manual:** Settings → **Backups** → **Export encrypted backup** → save the `.json` to a USB stick or cloud drive.
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
