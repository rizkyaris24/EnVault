# Security

EnVault stores people's secrets, so security reports are taken seriously.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting: **Security > Report a vulnerability** on the repository. Include the version, steps to reproduce, and the impact you see. You will get an acknowledgement and a fix timeline; please allow time for a fix before disclosing.

## How your data is protected

- Every snapshot is encrypted with AES-256-GCM using a per-vault key.
- The key is wrapped by the macOS Keychain (Electron `safeStorage`). If you set a recovery passphrase, the same key is also wrapped with it (scrypt, then AES-256-GCM). If neither is available, EnVault refuses to open the vault rather than store the key in plain text.
- Secret reuse detection stores only an HMAC of each value, with a pepper that is itself stored encrypted. Plaintext values are never compared across projects.
- Exports contain only encrypted snapshots; the key inside is wrapped by the export passphrase.
- The app makes no network requests except checking for updates, which you can turn off in Settings.

## Known limits

- Anyone who can unlock your Mac and use your keychain session can open the vault.
- A forgotten recovery passphrase cannot be reset. EnVault cannot recover your data.
- Environment files over 1 MB are not backed up.
