# Release checklist

One page. Follow it top to bottom. Do not skip a step because the last release
was fine. If a step fails, stop and fix it before going further.

You need: Windows, Python 3, Node.js, and a Cloudflare account that can deploy
the `comptia-a-plus-master` Pages project.

---

## 1. Set the version and the URLs

Open `release.config.json` at the top of the project folder. This is the only
file where the version and the web addresses are set.

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

Raise `version` for every release. Use three numbers, such as `3.1.1`. The build
copies that number into both `package.json` files for you. Never edit a version
number anywhere else.

## 2. Run the release gate

```bat
python tools\release_gate.py
```

Read the summary table at the bottom. Every row must say PASS. Rows that say
WARN are fine. If any row says FAIL, stop: send the failing rows to the engineer
who owns those files. Do not build a release with a FAIL.

## 3. Build the installer

```bat
python tools\build_windows_installer.py --portable
```

This takes about three minutes. When it finishes, `release\` contains:

- `CompTIA_A_Plus_Setup_<version>.exe` (the installer students download)
- `CompTIA_A_Plus_Portable_<version>.exe` (single file, no install)
- `latest.yml` (tells installed copies that a new version exists)
- a `.blockmap` file if electron-builder made one
- `release\portable\` (the unpacked folder used by the smoke test)

Note the installer size printed at the end. If it jumped by more than about
20 MB since the last release, ask why before shipping.

## 4. Run the smoke test

```bat
node tools\smoke_electron.js
```

This opens the built app, runs a short exam, closes it, and opens it again. Every
line must say PASS. It needs a normal Windows desktop session, so run it on the
machine in front of you, not over a background service.

## 5. Upload the installer files

Put these four files into the `releases/` folder of the published site so they
resolve at `https://comptia-a-plus-master.pages.dev/releases/<filename>`:

1. `CompTIA_A_Plus_Setup_<version>.exe`
2. `latest.yml`
3. the `.blockmap` file, if there is one
4. `CompTIA_A_Plus_Portable_<version>.exe`

Leave the previous version's files in place. Do not delete old installers.

## 6. Upload the course video pack

Only needed when the videos changed. Build the pack:

```bat
python tools\build_media_pack.py
```

Upload both of its output files into the `media/` folder of the site:

1. `CompTIA_A_Plus_Course_Videos_v1.zip`
2. `CompTIA_A_Plus_Course_Videos_v1.zip.sha256`

The `.sha256` file is not optional. The app refuses to install a pack it cannot
check, so a missing checksum file silently breaks video downloads for everyone.
The name of the zip must match `mediaPackName` in `release.config.json` exactly.

## 7. Deploy the web version

```bat
deploy_cloudflare.bat
```

Choose option 1. When it finishes, open
`https://comptia-a-plus-master.pages.dev/` and confirm the site loads and a
practice question appears.

Then check the release files are reachable. In a browser, open:

- `https://comptia-a-plus-master.pages.dev/releases/latest.yml`

It must show plain text starting with `version:`. If you see the website instead,
the file was not uploaded to the right folder and auto-update will not work.

## 8. Verify auto-update from the previous version

Do this on a spare machine or a fresh Windows user account.

1. Install the **previous** version's setup file.
2. Open the app. Leave it open for about five minutes.
3. Close it, then open it again.
4. Open Help, then About this app. The version shown must now be the new one.

If it does not update, open the log folder from the Help menu and read
`main.log`. Lines containing `updater` say what went wrong. The usual cause is a
`latest.yml` that was not uploaded, or that is served as a web page instead of a
plain file.

## 9. Check the SmartScreen state

Download the new installer with a browser on a machine that has never seen it.

- Expected today: Windows shows a blue "Windows protected your PC" box, and the
  learner must click More info, then Run anyway. This is normal for a build
  signed with the in-house certificate.
- Not expected: a red warning, or the file being deleted automatically. If you
  see that, stop distributing and tell the engineering team.

To remove the blue box permanently the academy must buy a commercial OV or EV
code signing certificate. See `docs/COMMERCIAL_TRUST.md`.

## 10. Announce

Share only the link to the installer in the `releases/` folder. Never share a
file straight from the `release\` folder on the build machine.

---

## Rollback

If the new version is broken:

1. Delete the new `latest.yml` from the `releases/` folder and upload the
   previous version's `latest.yml` in its place. Installed copies stop offering
   the broken build within six hours.
2. Leave the broken installer file in place if anyone already downloaded it, or
   remove it if nobody has. Removing it does not uninstall it from any machine.
3. Point the download link on the site back at the previous installer.
4. Fix the problem, raise the version number in `release.config.json` again, and
   run this checklist from step 1. Never re-publish a fixed build under a version
   number that was already released.

Learner progress is never lost by a rollback. The database lives in
`%APPDATA%\CompTIA A+ Exam Simulator\memory\` and uninstalling does not delete it.

If a learner reports a broken app after an update, tell them to uninstall,
install the previous version from the site, and reopen it. Their progress will
still be there.

## 8. Linux packages

Push the release tag and GitHub Actions builds the AppImage and `.deb`,
smoke tests them and attaches them to the release:

```bash
git tag -a v<version> -m "CompTIA A+ Master <version>"
git push origin v<version>
```

Check the `linux-build` job is green in the Actions tab and that the two Linux
files and `latest-linux.yml` appear on the release page. Details are in
`docs/LINUX_RELEASE.md`.

## 9. Confirm the update reaches installed copies

Installed copies read GitHub Releases, so once the tag is pushed and the
release has its assets, an installed app finds the new version on its next
check. To verify without waiting:

1. Open the app, go to More, About, and press **Check for updates**.
2. The card should show the new version and a **Download update** button.
3. Download it and press **Restart and update**. The app closes, installs and
   reopens on the new version.

If the card says the check did not finish, confirm the release is published
rather than a draft and that `latest.yml` (Windows), `latest-mac.yml` and
`latest-linux.yml` are attached to it.

Versions 3.1.1 and earlier point at the old Cloudflare URL and cannot update
themselves. Those installs need the new build once, by hand.
