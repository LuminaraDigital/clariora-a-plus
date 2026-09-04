"""
build_objectives_data.py
Builds objectives_data.json/js checklist for Core 1 (220-1201) and Core 2 (220-1202).
Prefer tools/objectives_*.json; Core 2 titles aligned to Professor Messer V15 public outline.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(".")

# Core 2 V15 objective titles aligned to Professor Messer 220-1202 course index
CORE2_OBJECTIVES = [
    ("1.1", "1.0 Operating Systems", "Operating systems overview and file systems"),
    ("1.2", "1.0 Operating Systems", "Installing and upgrading operating systems"),
    ("1.3", "1.0 Operating Systems", "Microsoft Windows editions and features"),
    ("1.4", "1.0 Operating Systems", "Task Manager, MMC, and additional Windows tools"),
    ("1.5", "1.0 Operating Systems", "Windows command line and network command line"),
    ("1.6", "1.0 Operating Systems", "Windows Control Panel and Settings"),
    ("1.7", "1.0 Operating Systems", "Windows networking, firewall, and IP configuration"),
    ("1.8", "1.0 Operating Systems", "macOS configuration and features"),
    ("1.9", "1.0 Operating Systems", "Linux overview and command line"),
    ("1.10", "1.0 Operating Systems", "Installing applications"),
    ("1.11", "1.0 Operating Systems", "Cloud productivity and collaboration tools"),
    ("2.1", "2.0 Security", "Physical, logical, and authentication-based security"),
    ("2.2", "2.0 Security", "Windows security: Defender, firewall, settings, Active Directory"),
    ("2.3", "2.0 Security", "Wireless encryption and authentication methods"),
    ("2.4", "2.0 Security", "Malware types and anti-malware tools"),
    ("2.5", "2.0 Security", "Social engineering and attack types"),
    ("2.6", "2.0 Security", "Removing malware and remediation"),
    ("2.7", "2.0 Security", "Security best practices"),
    ("2.8", "2.0 Security", "Mobile device security"),
    ("2.9", "2.0 Security", "Data destruction and disposal"),
    ("2.10", "2.0 Security", "Securing a SOHO network"),
    ("2.11", "2.0 Security", "Browser security"),
    ("3.1", "3.0 Software Troubleshooting", "Troubleshooting Windows"),
    ("3.2", "3.0 Software Troubleshooting", "Troubleshooting mobile device OS and apps"),
    ("3.3", "3.0 Software Troubleshooting", "Troubleshooting mobile device security"),
    ("3.4", "3.0 Software Troubleshooting", "Troubleshooting security issues"),
    ("4.1", "4.0 Operational Procedures", "Documentation, ticketing, assets, and document types"),
    ("4.2", "4.0 Operational Procedures", "Change management"),
    ("4.3", "4.0 Operational Procedures", "Backup and recovery"),
    ("4.4", "4.0 Operational Procedures", "Safety procedures and ESD"),
    ("4.5", "4.0 Operational Procedures", "Environmental impacts and controls"),
    ("4.6", "4.0 Operational Procedures", "Incident response, privacy, licensing, and policies"),
    ("4.7", "4.0 Operational Procedures", "Professionalism and communication"),
    ("4.8", "4.0 Operational Procedures", "Scripting languages and use cases"),
    ("4.9", "4.0 Operational Procedures", "Remote access and support tools"),
    ("4.10", "4.0 Operational Procedures", "Managing AI in IT operations"),
]


def load_core1_from_tools() -> list[dict]:
    path = ROOT / "tools" / "objectives_220_1201.json"
    items = []
    if not path.exists():
        return items
    data = json.loads(path.read_text(encoding="utf-8"))
    for code, meta in data.get("objectives", {}).items():
        items.append({
            "id": f"c1-{code.replace('.', '-')}",
            "exam": "core1",
            "exam_code": "220-1201",
            "domain": meta["domain"],
            "code": code,
            "title": meta["desc"],
            "checked": False,
        })
    return items


def build_core2() -> list[dict]:
    items = []
    for code, domain, title in CORE2_OBJECTIVES:
        items.append({
            "id": f"c2-{code.replace('.', '-')}",
            "exam": "core2",
            "exam_code": "220-1202",
            "domain": domain,
            "code": code,
            "title": title,
            "checked": False,
        })
    return items


def main():
    core1 = load_core1_from_tools()
    core2 = build_core2()
    objectives = core1 + core2

    # Also refresh tools provisional Core 2 file to match V15
    provisional = {
        "exam": "220-1202",
        "title": "CompTIA A+ Core 2 (220-1202) v15 Objectives",
        "note": "Aligned to Professor Messer public 220-1202 course outline (domains 1.1-4.10).",
        "blueprint": {
            "1.0 Operating Systems": 28,
            "2.0 Security": 28,
            "3.0 Software Troubleshooting": 23,
            "4.0 Operational Procedures": 21,
        },
        "objectives": {
            code: {"domain": domain, "desc": title}
            for code, domain, title in CORE2_OBJECTIVES
        },
    }
    tools_path = ROOT / "tools" / "objectives_220_1202_provisional.json"
    tools_path.write_text(json.dumps(provisional, indent=2), encoding="utf-8")

    payload = {
        "version": "1.0",
        "title": "CompTIA A+ Official Objectives Checklist",
        "description": "Core 1 (220-1201) and Core 2 (220-1202) domain/objective checklist. Progress persists in localStorage key comptia_objectives_progress_v1.",
        "storage_key": "comptia_objectives_progress_v1",
        "exams": {
            "core1": {"code": "220-1201", "name": "Core 1", "count": len(core1)},
            "core2": {"code": "220-1202", "name": "Core 2", "count": len(core2)},
        },
        "objectives": objectives,
    }

    ROOT.joinpath("objectives_data.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    ROOT.joinpath("objectives_data.js").write_text(
        "window.COMPTIA_OBJECTIVES_DATA = "
        + json.dumps(payload, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Objectives built: total={len(objectives)} core1={len(core1)} core2={len(core2)}")


if __name__ == "__main__":
    main()
