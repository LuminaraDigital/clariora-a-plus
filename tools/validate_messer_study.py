#!/usr/bin/env python3
"""validate_messer_study.py - validation for MESSER Core 1 & Core 2 study datasets and notes.

Checks:
  1. _bank/study/messer_1201.json: exactly 63 entries, valid videoIds, correct URLs,
     sequential index, formatted durations, all 27 objectives in objectives_220_1201.json covered.
  2. _bank/study/messer_1202.json: exactly 74 entries, valid videoIds, correct URLs,
     sequential index, formatted durations, all 36 objectives in objectives_220_1202.json covered.
  3. _bank/study/notes_index.json: one entry per .md file in the app notes dir (38 files),
     core values in (core1, core2, shared).
  4. tools/objective_notes_map.json: every notes_reference value used in objective_notes_map.json
     exists in app notes and root notes dirs.
  5. JSON integrity: no em/en dashes in written JSON files.

Usage: python tools/validate_messer_study.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_NOTES = os.path.join(ROOT, "CompTIA_A_Plus_Desktop_App", "resources", "app", "notes")
ROOT_NOTES = os.path.join(ROOT, "notes")
MESSER_1201 = os.path.join(ROOT, "_bank", "study", "messer_1201.json")
MESSER_1202 = os.path.join(ROOT, "_bank", "study", "messer_1202.json")
OBJECTIVES_1201 = os.path.join(ROOT, "tools", "objectives_220_1201.json")
OBJECTIVES_1202 = os.path.join(ROOT, "tools", "objectives_220_1202.json")
NOTES_INDEX = os.path.join(ROOT, "_bank", "study", "notes_index.json")
NOTES_MAP = os.path.join(ROOT, "tools", "objective_notes_map.json")

failures = []


def check(label, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {label}" + (f" - {detail}" if detail else ""))
    if not ok:
        failures.append(label)


# Load datasets
with open(MESSER_1201, encoding="utf-8") as f:
    videos_1201 = json.load(f)
with open(MESSER_1202, encoding="utf-8") as f:
    videos_1202 = json.load(f)
with open(OBJECTIVES_1201, encoding="utf-8") as f:
    objectives_1201 = json.load(f)
with open(OBJECTIVES_1202, encoding="utf-8") as f:
    objectives_1202 = json.load(f)
with open(NOTES_INDEX, encoding="utf-8") as f:
    notes_index = json.load(f)
with open(NOTES_MAP, encoding="utf-8") as f:
    notes_map = json.load(f)

prefix = "https://www.youtube.com/watch?v="

# 1. messer_1201 shape & coverage
check("messer_1201 has exactly 63 entries", len(videos_1201) == 63, f"count={len(videos_1201)}")
bad_ids_1201 = [v for v in videos_1201 if not re.fullmatch(r"[\w\-]{11}", str(v.get("videoId", "")))]
check("messer_1201 all videoIds are 11 chars", not bad_ids_1201, f"bad={len(bad_ids_1201)}")
bad_urls_1201 = [v for v in videos_1201 if not str(v.get("url", "")).startswith(prefix) or str(v["url"]) != prefix + v["videoId"]]
check("messer_1201 all urls use correct watch?v= prefix and match videoId", not bad_urls_1201, f"bad={len(bad_urls_1201)}")
bad_idx_1201 = [v for v in videos_1201 if v.get("index") != videos_1201.index(v) + 1]
check("messer_1201 indexes are 1..63 in order", not bad_idx_1201)
bad_dur_1201 = [v for v in videos_1201 if not re.fullmatch(r"\d{1,2}:\d{2}", str(v.get("duration", "")))]
check("messer_1201 all durations formatted M:SS", not bad_dur_1201, f"bad={len(bad_dur_1201)}")

title_codes_1201 = set()
for v in videos_1201:
    m = re.search(r"-\s*(\d+\.\d+)\s*$", v["title"])
    if m:
        title_codes_1201.add(m.group(1))
    elif v.get("objective") != "Overview":
        failures.append(f"messer_1201 title without objective code: {v['title']}")
obj_codes_1201 = set(objectives_1201["objectives"].keys())
missing_1201 = title_codes_1201 - obj_codes_1201
check("every objective code in messer_1201 titles exists in objectives_220_1201.json",
      not missing_1201, f"title codes={len(title_codes_1201)}, missing={sorted(missing_1201)}")
never_hit_1201 = obj_codes_1201 - title_codes_1201
check("all 27 Core 1 objectives covered by messer_1201 videos",
      not never_hit_1201, f"uncovered={sorted(never_hit_1201)}" if never_hit_1201 else "all 27 covered")

dom_names_1201 = {
    "1.0 Mobile Devices",
    "2.0 Networking",
    "3.0 Hardware",
    "4.0 Virtualization and Cloud Computing",
    "5.0 Hardware and Network Troubleshooting"
}
check("blueprint domains match Core 1 1201 official names and weights 13/23/25/11/28",
      objectives_1201["blueprint"] == {
          "1.0 Mobile Devices": 13,
          "2.0 Networking": 23,
          "3.0 Hardware": 25,
          "4.0 Virtualization and Cloud Computing": 11,
          "5.0 Hardware and Network Troubleshooting": 28
      })
bad_dom_1201 = [c for c, o in objectives_1201["objectives"].items() if o["domain"] not in dom_names_1201]
check("every 1201 objective maps to a valid domain", not bad_dom_1201, f"bad={bad_dom_1201}")

# 2. messer_1202 shape & coverage
check("messer_1202 has exactly 74 entries", len(videos_1202) == 74, f"count={len(videos_1202)}")
bad_ids_1202 = [v for v in videos_1202 if not re.fullmatch(r"[\w\-]{11}", str(v.get("videoId", "")))]
check("messer_1202 all videoIds are 11 chars", not bad_ids_1202, f"bad={len(bad_ids_1202)}")
bad_urls_1202 = [v for v in videos_1202 if not str(v.get("url", "")).startswith(prefix) or str(v["url"]) != prefix + v["videoId"]]
check("messer_1202 all urls use correct watch?v= prefix and match videoId", not bad_urls_1202, f"bad={len(bad_urls_1202)}")
bad_idx_1202 = [v for v in videos_1202 if v.get("index") != videos_1202.index(v) + 1]
check("messer_1202 indexes are 1..74 in order", not bad_idx_1202)
bad_dur_1202 = [v for v in videos_1202 if not re.fullmatch(r"\d{1,2}:\d{2}", str(v.get("duration", "")))]
check("messer_1202 all durations formatted M:SS", not bad_dur_1202, f"bad={len(bad_dur_1202)}")

title_codes_1202 = set()
for v in videos_1202:
    m = re.search(r"-\s*(\d+\.\d+)\s*$", v["title"])
    if m:
        title_codes_1202.add(m.group(1))
    elif v.get("objective") != "Overview":
        failures.append(f"messer_1202 title without objective code: {v['title']}")
obj_codes_1202 = set(objectives_1202["objectives"].keys())
missing_1202 = title_codes_1202 - obj_codes_1202
check("every objective code in messer_1202 titles exists in objectives_220_1202.json",
      not missing_1202, f"title codes={len(title_codes_1202)}, missing={sorted(missing_1202)}")
never_hit_1202 = obj_codes_1202 - title_codes_1202
check("all 36 Core 2 objectives covered by messer_1202 videos",
      not never_hit_1202, f"uncovered={sorted(never_hit_1202)}" if never_hit_1202 else "all 36 covered")

dom_names_1202 = {"1.0 Operating Systems", "2.0 Security", "3.0 Software Troubleshooting", "4.0 Operational Procedures"}
check("blueprint domains match Core 2 provisional names and weights 28/28/23/21",
      objectives_1202["blueprint"] == {
          "1.0 Operating Systems": 28,
          "2.0 Security": 28,
          "3.0 Software Troubleshooting": 23,
          "4.0 Operational Procedures": 21
      })
bad_dom_1202 = [c for c, o in objectives_1202["objectives"].items() if o["domain"] not in dom_names_1202]
check("every 1202 objective maps to a valid domain", not bad_dom_1202, f"bad={bad_dom_1202}")

# 3. notes index & filesystem verification
disk_files_app = sorted(f for f in os.listdir(APP_NOTES) if f.endswith(".md"))
disk_files_root = sorted(f for f in os.listdir(ROOT_NOTES) if f.endswith(".md")) if os.path.exists(ROOT_NOTES) else []
idx_files = sorted(e["file"] for e in notes_index)

check("app notes dir has 38 .md files", len(disk_files_app) == 38, f"count={len(disk_files_app)}")
check("root notes dir has 38 .md files", len(disk_files_root) == 38, f"count={len(disk_files_root)}")
check("notes_index has one entry per notes dir file",
      disk_files_app == idx_files,
      f"only-on-disk={sorted(set(disk_files_app) - set(idx_files))}, only-in-index={sorted(set(idx_files) - set(disk_files_app))}")
check("notes_index entries have file/title/core",
      all(set(e) == {"file", "title", "core"} for e in notes_index))
check("core values are core1/core2/shared",
      all(e["core"] in ("core1", "core2", "shared") for e in notes_index))

map_refs = sorted(set(notes_map["core1"].values()) | set(notes_map["core2"].values()))
missing_app_refs = [r for r in map_refs if not os.path.isfile(os.path.join(APP_NOTES, r))]
missing_root_refs = [r for r in map_refs if not os.path.isfile(os.path.join(ROOT_NOTES, r))]
check("every objective_notes_map reference exists in app notes dir",
      not missing_app_refs, f"missing={missing_app_refs}")
check("every objective_notes_map reference exists in root notes dir",
      not missing_root_refs, f"missing={missing_root_refs}")

# 4. em dash ban in agent-written JSON outputs
dash_hits = []
for p in (MESSER_1201, MESSER_1202, OBJECTIVES_1201, OBJECTIVES_1202, NOTES_INDEX, NOTES_MAP):
    with open(p, encoding="utf-8") as f:
        txt = f.read()
    if "\u2014" in txt or "\u2013" in txt:
        dash_hits.append(os.path.basename(p))
check("no em/en dashes in written JSON files", not dash_hits, f"hits={dash_hits}")

print()
if failures:
    print(f"VALIDATION FAILED: {len(failures)} check(s) failed")
    for f_ in failures:
        print("  -", f_)
    sys.exit(1)
print("VALIDATION PASSED: all checks green")