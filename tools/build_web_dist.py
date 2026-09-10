#!/usr/bin/env python3
"""
build_web_dist.py - Build the static web distribution for Cloudflare Pages.

Produces dist_web/ containing only what the web app (index.html) needs:
index.html, every script/link/img it references (query strings such as
?v=4.2.9 are stripped when resolving the file on disk, but left untouched
in the copied index.html), js/**, css/**, fonts/**, icons/**,
manifest.webmanifest, sw.js, favicon.ico, favicon.png, icon.png, _headers,
_redirects.

Course media (media/brand, media/labs, media/slides - "PowerPoint for A+"
and "Labs for A+" in their original folders) is included ONLY for the
specific files actually referenced at runtime, discovered by scanning
index.html and curriculum_data.js for "media/..." paths (the app fetches
files via curriculum item "media_path", never via the original folder
names - those only appear as descriptive "source" text and are never
requested by the browser, so the original "PowerPoint for A+" / "Labs for
A+" folders are not copied). media/videos ("Videos For A+", ~2.4 GB) is
NEVER included, even if referenced - the app degrades gracefully and
points users at the desktop app or full project folder for video.

Referenced media files over 25 MB (the Cloudflare Pages per-file limit)
are skipped and listed, not failed - everything else is a hard failure:
any index.html/js reference (other than media) that is missing, or any
emitted file over 25 MB.

precache-manifest.json (consumed by sw.js) lists every emitted file with
a sha1 revision EXCEPT: _headers/_redirects (Pages config, never fetched
by the browser), anything under media/ (course media is fetched on
demand, not part of the offline app shell), and any single file over
3 MB - keeping the offline shell comfortably under the 12 MB budget.

BUILD_ID (version from release.config.json, falling back to
package.json, plus a short content hash of the manifest) is injected
into the copied sw.js.

Excluded on purpose: PDFs, course content folders, the desktop exe/installer,
tools/, _bank/, _backup/, release/, node_modules/, *.py files, and notes/
(the Study Library embeds its content directly in study_library.js /
exam_data.js at build time - nothing under notes/ is fetched by the running
web app, so it does not need to ship).

Run: python tools/build_web_dist.py
"""
import hashlib
import json
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist_web"
INDEX = ROOT / "index.html"
CURRICULUM_DATA = ROOT / "curriculum_data.js"

MAX_FILE_BYTES = 25 * 1024 * 1024        # Cloudflare Pages per-file limit
MAX_PRECACHE_ENTRY_BYTES = 3 * 1024 * 1024
MAX_PRECACHE_TOTAL_BYTES = 12 * 1024 * 1024

# Files copied verbatim into the dist root regardless of what index.html references.
ROOT_EXTRA_FILES = [
    "manifest.webmanifest",
    "sw.js",
    "favicon.ico",
    "favicon.png",
    "icon.png",
    "_headers",
    "_redirects",
    # Telegram Mini App / TON Connect files: must be served as real files, not the SPA fallback.
    "tonconnect-manifest.json",
    "privacy.html",
    "terms.html",
]

# Whole directories copied in full (minus excluded extensions/paths).
# landing/ is the marketing page. It ships with the site but is not part
# of the offline app shell, so it is copied and never precached.
DIRS_TO_COPY = ["js", "css", "fonts", "icons", "shards", "landing", "admin"]

EXCLUDED_EXTENSIONS = {".pdf", ".py", ".exe", ".pyc"}
EXCLUDED_DIR_NAMES = {
    "__pycache__", "tools", "_bank", "_backup", "release", "node_modules",
    "dist_web", "dist", "build", "notes",
}

# Only match src=/href= inside actual <script>, <link>, or <img> tags -
# this avoids false positives from JS template literals elsewhere in the
# file (e.g. `<a href="${v.url}">` built at runtime inside a <script> block).
ATTR_RE = re.compile(
    r'<(?:script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*"([^"]+)"[^>]*>',
    re.IGNORECASE,
)

# Any quoted "media/<subdir>/<file>" path literal, wherever it appears
# (curriculum_data.js media_path fields, hardcoded refs in js/*.js such as
# boot-intro.js's brand video/poster constants). media/videos is matched
# too, but is always dropped separately - never shipped.
MEDIA_PATH_RE = re.compile(r'media/(?:brand|labs|slides|videos)/[^"\'\\\r\n]+')


def is_excluded_path(rel_path: Path) -> bool:
    parts = set(p.lower() for p in rel_path.parts)
    if parts & {d.lower() for d in EXCLUDED_DIR_NAMES}:
        return True
    if rel_path.suffix.lower() in EXCLUDED_EXTENSIONS:
        return True
    return False


def parse_index_references():
    """Parse index.html for src=/href= attributes pointing at local files."""
    html = INDEX.read_text(encoding="utf-8", errors="ignore")
    refs = []
    for m in ATTR_RE.finditer(html):
        url = m.group(1).strip()
        if not url:
            continue
        if url.startswith(("http://", "https://", "//", "data:", "mailto:", "#")):
            continue
        # strip query/hash - resolve the real file on disk, but index.html
        # itself is copied byte-for-byte so ?v= stays in the served HTML.
        clean = url.split("?", 1)[0].split("#", 1)[0]
        if not clean:
            continue
        refs.append(clean)
    return sorted(set(refs))


def find_media_references():
    """Scan index.html, curriculum_data.js, and js/*.js for media/ paths
    actually used at runtime. Returns (wanted_set, dropped_video_set)."""
    texts = []
    if INDEX.exists():
        texts.append(INDEX.read_text(encoding="utf-8", errors="ignore"))
    if CURRICULUM_DATA.exists():
        texts.append(CURRICULUM_DATA.read_text(encoding="utf-8", errors="ignore"))
    js_dir = ROOT / "js"
    if js_dir.exists():
        for f in sorted(js_dir.glob("*.js")):
            texts.append(f.read_text(encoding="utf-8", errors="ignore"))

    wanted = set()
    dropped_video = set()
    for text in texts:
        for m in MEDIA_PATH_RE.finditer(text):
            path = m.group(0)
            parts = path.split("/")
            if len(parts) > 1 and parts[1].lower() == "videos":
                dropped_video.add(path)
                continue
            wanted.add(path)
    return wanted, dropped_video


def sha1_of_file(path: Path) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def copy_file(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def is_reparse_point(path: Path) -> bool:
    try:
        if path.is_symlink():
            return True
    except OSError:
        pass
    # Python < 3.12 on Windows may lack os.path.isjunction.
    check = getattr(os.path, "isjunction", None)
    if check:
        try:
            return bool(check(path))
        except OSError:
            return False
    return False


def clear_dist(path: Path):
    """Remove dist contents. On Windows a locked cwd/handle can block rmtree."""
    if not path.exists():
        path.mkdir(parents=True)
        return
    for child in list(path.iterdir()):
        try:
            if is_reparse_point(child):
                os.rmdir(child)
            elif child.is_dir():
                shutil.rmtree(child, ignore_errors=True)
            else:
                child.unlink(missing_ok=True)
        except OSError as exc:
            print(f"[build_web_dist] WARN: could not remove {child}: {exc}")
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


def load_version() -> str:
    """release.config.json wins; falls back to package.json."""
    release_cfg = ROOT / "release.config.json"
    if release_cfg.exists():
        try:
            cfg = json.loads(release_cfg.read_text(encoding="utf-8"))
            if cfg.get("version"):
                return str(cfg["version"])
        except (json.JSONDecodeError, OSError) as exc:
            print(f"[build_web_dist] WARN: could not read release.config.json: {exc}")
    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    return str(pkg.get("version", "0.0.0"))


def fmt_mb(num_bytes: int) -> str:
    return f"{num_bytes / (1024 * 1024):.2f} MB"


def main():
    print(f"[build_web_dist] root: {ROOT}")

    clear_dist(DIST)

    copied_rel_paths = []  # POSIX-style relative paths already copied into DIST
    missing = []
    oversize_fatal = []      # non-media files over MAX_FILE_BYTES -> fail build
    media_skipped_size = []  # media files over MAX_FILE_BYTES -> skip, don't fail

    def add(rel: Path, *, required=True, size_cap_fatal=True):
        rel_posix = rel.as_posix()
        if rel_posix in copied_rel_paths:
            return
        src = ROOT / rel
        if not src.exists() or not src.is_file():
            if required:
                missing.append(rel_posix)
            return
        size = src.stat().st_size
        if size > MAX_FILE_BYTES:
            if size_cap_fatal:
                oversize_fatal.append((rel_posix, size))
                return
            else:
                media_skipped_size.append((rel_posix, size))
                return
        copy_file(src, DIST / rel)
        copied_rel_paths.append(rel_posix)

    # 1. index.html itself
    add(Path("index.html"))

    # 2. Every src=/href= reference found in index.html
    for ref in parse_index_references():
        ref_path = Path(ref)
        if ref_path.is_absolute():
            missing.append(ref)
            continue
        add(ref_path)

    # 3. Explicit root files this build always ships
    for name in ROOT_EXTRA_FILES:
        p = ROOT / name
        if p.exists():
            add(Path(name))
        elif name not in ("_headers", "_redirects", "sw.js", "manifest.webmanifest"):
            missing.append(name)
        # _headers/_redirects/sw.js/manifest.webmanifest are generated by this
        # same toolchain and are checked again after generation below.

    # 4. Whole directories (js/, css/, fonts/, icons/)
    for dirname in DIRS_TO_COPY:
        d = ROOT / dirname
        if not d.exists():
            continue
        for f in d.rglob("*"):
            if not f.is_file():
                continue
            rel = f.relative_to(ROOT)
            if is_excluded_path(rel):
                continue
            add(rel)

    # 4b. Landing pages link to the release asset for the current version.
    #     Substitute the placeholder in every landing HTML file.
    landing_dir = DIST / "landing"
    if landing_dir.is_dir():
        version = load_version()
        for landing_html in sorted(landing_dir.glob("*.html")):
            text = landing_html.read_text(encoding="utf-8")
            if "__APLUS_VERSION__" in text:
                landing_html.write_text(
                    text.replace("__APLUS_VERSION__", version), encoding="utf-8"
                )
                print(f"  version -> {landing_html.relative_to(DIST)}")

    # 4c. Create /app/index.html as a full app shell copy with <base href="/">
    #     so landing links to /app work even when Assets html_handling would
    #     bounce /index.html -> / -> /landing through the worker.
    app_dir = DIST / "app"
    app_dir.mkdir(parents=True, exist_ok=True)
    src_index = DIST / "index.html"
    app_index = app_dir / "index.html"
    if src_index.is_file():
        html = src_index.read_text(encoding="utf-8")
        if "<base " not in html.lower():
            html = html.replace("<head>", '<head>\n  <base href="/">', 1)
            if "<base " not in html.lower():
                html = html.replace("<head ", '<head><base href="/">', 1)
        app_index.write_text(html, encoding="utf-8")
        print("  app shell -> app/index.html (full copy + base href)")
    else:
        app_index.write_text(
            '<!DOCTYPE html><html><head><meta charset="utf-8">'
            '<base href="/">'
            '<meta http-equiv="refresh" content="0; url=/app">'
            '<title>Clariora A+</title></head><body>'
            '<script>window.location.replace("/app" + window.location.search);</script>'
            '</body></html>',
            encoding="utf-8",
        )

    # 5. Course media - only files actually referenced at runtime.
    #    media/videos ("Videos For A+", ~2.4 GB) is never shipped, even if
    #    referenced. "PowerPoint for A+" / "Labs for A+" (the original
    #    folders) are never fetched by the browser - only their media/
    #    mirrors (media/slides, media/labs) are - so they are not copied.
    media_wanted, media_dropped_videos = find_media_references()
    for rel_str in sorted(media_wanted):
        add(Path(rel_str), required=True, size_cap_fatal=False)
    if media_dropped_videos:
        print(f"[build_web_dist] NOTE: media/videos never shipped - "
              f"{len(media_dropped_videos)} referenced video file(s) skipped "
              f"on purpose (use INCLUDE_CURRICULUM_VIDEOS in the desktop build, "
              f"or a remote mediaBaseUrl, instead).")

    # index.html/media reference integrity check (missing files always fail;
    # oversize non-media files always fail; oversize media files are logged
    # below and simply left out of the build).
    # curriculum_data.js is generated from local, non-redistributable course
    # media (python tools/build_curriculum.py) and is not in the repository.
    # A clean checkout gets an empty catalogue so the app loads and the
    # curriculum viewer shows its rebuild notice instead of a missing script.
    if "curriculum_data.js" in missing:
        missing.remove("curriculum_data.js")
        stub = (
            'window.COMPTIA_CURRICULUM = {"version": "0", '
            '"title": "Datacentre Academy A+ Curriculum", '
            '"description": "Curriculum catalogue not built. Run python tools/build_curriculum.py.", '
            '"stats": {"labs": 0, "slides": 0, "videos": 0, "total": 0, "video_size_mb": 0}, '
            '"labs": [], "slides": [], "videos": []};' + chr(10)
        )
        DIST.mkdir(parents=True, exist_ok=True)
        (DIST / "curriculum_data.js").write_text(stub, encoding="utf-8")
        copied_rel_paths.append("curriculum_data.js")
        print("[build_web_dist] NOTE: curriculum_data.js not present; emitted an "
              "empty catalogue placeholder.")

    if missing:
        print("[build_web_dist] ERROR: referenced files do not exist, or")
        print("required root files are missing:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)

    if oversize_fatal:
        print("[build_web_dist] ERROR: emitted file(s) exceed the 25 MB "
              "Cloudflare Pages per-file limit:")
        for rel_posix, size in oversize_fatal:
            print(f"  - {rel_posix} ({fmt_mb(size)})")
        sys.exit(1)

    # 6. Build precache manifest from everything copied so far (pre-sw.js state).
    # Never precached: _headers/_redirects (Pages config, not fetched by the
    # browser), anything under media/ (fetched on demand), and any single
    # file over 3 MB - this keeps the offline app shell well under 12 MB.
    NOT_PRECACHED_NAMES = {"_headers", "_redirects"}
    manifest_entries = []
    precache_skipped_large = []
    for rel_posix in sorted(copied_rel_paths):
        if rel_posix in NOT_PRECACHED_NAMES:
            continue
        if rel_posix.startswith("media/") or rel_posix.startswith("landing/"):
            continue
        f = DIST / rel_posix
        size = f.stat().st_size
        if size > MAX_PRECACHE_ENTRY_BYTES:
            precache_skipped_large.append((rel_posix, size))
            continue
        manifest_entries.append({
            "url": "./" + rel_posix,
            "revision": sha1_of_file(f),
        })

    manifest_json = json.dumps(manifest_entries, indent=2)
    manifest_hash = hashlib.sha1(manifest_json.encode("utf-8")).hexdigest()[:8]

    precache_total = sum(
        (DIST / e["url"][2:]).stat().st_size for e in manifest_entries
    )
    if precache_total > MAX_PRECACHE_TOTAL_BYTES:
        print(f"[build_web_dist] ERROR: precache total {fmt_mb(precache_total)} "
              f"exceeds the {fmt_mb(MAX_PRECACHE_TOTAL_BYTES)} offline-shell budget.")
        sys.exit(1)

    version = load_version()
    build_id = f"{version}-{manifest_hash}"

    (DIST / "precache-manifest.json").write_text(manifest_json, encoding="utf-8")
    copied_rel_paths.append("precache-manifest.json")
    print(f"[build_web_dist] BUILD_ID = {build_id}")

    # 7. Copy sw.js with BUILD_ID injected
    sw_src = ROOT / "sw.js"
    sw_text = sw_src.read_text(encoding="utf-8")
    if "const BUILD_ID" in sw_text:
        sw_text = re.sub(
            r"const BUILD_ID\s*=\s*'[^']*';",
            f"const BUILD_ID = '{build_id}';",
            sw_text,
            count=1,
        )
    else:
        sw_text = f"const BUILD_ID = '{build_id}';\n" + sw_text
    (DIST / "sw.js").write_text(sw_text, encoding="utf-8")
    if "sw.js" not in copied_rel_paths:
        copied_rel_paths.append("sw.js")

    # 8. Copy _headers / _redirects / manifest.webmanifest verbatim if not already copied
    for name in ("_headers", "_redirects", "manifest.webmanifest"):
        src = ROOT / name
        if src.exists() and name not in copied_rel_paths:
            copy_file(src, DIST / name)
            copied_rel_paths.append(name)
        elif not src.exists():
            missing.append(name)

    if missing:
        print("[build_web_dist] ERROR: required generated files missing (build them first):")
        for m in set(missing):
            print(f"  - {m}")
        sys.exit(1)

    # 9. Report
    total_size = 0
    file_count = 0
    media_size = 0
    media_count = 0
    for f in DIST.rglob("*"):
        if f.is_file():
            size = f.stat().st_size
            total_size += size
            file_count += 1
            if f.relative_to(DIST).as_posix().startswith("media/"):
                media_size += size
                media_count += 1

    print("[build_web_dist] ---------------------------------------------")
    print("[build_web_dist] Size table")
    print("[build_web_dist] ---------------------------------------------")
    print(f"[build_web_dist]   {'category':<28} {'files':>7} {'size':>12}")
    print(f"[build_web_dist]   {'app shell (non-media)':<28} {file_count - media_count:>7} {fmt_mb(total_size - media_size):>12}")
    print(f"[build_web_dist]   {'course media (media/)':<28} {media_count:>7} {fmt_mb(media_size):>12}")
    print(f"[build_web_dist]   {'TOTAL dist_web':<28} {file_count:>7} {fmt_mb(total_size):>12}")
    print(f"[build_web_dist]   {'precache (offline shell)':<28} {len(manifest_entries):>7} {fmt_mb(precache_total):>12}")
    print("[build_web_dist] ---------------------------------------------")

    if media_skipped_size:
        print("[build_web_dist] Media files skipped (over 25 MB, not shipped):")
        for rel_posix, size in media_skipped_size:
            print(f"  - {rel_posix} ({fmt_mb(size)})")

    if precache_skipped_large:
        print("[build_web_dist] Excluded from precache (over 3 MB, still shipped, fetched on demand):")
        for rel_posix, size in precache_skipped_large:
            print(f"  - {rel_posix} ({fmt_mb(size)})")

    print(f"[build_web_dist] dist_web/ ready")
    print(f"[build_web_dist] BUILD_ID: {build_id}")


if __name__ == "__main__":
    main()
