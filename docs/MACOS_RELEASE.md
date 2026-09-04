# macOS desktop release

CompTIA A+ Master ships as a native-feeling Electron app on Apple desktop.
This is the same product as Windows, not a separate codebase.

## Use on a Mac today (no .dmg required)

Until a signed Mac desktop build is published, Mac users should use the **web app**:

1. Open the HTTPS site URL in Safari or Chrome on Mac.
2. Optional app-like shortcut:
   - **Safari:** File > Add to Dock
   - **Chrome:** Install icon in the address bar, or Chrome menu > Save and share > Install page as app
3. Progress stays on that Mac (local storage / IndexedDB). Offline works after the first load via the service worker.

This is the supported Mac path right now. The native `.dmg` path is documented below for when you build on a Mac.

## Requirement

macOS packaging **must run on a Mac**. This Windows PC can prepare icons and
config, but it cannot produce a signed `.app` / `.dmg`.

You need:

- macOS 13+ (Ventura or newer recommended)
- Node.js 20+ and npm
- Python 3.10+ with Pillow (`pip3 install pillow`)
- Xcode Command Line Tools (`xcode-select --install`)
- Optional for distribution: Apple Developer ID Application certificate

## Build (on a Mac)

From the repo root:

```bash
python3 tools/make_macos_icon.py
python3 tools/build_macos_app.py
```

Or unsigned local testing:

```bash
python3 tools/build_macos_app.py --unsigned
```

Apple Silicon only:

```bash
python3 tools/build_macos_app.py --arm64-only
```

Ship artifacts land in:

```text
release/CompTIA_A_Plus_Mac_<version>_arm64.dmg
release/CompTIA_A_Plus_Mac_<version>_x64.dmg
release/CompTIA_A_Plus_Mac_<version>_arm64.zip
release/CompTIA_A_Plus_Mac_<version>_x64.zip
```

There is also `Package_MacOS_App.sh` as a one-shot wrapper.

## What the build does

1. Syncs canonical root sources into `CompTIA_A_Plus_Desktop_App/resources/app/`
2. Builds `build/icon.icns` from the black-and-gold master art
3. Runs electron-builder with `dmg` + `zip` for x64 and arm64
4. Copies artifacts to `release/`

## Signing and notarization

For classmates on your LAN, `--unsigned` is fine (Gatekeeper will warn once).

For public download:

1. Install a **Developer ID Application** cert in Keychain Access
2. Build without `--unsigned` so electron-builder picks up the identity
3. Notarize (Apple requires this for clean Gatekeeper on modern macOS):

```bash
xcrun notarytool submit release/CompTIA_A_Plus_Mac_3.0.0_arm64.dmg \
  --apple-id "YOUR_APPLE_ID" \
  --team-id "YOUR_TEAM_ID" \
  --password "app-specific-password" \
  --wait
xcrun stapler staple release/CompTIA_A_Plus_Mac_3.0.0_arm64.dmg
```

Set `CSC_NAME` if you have more than one signing identity:

```bash
export CSC_NAME="Developer ID Application: Datacentre Academy (TEAMID)"
python3 tools/build_macos_app.py
```

## Auto-update

The Mac build uses the same generic update feed as Windows:

`https://aplus.datacentre.academy/releases/`

Upload the `.dmg` / `.zip` and electron-builder `latest-mac.yml` next to the
Windows artifacts when you publish a release.

## Smoke test checklist

- [ ] App opens and shows the home dashboard
- [ ] Dock icon is the A+ mark
- [ ] Menu bar has Exam / Study / View / Help (plus the app menu on macOS)
- [ ] Cmd+Q quits; closing the window leaves the app in the Dock (normal macOS)
- [ ] Clicking the Dock icon reopens a window
- [ ] Start a short Core 1 drill and answer one question
- [ ] Progress survives quit and relaunch
