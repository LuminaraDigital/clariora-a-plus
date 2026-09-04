# generate_fixed_part1.py: C2-001 to C2-075
part1_data = [
    {
        "id": "C2-001",
        "objective": "1.2",
        "difficulty": "easy",
        "tags": ["windows-editions", "domain-join", "active-directory", "licensing"],
        "question": "A technician is setting up a new workstation for an employee who needs to join the corporate Active Directory domain. Which Windows edition CANNOT join a Windows Server domain?",
        "options": ["Windows Home", "Windows Pro", "Windows Enterprise", "Windows Education"],
        "answer": 0,
        "explanation": "Windows Home edition is designed strictly for consumers and small home users; it lacks the network architecture, Group Policy management, and security subsystems required to join an Active Directory domain. Windows Pro, Enterprise, and Education all support native domain joining, BitLocker, and centralized management. Pro provides business networking features, Enterprise provides advanced corporate virtualization and DirectAccess, and Education provides academic licensing controls.",
        "distractor_analysis": {
            "1": "Windows Pro includes full Active Directory domain join capabilities, BitLocker, and Group Policy client support.",
            "2": "Windows Enterprise is the premier corporate edition with full domain join, DirectAccess, and AppLocker features.",
            "3": "Windows Education includes all Enterprise-level capabilities, including native domain join for academic networks."
        }
    },
    {
        "id": "C2-002",
        "objective": "1.2",
        "difficulty": "medium",
        "tags": ["windows-editions", "ram-limits", "64-bit", "hardware-specs"],
        "question": "An IT department is building a high-performance CAD engineering desktop running 64-bit Windows 10/11 Pro. What is the maximum physical RAM capacity supported by the Pro edition?",
        "options": ["128 GB", "2 TB", "6 TB", "512 GB"],
        "answer": 1,
        "explanation": "64-bit Windows 10/11 Pro supports a maximum physical memory capacity of 2 TB (terabytes) of RAM. Windows 10/11 Home is capped at 128 GB of RAM. Windows Pro for Workstations and Enterprise support up to 6 TB of RAM and up to 4 physical CPU sockets. 512 GB is an arbitrary limit not aligned with standard Windows SKU boundaries.",
        "distractor_analysis": {
            "0": "128 GB is the physical RAM ceiling for Windows 10/11 Home edition, not Windows Pro.",
            "2": "6 TB is the maximum memory limit supported by Windows Pro for Workstations and Windows Enterprise editions.",
            "3": "512 GB is a distractor figure and does not represent the architectural RAM cap for standard Windows Pro."
        }
    },
    {
        "id": "C2-003",
        "objective": "1.2",
        "difficulty": "medium",
        "tags": ["windows-editions", "volume-licensing", "enterprise", "procurement"],
        "question": "A procurement manager needs to license operating systems for 1,000 corporate laptops using a central Volume Licensing agreement (KMS/MAK). Which Windows editions are available exclusively through volume licensing channels?",
        "options": ["Home", "Pro", "Enterprise and Education", "Pro for Workstations"],
        "answer": 2,
        "explanation": "Windows Enterprise and Education editions are not sold as retail standalone boxed products; they are available exclusively through Microsoft Volume Licensing agreements or academic licensing contracts. Windows Home and Pro are available as retail and OEM licenses. Pro for Workstations can be purchased via retail OEM channels and volume licensing.",
        "distractor_analysis": {
            "0": "Windows Home is sold directly to consumers through retail channels and OEM pre-installs.",
            "1": "Windows Pro is widely available as standalone retail packaged product and pre-installed OEM software.",
            "3": "Windows Pro for Workstations can be obtained pre-installed on high-end OEM hardware without enterprise volume agreements."
        }
    },
    {
        "id": "C2-004",
        "objective": "1.2",
        "difficulty": "easy",
        "tags": ["windows-11", "system-requirements", "tpm", "uefi"],
        "question": "A technician is assessing whether an existing fleet of desktop computers can be upgraded to Windows 11. Which core security hardware requirement is MANDATORY for Windows 11 installation?",
        "options": ["32-bit single-core CPU", "TPM 2.0 and UEFI with Secure Boot capability", "Legacy BIOS with Master Boot Record (MBR)", "A minimum of 2 GB RAM"],
        "answer": 1,
        "explanation": "Windows 11 requires a compatible 64-bit processor (1 GHz or faster with 2 or more cores), 4 GB of RAM, 64 GB of storage, UEFI firmware with Secure Boot enabled, and a Trusted Platform Module (TPM) version 2.0 chip. 32-bit CPUs and Legacy BIOS/MBR are completely unsupported on Windows 11, and 2 GB of RAM is below the minimum 4 GB RAM requirement.",
        "distractor_analysis": {
            "0": "Windows 11 is strictly a 64-bit operating system and does not run on 32-bit processors.",
            "2": "Legacy BIOS and MBR partition tables are deprecated for Windows 11; UEFI with GPT is required.",
            "3": "Windows 11 requires a minimum of 4 GB RAM; 2 GB is insufficient."
        }
    },
    {
        "id": "C2-005",
        "objective": "1.1",
        "difficulty": "medium",
        "tags": ["file-systems", "gpt", "partitioning", "disk-management"],
        "question": "A storage administrator is partitioning a 10 TB drive using the GUID Partition Table (GPT) scheme. What is the maximum number of primary partitions natively supported by Windows on a GPT disk?",
        "options": ["4 primary partitions", "26 primary partitions", "128 primary partitions", "256 primary partitions"],
        "answer": 2,
        "explanation": "The GUID Partition Table (GPT) standard natively supports up to 128 primary partitions in Windows without requiring extended partitions or logical drives. In contrast, the legacy MBR partition scheme supports a maximum of 4 primary partitions (or 3 primary partitions plus 1 extended partition). 26 corresponds to drive letters A-Z, and 256 is an arbitrary number.",
        "distractor_analysis": {
            "0": "4 primary partitions is the architectural limit for legacy Master Boot Record (MBR) disks.",
            "1": "26 is the maximum number of assigned drive letters (A through Z) in Windows, not the GPT partition table limit.",
            "3": "256 is an incorrect value; Microsoft Windows allocates 128 partition entries in GPT headers."
        }
    },
    {
        "id": "C2-006",
        "objective": "1.1",
        "difficulty": "medium",
        "tags": ["file-systems", "mbr", "disk-size", "partitioning"],
        "question": "A technician installs a new 4 TB hard drive formatted with the legacy Master Boot Record (MBR) scheme. Why does Windows only display 2 TB of usable capacity?",
        "options": ["MBR has an architectural 32-bit sector addressing limit that caps maximum disk size at 2 TB", "The motherboard power supply is failing to deliver 12V rail power", "The SATA data cable is defective and dropping communication packets", "Windows requires a third-party driver to format drives larger than 1 TB"],
        "answer": 0,
        "explanation": "The Master Boot Record (MBR) partition scheme uses 32-bit sector addressing with standard 512-byte sectors, resulting in a maximum addressable storage capacity of 2.19 TB (2 TB). Any drive space beyond 2 TB on an MBR disk remains unusable unallocated space. Supporting drives larger than 2 TB requires converting the disk to GUID Partition Table (GPT). Power supplies, cables, and third-party drivers do not change the mathematical limits of 32-bit MBR addressing.",
        "distractor_analysis": {
            "1": "Power rail voltage issues cause complete disk detection failure or intermittent spin-down, not a clean 2 TB capacity limit.",
            "2": "A bad SATA data cable causes CRC errors and bus timeouts, not a structural 2 TB partition boundary.",
            "3": "Windows natively supports large storage drives using GPT without requiring third-party formatting drivers."
        }
    },
    {
        "id": "C2-007",
        "objective": "1.2",
        "difficulty": "easy",
        "tags": ["os-installation", "pxe", "network-boot", "wds"],
        "question": "An enterprise technician boots 50 bare-metal workstations over the local network using DHCP and TFTP to load a Windows deployment image from a WDS server. What network boot technology is being utilized?",
        "options": ["USB boot", "Preboot Execution Environment (PXE)", "Retail ISO boot", "Windows Autopilot cloud provisioning"],
        "answer": 1,
        "explanation": "Preboot Execution Environment (PXE, pronounced 'pixie') is an industry standard client-server environment that allows a workstation's network interface card (NIC) to boot an operating system from a network server via DHCP and TFTP before any local OS is loaded. USB and ISO boots rely on local physical media, and Windows Autopilot configures pre-installed Windows over internet cloud services.",
        "distractor_analysis": {
            "0": "USB boot requires physical flash drives inserted into each computer rather than booting over the network.",
            "2": "Retail ISO boot requires optical media or mounted local image files rather than network NIC PXE ROMs.",
            "3": "Windows Autopilot provisions devices from the cloud after an initial factory image boots, rather than executing bare-metal TFTP network boots."
        }
    },
    {
        "id": "C2-008",
        "objective": "1.2",
        "difficulty": "easy",
        "tags": ["os-upgrade", "in-place-upgrade", "migration", "data-retention"],
        "question": "A systems administrator performs an in-place upgrade from Windows 10 Pro to Windows 11 Pro on a corporate laptop. What user assets are preserved by default during a successful in-place upgrade?",
        "options": ["Nothing is preserved (the drive is formatted)", "User personal files, applications, and system settings", "Only installed applications while all personal files are deleted", "Only desktop background settings while user directories are wiped"],
        "answer": 1,
        "explanation": "An in-place upgrade updates the core operating system files to a newer version while preserving all existing user personal files, installed desktop applications, user profiles, and configuration settings in place without reformatting the drive. A clean installation wipes the drive, and there is no upgrade mode that preserves only applications while wiping documents.",
        "distractor_analysis": {
            "0": "A clean install / wipe-and-load formats the drive; an in-place upgrade specifically preserves data and programs.",
            "2": "Windows in-place upgrades do not selectively delete personal user files while retaining software binaries.",
            "3": "In-place upgrades preserve full user directory structures and personal files along with profile settings."
        }
    },
    {
        "id": "C2-009",
        "objective": "1.5",
        "difficulty": "easy",
        "tags": ["cli", "sfc", "system-integrity", "windows-tools"],
        "question": "A workstation experiences intermittent crashes and corrupted DLL errors. Which command-line utility scans all protected Windows system files and replaces corrupted files with a cached copy from the component store?",
        "options": ["`chkdsk /f`", "`sfc /scannow`", "`diskpart`", "`format C:`"],
        "answer": 1,
        "explanation": "The System File Checker (`sfc /scannow`) inspects all protected operating system binaries, DLLs, and drivers against cryptographic manifests, replacing missing or corrupted files with pristine copies cached in `%WinDir%\\System32\\dllcache` or the WinSxS component store. `chkdsk` checks disk volume sectors and NTFS tables, `diskpart` manages disk partitions, and `format` wipes volumes.",
        "distractor_analysis": {
            "0": "`chkdsk` scans file system metadata and hard drive sectors for physical/logical disk errors, not operating system DLL integrity.",
            "2": "`diskpart` is a command-line partitioning tool used to create, delete, and resize volume partitions.",
            "3": "`format` initializes or wipes a volume with a specified file system, destroying all existing files."
        }
    },
    {
        "id": "C2-010",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "gpresult", "group-policy", "troubleshooting"],
        "question": "A help desk technician needs to verify which specific Group Policy Objects (GPOs) and user rights are currently applied to a domain-joined computer and logged-in user. Which command displays the Resultant Set of Policy?",
        "options": ["`gpupdate /force`", "`gpresult /r`", "`secpol.msc`", "`gpedit.msc`"],
        "answer": 1,
        "explanation": "The `gpresult /r` command generates a summary report in Command Prompt showing the Resultant Set of Policy (RSoP), including applied GPOs, security group memberships, and policy priority for both the computer account and user account. `gpupdate /force` reapplies policy immediately, `secpol.msc` opens local security policy, and `gpedit.msc` edits local policy templates.",
        "distractor_analysis": {
            "0": "`gpupdate /force` forces an immediate refresh of Group Policy settings from Active Directory, but does not display an RSoP audit report.",
            "2": "`secpol.msc` opens the Local Security Policy GUI snap-in for the local machine rather than generating domain RSoP command output.",
            "3": "`gpedit.msc` opens the Local Group Policy Editor GUI to configure local policy templates."
        }
    },
    {
        "id": "C2-011",
        "objective": "1.5",
        "difficulty": "easy",
        "tags": ["cli", "shutdown", "command-line", "automation"],
        "question": "A technician enters the command `shutdown /r /t 60` into an elevated Windows Command Prompt. What action will the operating system perform?",
        "options": ["Perform an immediate power off of the computer", "Restart the computer after a 60-second delay", "Put the system into Hibernate mode", "Log off the current user session immediately"],
        "answer": 1,
        "explanation": "In the Windows `shutdown` command, the `/r` switch instructs the system to reboot (restart) rather than shut down (`/s`), and the `/t 60` switch specifies a countdown timer delay of 60 seconds before initiating the restart. Immediate shutdown uses `/s /t 0`, hibernate uses `/h`, and logoff uses `/l`.",
        "distractor_analysis": {
            "0": "Immediate shutdown is accomplished using `shutdown /s /t 0`.",
            "2": "Hibernation is invoked using `shutdown /h`.",
            "3": "Logging off the current interactive user session is executed with `shutdown /l`."
        }
    },
    {
        "id": "C2-012",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "robocopy", "file-migration", "command-line"],
        "question": "A system administrator needs to copy 500 GB of files across a network link, ensuring all NTFS permissions and timestamps are preserved, and that interrupted transfers resume automatically. Which built-in command-line tool is BEST suited for this task?",
        "options": ["`copy`", "`xcopy`", "`robocopy`", "`move`"],
        "answer": 2,
        "explanation": "`robocopy` (Robust File Copy) is a powerful Windows command-line replication utility designed for large-scale and network file transfers. It supports multi-threading, automatic retry and resumption of interrupted network transfers, directory mirroring (`/mir`), and preservation of NTFS permissions, attributes, and timestamps. `copy` and `move` are basic single-file utilities lacking resumption, and `xcopy` is a legacy tool superseded by robocopy.",
        "distractor_analysis": {
            "0": "`copy` is a basic Command Prompt tool that cannot resume interrupted network copies or mirror folder trees.",
            "1": "`xcopy` can copy directories but lacks modern multi-threaded transfer resilience and robust network retry capabilities.",
            "3": "`move` relocates files from one directory to another without providing network resumption or mirroring."
        }
    },
    {
        "id": "C2-013",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "xcopy", "command-line", "switches"],
        "question": "When using the `xcopy` command to replicate a directory structure, which command switch MUST be appended to copy all subdirectories, including any empty subdirectories?",
        "options": ["`/S`", "`/E`", "`/H`", "`/Y`"],
        "answer": 1,
        "explanation": "In `xcopy`, the `/E` switch copies directories and subdirectories, including empty ones. The `/S` switch copies subdirectories but excludes empty ones. The `/H` switch copies hidden and system files, and the `/Y` switch suppresses prompting to confirm overwriting existing destination files.",
        "distractor_analysis": {
            "0": "`/S` copies folders and subfolders containing data, but deliberately skips empty subdirectories.",
            "2": "`/H` includes hidden and system files in the copy operation, regardless of directory emptiness.",
            "3": "`/Y` suppresses interactive prompts asking whether to overwrite existing destination files."
        }
    },
    {
        "id": "C2-014",
        "objective": "1.5",
        "difficulty": "easy",
        "tags": ["cli", "rd", "rmdir", "directory-management"],
        "question": "A technician needs to delete a folder named 'OldLogs' and all of its files and nested subfolders using the Windows command line. Which command accomplishes this?",
        "options": ["`rd OldLogs`", "`rd /s OldLogs`", "`del OldLogs`", "`del /q OldLogs`"],
        "answer": 1,
        "explanation": "The Remove Directory command (`rd` or `rmdir`) with the `/s` switch removes the specified directory and all its subdirectories and files (a recursive tree deletion). Running `rd` without `/s` fails if the directory is not empty. The `del` command deletes individual files within a directory but does not remove the directory structure itself.",
        "distractor_analysis": {
            "0": "`rd` without switches fails with an error ('The directory is not empty') if any files exist inside.",
            "2": "`del` deletes files inside the folder but leaves the folder directory structure intact.",
            "3": "`del /q` performs quiet deletion of files without prompts, but still cannot delete the parent folder."
        }
    },
    {
        "id": "C2-015",
        "objective": "1.4",
        "difficulty": "easy",
        "tags": ["mmc", "lusrmgr", "user-management", "windows-tools"],
        "question": "Which Microsoft Management Console (MMC) snap-in command directly launches the Local Users and Groups management console on Windows Pro?",
        "options": ["`lusrmgr.msc`", "`secpol.msc`", "`gpedit.msc`", "`certmgr.msc`"],
        "answer": 0,
        "explanation": "`lusrmgr.msc` opens the Local Users and Groups snap-in, allowing administrators to create, delete, modify, and manage local user accounts and local security groups on non-Home Windows editions. `secpol.msc` opens Local Security Policy, `gpedit.msc` opens Local Group Policy Editor, and `certmgr.msc` opens User Certificates.",
        "distractor_analysis": {
            "1": "`secpol.msc` manages password complexity, account lockout, and audit policies on the local machine.",
            "2": "`gpedit.msc` configures local computer and user Group Policy templates.",
            "3": "`certmgr.msc` manages X.509 digital certificates and certificate trust stores for the current user."
        }
    },
    {
        "id": "C2-016",
        "objective": "1.4",
        "difficulty": "medium",
        "tags": ["mmc", "certificates", "certmgr", "certlm", "windows-tools"],
        "question": "A systems administrator needs to manage digital certificates for the current logged-on user account versus the local computer machine store. Which MMC snap-ins correspond to user certificates and computer certificates respectively?",
        "options": ["`certmgr.msc` for Current User and `certlm.msc` for Local Computer", "`certlm.msc` for Current User and `certmgr.msc` for Local Computer", "`mmc.exe` for User and `regedit.exe` for Computer", "`gpedit.msc` for User and `secpol.msc` for Computer"],
        "answer": 0,
        "explanation": "In Windows, `certmgr.msc` opens the Certificate Manager for the Current User (`HKCU\\Software\\Microsoft\\SystemCertificates`), while `certlm.msc` opens the Local Computer certificate store (`HKLM\\Software\\Microsoft\\SystemCertificates`). Reversing them is incorrect, `regedit` is the raw registry editor, and `gpedit`/`secpol` manage policy templates.",
        "distractor_analysis": {
            "1": "`certlm.msc` specifically manages Local Machine certificates, not the current interactive user store.",
            "2": "`mmc.exe` launches an empty console shell, and `regedit` edits raw registry hives.",
            "3": "`gpedit.msc` and `secpol.msc` configure Group Policy and security templates, not certificate stores."
        }
    },
    {
        "id": "C2-017",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["registry", "hkcu", "hklm", "user-profile"],
        "question": "Which Windows Registry root key stores desktop wallpaper settings, user environment variables, and application preferences specific to the currently logged-in user session?",
        "options": ["`HKEY_LOCAL_MACHINE (HKLM)`", "`HKEY_CURRENT_USER (HKCU)`", "`HKEY_CLASSES_ROOT (HKCR)`", "`HKEY_CURRENT_CONFIG (HKCC)`"],
        "answer": 1,
        "explanation": "`HKEY_CURRENT_USER (HKCU)` links to the current user's profile subkey in `HKEY_USERS` (loaded from `NTUSER.DAT`) and stores settings specific to the active user, including display themes, mapped printers, personal environment variables, and user software preferences. `HKLM` stores system-wide hardware and OS settings, `HKCR` stores file associations and COM classes, and `HKCC` points to current hardware profile information.",
        "distractor_analysis": {
            "0": "`HKLM` stores machine-wide configuration data common to all users on the computer (hardware, drivers, installed software).",
            "2": "`HKCR` manages file type associations, OLE data, and COM object class registrations.",
            "3": "`HKCC` contains runtime hardware configuration pointers linked from `HKLM\\SYSTEM`."
        }
    },
    {
        "id": "C2-018",
        "objective": "1.4",
        "difficulty": "medium",
        "tags": ["task-manager", "process-priority", "details-tab", "performance"],
        "question": "A technician needs to adjust the CPU execution priority (e.g., Realtime, High, Normal, Low) or CPU affinity for a misbehaving background process. Which tab in Task Manager provides these controls?",
        "options": ["Processes tab", "Details tab", "Performance tab", "Users tab"],
        "answer": 1,
        "explanation": "In Windows Task Manager, the `Details` tab provides low-level process controls, including Process ID (PID), memory commit charge, User Name, and right-click options to 'Set priority' (Realtime, High, Above normal, Normal, Below normal, Low) and 'Set affinity' (assigning specific CPU cores). The Processes tab groups applications by category, Performance graphs overall utilization, and Users shows logged-on sessions.",
        "distractor_analysis": {
            "0": "The Processes tab displays friendly names and resource consumption percentages, but does not provide Set Priority / Affinity menus.",
            "2": "The Performance tab graphs live CPU, Memory, Disk, and Network hardware metrics without process-specific tuning menus.",
            "3": "The Users tab shows active user sessions and aggregate resource draw per account."
        }
    },
    {
        "id": "C2-019",
        "objective": "1.4",
        "difficulty": "medium",
        "tags": ["performance-monitor", "perfmon", "counter-logs", "telemetry"],
        "question": "A systems engineer needs to record historical CPU, disk I/O, and memory performance metrics over a four-week period to establish a capacity baseline for a file server. Which Windows tool should be configured with User Defined Data Collector Sets?",
        "options": ["Task Manager", "Resource Monitor", "Performance Monitor (`perfmon.exe`)", "Event Viewer"],
        "answer": 2,
        "explanation": "Performance Monitor (`perfmon.msc` / `perfmon.exe`) is designed for long-term historical telemetry and performance auditing. It allows administrators to create Data Collector Sets that record selected performance counters (such as % Processor Time, Available MBytes, Disk Queue Length) into log files (.blg/.csv) over days, weeks, or months. Task Manager and Resource Monitor display live runtime data without long-term scheduled logging, and Event Viewer captures discrete system events rather than continuous numerical counter streams.",
        "distractor_analysis": {
            "0": "Task Manager provides real-time instantaneous snapshots and short-duration (60-second) performance graphs without long-term logging.",
            "1": "Resource Monitor offers granular per-process PID breakdowns in real time but does not log multi-week counter baselines.",
            "3": "Event Viewer records discrete milestone event logs (Errors, Warnings, Information) rather than periodic hardware counter metrics."
        }
    },
    {
        "id": "C2-020",
        "objective": "1.1",
        "difficulty": "hard",
        "tags": ["boot-process", "bootmgr", "winload", "bios-boot"],
        "question": "During a legacy BIOS boot sequence on a Windows workstation, the system BIOS executes POST and passes control to the MBR boot code, which executes BOOTMGR. Which operating system loader binary is executed NEXT by BOOTMGR to load the Windows kernel?",
        "options": ["`HAL.DLL`", "`WINLOAD.EXE`", "`NTOSKRNL.EXE`", "`BOOTMGFW.EFI`"],
        "answer": 1,
        "explanation": "In the legacy BIOS boot architecture, the Master Boot Record loads `BOOTMGR` (Windows Boot Manager), which reads the BCD store and launches `WINLOAD.EXE` (Windows OS Loader). `WINLOAD.EXE` then loads the Hardware Abstraction Layer (`HAL.DLL`), system registry hive, and the core Windows kernel (`NTOSKRNL.EXE`). On UEFI systems, `BOOTMGFW.EFI` and `WINLOAD.EFI` are used instead.",
        "distractor_analysis": {
            "0": "`HAL.DLL` is loaded by `WINLOAD.EXE` after `WINLOAD.EXE` starts executing, not directly by `BOOTMGR`.",
            "2": "`NTOSKRNL.EXE` (the Windows NT kernel) is initialized by `WINLOAD.EXE` after essential drivers are placed in memory.",
            "3": "`BOOTMGFW.EFI` is the UEFI EFI system partition boot manager binary, not a legacy BIOS loader."
        }
    },
    {
        "id": "C2-021",
        "objective": "1.4",
        "difficulty": "easy",
        "tags": ["winre", "recovery", "windows-tools", "startup-options"],
        "question": "A user needs to reboot their functional Windows 11 desktop directly into the Windows Recovery Environment (WinRE) to perform a System Image Recovery. How can this be initiated from the Windows Start menu?",
        "options": ["Pressing the F8 key rapidly during the vendor logo", "Holding down the Shift key while clicking 'Restart' in the Power menu", "Pressing Ctrl + Alt + Delete twice in rapid succession", "Pressing the Windows Key + X and selecting Device Manager"],
        "answer": 1,
        "explanation": "Holding down the Shift key while clicking 'Restart' from the Windows Start Power menu (or lock screen Power icon) bypasses standard restart and boots the machine directly into the Advanced Startup / Windows Recovery Environment (WinRE) menu. F8 is disabled by default on modern UEFI systems due to fast boot times, Ctrl+Alt+Del opens the security screen, and Win+X opens the Power User menu.",
        "distractor_analysis": {
            "0": "F8 legacy boot menu invocation is disabled by default in modern Windows 10/11 UEFI configurations.",
            "2": "Pressing Ctrl+Alt+Del opens the lock/sign-out security screen without entering WinRE.",
            "3": "Win+X opens the Quick Link administrative context menu to access tools like Disk Management and Device Manager."
        }
    },
    {
        "id": "C2-022",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["bootrec", "bcd", "command-line", "troubleshooting"],
        "question": "A Windows workstation displays a blue recovery screen with error code 0xc000000f indicating the Boot Configuration Data (BCD) file is missing. In the WinRE Command Prompt, which `bootrec` command switch searches for Windows installations and prompts to add them to the BCD store?",
        "options": ["`bootrec /fixmbr`", "`bootrec /fixboot`", "`bootrec /rebuildbcd`", "`bootrec /scanos`"],
        "answer": 2,
        "explanation": "The `bootrec /rebuildbcd` command scans all attached storage drives for compatible Windows installations and interactively prompts the administrator to add them to the Boot Configuration Data (BCD) store. `/fixmbr` rewrites the master boot record, `/fixboot` writes a new partition boot sector, and `/scanos` lists installations without offering an interactive rebuild.",
        "distractor_analysis": {
            "0": "`/fixmbr` writes a standard MBR code to the system partition without touching the BCD database entries.",
            "1": "`/fixboot` writes a new boot sector to the system partition to fix damaged PBRs.",
            "3": "`/scanos` lists Windows installations not currently in the BCD, but does not rebuild or update the database."
        }
    },
    {
        "id": "C2-023",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["windows-features", "features-on-demand", "optional-features", "hyper-v"],
        "question": "A developer needs to enable Windows Hyper-V and Windows Subsystem for Linux (WSL) on a Windows 11 Pro desktop. Where in Windows Settings can built-in optional components be turned on or off?",
        "options": ["Settings -> Apps -> Optional features -> More Windows features", "Settings -> Personalization -> Taskbar", "Settings -> Network and Internet -> Proxy", "Settings -> Accounts -> Sign-in options"],
        "answer": 0,
        "explanation": "Built-in Windows components and subsystems (such as Hyper-V, WSL, Windows Sandbox, Telnet Client, and IIS) are managed via Settings -> Apps -> Optional features -> 'More Windows features' (or `optionalfeatures.exe` in Control Panel). Taskbar settings customize the taskbar, Proxy configures network routing, and Sign-in options manages passwords and Windows Hello.",
        "distractor_analysis": {
            "1": "Taskbar personalization customizes taskbar alignment, corner icons, and search behavior.",
            "2": "Proxy settings manage web traffic routing and PAC script configuration for internet connectivity.",
            "3": "Sign-in options configures authentication mechanisms such as PINs, biometrics, and security keys."
        }
    },
    {
        "id": "C2-024",
        "objective": "4.9",
        "difficulty": "easy",
        "tags": ["remote-access", "rdp", "mstsc", "windows-tools"],
        "question": "Which executable command opens the Microsoft Remote Desktop Connection client on Windows?",
        "options": ["`mstsc.exe`", "`msra.exe`", "`resmon.exe`", "`perfmon.exe`"],
        "answer": 0,
        "explanation": "`mstsc.exe` (Microsoft Terminal Services Client) launches the Remote Desktop Connection application, allowing users to initiate an RDP connection to remote servers and workstations. `msra.exe` launches Windows Remote Assistance, `resmon.exe` launches Resource Monitor, and `perfmon.exe` launches Performance Monitor.",
        "distractor_analysis": {
            "1": "`msra.exe` launches Windows Remote Assistance for interactive screen sharing and support sessions.",
            "2": "`resmon.exe` opens Resource Monitor to inspect real-time CPU, memory, disk, and network process utilization.",
            "3": "`perfmon.exe` opens Performance Monitor for performance counter graphing and data collector logging."
        }
    },
    {
        "id": "C2-025",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "finder", "file-management", "apple"],
        "question": "Which default file manager application in macOS is equivalent to File Explorer in Windows, allowing users to browse directories, manage files, and access mounted storage volumes?",
        "options": ["Finder", "Spotlight", "Time Machine", "Terminal"],
        "answer": 0,
        "explanation": "Finder is the default desktop graphical file manager and shell in Apple macOS, functioning identically to Windows File Explorer by providing file navigation, folder creation, search integration, and volume management. Spotlight is the system-wide search indexer, Time Machine is the automated backup utility, and Terminal is the CLI shell.",
        "distractor_analysis": {
            "1": "Spotlight (Command + Space) is the desktop search tool used to index and launch files, contacts, and calculations.",
            "2": "Time Machine is the native incremental backup utility for macOS that creates hourly/daily snapshots to external drives.",
            "3": "Terminal is the command-line interface application used to access the Zsh/Bash shell."
        }
    }
]
