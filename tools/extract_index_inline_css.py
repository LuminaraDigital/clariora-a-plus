#!/usr/bin/env python3
"""Extract inline CSS from index.html and move core.js earlier in the script order."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html_path = root / "index.html"
text = html_path.read_text(encoding="utf-8")

start = text.find("<style>")
if start < 0:
    raise SystemExit("no style block found")
end = text.find("</style>", start)
css = text[start + 7 : end]

out = root / "css" / "app-inline.css"
out.write_text(
    "/* Extracted from index.html for context hygiene. Behavior unchanged. */\n"
    + css.strip()
    + "\n",
    encoding="utf-8",
)

link = '  <link rel="stylesheet" href="css/app-inline.css">'
new_text = text[:start] + link + text[end + 8 :]

old_core = '  <script src="js/core.js"></script>\n'
if old_core in new_text:
    new_text = new_text.replace(old_core, "", 1)
    anchor = '  <script src="profiles.js"></script>\n'
    if anchor not in new_text:
        raise SystemExit("profiles.js script tag not found")
    new_text = new_text.replace(anchor, anchor + old_core, 1)

html_path.write_text(new_text, encoding="utf-8")
print("css_lines", len(css.splitlines()))
print("html_lines", len(new_text.splitlines()))
print("link_ok", "css/app-inline.css" in new_text)
print("style_tags_left", new_text.count("<style>"))
print("core_after_profiles", new_text.find('src="profiles.js"') < new_text.find('src="js/core.js"'))
