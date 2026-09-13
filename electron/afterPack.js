'use strict';
// Ad-hoc code signing for the macOS build.
//
// Without this the app is shareable only by accident. electron-builder skips
// signing entirely when there's no Developer ID in the keychain, which leaves
// the bundle carrying nothing but the linker's own ad-hoc signature on the
// main Electron binary — a signature that declares sealed resources while the
// bundle has none. codesign calls that "code has no resources but signature
// indicates they must be present": not untrusted, *invalid*.
//
// It runs fine on the machine that built it, because a locally-produced file
// never gets a com.apple.quarantine attribute and Gatekeeper only evaluates
// quarantined ones. Copy it to another Mac and quarantine attaches, the
// signature is finally checked, and macOS reports "the application is damaged
// and can't be opened" — which, unlike the ordinary unidentified-developer
// warning, has no right-click-to-Open escape hatch.
//
// Signing the whole bundle ad-hoc makes the seal valid. The app still isn't
// notarized, so a quarantined copy still gets stopped, but it downgrades to
// the normal "unidentified developer" prompt that the user can approve via
// right-click -> Open, or Privacy & Security -> Open Anyway. A Developer ID
// certificate plus notarization is the only way to remove the prompt outright.
//
// --deep is deprecated for distribution signing (Apple wants inside-out,
// leaf-first signing) but is the pragmatic tool for a blanket ad-hoc pass over
// the Electron framework and its helpers, and the verify below is what
// actually gates the build.
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log('  • ad-hoc signing      ' + appPath);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });

  // Fail the build rather than ship another "damaged" dmg: this is exactly the
  // check that was failing before, so it's the one worth asserting.
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });
  console.log('  • ad-hoc signature verified');
};
