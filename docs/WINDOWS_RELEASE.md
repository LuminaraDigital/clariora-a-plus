# Windows release

## release.config.json is the single source of release truth

`release.config.json` at the repository root holds the version and every public
URL. It is the only place any of them are set:

```json
{
  "version": "3.1.0",
  "productName": "CompTIA A+ Master",
  "publisher": "Datacentre Academy",
  "updateBaseUrl": "https://comptia-a-plus-master.pages.dev/releases/",
  "mediaBaseUrl": "https://comptia-a-plus-master.pages.dev/media/",
  "mediaPackName": "CompTIA_A_Plus_Course_Videos_v1.zip"
}
```

`tools/build_windows_installer.py` reads it before every build and writes:

- `version` into the root `package.json`
- `version` into `resources/app/package.json`
- `updateBaseUrl` into `build.publish[0].url` in `resources/app/package.json`

So the update URL is changed here, never in `package.json` and never in the code.
The build refuses to start if the file is missing, if a field is empty, or if
either URL is not an https address ending in a slash.

At runtime `main.js` reads the same file from the app path and hands the renderer
`{version, updateBaseUrl, mediaBaseUrl}` through
`electronAPI.app.getReleaseInfo()`. The auto-updater calls `setFeedURL` with the
same value, so `app-update.yml` and the config can never drift apart.

The version itself is never typed into code. `APP_VERSION` in `main.js` reads
`package.json`, and the sandboxed preload asks main for it over
`app:versionSync`, so `electronAPI.appVersion` always matches the build.

## Canonical ship artifacts

- `release/CompTIA_A_Plus_Setup_<version>.exe` (NSIS one-click installer, x64)
- `release/CompTIA_A_Plus_Portable_<version>.exe` (single-file portable, x64)
- `release/portable/` (unpacked portable folder, produced with `--portable`)
- `release/latest.yml` (auto-update metadata, must be uploaded next to the installer)

Build:

```bat
python tools/release_gate.py
python tools/build_bank.py
python tools/validate_bank.py
python tools/build_windows_installer.py --portable
node tools/smoke_electron.js
```

Or: `Package_Desktop_App.bat`, which runs the release gate first and aborts the
whole build if any gate check fails.

For a step by step version a non-engineer can follow, see
`docs/RELEASE_CHECKLIST.md`.

## The release gate

`python tools/release_gate.py` is the one command that must pass before any
release. It:

- runs `node --check` on every script `index.html` loads, plus `main.js`,
  `preload.js` and `sw.js`
- runs every `tools/test_*.js` and `tools/verify_*.js`
- runs `python tools/validate_bank.py`
- scans `index.html`, `css/*.css`, `js/*.js`, the root `*.js` files, `sw.js` and
  `docs/*.md` for em dashes and emoji, and fails on any hit
  (`curriculum_data.js` belongs to another workstream and only produces warnings)
- asserts the first-run intro gate key `aplus3_boot_intro_seen_v1` still exists
- asserts `resources/app/package.json` still excludes the video folders
- asserts `release.config.json` and both `package.json` versions agree
- asserts no file in `dist_web` is over the 25 MB Cloudflare Pages limit

It prints a summary table and exits non-zero if anything fails. Warnings never
fail the build.

## Installer size discipline

Course videos are never installed. `resources/app/package.json` excludes
`Videos For A+/**`, `media/videos/**`, `media/slides/**` and every `.mp4`, `.mkv`
and `.mov` file, and the build measures the packaged input before electron-builder
runs. It refuses to build when the asar input is over 400 MB, or when any single
folder is over 100 MB, and prints the offending folders with their sizes.

Video content ships through the downloadable media pack instead. See the media
delivery section below.

## Desktop smoke test

`node tools/smoke_electron.js` launches `release/portable/CompTIA_A_Plus_Simulator.exe`
(or a path given as the first argument) with `--remote-debugging-port=9555` and a
throwaway user data directory, drives it over the Chrome DevTools Protocol, and
asserts:

- the window loads the app within 8 seconds
- zero console errors and zero exceptions in the first 5 seconds
- `window.electronAPI.isDesktopApp` is true
- `electronAPI.app.getReleaseInfo()` returns the version
- `startExam('core1',5,5)` followed by `finishExam()` works
- the learner database exists, is under 2 MB, parses, and has no
  `comptia_database_master_v3` key, so the self-nesting bug cannot come back
- on a second launch the boot intro does not replay

It writes a screenshot to the scratchpad `smoke/desktop_home.png` and kills the
process at the end. It needs a real Windows desktop session: with no display,
Electron publishes no debugging target and the script says so and exits 1.

## Media delivery

Course video packs are downloaded on demand into `userData/media`, never shipped
in the installer. The renderer contract, all of it exposed on
`window.electronAPI.media`:

| Call | Returns |
| --- | --- |
| `resolve(relPath)` | `{ok, url}` where `url` is a `file://` URL if the file exists under the app path or under `userData/media`, else `null` |
| `packStatus()` | `{installed, bytes, path}` |
| `downloadPack({url})` | downloads, verifies, extracts, returns `{ok, bytes}` or `{ok: false, error}` |
| `removePack()` | deletes `userData/media`, returns `{ok}` |
| `onProgress(cb)` | subscribes to `media:progress` `{received, total, percent}`, returns an unsubscribe function |

`downloadPack` defaults to `mediaBaseUrl` plus `mediaPackName`. A `url` may be
passed instead, but it must be https and on the same host as `mediaBaseUrl` or
the call is rejected. Before anything is written the app fetches `<pack>.sha256`
from the same base and compares it against the SHA-256 of the downloaded bytes.
If the sidecar is missing or unreadable the download fails closed with
`checksum_unavailable` and nothing is installed. Extraction uses `adm-zip`
(chosen over `yauzl` because it has zero transitive dependencies), which is a
production dependency in `resources/app` so it lands inside the asar. Every zip
entry name and every resolved path is normalized and confirmed to stay inside
the allowed root, so no archive can write outside `userData/media`.

The earlier packaging bug where a `node_modules` exclusion stripped
`electron-updater` is the reason `build.files` only excludes narrow paths inside
`node_modules` (`.bin`, `*.md`, test and example folders) and never whole
packages.

For the Apple desktop build, see `docs/MACOS_RELEASE.md` and
`Package_MacOS_App.sh` (must run on a Mac).

## Root is the single source of truth

`tools/build_windows_installer.py` copies the canonical root files into
`CompTIA_A_Plus_Desktop_App/resources/app/` before every build:

- `index.html` is copied twice, as `index.html` and as `A_Plus_Exam_Simulator.html`
  (the Electron window loads the second name, the browser fallback uses the first)
- `main.js`, `preload.js`
- every root data script and JSON file (`exam_data.js`, `study_library.js`,
  `objectives_data.js`, ledger, memory, readiness, profiles, tutor mode, and so on)
- `manifest.webmanifest`, `manifest.json`, `sw.js`
- `favicon.ico`, `favicon.png`, `icon.png`
- the `js/`, `css/`, `fonts/`, `notes/`, `CompTIA_A_Plus_Mastery/` and
  `CompTIA-A-Plus-Practice-Questions/` folders

PDF files, `node_modules`, `__pycache__` and any `groq-secrets.local.*` file are
skipped during that copy. Edit files at the repository root, never in
`resources/app`, with one exception: `resources/app/package.json` holds the
electron-builder configuration and is edited there.

## One-click installer behavior

The NSIS target is configured for the shortest possible path from download to
first question:

| Setting | Value | Effect |
| --- | --- | --- |
| `oneClick` | `true` | No wizard. Double-click, install, launch. |
| `perMachine` | `false` | Installs per user under `%LOCALAPPDATA%\Programs`. |
| `allowElevation` | `false` | No administrator prompt. |
| `createDesktopShortcut` | `true` | Desktop icon. |
| `createStartMenuShortcut` | `true` | Start menu entry. |
| `runAfterFinish` | `true` | The app opens as soon as the install finishes. |
| `deleteAppDataOnUninstall` | `false` | Uninstalling keeps learner progress. |

Because the install is per user and unelevated, a student on a locked-down
machine can still install it. The `portable` target is kept for USB and
no-install use; it stores its database beside the executable when a
`portable.txt` marker file sits next to the exe.

## Auto-update channel setup (generic provider on Cloudflare)

The Cloudflare Pages project is `comptia-a-plus-master` (see `wrangler.toml` and
`deploy_cloudflare.bat`), so the release host is
`https://comptia-a-plus-master.pages.dev/`.

`resources/app/package.json` declares:

```json
"publish": [
  { "provider": "generic", "url": "https://comptia-a-plus-master.pages.dev/releases/" }
]
```

Do not edit that value by hand. It is written from `updateBaseUrl` in
`release.config.json` on every build. `release.config.json` is the only place the
URL is changed. If the academy later moves to a custom domain, change it there
and rebuild.

Publishing a new version:

1. Raise `version` in `release.config.json`. The build stamps both `package.json`
   files for you.
2. Run `python tools/build_windows_installer.py --portable`.
3. Upload these files from `release/` to the release directory of the host:
   - `CompTIA_A_Plus_Setup_<version>.exe`
   - `latest.yml`
   - the blockmap file if electron-builder produced one
4. Keep older installers in place so learners on slow rollouts can still resolve
   a download.

On Cloudflare Pages: put the files in a `releases/` folder of the published
site output, so they resolve at `https://<your-domain>/releases/latest.yml`.
On Cloudflare R2: create a bucket, enable public access or a custom domain,
upload to a `releases/` prefix, and point the `url` at that public origin. Both
must serve plain static files over HTTPS with no redirect to an HTML page, or
the updater cannot parse `latest.yml`.

Runtime behavior in `main.js`:

- The updater only runs when `app.isPackaged` is true, so it never fires during
  development.
- It starts four seconds after the window is created, so startup is never
  blocked by the network.
- `autoDownload` and `autoInstallOnAppQuit` are both true, and it re-checks
  every six hours.
- Network failures are written to the log and otherwise ignored. No dialog is
  shown to the learner.
- When a build finishes downloading, main sends `update:ready` to the renderer.
  The UI can call `electronAPI.updates.installNow()` to restart into the new
  version, or do nothing and let it install on the next quit.

## Logs location

`%APPDATA%\CompTIA A+ Exam Simulator\logs\main.log`

Rotating: 1 MB cap, two files kept (`main.log` and `main.log.1`). The log
records startup, uncaught exceptions, unhandled promise rejections, renderer
crashes (`render-process-gone`), unresponsive renderers, and renderer console
errors. Nothing is sent over the network. Groq API keys and bearer tokens are
scrubbed before anything is written.

The renderer can append its own lines with `electronAPI.log(level, message)`.
The Help menu has an "Open log folder" item.

## Data location and backup file

Installed build:

```
%APPDATA%\CompTIA A+ Exam Simulator\memory\aplus_user_db.json
%APPDATA%\CompTIA A+ Exam Simulator\memory\aplus_user_db.backup.json
%APPDATA%\CompTIA A+ Exam Simulator\aplus_progress.json
%APPDATA%\CompTIA A+ Exam Simulator\aplus_progress.backup.json
%APPDATA%\CompTIA A+ Exam Simulator\window-state.json
```

Portable build (a `portable.txt` file next to the executable):

```
<exe folder>\data\aplus_user_db.json
<exe folder>\data\aplus_user_db.backup.json
```

Every write is atomic: the new content goes to a `.tmp` file, the current file
is copied to a single `.backup.json` generation, then the temp file is renamed
into place. A crash mid-write can therefore never leave a half-written database.
Progress writes are debounced by 250 ms so a burst of answers produces one file
write, and the pending write is flushed on quit.

The Help menu has an "Open data folder" item. To back up manually, copy the
whole `memory` folder. To restore, copy it back and restart.

## How the v3.0.0 storage bug was fixed

The 3.0.0 renderer saved the learner database by writing every key it could see
into the snapshot, including the master key that holds the serialized snapshot
itself. Each save therefore embedded the previous full database inside the new
one. The file roughly doubled on every save, so after a few dozen sessions it
grew into the hundreds of megabytes, saves became slow, and eventually the write
failed or the JSON could not be parsed back.

The fix lives in `main.js`:

- `repairSnapshot()` walks the nesting (up to 64 levels), takes the outermost
  value for each key because the outermost copy is the newest, drops the master
  key and anything that is not learner state, and returns a flat object.
- `loadDatabase()` runs that repair on read. If it unwrapped anything, it
  immediately rewrites the compact file so the bloated one is gone on first
  launch after the update.
- `writeDatabaseAtomic()` runs the same repair before every write, so the
  nesting cannot come back, and refuses any snapshot over 24 MB.
- Reads fall back to `aplus_user_db.backup.json` if the primary file is corrupt.

### What the repaired file looks like

A flat JSON object. Keys are learner state only (`comptia_*`, `aplus3_*`) and
their values are strings, plus a `_meta` object. A healthy file is well under
1 MB.

```json
{
  "comptia_exam_history": "[{\"id\":\"...\",\"score\":78}]",
  "comptia_missed_questions": "[\"c1_0142\",\"c2_0311\"]",
  "aplus3_srs_deck": "{\"cards\":[]}",
  "_meta": {
    "repairedNestedLevels": 7,
    "repairedAt": "2026-09-04T10:12:44.310Z"
  }
}
```

`repairedNestedLevels` records how many nested copies were unwrapped on the
learner's machine. It is written once, on the first launch that repairs the
file, and is useful when a student reports a slow or huge database.

## Signing

`tools/build_windows_installer.py` signs with:

1. `WIN_CSC_LINK` / `CSC_LINK` + `CSC_KEY_PASSWORD` if set (commercial OV/EV PFX), or
2. a local self-signed Code Signing PFX at `build/certs/datacentre-academy-codesign.pfx` (gitignored)

Self-signed Authenticode makes `Get-AuthenticodeSignature` report a signature
instead of `NotSigned`. Public SmartScreen reputation still requires a
commercial certificate and install volume. For external students, buy an OV/EV
code signing cert and set:

```powershell
$env:WIN_CSC_LINK = "C:\path\to\your.pfx"
$env:CSC_KEY_PASSWORD = "your-pfx-password"
python tools/build_windows_installer.py --skip-install --portable
```

## Commercial OV/EV signing

Self-signed Authenticode is academy and internal only. It proves a signature
exists for lab verification. It does not establish public publisher trust.

For external or commercial distribution you must purchase an OV or EV Windows
code signing certificate from a commercial CA, then point the build at that PFX
(or your CA's HSM or cloud signing path):

```powershell
$env:WIN_CSC_LINK = "C:\path\to\commercial-ov-or-ev.pfx"
$env:CSC_KEY_PASSWORD = "<pfx-password>"
python tools/build_windows_installer.py --skip-install --portable
```

`tools/build_windows_installer.py` prefers `WIN_CSC_LINK` / `CSC_LINK` +
`CSC_KEY_PASSWORD` when set. If those env vars are absent, the build falls back
to the local self-signed PFX under `build/certs/` (gitignored). Never market a
self-signed build as OV/EV-signed.

OV/EV purchase, SmartScreen reputation, update channel, content provenance,
privacy, and support and refund placeholders are tracked in
`docs/COMMERCIAL_TRUST.md`.

## Secrets

Never package `js/groq-secrets.local.js`. The app ships `js/groq-config.js` with
an empty key. Users enter a Groq key in the UI (stored in
`userData/aplus_progress.json`). The main process only ever calls
`https://api.groq.com`, and the key is stripped from anything written to the
log. If a previous portable zip or folder with a real key was shared, rotate
that key at https://console.groq.com/keys
