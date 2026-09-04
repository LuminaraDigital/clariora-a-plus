import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import c2_utils

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "tools", "c2_raw_dump.json"), encoding="utf-8") as f:
    c2 = json.load(f)

print(f"Total raw questions: {len(c2)}")
for i, q in enumerate(c2):
    qid = q.get("id")
    vrobj = q.get("video_reference", {}).get("objective")
    dom = q.get("domain")
    stem = q.get("question")
    ans = q.get("answer")
    opts = q.get("options", [])
    ans_text = opts[ans] if isinstance(ans, int) and 0 <= ans < len(opts) else "?"
    expl = q.get("explanation", "")
    
    # Check if objective is valid
    obj_valid = vrobj in c2_utils.OBJECTIVES
    dom_match = obj_valid and c2_utils.get_domain(vrobj) == dom
    
    if not obj_valid or not dom_match:
        print(f"Mismatch in {qid}: dom='{dom}', vrobj='{vrobj}', valid={obj_valid}, match={dom_match}")
