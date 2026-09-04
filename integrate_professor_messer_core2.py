"""
integrate_professor_messer_core2.py
1. Builds PROFESSOR_MESSER_220_1202_INDEX.md from professor_messer_220_1202_videos.json
2. Enriches Core 2 exam questions with video_reference where domain mapping is reasonable
3. Appends PROFESSOR_MESSER_1202_VIDEOS to exam_data.js without removing Core 1 Messer data
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(".")

with open("professor_messer_220_1202_videos.json", "r", encoding="utf-8") as f:
    videos = json.load(f)

domain_map = {
    "1.1": "1.0 Operating Systems",
    "1.2": "1.0 Operating Systems",
    "1.3": "1.0 Operating Systems",
    "1.4": "1.0 Operating Systems",
    "1.5": "1.0 Operating Systems",
    "1.6": "1.0 Operating Systems",
    "1.7": "1.0 Operating Systems",
    "1.8": "1.0 Operating Systems",
    "1.9": "1.0 Operating Systems",
    "1.10": "1.0 Operating Systems",
    "1.11": "1.0 Operating Systems",
    "2.1": "2.0 Security",
    "2.2": "2.0 Security",
    "2.3": "2.0 Security",
    "2.4": "2.0 Security",
    "2.5": "2.0 Security",
    "2.6": "2.0 Security",
    "2.7": "2.0 Security",
    "2.8": "2.0 Security",
    "2.9": "2.0 Security",
    "2.10": "2.0 Security",
    "2.11": "2.0 Security",
    "3.1": "3.0 Software Troubleshooting",
    "3.2": "3.0 Software Troubleshooting",
    "3.3": "3.0 Software Troubleshooting",
    "3.4": "3.0 Software Troubleshooting",
    "4.1": "4.0 Operational Procedures",
    "4.2": "4.0 Operational Procedures",
    "4.3": "4.0 Operational Procedures",
    "4.4": "4.0 Operational Procedures",
    "4.5": "4.0 Operational Procedures",
    "4.6": "4.0 Operational Procedures",
    "4.7": "4.0 Operational Procedures",
    "4.8": "4.0 Operational Procedures",
    "4.9": "4.0 Operational Procedures",
    "4.10": "4.0 Operational Procedures",
}

note_map = {
    "1.0": "CompTIA_A_Plus_Mastery/04_CORE2_WINDOWS_OPERATING_SYSTEMS.md",
    "2.0": "CompTIA_A_Plus_Mastery/06_CORE2_SECURITY_AND_SOHO_HARDENING.md",
    "3.0": "CompTIA_A_Plus_Mastery/09_CHEAT_SHEET_PORTS_COMMANDS_TROUBLESHOOTING.md",
    "4.0": "CompTIA_A_Plus_Mastery/07_CORE2_OPERATIONAL_PROCEDURES_AND_SAFETY.md",
}

md_lines = [
    "# Professor Messer CompTIA A+ 220-1202 Training Course Directory",
    "",
    "This index maps videos from [Professor Messer CompTIA A+ 220-1202 Playlist](https://www.youtube.com/playlist?list=PLG49S3nxzAnn7PDGQ17m5AYbDRhnW7vOb) to CompTIA Core 2 objectives.",
    "",
    "## Course Overview",
    f"- Total Videos: {len(videos)}",
    "- Target Exam: CompTIA A+ Core 2 (220-1202)",
    "- Playlist URL: https://www.youtube.com/playlist?list=PLG49S3nxzAnn7PDGQ17m5AYbDRhnW7vOb",
    "- Course hub: https://www.professormesser.com/free-a-plus-training/220-1202/220-1202-video/220-1202-training-course/",
    "",
    "## Video Index by Domain",
    "",
    "| # | Objective | Video Title | Duration | YouTube Link | Local Note |",
    "|---|---|---|---|---|---|",
]

for v in videos:
    obj = v["objective"]
    dom_title = domain_map.get(obj, "Core 2 General")
    dom_prefix = dom_title[:3]
    note_path = note_map.get(dom_prefix, "CompTIA_A_Plus_Mastery/00_EXAM_STRATEGY_AND_ROADMAP.md")
    note_name = note_path.split("/")[-1]
    md_lines.append(
        f"| {v['index']} | **{obj}** | {v['title']} | `{v['duration']}` | "
        f"[Watch]({v['url']}) | [{note_name}]({note_path}) |"
    )

Path("PROFESSOR_MESSER_220_1202_INDEX.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")
print(f"Created PROFESSOR_MESSER_220_1202_INDEX.md ({len(videos)} videos)")

# Keyword helpers for Core 2 enrichment
KEYWORD_MAP = [
    (["bitlocker", "encrypt", "volume encryption"], "2.7"),
    (["ransomware", "malware", "trojan", "rootkit", "keylogger", "spyware"], "2.4"),
    (["phishing", "tailgat", "social engineering", "bec", "shoulder"], "2.5"),
    (["firewall", "defender"], "2.2"),
    (["radius", "wpa3", "wpa2", "802.1x", "wireless"], "2.3"),
    (["mdm", "remote wipe", "mobile device security", "jailbreak"], "2.8"),
    (["degauss", "shred", "destruction", "certificate of destruction"], "2.9"),
    (["soho", "default password", "firmware update"], "2.10"),
    (["browser", "certificate warning", "extension"], "2.11"),
    (["least privilege", "mfa", "multifactor", "jit", "tailgat", "badge"], "2.1"),
    (["active directory", "gpo", "group policy"], "2.2"),
    (["bsod", "safe mode", "winre", "startup repair", "dism", "sfc", "spooler"], "3.1"),
    (["mobile app", "battery drain", "airplane mode", "cellular"], "3.2"),
    (["scareware", "false antivirus", "malware removal", "quarantine"], "2.6"),
    (["change management", "cab", "rollback"], "4.2"),
    (["backup", "3-2-1", "incremental", "differential", "synthetic"], "4.3"),
    (["esd", "grounding", "lifting", "msds", "sds", "toner"], "4.4"),
    (["ticket", "sla", "cmdb", "asset tag", "sop", "onboarding", "offboarding"], "4.1"),
    (["chain of custody", "order of volatility", "incident", "eula", "privacy"], "4.6"),
    (["powershell", "bash", "script"], "4.8"),
    (["rdp", "vpn", "winrm", "rmm", "remote"], "4.9"),
    (["artificial intelligence", "ai copilot", "hallucination"], "4.10"),
    (["professional", "communication", "jargon"], "4.7"),
    (["linux", "chmod", "chown", "systemd", "grep", "tail -f"], "1.9"),
    (["macos", "filevault", "time machine", "spotlight", "keychain"], "1.8"),
    (["gpt", "mbr", "partition", "pxe", "autopilot", "wds"], "1.2"),
    (["task manager", "mmc", "eventvwr", "compmgmt"], "1.4"),
    (["gpupdate", "gpresult", "netstat", "ipconfig", "robocopy", "diskpart"], "1.5"),
    (["ntfs", "file system", "exfat", "apfs"], "1.1"),
]


def pick_video(question: str, domain: str):
    q = question.lower()
    preferred_obj = None
    for keys, obj in KEYWORD_MAP:
        if any(k in q for k in keys):
            preferred_obj = obj
            break
    if not preferred_obj:
        if domain.startswith("1."):
            preferred_obj = "1.1"
        elif domain.startswith("2."):
            preferred_obj = "2.4"
        elif domain.startswith("3."):
            preferred_obj = "3.1"
        elif domain.startswith("4."):
            preferred_obj = "4.1"
        else:
            preferred_obj = "1.1"

    matches = [v for v in videos if v.get("objective") == preferred_obj]
    if not matches:
        # fallback: first video in same domain prefix
        prefix = preferred_obj.split(".")[0] + "."
        matches = [v for v in videos if str(v.get("objective", "")).startswith(prefix)]
    if not matches:
        matches = videos[:1]
    return matches[0]


with open("exam_data.json", "r", encoding="utf-8") as f:
    db = json.load(f)

enriched = 0
for q in db.get("core2", []):
    if q.get("video_reference"):
        continue
    vid = pick_video(q.get("question", ""), q.get("domain", ""))
    q["video_reference"] = {
        "title": vid["title"],
        "url": vid["url"],
        "duration": vid["duration"],
        "objective": vid["objective"],
    }
    enriched += 1

# Preserve any existing Core 1 video refs; rewrite json + js with both playlists
with open("professor_messer_220_1201_videos.json", "r", encoding="utf-8") as f:
    videos_1201 = json.load(f)

with open("exam_data.json", "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2)

with open("exam_data.js", "w", encoding="utf-8") as f:
    f.write("window.COMPTIA_EXAM_DATA = ")
    json.dump(db, f, indent=2)
    f.write(";\n")
    f.write("window.PROFESSOR_MESSER_1201_VIDEOS = ")
    json.dump(videos_1201, f, indent=2)
    f.write(";\n")
    f.write("window.PROFESSOR_MESSER_1202_VIDEOS = ")
    json.dump(videos, f, indent=2)
    f.write(";\n")

print(f"Enriched {enriched} Core 2 questions with video_reference")
print("Updated exam_data.json/js with PROFESSOR_MESSER_1201_VIDEOS and PROFESSOR_MESSER_1202_VIDEOS")
