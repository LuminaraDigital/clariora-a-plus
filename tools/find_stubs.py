import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "CompTIA_A_Plus_Desktop_App", "resources", "app", "exam_data.json"), encoding="utf-8") as f:
    c2 = json.load(f)["core2"]

print(f"Total C2 questions: {len(c2)}")
for i, q in enumerate(c2):
    qid = q["id"]
    dom = q["domain"]
    stem = q["question"]
    ans = q["answer"]
    opts = q["options"]
    expl = q["explanation"]
    # Check if stem or expl needs overhaul
    is_stub = "Official Core 2 reference" in expl or len(expl.strip()) < 120
    if is_stub:
        print(f"[{i}] {qid} STUB: {stem[:70]} | Ans: {opts[ans]}")
