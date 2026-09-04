import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "tools", "c2_raw_dump.json"), encoding="utf-8") as f:
    c2 = json.load(f)

for q in c2:
    qid = q["id"]
    stem = q["question"]
    opts = q["options"]
    ans = q["answer"]
    expl = q.get("explanation", "")
    print(f"{qid}|{q.get('domain')}|{q.get('video_reference', {}).get('objective')}|{stem}|{opts}|{ans}|{expl}")
