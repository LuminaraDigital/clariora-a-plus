#!/usr/bin/env python3
"""Build Core 2 item-type shard: multi / match / order only.

Prefix: C2N-I-001..024
Mix: 12 multi, 6 order, 6 match
Output: _bank/shards/core2_itemtypes.json

Run from ROOT: python tools/build_core2_itemtypes.py
"""
import json
import os
import re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

with open(os.path.join(HERE, "objective_notes_map.json"), encoding="utf-8") as f:
    NOTES = json.load(f)["core2"]

OBJ_PATH = os.path.join(HERE, "objectives_220_1202.json")
if not os.path.isfile(OBJ_PATH):
    OBJ_PATH = os.path.join(HERE, "objectives_220_1202_provisional.json")
with open(OBJ_PATH, encoding="utf-8") as f:
    OBJECTIVES = json.load(f)["objectives"]

QUESTIONS = [
    # ---- MULTI (12) ----
    {
        "id": "C2N-I-001",
        "objective": "1.2",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A technician is imaging new Windows 11 Pro workstations that must join Active Directory, "
            "BitLocker-encrypt the OS volume, and support Remote Desktop for help-desk. Which TWO "
            "edition/feature choices are required versus Home? (Select TWO.)"
        ),
        "options": [
            "Windows 11 Pro (or Enterprise) for domain join support",
            "BitLocker drive encryption available on Pro/Enterprise SKUs",
            "Windows 11 Home because it includes Hyper-V Server Manager by default",
            "Replacing NTFS with FAT32 so BitLocker keys store in the MBR",
            "Disabling the Workstation service to force domain join",
        ],
        "answers": [0, 1],
        "explanation": (
            "Domain join and BitLocker for OS volumes are Pro/Enterprise capabilities that Home lacks in normal "
            "business deployments. Home does not unlock domain join, FAT32 is wrong for modern OS volumes, and "
            "disabling Workstation breaks SMB client behavior rather than enabling domain membership."
        ),
        "distractor_analysis": {
            "2": "Windows 11 Home does not provide business domain join the way Pro/Enterprise does.",
            "3": "FAT32 is unsuitable for modern Windows system volumes and is not how BitLocker stores keys.",
            "4": "The Workstation service supports SMB client access; disabling it does not force domain join.",
        },
        "tags": ["windows", "editions", "bitlocker", "domain"],
    },
    {
        "id": "C2N-I-002",
        "objective": "1.4",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A help-desk engineer must collect a failing service's dependencies and export a filtered "
            "Event Viewer log for escalation. Which TWO Windows tools should they use? (Select TWO.)"
        ),
        "options": [
            "services.msc (or sc.exe) to inspect service state and dependencies",
            "Event Viewer to filter and export Application/System log entries",
            "Disk Cleanup solely to rebuild the service dependency graph",
            "Character Map to encode event XML into clipboard glyphs",
            "Paint 3D to screenshot registry hives instead of exporting logs",
        ],
        "answers": [0, 1],
        "explanation": (
            "Service dependencies are visible in services.msc/sc.exe, and Event Viewer is the standard path to filter "
            "and export logs for escalation. Disk Cleanup, Character Map, and Paint 3D do not replace those admin "
            "consoles."
        ),
        "distractor_analysis": {
            "2": "Disk Cleanup frees temporary files; it does not map or repair service dependency trees.",
            "3": "Character Map inserts glyphs; it is not an event log export tool.",
            "4": "Screenshots of hives are not a substitute for proper Event Viewer exports.",
        },
        "tags": ["windows", "services", "event-viewer"],
    },
    {
        "id": "C2N-I-003",
        "objective": "1.5",
        "type": "multi",
        "difficulty": "hard",
        "question": (
            "On a Server Core style admin jump box, a technician must map a drive, test TCP 445 to a "
            "file server, and force a Group Policy refresh. Which TWO CLI utilities fit? (Select TWO.)"
        ),
        "options": [
            "net use to map/authenticate a network drive",
            "gpupdate /force to refresh computer and user policy",
            "chkdsk /r as the only way to map SMB shares",
            "format.com to reinitialize the remote file server volume over the WAN",
            "winver to open inbound firewall ports for SMB",
        ],
        "answers": [0, 1],
        "explanation": (
            "net use handles drive mappings, and gpupdate /force refreshes policy on demand. chkdsk repairs local "
            "volumes, format would destroy data, and winver only shows the Windows version banner."
        ),
        "distractor_analysis": {
            "2": "chkdsk checks local disks; it does not map remote SMB paths.",
            "3": "format targets local volumes and would be destructive if misused against production storage.",
            "4": "winver displays version information and does not configure firewall or SMB access.",
        },
        "tags": ["cli", "net-use", "gpupdate"],
    },
    {
        "id": "C2N-I-004",
        "objective": "1.9",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A Linux admin on an Ubuntu jump host needs to install packages from the distribution "
            "repos and inspect listening TCP sockets after a change. Which TWO commands are appropriate? "
            "(Select TWO.)"
        ),
        "options": [
            "apt (or apt-get) to install packages from configured repositories",
            "ss -tuln (or netstat -tuln) to list listening sockets",
            "chmod 777 /etc/shadow to unlock package installs",
            "dd if=/dev/zero of=/boot to refresh APT indexes",
            "passwd -d root as a required step before apt update",
        ],
        "answers": [0, 1],
        "explanation": (
            "APT installs packages on Debian/Ubuntu systems, and ss/netstat shows listening sockets for validation. "
            "World-writable shadow, zeroing /boot, or deleting the root password are dangerous and unrelated."
        ),
        "distractor_analysis": {
            "2": "chmod 777 on /etc/shadow destroys credential confidentiality and is not an install step.",
            "3": "Writing zeros to /boot destroys the bootloader area instead of refreshing package indexes.",
            "4": "Removing the root password weakens security and is not required for apt update.",
        },
        "tags": ["linux", "apt", "ss"],
    },
    {
        "id": "C2N-I-005",
        "objective": "2.1",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A colocation cage upgrade requires stronger physical access control for contractors who "
            "only need escorted daytime entry. Which TWO controls best fit that requirement? "
            "(Select TWO.)"
        ),
        "options": [
            "Badge access with time-of-day restrictions on the cage door controller",
            "Visitor escort policy logged at the NOC desk for contractor visits",
            "Posting the master mechanical key photo on a public SharePoint site",
            "Disabling all CCTV to protect contractor privacy inside the cage",
            "Leaving the emergency exit permanently unlatched for convenience",
        ],
        "answers": [0, 1],
        "explanation": (
            "Time-bounded badge access plus a formal escort/log policy matches limited contractor entry. Publishing "
            "master keys, disabling cameras, or unlatching emergency exits weaken physical security."
        ),
        "distractor_analysis": {
            "2": "Publishing key photos defeats physical key control and invites unauthorized copies.",
            "3": "CCTV is a standard deterrent and audit control; disabling it reduces accountability.",
            "4": "Unlatching emergency exits for convenience creates an uncontrolled entry path.",
        },
        "tags": ["physical-security", "badge", "escort"],
    },
    {
        "id": "C2N-I-006",
        "objective": "2.2",
        "type": "multi",
        "difficulty": "hard",
        "question": (
            "Auditors find a shared Windows folder where Authenticated Users have Modify on the share "
            "and Full control on NTFS. Which TWO changes restore least privilege for a read-only "
            "finance report drop? (Select TWO.)"
        ),
        "options": [
            "Tighten NTFS ACLs so the finance readers group has Read & execute only",
            "Reduce share permissions so Authenticated Users are not granted Modify",
            "Grant Everyone Full control on both share and NTFS to simplify access",
            "Disable the entire NTFS ACL and rely only on share permissions",
            "Store the reports on a world-writable USB stick in the lobby",
        ],
        "answers": [0, 1],
        "explanation": (
            "Effective access is the more restrictive of share and NTFS permissions. Restrict NTFS for readers and "
            "remove overly broad share Modify for Authenticated Users. Broad Everyone Full control, ignoring NTFS, or "
            "USB drops increase exposure."
        ),
        "distractor_analysis": {
            "2": "Everyone Full control is the opposite of least privilege for financial data.",
            "3": "NTFS ACLs are required for file-level least privilege; share permissions alone are insufficient.",
            "4": "A lobby USB stick has no authentication boundary suitable for finance reports.",
        },
        "tags": ["ntfs", "share-permissions", "least-privilege"],
    },
    {
        "id": "C2N-I-007",
        "objective": "2.4",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "Users receive emails that urge immediate password changes via a link that spoofs the "
            "company SSO portal. Which TWO security awareness or technical controls help most? "
            "(Select TWO.)"
        ),
        "options": [
            "User training to recognize phishing and verify URLs before entering credentials",
            "MFA on SSO so stolen passwords alone are less useful to attackers",
            "Disabling all TLS so users can see plaintext email headers more easily",
            "Sharing one break-glass password in a sticky note on each monitor",
            "Whitelist every external .exe attachment to speed help-desk resets",
        ],
        "answers": [0, 1],
        "explanation": (
            "Phishing resilience combines trained users who scrutinize URLs with MFA that blunts password theft. "
            "Disabling TLS, shared passwords, and whitelisting executables increase risk."
        ),
        "distractor_analysis": {
            "2": "Disabling TLS exposes credentials and content in transit rather than helping users.",
            "3": "Shared break-glass passwords on monitors defeat authentication controls.",
            "4": "Whitelisting external executables invites malware delivery alongside phishing.",
        },
        "tags": ["phishing", "mfa", "social-engineering"],
    },
    {
        "id": "C2N-I-008",
        "objective": "2.6",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A workstation shows unexpected browser redirects and a new toolbar the user did not "
            "install. Which TWO actions are appropriate early malware response steps? (Select TWO.)"
        ),
        "options": [
            "Isolate the host from the network if policy allows, then run a full antimalware scan",
            "Review installed programs/extensions and remove unknown browser add-ons",
            "Email the suspicious executable to all staff so they can inspect it locally",
            "Disable Windows Update permanently to keep the malware signature frozen",
            "Turn off the host firewall to let the C2 callback complete for easier capture on the LAN",
        ],
        "answers": [0, 1],
        "explanation": (
            "Containment plus a full scan, along with removing rogue extensions, are standard early steps for browser "
            "hijacks. Spreading the sample, freezing updates, or opening the firewall for C2 worsens the incident."
        ),
        "distractor_analysis": {
            "2": "Emailing malware samples to staff multiplies exposure instead of containing it.",
            "3": "Disabling Windows Update prevents security patches and signature improvements.",
            "4": "Disabling the firewall to allow C2 callbacks increases lateral movement risk.",
        },
        "tags": ["malware", "browser", "incident-response"],
    },
    {
        "id": "C2N-I-009",
        "objective": "2.10",
        "type": "multi",
        "difficulty": "hard",
        "question": (
            "A SOHO router still uses the factory admin password and broadcasts an open guest SSID "
            "bridged into the LAN. Which TWO hardening changes should be applied first? (Select TWO.)"
        ),
        "options": [
            "Change the default administrator password to a unique strong secret",
            "Segment or isolate guest Wi-Fi from the LAN and require WPA2/WPA3 encryption",
            "Disable all DHCP so every IoT device uses public RFC1918 conflicts intentionally",
            "Forward WAN TCP 23 to the router UI for easier remote Telnet admin",
            "Set the Wi-Fi passphrase to the company street address for memorability",
        ],
        "answers": [0, 1],
        "explanation": (
            "Default passwords and open SSIDs bridged to the LAN are critical SOHO flaws. Unique admin credentials plus "
            "encrypted, isolated guest wireless are the first fixes. Killing DHCP, exposing Telnet, or weak location-based "
            "passphrases remain insecure."
        ),
        "distractor_analysis": {
            "2": "Disabling DHCP does not isolate guest traffic and creates addressing chaos.",
            "3": "WAN Telnet to the admin UI exposes cleartext remote control of the router.",
            "4": "Address-based passphrases are easily guessed and fail wireless hardening guidance.",
        },
        "tags": ["soho", "wireless", "hardening"],
    },
    {
        "id": "C2N-I-010",
        "objective": "3.1",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A Windows laptop is slow after login: disk queue length spikes, and Task Manager shows "
            "constant Antimalware Service Executable CPU. Which TWO troubleshooting actions are "
            "reasonable first moves? (Select TWO.)"
        ),
        "options": [
            "Confirm whether a full scan is running and reschedule it off business peak hours",
            "Check for disk health issues and ensure adequate free space on the system volume",
            "Delete System32 to stop the antimalware service from scanning",
            "Disable the paging file permanently on a 4 GB RAM laptop to speed boot",
            "Set the power plan to High Performance by removing the battery permanently",
        ],
        "answers": [0, 1],
        "explanation": (
            "Heavy Defender scanning during peak hours plus a stressed or nearly full disk commonly explain post-login "
            "slowness. Deleting System32, removing the pagefile on low-RAM systems, or removing the battery are harmful "
            "or irrelevant."
        ),
        "distractor_analysis": {
            "2": "Deleting System32 destroys the OS rather than tuning scans.",
            "3": "Disabling the pagefile on a low-RAM laptop often increases failures under memory pressure.",
            "4": "Removing the battery does not fix scan scheduling or disk health.",
        },
        "tags": ["performance", "defender", "disk"],
    },
    {
        "id": "C2N-I-011",
        "objective": "3.4",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "Chrome on a shared kiosk keeps restoring a hijacked homepage and blocked-plugin prompts "
            "after every reboot. Which TWO fixes target common software causes? (Select TWO.)"
        ),
        "options": [
            "Reset browser settings and remove unauthorized extensions",
            "Scan for PUPs/malware that rewrite shortcuts and policies",
            "Flash the GPU VBIOS from an unrelated laptop model",
            "Format only the EFI partition while leaving malware on C:",
            "Set the kiosk DNS to 0.0.0.0 to stop homepage redirects",
        ],
        "answers": [0, 1],
        "explanation": (
            "Persistent homepage hijacks usually come from extensions, shortcuts, or PUP policies. Resetting the browser "
            "and scanning for PUPs address those causes. Random VBIOS flashes, partial EFI formats, or zeroing DNS "
            "break the device without removing the hijack."
        ),
        "distractor_analysis": {
            "2": "Cross-flashing GPU firmware risks a brick and does not remove browser hijacks.",
            "3": "Formatting EFI while leaving malware on the OS volume will not clear the infection.",
            "4": "Pointing DNS at 0.0.0.0 breaks name resolution rather than removing hijack components.",
        },
        "tags": ["browser", "pup", "kiosk"],
    },
    {
        "id": "C2N-I-012",
        "objective": "4.1",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "Before changing a production firewall rule set during business hours, which TWO change-"
            "management practices should the technician follow? (Select TWO.)"
        ),
        "options": [
            "Submit a change request with risk assessment and rollback plan",
            "Obtain required approvals and schedule a maintenance window when mandated",
            "Apply the change silently on all sites first, then write documentation later",
            "Skip backup of the current config because rules are easy to remember",
            "Use the same unlogged shared admin account for every engineer on the change",
        ],
        "answers": [0, 1],
        "explanation": (
            "Formal change requests, risk/rollback notes, and approvals/windows are core operational procedure controls. "
            "Silent mass changes, skipping config backup, and shared unlogged accounts break auditability and recovery."
        ),
        "distractor_analysis": {
            "2": "Undocumented silent changes prevent review and complicate rollback when traffic breaks.",
            "3": "Without a saved prior config, rollback becomes guesswork during an outage.",
            "4": "Shared admin accounts destroy individual accountability required by change audits.",
        },
        "tags": ["change-management", "firewall", "operations"],
    },
    # ---- ORDER (6) ----
    {
        "id": "C2N-I-013",
        "objective": "1.2",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the steps to perform a clean Windows 11 installation on a new NVMe workstation "
            "that must boot in UEFI mode."
        ),
        "sequence": [
            "Enter UEFI setup, enable UEFI boot, and set the install media first in the boot order",
            "Boot the Windows installer and delete/create a GPT partition layout on the NVMe drive",
            "Complete setup, install drivers/updates, and join the device to the required domain or Azure AD",
            "Apply baseline security policies, BitLocker if required, and verify activation",
        ],
        "explanation": (
            "UEFI/GPT must be correct before partitioning. Only after the OS is installed do domain join, baselines, "
            "and BitLocker make sense. Installing in legacy CSM mode often creates MBR layouts that fight modern "
            "security features."
        ),
        "tags": ["windows-install", "uefi", "gpt"],
    },
    {
        "id": "C2N-I-014",
        "objective": "2.5",
        "type": "order",
        "difficulty": "hard",
        "question": (
            "Order the preferred response when a receptionist reports a convincing urgent call from "
            "\"the CEO\" demanding gift-card codes."
        ),
        "sequence": [
            "Remain calm, do not purchase cards, and avoid sharing secrets or codes",
            "Verify the request through a known-good channel using published contact procedures",
            "Document the call details and escalate to security/help desk immediately",
            "Warn nearby staff per policy and preserve any related voicemail or email evidence",
        ],
        "explanation": (
            "Vishing response prioritizes non-compliance, out-of-band verification, escalation, and evidence "
            "preservation. Paying first or arguing on the same call plays into social engineering pressure."
        ),
        "tags": ["vishing", "social-engineering", "incident"],
    },
    {
        "id": "C2N-I-015",
        "objective": "2.8",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the steps to enroll a corporate iPhone into MDM after a device wipe for a new hire."
        ),
        "sequence": [
            "Power on, choose language/region, and connect to a trusted network or cellular path",
            "Authenticate the enrollment profile with corporate identity credentials or QR/token",
            "Allow MDM to install management profiles, certificates, and required apps",
            "Confirm compliance policies (passcode, encryption, VPN) before handing the device to the user",
        ],
        "explanation": (
            "Enrollment starts with basic setup and connectivity, then identity-bound MDM profiles, then policy "
            "confirmation. Skipping compliance checks before handoff leaves unmanaged gaps."
        ),
        "tags": ["mdm", "ios", "enrollment"],
    },
    {
        "id": "C2N-I-016",
        "objective": "3.1",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the steps to recover a Windows workstation that fails to boot after a bad driver "
            "update, using least-destructive options first."
        ),
        "sequence": [
            "Attempt Startup Repair / Safe Mode from Windows Recovery Environment",
            "Uninstall the recent driver or roll back via Device Manager / System Restore in Safe Mode",
            "Run SFC/DISM offline or from recovery if system files remain corrupted",
            "If still unbootable, restore from image backup or rebuild and rejoin per procedure",
        ],
        "explanation": (
            "WinRE and Safe Mode rollback are less destructive than rebuilds. SFC/DISM address residual corruption. "
            "Imaging or rebuild is last after softer recoveries fail."
        ),
        "tags": ["startup-repair", "drivers", "winre"],
    },
    {
        "id": "C2N-I-017",
        "objective": "4.2",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the safety steps for replacing a hot-swap PSU in a live rack under LOTO-aware "
            "datacenter policy for that chassis type."
        ),
        "sequence": [
            "Confirm the chassis supports hot-swap and identify the failed PSU module and circuit",
            "Wear ESD protection, communicate with NOC, and follow site LOTO/energy isolation rules as required",
            "Remove the failed module and insert the replacement until latched with status LEDs healthy",
            "Verify redundant load sharing, clear alerts, and update the maintenance log",
        ],
        "explanation": (
            "Confirm hot-swap capability first, then follow energy-isolation and ESD practice, then swap and verify. "
            "Pulling the wrong module without checks can drop a non-redundant chassis."
        ),
        "tags": ["safety", "psu", "datacenter"],
    },
    {
        "id": "C2N-I-018",
        "objective": "4.3",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the steps to implement a 3-2-1 style backup plan for a small office file server "
            "before a major application upgrade."
        ),
        "sequence": [
            "Identify critical data sets and recovery point/time objectives with the business owner",
            "Configure local backups to a separate medium and a second distinct storage target",
            "Replicate or vault a third copy offsite or to immutable cloud storage",
            "Run a restore test of sample files/VMs and document the results before the upgrade",
        ],
        "explanation": (
            "Backup design starts with business RPO/RTO, then multiple media/targets including offsite, then a proven "
            "restore test. Untested backups are not a recovery plan."
        ),
        "tags": ["backup", "3-2-1", "restore-test"],
    },
    # ---- MATCH (6) ----
    {
        "id": "C2N-I-019",
        "objective": "1.3",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each Windows Settings area to the task a technician most often performs there.",
        "pairs": [
            {"left": "System > About / Activation", "right": "Verify Windows edition and activation state"},
            {"left": "Network & internet", "right": "Configure IP, VPN, and proxy connectivity"},
            {"left": "Accounts", "right": "Manage local/Microsoft account sign-in options"},
            {"left": "Update & security / Windows Update", "right": "Check for OS patches and pause updates"},
            {"left": "Apps", "right": "Uninstall or modify installed desktop applications"},
        ],
        "explanation": (
            "Technicians navigate Settings constantly: About for edition/activation, Network for connectivity, Accounts "
            "for identity, Windows Update for patching, and Apps for uninstalls. Knowing the map reduces time on "
            "remote sessions."
        ),
        "tags": ["windows-settings", "match"],
    },
    {
        "id": "C2N-I-020",
        "objective": "1.8",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each macOS tool or feature to its purpose.",
        "pairs": [
            {"left": "Finder", "right": "Browse files, volumes, and network shares"},
            {"left": "Time Machine", "right": "Local/external incremental backups and restores"},
            {"left": "Keychain Access", "right": "Store passwords and certificates for the user"},
            {"left": "Mission Control", "right": "Manage Spaces, full-screen apps, and window overview"},
        ],
        "explanation": (
            "Finder is the file manager, Time Machine handles backups, Keychain stores secrets, and Mission Control "
            "organizes workspaces. These mappings appear often on Core 2 macOS items."
        ),
        "tags": ["macos", "time-machine", "keychain"],
    },
    {
        "id": "C2N-I-021",
        "objective": "2.3",
        "type": "match",
        "difficulty": "hard",
        "question": "Match each wireless security mode to its characteristic.",
        "pairs": [
            {"left": "WPA3-Personal", "right": "SAE-based passphrase authentication for modern SOHO Wi-Fi"},
            {"left": "WPA2-Enterprise", "right": "802.1X with RADIUS-backed per-user credentials"},
            {"left": "Open network", "right": "No encryption; traffic readable by local eavesdroppers"},
            {"left": "WEP", "right": "Obsolete RC4 scheme that must not be used on production WLANs"},
        ],
        "explanation": (
            "WPA3-Personal uses SAE, WPA2-Enterprise relies on 802.1X/RADIUS, open networks lack encryption, and WEP "
            "is cryptographically broken. Selecting the right mode is a frequent SOHO hardening question."
        ),
        "tags": ["wireless-security", "wpa3", "802.1x"],
    },
    {
        "id": "C2N-I-022",
        "objective": "2.7",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each Windows security principal or permission concept to its meaning.",
        "pairs": [
            {"left": "NTFS Modify", "right": "Read, write, and delete files within a folder"},
            {"left": "Share Read", "right": "Connect to the share with read-only share-level rights"},
            {"left": "Explicit Deny", "right": "Overrides conflicting Allow entries for that permission"},
            {"left": "Inheritance", "right": "Child objects receive ACEs from a parent folder"},
            {"left": "Administrative share (C$)", "right": "Hidden default share for admins on a volume root"},
        ],
        "explanation": (
            "Understanding Modify vs share Read, Deny precedence, inheritance, and admin shares is essential for "
            "Windows permission troubleshooting and least-privilege design."
        ),
        "tags": ["ntfs", "shares", "acl"],
    },
    {
        "id": "C2N-I-023",
        "objective": "4.4",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each scripting or automation artifact to its typical use on Windows support desks.",
        "pairs": [
            {"left": ".ps1 PowerShell script", "right": "Automate admin tasks with rich Windows APIs"},
            {"left": ".bat / .cmd", "right": "Legacy Command Prompt batch automation"},
            {"left": ".sh shell script", "right": "Bash automation on Linux/macOS jump hosts"},
            {"left": "Scheduled Task", "right": "Run scripts at logon/time triggers under a service account"},
        ],
        "explanation": (
            "PowerShell dominates modern Windows automation, batch files remain for legacy needs, shell scripts serve "
            "Unix hosts, and Scheduled Tasks time the runs. Matching the artifact prevents picking the wrong runtime."
        ),
        "tags": ["scripting", "powershell", "scheduled-tasks"],
    },
    {
        "id": "C2N-I-024",
        "objective": "4.7",
        "type": "match",
        "difficulty": "easy",
        "question": "Match each professionalism scenario to the appropriate technician response.",
        "pairs": [
            {"left": "Angry user in a public lobby", "right": "Stay calm, move to a private area if possible, and focus on facts"},
            {"left": "Unclear ticket description", "right": "Ask clarifying questions and restate the problem before changing systems"},
            {"left": "Personal data visible on screen", "right": "Avoid snooping; access only what the job requires"},
            {"left": "Escalation needed mid-change", "right": "Stop at a safe point, document state, and hand off cleanly"},
            {"left": "Cultural or language barrier", "right": "Speak plainly, confirm understanding, and avoid condescension"},
        ],
        "explanation": (
            "Professionalism objectives test de-escalation, clarification, privacy, clean handoffs, and respectful "
            "communication. These behaviors protect the customer relationship and reduce rework."
        ),
        "tags": ["professionalism", "communication"],
    },
]


def _assert_quality(q):
    blob = json.dumps(q, ensure_ascii=False)
    assert "—" not in blob and "–" not in blob, q["id"]
    assert len(q["explanation"]) >= 120, q["id"]
    if q["type"] == "multi":
        assert len(q["options"]) == 5
        assert len(q["answers"]) == 2
        assert q["answers"] == sorted(q["answers"])
        assert q["question"].rstrip().endswith("(Select TWO.)")
        wrong = [str(i) for i in range(5) if i not in q["answers"]]
        assert set(q["distractor_analysis"].keys()) == set(wrong)
    elif q["type"] == "order":
        assert 4 <= len(q["sequence"]) <= 6
    elif q["type"] == "match":
        assert 4 <= len(q["pairs"]) <= 5


def main():
    questions = []
    for raw in QUESTIONS:
        obj = raw["objective"]
        if obj not in OBJECTIVES:
            raise SystemExit(f"Unknown objective {obj}")
        _assert_quality(raw)
        item = {
            "id": raw["id"],
            "exam": "core2",
            "domain": OBJECTIVES[obj]["domain"],
            "objective": obj,
            "type": raw["type"],
            "difficulty": raw["difficulty"],
            "question": re.sub(r"\s+", " ", raw["question"]).strip(),
            "explanation": raw["explanation"],
            "video_reference": None,
            "notes_reference": NOTES[obj],
            "tags": raw.get("tags", []),
        }
        if raw["type"] == "multi":
            item["options"] = raw["options"]
            item["answers"] = raw["answers"]
            item["distractor_analysis"] = raw["distractor_analysis"]
        elif raw["type"] == "order":
            item["sequence"] = raw["sequence"]
        elif raw["type"] == "match":
            item["pairs"] = raw["pairs"]
        questions.append(item)

    out = os.path.join(ROOT, "_bank", "shards", "core2_itemtypes.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"questions": questions}, f, indent=2, ensure_ascii=False)

    types = Counter(q["type"] for q in questions)
    print(f"Generated {len(questions)} questions -> {out}")
    print(f"  types={dict(types)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
