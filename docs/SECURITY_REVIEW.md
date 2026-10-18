# Pre-release security review

An independent read-only review of the code (threat model: compromised renderer, hostile project folder, malicious export file, stolen database or export). Each finding was re-checked against the code before acting. Status as of the Phase 6 branch.

## Fixed

| # | Finding | Fix |
| :-- | :-- | :-- |
| 1 | A crafted `.envault` could point restore at any path (`~/.zshrc`, a LaunchAgent) | Import validates every row: absolute project paths, tracked files must be `.env*` names without traversal, strict field types (`importValidation.ts`) |
| 2 | Import was destructive and not crash-safe | Rows and key change in one transaction; the keychain write happens first and in-memory state is restored on failure; native confirmation dialog; current database copied to `envault.db.bak-import` first |
| 3 | `ELECTRON_RENDERER_URL` honoured in packaged builds | Ignored when packaged (window and sender check); verified on a packaged build |
| 5 | scrypt N=2^15, parameters not stored | New wraps use N=2^17 with parameters in the blob; only two exact parameter sets are accepted on unwrap; older wraps still open |
| 6 | Recovery passphrase could be replaced without proof | Changing an existing passphrase requires the current one (also in the Settings UI) |
| 7 | No limit on unlock guesses | Exponential backoff after 3 failures for unlock, passphrase change and import |
| 9 | Restore did not check a version belongs to the file | Restore refuses mismatched versions |
| 10 | Release workflow: unpinned actions, broad token, secrets and write access in one job | Actions pinned to commit SHAs, `persist-credentials: false`, build job (secrets, read-only) split from publish job (write, no secrets), `release` environment, `https://` check on the update URL |
| 12 | Unbounded reads, no scan reentrancy guard | Import capped at 100 MB, discovery skips files over 1 MB, one scan at a time |
| 13 | Symlinked parent directories followed | `resolveInside` checks the real parent as well |
| 14 | Diagnostics could contain paths | Paths are scrubbed from the log tail |
| 8 (part) | GCM tag/IV lengths not pinned | Tag fixed to 16 bytes, IV to 12, enforced on decrypt and unwrap |

## Fixed after the review

- **#4 Electron 34 was out of support.** Upgraded to Electron 44.9.0 (with `better-sqlite3` 13 and electron-builder 26). The main-process clipboard became asynchronous in Electron 44, so the clipboard auto-clear was reworked and quitting now waits for it. Navigation block, permission denial, single-instance lock, fuses, ASAR integrity, packaged smoke test and the dual-architecture build were re-verified. See "Electron version policy" in `docs/RELEASING.md` for keeping up.

## Open: documented trade-offs

- **#8 No AAD on snapshot ciphertexts.** Someone who can already write the database could swap or roll back snapshots between files. Binding ciphertexts to `envFileId|versionId` needs a data migration; tracked for after 1.0. Restore now checks version ownership, which closes the cross-file case.
- **#11 `content_hash` is an unsalted SHA-256** and project names, paths and key names are stored in plain text. An attacker with the database could confirm a guess of a small `.env`. Switching to an HMAC changes dedup hashes (one extra version per file after upgrade).
- **#15 Plaintext reaches the renderer** when a version is opened (all values at once, masked in the UI). Revealing per key on demand would shrink the blast radius of an XSS but is a larger refactor; the renderer is sandboxed with a strict CSP and has no `innerHTML`/`eval`.
- **#16 Minor:** CSP is a meta tag with `style-src 'unsafe-inline'` (needed by the UI libraries), the `GrantFileProtocolExtraPrivileges` fuse is left on (the app loads from `file://`), key buffers are not zeroed, and the clipboard write is not marked as concealed.
