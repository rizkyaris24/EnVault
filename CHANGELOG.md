# Changelog

All notable changes to EnVault. Versions follow semantic versioning.

## 1.0.0 (unreleased)

First public release (macOS).

- Passive, encrypted, versioned backups of `.env` files; restore any version; compare versions; secret reuse detection across projects.
- Calm, minimal interface with a top bar, Projects home, command palette, light and dark themes.
- Keys protected by the macOS Keychain, with an optional recovery passphrase (needed if the keychain is reset or you move Macs).
- Export and import of the whole vault as one passphrase-protected file.
- History retention setting, automatic updates (can be turned off), diagnostics for support.
- Built on Electron 44 (Chromium 152, Node 24); requires macOS 13 or later.
- Hardening: validated IPC, path containment, single instance, locked navigation and permissions, clipboard auto-clear, Electron fuses.
