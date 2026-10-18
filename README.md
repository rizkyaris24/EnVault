# EnVault

> A passive, encrypted, versioned backup system for environment configuration files. EnVault monitors your local projects in the background, preserves an encrypted audit history of every secret, and restores files automatically if lost, deleted, or corrupted -- with zero workflow disruption.

---

## Overview

Modern software development relies heavily on local `.env` configuration files that contain database credentials, private API keys, and third-party tokens. When repositories are deleted, re-cloned, or stashed, these critical secrets are frequently lost because `.gitignore` prevents them from being pushed to remote source control.

EnVault solves this problem locally and deterministically. It operates entirely on-device without cloud infrastructure, silently monitoring registered directories, taking AES-256-GCM encrypted snapshots on each file change, and allowing instant recovery or version rollback.

---

## Install

Download the latest `.dmg` from the EnVault website, open it, and drag EnVault to Applications. Requires macOS 13 or later, on Apple Silicon or Intel. Releases are signed and notarized, and update themselves (you can turn that off in Settings).

On first launch EnVault asks you to set a **recovery passphrase**. Keep it somewhere safe: if your keychain is reset or you move to a new Mac, it is the only way to open your backups.

---

## What it does

- **Backs up `.env` files automatically.** Add a project folder, or scan your development folders. EnVault saves an encrypted version each time a `.env` file changes.
- **Restores any version.** Compare versions, and restore a missing or overwritten file. Restoring first saves whatever is on disk, so it is always reversible.
- **Shows reused secrets.** Flags values that appear in more than one project, without ever comparing plaintext.
- **Keeps working in the background.** After you close the window EnVault keeps watching (macOS). Quit from the menu to stop. This can be changed in Settings.
- **Moves with you.** Export the whole vault to one passphrase-protected file and import it on another Mac.
- **Keyboard first.** `Cmd+K` command palette, `Cmd+N` add a folder, `Shift+Cmd+S` scan, `Cmd+1/2/3` Secrets, Raw, History, `Cmd+,` Settings, `Esc` back to Projects.

---

## Architecture

```text
+----------------------------------------------------------+
|                  Renderer Process (UI)                   |
|       React 18 + Vite + Tailwind CSS + Lucide Icons      |
+----------------------------+-----------------------------+
                             | IPC (contextBridge)
+----------------------------v-----------------------------+
|                 Preload Security Bridge                  |
|       contextIsolation: true | sandbox: true             |
+----------------------------+-----------------------------+
                             |
+----------------------------v-----------------------------+
|                 Electron Main (Node.js)                  |
|  |- Watcher Service (chokidar, debounce, dedupe)         |
|  |- Backup & Restore Service (atomic writes)             |
|  |- Computer Scanner (recursive project discovery)       |
|  |- Crypto Service (AES-256-GCM + OS safeStorage)        |
|  |- Reuse Detector (salted HMAC-SHA256)                  |
|  \- SQLite Database (better-sqlite3)                     |
+----------------------------------------------------------+
```

---

## Security

| Layer | Implementation |
| :--- | :--- |
| **Snapshots** | AES-256-GCM, unique IV and authentication tag per version |
| **Vault key** | Wrapped by the macOS Keychain (Electron `safeStorage`). Optionally also wrapped by your recovery passphrase (scrypt + AES-256-GCM). If neither is available the vault will not open; the key is never stored in plain text. |
| **Reuse detection** | HMAC-SHA256 of each value with a pepper that is stored encrypted |
| **Network** | None, except checking for updates (can be turned off). No accounts, analytics or telemetry. |
| **Restore** | Atomic write (temp file, fsync, rename); file paths are contained to the project folder; symlinks are refused |
| **App** | Sandboxed renderer, validated IPC, locked navigation and permissions, secrets cleared from the clipboard after 30 seconds |

See [SECURITY.md](SECURITY.md) for reporting a vulnerability and known limits, and [PRIVACY.md](PRIVACY.md).

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/rizkyaris24/EnVault.git
cd EnVault

# Install dependencies and compile native binaries
npm install
```

### Development Mode

```bash
npm run dev
```

### Verification & Testing

```bash
# Run automated Anti-Slop design linter
npm run lint:design

# Run TypeScript strict type verification
npm run typecheck

# Run full unit and integration test suite
npm test
```

### Production Build

```bash
# Compile and bundle main, preload, and renderer processes
npm run build

# Unsigned local app in release/mac-arm64/, then check it launches and the vault opens
npm run pack
npm run smoke:packaged

# Signed, notarized installers (needs certificates; normally done by CI)
npm run build:mac
```

Releasing is described in [docs/RELEASING.md](docs/RELEASING.md). macOS only for now.

---

## Tech Stack

- **Framework**: Electron 44
- **Build Tooling**: electron-vite, Vite 6
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Typography**: Geist Sans, Geist Mono (bundled locally via Fontsource)
- **Database**: SQLite 3 via `better-sqlite3`
- **File Watching**: Chokidar
- **Testing**: Vitest (run inside Electron so the native SQLite module matches)
- **Updates**: electron-updater against a self-hosted feed

---

## License

MIT (c) 2026 Rizky Amanatama
