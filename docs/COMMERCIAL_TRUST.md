# Commercial trust checklist (Datacentre Academy)

This checklist is for shipping CompTIA A+ Master to external students with commercial-grade trust signals. Outcome evidence in the app is local learner metrics only. It does not replace code signing or SmartScreen reputation.

**Important:** OV/EV Authenticode certificates must be purchased from a commercial CA. This project does not and cannot fabricate EV signing. Self-signed builds are academy/internal only.

## 1. OV/EV code signing (`WIN_CSC_LINK`)

- [ ] Purchase an Organization Validation (OV) or Extended Validation (EV) Windows code signing certificate from a trusted CA.
- [ ] Export or provision the signing material as a PFX (or HSM/cloud signing workflow your CA supports).
- [ ] Set build-time environment variables before packaging:

```powershell
$env:WIN_CSC_LINK = "C:\path\to\commercial.pfx"
$env:CSC_KEY_PASSWORD = "<pfx-password>"
# Optional aliases also recognized by electron-builder:
# $env:CSC_LINK = $env:WIN_CSC_LINK
```

- [ ] Run `python tools/build_windows_installer.py` (or `Package_Desktop_App.bat`) and confirm `Get-AuthenticodeSignature` on the installer shows a trusted publisher chain (not self-signed).
- [ ] Store PFX passwords and cert files outside git. Never commit certs or passwords.
- [ ] Treat self-signed PFX under `build/certs/` as academy lab use only. Do not market self-signed builds as commercially signed.

See also: `docs/WINDOWS_RELEASE.md` (Commercial OV/EV signing).

### Cost and timing, stated plainly

- An OV code signing certificate costs roughly 200 to 400 USD per year from a
  commercial CA. EV is higher, commonly 300 to 600 USD per year, and usually
  requires a hardware token or a cloud HSM.
- Do not buy one yet. Buy it when web traffic proves demand: real download
  volume, real students asking for the installer, or a paid offer that is
  actually converting. Until then the self-signed build is enough for internal
  and classroom use.
- Even after buying, SmartScreen reputation takes weeks to accumulate. A brand
  new publisher identity still triggers warnings on early downloads. Budget for
  that gap rather than assuming the certificate removes the warning on day one.

## 2. SmartScreen reputation

- [ ] Ship only OV/EV-signed installers to public download channels.
- [ ] Prefer EV when budget allows (often reduces SmartScreen friction faster than OV alone).
- [ ] Plan for reputation warm-up: early downloads of a new publisher may still warn until Microsoft reputation accumulates.
- [ ] Keep publisher name stable across releases (Datacentre Academy / legal entity on the cert).
- [ ] Monitor false-positive reports; re-sign and republish if a build is flagged.

## 3. Update channel

- [ ] Publish installers from a single official URL or release page owned by Datacentre Academy.
- [ ] Document the current version and changelog for each release.
- [ ] Prefer HTTPS-only distribution. Avoid third-party mirrors without checksums.
- [ ] Publish SHA-256 (or stronger) hashes next to the installer download.
- [ ] Define how learners receive update notices (in-app note, email list, or portal). Placeholder: update channel policy TBD by Datacentre Academy ops.

### Auto-update channel (generic provider on Cloudflare)

The desktop build ships with `electron-updater` configured against a generic
static host:

```json
"publish": [
  { "provider": "generic", "url": "https://aplus.datacentre.academy/releases/" }
]
```

- TODO: that URL is a placeholder. Point it at the real Cloudflare Pages or R2
  release directory before the first public build.
- Upload `CompTIA_A_Plus_Setup_<version>.exe` and `latest.yml` together. The
  updater reads `latest.yml` to decide whether a newer build exists.
- The host must serve the files over HTTPS as plain static content. A redirect
  to an HTML page breaks the check silently.
- The updater downloads in the background, installs on quit, and never shows a
  dialog of its own. Network failures are logged locally and ignored.
- Setup steps and the exact upload list are in `docs/WINDOWS_RELEASE.md`
  (Auto-update channel setup).

## 3b. Installer and first-run behavior

- One-click NSIS installer: no wizard, no administrator prompt, per-user
  install under `%LOCALAPPDATA%\Programs`, desktop and Start menu shortcuts,
  launches on finish.
- Uninstalling keeps learner data (`deleteAppDataOnUninstall` is false), so a
  reinstall does not wipe progress.
- A portable build is kept for USB and locked-down machines.

## 3c. One-click install and first run

- [ ] Verify on a clean Windows PC that download, install, and first question
      take one double-click and no further choices.
- [ ] Verify the learner database and log folders are created on first launch
      with no prompt.
- [ ] Verify the window remembers its size and position between sessions.

## 4. Content provenance

- [ ] Build the question bank with `python tools/build_bank.py` and validate with `python tools/validate_bank.py` before every ship.
- [ ] Record bank version / app version (`3.0.0` and bank metadata) in release notes.
- [ ] Do not ship unsigned or ad-hoc edits to exam bank shards outside the controlled build pipeline.
- [ ] Keep curriculum notes and simulator assets under Datacentre Academy source control with reviewable diffs.

## 5. Privacy (local memory)

- [ ] Confirm exam history, missed drills, SRS decks, and profiles remain on-device (local storage / Electron `userData`).
- [ ] Confirm the Outcome evidence panel stores only an anonymized aggregate snapshot key `outcomes_snapshot` (counts, rates, scaled scores). No cloud sync of PII by default.
- [ ] Document backup/export as learner-controlled (export/import on the PC).
- [ ] Groq API keys (if used) stay local; never package secrets in the installer (`js/groq-secrets.local.js` must not ship).
- [ ] Privacy statement placeholder: Datacentre Academy does not require an account for core practice. Local memory stays on the learner PC unless the learner exports it.

### Where learner data and logs live

| What | Installed build | Portable build |
| --- | --- | --- |
| Learner database | `%APPDATA%\CompTIA A+ Exam Simulator\memory\aplus_user_db.json` | `<exe folder>\data\aplus_user_db.json` |
| One backup generation | the same path with `.backup.json` | the same path with `.backup.json` |
| Settings and progress | `%APPDATA%\CompTIA A+ Exam Simulator\aplus_progress.json` | same |
| Logs | `%APPDATA%\CompTIA A+ Exam Simulator\logs\main.log` | same |

- Writes are atomic (temp file, one backup copy, rename) so a crash cannot
  corrupt the database.
- The log is capped at 1 MB with two files kept, is never uploaded anywhere, and
  has API keys and bearer tokens scrubbed before writing.
- The Help menu exposes "Open data folder" and "Open log folder" so a student
  can find and copy their own files without instructions.

### v3.0.0 storage bug

The 3.0.0 build wrote the whole database inside itself on every save, so the
file doubled each time and eventually became unusable. The repair runs
automatically on first launch after updating: nested copies are unwrapped, the
newest value for each key is kept, non-learner keys are dropped, and the compact
file is rewritten in place. `_meta.repairedNestedLevels` in the repaired file
records how deep the nesting was. Details and a sample repaired file are in
`docs/WINDOWS_RELEASE.md`.

## 6. Refund and support placeholders

- [ ] Support contact (placeholder): `support@datacentre.academy` (confirm before public launch).
- [ ] Refund policy (placeholder): state eligibility window, proof of purchase, and exclusions (digital goods opened / exam-prep completed) before charging students.
- [ ] Escalation path (placeholder): academy admin -> product owner -> signing/ops owner for SmartScreen or installer issues.
- [ ] Include support and refund links on the official download / purchase page when commercial sales begin.

## Explicit non-claims

- Do not claim EV or OV signing exists until a purchased commercial certificate is used on the shipped installer.
- Do not claim Microsoft SmartScreen "trusted" status until observed on real Windows clients.
- Do not present local outcome evidence as an official CompTIA or Pearson VUE result.
