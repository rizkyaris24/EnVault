# Launch checklist

Tick every item for the release candidate before announcing. Commands assume the downloaded `.dmg` or the built `.app`.

## Build and trust

- [ ] CI green on `main`; `CHANGELOG.md` and `package.json` version updated.
- [ ] Release workflow succeeded for the tag; its verify step passed (`codesign`, `spctl`, `stapler`, smoke test).
- [ ] On a Mac that never built the app: download the dmg, open it, drag to Applications, launch. No Gatekeeper warning.
  - `spctl -a -vv /Applications/EnVault.app` says `accepted` and `source=Notarized Developer ID`.
  - `xcrun stapler validate /Applications/EnVault.app` says `The validate action worked!`.
- [ ] Both architectures checked (Apple Silicon, and Intel or Rosetta).
- [ ] The app icon is the real one (the repo ships a placeholder).

## Updates

- [ ] Publish a release candidate (`1.0.0-rc.1`), install it, then publish `1.0.0-rc.2` and confirm the installed app finds, downloads and installs it (Settings shows "Version ... is ready", then "Restart to update").
- [ ] `latest-mac.yml` on the server lists both zips and the hashes match (`shasum -a 512`).
- [ ] The update URL is HTTPS and the TLS certificate is valid for at least 60 more days.
- [ ] Rollback rehearsed: replace `latest-mac.yml` with the previous one and confirm installed apps stop offering the new version.

## Safety

- [ ] `docs/QA.md` repeatable checks 1-6 pass on the release build.
- [ ] Private beta (10-20 developers) ran for at least a week with no open data-loss or security issue. Beta builds use a prerelease version such as `1.0.0-beta.1`: electron-updater then follows the `beta` channel (`beta-mac.yml`), so stable users never see them. Upload `beta-mac.yml` and the beta files to the same update folder.
- [ ] `SECURITY.md` reporting channel works (send a test report). Private vulnerability reporting is enabled on the repository.

## Website

- [ ] Download page links to the dmg with its SHA-256 and the minimum macOS version.
- [ ] Privacy statement matches `PRIVACY.md`; release notes match `CHANGELOG.md`.
- [ ] A support path exists (issues URL or email) and is linked from the app's Help menu.
