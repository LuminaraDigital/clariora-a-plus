import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "tools", "c2_raw_dump.json"), encoding="utf-8") as f:
    c2 = json.load(f)

for i in range(142, 200):
    q = c2[i]
    ans_idx = q['answer']
    ans_text = q['options'][ans_idx]
    stem = q['question'].encode('ascii', 'replace').decode('ascii')
    print(f"{q['id']}|{q.get('domain')}|{stem[:60]}|{ans_idx}|{ans_text[:30]}")
