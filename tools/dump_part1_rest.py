import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "tools", "c2_raw_dump.json"), encoding="utf-8") as f:
    c2 = json.load(f)

for i in range(25, 75):
    q = c2[i]
    ans_idx = q['answer']
    ans_text = q['options'][ans_idx]
    # replace non-ascii
    stem = q['question'].encode('ascii', 'replace').decode('ascii')
    print(f"{q['id']}|{stem}|{q['options']}|{ans_idx}")
