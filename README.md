# EnVault

> **Delete the project. Keep the secrets.**  
> A passive, encrypted, versioned backup system for environment configuration files. EnVault monitors your local projects in the background, preserves an encrypted audit history of every secret, and restores files automatically if lost, deleted, or corrupted -- with zero workflow disruption.

---

## Overview

Modern software development relies heavily on local `.env` configuration files that contain database credentials, private API keys, and third-party tokens. When repositories are deleted, re-cloned, or stashed, these critical secrets are frequently lost because `.gitignore` prevents them from being pushed to remote source control.

EnVault solves this problem locally and deterministically. It operates entirely on-device without cloud infrastructure, silently monitoring registered directories, taking AES-256-GCM encrypted snapshots on each file change, and allowing instant recovery or version rollback.

---

## Core Capabilities

- **Automated Computer & Workspace Scanning**: Recursively scans development directories (such as `~/Projects`, `~/Developer`, `~/workspace`, `~/Code`) to discover projects and `.env` files, automatically ingesting and encrypting them with zero manual configuration.
- **Selective Project Registration**: Interactive discovery checklist detects `.env`, `.env.local`, `.env.production`, and custom configuration files, with intelligent defaults to exclude public example templates (`.env.example`).
- **Passive Background Monitoring**: Powered by `chokidar` with debounce and deduplication controls. Listens to file system events and automatically suppresses self-triggered watcher events during restores to eliminate recursive loops.
- **Envelope Encryption**: Utilizes AES-256-GCM encryption with per-vault Data Encryption Keys (DEKs). Keys are protected at rest via the operating system keychain (macOS Keychain via Electron's `safeStorage`, with DPAPI on Windows and Secret Service on Linux).
- **Salted HMAC Secret Reuse Detection**: Hashes secrets using a salted HMAC-SHA256 digest to detect duplicate secrets across different projects without exposing plaintext values across project boundaries.
- **Atomic Restoration and Disaster Recovery**: Restores lost or overwritten `.env` files using atomic file system operations (`.tmp` write followed by `fsync` and atomic rename), guaranteeing zero file corruption.
- **Version History Timeline & Diff Inspection**: Continuous visual timeline tracking every recorded snapshot with relative timestamps, variable count deltas, trigger sources (Auto-Watcher, Manual, Restore), and a visual diff viewer highlighting added, removed, and modified values.
- **Human-Centered Interface Design**: Designed according to empirical Laws of UI and Laws of UX principles, featuring high-contrast typography, Fitts's Law hit targets, balanced confirmation dialogs, and a specialized dark color system.
- **Raw Code Viewer**: Integrated code inspector with line number gutters, token syntax styling, and line/character count diagnostics.
- **Global Keyboard Navigation**:
  - `Cmd+K` / `Ctrl+K`: Focus project search.
  - `Cmd+N` / `Ctrl+N`: Register new project directory.
  - `Shift+Cmd+S` / `Shift+Ctrl+S`: Initiate whole computer scan.
  - `Cmd+1` / `Ctrl+1`: Switch to Secrets table view.
  - `Cmd+2` / `Ctrl+2`: Switch to Raw file view.
  - `Cmd+3` / `Ctrl+3`: Switch to History timeline view.
  - `Escape`: Dismiss modals, dialogs, and overlays.

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

## Security Specifications

| Layer | Implementation | Details |
| :--- | :--- | :--- |
| **Data Encryption at Rest** | AES-256-GCM | Unique 12-byte IV and 16-byte authentication tag per snapshot record |
| **Key Storage** | OS Native Keychain | Master Vault Key protected via Electron `safeStorage` |
| **Deduplication** | SHA-256 Content Hash | Avoids redundant versions if content has not changed |
| **Secret Cross-Matching** | Salted HMAC-SHA256 | Zero plaintext cross-contamination across projects |
| **Network Exposure** | None | 100% offline, zero external telemetry or cloud communication |
| **Data Loss Prevention** | Atomic File Swapping | Temporary file write + `fsync` + file rename avoids corrupted states |

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

### Running Test Suite

Vitest runs using Electron's Node runtime to ensure compatibility with `better-sqlite3`:

```bash
# Run full unit and integration test suite
npm test

# Run TypeScript strict type verification
npm run typecheck
```

### Production Build

```bash
# Compile and bundle main, preload, and renderer processes
npm run build

# Package desktop application for macOS
npm run build:mac

# Package desktop application for Windows
npm run build:win
```

---

## Tech Stack

- **Framework**: Electron 34
- **Build Tooling**: electron-vite, Vite 6
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: SQLite 3 via `better-sqlite3`
- **File Watching**: Chokidar
- **Testing**: Vitest

---

## License

MIT (c) EnVault Team
