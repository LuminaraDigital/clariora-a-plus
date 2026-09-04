# c2_fixed_data_part2.py: C2-076 to C2-142
part2 = [
    {
        "id": "C2-076",
        "objective": "1.1",
        "difficulty": "medium",
        "tags": ["partitioning", "gpt", "large-drives", "storage"],
        "question": "A system administrator needs to partition a new 6 TB enterprise storage volume on a Windows Server. Which partition style must be chosen to utilize the full 6 TB capacity as a single contiguous volume?",
        "options": ["MBR (Master Boot Record)", "GPT (GUID Partition Table)", "FAT32 partition scheme", "Dynamic Extended Volume (DEV)"],
        "answer": 1,
        "explanation": "GUID Partition Table (GPT) uses 64-bit logical block addressing and supports disk capacities up to 9.4 ZB (zettabytes) and up to 128 primary partitions in Windows. In contrast, legacy MBR is capped at 2.2 TB due to 32-bit sector addressing. FAT32 has a 4 GB file size limit, and DEV is a non-standard acronym.",
        "distractor_analysis": {
            "0": "MBR uses 32-bit sector addressing and cannot address storage capacity beyond 2.2 TB.",
            "2": "FAT32 is a legacy file system with a 32 GB volume creation limit in Windows and 4 GB file size ceiling.",
            "3": "Dynamic Extended Volume is a distractor term; GPT is the required modern partition style."
        }
    },
    {
        "id": "C2-077",
        "objective": "1.2",
        "difficulty": "medium",
        "tags": ["windows-11", "system-requirements", "uefi", "tpm"],
        "question": "An IT technician is preparing to install Windows 11 Pro on newly assembled desktop hardware. What firmware mode and security hardware must be enabled in the BIOS/UEFI configuration?",
        "options": ["Legacy BIOS mode with CSM enabled", "UEFI mode with Secure Boot enabled and TPM 2.0 active", "Legacy MBR boot mode with BitLocker bypass", "AHCI mode with CSM active and Secure Boot disabled"],
        "answer": 1,
        "explanation": "Windows 11 mandates UEFI firmware with Secure Boot capability enabled and an active Trusted Platform Module (TPM) version 2.0 for hardware-rooted security features like BitLocker, Credential Guard, and Windows Hello. Legacy BIOS and CSM (Compatibility Support Module) are obsolete and unsupported for Windows 11.",
        "distractor_analysis": {
            "0": "Legacy BIOS and CSM bypass UEFI security checks and are incompatible with Windows 11 system requirements.",
            "2": "Windows 11 requires UEFI and GPT partitioning; MBR boot is not supported.",
            "3": "Disabling Secure Boot and enabling CSM prevents Windows 11 from passing pre-installation hardware verification."
        }
    },
    {
        "id": "C2-078",
        "objective": "1.2",
        "difficulty": "easy",
        "tags": ["deployment", "pxe", "network-boot", "wds"],
        "question": "A technician needs to deploy Windows across 50 workstations simultaneously over the local datacenter subnet without inserting physical USB media into each system. Which technology allows systems to boot an OS installer from the network?",
        "options": ["PXE (Preboot Execution Environment)", "FAT32 USB installer", "Windows To Go", "Internal DVD-ROM drive"],
        "answer": 0,
        "explanation": "Preboot Execution Environment (PXE) allows network interface cards (NICs) to retrieve an IP address via DHCP and download boot files via TFTP from a network deployment server (such as WDS or MECM/SCCM). This enables bare-metal automated OS imaging without local physical installation media.",
        "distractor_analysis": {
            "1": "FAT32 USB installers require physical technician touch on every individual machine.",
            "2": "Windows To Go runs a portable Windows workspace from a certified USB drive, rather than performing network OS imaging.",
            "3": "Optical DVD-ROMs require local disc loading and are too slow for mass workstation deployments."
        }
    },
    {
        "id": "C2-079",
        "objective": "1.5",
        "difficulty": "easy",
        "tags": ["cli", "sfc", "system-integrity", "command-line"],
        "question": "Which Windows command-line utility scans the integrity of all protected system files and replaces damaged or missing operating system DLLs with correct Microsoft versions?",
        "options": ["`chkdsk /f`", "`sfc /scannow`", "`diskpart /clean`", "`bootrec /fixboot`"],
        "answer": 1,
        "explanation": "The System File Checker (`sfc /scannow`) scans all protected Windows system files and verifies their digital signatures against cached backups in the component store, automatically repairing missing or corrupted operating system files. `chkdsk` repairs disk sectors, `diskpart` manages partitions, and `bootrec` repairs boot records.",
        "distractor_analysis": {
            "0": "`chkdsk /f` fixes file system metadata and directory structures on disk volumes, not corrupted operating system DLLs.",
            "2": "`diskpart /clean` wipes partition configuration from a target drive.",
            "3": "`bootrec /fixboot` writes a new partition boot sector to the system partition."
        }
    },
    {
        "id": "C2-080",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "gpresult", "group-policy", "rsop"],
        "question": "A technician needs to verify which Group Policy Objects (GPOs) are currently applied to a domain-joined computer and logged-in user to diagnose an access issue. Which command displays this information?",
        "options": ["`gpupdate /force`", "`gpresult /r`", "`secpol.msc`", "`net user /domain`"],
        "answer": 1,
        "explanation": "The `gpresult /r` command outputs a detailed Resultant Set of Policy (RSoP) summary in the console, listing applied GPOs, security group memberships, and filtering status for both the computer and user. `gpupdate /force` reapplies policy, `secpol.msc` manages local policy, and `net user` inspects user account properties.",
        "distractor_analysis": {
            "0": "`gpupdate /force` refreshes Group Policy from domain controllers but does not display an RSoP report.",
            "2": "`secpol.msc` opens the GUI Local Security Policy editor on the local machine.",
            "3": "`net user /domain` displays account properties from Active Directory rather than applied GPO hierarchies."
        }
    },
    {
        "id": "C2-081",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "robocopy", "mir", "replication"],
        "question": "A technician needs to schedule an automated daily file copy that mirrors an entire source directory to a backup drive, resumes interrupted transfers, and preserves NTFS permissions. Which command should be used?",
        "options": ["`copy /y *.* D:\\Backup`", "`xcopy C:\\Data D:\\Backup /s`", "`robocopy C:\\Data D:\\Backup /mir /z`", "`move C:\\Data D:\\Backup`"],
        "answer": 2,
        "explanation": "`robocopy` with the `/mir` switch mirrors a directory tree (equivalent to `/e` plus deleting destination files no longer in source) and `/z` enables restartable mode across network interruptions. Standard `copy`, `xcopy`, and `move` lack robust network resumption and complete directory mirroring logic.",
        "distractor_analysis": {
            "0": "`copy` lacks subdirectory recursion and cannot resume interrupted large network file transfers.",
            "1": "`xcopy /s` copies directories but skips empty folders and does not purge deleted files like `/mir`.",
            "3": "`move` deletes source files after transfer instead of creating an ongoing backup replica."
        }
    },
    {
        "id": "C2-082",
        "objective": "1.4",
        "difficulty": "easy",
        "tags": ["mmc", "lusrmgr", "user-management", "snap-in"],
        "question": "Which Microsoft Management Console (.msc) snap-in is used on Windows Pro to create local user accounts, reset local passwords, and manage local security groups?",
        "options": ["`dsa.msc`", "`lusrmgr.msc`", "`services.msc`", "`compmgmt.msc`"],
        "answer": 1,
        "explanation": "`lusrmgr.msc` directly opens the Local Users and Groups console. `dsa.msc` is Active Directory Users and Computers (for domain controllers), `services.msc` manages background services, and `compmgmt.msc` opens Computer Management (which contains lusrmgr along with other tools).",
        "distractor_analysis": {
            "0": "`dsa.msc` manages Active Directory domain objects and is not installed on standard standalone clients.",
            "2": "`services.msc` manages background Windows system services and startup types.",
            "3": "`compmgmt.msc` is the container console that hosts multiple snap-ins, whereas `lusrmgr.msc` is the dedicated local user tool."
        }
    },
    {
        "id": "C2-083",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["registry", "hkcu", "hklm", "user-hive"],
        "question": "Which Windows Registry root key stores configuration settings, desktop appearance options, and software preferences specific to the currently logged-on user?",
        "options": ["`HKEY_LOCAL_MACHINE (HKLM)`", "`HKEY_CLASSES_ROOT (HKCR)`", "`HKEY_CURRENT_USER (HKCU)`", "`HKEY_CURRENT_CONFIG (HKCC)`"],
        "answer": 2,
        "explanation": "`HKEY_CURRENT_USER (HKCU)` stores configuration settings for the currently logged-on user, dynamically loaded from the user's `NTUSER.DAT` file. `HKLM` stores system-wide settings applicable to all users, `HKCR` handles file associations and COM classes, and `HKCC` points to runtime hardware profiles.",
        "distractor_analysis": {
            "0": "`HKLM` contains machine-wide settings and hardware configurations shared across all user profiles.",
            "1": "`HKCR` manages file type extensions, OLE registrations, and COM object mappings.",
            "3": "`HKCC` contains runtime hardware configuration pointers linked from `HKLM\\SYSTEM`."
        }
    },
    {
        "id": "C2-084",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "chown", "ownership", "cli"],
        "question": "A Linux administrator needs to change the ownership of a file named `report.txt` so that the user `datacenter_admin` is the owner and the group `sysadmins` is the group owner. Which command executes this?",
        "options": ["`chmod 777 report.txt`", "`chown datacenter_admin:sysadmins report.txt`", "`chgrp root report.txt`", "`passwd datacenter_admin report.txt`"],
        "answer": 1,
        "explanation": "The `chown` (change owner) command with the syntax `user:group filename` changes both the user owner and group owner simultaneously. `chmod` alters file permission bits (read/write/execute), `chgrp` changes only the group, and `passwd` updates user account passwords.",
        "distractor_analysis": {
            "0": "`chmod 777` grants full read, write, and execute permissions to all users without changing file ownership.",
            "2": "`chgrp root` only modifies the group owner to root without setting the user owner.",
            "3": "`passwd` modifies user account passwords, not file ownership metadata."
        }
    },
    {
        "id": "C2-085",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "permissions", "chmod", "octal"],
        "question": "In Linux, what permissions are granted to the file owner, group owner, and others when a file has permissions set to `chmod 754 data.csv`?",
        "options": ["Owner: rwx, Group: r-x, Others: r--", "Owner: r-x, Group: rwx, Others: --x", "Owner: rwx, Group: rw-, Others: r--", "Owner: rw-, Group: r--, Others: ---"],
        "answer": 0,
        "explanation": "Octal permissions in Linux calculate Read=4, Write=2, Execute=1. The first digit '7' (4+2+1) grants the Owner Read, Write, and Execute (`rwx`). The second digit '5' (4+1) grants the Group Read and Execute (`r-x`). The third digit '4' (4) grants Others Read-only (`r--`).",
        "distractor_analysis": {
            "1": "This reverses owner and group values and misinterprets the octal digits 7, 5, and 4.",
            "2": "Group 'rw-' corresponds to octal 6 (4+2), not 5 (4+1).",
            "3": "Owner 'rw-' corresponds to octal 6 (4+2), not 7 (4+2+1)."
        }
    },
    {
        "id": "C2-086",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "grep", "log-analysis", "cli"],
        "question": "A technician needs to search through a 500 MB Apache server log file (`/var/log/apache2/access.log`) in Linux and output only lines containing the IP address `192.168.1.105`. Which command is BEST?",
        "options": ["`find /var/log/apache2/access.log -name '192.168.1.105'`", "`grep '192.168.1.105' /var/log/apache2/access.log`", "`cat /var/log/apache2/access.log`", "`ls -la /var/log/apache2/access.log`"],
        "answer": 1,
        "explanation": "`grep` (Global Regular Expression Print) searches inside text files line by line and displays matching patterns (such as IP addresses). `find` searches directory structures for filenames/metadata, `cat` dumps the entire 500 MB file to the screen without filtering, and `ls` only lists file directory attributes.",
        "distractor_analysis": {
            "0": "`find` locates files in the directory tree based on filenames or attributes, rather than searching file contents.",
            "2": "`cat` dumps the entire 500 MB file to terminal output without performing pattern matching.",
            "3": "`ls -la` displays file permissions, size, and date metadata without reading file content."
        }
    },
    {
        "id": "C2-087",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "time-machine", "backup", "apple"],
        "question": "Which native macOS utility is used to perform automated incremental backups to an external Thunderbolt drive or network share, allowing users to restore previous versions of files?",
        "options": ["Disk Utility", "Time Machine", "Boot Camp Assistant", "Mission Control"],
        "answer": 1,
        "explanation": "Time Machine is the built-in backup mechanism in macOS that creates hourly snapshots of modified files to external or network storage. Disk Utility manages formatting and partitions, Boot Camp Assistant partitions drives for dual-booting Windows on Intel Macs, and Mission Control provides window management.",
        "distractor_analysis": {
            "0": "Disk Utility performs disk partitioning, formatting, and First Aid filesystem repairs.",
            "2": "Boot Camp Assistant is used on Intel-based Macs to configure dual-boot Windows installations.",
            "3": "Mission Control provides a visual overview of open windows, desktop spaces, and full-screen apps."
        }
    },
    {
        "id": "C2-088",
        "objective": "1.8",
        "difficulty": "medium",
        "tags": ["macos", "keychain", "passwords", "security"],
        "question": "Which macOS management utility is used to securely store and manage user passwords, private encryption keys, Wi-Fi network credentials, and digital certificates?",
        "options": ["Keychain Access", "Terminal", "Activity Monitor", "Console"],
        "answer": 0,
        "explanation": "Keychain Access is Apple's built-in password and credential management subsystem in macOS. It encrypts passwords, digital certificates, private keys, and secure notes. Terminal provides CLI shell access, Activity Monitor tracks CPU/RAM usage, and Console views system logs.",
        "distractor_analysis": {
            "1": "Terminal opens the command-line interface for running Zsh/Bash shell commands.",
            "2": "Activity Monitor is the macOS equivalent of Windows Task Manager for monitoring processes and resource usage.",
            "3": "Console is the macOS log viewer used to inspect system diagnostic messages and crash reports."
        }
    },
    {
        "id": "C2-089",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["remote-desktop", "rdp", "windows-pro", "system-settings"],
        "question": "A user on Windows 11 Pro wants to connect to their office workstation from home using Microsoft Remote Desktop. Which configuration setting must be enabled on the office workstation?",
        "options": ["Remote Assistance must be requested via email", "Remote Desktop must be enabled in Settings -> System -> Remote Desktop", "Telnet Client must be turned on in Windows Features", "The computer must be demoted to a Workgroup"],
        "answer": 1,
        "explanation": "In Windows Pro/Enterprise, inbound RDP connections require explicitly turning on 'Remote Desktop' under Settings -> System -> Remote Desktop (or System Properties -> Remote tab). This starts the Remote Desktop Service and automatically configures inbound firewall rules on TCP port 3389. Remote Assistance requires user invitation, Telnet is an unencrypted CLI, and domain membership supports RDP.",
        "distractor_analysis": {
            "0": "Remote Assistance is an interactive screen-sharing tool requiring an active user invitation, not unattended RDP.",
            "2": "Telnet is an insecure plaintext CLI protocol and is not used by Microsoft Remote Desktop.",
            "3": "Active Directory domain membership fully supports RDP authentication and does not need to be removed."
        }
    },
    {
        "id": "C2-090",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "taskkill", "process-management", "troubleshooting"],
        "question": "A technician needs to forcibly terminate a frozen background process with Process ID (PID) 4820 and all of its child processes from Command Prompt. Which command achieves this?",
        "options": ["`kill -9 4820`", "`taskkill /PID 4820 /F /T`", "`tasklist /PID 4820 /close`", "`shutdown /p /f 4820`"],
        "answer": 1,
        "explanation": "In Windows, `taskkill /PID 4820 /F /T` terminates the process with PID 4820. The `/F` switch specifies forceful termination, and `/T` terminates the process along with any child processes it spawned (process tree termination). `kill` is a Linux command, `tasklist` only lists processes, and `shutdown` restarts or powers off the computer.",
        "distractor_analysis": {
            "0": "`kill -9` is the Unix/Linux command to send a SIGKILL signal to a PID, not a native Windows command.",
            "2": "`tasklist` displays running processes and PIDs but cannot terminate them.",
            "3": "`shutdown` is used for operating system reboot and power control, not individual process termination."
        }
    },
    {
        "id": "C2-091",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "netstat", "listening-ports", "network-troubleshooting"],
        "question": "A technician needs to view active network connections, listening ports, process IDs (PIDs), AND the executable binary name responsible for each connection. Which command should be executed?",
        "options": ["`netstat -b -ano`", "`ipconfig /all`", "`tracert -h 30`", "`ping -t 127.0.0.1`"],
        "answer": 0,
        "explanation": "In Windows, `netstat -b -ano` displays all active connections and listening ports (`-a`), numerical addresses/ports (`-n`), owning Process ID (`-o`), and the executable component name (`-b`, requires administrative elevation). `ipconfig` displays adapter settings, `tracert` traces router hops, and `ping -t` performs continuous reachability tests.",
        "distractor_analysis": {
            "1": "`ipconfig /all` lists MAC addresses, DHCP lease dates, and DNS servers, but not active socket connections.",
            "2": "`tracert -h 30` traces router hops up to a maximum of 30 hops.",
            "3": "`ping -t 127.0.0.1` pings the local loopback adapter continuously until interrupted."
        }
    },
    {
        "id": "C2-092",
        "objective": "1.4",
        "difficulty": "medium",
        "tags": ["msconfig", "clean-boot", "startup", "system-configuration"],
        "question": "Which Windows tool allows a technician to configure diagnostic startup modes, perform a clean boot by disabling non-Microsoft services, and edit boot parameter flags?",
        "options": ["`msconfig` (System Configuration)", "`dxdiag` (DirectX Diagnostic Tool)", "`regedit` (Registry Editor)", "`cleanmgr` (Disk Cleanup)"],
        "answer": 0,
        "explanation": "System Configuration (`msconfig.exe`) allows technicians to configure boot options (Safe Boot, Minimal, Network), manage boot parameters, and perform clean boots by selectively disabling non-Microsoft background services. `dxdiag` tests DirectX, `regedit` edits raw registry hives, and `cleanmgr` removes temporary files.",
        "distractor_analysis": {
            "1": "`dxdiag` tests video and sound DirectX acceleration components.",
            "2": "`regedit` provides raw registry key editing without automated clean-boot management workflows.",
            "3": "`cleanmgr` is the Disk Cleanup tool used to reclaim storage space."
        }
    },
    {
        "id": "C2-093",
        "objective": "1.9",
        "difficulty": "easy",
        "tags": ["linux", "df", "disk-space", "cli"],
        "question": "In Linux, which command displays information about available and used disk space on all mounted filesystems in human-readable format (e.g., GB, MB)?",
        "options": ["`df -h`", "`du -sh`", "`free -m`", "`top`"],
        "answer": 0,
        "explanation": "`df -h` (disk free, human-readable) displays filesystem disk usage, mount points, total capacity, used space, and available space in KB, MB, or GB. `du -sh` estimates disk usage of a specific directory tree, `free -m` displays physical and swap memory utilization, and `top` displays active process CPU usage.",
        "distractor_analysis": {
            "1": "`du -sh` summarizes the disk space consumed by a specific folder and its contents, not overall filesystem capacity.",
            "2": "`free -m` reports available and used physical RAM and swap space in megabytes.",
            "3": "`top` displays real-time CPU and memory utilization per running process."
        }
    },
    {
        "id": "C2-094",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["chkdsk", "bad-sectors", "file-system", "disk-repair"],
        "question": "Which command-line tool in Windows checks the file system metadata of a volume for logical errors, locates bad physical sectors, and attempts to recover readable data?",
        "options": ["`chkdsk /r`", "`sfc /scannow`", "`format /q`", "`diskpart`"],
        "answer": 0,
        "explanation": "The `chkdsk /r` command locates bad physical sectors on the storage drive, recovers readable information from them, and fixes volume file system errors (implying `/f`). `sfc` checks core Windows OS files, `format /q` performs a quick format that erases file tables, and `diskpart` manages volume layout.",
        "distractor_analysis": {
            "1": "`sfc /scannow` verifies the cryptographic integrity of Windows OS system files, not physical drive sectors.",
            "2": "`format /q` initializes file tables without scanning for bad disk sectors.",
            "3": "`diskpart` creates and formats volume partitions without executing sector recovery diagnostics."
        }
    },
    {
        "id": "C2-095",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "whaling", "spear-phishing", "cfo"],
        "question": "An enterprise executive receives a targeted, personalized email claiming to be from corporate legal counsel demanding an urgent wire transfer to settle a pending acquisition lawsuit. What type of social engineering attack is this?",
        "options": ["Vishing", "Whaling", "Shoulder Surfing", "Watering Hole Attack"],
        "answer": 1,
        "explanation": "Whaling is a highly targeted form of spear phishing directed specifically at senior executives, board members, or high-value financial officers. Vishing uses voice phone calls, shoulder surfing is visual screen snooping, and watering hole attacks compromise industry websites.",
        "distractor_analysis": {
            "0": "Vishing is social engineering conducted via voice telephone conversations.",
            "2": "Shoulder surfing involves physically looking at a user's screen or keyboard input.",
            "3": "A watering hole attack infects a third-party website commonly visited by target company employees."
        }
    },
    {
        "id": "C2-096",
        "objective": "2.5",
        "difficulty": "easy",
        "tags": ["social-engineering", "tailgating", "physical-security", "door-access"],
        "question": "An unauthorized person follows closely behind an authorized employee entering a secure datacenter facility without scanning a badge. What security violation has occurred?",
        "options": ["Tailgating", "Dumpster Diving", "Quishing", "Brute Force"],
        "answer": 0,
        "explanation": "Tailgating (or piggybacking) is a physical security breach where an unauthorized individual follows an authorized person through a secure door or barrier without presenting valid authentication credentials. Dumpster diving searches trash, quishing uses QR codes, and brute force is password guessing.",
        "distractor_analysis": {
            "1": "Dumpster diving is searching discarded trash for passwords and confidential paperwork.",
            "2": "Quishing is a phishing attack delivered through deceptive QR codes.",
            "3": "Brute force is an automated cryptographic attack that systematically guesses passwords."
        }
    },
    {
        "id": "C2-097",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["physical-security", "mantrap", "access-control-vestibule", "datacenter"],
        "question": "Which physical security control uses a two-door airlock system where the first door must close and lock before the second door can open, strictly enforcing single-person authentication?",
        "options": ["Turnstile", "Access control vestibule (Mantrap)", "Bollard", "Biometric Retina Scanner"],
        "answer": 1,
        "explanation": "An access control vestibule (mantrap) consists of an enclosed entry chamber with two interlocking doors designed so that only one door can be open at a time, physically preventing tailgating and unauthorized access. Turnstiles allow rotational passage, bollards stop vehicles, and retina scanners are authentication sensors.",
        "distractor_analysis": {
            "0": "Turnstiles are mechanical gates that rotate for one person but do not physically enclose the occupant between two interlocking doors.",
            "2": "Bollards are heavy vertical concrete/steel posts that protect building perimeters from vehicle impacts.",
            "3": "A retina scanner is a biometric authentication device that verifies identity but does not physically trap followers on standard swing doors."
        }
    },
    {
        "id": "C2-098",
        "objective": "2.2",
        "difficulty": "hard",
        "tags": ["windows-permissions", "ntfs", "share-permissions", "security"],
        "question": "A shared folder on an NTFS volume has Share permissions set to Read for Domain Users and NTFS permissions set to Modify for Domain Users. What is the effective permission when a domain user accesses the folder across the network?",
        "options": ["Modify", "Read", "Full Control", "Write Only"],
        "answer": 1,
        "explanation": "When accessing files over the network, Windows combines Share permissions and NTFS permissions, and the MOST RESTRICTIVE permission takes precedence. Between Share: Read and NTFS: Modify, the more restrictive permission is Read. The user will have Read-only access over the network.",
        "distractor_analysis": {
            "0": "Modify is granted at the NTFS level, but is blocked across the network by the more restrictive Share: Read setting.",
            "2": "Full Control is not assigned in either Share or NTFS permission tables.",
            "3": "Write Only is not a standard Windows permission and write access is denied by Share: Read."
        }
    },
    {
        "id": "C2-099",
        "objective": "2.2",
        "difficulty": "medium",
        "tags": ["encryption", "bitlocker", "efs", "windows-security"],
        "question": "What is the primary difference between Microsoft BitLocker and Encrypting File System (EFS)?",
        "options": ["EFS encrypts entire drive volumes, while BitLocker encrypts individual files", "BitLocker encrypts entire disk volumes, while EFS encrypts individual files and folders", "BitLocker only works on FAT32, while EFS only works on exFAT", "BitLocker requires a cloud subscription, while EFS is hardware-based"],
        "answer": 1,
        "explanation": "BitLocker provides full-volume encryption (FVE), protecting entire storage volumes (OS, system files, free space) and relying on TPM hardware. In contrast, EFS (Encrypting File System) operates at the file system layer on NTFS, encrypting individual files and folders tied to specific user certificates.",
        "distractor_analysis": {
            "0": "This reverses the definitions; BitLocker operates on whole volumes, whereas EFS operates on individual files/folders.",
            "2": "BitLocker and EFS both require NTFS volumes on internal storage drives.",
            "3": "BitLocker is a native feature of Windows Pro/Enterprise and does not require cloud subscriptions."
        }
    },
    {
        "id": "C2-100",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-security", "wpa3", "sae", "encryption"],
        "question": "Which wireless security protocol replaces Pre-Shared Key (PSK) with Simultaneous Authentication of Equals (SAE) to protect against offline dictionary attacks?",
        "options": ["WEP", "WPA-Enterprise", "WPA2-Personal", "WPA3-Personal"],
        "answer": 3,
        "explanation": "WPA3-Personal introduces Simultaneous Authentication of Equals (SAE), a dragonfly handshake that provides forward secrecy and resistance to offline dictionary and brute-force password-guessing attacks. WEP, WPA, and WPA2-Personal use vulnerable legacy key exchanges.",
        "distractor_analysis": {
            "0": "WEP is an insecure legacy protocol broken by static 64/128-bit RC4 keys.",
            "1": "WPA-Enterprise uses 802.1X with a RADIUS server, not SAE.",
            "2": "WPA2-Personal uses the 4-way PSK handshake vulnerable to offline dictionary cracking if captured."
        }
    },
    {
        "id": "C2-101",
        "objective": "2.3",
        "difficulty": "hard",
        "tags": ["radius", "802.1x", "ports", "protocols"],
        "question": "In an enterprise network using 802.1X wireless authentication, client devices authenticate against a centralized authentication server. Which protocol and default UDP ports are commonly used for this service?",
        "options": ["TACACS+ over TCP 49", "RADIUS over UDP 1812 and 1813", "LDAP over TCP 389", "Kerberos over TCP 88"],
        "answer": 1,
        "explanation": "RADIUS (Remote Authentication Dial-In User Service) is the standard protocol for enterprise 802.1X wireless authentication, using UDP port 1812 for authentication and authorization, and UDP port 1813 for accounting. TACACS+ uses TCP 49, LDAP uses TCP 389, and Kerberos uses port 88.",
        "distractor_analysis": {
            "0": "TACACS+ operates on TCP port 49 and is used primarily for router/switch administrative command authorization.",
            "2": "LDAP operates on TCP port 389 for directory queries, not direct 802.1X EAP frame encapsulation.",
            "3": "Kerberos operates on port 88 for ticket granting in Active Directory."
        }
    },
    {
        "id": "C2-102",
        "objective": "2.10",
        "difficulty": "easy",
        "tags": ["soho-security", "wps", "router-hardening", "pin-attack"],
        "question": "When hardening a new SOHO wireless router in a small branch office, which feature should be disabled IMMEDIATELY due to well-known 8-digit PIN brute-force vulnerabilities?",
        "options": ["WPA3 encryption", "WPS (Wi-Fi Protected Setup)", "WPA2-AES encryption", "MAC address filtering"],
        "answer": 1,
        "explanation": "Wi-Fi Protected Setup (WPS) uses an 8-digit PIN designed for easy device pairing. Due to a design flaw, the PIN is validated in two halves, allowing attackers to brute-force the PIN in hours using tools like Reaver. Security best practices mandate disabling WPS on all routers. WPA2/WPA3 provide essential security, and MAC filtering is harmless.",
        "distractor_analysis": {
            "0": "WPA3 encryption is the most secure wireless standard available and should be enabled, not disabled.",
            "2": "WPA2-AES is robust and secure; disabling it degrades wireless security.",
            "3": "MAC filtering restricts access by hardware address; while not strong security alone, it is not a high-risk vulnerability like WPS."
        }
    },
    {
        "id": "C2-103",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["network-attacks", "mitm", "on-path", "arp-spoofing"],
        "question": "What type of attack occurs when an attacker intercepts network communication between two systems, secretly eavesdropping on or altering packets without either party knowing?",
        "options": ["DDoS attack", "Man-in-the-Middle (On-path attack)", "Brute-force attack", "Logic bomb"],
        "answer": 1,
        "explanation": "A Man-in-the-Middle (MitM) attack, also known as an On-Path attack, occurs when an attacker intercepts, inspects, or modifies data flowing between two endpoints (often achieved via ARP poisoning or rogue Wi-Fi APs). DDoS floods bandwidth, brute force guesses passwords, and logic bombs execute malicious code on a trigger.",
        "distractor_analysis": {
            "0": "A DDoS (Distributed Denial of Service) attack aims to exhaust server resources or bandwidth to take it offline.",
            "2": "A brute-force attack systematically attempts credential combinations to guess a password.",
            "3": "A logic bomb is code that executes a malicious action when a specific trigger condition is met."
        }
    },
    {
        "id": "C2-104",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["mfa", "authentication-factors", "smart-card", "biometrics"],
        "question": "A user authenticates to their corporate account by entering a password, inserting a smart card, and scanning their fingerprint. How many distinct authentication factors are being used?",
        "options": ["One factor", "Two factors", "Three factors", "Four factors"],
        "answer": 2,
        "explanation": "This scenario utilizes three distinct authentication factor categories: 1. Password ('Something you know'), 2. Smart Card ('Something you have'), and 3. Fingerprint ('Something you are'). Because three distinct categories are present, this is true three-factor authentication (3FA).",
        "distractor_analysis": {
            "0": "One factor would only include elements from a single category (e.g., password and PIN).",
            "1": "Two factors would include credentials from only two distinct categories.",
            "3": "Four factors would require an additional distinct factor category (such as 'Somewhere you are' or 'Something you do')."
        }
    },
    {
        "id": "C2-105",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-attacks", "evil-twin", "rogue-ap", "public-wifi"],
        "question": "A user connects to a public Wi-Fi access point at an airport that has the exact same SSID as the official airport network but is operated by an attacker to intercept traffic. What type of rogue wireless device is this?",
        "options": ["Evil Twin", "WPS attack", "Bluejacking", "MAC spoofing"],
        "answer": 0,
        "explanation": "An Evil Twin is a rogue wireless access point configured with the identical SSID, channel, and visual appearance of a legitimate network to fool unsuspecting users into connecting so the attacker can intercept credentials and data. Bluejacking is sending unsolicited Bluetooth messages, and MAC spoofing alters hardware addresses.",
        "distractor_analysis": {
            "1": "WPS attacks exploit PIN vulnerabilities on routers rather than broadcasting deceptive clone SSIDs.",
            "2": "Bluejacking sends unsolicited text or vCard messages over short-range Bluetooth.",
            "3": "MAC spoofing modifies the layer 2 hardware address of a network interface card."
        }
    },
    {
        "id": "C2-106",
        "objective": "2.1",
        "difficulty": "easy",
        "tags": ["access-control", "least-privilege", "security-principles", "rbac"],
        "question": "Which security concept states that users and system accounts should only be granted the minimum level of access and permissions necessary to perform their assigned job duties?",
        "options": ["Separation of Duties", "Principle of Least Privilege", "Defense in Depth", "Single Sign-On"],
        "answer": 1,
        "explanation": "The Principle of Least Privilege dictates that accounts, processes, and programs are given only the bare minimum rights and access permissions required to execute their specific job functions, minimizing the potential blast radius of a compromised account. Separation of duties divides critical tasks among multiple people, and defense in depth uses layered controls.",
        "distractor_analysis": {
            "0": "Separation of Duties splits a single critical business process across multiple individuals to prevent fraud.",
            "2": "Defense in Depth implements multiple overlapping layers of security controls (firewalls, AV, encryption).",
            "3": "Single Sign-On (SSO) allows a user to authenticate once and access multiple independent applications."
        }
    },
    {
        "id": "C2-107",
        "objective": "2.8",
        "difficulty": "medium",
        "tags": ["mobile-security", "mam", "mdm", "byod", "containerization"],
        "question": "A technician is deploying corporate smartphones. Management wants to secure corporate emails and documents inside an encrypted sandbox without tracking or wiping employees' personal photos and apps. Which mobile management approach is BEST?",
        "options": ["Mobile Application Management (MAM) with containerization", "Full Mobile Device Management (MDM) with complete factory wipe policy", "Geofencing with permanent GPS tracking", "Rooting all devices before deployment"],
        "answer": 0,
        "explanation": "Mobile Application Management (MAM) uses containerization to isolate and encrypt corporate applications and data into a secure sandbox on the device. This allows administrators to manage, secure, or wipe corporate data without accessing, viewing, or wiping the employee's personal files and photos. Full MDM manages the entire physical device, and rooting destroys device security.",
        "distractor_analysis": {
            "1": "Full MDM with device-wide factory wipes will erase all personal data, which violates the requirement to preserve personal photos.",
            "2": "Geofencing restricts device functionality based on physical location but does not create app-level encrypted containers.",
            "3": "Rooting removes OS kernel sandboxing and introduces catastrophic security vulnerabilities."
        }
    },
    {
        "id": "C2-108",
        "objective": "2.5",
        "difficulty": "easy",
        "tags": ["social-engineering", "baiting", "usb-drop", "physical-security"],
        "question": "What type of attack involves an attacker placing malicious flash drives labeled 'Confidential Payroll Q3' in a company parking lot, hoping an employee will pick one up and plug it into a corporate workstation?",
        "options": ["Baiting", "Tailgating", "Shoulder surfing", "Vishing"],
        "answer": 0,
        "explanation": "Baiting is a social engineering attack that relies on human curiosity or greed by leaving malware-infected physical media (USB drives, CD/DVDs) in public or corporate areas where victims will find them and insert them into computers. Tailgating is physical door following, shoulder surfing is visual spying, and vishing is phone phishing.",
        "distractor_analysis": {
            "1": "Tailgating is following an authorized person through a secured door without badging in.",
            "2": "Shoulder surfing is the physical act of looking at another person's screen or keyboard.",
            "3": "Vishing is social engineering executed over voice telephone calls."
        }
    },
    {
        "id": "C2-109",
        "objective": "2.4",
        "difficulty": "hard",
        "tags": ["malware", "rootkit", "kernel", "stealth"],
        "question": "A security analyst discovers malicious software that has modified kernel-level system binaries and replaced core operating system API hooks to conceal its active processes and files from Task Manager. What malware type is this?",
        "options": ["Rootkit", "Adware", "Macro virus", "Spyware"],
        "answer": 0,
        "explanation": "A Rootkit is a stealthy type of malware designed to gain administrative/root access and modify low-level operating system code (kernel, bootloader, system drivers) to hide its presence, files, and processes from standard diagnostic tools like Task Manager and antivirus software. Adware displays ads, macro viruses run in documents, and spyware tracks user activity.",
        "distractor_analysis": {
            "1": "Adware generates unwanted advertising banners and pop-up windows in user space.",
            "2": "Macro viruses are embedded in office application files and execute via scripting macros.",
            "3": "Spyware monitors user keystrokes and browsing habits without replacing core kernel API hooks."
        }
    },
    {
        "id": "C2-110",
        "objective": "2.2",
        "difficulty": "medium",
        "tags": ["directory-services", "ldaps", "tls", "ports"],
        "question": "Which protocol provides secure, encrypted directory queries to Active Directory Domain Services using TLS over TCP port 636?",
        "options": ["LDAPS (Lightweight Directory Access Protocol Secure)", "LDAP (unencrypted)", "Kerberos", "RADIUS"],
        "answer": 0,
        "explanation": "LDAPS (LDAP over SSL/TLS) encrypts directory queries and communications with Active Directory Domain Controllers over TCP port 636. Standard LDAP transmits queries in cleartext on TCP port 389. Kerberos uses UDP/TCP port 88, and RADIUS uses UDP 1812.",
        "distractor_analysis": {
            "1": "Standard LDAP operates on TCP port 389 and transmits directory data in unencrypted plaintext.",
            "2": "Kerberos operates on port 88 for ticket granting and authentication.",
            "3": "RADIUS operates on UDP port 1812 for network access control."
        }
    },
    {
        "id": "C2-111",
        "objective": "2.7",
        "difficulty": "hard",
        "tags": ["dlp", "data-loss-prevention", "exfiltration", "endpoint-security"],
        "question": "A security technician needs to prevent datacenter staff laptops from copying classified design documents onto unauthorized USB flash drives or emailing sensitive PII to external domains. Which technology enforces this?",
        "options": ["DLP (Data Loss Prevention) software", "WPA3 Enterprise", "EFS encryption", "Dynamic DNS"],
        "answer": 0,
        "explanation": "Data Loss Prevention (DLP) software monitors endpoint activity, inspects file contents for sensitive patterns (PII, PCI, classified markers), and blocks unauthorized transmission via email, cloud uploads, or copying to external USB removable storage devices. WPA3 secures Wi-Fi, EFS encrypts local NTFS files, and Dynamic DNS updates host records.",
        "distractor_analysis": {
            "1": "WPA3 Enterprise provides wireless authentication and over-the-air encryption, not endpoint data exfiltration blocking.",
            "2": "EFS encrypts files for the local user; if the authorized user opens the file, EFS does not stop them from copying it to a flash drive.",
            "3": "Dynamic DNS maps changing IP addresses to domain names and has no role in content inspection."
        }
    },
    {
        "id": "C2-112",
        "objective": "2.1",
        "difficulty": "hard",
        "tags": ["biometrics", "frr", "far", "cer"],
        "question": "In biometric authentication systems, what metric measures the percentage of times legitimate, authorized users are incorrectly denied access by the biometric reader?",
        "options": ["FRR (False Rejection Rate / Type I Error)", "FAR (False Acceptance Rate / Type II Error)", "CER (Crossover Error Rate)", "MTBF (Mean Time Between Failures)"],
        "answer": 0,
        "explanation": "False Rejection Rate (FRR), also known as a Type I Error, measures the rate at which authorized legitimate users are incorrectly rejected by a biometric system. False Acceptance Rate (FAR, Type II Error) measures unauthorized users incorrectly admitted. Crossover Error Rate (CER) is the balance point where FAR equals FRR, and MTBF measures hardware reliability.",
        "distractor_analysis": {
            "1": "FAR (False Acceptance Rate) measures the percentage of times an impostor is incorrectly authenticated as a valid user.",
            "2": "CER (Crossover Error Rate) is the benchmark point where the False Acceptance Rate equals the False Rejection Rate.",
            "3": "MTBF (Mean Time Between Failures) is a hardware reliability metric measuring operational uptime between breakdowns."
        }
    },
    {
        "id": "C2-113",
        "objective": "2.6",
        "difficulty": "medium",
        "tags": ["malware-removal", "comptia-7-step", "quarantine", "containment"],
        "question": "According to the official CompTIA 7-step malware removal process, what must a technician do IMMEDIATELY after identifying and researching malware symptoms?",
        "options": ["Update anti-malware signatures", "Quarantine the infected system", "Disable System Restore", "Educate the end user"],
        "answer": 1,
        "explanation": "Step 2 of the CompTIA 7-step malware removal process is 'Quarantine infected system' (isolating the machine from the network). Step 1 is Identify and research symptoms, Step 3 is Disable System Restore, Step 4 is Remediate, Step 5 is Schedule scans/updates, Step 6 is Enable System Restore, and Step 7 is Educate end user.",
        "distractor_analysis": {
            "0": "Updating anti-malware software is part of Step 4 (Remediate infected systems).",
            "2": "Disabling System Restore is Step 3, performed immediately after quarantining the machine.",
            "3": "Educating the end user is the final Step 7 of the removal methodology."
        }
    },
    {
        "id": "C2-114",
        "objective": "2.6",
        "difficulty": "medium",
        "tags": ["malware-removal", "system-restore", "remediation", "snapshots"],
        "question": "Why is it critical to disable System Restore on a Windows workstation during the malware remediation process?",
        "options": ["To speed up the network interface card", "To prevent malware from being archived in System Restore points and restoring itself later", "To allow standard users to execute administrative tools", "To free up RAM for the antivirus scanner"],
        "answer": 1,
        "explanation": "Disabling System Restore purges all existing Volume Shadow Copy snapshots. If an active infection exists, malware binaries could be saved into restore points. If System Restore is left enabled and the user rolls back the system later, the malware would be restored. It does not affect network speed, user rights, or RAM.",
        "distractor_analysis": {
            "0": "System Restore manages disk volume snapshots and has zero influence over network card throughput.",
            "2": "Standard user security permissions are governed by UAC and NTFS ACLs, not System Restore.",
            "3": "Disabling System Restore clears disk storage, not physical RAM memory."
        }
    },
    {
        "id": "C2-115",
        "objective": "1.2",
        "difficulty": "medium",
        "tags": ["windows-setup", "storage-drivers", "bsod", "ahci"],
        "question": "A Windows workstation crashes immediately during the initial boot phase with a BSOD stop code `INACCESSIBLE_BOOT_DEVICE`. What is the MOST likely cause?",
        "options": ["The monitor HDMI cable is disconnected", "Storage controller drivers are missing or SATA mode was switched between RAID/AHCI in BIOS", "The keyboard USB driver is corrupt", "The system clock is 5 minutes fast"],
        "answer": 1,
        "explanation": "The `INACCESSIBLE_BOOT_DEVICE` stop error occurs when the Windows bootloader cannot initialize communication with the storage controller (due to missing/corrupt NVMe/RAID drivers or switching the SATA controller mode between AHCI and RAID in BIOS/UEFI). Disconnected display cables, keyboard drivers, and clock offsets do not trigger storage device kernel panics.",
        "distractor_analysis": {
            "0": "A disconnected display cable results in a 'No Signal' monitor message, not an OS kernel BSOD crash.",
            "2": "Keyboard drivers load in user space and do not trigger storage subsystem boot device stop codes.",
            "3": "Clock drift causes TLS certificate warnings but does not cause inaccessible boot volume crashes."
        }
    },
    {
        "id": "C2-116",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["bootrec", "rebuildbcd", "windows-recovery", "troubleshooting"],
        "question": "A Windows computer fails to boot, displaying 'The Boot Configuration Data file is missing or contains errors.' In the WinRE Command Prompt, which command scans for Windows installations and rebuilds the BCD?",
        "options": ["`bootrec /fixmbr`", "`bootrec /rebuildbcd`", "`sfc /scannow`", "`chkdsk /f`"],
        "answer": 1,
        "explanation": "`bootrec /rebuildbcd` scans all attached disks for installed Windows operating systems and interactively prompts to add them to the BCD store. `/fixmbr` writes the MBR, `sfc` checks system files, and `chkdsk` checks disk sectors.",
        "distractor_analysis": {
            "0": "`bootrec /fixmbr` writes a standard Master Boot Record to the system partition without repairing BCD entries.",
            "2": "`sfc /scannow` checks operating system core binaries against cached manifests, not boot database configuration.",
            "3": "`chkdsk /f` repairs filesystem structure errors on the target drive volume."
        }
    },
    {
        "id": "C2-117",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["device-manager", "driver-rollback", "graphics", "troubleshooting"],
        "question": "After an automatic graphics driver update, a designer's dual monitors flicker violently and drop to low resolution. What is the fastest way to restore stability?",
        "options": ["Format the hard drive and reinstall Windows", "Open Device Manager, select the display adapter properties, and click 'Roll Back Driver'", "Replace both physical LCD monitors", "Delete the `%SystemRoot%` directory"],
        "answer": 1,
        "explanation": "Selecting 'Roll Back Driver' on the Driver tab of the display adapter's properties in Device Manager immediately reinstates the previously working graphics driver package and registry settings. Reformatting is destructive, monitor replacement is unnecessary, and deleting SystemRoot bricks the machine.",
        "distractor_analysis": {
            "0": "Reformatting the entire OS causes severe downtime when a 10-second driver rollback resolves the problem.",
            "2": "Physical monitors are functional; the defect is isolated to the newly installed software display driver.",
            "3": "Deleting SystemRoot permanently destroys the Windows operating system."
        }
    },
    {
        "id": "C2-118",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["task-manager", "startup-apps", "slow-boot", "performance"],
        "question": "A user complains that their computer takes over 10 minutes to reach a usable desktop after logging in. Which tool allows a technician to inspect and disable high-impact startup applications?",
        "options": ["Task Manager (Startup tab)", "Disk Management", "Event Viewer (Setup log)", "Windows Memory Diagnostic"],
        "answer": 0,
        "explanation": "The Startup tab in Task Manager (or Settings -> Apps -> Startup) displays all applications configured to launch at user logon and rates their performance impact (High, Medium, Low). Disabling non-essential high-impact programs dramatically shortens boot and login times. Disk Management manages partitions, Setup logs track OS installs, and Memory Diagnostic tests RAM chips.",
        "distractor_analysis": {
            "1": "Disk Management is used for partition layout and drive letter assignment, not startup app management.",
            "2": "The Setup log records OS installation and servicing events, having no startup program controls.",
            "3": "Windows Memory Diagnostic tests physical RAM modules for hardware faults."
        }
    },
    {
        "id": "C2-119",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "nslookup", "dns", "troubleshooting"],
        "question": "A user cannot browse any websites by domain name (e.g., www.datacenter.com) but can connect directly using numerical IP addresses (e.g., 93.184.216.34). Which command-line diagnostic tool should the technician use to test DNS resolution?",
        "options": ["`ping`", "`nslookup`", "`netstat`", "`route`"],
        "answer": 1,
        "explanation": "`nslookup` queries configured DNS servers directly to test whether hostnames resolve to IP addresses, isolating DNS failures from general IP routing issues. `ping` tests ICMP reachability, `netstat` displays open sockets, and `route` manages the IP routing table.",
        "distractor_analysis": {
            "0": "`ping` tests basic packet reachability; while pinging a domain name triggers DNS lookup, it does not provide detailed DNS record query diagnostics.",
            "2": "`netstat` displays active network socket connections and protocol statistics.",
            "3": "`route` displays and modifies the local IP routing table."
        }
    },
    {
        "id": "C2-120",
        "objective": "3.1",
        "difficulty": "hard",
        "tags": ["profile-corruption", "temporary-profile", "user-profile", "registry"],
        "question": "A user logs into Windows and receives the message: 'You have been logged on with a temporary profile.' All customized desktop files are missing. What is the root cause?",
        "options": ["The computer's motherboard has failed", "The user profile hive (`NTUSER.DAT`) is corrupted or locked, forcing Windows to load a temporary default profile", "The network cable is unplugged", "The display refresh rate is too high"],
        "answer": 1,
        "explanation": "When Windows cannot read, load, or access a user's `NTUSER.DAT` registry hive (due to disk corruption, improper shutdown, or permission locks), it prevents logon failure by creating a temporary, volatile profile (`TEMP`) that discards all changes upon logout. Motherboards, cables, and refresh rates do not cause profile loading faults.",
        "distractor_analysis": {
            "0": "Motherboard failure would prevent system POST or cause hardware shutdowns, not specific user registry hive errors.",
            "2": "A disconnected network cable causes domain logon caching to be used, not a temporary profile error.",
            "3": "Display refresh rate settings manage monitor frame rates and have no interaction with user profile registry hives."
        }
    },
    {
        "id": "C2-121",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["dism", "sfc", "system-integrity", "restorehealth"],
        "question": "A system file corruption issue cannot be repaired by `sfc /scannow` because the local component store is damaged. Which command repairs the Windows Component Store (WinSxS) using Windows Update as a source?",
        "options": ["`DISM /Online /Cleanup-Image /RestoreHealth`", "`chkdsk C: /f`", "`bootrec /fixmbr`", "`defrag C: /u`"],
        "answer": 0,
        "explanation": "The Deployment Image Servicing and Management tool (`DISM /Online /Cleanup-Image /RestoreHealth`) repairs the Windows component store (WinSxS) by downloading healthy replacements from Microsoft Windows Update servers. Once DISM completes, `sfc /scannow` can successfully repair damaged system files. `chkdsk` checks disk sectors, `bootrec` repairs boot records, and `defrag` optimizes disk clusters.",
        "distractor_analysis": {
            "1": "`chkdsk C: /f` repairs filesystem structure errors on disk but cannot restore damaged component store binaries.",
            "2": "`bootrec /fixmbr` rewrites the Master Boot Record code.",
            "3": "`defrag C: /u` reorganizes file fragments on spinning disks without repairing corrupted OS files."
        }
    },
    {
        "id": "C2-122",
        "objective": "2.11",
        "difficulty": "medium",
        "tags": ["browser-security", "extensions", "hijacking", "adware"],
        "question": "A user reports that web browser search queries are repeatedly redirected to suspicious advertising portals and new tabs open unprompted. What should the technician check and clean FIRST?",
        "options": ["Installed browser extensions, add-ons, and search engine settings", "The system power supply unit", "The RAM sticks in motherboard slots", "The physical network patch cable"],
        "answer": 0,
        "explanation": "Browser search redirection is typically caused by malicious or unwanted browser extensions, adware toolbars, or modified default search provider settings. Technicians should inspect and remove unauthorized extensions, reset the default search engine, clear cached browser data, and run an anti-malware scan. Power supplies, RAM, and cables are unrelated hardware.",
        "distractor_analysis": {
            "1": "Power supply hardware faults cause sudden system shutdowns, not browser search redirections.",
            "2": "RAM memory errors cause system blue screens and memory parity crashes.",
            "3": "Network patch cables transmit data packets and cannot selectively redirect browser search queries."
        }
    },
    {
        "id": "C2-123",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["bsod", "crash-dump", "minidump", "troubleshooting"],
        "question": "An enterprise desktop crashes with a stop code error (BSOD) and reboots automatically. Where does Windows store the crash dump files for post-incident kernel analysis?",
        "options": ["`%SystemRoot%\\MEMORY.DMP` and `%SystemRoot%\\Minidump`", "`C:\\Program Files\\Common Files`", "`C:\\Users\\Public\\Downloads`", "`%SystemRoot%\\Temp`"],
        "answer": 0,
        "explanation": "Windows writes memory dump files to `%SystemRoot%\\MEMORY.DMP` (for complete/kernel dumps) and `%SystemRoot%\\Minidump` (for small memory dumps). These crash dump files can be analyzed using diagnostic tools like WinDbg or BlueScreenView to identify the faulting driver or module. Program Files, Public Downloads, and Temp are standard storage locations not used for kernel crash dumps.",
        "distractor_analysis": {
            "1": "`C:\\Program Files\\Common Files` contains shared application libraries, not OS crash dumps.",
            "2": "`C:\\Users\\Public\\Downloads` is a shared user download directory.",
            "3": "`%SystemRoot%\\Temp` contains temporary operating system scratch files."
        }
    },
    {
        "id": "C2-124",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["dll-missing", "vcredist", "runtime", "troubleshooting"],
        "question": "An application fails to launch, displaying the error message 'VCRUNTIME140.dll was not found.' What is the proper remediation?",
        "options": ["Reinstall or repair the matching Microsoft Visual C++ Redistributable package", "Replace the computer power supply", "Run `diskpart clean` on the C: drive", "Disable the Windows Defender Firewall"],
        "answer": 0,
        "explanation": "`VCRUNTIME140.dll` is a core dynamic link library provided by the Microsoft Visual C++ Redistributable runtime package. When missing or corrupted, downloading and installing or repairing the Visual C++ Redistributable from Microsoft resolves the dependency error. Hardware replacements, disk wiping, and firewall changes do not fix missing runtime DLLs.",
        "distractor_analysis": {
            "1": "The power supply is functioning normally and has no connection to missing application runtime libraries.",
            "2": "`diskpart clean` wipes all partition data from the drive, causing total data loss.",
            "3": "Disabling the firewall removes network security without providing the missing C++ runtime DLL."
        }
    },
    {
        "id": "C2-125",
        "objective": "3.1",
        "difficulty": "hard",
        "tags": ["services", "dependencies", "services-msc", "troubleshooting"],
        "question": "A Windows critical service fails to start during boot with Error 1068: 'The dependency service or group failed to start.' How should the technician troubleshoot this?",
        "options": ["Open `services.msc`, view the Dependencies tab for that service, and verify that all prerequisite dependent services are running", "Reformat the drive immediately", "Change the screen resolution", "Disable all user passwords in Active Directory"],
        "answer": 0,
        "explanation": "Error 1068 indicates that a service cannot initialize because one or more services listed on its 'Dependencies' tab in `services.msc` are stopped, disabled, or failed to start. Reviewing the Dependencies tab identifies the required services so the technician can ensure they are enabled and running. Reformatting is premature, screen resolution is irrelevant, and disabling passwords weakens security.",
        "distractor_analysis": {
            "1": "Reformatting the drive is unnecessary when enabling a single disabled dependent service resolves Error 1068.",
            "2": "Screen resolution adjusts visual display scaling and has zero effect on Windows Service Control Manager dependencies.",
            "3": "Disabling user passwords introduces security vulnerabilities and does not resolve service startup dependencies."
        }
    },
    {
        "id": "C2-126",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "app-crash", "cache", "android"],
        "question": "A mobile smartphone user reports that a specific enterprise inventory app crashes immediately upon opening. What is the recommended first-line troubleshooting step on the device?",
        "options": ["Force stop the application and clear the app cache/data in Settings -> Apps", "Replace the smartphone motherboard", "Factory reset the phone without backing up data", "Turn off all cellular radios permanently"],
        "answer": 0,
        "explanation": "When an isolated mobile application crashes, the best initial troubleshooting step is to Force Stop the app and clear its temporary Cache and Data in Settings -> Apps. This removes corrupted local session data and resets the app state. Hardware replacement and unbacked-up factory resets are destructive, and disabling cellular radios does not fix application bugs.",
        "distractor_analysis": {
            "1": "Motherboard replacement is an extreme hardware repair for an isolated application-level cache fault.",
            "2": "Factory resetting without prior backup destroys user data unnecessarily.",
            "3": "Disabling cellular radios cuts off mobile connectivity without resolving application cache corruption."
        }
    },
    {
        "id": "C2-127",
        "objective": "4.1",
        "difficulty": "easy",
        "tags": ["troubleshooting-methodology", "identify-problem", "comptia-6-step", "helpdesk"],
        "question": "What is the FIRST step in the official CompTIA 6-step troubleshooting methodology?",
        "options": ["Establish a theory of probable cause", "Identify the problem", "Test the theory to determine cause", "Document findings, actions, and outcomes"],
        "answer": 1,
        "explanation": "Step 1 of the CompTIA 6-step troubleshooting methodology is 'Identify the problem' (gather information, question users, identify symptoms, determine if anything changed, review logs). Step 2 is Establish a theory, Step 3 is Test the theory, Step 4 is Establish a plan of action, Step 5 is Verify full system functionality, and Step 6 is Document findings.",
        "distractor_analysis": {
            "0": "Establishing a theory of probable cause is Step 2 of the methodology.",
            "2": "Testing the theory to determine cause is Step 3 of the methodology.",
            "3": "Documenting findings, actions, and outcomes is Step 6 (the final step) of the methodology."
        }
    },
    {
        "id": "C2-128",
        "objective": "4.1",
        "difficulty": "medium",
        "tags": ["troubleshooting-methodology", "plan-of-action", "comptia-6-step", "implementation"],
        "question": "After successfully testing and confirming the theory of probable cause for a system outage, what is the NEXT step in the CompTIA troubleshooting methodology?",
        "options": ["Verify full system functionality", "Establish a plan of action to resolve the problem and identify potential effects", "Document findings and close the ticket", "Question the user about recent changes"],
        "answer": 1,
        "explanation": "Following Step 3 (Test the theory to determine cause), Step 4 is 'Establish a plan of action to resolve the problem and identify potential effects' (including obtaining change approvals and preparing a rollback plan), followed by implementing the plan. Step 5 is Verify system functionality, and Step 6 is Document findings.",
        "distractor_analysis": {
            "0": "Verifying full system functionality is Step 5, performed AFTER implementing the plan of action.",
            "2": "Documenting findings is Step 6, performed after verification is complete.",
            "3": "Questioning users about changes is part of Step 1 (Identify the problem)."
        }
    },
    {
        "id": "C2-129",
        "objective": "4.2",
        "difficulty": "medium",
        "tags": ["change-management", "cab", "risk-assessment", "approval"],
        "question": "In a corporate datacenter change management process, what is the primary role of the Change Advisory Board (CAB)?",
        "options": ["To write all software code for the development team", "To evaluate proposed changes, assess business and technical risks, and grant formal approval", "To manually deploy operating system patches on client laptops", "To conduct performance reviews for IT staff members"],
        "answer": 1,
        "explanation": "The Change Advisory Board (CAB) is a governance committee of IT and business representatives responsible for reviewing Requests for Change (RFCs), evaluating operational risks, assessing scheduling and business impact, and granting formal approval for major infrastructure changes. The CAB does not write software, patch laptops manually, or conduct HR performance reviews.",
        "distractor_analysis": {
            "0": "Software code is written by software developers, not the Change Advisory Board.",
            "2": "Patch deployments are executed by system administrators during scheduled maintenance windows.",
            "3": "Staff performance reviews are managed by Human Resources and department managers."
        }
    },
    {
        "id": "C2-130",
        "objective": "4.5",
        "difficulty": "easy",
        "tags": ["environmental-controls", "sds", "msds", "safety"],
        "question": "Which document must be consulted by datacenter personnel for proper handling procedures, personal protective equipment (PPE), and emergency first-aid protocols regarding hazardous chemicals (such as cleaning solvents or battery acid)?",
        "options": ["SLA (Service Level Agreement)", "SDS (Safety Data Sheet)", "AUP (Acceptable Use Policy)", "EULA (End-User License Agreement)"],
        "answer": 1,
        "explanation": "Safety Data Sheets (SDS), formerly known as Material Safety Data Sheets (MSDS), are mandatory safety documents detailing chemical product hazards, safe handling procedures, required PPE, storage guidelines, and emergency first-aid instructions. SLAs define service uptime, AUPs define acceptable user conduct, and EULAs define software licensing terms.",
        "distractor_analysis": {
            "0": "An SLA defines contractual service availability and performance commitments between a vendor and customer.",
            "2": "An Acceptable Use Policy specifies permissible employee conduct when using company technology assets.",
            "3": "A EULA defines legal software licensing permissions and restrictions."
        }
    },
    {
        "id": "C2-131",
        "objective": "4.3",
        "difficulty": "easy",
        "tags": ["backup-best-practices", "3-2-1-rule", "offsite", "media-types"],
        "question": "An enterprise backup policy adheres to the '3-2-1' backup strategy. What does this rule mandate?",
        "options": ["3 backup servers, 2 administrators, 1 cloud subscription", "3 copies of data, across 2 different media types, with at least 1 copy kept offsite", "3 daily backups, 2 weekly backups, and 1 monthly backup", "3 network connections, 2 firewalls, and 1 router"],
        "answer": 1,
        "explanation": "The 3-2-1 backup rule specifies maintaining: 3 total copies of data (1 primary copy + 2 backup copies), on 2 different storage media types (e.g., local disk array + tape or cloud), with 1 copy stored Offsite (or in an isolated cloud region) for disaster recovery. It does not refer to staff counts, network routers, or schedule frequencies.",
        "distractor_analysis": {
            "0": "The 3-2-1 rule defines data copy counts and storage locations, not personnel counts or subscriptions.",
            "2": "Backup schedules (e.g., GFS grandfather-father-son) define retention frequencies, which differs from the 3-2-1 media rule.",
            "3": "Network router and firewall redundancies represent network design, not backup data redundancy."
        }
    },
    {
        "id": "C2-132",
        "objective": "2.9",
        "difficulty": "medium",
        "tags": ["data-destruction", "degaussing", "magnetic-media", "sanitization"],
        "question": "A datacenter decommission requires permanent sanitization of 100 magnetic hard disk drives (HDDs). Which method uses a powerful electromagnetic pulse to neutralize magnetic domains on the platters?",
        "options": ["Low-level formatting", "Degaussing", "Disk Cleanup", "Partition deletion"],
        "answer": 1,
        "explanation": "Degaussing subjects magnetic storage media (HDDs, magnetic tapes) to an intense electromagnetic field that scrambles the magnetic domains and destroys factory servo tracks, permanently erasing data and rendering the drive unusable. Low-level formatting rewrites tracks, Disk Cleanup deletes temporary files, and partition deletion only removes partition table headers.",
        "distractor_analysis": {
            "0": "Low-level formatting initializes tracks and sectors on a disk but does not magnetically destroy platters with EMP pulses.",
            "2": "Disk Cleanup removes temporary files in user space without sanitizing raw storage sectors.",
            "3": "Partition deletion removes partition table entries while leaving all raw sector data fully recoverable."
        }
    },
    {
        "id": "C2-133",
        "objective": "4.4",
        "difficulty": "medium",
        "tags": ["fire-safety", "class-c", "electrical-fire", "extinguisher"],
        "question": "Which type of fire extinguisher is specifically rated and required for extinguishing fires involving energized electrical equipment in a server room?",
        "options": ["Class A (Water)", "Class B (Flammable liquids)", "Class C (Electrical Equipment)", "Class K (Kitchen cooking oils)"],
        "answer": 2,
        "explanation": "Class C fire extinguishers use non-conductive extinguishing agents (such as CO2, Halon replacements like FM-200/Novec 1230, or dry chemical) to extinguish fires on energized electrical equipment without conducting electrical shock to the operator. Class A uses water (which conducts electricity), Class B is for flammable liquids, and Class K is for cooking oils.",
        "distractor_analysis": {
            "0": "Class A water extinguishers conduct electrical current directly back through the stream, posing a fatal electrocution hazard.",
            "1": "Class B extinguishers are formulated for flammable liquids like fuels and paints.",
            "3": "Class K extinguishers are designed for commercial kitchen grease and deep fryers."
        }
    },
    {
        "id": "C2-134",
        "objective": "4.8",
        "difficulty": "easy",
        "tags": ["scripting", "powershell", "file-extensions", "automation"],
        "question": "What is the file extension used for modern Microsoft PowerShell script files?",
        "options": [".bat", ".sh", ".ps1", ".vbs"],
        "answer": 2,
        "explanation": "PowerShell script files use the `.ps1` file extension. `.bat` is for Windows Command Prompt batch files, `.sh` is for Linux/Unix shell scripts, and `.vbs` is for VBScript files.",
        "distractor_analysis": {
            "0": "`.bat` is the legacy file extension for MS-DOS and Windows Command Prompt batch scripts.",
            "1": "`.sh` is the file extension for Unix/Linux Bourne/Bash shell scripts.",
            "3": "`.vbs` is the file extension for Visual Basic Scripting Edition files."
        }
    },
    {
        "id": "C2-135",
        "objective": "4.6",
        "difficulty": "hard",
        "tags": ["incident-response", "chain-of-custody", "evidence", "forensics"],
        "question": "During an incident response investigation where a corporate laptop is seized as digital evidence, why is maintaining a strict 'Chain of Custody' form essential?",
        "options": ["To expedite manufacturer hardware warranty claims", "To document everyone who handled, analyzed, and stored the physical evidence so it remains legally admissible in court", "To calculate the employee's payroll deductions", "To automatically re-image the seized laptop"],
        "answer": 1,
        "explanation": "In digital forensics and incident response, a Chain of Custody form records the chronological custody, transfer, analysis, and secure storage of physical and digital evidence. Without a documented, unbroken chain of custody, evidence can be challenged and ruled inadmissible in legal proceedings. It has no role in warranties, payroll, or imaging.",
        "distractor_analysis": {
            "0": "Chain of Custody documents legal evidence integrity, not manufacturer warranty claims.",
            "2": "Employee payroll calculations are handled by Finance, not forensic evidence logs.",
            "3": "Re-imaging a seized machine destroys evidence and violates forensic preservation protocols."
        }
    },
    {
        "id": "C2-136",
        "objective": "4.7",
        "difficulty": "easy",
        "tags": ["professionalism", "communication", "active-listening", "customer-service"],
        "question": "When communicating with a frustrated customer whose computer crashed during a critical deadline, what professional technique should a technician use FIRST?",
        "options": ["Interrupt the user to explain that software crashes are normal", "Actively listen without interruption, acknowledge the urgency with empathy, and clarify the issue calmly", "Place the customer on hold immediately for 10 minutes", "Blame the software vendor for poor programming"],
        "answer": 1,
        "explanation": "Professional IT communication standards emphasize active listening and de-escalation: remain calm, do not interrupt the customer while they explain the issue, acknowledge their urgency with professional empathy, and ask clarifying diagnostic questions. Interrupting, long unannounced holds, and deflecting blame worsen customer frustration and violate service standards.",
        "distractor_analysis": {
            "0": "Interrupting the customer dismisses their concern and increases hostility.",
            "2": "Placing an agitated customer on hold without explanation escalates frustration.",
            "3": "Blaming external vendors is unprofessional and does not resolve the customer's problem."
        }
    },
    {
        "id": "C2-137",
        "objective": "4.5",
        "difficulty": "medium",
        "tags": ["environmental-controls", "humidity", "datacenter", "esd"],
        "question": "What is the recommended relative humidity range maintained in enterprise server rooms to prevent both electrostatic discharge (ESD) and moisture condensation?",
        "options": ["10% to 20%", "40% to 60%", "85% to 95%", "0% to 5%"],
        "answer": 1,
        "explanation": "Datacenter environmental standards (such as ASHRAE guidelines) recommend maintaining relative humidity between 40% and 60%. Humidity below 30-40% creates dry air that dramatically increases the risk of destructive electrostatic discharge (ESD). Humidity above 60-70% promotes moisture condensation on components, leading to corrosion and short circuits.",
        "distractor_analysis": {
            "0": "Humidity levels below 20% create extremely dry air, causing severe electrostatic discharge (ESD) hazards.",
            "2": "Humidity levels above 85% cause moisture condensation on cold electronics, leading to catastrophic short circuits.",
            "3": "0% to 5% humidity causes massive static electricity buildup and is hazardous to sensitive semiconductors."
        }
    },
    {
        "id": "C2-138",
        "objective": "4.4",
        "difficulty": "easy",
        "tags": ["esd", "safety", "grounding", "wrist-strap"],
        "question": "When attaching an electrostatic discharge (ESD) wrist strap while servicing a disconnected desktop computer, where should the alligator clip be attached?",
        "options": ["To an unpainted metal portion of the computer chassis", "Directly to the motherboard CPU socket pins", "To an active electrical wall outlet", "To the technician's plastic tool handle"],
        "answer": 0,
        "explanation": "An ESD wrist strap should be clipped to an unpainted metal surface on the computer chassis (with the power cable unplugged). This equalizes the electrical potential between the technician's body and the equipment chassis, safely draining static electricity. Clipping to CPU pins damages hardware, live outlets cause electrocution, and plastic does not conduct static.",
        "distractor_analysis": {
            "1": "Clipping to CPU socket pins bends delicate pins and destroys semiconductor traces.",
            "2": "Attaching to a live electrical wall receptacle creates an immediate risk of fatal electrical shock.",
            "3": "Plastic tool handles are electrical insulators and cannot conduct or drain static charges."
        }
    },
    {
        "id": "C2-139",
        "objective": "4.6",
        "difficulty": "medium",
        "tags": ["licensing", "oem", "eula", "compliance"],
        "question": "Which software licensing model is bundled with brand-new computer hardware, tied permanently to the original motherboard, and cannot be transferred to a different PC?",
        "options": ["Open Source GPL license", "OEM (Original Equipment Manufacturer) license", "Retail (FPP) license", "Enterprise Volume License (VL)"],
        "answer": 1,
        "explanation": "An OEM (Original Equipment Manufacturer) license is sold at a discount to computer builders and tied permanently to the original motherboard of the hardware on which it was first installed; it cannot be legally transferred to another PC. Retail (Full Packaged Product) licenses can be transferred to new hardware, and Volume Licenses cover corporate fleets.",
        "distractor_analysis": {
            "0": "Open source GPL software is freely redistributable and not tied to physical hardware motherboards.",
            "2": "Retail (FPP) licenses allow transferring the software license from an old PC to a newly purchased PC.",
            "3": "Enterprise Volume Licenses allow flexible reassignment and centralized KMS/MAK activation across corporate devices."
        }
    },
    {
        "id": "C2-140",
        "objective": "4.4",
        "difficulty": "easy",
        "tags": ["physical-safety", "lifting", "team-lift", "ergonomics"],
        "question": "When lifting a heavy 4U enterprise rack server weighing 75 pounds (34 kg), what physical safety practice must technicians follow to prevent back injury?",
        "options": ["Bend at the waist and lift quickly using back muscles", "Perform a two-person team lift or use a specialized mechanical server lift, bending at the knees", "Carry the server with one hand while walking briskly", "Twist the torso while lifting the server"],
        "answer": 1,
        "explanation": "Lifting heavy datacenter equipment (generally any item exceeding 40-50 pounds) requires a two-person team lift or mechanical equipment lift. Technicians must bend at the knees (not the waist), keep the load close to the body, keep the back straight, and lift with the leg muscles without twisting the torso.",
        "distractor_analysis": {
            "0": "Bending at the waist and lifting with back muscles places severe strain on the spinal column, risking herniated discs.",
            "2": "Carrying a 75-pound server single-handedly is physically unsafe and risks dropping expensive hardware.",
            "3": "Twisting the torso while lifting creates asymmetrical spinal torque and is a leading cause of workplace back injuries."
        }
    },
    {
        "id": "C2-141",
        "objective": "4.5",
        "difficulty": "medium",
        "tags": ["datacenter", "blanking-panels", "airflow", "hvac"],
        "question": "In datacenter rack airflow management, why are blanking panels installed across empty rack unit (U) spaces?",
        "options": ["To provide extra storage shelves for technician tools", "To prevent hot exhaust air from recirculating back into the cold aisle server intakes", "To ground the rack against lightning strikes", "To increase optical fiber network speeds"],
        "answer": 1,
        "explanation": "Blanking panels (filler panels) cover unused rack spaces in server cabinets. In hot-aisle/cold-aisle datacenter designs, empty rack gaps allow hot exhaust air from the rear of the rack to loop back through the front intakes, causing servers to overheat. Blanking panels enforce proper front-to-back airflow containment. They are not tool shelves, lightning grounds, or network accelerators.",
        "distractor_analysis": {
            "0": "Blanking panels are lightweight airflow barriers, not load-bearing storage shelves.",
            "2": "Rack grounding is accomplished via heavy copper busbars and bonding straps, not plastic/sheet-metal blanking panels.",
            "3": "Airflow blanking panels have zero interaction with optical fiber transceivers or data propagation speeds."
        }
    },
    {
        "id": "C2-142",
        "objective": "1.2",
        "difficulty": "medium",
        "tags": ["deployment", "autopilot", "zero-touch", "wds"],
        "question": "A datacenter engineer must image 200 identical Windows 11 Enterprise workstations overnight with zero local technician touch. Which deployment method BEST meets this requirement?",
        "options": ["Manual USB media install on each unit", "Zero-touch / Autopilot or MDT-WDS PXE deployment with answer files", "Windows To Go USB drives left at each desk", "Clean install from retail ISO with local product keys"],
        "answer": 1,
        "explanation": "Zero-touch deployment (using Microsoft Deployment Toolkit [MDT], Windows Deployment Services [WDS] with PXE boot and unattended answer files [unattend.xml], or cloud-based Windows Autopilot with Intune) automates the entire installation, driver injection, domain joining, and software staging without requiring manual technician intervention at each machine. Manual USB and retail ISO installs require hands-on technician time for every machine.",
        "distractor_analysis": {
            "0": "Manual USB installation requires visiting every single machine physically, which is impossible overnight for 200 units with zero touch.",
            "2": "Windows To Go runs Windows from a portable USB drive rather than imaging the local workstation storage.",
            "3": "Retail ISO installations require manual interactive setup and typing individual product keys on each PC."
        }
    }
]
