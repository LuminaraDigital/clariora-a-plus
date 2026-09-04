"""
integrate_professor_messer.py
Integrates Professor Messer's CompTIA A+ 220-1201 Training Course playlist:
1. Creates PROFESSOR_MESSER_220_1201_INDEX.md with all 63 videos organized by domain.
2. Enriches exam_data.json and exam_data.js with direct video URLs and lesson titles for every Core 1 question.
"""

import json
import os
import re

with open("professor_messer_220_1201_videos.json", "r", encoding="utf-8") as f:
    videos = json.load(f)

# Build the Markdown Index
md_lines = [
    "# Professor Messer's CompTIA A+ 220-1201 Training Course Directory",
    "",
    "This master index maps every video from [Professor Messer's CompTIA A+ 220-1201 Playlist](https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8) to its official CompTIA objective, video link, runtime, and corresponding local deep-dive notes.",
    "",
    "---",
    "",
    "## 📊 Course Overview",
    f"- **Total Videos**: {len(videos)} videos",
    "- **Target Exam**: CompTIA A+ Core 1 (220-1201)",
    "- **Playlist URL**: [YouTube Playlist](https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8)",
    "",
    "---",
    "",
    "## 📋 Comprehensive Video Index by Domain",
    ""
]

# Group by Domain
domain_map = {
    "Overview": "0.0 Exam Strategy & Introduction",
    "1.1": "1.0 Mobile Devices",
    "1.2": "1.0 Mobile Devices",
    "1.3": "1.0 Mobile Devices",
    "2.1": "2.0 Networking",
    "2.2": "2.0 Networking",
    "2.3": "2.0 Networking",
    "2.4": "2.0 Networking",
    "2.5": "2.0 Networking",
    "2.6": "2.0 Networking",
    "2.7": "2.0 Networking",
    "2.8": "2.0 Networking",
    "3.1": "3.0 Hardware",
    "3.2": "3.0 Hardware",
    "3.3": "3.0 Hardware",
    "3.4": "3.0 Hardware",
    "3.5": "3.0 Hardware",
    "3.6": "3.0 Hardware",
    "3.7": "3.0 Hardware",
    "3.8": "3.0 Hardware",
    "4.1": "4.0 Virtualization and Cloud Computing",
    "4.2": "4.0 Virtualization and Cloud Computing",
    "5.1": "5.0 Hardware and Network Troubleshooting",
    "5.2": "5.0 Hardware and Network Troubleshooting",
    "5.3": "5.0 Hardware and Network Troubleshooting",
    "5.4": "5.0 Hardware and Network Troubleshooting",
    "5.5": "5.0 Hardware and Network Troubleshooting",
    "5.6": "5.0 Hardware and Network Troubleshooting"
}

# Note mappings
note_map = {
    "1.0": "CompTIA_A_Plus_Mastery/DEEP_DIVE/15_Mobile_Devices_and_Laptops.md",
    "2.0": "CompTIA_A_Plus_Mastery/DEEP_DIVE/11_Internet_Connections_TCPIP_Addressing.md",
    "3.0": "CompTIA_A_Plus_Mastery/DEEP_DIVE/04_Motherboards_Expansion_Cards.md",
    "4.0": "CompTIA_A_Plus_Mastery/DEEP_DIVE/14_Virtualization_and_Cloud.md",
    "5.0": "CompTIA_A_Plus_Mastery/DEEP_DIVE/02_Troubleshooting_Methodology.md"
}

current_domain_title = None

md_lines.append("| # | Objective | Video Title | Duration | YouTube Link | Local Deep Dive Note |")
md_lines.append("|---|---|---|---|---|---|")

for v in videos:
    obj = v['objective']
    dom_title = domain_map.get(obj, "Core 1 General")
    dom_prefix = dom_title[:3]
    note_path = note_map.get(dom_prefix, "CompTIA_A_Plus_Mastery/DEEP_DIVE/00_README_INDEX.md")
    note_name = note_path.split("/")[-1]
    
    md_lines.append(f"| {v['index']} | **{obj}** | {v['title']} | `{v['duration']}` | [Watch Video]({v['url']}) | [{note_name}](file:///{note_path}) |")

with open("PROFESSOR_MESSER_220_1201_INDEX.md", "w", encoding="utf-8") as f:
    f.write("\n".join(md_lines))

print("Created PROFESSOR_MESSER_220_1201_INDEX.md successfully!")

# Enrich exam_data.json and exam_data.js
with open("exam_data.json", "r", encoding="utf-8") as f:
    db = json.load(f)

# Helper function to find best matching Professor Messer video for a Core 1 question
def find_matching_video(question_text, domain_name):
    q_lower = question_text.lower()
    
    # Keyword checks
    if any(k in q_lower for k in ['port', 'ssh', 'rdp', 'http', 'https', 'dns', 'dhcp', 'ftp', 'smtp', 'imap', 'pop3', 'telnet', 'snmp', 'ldap']):
        return [v for v in videos if "Common Ports" in v['title'] or "DHCP" in v['title'] or "DNS" in v['title']][0]
    if any(k in q_lower for k in ['568a', '568b', 'pin 1', 'pinout', 'rj-45']):
        return [v for v in videos if "568A and 568B" in v['title']][0]
    if any(k in q_lower for k in ['cat 5', 'cat 6', 'cat 6a', 'twisted pair', 'plenum']):
        return [v for v in videos if "Network Cables" in v['title']][0]
    if any(k in q_lower for k in ['fiber', 'fibre', 'single mode', 'multimode', 'smf', 'mmf', 'lc', 'sc', 'st']):
        return [v for v in videos if "Optical Fiber" in v['title'] or "Fiber Connectors" in v['title']][0]
    if any(k in q_lower for k in ['laser', 'fuser', 'drum', 'toner', 'corona', 'electrophotographic']):
        return [v for v in videos if "Laser Printer" in v['title'] or "Troubleshooting Printers" in v['title']][0]
    if any(k in q_lower for k in ['printer', 'spooler', 'inkjet', 'thermal', 'impact']):
        return [v for v in videos if "Printers" in v['title']][0]
    if any(k in q_lower for k in ['raid 0', 'raid 1', 'raid 5', 'raid 10', 'parity', 'mirror']):
        return [v for v in videos if "RAID" in v['title']][0]
    if any(k in q_lower for k in ['ram', 'ecc', 'ddr4', 'ddr5', 'sodimm', 'dimm']):
        return [v for v in videos if "Memory" in v['title']][0]
    if any(k in q_lower for k in ['hypervisor', 'type 1', 'type 2', 'virtualbox', 'esxi', 'bare metal']):
        return [v for v in videos if "Virtualization Concepts" in v['title']][0]
    if any(k in q_lower for k in ['iaas', 'paas', 'saas', 'cloud', 'elasticity']):
        return [v for v in videos if "Cloud" in v['title']][0]
    if any(k in q_lower for k in ['bios', 'uefi', 'cmos', 'cr2032', 'tpm', 'secure boot']):
        return [v for v in videos if "BIOS" in v['title'] or "TPM" in v['title']][0]
    if any(k in q_lower for k in ['mobile', 'laptop', 'battery', 'swollen', 'digitizer', 'touchscreen', 'trackpad']):
        return [v for v in videos if "Laptop Hardware" in v['title'] or "Troubleshooting Mobile" in v['title']][0]
    if any(k in q_lower for k in ['wifi', 'wi-fi', '802.11', '2.4 ghz', '5 ghz', 'mimo', 'channel']):
        return [v for v in videos if "Wireless Network" in v['title']][0]
    if any(k in q_lower for k in ['toner probe', 'crimper', 'loopback', 'multimeter', 'voltmeter', 'punchdown']):
        return [v for v in videos if "Network Tools" in v['title']][0]
    
    # Fallback by domain
    if "1.0" in domain_name:
        return videos[1] # Laptop Hardware
    if "2.0" in domain_name:
        return videos[6] # Intro to IP
    if "3.0" in domain_name:
        return videos[34] # Motherboards
    if "4.0" in domain_name:
        return videos[53] # Virtualization
    if "5.0" in domain_name:
        return videos[57] # Troubleshooting
    return videos[0]

# Attach video recommendations to Core 1 questions
for q in db['core1']:
    rec_vid = find_matching_video(q['question'], q.get('domain', ''))
    q['video_reference'] = {
        "title": rec_vid['title'],
        "url": rec_vid['url'],
        "duration": rec_vid['duration'],
        "objective": rec_vid['objective']
    }

# Save updated databases
with open("exam_data.json", "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2)

with open("exam_data.js", "w", encoding="utf-8") as f:
    f.write("window.COMPTIA_EXAM_DATA = ")
    json.dump(db, f, indent=2)
    f.write(";\n")
    f.write("window.PROFESSOR_MESSER_1201_VIDEOS = ")
    json.dump(videos, f, indent=2)
    f.write(";\n")
    # Preserve Core 2 playlist if present so re-running this script does not drop 1202
    videos_1202_path = "professor_messer_220_1202_videos.json"
    if os.path.exists(videos_1202_path):
        with open(videos_1202_path, "r", encoding="utf-8") as vf:
            videos_1202 = json.load(vf)
        f.write("window.PROFESSOR_MESSER_1202_VIDEOS = ")
        json.dump(videos_1202, f, indent=2)
        f.write(";\n")

print("Updated exam_data.json and exam_data.js with Professor Messer video references!")
