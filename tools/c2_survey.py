"""Survey the Core 2 source bank: structure, defects, domains, answer distribution."""
import json, re, sys
from collections import Counter

ROOT = r"C:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+"
APP = ROOT + "/CompTIA_A_Plus_Desktop_App/resources/app/exam_data.json"

with open(APP, encoding="utf-8") as f:
    bank = json.load(f)

qs = bank["core2"]
print("count:", len(qs))
print("keys of q[0]:", sorted(qs[0].keys()))
print("exams:", Counter(q.get("exam") for q in qs))
print("domains:", Counter(q.get("domain") for q in qs))
print("types:", Counter(q.get("type") for q in qs))
print("difficulty:", Counter(q.get("difficulty") for q in qs))
print("answer idx:", Counter(q.get("answer") for q in qs))

STUB_RE = re.compile(r"Official Core 2 reference|This is a key requirement|Review CompTIA objectives|Essential knowledge for CompTIA", re.I)
stubs = []
short = []
md = []
positional = []
title_lines = []
no_expl_da = []
opt_counts = Counter()
dup_opts = []

for q in qs:
    e = q.get("explanation") or ""
    if STUB_RE.search(e) or len(e.strip()) < 120:
        (stubs if STUB_RE.search(e) else short).append(q["id"])
    if re.search(r"\*\*|####|^#{1,6}\s", (q.get("question") or "") + (q.get("explanation") or "") + " ".join(q.get("options") or []), re.M):
        md.append(q["id"])
    blob = (q.get("question") or "") + " " + " ".join(q.get("options") or [])
    if re.search(r"(all|none|both|either|neither)\s+of\s+(the\s+)?(above|these|following)|\boptions?\s+[abcd]\b|\banswers?\s+[abcd]\b", blob, re.I):
        positional.append(q["id"])
    if re.search(r"^(Question|Q)\s*\d+\s*[:.]?\s*$", (q.get("question") or ""), re.M) or re.match(r"^\s*Core\s*2\s*[:.-]", q.get("question") or "", re.I):
        title_lines.append(q["id"])
    opts = q.get("options") or []
    opt_counts[len(opts)] += 1
    if len(set(o.strip().lower() for o in opts)) != len(opts):
        dup_opts.append(q["id"])
    if not q.get("distractor_analysis"):
        no_expl_da.append(q["id"])

print("\nstub-phrase explanations:", len(stubs), stubs[:80])
print("short (<120) explanations:", len(short), short[:40])
print("union stub+short:", len(set(stubs) | set(short)))
print("markdown artifacts:", len(md), md[:20])
print("positional refs:", len(positional), positional[:20])
print("title-line stems:", len(title_lines), title_lines[:20])
print("option counts:", dict(opt_counts))
print("duplicate options:", len(dup_opts), dup_opts[:20])
print("missing distractor_analysis:", len(no_expl_da))

# emoji check
emoji = [q["id"] for q in qs if re.search(r"[\U0001F300-\U0001FAFF\u2705\u2714\u2708\u2190-\u21FF\u2600-\u27BF]", json.dumps(q, ensure_ascii=False))]
print("emoji-containing:", len(emoji), emoji[:20])

# em dash check
em = [q["id"] for q in qs if "\u2014" in json.dumps(q, ensure_ascii=False)]
print("em-dash-containing:", len(em), em[:20])

# sample one full question
print("\n--- sample q[0] ---")
print(json.dumps(qs[0], indent=1)[:1500])
print("\n--- sample q[40] ---")
print(json.dumps(qs[40], indent=1)[:1500])