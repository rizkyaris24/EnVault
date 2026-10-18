// Flips Electron fuses on the packaged binary (before signing) so the shipped app cannot be abused as a Node runtime.
const path = require('path')
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const name = context.packager.appInfo.productFilename
  const binary = path.join(context.appOutDir, `${name}.app`, 'Contents', 'MacOS', name)

  await flipFuses(binary, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: true, // arm64 binaries must be re-signed after patching; electron-builder signs afterwards
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true
  })
  console.log(`  - fuses flipped on ${name}`)
}
