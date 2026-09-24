#!/usr/bin/env python3
"""validate_bank.py - CEO acceptance gate for the CompTIA A+ v3 question bank.

Modes:
  --bank <path>       validate a merged bank file (default APP_DIR/exam_data.json)
  --core core1|core2  restrict bank validation to one core
  --shard <path>      validate a single shard file (agent self-check)

Hard failures: schema violations, unknown domains/objectives, answer leakage,
markdown artifacts, template-stub explanations, short explanations, duplicate
options/stems, video/objective mismatch, answer-key imbalance, undersized banks.
Warnings: missing notes files, missing video references, scenario ratio.
"""
import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_DIR = os.path.join(ROOT, "CompTIA_A_Plus_Desktop_App", "resources", "app")

BANNED_PHRASES = [
    "this is a key requirement",
    "official core 1 reference",
    "official core 2 reference",
    "review comptia objectives",
    "essential knowledge for comptia",
]
LEAK_RE = re.compile(r"\*\*answer|\*\*correct|answer\s*:|✅|✔|correct answer\s*:", re.IGNORECASE)
MD_RE = re.compile(r"\*\*|####|^\s*#{1,6}\s", re.MULTILINE)
POSITIONAL_RE = re.compile(
    r"(all|none|both|either|neither)\s+of\s+(the\s+)?(above|these|following)"
    r"|\boptions?\s+[abcd]\b|\banswers?\s+[abcd]\b",
    re.IGNORECASE,
)

MIN_EXPL = 120
BALANCE_MIN, BALANCE_MAX = 0.15, 0.35


def load_objectives(core):
    path = os.path.join(ROOT, "tools", "objectives_220_1202.json")
    prov = os.path.join(ROOT, "tools", "objectives_220_1202_provisional.json")
    if core == "core1":
        path = os.path.join(ROOT, "tools", "objectives_220_1201.json")
    elif os.path.isfile(path):
        path = path  # verified 1202 wins
    else:
        path = prov
    with open(path, encoding="utf-8") as f:
        return json.load(f)["objectives"]


def validate_qs(questions, core, errors, warnings):
    objs = load_objectives(core)
    notes_dir = os.path.join(APP_DIR, "notes")
    stems = {}
    for q in questions:
        qid = q.get("id", "?")
        where = f"[{core}:{qid}]"
        # schema basics
        for k in ("id", "exam", "domain", "objective", "question", "explanation"):
            if not q.get(k):
                errors.append(f"{where} missing {k}")
        if q.get("exam") != core:
            errors.append(f"{where} exam field mismatch")
        # domain strings
        # (validated against blueprint keys below)
        # objective known?
        if q.get("objective") and q["objective"] not in objs:
            errors.append(f"{where} unknown objective '{q['objective']}'")
        elif q.get("objective") and objs.get(q["objective"], {}).get("domain") != q.get("domain"):
            errors.append(f"{where} objective {q['objective']} does not belong to domain '{q.get('domain')}'")
        # leakage + markdown
        blob_opts = " ".join(q.get("options", []) or [])
        for field, val in (("question", q.get("question", "")), ("options", blob_opts), ("explanation", q.get("explanation", ""))):
            if LEAK_RE.search(val or ""):
                errors.append(f"{where} answer leakage marker in {field}")
            if MD_RE.search(val or ""):
                errors.append(f"{where} markdown artifact in {field}")
        # banned stub phrases + length
        expl = (q.get("explanation") or "").strip()
        low = expl.lower()
        for p in BANNED_PHRASES:
            if p in low:
                errors.append(f"{where} template-stub explanation phrase '{p}'")
        if len(expl) < MIN_EXPL:
            errors.append(f"{where} explanation too short ({len(expl)} chars, min {MIN_EXPL})")
        # options unique
        opts = q.get("options", [])
        if opts and len(set(o.strip().lower() for o in opts)) != len(opts):
            errors.append(f"{where} duplicate option texts")
        # positional refs
        if POSITIONAL_RE.search((q.get("question") or "") + " " + blob_opts):
            errors.append(f"{where} positional reference in stem/options (breaks option shuffling)")
        # type-specific
        t = q.get("type", "single")
        if t == "single":
            if len(opts) != 4 or not isinstance(q.get("answer"), int) or not (0 <= q["answer"] < 4):
                errors.append(f"{where} single schema violation")
        elif t == "multi":
            if len(opts) != 5 or len(q.get("answers", [])) != 2 or "(Select TWO.)" not in q.get("question", ""):
                errors.append(f"{where} multi schema violation")
            if sorted(q.get("answers", [])) != q.get("answers", []):
                errors.append(f"{where} multi answers must be sorted ascending")
        elif t == "match":
            if not (4 <= len(q.get("pairs", [])) <= 5):
                errors.append(f"{where} match needs 4-5 pairs")
            for p in q.get("pairs", []):
                if not p.get("left") or not p.get("right"):
                    errors.append(f"{where} malformed pair")
        elif t == "order":
            if not (4 <= len(q.get("sequence", [])) <= 6):
                errors.append(f"{where} order needs 4-6 steps")
        else:
            errors.append(f"{where} unknown type '{t}'")
        # distractor analysis strongly recommended for single/multi
        if t in ("single", "multi") and not q.get("distractor_analysis"):
            warnings.append(f"{where} no distractor_analysis (recommended)")
        # A note on the keyed answer means the key and the notes disagree about
        # which option is correct. Every occurrence so far has been a genuinely
        # wrong answer reaching learners, so this is an error rather than a
        # warning. See the auto_balance rotation bug fixed on 2026-09-06.
        da = q.get("distractor_analysis")
        if t == "single" and isinstance(da, dict) and da:
            if str(q.get("answer")) in da:
                errors.append(
                    f"{where} distractor_analysis has a note on the keyed answer "
                    f"(index {q.get('answer')}); the key and the notes disagree"
                )
            stray = [k for k in da if not str(k).isdigit() or int(k) >= len(opts or [])]
            if stray:
                errors.append(f"{where} distractor_analysis keys out of range: {stray}")
        # video objective must match
        vr = q.get("video_reference")
        if vr:
            if vr.get("objective") != q.get("objective"):
                errors.append(f"{where} video_reference.objective {vr.get('objective')} != question objective {q.get('objective')}")
            if not vr.get("url", "").startswith("https://www.youtube.com/watch?v="):
                errors.append(f"{where} video_reference.url malformed")
        # notes file
        nr = q.get("notes_reference")
        if nr:
            if not os.path.isfile(os.path.join(notes_dir, nr)):
                warnings.append(f"{where} notes file not yet bundled: {nr}")
        else:
            warnings.append(f"{where} no notes_reference")
        # duplicate stems
        stem = re.sub(r"\s+", " ", q.get("question", "")).strip().lower()
        if len(stem) > 40:
            if stem in stems:
                errors.append(f"{where} duplicate stem with {stems[stem]}")
            else:
                stems[stem] = qid
    return questions


def validate_bank(bank, only_core=None, errors=None, warnings=None):
    # NB: `errors = errors or []` would REPLACE an empty list and lose the
    # caller's reference; use explicit None checks.
    if errors is None:
        errors = []
    if warnings is None:
        warnings = []
    report = {}
    cores = ["core1", "core2"] if not only_core else [only_core]
    for core in cores:
        qs = bank.get(core, [])
        objs = load_objectives(core)
        allowed_domains = sorted({v["domain"] for v in objs.values()})
        for d in sorted({q.get("domain") for q in qs}):
            if d not in allowed_domains:
                errors.append(f"[{core}] unknown domain string: {d}")
        validate_qs(qs, core, errors, warnings)
        # balance for single
        singles = [q for q in qs if q.get("type", "single") == "single"]
        if singles:
            keyed = Counter(q["answer"] for q in singles)
            n = len(singles)
            for pos in range(4):
                frac = keyed.get(pos, 0) / n
                if frac < BALANCE_MIN or frac > BALANCE_MAX:
                    errors.append(f"[{core}] keyed position {pos} = {frac:.1%} outside {BALANCE_MIN:.0%}-{BALANCE_MAX:.0%}")
        # bank size vs blueprint (90-question weighted draw needs headroom)
        blueprint = {v["domain"] for v in objs.values()}
        doms = Counter(q.get("domain") for q in qs)
        for d in allowed_domains:
            if doms.get(d, 0) < 25:
                errors.append(f"[{core}] domain '{d}' has only {doms.get(d, 0)} questions (min 25)")
        report[core] = {
            "total": len(qs),
            "domains": dict(doms),
            "types": dict(Counter(q.get("type", "single") for q in qs)),
            "with_video": sum(1 for q in qs if q.get("video_reference")),
            "scenario_like": sum(1 for q in qs if len(q.get("question", "")) >= 100 and re.search(r"a user|a technician|a customer|reports|scenario|your|the help desk", q.get("question", ""), re.I)),
        }
    return report


def load_item_analysis(path):
    """Load _bank/analysis/item_stats.json shaped as {question_id: stats} or {items: {...}}."""
    if not path or not os.path.isfile(path):
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and isinstance(data.get("items"), dict):
        return data["items"]
    if isinstance(data, dict):
        return data
    return {}


def warn_item_analysis(qs, analysis, warnings):
    """Flag bank items that community analysis marks as too easy/hard/miskeyed."""
    if not analysis:
        return
    by_id = {q.get("id"): q for q in qs if isinstance(q, dict) and q.get("id")}
    for qid, stats in analysis.items():
        if not isinstance(stats, dict):
            continue
        if qid not in by_id:
            continue
        sample = stats.get("sample_size") or stats.get("n") or 0
        try:
            sample = int(sample)
        except (TypeError, ValueError):
            sample = 0
        if sample < 30:
            continue
        p = stats.get("p_value", stats.get("p"))
        try:
            p = float(p) if p is not None else None
        except (TypeError, ValueError):
            p = None
        pb = stats.get("point_biserial", stats.get("pb"))
        try:
            pb = float(pb) if pb is not None else None
        except (TypeError, ValueError):
            pb = None
        flagged = bool(stats.get("flagged_miskey") or stats.get("flagged"))
        where = f"{qid}"
        if flagged:
            warnings.append(f"{where} item analysis flagged_miskey (n={sample})")
        if p is not None and p > 0.95:
            warnings.append(f"{where} item analysis p_value={p:.3f} too easy (n={sample})")
        if p is not None and p < 0.2:
            warnings.append(f"{where} item analysis p_value={p:.3f} too hard or broken (n={sample})")
        if pb is not None and pb < 0:
            warnings.append(f"{where} item analysis point_biserial={pb:.3f} negative discrimination")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bank", default=os.path.join(APP_DIR, "exam_data.json"))
    ap.add_argument("--core", choices=["core1", "core2"])
    ap.add_argument("--shard")
    ap.add_argument(
        "--analysis",
        default=os.path.join(ROOT, "_bank", "analysis", "item_stats.json"),
        help="Optional community item_stats.json for quality warnings",
    )
    args = ap.parse_args()

    errors, warnings = [], []
    analysis = load_item_analysis(args.analysis) if args.analysis else {}
    all_qs = []
    if args.shard:
        with open(args.shard, encoding="utf-8") as f:
            data = json.load(f)
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list) or not qs:
            print("SHARD INVALID: not a non-empty list of questions.")
            return 1
        cores = sorted({q.get("exam") for q in qs})
        for core in cores:
            validate_qs([q for q in qs if q.get("exam") == core], core, errors, warnings)
        all_qs = qs
        print(f"Shard: {os.path.basename(args.shard)} ({len(qs)} questions, cores={cores})")
    else:
        bank_path = args.bank
        if not os.path.isfile(bank_path):
            bank_path = os.path.join(ROOT, "exam_data.json")
        with open(bank_path, encoding="utf-8") as f:
            bank = json.load(f)
        report = validate_bank(bank, args.core, errors, warnings)
        for core, r in report.items():
            print(f"{core}: {r['total']} questions")
            print(f"  domains: {r['domains']}")
            print(f"  types: {r['types']}")
            print(f"  with video refs: {r['with_video']} | scenario-style: {r['scenario_like']}")
        for core in ("core1", "core2"):
            block = bank.get(core) or []
            if isinstance(block, dict):
                block = block.get("questions") or []
            if isinstance(block, list):
                all_qs.extend(block)

    warn_item_analysis(all_qs, analysis, warnings)

    print()
    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for w in warnings[:40]:
            print("  ~", w)
        if len(warnings) > 40:
            print(f"  ... {len(warnings) - 40} more")
    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors[:60]:
            print("  x", e)
        if len(errors) > 60:
            print(f"  ... {len(errors) - 60} more")
        return 1
    print("VALIDATION PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
