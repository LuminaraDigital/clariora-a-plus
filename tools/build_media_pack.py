#!/usr/bin/env python3
"""Build the offline course video pack.

Zips "Videos For A+/**" into release/media/<packName> with store compression,
because video files do not compress. Files are added in a deterministic order
and streamed, so the 2.4 GB folder never sits in memory.

Also writes:
  release/media/<packName>.sha256    checksum of the zip
  release/media/manifest.json        {path, bytes, sha256} for every file
  release/media/upload_instructions.txt

Usage:
  python tools/build_media_pack.py
  python tools/build_media_pack.py --limit 2          # first 2 files only
  python tools/build_media_pack.py --source "Videos For A+" --out release/media
"""

import argparse
import hashlib
import json
import os
import sys
import time
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SOURCE = "Videos For A+"
DEFAULT_OUT = os.path.join("release", "media")
DEFAULT_PACK_NAME = "CompTIA_A_Plus_Course_Videos_v1.zip"
CHUNK = 1024 * 1024


def read_pack_name():
    """Take packName from js/media-config.js so the two never drift."""
    cfg = os.path.join(ROOT, "js", "media-config.js")
    try:
        with open(cfg, "r", encoding="utf-8") as fh:
            text = fh.read()
    except OSError:
        return DEFAULT_PACK_NAME
    marker = "packName:"
    idx = text.find(marker)
    if idx < 0:
        return DEFAULT_PACK_NAME
    tail = text[idx + len(marker):]
    for quote in ("'", '"'):
        start = tail.find(quote)
        if start < 0:
            continue
        end = tail.find(quote, start + 1)
        if end > start:
            return tail[start + 1:end]
    return DEFAULT_PACK_NAME


def read_release_config():
    """release.config.json is optional. Returns a dict, possibly empty."""
    for candidate in (
        os.path.join(ROOT, "release.config.json"),
        os.path.join(ROOT, "release", "release.config.json"),
    ):
        if os.path.isfile(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                if isinstance(data, dict):
                    data["_path"] = candidate
                    return data
            except (OSError, ValueError) as exc:
                print("warning: could not read %s (%s)" % (candidate, exc))
    return {}


def flatten_rel(rel):
    """Drop wrapper folders that carry the same name as the file inside them.

    "Videos For A+" stores each clip as "pd_bios_uefi.mp4/pd_bios_uefi.mp4".
    The curriculum data points at "media/videos/pd_bios_uefi.mp4", so the
    wrapper has to go or the pack will not line up with the catalog.
    """
    parts = [p for p in rel.split("/") if p]
    while len(parts) > 1 and parts[-2] == parts[-1]:
        del parts[-2]
    return "/".join(parts)


def collect(source_dir, flatten=True):
    """Every file under source_dir, sorted, as (abs_path, arc_name)."""
    items = []
    seen = {}
    for dirpath, dirnames, filenames in os.walk(source_dir):
        dirnames.sort()
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, source_dir).replace(os.sep, "/")
            arc = flatten_rel(rel) if flatten else rel
            if arc in seen:
                print("warning: two files want the same name in the pack: %s" % arc)
                print("         keeping %s, skipping %s" % (seen[arc], full))
                continue
            seen[arc] = full
            items.append((full, arc))
    items.sort(key=lambda pair: pair[1])
    return items


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        while True:
            block = fh.read(CHUNK)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def human(num_bytes):
    value = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024.0 or unit == "TB":
            return "%.1f %s" % (value, unit)
        value /= 1024.0
    return "%.1f TB" % value


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build the offline course video pack.")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="folder of videos to pack")
    parser.add_argument("--out", default=DEFAULT_OUT, help="output folder for the pack")
    parser.add_argument("--pack-name", default=None, help="zip file name")
    parser.add_argument("--limit", type=int, default=0, help="pack only the first N files")
    parser.add_argument(
        "--prefix",
        default="media/videos",
        help="path prefix inside the zip, matching curriculum media_path",
    )
    parser.add_argument(
        "--no-flatten",
        action="store_true",
        help="keep the wrapper folders exactly as they are on disk",
    )
    args = parser.parse_args(argv)

    source_dir = args.source if os.path.isabs(args.source) else os.path.join(ROOT, args.source)
    out_dir = args.out if os.path.isabs(args.out) else os.path.join(ROOT, args.out)
    pack_name = args.pack_name or read_pack_name()

    if not os.path.isdir(source_dir):
        print("error: source folder not found: %s" % source_dir)
        return 2

    os.makedirs(out_dir, exist_ok=True)
    items = collect(source_dir, flatten=not args.no_flatten)
    if args.limit and args.limit > 0:
        items = items[: args.limit]
        print("limit is on: packing %d of the available files" % len(items))

    if not items:
        print("error: nothing to pack in %s" % source_dir)
        return 2

    zip_path = os.path.join(out_dir, pack_name)
    prefix = args.prefix.strip("/")
    manifest = []
    total_bytes = 0
    started = time.time()

    print("source: %s" % source_dir)
    print("output: %s" % zip_path)
    print("files:  %d" % len(items))
    print("")

    # allowZip64 keeps the 2.4 GB case legal. ZIP_STORED means no compression
    # pass over the video bytes, so the run is IO bound rather than CPU bound.
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
        for index, (full, rel) in enumerate(items, 1):
            size = os.path.getsize(full)
            arc = prefix + "/" + rel if prefix else rel
            digest = hashlib.sha256()
            info = zipfile.ZipInfo(arc, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            info.external_attr = 0o644 << 16
            with open(full, "rb") as src, zf.open(info, "w") as dst:
                while True:
                    block = src.read(CHUNK)
                    if not block:
                        break
                    digest.update(block)
                    dst.write(block)
            total_bytes += size
            manifest.append({"path": arc, "bytes": size, "sha256": digest.hexdigest()})
            print("  [%d/%d] %s  %s" % (index, len(items), rel, human(size)))

    pack_bytes = os.path.getsize(zip_path)
    print("")
    print("hashing the pack")
    pack_sha = sha256_of(zip_path)

    with open(zip_path + ".sha256", "w", encoding="utf-8", newline="\n") as fh:
        fh.write("%s  %s\n" % (pack_sha, pack_name))

    manifest_doc = {
        "packName": pack_name,
        "packBytes": pack_bytes,
        "packSha256": pack_sha,
        "prefix": prefix,
        "fileCount": len(manifest),
        "totalBytes": total_bytes,
        "files": manifest,
    }
    manifest_path = os.path.join(out_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest_doc, fh, indent=2)
        fh.write("\n")

    release_cfg = read_release_config()
    media_base = release_cfg.get("mediaBaseUrl") or ""
    cfg_note = (
        "read from %s" % release_cfg.get("_path")
        if media_base
        else "release.config.json has no mediaBaseUrl yet, so fill this in by hand"
    )

    # The resolver drops a segment that both the base URL and the relative
    # path carry, so ".../media/" plus "media/videos/x" lands on
    # ".../media/videos/x". Mirror that here so the example matches reality.
    base_for_example = media_base or "https://example.com/media/"
    if not base_for_example.endswith("/"):
        base_for_example += "/"
    remote_prefix = prefix
    tail = [p for p in base_for_example.split("/") if p][-1]
    if remote_prefix.split("/")[0] == tail:
        remote_prefix = "/".join(remote_prefix.split("/")[1:])
    example_url = base_for_example + (remote_prefix + "/" if remote_prefix else "") + "pd_bios_uefi.mp4"

    instructions = os.path.join(out_dir, "upload_instructions.txt")
    lines = [
        "Upload instructions for %s" % pack_name,
        "",
        "Media base URL: %s" % (media_base or "(not set)"),
        "Source of that value: %s" % cfg_note,
        "",
        "1. Upload the whole video folder so each file sits at:",
        "     %s<file name>" % (base_for_example + (remote_prefix + "/" if remote_prefix else "")),
        "   Example: %s" % example_url,
        "   The catalog path for that file is %s/pd_bios_uefi.mp4" % prefix,
        "",
        "2. Upload the offline pack next to it:",
        "     <mediaBaseUrl>%s" % pack_name,
        "     <mediaBaseUrl>%s.sha256" % pack_name,
        "     <mediaBaseUrl>manifest.json",
        "",
        "3. The bucket must answer HTTP range requests and send these headers,",
        "   or video seeking will not work in the browser:",
        "     Accept-Ranges: bytes",
        "     Access-Control-Allow-Origin: <the app origin>",
        "     Access-Control-Allow-Methods: GET, HEAD",
        "     Access-Control-Allow-Headers: Range",
        "     Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges",
        "",
        "4. Set remoteBase in js/media-config.js, or return mediaBaseUrl from",
        "   electronAPI.app.getReleaseInfo() in the desktop build.",
        "",
        "Pack size:  %s (%d bytes)" % (human(pack_bytes), pack_bytes),
        "Pack sha256: %s" % pack_sha,
        "File count: %d" % len(manifest),
        "",
        "See docs/MEDIA_DELIVERY.md for the full upload and cost notes.",
    ]
    with open(instructions, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")

    elapsed = time.time() - started
    rate = (pack_bytes / elapsed / (1024 * 1024)) if elapsed > 0 else 0.0

    print("")
    print("pack:      %s" % zip_path)
    print("pack size: %s (%d bytes)" % (human(pack_bytes), pack_bytes))
    print("source:    %s across %d files" % (human(total_bytes), len(manifest)))
    print("sha256:    %s" % pack_sha)
    print("manifest:  %s" % manifest_path)
    print("upload:    %s" % instructions)
    print("elapsed:   %.1f s (%.1f MB/s)" % (elapsed, rate))
    return 0


if __name__ == "__main__":
    sys.exit(main())
