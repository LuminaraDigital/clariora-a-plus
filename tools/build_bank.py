#!/usr/bin/env python3
"""build_bank.py - CEO merge pipeline for the CompTIA A+ v3 question bank.

Reads shard files from _bank/shards/*.json, validates basic schema, dedupes by id,
auto-balances the keyed position of single-choice questions (rotation with
positional-reference protection), and emits:

  APP_DIR/exam_data.json  - merged bank with meta
  APP_DIR/exam_data.js     - window.COMPTIA_EXAM_DATA = {...};
                             window.PROFESSOR_MESSER_1201_VIDEOS = [...];   (if study file present)
                             window.PROFESSOR_MESSER_1202_VIDEOS = [...];   (if study file present)
                             window.APLUS_NOTES_INDEX = {...};              (if study file present)

Usage:
  python tools/build_bank.py [--shards-dir _bank/shards] [--study-dir _bank/study] [--out <APP_DIR>]
"""
import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SHARDS = os.path.join(ROOT, "_bank", "shards")
DEFAULT_STUDY = os.path.join(ROOT, "_bank", "study")
DEFAULT_OUT = os.path.join(ROOT, "CompTIA_A_Plus_Desktop_App", "resources", "app")

VERSION = "3.1.0"
BLUEPRINT = {
    "core1": {
        "1.0 Mobile Devices": 13,
        "2.0 Networking": 23,
        "3.0 Hardware": 25,
        "4.0 Virtualization and Cloud Computing": 11,
        "5.0 Hardware and Network Troubleshooting": 28,
    },
    "core2": {
        "1.0 Operating Systems": 28,
        "2.0 Security": 28,
        "3.0 Software Troubleshooting": 23,
        "4.0 Operational Procedures": 21,
    },
}

POSITIONAL_RE = re.compile(
    r"(all|none|both|either|neither)\s+of\s+(the\s+)?(above|these|following)"
    r"|\boptions?\s+[abcd]\b|\banswers?\s+[abcd]\b"
    r"|\b[a]\s+and\s+[bcd]\b|\b[b]\s+and\s+[cd]\b|\b[c]\s+and\s+[d]\b"
    r"|\bchoices?\s+[abcd]\b",
    re.IGNORECASE,
)

REQUIRED_COMMON = ["id", "exam", "domain", "objective", "question", "explanation"]


def has_positional_ref(q):
    blob = q.get("question", "") + " " + " ".join(q.get("options", []) or [])
    return bool(POSITIONAL_RE.search(blob))


def normalize(q):
    q = dict(q)
    q.setdefault("type", "single")
    q.setdefault("difficulty", "medium")
    q.setdefault("tags", [])
    if q["type"] == "single" and "answer" not in q and "answers" in q:
        # tolerate single questions authored with answers list of 1
        if len(q["answers"]) == 1:
            q["answer"] = q["answers"][0]
    return q


def check_question(q, errors, ctx):
    for k in REQUIRED_COMMON:
        if k not in q or q[k] in (None, ""):
            errors.append(f"{ctx}: missing/empty '{k}' (id={q.get('id')})")
    if q.get("exam") not in ("core1", "core2"):
        errors.append(f"{ctx}: bad exam '{q.get('exam')}' (id={q.get('id')})")
    t = q.get("type", "single")
    if t == "single":
        opts = q.get("options", [])
        a = q.get("answer")
        if not isinstance(opts, list) or len(opts) != 4:
            errors.append(f"{ctx}: single question must have 4 options (id={q.get('id')})")
        if not isinstance(a, int) or not (0 <= (a if isinstance(a, int) else -1) < len(opts)):
            errors.append(f"{ctx}: bad answer index (id={q.get('id')})")
    elif t == "multi":
        opts = q.get("options", [])
        ans = q.get("answers", [])
        if len(opts) != 5 or len(ans) != 2 or not all(isinstance(x, int) and 0 <= x < 5 for x in ans):
            errors.append(f"{ctx}: multi must have 5 options and exactly 2 answer indices (id={q.get('id')})")
        if "(Select TWO.)" not in q.get("question", ""):
            errors.append(f"{ctx}: multi stem must end with '(Select TWO.)' (id={q.get('id')})")
    elif t == "match":
        if not (4 <= len(q.get("pairs", [])) <= 5):
            errors.append(f"{ctx}: match needs 4-5 pairs (id={q.get('id')})")
    elif t == "order":
        if not (4 <= len(q.get("sequence", [])) <= 6):
            errors.append(f"{ctx}: order needs 4-6 steps (id={q.get('id')})")
    else:
        errors.append(f"{ctx}: unknown type '{t}' (id={q.get('id')})")


def auto_balance(questions, core):
    """Rotate single-choice options so keyed positions approach 25% each.

    Rotation preserves option wording, only reorders the array and remaps the
    answer index. Questions with positional references are skipped.
    """
    singles = [q for q in questions if q.get("type", "single") == "single" and not has_positional_ref(q)]
    counts = Counter(q["answer"] for q in singles)
    target = len(singles) / 4.0
    # deterministic order
    singles.sort(key=lambda q: q["id"])
    for q in singles:
        counts = Counter(x["answer"] for x in singles)
        # pick the currently-least-used position
        pos = min(range(4), key=lambda p: (counts[p], p))
        k = (pos - q["answer"]) % 4
        if k:
            opts = q["options"]
            q["options"] = [opts[(i + k) % 4] for i in range(4)]
            q["answer"] = pos
    return questions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shards-dir", default=DEFAULT_SHARDS)
    ap.add_argument("--study-dir", default=DEFAULT_STUDY)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--core", choices=["core1", "core2"], help="only build this core")
    args = ap.parse_args()

    shards_dir, study_dir, out_dir = args.shards_dir, args.study_dir, args.out
    if not os.path.isdir(shards_dir):
        print(f"No shards dir at {shards_dir}; nothing to build.")
        return 1

    all_q, errors, seen_ids, seen_stems = [], [], {}, {}
    shard_files = sorted(f for f in os.listdir(shards_dir) if f.endswith(".json"))
    if not shard_files:
        print("No shard files found.")
        return 1

    for fname in shard_files:
        path = os.path.join(shards_dir, fname)
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            errors.append(f"{fname}: JSON parse error: {e}")
            continue
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            errors.append(f"{fname}: expected a list of questions (or {{'questions': [...]}})")
            continue
        for q in qs:
            q = normalize(q)
            if args.core and q.get("exam") != args.core:
                continue
            check_question(q, errors, fname)
            qid = q.get("id")
            if qid in seen_ids:
                errors.append(f"{fname}: duplicate id {qid} (also in {seen_ids[qid]})")
            else:
                seen_ids[qid] = fname
            stem = re.sub(r"\s+", " ", q.get("question", "")).strip().lower()
            if len(stem) > 40 and stem in seen_stems:
                errors.append(f"{fname}: duplicate stem (id={qid} == {seen_stems[stem]})")
            else:
                seen_stems[stem] = qid
            all_q.append(q)

    if errors:
        print("BUILD FAILED - schema errors:")
        for e in errors:
            print("  -", e)
        return 1

    core1 = [q for q in all_q if q["exam"] == "core1"]
    core2 = [q for q in all_q if q["exam"] == "core2"]
    auto_balance(core1, "core1")
    auto_balance(core2, "core2")

    bank = {
        "version": VERSION,
        "title": "CompTIA A+ (220-1201 Core 1 & 220-1202 Core 2) Master Question Bank",
        "description": "Blueprint-aligned question bank with single, multi-select, matching, and ordering items. Scaled 100-900 scoring.",
        "passing_score_core1": 675,
        "passing_score_core2": 700,
        "max_time_minutes": 90,
        "max_questions_per_exam": 90,
        "blueprint": BLUEPRINT,
        "core1": core1,
        "core2": core2,
    }

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "exam_data.json"), "w", encoding="utf-8") as f:
        json.dump(bank, f, indent=2, ensure_ascii=False)

    js_parts = ["window.COMPTIA_EXAM_DATA = " + json.dumps(bank, ensure_ascii=False) + ";\n"]
    study_files = {
        "messer_1201.json": "PROFESSOR_MESSER_1201_VIDEOS",
        "messer_1202.json": "PROFESSOR_MESSER_1202_VIDEOS",
        "notes_index.json": "APLUS_NOTES_INDEX",
    }
    for fname, var in study_files.items():
        p = os.path.join(study_dir, fname)
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as f:
                payload = json.load(f)
            js_parts.append(f"window.{var} = " + json.dumps(payload, ensure_ascii=False) + ";\n")
        else:
            print(f"  (study file missing, skipped: {fname})")
    with open(os.path.join(out_dir, "exam_data.js"), "w", encoding="utf-8") as f:
        f.write("".join(js_parts))

    print(f"BUILD OK: core1={len(core1)} core2={len(core2)} total={len(core1)+len(core2)}")
    for core, qs in (("core1", core1), ("core2", core2)):
        doms = Counter(q["domain"] for q in qs)
        types = Counter(q.get("type", "single") for q in qs)
        keyed = Counter(q["answer"] for q in qs if q.get("type", "single") == "single")
        print(f"  {core}: domains={dict(doms)}")
        print(f"  {core}: types={dict(types)}")
        print(f"  {core}: keyed positions={dict(sorted(keyed.items()))}")
    print(f"Wrote: {os.path.join(out_dir, 'exam_data.json')}")
    print(f"Wrote: {os.path.join(out_dir, 'exam_data.js')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())