# Cloudflare Pages Deployment Guide

This app deploys as a static site on Cloudflare Pages. The desktop `.exe`
remains available as the offline option; the web build is the main product.

## 1. Build

The web app only needs a subset of this repository: `index.html`, the
scripts/styles/images it references, `js/**`, `css/**`, `fonts/**`,
`icons/**`, `manifest.webmanifest`, `sw.js`, the favicons, `_headers`,
and `_redirects`. Everything else (PDFs, course content folders, the
desktop installer, `tools/`, `_bank/`, `_backup/`, `release/`, Python
source) is left out.

Course media (module slides, labs, the brand intro video/poster) ships
only for the specific files actually referenced at runtime - the build
script scans `index.html` and `curriculum_data.js` for `media/...`
paths and copies just those. `media/videos` ("Videos For A+", ~2.4 GB)
is **never** shipped to the web build, even if referenced - large
lecture videos stay desktop-only or behind a remote `mediaBaseUrl`.

Build the distributable folder:

```
python tools\build_web_dist.py
```

This produces `dist_web/`, and also:

- Writes `dist_web/precache-manifest.json` (every shipped app-shell
  file with a sha1 content hash). Course media and anything over 3 MB
  is excluded from the manifest - it is fetched on demand instead, so
  the offline shell stays well under the 12 MB budget.
- Injects a `BUILD_ID` (version from `release.config.json`, falling
  back to `package.json`, plus a short hash of the manifest) into the
  copied `sw.js` so the service worker cache name changes on every
  build.
- Fails the build (non-zero exit code) if `index.html`/`curriculum_data.js`
  reference a file that does not exist on disk, if any emitted file
  exceeds the 25 MB Cloudflare Pages per-file limit, or if the precache
  total exceeds 12 MB. A referenced media file over 25 MB is skipped
  and listed instead of failing the build.

The script prints a size table (app shell vs. course media vs. total
vs. precache) when it finishes.

After building, verify the output:

```
node tools\test_web_dist.js
```

This asserts every `index.html` reference resolves, every
precache-manifest entry exists and is under 3 MB, the precache total is
under 12 MB, no shipped file exceeds 25 MB, `sw.js` carries a real
`BUILD_ID` and the first-install guard, and `_headers` has the
`/media/*` section. `deploy_cloudflare.bat` runs this automatically
before deploying.

## 2. Deploy

Run `deploy_cloudflare.bat` and choose option **[1] Build web dist and
deploy to Cloudflare Pages**. It runs `tools/release_gate.py` (if
present), the build above, `tools/test_web_dist.js`, and then:

```
npx wrangler pages deploy dist_web --project-name comptia-a-plus-master
```

The project name and `pages_build_output_dir = "dist_web"` also live in
`wrangler.toml` at the repo root, so `npx wrangler pages deploy` works
without repeating `--project-name` once you are inside this folder.

If Wrangler is not installed, install it once with:

```
npm i -g wrangler
```

Log in once with:

```
npx wrangler login
```

This opens a browser window to authorize a free Cloudflare account (no
credit card required). After that, deploys are one command / one menu
choice.

Your permanent URL is:

```
https://comptia-a-plus-master.pages.dev
```

## 3. Custom domain (optional)

In the Cloudflare dashboard, open the Pages project, go to **Custom
domains**, and add your domain. Cloudflare issues and renews the TLS
certificate automatically. No changes to this repo are needed - the app
uses relative paths throughout (`start_url`/`scope` of `./` in
`manifest.webmanifest`, relative `src=`/`href=` everywhere in
`index.html`), so it works the same on `*.pages.dev`, a custom domain,
or a subpath deployment.

## 4. How updates reach users

Every deploy produces a new `BUILD_ID`, which changes the service
worker's cache name (`comptia-a-plus-<BUILD_ID>`). When a user who
already has the app open gets a new version:

1. The browser detects the new `sw.js` (it is served with
   `Cache-Control: no-cache`, see `_headers`) and installs it in the
   background.
2. Once installed, the new worker's `activate` handler deletes old
   caches and messages every open tab: `{ type: 'pwa:update-available' }`.
3. `js/pwa-update.js` (loaded by `index.html`) shows a small toast at
   the bottom of the screen: "A new version is ready." with **Reload**
   and **Later** buttons. Reload tells the waiting worker to
   `SKIP_WAITING` and takes control, then reloads the page.
4. If the user does nothing, the new version takes over automatically
   the next time they fully close and reopen the app (normal service
   worker lifecycle).

The desktop app has its own update path (electron-updater); when
`window.electronAPI.updates.onReady` fires, `js/pwa-update.js` shows the
same toast with a **Restart to update** button.

## 5. Verifying offline support

1. Build and serve `dist_web/` locally:
   ```
   python tools\build_web_dist.py
   cd dist_web
   python -m http.server 8787
   ```
2. Open `http://127.0.0.1:8787/index.html` in Chrome or Edge.
3. Open DevTools -> Application -> Service Workers and confirm a
   worker is **activated and running** with no errors in the Console.
4. Check DevTools -> Application -> Cache Storage - a cache named
   `comptia-a-plus-<BUILD_ID>` should list the precached files.
5. In DevTools -> Network, tick **Offline** (or stop the local server
   entirely), then reload the page. The app shell, exam bank, and study
   library should still load from cache.
6. Untick Offline / restart the server to go back to normal testing.

## 6. Publishing desktop release files for auto-update

The desktop build uses `electron-updater` with the **generic** provider.
To publish a new desktop release alongside the web app:

1. Build the Windows installer (see `Package_Desktop_App.bat` /
   `create_desktop_dist.py`).
2. Create a `/releases/` folder at the root of this repo (it is
   excluded from `dist_web` by `tools/build_web_dist.py`, so it never
   ships to the web bundle) and put the generated `latest.yml` and the
   installer `.exe` in it.
3. Deploy normally - Cloudflare Pages will serve `/releases/latest.yml`
   and `/releases/*.exe` as static files at
   `https://comptia-a-plus-master.pages.dev/releases/...`.
4. Point the desktop app's `electron-updater` feed URL (generic
   provider) at that `/releases/` path.
5. Each new desktop release: rebuild, regenerate `latest.yml`, replace
   the files in `/releases/`, redeploy.

Note: `/releases/` is a separate concern from the PWA - the web app
itself does not read or need it. Keep installer binaries out of
`dist_web` (the build script already excludes `.exe` files) so the PWA
stays small and installs quickly.

## 7. Size budget

Target: **under 12 MB precached** (the app shell, exam bank, and study
library scripts), excluding course media (slides/labs/brand video),
which is fetched on demand instead of precached. `tools/build_web_dist.py`
prints a size table on every build and fails outright if the precache
total goes over budget or any shipped file exceeds the 25 MB Cloudflare
Pages per-file limit - watch that output and keep it under budget so
the service worker can precache the whole app shell on first load, even
on a slow connection.

As of this build, the precached app shell is a few megabytes
(`exam_data.js` and `study_library.js` are the largest precached files,
each a little over 1 MB uncompressed); course media adds tens of
megabytes on top but is excluded from precache and streamed/downloaded
on demand instead. If a future course folder grows large enough that
all of it needs to be fetched at runtime by the app, use `study_assets/`
at the repo root (already whitelisted in the build script) rather than
inlining more content into `study_library.js`, and print a warning from
the build if it exceeds 50 MB.
