"""
generate_complete_exam_bank.py
Expanded question generator for CompTIA A+ Core 1 & Core 2.
Provides authentic enterprise & datacenter scenarios with 100-900 scaled scoring.
"""

import os
import json
import re
from build_exam_bank import (
    extract_excel_core1_1201,
    extract_excel_core1_1101,
    extract_excel_core1_1001,
    extract_markdown_questions,
    clean_text,
)


def load_core2_expansion():
    """Load additional curated Core 2 scenarios from curated_core2_expansion.json."""
    path = "curated_core2_expansion.json"
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []

def get_curated_core2_questions():
    qs = [
        # Domain 1.0: Operating Systems
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A system administrator needs to partition a new 6 TB enterprise storage array drive on a Windows Server workstation. Which partition style must be selected to allow addressing the entire disk capacity as a single volume?",
            "options": ["MBR (Master Boot Record)", "GPT (GUID Partition Table)", "FAT32", "Dynamic Extended Volume"],
            "answer": 1,
            "explanation": "GPT (GUID Partition Table) supports disk sizes larger than 2 TB (up to 9.4 ZB) and up to 128 primary partitions in Windows. MBR is limited to 2 TB and 4 primary partitions."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "An IT technician is preparing to install Windows 11 Pro on newly arrived corporate laptops. Which hardware and firmware requirements are strictly mandatory for Windows 11?",
            "options": [
                "Legacy BIOS, 2 GB RAM, and DirectX 9",
                "UEFI with Secure Boot enabled and TPM 2.0",
                "MBR partition table, 32-bit CPU, and TPM 1.2",
                "SATA SSD, CSM enabled, and VT-x"
            ],
            "answer": 1,
            "explanation": "Windows 11 requires a compatible 64-bit processor, UEFI firmware with Secure Boot capability, TPM version 2.0, at least 4 GB of RAM, and 64 GB of storage."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A technician needs to deploy Windows across 50 workstations simultaneously over the local datacenter subnet without inserting physical USB media into each station. Which technology should be configured?",
            "options": ["PXE (Preboot Execution Environment) with WDS", "System Restore over SMB", "Miracast network deployment", "Windows To Go"],
            "answer": 0,
            "explanation": "PXE (Preboot Execution Environment) allows network interface cards (NICs) to boot from a network server via DHCP and TFTP without local physical media."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "Which Windows command-line utility scans the integrity of all protected system files and replaces incorrect, corrupted, or damaged versions with correct Microsoft versions?",
            "options": ["chkdsk /f /r", "sfc /scannow", "diskpart /clean", "bootrec /rebuildbcd"],
            "answer": 1,
            "explanation": "sfc /scannow (System File Checker) inspects protected operating system files and replaces corrupted files with clean cached copies."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A technician needs to verify which Group Policy Objects (GPOs) are currently applied to a specific user and computer in an Active Directory domain. Which command should the technician run?",
            "options": ["gpupdate /force", "gpresult /r", "secpol.msc", "netsh advfirewall"],
            "answer": 1,
            "explanation": "'gpresult /r' displays Resultant Set of Policy (RSoP) summary data for the target user and computer, showing applied GPOs and security group memberships."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A technician needs to schedule an automated daily file copy that mirrors complete directories, preserves file timestamps, NTFS attributes, and resumes transferring if interrupted over a WAN connection. Which command is BEST?",
            "options": ["copy", "xcopy /s", "robocopy /mir /z", "move /y"],
            "answer": 2,
            "explanation": "Robocopy (Robust File Copy) is designed for enterprise environments. The /mir switch mirrors directory trees and /z enables restartable mode across interrupted network connections."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "Which Microsoft Management Console (.msc) snap-in is used on a standalone Windows 10 Pro machine to manage local user accounts and local security groups?",
            "options": ["dsa.msc", "lusrmgr.msc", "compmgmt.msc", "secpol.msc"],
            "answer": 1,
            "explanation": "lusrmgr.msc (Local Users and Groups) is the snap-in dedicated to managing local user accounts and groups on Windows Pro/Enterprise editions."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "Which Windows Registry root key stores configuration settings and preferences specific to the currently logged-in interactive user?",
            "options": ["HKEY_LOCAL_MACHINE (HKLM)", "HKEY_CLASSES_ROOT (HKCR)", "HKEY_CURRENT_USER (HKCU)", "HKEY_USERS (HKU)"],
            "answer": 2,
            "explanation": "HKEY_CURRENT_USER (HKCU) holds configuration data, user environment variables, desktop settings, and software preferences for the currently logged-in user."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A Linux administrator needs to change the ownership of a file named 'app_config.cfg' to the user 'datacenter_admin' and group 'sysadmins'. Which command achieves this?",
            "options": [
                "chmod 755 app_config.cfg",
                "chown datacenter_admin:sysadmins app_config.cfg",
                "usermod -aG sysadmins datacenter_admin",
                "ls -l datacenter_admin sysadmins app_config.cfg"
            ],
            "answer": 1,
            "explanation": "The 'chown' command changes file owner and group ownership in Linux. The syntax is 'chown user:group filename'."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "In Linux, what permissions are granted to the file owner, group, and others respectively when running 'chmod 754 backup.sh'?",
            "options": [
                "Owner: rwx, Group: r-x, Others: r--",
                "Owner: r-x, Group: rwx, Others: --x",
                "Owner: rw-, Group: r--, Others: rwx",
                "Owner: rwx, Group: rw-, Others: ---"
            ],
            "answer": 0,
            "explanation": "7 = 4+2+1 (rwx for Owner), 5 = 4+0+1 (r-x for Group), 4 = 4+0+0 (r-- for Others)."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A technician needs to search through a 500 MB Apache server access log on Ubuntu Linux for all instances of IP address '192.168.1.105'. Which command should be used?",
            "options": ["find /var/log -name 192.168.1.105", "grep '192.168.1.105' /var/log/apache2/access.log", "cat /var/log/apache2/access.log | head", "sed '192.168.1.105' /var/log/apache2/access.log"],
            "answer": 1,
            "explanation": "'grep' (Global Regular Expression Print) searches plain-text data sets for lines that match a regular expression or search pattern."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "Which native macOS utility is used to perform automated incremental hourly backups to an external storage drive or network volume?",
            "options": ["File History", "Time Machine", "Disk Utility", "Migration Assistant"],
            "answer": 1,
            "explanation": "Time Machine is macOS's built-in backup feature creating hourly snapshots for the past 24 hours, daily backups for the past month, and weekly backups for previous months."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "Which macOS management utility is used to securely store and autofill website passwords, Wi-Fi network passwords, private keys, and digital certificates?",
            "options": ["Keychain Access", "Mission Control", "FileVault", "System Information"],
            "answer": 0,
            "explanation": "Keychain Access is the macOS password and credential management system that encrypts and stores sensitive account details, certificates, and encryption keys."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A user on Windows Pro wants to connect to their office workstation from home using native Windows Remote Desktop (RDP). Which requirement must be met on the office workstation?",
            "options": [
                "The office workstation can run Windows Home Edition",
                "Remote Desktop must be enabled in System Settings and the office workstation must run Windows Pro, Enterprise, or Education",
                "Port 22 must be forwarded on the office workstation's router",
                "The office workstation must be booted into Safe Mode with Networking"
            ],
            "answer": 1,
            "explanation": "Windows Home edition can initiate outbound RDP connections as a client, but only Windows Pro, Enterprise, and Education editions can host inbound RDP connections on port 3389."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A technician needs to terminate an unresponsive background process with PID 4820 in the Windows Command Prompt. Which command will forcefully end the process and any child processes it started?",
            "options": ["kill -9 4820", "taskkill /PID 4820 /F /T", "tasklist /FI 4820 /END", "ps -ef | stop 4820"],
            "answer": 1,
            "explanation": "'taskkill /PID 4820 /F /T' forcefully (/F) terminates the specified process ID and any child processes started by it (/T - tree kill)."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "A technician needs to view active network connections, listening ports, and the associated executable names on a Windows system. Which command should they execute in an elevated command prompt?",
            "options": ["netstat -b -ano", "ipconfig /all", "tracert -d", "route print"],
            "answer": 0,
            "explanation": "'netstat -b -ano' displays active connections, listening ports, numerical addresses (-n), the process ID (-o), and the associated executable binary name (-b)."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "Which Windows tool allows a technician to configure diagnostic startup, selective startup, boot options (such as Safe Boot), and see services configured to start automatically?",
            "options": ["msconfig (System Configuration)", "regedit", "dxdiag", "resmon"],
            "answer": 0,
            "explanation": "msconfig (System Configuration) is used to troubleshoot startup issues by configuring Normal, Diagnostic, or Selective startup, as well as Boot flags like Safe Boot."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "In Linux, which command displays information about available and used disk space on all mounted filesystems in human-readable units (MB/GB)?",
            "options": ["df -h", "du -sh", "fdisk -l", "free -m"],
            "answer": 0,
            "explanation": "'df -h' (Disk Free, human-readable) displays filesystem disk usage, showing available and used gigabytes for all mounted volumes."
        },
        {
            "exam": "core2",
            "domain": "1.0 Operating Systems",
            "question": "Which command-line tool in Windows checks the file system metadata and disk surface for physical bad sectors, attempting to recover readable data?",
            "options": ["chkdsk /r", "sfc /scannow", "format /q", "defrag /c"],
            "answer": 0,
            "explanation": "'chkdsk /r' locates bad sectors on the disk volume and recovers readable information (it implies /f to fix filesystem errors)."
        },

        # Domain 2.0: Security
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "An enterprise executive receives a targeted, personalized email claiming to be from the company's legal board, referencing specific upcoming acquisitions and demanding immediate review of an attached PDF. What specific social engineering attack is this?",
            "options": ["Vishing", "Whaling", "Watering hole attack", "Smishing"],
            "answer": 1,
            "explanation": "Whaling is a specific category of spear phishing that targets high-profile executives, directors, or board members with customized, high-stakes pretexts."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "An unauthorized person follows closely behind an authorized datacenter technician through a secure badge-access door without swiping their own credential. What type of physical security breach has occurred?",
            "options": ["Tailgating", "Shoulder surfing", "Pharming", "Eavesdropping"],
            "answer": 0,
            "explanation": "Tailgating (or piggybacking) occurs when an unauthorized person closely follows an authorized person into a restricted area without presenting their own credentials."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "Which physical security control uses a two-door airlock system where the first door must close and securely latch before the second door can unlock, specifically preventing tailgating into datacenter server rooms?",
            "options": ["Turnstile", "Access control vestibule (Mantrap)", "Bollard perimeter", "Faraday cage"],
            "answer": 1,
            "explanation": "An access control vestibule (mantrap) consists of an enclosed space with two interlocking doors, ensuring only one door can be open at any given time to prevent tailgating."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "A shared folder on an NTFS volume has Share permissions set to 'Everyone: Read' and NTFS permissions set to 'Finance_Group: Modify'. When a member of Finance_Group accesses the files over the network, what is their effective permission?",
            "options": ["Modify", "Read", "Full Control", "Deny"],
            "answer": 1,
            "explanation": "When accessing files over the network, both Share and NTFS permissions apply, and the MOST RESTRICTIVE permission wins. Between 'Read' (Share) and 'Modify' (NTFS), Read is the effective permission."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "What is the primary difference between Microsoft BitLocker and Encrypting File System (EFS)?",
            "options": [
                "BitLocker is file/folder-level encryption tied to user certs; EFS encrypts entire volumes",
                "BitLocker encrypts entire disk volumes and utilizes TPM; EFS encrypts individual files and folders on NTFS volumes tied to a user account",
                "BitLocker only works on FAT32; EFS works on any file system",
                "BitLocker requires an active internet connection to Microsoft Azure; EFS requires legacy BIOS"
            ],
            "answer": 1,
            "explanation": "BitLocker provides Full Disk Encryption (FDE) for entire volumes leveraging the TPM chip. EFS (Encrypting File System) operates at the individual file/folder level on NTFS volumes."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "Which wireless security protocol replaces Pre-Shared Key (PSK) authentication with Simultaneous Authentication of Equals (SAE) to protect against offline dictionary and brute-force attacks?",
            "options": ["WEP", "WPA-TKIP", "WPA2-Personal", "WPA3-Personal"],
            "answer": 3,
            "explanation": "WPA3 introduces SAE (Simultaneous Authentication of Equals) which prevents offline dictionary attacks even if users choose weak passphrases."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "In an enterprise network using 802.1X wireless authentication, client devices authenticate against a centralized authentication server. Which protocol and default UDP ports are commonly used for this service?",
            "options": ["TACACS+ over TCP 49", "RADIUS over UDP 1812 and 1813", "LDAP over TCP 389", "SNMP over UDP 161"],
            "answer": 1,
            "explanation": "RADIUS (Remote Authentication Dial-In User Service) handles enterprise 802.1X authentication using UDP port 1812 for authentication and UDP port 1813 for accounting."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "When hardening a new SOHO wireless router in a small branch office, which feature should ALWAYS be disabled because it contains a well-known vulnerability allowing PIN brute-forcing within hours?",
            "options": ["WPA2-AES", "WPS (Wi-Fi Protected Setup)", "DHCP reservation", "MAC filtering"],
            "answer": 1,
            "explanation": "Wi-Fi Protected Setup (WPS) uses an 8-digit PIN with known architectural flaws that allow attackers to brute-force the PIN in a few hours, compromising the network."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "What type of attack occurs when an attacker intercepts network communication between two systems, eavesdropping or modifying data packets in transit without either party knowing?",
            "options": ["DDoS", "Man-in-the-Middle (On-path attack)", "Brute-force", "SQL injection"],
            "answer": 1,
            "explanation": "A Man-in-the-Middle (MitM) or On-path attack occurs when a malicious actor positions themselves between two communicating endpoints to intercept or alter confidential data."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "A user authenticates to their corporate account by entering a password, tapping a YubiKey hardware token inserted into USB, and completing a fingerprint scan. How many distinct authentication factors are used?",
            "options": ["One factor", "Two factors", "Three factors", "Four factors"],
            "answer": 2,
            "explanation": "Three distinct factors are present: Something you know (password), Something you have (hardware token), and Something you are (biometric fingerprint)."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "A user connects to a public Wi-Fi access point at an airport that has the exact same SSID and MAC address cloning as the airport's official network. What specific threat is this?",
            "options": ["Evil Twin", "Rogue DHCP Server", "War Driving", "RFID Cloning"],
            "answer": 0,
            "explanation": "An Evil Twin is a rogue wireless access point that mimics a legitimate SSID to trick users into connecting so the attacker can intercept network traffic."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "Which security concept states that users and system accounts should only be granted the minimum necessary rights and permissions required to perform their daily job functions?",
            "options": ["Separation of Duties", "Principle of Least Privilege", "Mandatory Access Control", "Defense in Depth"],
            "answer": 1,
            "explanation": "The Principle of Least Privilege dictates that users, processes, and systems should have only the minimum access rights essential to execute authorized functions."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "A technician is deploying corporate smartphones. Management requires the ability to remotely wipe enterprise data if a device is stolen, without erasing the employee's personal photos. Which technology enables this?",
            "options": ["Mobile Application Management (MAM) / Containerization", "BIOS Password Lock", "Full IMEI Blacklisting", "SIM Pinning"],
            "answer": 0,
            "explanation": "MAM (Mobile Application Management) and containerization segregate corporate data from personal data, allowing a 'selective wipe' of corporate assets while preserving personal files."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "What type of attack involves an attacker placing malicious flash drives labeled 'Q4 Executive Salaries' in the datacenter parking lot hoping an employee plugs one into a workstation?",
            "options": ["Baiting", "Watering hole", "Typosquatting", "Pretexting"],
            "answer": 0,
            "explanation": "Baiting relies on human curiosity or greed by leaving physical media (like infected USB drives) in public or workplace areas for victims to find and plug in."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "A security analyst discovers malicious software that has modified core operating system kernel binaries and substituted system APIs to conceal its existence from Task Manager and antivirus utilities. What type of malware is this?",
            "options": ["Rootkit", "Adware", "Logic Bomb", "Macro Virus"],
            "answer": 0,
            "explanation": "A Rootkit is malware that operates at the kernel or boot level, actively modifying OS system calls and tables to hide processes, files, and network sockets from detection tools."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "Which protocol provides secure, encrypted directory queries for Active Directory domain controllers over TCP port 636?",
            "options": ["LDAPS (Lightweight Directory Access Protocol Secure)", "Kerberos", "RADIUS", "SNMPv3"],
            "answer": 0,
            "explanation": "LDAPS (Secure LDAP) encrypts directory queries using SSL/TLS over TCP port 636, whereas plain-text LDAP operates over port 389."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "A security technician needs to prevent datacenter staff laptops from having corporate source code copied onto unapproved personal USB flash drives. Which endpoint control is MOST appropriate?",
            "options": ["DLP (Data Loss Prevention) software / Endpoint Port Blocking via GPO", "WPA3 Enterprise", "BIOS Admin Password", "Faraday Bags"],
            "answer": 0,
            "explanation": "DLP (Data Loss Prevention) endpoint agents and Group Policy Object (GPO) removable storage restrictions monitor and block unauthorized copying of sensitive files to USB storage."
        },
        {
            "exam": "core2",
            "domain": "2.0 Security",
            "question": "In biometric authentication systems, what metric measures the percentage of times an authorized, legitimate user is incorrectly denied access by the scanner?",
            "options": ["FRR (False Rejection Rate / Type I error)", "FAR (False Acceptance Rate / Type II error)", "CER (Crossover Error Rate)", "MTBF (Mean Time Between Failures)"],
            "answer": 0,
            "explanation": "FRR (False Rejection Rate), or Type I error, is the rate at which valid authorized users are rejected. FAR (False Acceptance Rate) is when impostors are accepted."
        },

        # Domain 3.0: Software Troubleshooting
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "According to the official CompTIA 7-step malware removal procedure, what is the FIRST action a technician must take upon verifying the existence of malware on a user workstation?",
            "options": [
                "Update the anti-malware signatures",
                "Quarantine the infected system (disconnect from network)",
                "Disable System Restore",
                "Educate the end user"
            ],
            "answer": 1,
            "explanation": "The CompTIA 7-step malware removal procedure: 1. Investigate and verify symptoms; 2. Quarantine infected systems (unplug ethernet / turn off Wi-Fi); 3. Disable System Restore; 4. Remediate infected systems; 5. Schedule scans and run updates; 6. Enable System Restore and create restore point; 7. Educate end user."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "Why is it critical to disable System Restore on a Windows workstation BEFORE running anti-malware remediation tools?",
            "options": [
                "To speed up hard drive spin rates during scanning",
                "To prevent malware from being backed up into restore points or reinfecting the system during a future restore",
                "To free up RAM needed by the antivirus scanner",
                "To reset the Master Boot Record"
            ],
            "answer": 1,
            "explanation": "If System Restore remains active, infected system files may be saved within restore point snapshots. If the machine is restored later, the malware is re-introduced."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A Windows workstation crashes immediately during the initial loading splash screen with a Blue Screen of Death (BSOD) displaying the stop error 'INACCESSIBLE_BOOT_DEVICE'. What is the MOST likely cause?",
            "options": [
                "The desktop background picture was moved",
                "Storage controller drivers are corrupted, or the SATA mode was toggled between AHCI and RAID/IDE in UEFI",
                "The network gateway IP address is incorrect",
                "The user forgot their local password"
            ],
            "answer": 1,
            "explanation": "'INACCESSIBLE_BOOT_DEVICE' indicates Windows kernel cannot communicate with or read the boot storage drive, frequently caused by corrupted storage controller drivers or an accidental SATA controller mode toggle in BIOS/UEFI."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A Windows computer fails to boot, displaying 'The Boot Configuration Data file is missing some required information'. The technician boots into WinRE command prompt. Which command will rebuild the BCD store?",
            "options": ["sfc /scannow", "bootrec /rebuildbcd", "diskpart /format", "chkdsk /f"],
            "answer": 1,
            "explanation": "'bootrec /rebuildbcd' scans all disks for Windows installations compatible with Windows and allows the user to add them to the Boot Configuration Data (BCD) store."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "After an automatic graphics driver update, a designer's dual monitors start flickering violently and locking up Windows. How should the technician resolve this with the LEAST downtime?",
            "options": [
                "Format the drive and reinstall Windows from scratch",
                "Open Device Manager, select the Display Adapter Properties, and click 'Roll Back Driver'",
                "Replace the motherboard and GPU",
                "Disable all Windows services in msconfig"
            ],
            "answer": 1,
            "explanation": "Device Manager provides the 'Roll Back Driver' button on the Driver tab of the device properties, which reinstalls the previously functioning driver."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A user complains that their computer takes over 10 minutes to boot to a responsive desktop. Which Windows tool provides a simple interface to disable non-essential startup applications without modifying the registry directly?",
            "options": ["Task Manager (Startup tab)", "Disk Defragmenter", "chkdsk", "Windows Defender Firewall"],
            "answer": 0,
            "explanation": "In modern Windows versions, the Startup tab in Task Manager lists all startup impact ratings and allows technicians to easily disable startup programs."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A user cannot browse any websites by domain name (e.g., www.google.com fails), but they can successfully ping external IP addresses like 8.8.8.8. Which command line tool will help diagnose and query the name resolution servers?",
            "options": ["tracert", "nslookup", "netstat", "ipconfig /all"],
            "answer": 1,
            "explanation": "'nslookup' (Name Server Lookup) queries Domain Name System (DNS) servers directly to test whether hostnames resolve to IP addresses, pinpointing DNS failures."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A user logs into Windows and receives the message: 'You have been signed in with a temporary profile.' None of their desktop icons or personal documents appear. What is the cause and resolution?",
            "options": [
                "The user's RAM is unseated; reseat the memory module",
                "The user profile is corrupted; back up the user's data from C:\\Users, delete the corrupted profile registry key (.bak) in HKLM\\...\\ProfileList, and recreate the profile",
                "The display resolution is set too high; change to 1080p",
                "The Ethernet cable is unplugged; reconnect the network"
            ],
            "answer": 1,
            "explanation": "A temporary profile occurs when Windows cannot load the user's NTUSER.DAT registry hive due to corruption. It is resolved by fixing the corresponding profile registry subkey in HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList and recreating the user profile."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A system file corruption issue cannot be repaired by 'sfc /scannow' because the local component store (WinSxS) itself is corrupted. Which command should the technician run first to repair the Windows component store image using Windows Update?",
            "options": [
                "DISM /Online /Cleanup-Image /RestoreHealth",
                "chkdsk /f /r",
                "bootrec /fixmbr",
                "defrag C: /u"
            ],
            "answer": 0,
            "explanation": "'DISM /Online /Cleanup-Image /RestoreHealth' uses Windows Update or an installation media source to repair the component store (WinSxS), enabling 'sfc /scannow' to complete successfully."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A user reports that web browser search queries are repeatedly redirected to an unauthorized promotional website, and new browser tabs open unwanted ads automatically. What should the technician inspect FIRST?",
            "options": [
                "Installed browser extensions, add-ons, and proxy configuration settings",
                "Motherboard BIOS version",
                "SATA storage controller drivers",
                "Monitor refresh rate"
            ],
            "answer": 0,
            "explanation": "Browser redirects and adware are commonly caused by malicious browser extensions or hijacked proxy/DNS settings within the browser or Windows Internet Options."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "An enterprise desktop crashes with a stop code error (BSOD) at random intervals. Where does Windows write the crash dump memory files for technician analysis?",
            "options": [
                "%SystemRoot%\\MEMORY.DMP and %SystemRoot%\\Minidump",
                "C:\\Users\\Public\\Desktop",
                "%Temp%\\crash.log",
                "C:\\Program Files\\Common Files\\Dump"
            ],
            "answer": 0,
            "explanation": "Windows stores crash dump memory files in %SystemRoot% (C:\\Windows\\MEMORY.DMP) and kernel minidumps in %SystemRoot%\\Minidump, which can be analyzed using WinDbg or BlueScreenView."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "An application fails to launch, displaying the error message 'The code execution cannot proceed because MSVCR120.dll was not found'. What is the most effective solution?",
            "options": [
                "Reinstall or repair the matching Microsoft Visual C++ Redistributable package",
                "Replace the motherboard",
                "Delete the Windows System32 directory",
                "Disable the Windows Firewall"
            ],
            "answer": 0,
            "explanation": "Missing DLL errors like MSVCR*.dll indicate that the corresponding Microsoft Visual C++ Redistributable Runtime library required by the application is missing or corrupted."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A Windows critical service fails to start during boot with Error 1068: 'The dependency service or group failed to start'. How should the technician troubleshoot this?",
            "options": [
                "Open services.msc, view the Dependencies tab for that service, and verify that prerequisite services are running",
                "Run defrag on disk C:",
                "Change the computer's workgroup name",
                "Unplug the network cable"
            ],
            "answer": 0,
            "explanation": "Error 1068 indicates that a service required by the target service failed to start. Opening services.msc and inspecting the Dependencies tab reveals which prerequisite services must be started first."
        },
        {
            "exam": "core2",
            "domain": "3.0 Software Troubleshooting",
            "question": "A mobile smartphone user reports that a specific enterprise messaging app crashes immediately every time it is tapped open, while all other apps function normally. What should the technician try FIRST?",
            "options": [
                "Force stop the application and clear its app cache/data, then check for app updates",
                "Perform a full factory wipe of the entire smartphone",
                "Replace the phone's battery",
                "Call the cellular service provider to reset the IMEI"
            ],
            "answer": 0,
            "explanation": "When a single application crashes repeatedly, the initial non-destructive troubleshooting steps are to force close the app, clear the application cache and local data, or reinstall the latest update."
        },

        # Domain 4.0: Operational Procedures
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "What is the FIRST step in the official CompTIA 6-step troubleshooting methodology?",
            "options": [
                "Establish a theory of probable cause",
                "Identify the problem",
                "Test the theory to determine cause",
                "Establish a plan of action to resolve the problem"
            ],
            "answer": 1,
            "explanation": "CompTIA Troubleshooting Methodology: 1. Identify the problem (question the user, identify changes, review logs); 2. Establish a theory of probable cause; 3. Test the theory; 4. Establish a plan of action and implement the solution; 5. Verify full system functionality and implement preventive measures; 6. Document findings, actions, and outcomes."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "After successfully testing and confirming the theory of probable cause for a system outage, what is the NEXT step a technician should take according to the CompTIA methodology?",
            "options": [
                "Document findings, actions, and outcomes",
                "Establish a plan of action to resolve the problem and identify potential effects",
                "Question the user to identify recent changes",
                "Verify full system functionality"
            ],
            "answer": 1,
            "explanation": "Once the theory is confirmed in Step 3, Step 4 is to establish a plan of action to resolve the problem and identify potential effects before implementing the solution."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "In a corporate datacenter change management process, what is the primary role of the Change Advisory Board (CAB)?",
            "options": [
                "To physically install server hardware in racks",
                "To evaluate proposed changes, assess risks, verify rollback plans, and authorize or reject modifications",
                "To handle Tier 1 help desk tickets from remote users",
                "To purchase replacement toner cartridges"
            ],
            "answer": 1,
            "explanation": "The Change Advisory Board (CAB) reviews proposed Request for Change (RFC) documents, evaluates risk, schedule impact, and backout plans, and decides whether changes should be authorized."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "Which document must be consulted by datacenter personnel for proper handling, safety precautions, potential health hazards, and disposal procedures regarding chemicals such as battery acid or printer toner?",
            "options": ["SLA (Service Level Agreement)", "SDS (Safety Data Sheet)", "AUP (Acceptable Use Policy)", "NDA (Non-Disclosure Agreement)"],
            "answer": 1,
            "explanation": "Safety Data Sheets (SDS), formerly known as Material Safety Data Sheets (MSDS), provide detailed hazard data, emergency procedures, PPE requirements, and disposal instructions for hazardous substances."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "An enterprise backup policy adheres to the '3-2-1' backup strategy. What does the '3-2-1' rule represent?",
            "options": [
                "3 technicians, 2 supervisors, 1 sign-off",
                "3 copies of data, across 2 different media types, with 1 copy stored offsite",
                "3 days of retention, 2 differential backups, 1 full backup per month",
                "3 cloud providers, 2 on-premises servers, 1 tape drive"
            ],
            "answer": 1,
            "explanation": "The industry standard 3-2-1 backup rule dictates maintaining: 3 copies of important data, stored on 2 different types of storage media, with at least 1 copy kept offsite or in cloud storage."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "A datacenter decommission requires permanent sanitization of magnetic hard disk drives (HDDs) before recycling. Which method uses powerful electromagnetic fields to neutralize magnetic domains across platters?",
            "options": ["Overwriting with zeros once", "Degaussing", "Low-level formatting", "Re-partitioning"],
            "answer": 1,
            "explanation": "Degaussing subjects magnetic media (HDDs, magnetic tape) to an intense magnetic field, wiping magnetic domains and rendering the data unrecoverable (note: degaussing does not destroy SSDs)."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "Which type of fire extinguisher is specifically rated and required for electrical fires involving energized datacenter rack servers and wiring?",
            "options": ["Class A (Water)", "Class B (Flammable Liquids)", "Class C (Electrical Equipment)", "Class D (Combustible Metals)"],
            "answer": 2,
            "explanation": "Class C fire extinguishers are designed for energized electrical equipment fires. Non-conductive extinguishing agents like CO2 or clean agent gas (e.g. FM-200, Novec 1230) are used in datacenters."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "What is the file extension used for modern Microsoft PowerShell automation scripts?",
            "options": [".bat", ".sh", ".ps1", ".vbs"],
            "answer": 2,
            "explanation": ".ps1 is the file extension for Windows PowerShell scripts (.bat is batch, .sh is bash shell, .vbs is VBScript)."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "During an incident response investigation where a corporate server was breached, why is establishing a 'Chain of Custody' essential?",
            "options": [
                "To ensure server fans remain running during transport",
                "To document everyone who handled, collected, preserved, and transferred digital evidence so it remains admissible in court",
                "To reset the root administrator password",
                "To inform the vendor for warranty reimbursement"
            ],
            "answer": 1,
            "explanation": "Chain of Custody is a chronological documentation trail proving who possessed, analyzed, and controlled physical and digital evidence, proving it was not tampered with."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "When communicating with a frustrated customer whose computer crashed during an urgent presentation, which interpersonal approach is MOST professional?",
            "options": [
                "Interrupt the user to explain that they probably made a user error",
                "Actively listen without interrupting, clarify the issue calmly, empathize, and avoid technical jargon",
                "Blame the software developer and tell them to call support tomorrow",
                "Step away from the ticket and tell them to file a formal complaint"
            ],
            "answer": 1,
            "explanation": "CompTIA stresses professional customer service: active listening, maintaining calm and respectful demeanor, empathizing with the client's frustration, avoiding jargon, and clarifying needs."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "What is the recommended relative humidity range maintained inside a datacenter server room to prevent electrostatic discharge (ESD) while avoiding condensation?",
            "options": ["10% to 20%", "40% to 60%", "80% to 95%", "0% to 5%"],
            "answer": 1,
            "explanation": "Datacenters maintain relative humidity between 40% and 60%. Low humidity (<30%) creates severe ESD risks, while high humidity (>60%) risks moisture condensation and corrosion."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "When attaching an electrostatic discharge (ESD) wrist strap while servicing server components, where should the alligator clip be attached?",
            "options": [
                "To an unpainted metal portion of the chassis or grounded equipment rack",
                "To the hot wire of an electrical outlet",
                "To the computer's CPU heatsink fins",
                "To the technician's watch strap"
            ],
            "answer": 0,
            "explanation": "ESD wrist straps must be connected to an unpainted metal section of the computer chassis or a verified equipment grounding point to equalize electrical potential."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "Which software licensing model is bundled with brand-new computer hardware from the manufacturer and is legally non-transferable to a different computer motherboard?",
            "options": ["Retail / FPP (Full Packaged Product)", "OEM (Original Equipment Manufacturer)", "Open Source (GPL)", "Enterprise Volume Licensing"],
            "answer": 1,
            "explanation": "OEM licenses are tied to the specific hardware (specifically the motherboard) on which they are initially activated and cannot legally be transferred to a new machine."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "When lifting a heavy 4U enterprise rack server weighing 75 pounds (34 kg) to install into a server cabinet, which safety procedure MUST be observed?",
            "options": [
                "Lift quickly using the lower back muscles alone",
                "Perform a two-person team lift or use a dedicated mechanical server lift, bending at the knees with back straight",
                "Hold the server at arm's length away from the body",
                "Remove the power supply covers and lift using internal wiring"
            ],
            "answer": 1,
            "explanation": "Occupational safety standards mandate team lifting or mechanical assistance for heavy equipment exceeding 50 lbs, bending at the knees, keeping the load close to the body, and keeping the back straight."
        },
        {
            "exam": "core2",
            "domain": "4.0 Operational Procedures",
            "question": "In datacenter rack airflow management, why are blanking panels installed in empty, unpopulated rack unit (RU) spaces?",
            "options": [
                "To reduce electrical power draw",
                "To prevent hot exhaust air from circulating back into the cold aisle intake, maintaining thermal efficiency",
                "To block radio frequency signals",
                "To satisfy aesthetic lighting requirements"
            ],
            "answer": 1,
            "explanation": "Blanking panels prevent hot air exhaust at the rear of the rack from recirculating through empty slots to the front cold aisle intake, ensuring proper cooling airflow."
        }
    ]
    return qs

def get_curated_datacenter_core1_questions():
    qs = [
        # Domain 3.0: Hardware
        {
            "exam": "core1",
            "domain": "3.0 Hardware",
            "question": "A datacenter technician is building an enterprise database server that requires protection against single-bit memory errors and system halts. Which type of memory must the motherboard and CPU support?",
            "options": ["Non-ECC unbuffered DDR4", "ECC (Error-Correcting Code) RAM", "SODIMM DDR5", "Quad-channel non-parity RAM"],
            "answer": 1,
            "explanation": "ECC (Error-Correcting Code) RAM detects and corrects single-bit memory errors automatically, preventing data corruption and critical server crashes in enterprise environments."
        },
        {
            "exam": "core1",
            "domain": "3.0 Hardware",
            "question": "A storage array requires high-throughput data redundancy. The administrator installs four 4 TB enterprise drives configured in RAID 5. What is the total usable storage capacity and how many drive failures can it tolerate?",
            "options": [
                "16 TB usable, 0 drive failures",
                "12 TB usable, 1 drive failure",
                "8 TB usable, 2 drive failures",
                "4 TB usable, 3 drive failures"
            ],
            "answer": 1,
            "explanation": "RAID 5 uses striping with distributed parity. Usable capacity is (N - 1) * Drive Size. With four 4 TB drives: (4 - 1) * 4 TB = 12 TB usable, and it can survive exactly 1 drive failure."
        },
        {
            "exam": "core1",
            "domain": "3.0 Hardware",
            "question": "Which RAID level provides striping across mirrored drive pairs (a stripe of mirrors), requiring a minimum of four disks and providing both high performance and fault tolerance?",
            "options": ["RAID 0", "RAID 1", "RAID 5", "RAID 10 (1+0)"],
            "answer": 3,
            "explanation": "RAID 10 combines RAID 1 (mirroring) and RAID 0 (striping). It requires at least 4 drives and can survive at least one drive failure in each mirror set."
        },
        {
            "exam": "core1",
            "domain": "3.0 Hardware",
            "question": "A technician is installing an NVMe M.2 solid-state drive onto a server motherboard. Which bus interface does the NVMe protocol utilize to provide direct, low-latency, high-bandwidth communication with the CPU?",
            "options": ["SATA III (6 Gbps)", "PCIe (Peripheral Component Interconnect Express)", "USB 3.1 Gen 2", "SAS (Serial Attached SCSI)"],
            "answer": 1,
            "explanation": "NVMe (Non-Volatile Memory Express) SSDs communicate directly over the high-speed PCIe bus lanes, bypassing legacy SATA controller bottlenecks."
        },
        {
            "exam": "core1",
            "domain": "3.0 Hardware",
            "question": "A 1U rackmount server power supply unit (PSU) displays an 80 PLUS Titanium efficiency certification. Compared to 80 PLUS Bronze or Gold, what does this rating signify?",
            "options": [
                "It produces more heat inside the rack",
                "It achieves the highest electrical energy efficiency (at least 90-96% efficiency across loads), reducing datacenter cooling overhead",
                "It can only run on 120V residential current",
                "It does not require cooling fans"
            ],
            "answer": 1,
            "explanation": "80 PLUS ratings measure electrical energy efficiency. Titanium is the highest standard, requiring 90% to 96% efficiency, significantly cutting electrical waste and heat generation in server rooms."
        },
        {
            "exam": "core1",
            "domain": "3.0 Hardware",
            "question": "In a laser printer electrophotographic process, what is the correct chronological sequence of the six primary printing steps?",
            "options": [
                "Exposing -> Charging -> Developing -> Transferring -> Fusing -> Cleaning",
                "Cleaning -> Charging -> Exposing -> Developing -> Transferring -> Fusing",
                "Developing -> Exposing -> Cleaning -> Charging -> Fusing -> Transferring",
                "Charging -> Exposing -> Fusing -> Developing -> Transferring -> Cleaning"
            ],
            "answer": 1,
            "explanation": "The 6 steps of the laser printing cycle are: 1. Processing / Cleaning; 2. Charging (-600V); 3. Exposing (laser discharges image); 4. Developing (toner adheres); 5. Transferring (toner to paper); 6. Fusing (heat and pressure bond toner)."
        },
        {
            "exam": "core1",
            "domain": "3.0 Hardware",
            "question": "A technician notices that printed pages from a laser printer have toner that wipes off easily when touched by hand. Which printer assembly has failed?",
            "options": ["Imaging drum", "Primary corona wire", "Fuser assembly", "Pickup roller"],
            "answer": 2,
            "explanation": "The fuser assembly uses heat (approx. 200°C) and pressure rollers to permanently melt and bond toner particles into paper fibers. If the fuser is defective, toner will wipe right off."
        },

        # Domain 2.0: Networking
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "A network technician needs to securely manage remote datacenter switches and Linux servers over an encrypted terminal connection. Which port and protocol must be open on the management firewall?",
            "options": ["Telnet over port 23", "SSH (Secure Shell) over port 22", "RDP over port 3389", "HTTP over port 80"],
            "answer": 1,
            "explanation": "SSH (Secure Shell) uses TCP port 22 to provide encrypted command-line remote management, replacing insecure plain-text Telnet (port 23)."
        },
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "Which port does secure HTTPS web communication operate on by default?",
            "options": ["Port 80", "Port 443", "Port 8080", "Port 53"],
            "answer": 1,
            "explanation": "HTTPS (Hypertext Transfer Protocol Secure) operates over TCP port 443 using TLS encryption."
        },
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "A technician checks a workstation's IP configuration and sees an address of 169.254.42.100 with a subnet mask of 255.255.0.0. What does this indicate?",
            "options": [
                "The workstation received a valid public IP",
                "The DHCP server is unreachable, and the system assigned an APIPA (Automatic Private IP Addressing) link-local address",
                "The DNS server is offline",
                "The computer is configured for static IP assignment"
            ],
            "answer": 1,
            "explanation": "169.254.0.1 to 169.254.255.254 is the APIPA address range assigned automatically by Windows when a DHCP client cannot reach a DHCP server."
        },
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "Which standard Cat 6 cable wiring pinout puts the wire colors in this exact order from pin 1 to 8: White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown?",
            "options": ["T568A", "T568B", "Rollover", "Crossover 568A"],
            "answer": 1,
            "explanation": "T568B order is: Pin 1: White/Orange, Pin 2: Orange, Pin 3: White/Green, Pin 4: Blue, Pin 5: White/Blue, Pin 6: Green, Pin 7: White/Brown, Pin 8: Brown."
        },
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "What is the maximum standard certified segment distance for 10GBASE-T Ethernet transmission over Category 6 (Cat 6) unshielded twisted pair cable?",
            "options": ["100 meters", "55 meters", "30 meters", "10 meters"],
            "answer": 1,
            "explanation": "Cat 6 supports 10 Gbps speeds up to 55 meters (100 meters for 1 Gbps). Category 6a (augmented) is required to run 10 Gbps up to the full 100 meters."
        },
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "Which tool would a network technician use to trace and identify a specific unlabelled network cable buried deep inside a large server rack bundle?",
            "options": ["Crimper", "Toner probe (tone generator and inductive probe)", "Loopback plug", "Punchdown tool"],
            "answer": 1,
            "explanation": "A tone generator emits an audible electrical tone on the wire, which a handheld inductive toner probe detects through insulation to trace the cable."
        },
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "Which Wi-Fi standard operates exclusively in the 5 GHz band, providing speeds up to several Gbps through Multi-User MIMO?",
            "options": ["802.11b", "802.11g", "802.11n", "802.11ac (Wi-Fi 5)"],
            "answer": 3,
            "explanation": "802.11ac (Wi-Fi 5) operates exclusively in the 5 GHz radio spectrum. 802.11n operates in both 2.4 GHz and 5 GHz, while 802.11ax (Wi-Fi 6) adds 2.4 GHz and 5 GHz."
        },
        {
            "exam": "core1",
            "domain": "2.0 Networking",
            "question": "Which three non-overlapping 20 MHz channels are available in the 2.4 GHz wireless frequency band in North America?",
            "options": ["1, 2, and 3", "1, 6, and 11", "2, 4, and 8", "36, 40, and 44"],
            "answer": 1,
            "explanation": "In the 2.4 GHz spectrum, channels 1, 6, and 11 do not overlap with each other, avoiding co-channel and adjacent-channel interference."
        },

        # Domain 4.0: Virtualization and Cloud Computing
        {
            "exam": "core1",
            "domain": "4.0 Virtualization and Cloud Computing",
            "question": "A datacenter administrator installs VMware ESXi directly onto bare-metal server hardware without an underlying host operating system. Which type of hypervisor is this?",
            "options": ["Type 1 (Bare-metal) Hypervisor", "Type 2 (Hosted) Hypervisor", "Container runtime", "Emulation engine"],
            "answer": 0,
            "explanation": "Type 1 (bare-metal) hypervisors run directly on the host hardware (e.g., VMware ESXi, Microsoft Hyper-V Server, KVM), providing superior performance and isolation compared to Type 2 hosted hypervisors."
        },
        {
            "exam": "core1",
            "domain": "4.0 Virtualization and Cloud Computing",
            "question": "A software development firm rents virtual machines, virtual networks, and block storage from AWS, but installs and manages its own operating systems, middleware, and database engines. Which cloud service model is this?",
            "options": ["SaaS (Software as a Service)", "PaaS (Platform as a Service)", "IaaS (Infrastructure as a Service)", "DaaS (Desktop as a Service)"],
            "answer": 2,
            "explanation": "IaaS (Infrastructure as a Service) provides foundational compute, storage, and networking resources where the customer manages the operating system, applications, and configurations."
        },
        {
            "exam": "core1",
            "domain": "4.0 Virtualization and Cloud Computing",
            "question": "Which cloud computing characteristic describes the ability of cloud resources to automatically scale dynamically up or down in real time to meet fluctuating workload demands?",
            "options": ["Measured service", "Rapid elasticity", "Resource pooling", "On-demand self-service"],
            "answer": 1,
            "explanation": "Rapid elasticity is the cloud capability where resources can be dynamically provisioned and released to scale outward and inward based on real-time load."
        },
        {
            "exam": "core1",
            "domain": "4.0 Virtualization and Cloud Computing",
            "question": "What hardware feature must be enabled in the server's UEFI/BIOS configuration before a technician can launch 64-bit virtual machines in a Type 2 hypervisor?",
            "options": ["Intel VT-x or AMD-V", "Secure Boot", "PXE Network Boot", "Hyper-Threading (SMT)"],
            "answer": 0,
            "explanation": "Hardware-assisted virtualization (Intel VT-x or AMD-V) must be enabled in BIOS/UEFI to allow the hypervisor direct execution of privileged CPU instructions."
        },
        {
            "exam": "core1",
            "domain": "4.0 Virtualization and Cloud Computing",
            "question": "How does application containerization (such as Docker) fundamentally differ from traditional hardware virtualization?",
            "options": [
                "Containers share the host operating system kernel and isolate user-space, resulting in near-instant startup and minimal resource overhead",
                "Containers require dedicated physical network switches for each application",
                "Containers run their own complete copy of the Windows kernel",
                "Containers cannot run on Linux servers"
            ],
            "answer": 0,
            "explanation": "Containers share the host OS kernel and package only the application and its dependencies into isolated user spaces, avoiding the heavy overhead of running complete guest OS instances."
        },
        {
            "exam": "core1",
            "domain": "4.0 Virtualization and Cloud Computing",
            "question": "A corporate environment deploys low-cost endpoint hardware terminals with no local storage that connect back to centralized virtual machines hosted in the datacenter. What deployment model is this?",
            "options": ["VDI (Virtual Desktop Infrastructure) with Thin Clients", "SaaS with Thick Clients", "Peer-to-peer Workgroup", "Community Cloud DaaS"],
            "answer": 0,
            "explanation": "VDI (Virtual Desktop Infrastructure) hosts desktop environments on centralized servers in the datacenter, accessed by users via lightweight thin clients."
        },

        # Domain 1.0: Mobile Devices
        {
            "exam": "core1",
            "domain": "1.0 Mobile Devices",
            "question": "A mobile device's screen remains bright and clear, but touching or swiping on the glass no longer registers any user input. Which internal component has failed?",
            "options": ["Inverter", "LCD matrix", "Digitizer", "GPU"],
            "answer": 2,
            "explanation": "The digitizer is the touch-sensitive layer of glass that translates physical touches into digital input coordinates. If the image is clear but touch fails, the digitizer is faulty."
        },
        {
            "exam": "core1",
            "domain": "1.0 Mobile Devices",
            "question": "A user notices their corporate laptop trackpad is protruding upwards and the chassis seam is splitting open. What is the cause and what immediate safety action should be taken?",
            "options": [
                "The keyboard ribbon cable is pinched; push it back in firmly",
                "The lithium-ion battery is swollen; immediately power off the device, stop charging, and follow safe hazmat disposal protocols",
                "The CPU heat pipe is expanding; run fan diagnostic tools",
                "The trackpad mounting screws became loose; retighten them"
            ],
            "answer": 1,
            "explanation": "A bulging trackpad or splitting casing is a classic sign of a swollen lithium-ion battery. Swollen batteries present a serious thermal runaway / fire hazard. Stop use, do not puncture, disconnect power, and dispose per safety regulations."
        },

        # Domain 5.0: Troubleshooting
        {
            "exam": "core1",
            "domain": "5.0 Hardware and Network Troubleshooting",
            "question": "A newly assembled desktop powers on, fans spin, but the screen stays completely black and the motherboard emits a repeating series of short beeps without displaying POST. What is the MOST likely cause?",
            "options": ["Defective HDMI cable", "Unseated or faulty RAM", "Corrupt boot configuration data", "Failed secondary SATA hard drive"],
            "answer": 1,
            "explanation": "POST (Power-On Self-Test) beeps occur before the video subsystem is initialized. A continuous or repeating short beep code universally signifies missing, unseated, or defective system RAM."
        },
        {
            "exam": "core1",
            "domain": "5.0 Hardware and Network Troubleshooting",
            "question": "A workstation boots normally, but every time the power cord is unplugged from the wall, the system clock resets to 12:00 AM January 1, 2015 and BIOS settings revert to default. How should this be resolved?",
            "options": ["Update Windows Update", "Replace the CR2032 CMOS battery on the motherboard", "Replace the main ATX power supply unit", "Format the system drive"],
            "answer": 1,
            "explanation": "The CR2032 coin-cell CMOS battery maintains volatile RTC (Real-Time Clock) timekeeping and BIOS configuration settings when the computer is completely unpowered. When it dies, time and settings reset."
        },
        {
            "exam": "core1",
            "domain": "5.0 Hardware and Network Troubleshooting",
            "question": "Users in an office report that a shared network laser printer has completely stopped printing documents, and multiple print jobs are stuck with the status 'Error - Printing'. What service should the technician restart on the print server?",
            "options": ["DNS Client", "Print Spooler (spoolsv.exe)", "Remote Registry", "Workstation"],
            "answer": 1,
            "explanation": "The Print Spooler service manages all print jobs queued to local and network printers. If the queue hangs, restarting the Print Spooler service and clearing the spool directory resolves the issue."
        }
    ]
    return qs

def assemble_full_database():
    c1_1201 = extract_excel_core1_1201()
    c1_1101 = extract_excel_core1_1101()
    c1_1001 = extract_excel_core1_1001()
    md_c1, md_c2 = extract_markdown_questions()
    curated_c2 = get_curated_core2_questions()
    curated_c2_extra = load_core2_expansion()
    curated_c1 = get_curated_datacenter_core1_questions()

    print(
        f"Sources: 1201 Excel={len(c1_1201)}, 1101 Excel={len(c1_1101)}, "
        f"1001 Excel={len(c1_1001)}, MD C1={len(md_c1)}, MD C2={len(md_c2)}, "
        f"curated C1={len(curated_c1)}, curated C2={len(curated_c2)}, "
        f"curated C2 expansion={len(curated_c2_extra)}"
    )

    # Combine Core 1 (all course folders that yield Core 1 quiz items)
    raw_core1 = c1_1201 + c1_1101 + c1_1001 + md_c1 + curated_c1
    seen_q1 = set()
    dedup_core1 = []
    for item in raw_core1:
        key = re.sub(r'[^a-zA-Z0-9]', '', item['question'].lower())[:60]
        if key not in seen_q1 and len(key) > 8:
            seen_q1.add(key)
            item['id'] = f"C1-{len(dedup_core1)+1:03d}"
            dedup_core1.append(item)

    # Combine Core 2
    raw_core2 = md_c2 + curated_c2 + curated_c2_extra
    seen_q2 = set()
    dedup_core2 = []
    for item in raw_core2:
        key = re.sub(r'[^a-zA-Z0-9]', '', item['question'].lower())[:60]
        if key not in seen_q2 and len(key) > 8:
            seen_q2.add(key)
            item['id'] = f"C2-{len(dedup_core2)+1:03d}"
            dedup_core2.append(item)

    print(f"Total Unique Core 1 Questions: {len(dedup_core1)}")
    print(f"Total Unique Core 2 Questions: {len(dedup_core2)}")

    exam_database = {
        "version": "2.0",
        "title": "CompTIA A+ (220-1101/1201 Core 1 & 220-1102/1202 Core 2) Exam Question Bank",
        "description": "Enterprise-grade question bank assembled from TOTAL 1201, Core 1 1101, legacy 1001 quizzes, Mastery practice questions, practice exam markdown, and curated datacenter scenarios.",
        "sources": [
            "TOTAL-CompTIA-A-Core-1-220-1201-v15-Course",
            "CompTIA-A-Certification-Core-1---220-1101",
            "CompTIA-A-Certification-220-1001-The-Total-Course",
            "CompTIA-A-Plus-Practice-Questions",
            "CompTIA_A_Plus_Mastery/DEEP_DIVE/35_Practice_Questions.md",
            "Curated datacenter Core 1/Core 2 scenarios",
            "curated_core2_expansion.json"
        ],
        "passing_score_core1": 675,
        "passing_score_core2": 700,
        "fail_minimum_score": 674,
        "max_time_minutes": 90,
        "max_questions_per_exam": 90,
        "core1": dedup_core1,
        "core2": dedup_core2
    }

    with open('exam_data.json', 'w', encoding='utf-8') as f:
        json.dump(exam_database, f, indent=2)

    with open('exam_data.js', 'w', encoding='utf-8') as f:
        f.write("window.COMPTIA_EXAM_DATA = ")
        json.dump(exam_database, f, indent=2)
        f.write(";\n")

    print("Saved exam_data.json and exam_data.js successfully!")

if __name__ == '__main__':
    assemble_full_database()
