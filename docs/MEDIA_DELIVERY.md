# Media delivery

How the course videos, slides and labs reach the learner.

## The problem in one line

The video library is 2.4 GB. A Windows installer cannot go over 2 GB, and a web
build that size is not worth shipping either. So videos stream from a public
bucket, and only the small files travel with the app.

| Content | Size | Ships inside the app | Streams |
| --- | --- | --- | --- |
| Videos For A+ (22 clips) | 2.4 GB | no | yes, by default |
| PowerPoint for A+ (22 decks) | 56 MB | yes | no |
| Labs for A+ (36 items) | 3 MB | yes | no |

On desktop the learner can pull the videos down once as an offline pack. On the
web build there is no pack, only streaming.

## The resolver

`js/media-resolver.js` publishes `window.APlus.media`. Every media URL the
course library puts on the page goes through `APlus.media.resolve(rel)`.

`rel` is the catalog path from `curriculum_data.js`, for example
`media/videos/pd_bios_uefi.mp4`.

Order, highest priority first:

1. **Local offline pack.** Desktop only. Asks
   `electronAPI.media.resolve(rel)` and uses the returned `url` when `ok` is
   true. Cached per path for the session, cleared when the pack changes.
2. **Bundled relative path.** Only for slides and labs, since those are the
   only files that really ship. Checked once with a `HEAD` request and cached.
   Videos skip this step entirely, so a stale local copy never masks the
   streaming path.
3. **Remote base.** `remoteBase` plus the URL encoded relative path.
4. **Nothing.** `resolve` gives back `null`, the `src` is removed, and the
   player area shows: "This video is not available offline. Connect to the
   internet or download the course pack."

`resolveOrder(rel, ctx)` is the pure version of that decision, with no IO and
no globals. It is what `tools/test_media_resolver.js` exercises.

### URL joining

`remoteBase` normally ends in `/media/` while catalog paths start with
`media/`. `joinBase` drops the repeated segment once, so
`https://host/media/` plus `media/videos/x.mp4` becomes
`https://host/media/videos/x.mp4`, not `.../media/media/videos/x.mp4`. A base
that does not share a segment keeps the whole relative path.

Each path segment is passed through `encodeURIComponent`, so
`Videos For A+/clip.mp4` becomes `Videos%20For%20A%2B/clip.mp4`. The `+` must
be escaped or S3 style backends read it as a space.

### Where remoteBase comes from

1. `electronAPI.app.getReleaseInfo().mediaBaseUrl` on desktop, when the release
   engineer's bridge is present. This overwrites the constant at runtime.
2. Otherwise the `remoteBase` constant in `js/media-config.js`.
3. Otherwise empty, which means relative paths and, for videos, the
   unavailable message.

### How the rewriting happens

The course library renderer lives in `js/curriculum.js`, owned by another
workstream, so nothing here edits it. Instead a `MutationObserver` watches
`#curriculumViewer` and `#curriculumModal`. When a `video`, `source`, `audio`
or `a[download]` node appears, its `src`, `poster` or `href` is decoded back
to a catalog path, resolved, and written back.

The rewrite is idempotent. A handled node carries `data-media-resolved="1"`
and remembers its original path in `data-media-rel`, so repeated renders,
tab switches and re-observations never double encode a URL.

### Script tags

The shell engineer adds these to `index.html`, right after
`<script src="js/shell-ux.js"></script>`:

```html
<script src="js/media-config.js"></script>
<script src="js/media-resolver.js"></script>
```

Order matters: the config must be defined before the resolver reads it.

## The offline pack, desktop only

The More drawer gets a "Course videos" row inside the Data group. It shows
either "Streaming" or "Downloaded, 2.4 GB", with a "Download for offline use
(2.4 GB)" button and, once installed, "Remove download". A progress bar and a
note that closing the app cancels the download appear while it runs. If
`#moreMenu` is missing the panel is appended to `#syncRoot` or `body` instead.

`APlus.bus` gets a `media:packChanged` event whenever the pack status changes,
carrying `{ installed, bytes, path }`.

Contract with the release engineer, all consumed behind `typeof` guards:

```js
electronAPI.media.resolve(rel)        // -> { ok, url|null }
electronAPI.media.packStatus()        // -> { installed, bytes, path }
electronAPI.media.downloadPack({url}) // -> { ok, bytes, error }
electronAPI.media.onProgress(cb)      // cb({ received, total, percent })
electronAPI.media.removePack()
electronAPI.app.getReleaseInfo()      // -> { version, updateBaseUrl, mediaBaseUrl }
```

If any of it is missing the panel simply does not appear and streaming stays
the only route. Nothing throws.

## Building the pack

```
python tools/build_media_pack.py
python tools/build_media_pack.py --limit 3        # quick smoke run
```

Output lands in `release/media/`:

- `CompTIA_A_Plus_Course_Videos_v1.zip`
- `CompTIA_A_Plus_Course_Videos_v1.zip.sha256`
- `manifest.json` with `{path, bytes, sha256}` per file
- `upload_instructions.txt`

Notes on the tool:

- Store compression, no deflate. H.264 does not compress, so deflate would
  burn CPU for nothing.
- Files are streamed in 1 MB blocks and hashed as they are copied, so the
  2.4 GB never sits in memory.
- Deterministic: entries are sorted by archive path and stamped with a fixed
  timestamp, so two runs over the same source give the same bytes.
- `allowZip64` is on, which the 2.4 GB total needs.
- `Videos For A+` stores each clip inside a folder of the same name
  (`pd_bios_uefi.mp4/pd_bios_uefi.mp4`). The tool flattens that so archive
  paths read `media/videos/pd_bios_uefi.mp4`, matching `media_path` in
  `curriculum_data.js`. Pass `--no-flatten` to keep the layout on disk.
- `packName` is read out of `js/media-config.js` so the two cannot drift.
- `mediaBaseUrl` is read out of `release.config.json` when present.

## Uploading to Cloudflare R2

The videos sit in a public R2 bucket served from the same host as the app, at
`/media/`. Same host means no cross origin preflight for the app itself, which
is the simplest arrangement.

### 1. Create the bucket

```
wrangler r2 bucket create comptia-aplus-media
```

### 2. Upload

```
wrangler r2 object put comptia-aplus-media/videos/pd_bios_uefi.mp4 \
  --file "Videos For A+/pd_bios_uefi.mp4/pd_bios_uefi.mp4" \
  --content-type video/mp4
```

For the whole folder use `rclone` with an S3 remote pointed at the R2 endpoint,
which is far quicker than 22 separate wrangler calls:

```
rclone copy "Videos For A+" r2:comptia-aplus-media/videos \
  --s3-no-check-bucket --transfers 4
```

Upload the pack and its checksum next to the videos:

```
wrangler r2 object put comptia-aplus-media/CompTIA_A_Plus_Course_Videos_v1.zip \
  --file release/media/CompTIA_A_Plus_Course_Videos_v1.zip \
  --content-type application/zip
```

### 3. Put it behind the app host

Bind the bucket to the Pages project so it answers at `/media/`, or attach a
custom domain to the bucket. Either way the final layout must be:

```
https://<host>/media/videos/<clip>.mp4
https://<host>/media/CompTIA_A_Plus_Course_Videos_v1.zip
https://<host>/media/CompTIA_A_Plus_Course_Videos_v1.zip.sha256
https://<host>/media/manifest.json
```

Then set `mediaBaseUrl` in `release.config.json` to
`https://<host>/media/`.

### 4. Headers for range requests

A `<video>` element seeks by asking for byte ranges. R2 answers ranges out of
the box, but the headers have to survive whatever sits in front of it. Set
these on `/media/*`:

```
Accept-Ranges: bytes
Cache-Control: public, max-age=31536000, immutable
Content-Type: video/mp4
```

If the media host is ever a different origin from the app, add:

```
Access-Control-Allow-Origin: https://<app host>
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Range
Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges
```

`Access-Control-Expose-Headers` is the one people forget. Without
`Content-Range` exposed the browser can fetch the bytes but cannot build a
seekable timeline, and scrubbing quietly stops working.

Two more things worth checking:

- Do not put `Access-Control-Allow-Origin: *` on a bucket you also serve the
  zip from if you care about hotlinking. Name the app host.
- `immutable` caching is safe only because the file names carry `_v1`. Bump
  the name, not the contents, when a clip is re-cut.

### Cost on the R2 free tier

R2's headline feature is zero egress fees, which is the whole reason to use it
for 2.4 GB of video.

| Item | Free allowance per month | This project | Cost |
| --- | --- | --- | --- |
| Storage | 10 GB | 2.4 GB videos plus 2.4 GB pack, 4.8 GB total | 0 |
| Class A operations (writes) | 1,000,000 | about 50 per release upload | 0 |
| Class B operations (reads) | 10,000,000 | one range request set per play | 0 |
| Egress | unmetered, no charge | any amount | 0 |

So the steady state is zero, with roughly half the storage allowance spare.

If you keep only the videos and drop the pack from the bucket, storage falls to
2.4 GB. If both stay and a second version lands, 4 versions would cross 10 GB
and storage bills at 0.015 USD per GB per month above the free tier, so about
0.03 USD a month at 12 GB. Class B operations are the only figure that scales
with learners: a video seek is a handful of requests, so 10 million a month
covers a very large audience before anything is charged.

Compare with a plain object store that charges egress: 2.4 GB per full course
download at roughly 0.09 USD per GB is about 0.22 USD per learner who watches
everything. A thousand such learners would be around 216 USD a month. That gap
is why the videos live on R2.

## The web build

`tools/build_web_dist.py`, owned by the PWA engineer, never copies
`media/videos` unless `INCLUDE_CURRICULUM_VIDEOS=1` is set. That is correct and
should stay that way.

Because the web build has no local videos at all, `remoteBase` has to be set or
every clip shows the unavailable message. Two ways:

1. Serve the app and the media from the same host and set `remoteBase` to
   `/media/`. Relative, no CORS, works on preview deployments too.
2. Set the full URL in `js/media-config.js` before running the web build.

Slides and labs are copied into the web build, so step 2 of the resolver finds
them and no network call is needed for those.

## Checking it works

```
node tools/test_media_resolver.js          # resolver unit tests
python tools/build_media_pack.py --limit 3 # pack tool smoke run
```

By hand: serve the project root, open the course library, pick a video, and
confirm in the network panel that the request goes to the remote base and
comes back `206 Partial Content`. A `200` for the whole file means range
requests are not being honoured and seeking will be broken.
