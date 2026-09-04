"""Dump compact view of Core 2 questions for review. Usage: python tools/c2_dump.py <start> <end>"""
import json, sys

ROOT = r"C:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+"
APP = ROOT + "/CompTIA_A_Plus_Desktop_App/resources/app/exam_data.json"

start, end = int(sys.argv[1]), int(sys.argv[2])
with open(APP, encoding="utf-8") as f:
    qs = json.load(f)["core2"]

for q in qs:
    n = int(q["id"].split("-")[1])
    if start <= n <= end:
        letters = "ABCD"
        print(f"### {q['id']} [{q['domain']}] ans={letters[q['answer']]}")
        print(f"Q: {q['question']}")
        for i, o in enumerate(q["options"]):
            mark = "*" if i == q["answer"] else " "
            print(f"  {letters[i]}{mark} {o}")
        e = q["explanation"].replace("\n", " ")
        print(f"E: {e[:230]}")
        print()