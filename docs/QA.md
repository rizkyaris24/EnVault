# QA

What was verified automatically, what needs a human or another machine, and how to repeat the checks.

## Automated (runs in CI on every PR)

`npm run typecheck`, `npm run lint:design`, `npm test` (main-process, integration and renderer component tests), then `npm run pack` and `npm run smoke:packaged` (an unsigned app is launched on a throwaway profile; the vault must open, the version must match, the renderer must have no Node access).

## Repeatable manual checks (use a throwaway profile, never your real vault)

Launch dev or packaged builds with `--user-data-dir=/tmp/envault-qa --remote-debugging-port=9222` so nothing touches `~/Library/Application Support/envault`.

1. **Plaintext leak audit.** Put marker values (`MARKER_SECRET_...`) in a project `.env`; set a recovery passphrase, add the project, edit the file, restore, copy a secret, export, try a wrong unlock, copy diagnostics. Quit. Then `grep -rla "MARKER_" /tmp/envault-qa ~/Library/Logs/envault <export file>` must find nothing. (Last run: 0 files for 7 markers.)
2. **Upgrade from an older vault.** Copy an existing `envault.db` into a throwaway profile and launch. Expect: schema moves to the latest version, a `envault.db.bak-v<n>` copy appears, project and version counts are unchanged, the project list loads quickly.
3. **Keychain loss.** Set a recovery passphrase, quit, corrupt `encrypted_dek` in the profile's database, relaunch: the unlock screen appears, a wrong passphrase is refused, the right one opens the vault and the next launch needs no passphrase.
4. **Export and import.** Export with a passphrase; inspect the file (no plaintext, mode 600); import with a wrong passphrase (refused, nothing changes) and the right one (data replaced).
5. **Hostile input.** Through the renderer console: `projects.add` with `selectedFiles: ['../../.ssh/id_rsa']`, `projects.scan('/etc')`, `projects.reveal('/etc/hosts')`, `settings.set('encrypted_dek','x')` must all return errors.
6. **Quit cleanup.** Copy a secret, send `SIGTERM`: the clipboard must be empty afterwards.

## Needs other machines or people (not done by the author's automation)

| Area | Matrix |
| :-- | :-- |
| macOS versions | 13, 14, 15 and the newest release |
| Hardware | Apple Silicon and one real Intel Mac (or Rosetta for a smoke test) |
| Install | Fresh install from the notarized dmg; upgrade from the previous release through the in-app updater |
| Keychain | Locked, denied access, reset; moving the vault to a new Mac via Export and Import |
| Scale | 500+ projects, a 900 KB `.env`, a folder deleted and recreated, an unplugged external drive |
| Accessibility | Keyboard-only walk of every screen; VoiceOver on onboarding, unlock, secrets list, Settings |
| Appearance | Light, dark, window at the 860px minimum width |

Record results in the release issue; any failure in the first four rows blocks the release.
