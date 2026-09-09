# Linux release

The Linux desktop edition ships as an AppImage (runs anywhere, self-updating)
and a `.deb` (Debian, Ubuntu, Mint; updated through the package manager). Both
are built from the repository root with the tracked `electron-builder.linux.json`
and need none of the Windows packaging folder.

## Where the builds come from

GitHub Actions builds them. Pushing a tag such as `v3.1.2` runs the
`linux-build` job, smoke tests the unpacked app under a virtual display, and
attaches these files to the GitHub release for that tag:

- `CompTIA_A_Plus_Linux_<version>_x86_64.AppImage`
- `CompTIA_A_Plus_Linux_<version>_amd64.deb`
- `latest-linux.yml` (tells AppImage installs that a new version exists)

A manual run from the Actions tab (`Run workflow`) produces the same files as a
downloadable artefact without touching a release.

## Building locally

On a Linux machine with Node 22 and Python 3:

```bash
npm install
python3 tools/build_linux_app.py
```

Output is in `release/linux/`. Add `--dir` for the unpacked folder only, which
is enough for the smoke test:

```bash
node tools/smoke_electron.js release/linux/linux-unpacked/comptia-a-plus-master
```

Linux packages cannot be built from Windows without Docker. Use CI instead.

## Installing

AppImage:

```bash
chmod +x CompTIA_A_Plus_Linux_3.1.2_x86_64.AppImage
./CompTIA_A_Plus_Linux_3.1.2_x86_64.AppImage
```

Some distributions need `libfuse2` for AppImage (`sudo apt install libfuse2`).

Debian and Ubuntu:

```bash
sudo apt install ./CompTIA_A_Plus_Linux_3.1.2_amd64.deb
comptia-a-plus-master
```

## Updates

The AppImage checks GitHub Releases on launch and every six hours. When a newer
version is found, the Software update card in More, About offers to download it
and then to restart into it, and it replaces itself in place. The `.deb` does
not self-update; the updater is skipped for it and a new `.deb` is installed the
same way as the first.

## Data location

The learner database, logs and downloaded media live under
`~/.config/Clariora/`. Removing that folder resets the app.

## Not signed

AppImage and `.deb` packages are distributed unsigned by convention. There is no
SmartScreen equivalent on Linux, so testers see no warning.
