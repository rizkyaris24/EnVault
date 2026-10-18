# Privacy

EnVault runs entirely on your Mac.

- **No accounts, no analytics, no telemetry, no crash reporting.**
- **Your data stays local.** Project names, paths, and snapshots are stored only in EnVault's database on your computer.
- **One network use:** looking for new versions of EnVault. The request goes to the update server configured in the app and contains your app version and macOS architecture, as any HTTPS download does. You can turn automatic checks off in Settings; you can still check manually.
- **Diagnostics are manual.** "Copy diagnostics" in Settings copies settings, counts, and recent log lines to your clipboard. It contains no project names, paths, or secrets. Nothing is sent anywhere unless you paste it.
- **Logs** are stored in `~/Library/Logs/` and contain messages only, never secret values.
