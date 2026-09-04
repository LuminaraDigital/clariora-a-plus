# c2_fixed_data_part1.py: C2-001 to C2-075
part1 = [
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
    },
    {
        "id": "C2-026",
        "objective": "1.9",
        "difficulty": "easy",
        "tags": ["linux", "cli", "pwd", "navigation"],
        "question": "Which command in a Linux terminal displays the absolute path of the current working directory?",
        "options": ["`ls`", "`pwd`", "`cd`", "`cat`"],
        "answer": 1,
        "explanation": "The `pwd` (print working directory) command prints the complete absolute pathname of the current working directory to the terminal stdout. `ls` lists directory contents, `cd` changes the active directory, and `cat` concatenates and displays file contents.",
        "distractor_analysis": {
            "0": "`ls` lists files and subdirectories contained within the current directory.",
            "2": "`cd` navigates between directories in the filesystem hierarchy.",
            "3": "`cat` displays the text content of specified files on the screen."
        }
    },
    {
        "id": "C2-027",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "chmod", "permissions", "octal"],
        "question": "A Linux administrator executes the command `chmod 755 script.sh`. What specific permission set is granted to the file's GROUP owner?",
        "options": ["Read, Write, and Execute (rwx)", "Read and Execute (r-x)", "Read-only (r--)", "Read and Write (rw-)"],
        "answer": 1,
        "explanation": "In standard Linux octal permissions, the three digits represent Owner (User), Group, and Others. The octal values are Read=4, Write=2, Execute=1. The second digit '5' represents the Group permissions: 4 + 1 = 5, which corresponds to Read and Execute (`r-x`). The owner receives 7 (`rwx`), and others receive 5 (`r-x`).",
        "distractor_analysis": {
            "0": "`rwx` corresponds to octal 7 (4+2+1), which is assigned to the file Owner.",
            "2": "`r--` corresponds to octal 4 (Read-only).",
            "3": "`rw-` corresponds to octal 6 (4+2), which lacks the execute bit."
        }
    },
    {
        "id": "C2-028",
        "objective": "1.9",
        "difficulty": "hard",
        "tags": ["linux", "security", "shadow", "passwords"],
        "question": "In a Linux operating system, which protected system file stores the encrypted password hashes for user accounts and is readable only by the root superuser?",
        "options": ["`/etc/passwd`", "`/etc/shadow`", "`/etc/group`", "`/etc/sudoers`"],
        "answer": 1,
        "explanation": "The `/etc/shadow` file contains encrypted password hashes (e.g., SHA-512) and password expiration parameters; it has strict permissions (`640` or `600`) and is readable exclusively by root. Historically, hashes were stored in `/etc/passwd`, but `/etc/passwd` must remain world-readable (`644`) for user ID to username mapping, so hashes were moved to `/etc/shadow` for security. `/etc/group` defines groups, and `/etc/sudoers` manages sudo privileges.",
        "distractor_analysis": {
            "0": "`/etc/passwd` is world-readable and stores account metadata (UID, GID, home directory, shell) with an 'x' placeholder for passwords.",
            "2": "`/etc/group` maps group names to group IDs and lists group memberships.",
            "3": "`/etc/sudoers` defines administrative privilege escalation rules for the `sudo` command."
        }
    },
    {
        "id": "C2-029",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "apt", "package-management", "debian"],
        "question": "What is the correct two-step command sequence on Debian/Ubuntu Linux systems to refresh the local package repository index and then install available software updates?",
        "options": ["`apt install` followed by `apt upgrade`", "`sudo apt update` followed by `sudo apt upgrade`", "`dnf check-update` followed by `dnf upgrade`", "`yum check` followed by `yum clean`"],
        "answer": 1,
        "explanation": "On Debian/Ubuntu systems using Advanced Package Tool (APT), `sudo apt update` downloads the latest package lists and metadata from configured repositories, and `sudo apt upgrade` installs available newer versions of packages currently installed on the system. `dnf` and `yum` are used in Red Hat/Fedora/CentOS distributions.",
        "distractor_analysis": {
            "0": "`apt install` installs a specified package name; it does not refresh the repository index.",
            "2": "`dnf` is the package manager for Fedora and Red Hat Enterprise Linux, not Debian/Ubuntu.",
            "3": "`yum` is the legacy package manager for RHEL/CentOS systems."
        }
    },
    {
        "id": "C2-030",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "hosts", "dns", "networking"],
        "question": "When a Linux system resolves a hostname to an IP address, which local static file is evaluated by default BEFORE querying upstream DNS servers?",
        "options": ["`/etc/resolv.conf`", "`/etc/hosts`", "`/etc/fstab`", "`/etc/hostname`"],
        "answer": 1,
        "explanation": "In Linux (and Unix/Windows systems), the `/etc/hosts` file contains static hostname-to-IP address mappings that are queried first by default according to the Name Service Switch configuration (`/etc/nsswitch.conf`). `/etc/resolv.conf` specifies upstream DNS nameserver IP addresses, `/etc/fstab` lists filesystem mount points, and `/etc/hostname` defines the machine's own system hostname.",
        "distractor_analysis": {
            "0": "`/etc/resolv.conf` defines upstream DNS server addresses used when local static `/etc/hosts` resolution fails.",
            "2": "`/etc/fstab` defines storage drive mount configurations and filesystem mount options.",
            "3": "`/etc/hostname` contains the system's assigned hostname string."
        }
    },
    {
        "id": "C2-031",
        "objective": "1.9",
        "difficulty": "hard",
        "tags": ["linux", "cron", "crontab", "scheduling"],
        "question": "What is the correct field order for a standard five-field Linux `crontab` schedule entry from left to right?",
        "options": ["Hour, Minute, Day of Month, Month, Day of Week", "Minute, Hour, Day of Month, Month, Day of Week", "Day of Week, Minute, Hour, Day of Month, Month", "Month, Day of Month, Hour, Minute, Day of Week"],
        "answer": 1,
        "explanation": "A standard Linux crontab timing expression consists of 5 fields: 1. Minute (0-59), 2. Hour (0-23), 3. Day of Month (1-31), 4. Month (1-12), and 5. Day of Week (0-7, where 0 and 7 represent Sunday), followed by the command to execute. For example, `30 2 * * 1` runs at 02:30 AM every Monday.",
        "distractor_analysis": {
            "0": "Starting with Hour is incorrect; the first field is always Minute.",
            "2": "Starting with Day of Week is incorrect; Day of Week is the 5th and final timing field.",
            "3": "Month is the 4th field, not the first field."
        }
    },
    {
        "id": "C2-032",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "time-machine", "backup", "apple"],
        "question": "Which native backup and recovery utility built into Apple macOS automatically creates hourly, daily, and weekly snapshots to an external storage drive or network volume?",
        "options": ["File History", "Time Machine", "Backup and Restore (Windows 7)", "Migration Assistant"],
        "answer": 1,
        "explanation": "Time Machine is Apple's native automated backup solution included in macOS. It automatically maintains hourly backups for the past 24 hours, daily backups for the past month, and weekly backups for all previous months until storage space is full. File History and Backup & Restore are Windows backup utilities, and Migration Assistant transfers user accounts between computers.",
        "distractor_analysis": {
            "0": "File History is a Microsoft Windows continuous backup utility for user libraries.",
            "2": "Backup and Restore (Windows 7) is a legacy Windows imaging utility.",
            "3": "Migration Assistant is an Apple utility used to transfer accounts and data from an old Mac or PC to a new Mac."
        }
    },
    {
        "id": "C2-033",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "dmg", "disk-image", "apple"],
        "question": "Which file extension represents a mountable Apple Disk Image file commonly used to distribute macOS software packages?",
        "options": [".pkg", ".dmg", ".app", ".iso"],
        "answer": 1,
        "explanation": "In macOS, `.dmg` stands for Apple Disk Image, a mountable volume file format used to distribute applications and files over the internet. When opened, it mounts like a physical disk on the desktop. `.pkg` is an installer package containing installation scripts, `.app` is an executable application bundle, and `.iso` is an optical disk image standard.",
        "distractor_analysis": {
            "0": "`.pkg` is an Apple installer flat package file executed by the macOS Installer utility.",
            "2": "`.app` is a directory bundle containing executable binaries and application assets.",
            "3": "`.iso` is a cross-platform CD/DVD/Blu-ray optical disc image format."
        }
    },
    {
        "id": "C2-034",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "spotlight", "shortcuts", "keyboard"],
        "question": "What is the default global keyboard shortcut to open the Spotlight search bar in macOS?",
        "options": ["Command + Tab", "Command + Space", "Function + F3", "Command + R"],
        "answer": 1,
        "explanation": "In macOS, pressing `Command + Space` (Cmd + Space) immediately invokes Spotlight search, allowing users to search local files, launch applications, perform calculations, and query Siri knowledge. Command + Tab switches active applications, F3 activates Mission Control, and Command + R reboots into macOS Recovery Mode.",
        "distractor_analysis": {
            "0": "Command + Tab opens the macOS Application Switcher to cycle between running apps.",
            "2": "F3 (or Mission Control key) displays an overview of all open desktop windows and spaces.",
            "3": "Command + R is held during Mac startup to boot into macOS Recovery Mode."
        }
    },
    {
        "id": "C2-035",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "whaling", "spear-phishing", "executives"],
        "question": "A threat actor crafts a sophisticated spear-phishing email targeting the Chief Technology Officer (CTO) to gain access to proprietary intellectual property. What specific term describes phishing directed at high-ranking corporate executives?",
        "options": ["Broad phishing", "Whaling", "Vishing", "Smishing"],
        "answer": 1,
        "explanation": "Whaling is a specialized, highly customized form of spear phishing that targets high-profile corporate executives (such as CEOs, CFOs, CTOs, and board members). Broad phishing casts a wide net with generic templates, vishing is voice phishing over the phone, and smishing is SMS-based mobile text phishing.",
        "distractor_analysis": {
            "0": "Broad phishing sends generic mass emails to thousands of indiscriminate recipients.",
            "2": "Vishing involves social engineering conducted via voice telephone calls.",
            "3": "Smishing uses mobile SMS text messages containing malicious links."
        }
    },
    {
        "id": "C2-036",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "quishing", "qr-code", "phishing"],
        "question": "An attacker pastes malicious adhesive QR codes over legitimate parking meter payment codes, redirecting scanning smartphone users to a fraudulent credit card payment portal. What attack vector is this?",
        "options": ["Smishing", "Quishing (QR code phishing)", "Pharming", "Vishing"],
        "answer": 1,
        "explanation": "Quishing (QR code phishing) uses malicious Quick Response (QR) codes in physical or digital locations that redirect mobile device users who scan the code to malicious phishing landing pages or malware download sites. Smishing uses SMS messages, pharming redirects DNS traffic, and vishing uses phone calls.",
        "distractor_analysis": {
            "0": "Smishing delivers phishing links via cellular SMS/MMS text messages.",
            "2": "Pharming poisons DNS caches or hosts files to secretly redirect valid URLs to fake websites.",
            "3": "Vishing is voice phishing conducted via telephone conversations."
        }
    },
    {
        "id": "C2-037",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "piggybacking", "tailgating", "physical-security"],
        "question": "An employee holding a security badge openly allows an unbadged contractor to enter a secured facility door with them after the contractor asks them to hold the door. What term specifically describes entering WITH the employee's explicit consent?",
        "options": ["Tailgating", "Piggybacking", "Shoulder surfing", "Pretexting"],
        "answer": 1,
        "explanation": "In CompTIA physical security terminology, Piggybacking occurs when an unauthorized person enters a secure door with the explicit knowledge and consent of the authorized person (e.g., asking someone to hold the door). Tailgating occurs when the attacker slips in behind an authorized user WITHOUT their knowledge or consent. Shoulder surfing is visual eavesdropping, and pretexting is creating an invented scenario.",
        "distractor_analysis": {
            "0": "Tailgating involves following an authorized person through an open door covertly without their permission or consent.",
            "2": "Shoulder surfing is the act of looking over someone's shoulder to capture passwords or sensitive screen data.",
            "3": "Pretexting is crafting an elaborate fake backstory to manipulate a target into disclosing information."
        }
    },
    {
        "id": "C2-038",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["physical-security", "mantrap", "access-control-vestibule", "datacenter"],
        "question": "Which physical security barrier features two interlocking doors where the second door cannot be opened until the first door has completely closed and the occupant is authenticated?",
        "options": ["Turnstile", "Access control vestibule (mantrap)", "Crash-rated bollard", "Magnetometer"],
        "answer": 1,
        "explanation": "An access control vestibule (traditionally called a mantrap) consists of a secure enclosed space with two interlocking sets of doors. One door must close and lock before the opposite door will unlock upon validation, physically preventing tailgating and unauthorized multi-person entry. Turnstiles permit rotational single passage, bollards stop vehicle ramming, and magnetometers detect metal weapons.",
        "distractor_analysis": {
            "0": "Turnstiles are mechanical or optical barriers that rotate for one person but do not physically enclose the occupant between two interlocking doors.",
            "2": "Bollards are heavy vertical concrete or steel posts designed to prevent vehicles from ramming into building entrances.",
            "3": "Magnetometers are walk-through metal detection portals that detect ferromagnetic objects."
        }
    },
    {
        "id": "C2-039",
        "objective": "2.3",
        "difficulty": "hard",
        "tags": ["wireless-security", "wpa3", "sae", "authentication"],
        "question": "Which cryptographic key exchange protocol is introduced in WPA3-Personal to replace the vulnerable WPA2 Pre-Shared Key (PSK) 4-way handshake?",
        "options": ["Pre-Shared Key (PSK)", "Simultaneous Authentication of Equals (SAE)", "Temporal Key Integrity Protocol (TKIP)", "Wired Equivalent Privacy (WEP)"],
        "answer": 1,
        "explanation": "WPA3-Personal mandates Simultaneous Authentication of Equals (SAE), a dragonfly key exchange protocol based on zero-knowledge proofs. SAE prevents offline dictionary and brute-force password-guessing attacks and provides forward secrecy. PSK is the older WPA2 method, and TKIP and WEP are broken legacy algorithms.",
        "distractor_analysis": {
            "0": "PSK (Pre-Shared Key) is the legacy WPA/WPA2 authentication scheme vulnerable to offline capture and dictionary cracking.",
            "2": "TKIP is an obsolete RC4-based wrapper protocol used in original WPA.",
            "3": "WEP is an insecure legacy 802.11 encryption standard broken by static key reuse."
        }
    },
    {
        "id": "C2-040",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-security", "wpa2", "aes-ccmp", "encryption"],
        "question": "What encryption standard and cipher mode was introduced in WPA2 to completely replace the vulnerable RC4-based TKIP encryption used in original WPA?",
        "options": ["RC4 stream cipher", "AES-CCMP", "DES-CBC", "Wi-Fi Protected Setup (WPS)"],
        "answer": 1,
        "explanation": "WPA2 introduced CCMP (Counter Mode Cipher Block Chaining Message Authentication Code Protocol), which utilizes the robust Advanced Encryption Standard (AES) cipher with 128-bit keys to replace the vulnerable RC4-based TKIP protocol. RC4 is cryptographically broken, DES is an obsolete 56-bit cipher, and WPS is a vulnerable PIN-based pairing feature.",
        "distractor_analysis": {
            "0": "RC4 is the underlying stream cipher in WEP and TKIP that AES-CCMP was designed to replace.",
            "2": "DES is an outdated symmetric encryption standard vulnerable to modern brute-force attacks.",
            "3": "WPS is an automated device connection protocol, not a symmetric encryption cipher suite."
        }
    },
    {
        "id": "C2-041",
        "objective": "2.3",
        "difficulty": "hard",
        "tags": ["authentication", "radius", "ports", "protocols"],
        "question": "A network engineer is configuring an enterprise 802.1X wireless authentication server. Which transport protocol and default UDP port are used for RADIUS authentication?",
        "options": ["TCP port 49", "UDP port 1812", "UDP port 88", "TCP port 389"],
        "answer": 1,
        "explanation": "RADIUS (Remote Authentication Dial-In User Service) uses UDP port 1812 for authentication and authorization and UDP port 1813 for accounting (legacy deployments use UDP 1645/1646). TCP port 49 is TACACS+, UDP port 88 is Kerberos, and TCP port 389 is LDAP.",
        "distractor_analysis": {
            "0": "TCP port 49 is used by TACACS+ for centralized network device administration.",
            "2": "UDP port 88 is used by the Kerberos authentication service in Active Directory.",
            "3": "TCP port 389 is used by the Lightweight Directory Access Protocol (LDAP)."
        }
    },
    {
        "id": "C2-042",
        "objective": "2.10",
        "difficulty": "medium",
        "tags": ["soho-security", "upnp", "router-hardening", "port-forwarding"],
        "question": "Which SOHO router feature allows IoT devices and game consoles to automatically configure port forwarding rules on the router firewall without administrative authorization, and should be DISABLED for security?",
        "options": ["Quality of Service (QoS)", "Universal Plug and Play (UPnP)", "Dynamic Host Configuration Protocol (DHCP)", "Network Address Translation (NAT)"],
        "answer": 1,
        "explanation": "Universal Plug and Play (UPnP) is designed to let networked devices (media players, cameras, game consoles) automatically open inbound ports on the router's firewall without requiring user intervention. Because malware can exploit UPnP to silently expose internal endpoints to the internet, security best practices mandate disabling UPnP on SOHO routers. QoS prioritizes bandwidth, DHCP assigns IP addresses, and NAT translates private IP addresses.",
        "distractor_analysis": {
            "0": "QoS prioritizes voice and video network packets to prevent latency, representing a safe traffic management feature.",
            "2": "DHCP automatically leases IP configurations to clients and is essential on LANs.",
            "3": "NAT allows multiple private IP devices to share a single public IP address at the router WAN boundary."
        }
    },
    {
        "id": "C2-043",
        "objective": "2.2",
        "difficulty": "hard",
        "tags": ["windows-permissions", "ntfs", "share-permissions", "effective-permissions"],
        "question": "A network share is configured with Share Permission: Read. The underlying NTFS permission on the target folder is set to: Full Control. When an authorized domain user accesses the folder remotely across the network, what is their effective permission?",
        "options": ["Full Control", "Read", "Modify", "No Access"],
        "answer": 1,
        "explanation": "When accessing files over the network, Windows evaluates both Share Permissions and NTFS Permissions. The effective permission is always the MOST RESTRICTIVE combination of the two. Between Share Permission (Read) and NTFS Permission (Full Control), the more restrictive permission is Read. Therefore, the user can only read files and cannot write, modify, or delete files across the network.",
        "distractor_analysis": {
            "0": "Full Control is blocked because the network share layer restricts the connection to Read-only access.",
            "2": "Modify requires write and delete permissions, which are denied by the Read share permission.",
            "3": "No Access (Deny) is not configured; the user has valid Read permissions."
        }
    },
    {
        "id": "C2-044",
        "objective": "2.2",
        "difficulty": "medium",
        "tags": ["encryption", "efs", "bitlocker", "ntfs"],
        "question": "Which native Windows encryption technology provides granular, file-level and folder-level encryption tied to individual user account certificates on NTFS volumes?",
        "options": ["BitLocker Drive Encryption", "Encrypting File System (EFS)", "FileVault 2", "BitLocker To Go"],
        "answer": 1,
        "explanation": "Encrypting File System (EFS) is a feature of the NTFS file system that enables granular, transparent encryption of individual files and folders tied to the specific user's public key certificate. BitLocker encrypts entire disk volumes (block-level), BitLocker To Go encrypts removable USB drives, and FileVault 2 is the full-disk encryption system for Apple macOS.",
        "distractor_analysis": {
            "0": "BitLocker operates at the full volume level, encrypting entire disk partitions rather than individual user files.",
            "2": "FileVault 2 is Apple's full-disk volume encryption technology for macOS.",
            "3": "BitLocker To Go is used to encrypt entire removable USB flash drives and external hard drives."
        }
    },
    {
        "id": "C2-045",
        "objective": "2.6",
        "difficulty": "medium",
        "tags": ["malware-removal", "methodology", "quarantine", "comptia-7-step"],
        "question": "Following the CompTIA 7-step malware removal process, what is the VERY FIRST action a technician must take immediately after investigating and verifying malware symptoms?",
        "options": ["Disable System Restore", "Quarantine the infected system (disconnect from network)", "Update anti-malware signatures and scan", "Educate the end user"],
        "answer": 1,
        "explanation": "Step 2 of the CompTIA 7-step malware removal methodology (immediately following Step 1: Identify and research malware symptoms) is to Quarantine the infected system by disconnecting all network cables, turning off Wi-Fi/Bluetooth, and isolating the device to prevent lateral malware propagation across the LAN. Disabling System Restore is Step 3, updating and scanning is Step 4, and educating the user is Step 7.",
        "distractor_analysis": {
            "0": "Disabling System Restore is Step 3 of the process and must only be performed after the host is safely isolated from the network.",
            "2": "Updating signatures and running remediation scans is Step 4 of the methodology.",
            "3": "Educating the end user is the 7th and final step performed after the system is fully cleansed and restored."
        }
    },
    {
        "id": "C2-046",
        "objective": "2.6",
        "difficulty": "medium",
        "tags": ["malware-removal", "system-restore", "methodology", "remediation"],
        "question": "Why does the CompTIA malware removal methodology mandate disabling Windows System Restore BEFORE initiating remediation and anti-malware scans?",
        "options": ["To prevent the firewall from blocking outgoing updates", "To prevent infected files and registry keys from being saved into restore point snapshots that could reinfect the PC later", "To bypass User Account Control (UAC) prompts during scanning", "To increase physical RAM available to the antivirus engine"],
        "answer": 1,
        "explanation": "System Restore continuously archives system files, registry hives, and executables into Volume Shadow Copy snapshots. If an active malware infection is present, infected binaries can be saved into these snapshots. Disabling System Restore deletes all prior restore points, ensuring that reverting the system at a later date will not reintroduce the malware. It does not affect firewalls, UAC elevation, or RAM capacity.",
        "distractor_analysis": {
            "0": "System Restore operates on disk volume snapshots and has no interaction with Windows Defender Firewall rules.",
            "2": "UAC security elevation prompts are independent of the System Restore / Volume Shadow Copy service state.",
            "3": "Disabling System Restore purges disk snapshots and does not alter physical system RAM capacity."
        }
    },
    {
        "id": "C2-047",
        "objective": "4.3",
        "difficulty": "hard",
        "tags": ["backup-methods", "differential", "archive-bit", "backup-types"],
        "question": "Which backup method copies all files that have been created or modified since the last FULL backup and does NOT clear the archive bit?",
        "options": ["Full backup", "Incremental backup", "Differential backup", "Synthetic full backup"],
        "answer": 2,
        "explanation": "A Differential backup copies all files that have changed since the last FULL backup and leaves the archive bit set (does NOT clear it). Because the archive bit remains untouched, each subsequent differential backup grows larger, capturing cumulative changes since the full backup. Full and Incremental backups clear the archive bit upon completion.",
        "distractor_analysis": {
            "0": "A Full backup copies all selected data regardless of status and CLEARS the archive bit.",
            "1": "An Incremental backup copies files changed since the last backup of any type and CLEARS the archive bit.",
            "3": "A Synthetic full merges incrementals into an existing full backup on the storage server."
        }
    },
    {
        "id": "C2-048",
        "objective": "4.3",
        "difficulty": "easy",
        "tags": ["backup-best-practices", "3-2-1-rule", "disaster-recovery", "offsite"],
        "question": "The foundational 3-2-1 backup strategy mandates maintaining 3 total copies of data, stored on 2 different media types, with at least 1 copy stored where?",
        "options": ["In an unencrypted local partition", "Offsite (or in the cloud)", "On a legacy magnetic floppy disk", "Inside the same server room rack"],
        "answer": 1,
        "explanation": "The 3-2-1 backup rule requires: 3 copies of data (production copy + 2 backup copies), on 2 different storage media types (e.g., local disk SAN and tape or cloud), with 1 copy kept Offsite (or in an isolated cloud region) to ensure data survival against localized physical disasters (fire, flood, theft). Keeping copies in the same room or unencrypted partitions leaves data vulnerable to site destruction.",
        "distractor_analysis": {
            "0": "Storing backups on local unencrypted partitions offers zero disaster recovery protection if the physical machine is destroyed.",
            "2": "Floppy disks have minuscule storage capacity (1.44 MB) and are obsolete for enterprise backup.",
            "3": "Keeping all backup copies in the same room fails completely if the facility experiences a fire or flood."
        }
    },
    {
        "id": "C2-049",
        "objective": "2.9",
        "difficulty": "medium",
        "tags": ["data-destruction", "degaussing", "ssd", "magnetic-media"],
        "question": "A technician is preparing decommissioned storage drives for data destruction. On which storage technology is magnetic degaussing COMPLETELY INEFFECTIVE?",
        "options": ["Traditional Magnetic Hard Disk Drives (HDDs)", "Magnetic LTO Tape Cartridges", "Solid-State Drives (SSDs and NVMe flash drives)", "Magnetic Floppy Disks"],
        "answer": 2,
        "explanation": "Degaussing uses a powerful magnetic field to erase magnetic domains on magnetic media (HDDs, tapes, floppy disks). Solid-State Drives (SSDs, NVMe drives, USB flash drives) store data as electrical charges trapped in silicon NAND flash memory cells, which are completely unaffected by magnetic fields. SSDs must be sanitized using cryptographic erase (Secure Erase) or physical shredding.",
        "distractor_analysis": {
            "0": "HDDs store data magnetically on platter coatings and are effectively sanitized and destroyed by degaussing.",
            "1": "Magnetic tapes rely on magnetic iron oxide/barium ferrite particles that are wiped completely by degaussers.",
            "3": "Floppy disks are magnetic media that are instantly erased when exposed to a degausser."
        }
    },
    {
        "id": "C2-050",
        "objective": "4.4",
        "difficulty": "medium",
        "tags": ["fire-safety", "class-c", "extinguisher", "co2"],
        "question": "Which class of fire extinguisher is specifically designated for fighting fires involving energized electrical equipment such as servers, wiring, and circuit breakers?",
        "options": ["Class A (water-based)", "Class B (flammable liquids)", "Class C (energized electrical equipment)", "Class K (commercial cooking grease)"],
        "answer": 2,
        "explanation": "Class C fire extinguishers use non-conductive extinguishing agents (such as Carbon Dioxide [CO2], Halon alternatives, or dry chemical powder) specifically rated to safely extinguish fires on energized electrical equipment without shocking the operator. Class A is for ordinary combustibles (wood/paper), Class B is for flammable liquids, and Class K is for cooking oils.",
        "distractor_analysis": {
            "0": "Class A extinguishers use pressurized water, which conducts electricity and causes fatal shocks on live server equipment.",
            "1": "Class B extinguishers are rated for flammable liquids like gasoline, oil, and paint.",
            "3": "Class K extinguishers are wet chemical systems formulated for commercial kitchen deep fryers."
        }
    },
    {
        "id": "C2-051",
        "objective": "4.8",
        "difficulty": "easy",
        "tags": ["scripting", "powershell", "file-extensions", "automation"],
        "question": "What is the standard file extension used for Microsoft PowerShell script files?",
        "options": [".bat", ".cmd", ".ps1", ".vbs"],
        "answer": 2,
        "explanation": "PowerShell script files use the `.ps1` file extension. Windows Command Prompt batch files use `.bat` or `.cmd`, and VBScript files use `.vbs`. Python scripts use `.py`, and Bash shell scripts use `.sh`.",
        "distractor_analysis": {
            "0": "`.bat` is the legacy file extension for MS-DOS / Windows Command Prompt batch files.",
            "1": "`.cmd` is used for Windows NT Command Prompt scripts.",
            "3": "`.vbs` is the file extension for Microsoft Visual Basic Scripting Edition (VBScript) files."
        }
    },
    {
        "id": "C2-052",
        "objective": "4.8",
        "difficulty": "easy",
        "tags": ["scripting", "batch", "file-extensions", "cmd"],
        "question": "Which file extension is used for traditional Windows Command Prompt batch scripts that execute command sequences in `cmd.exe`?",
        "options": [".bat", ".ps1", ".sh", ".py"],
        "answer": 0,
        "explanation": "Windows batch files executed by the Command Prompt (`cmd.exe`) use the `.bat` (or `.cmd`) file extension. `.ps1` is for PowerShell scripts, `.sh` is for Linux/Unix shell scripts, and `.py` is for Python source code.",
        "distractor_analysis": {
            "1": "`.ps1` is the file extension for Microsoft PowerShell scripts.",
            "2": "`.sh` is the file extension for Unix/Linux Bourne/Bash shell scripts.",
            "3": "`.py` is the file extension for Python script files."
        }
    },
    {
        "id": "C2-053",
        "objective": "4.8",
        "difficulty": "easy",
        "tags": ["scripting", "bash", "linux", "file-extensions"],
        "question": "Which file extension is universally used for Unix/Linux Bourne-Again Shell (Bash) script files?",
        "options": [".bat", ".ps1", ".sh", ".js"],
        "answer": 2,
        "explanation": "Linux and Unix shell scripts typically use the `.sh` file extension and begin with a shebang line (e.g., `#!/bin/bash`). `.bat` is for Windows batch scripts, `.ps1` is for PowerShell, and `.js` is for JavaScript files.",
        "distractor_analysis": {
            "0": "`.bat` is a Windows batch file extension.",
            "1": "`.ps1` is a Microsoft PowerShell script extension.",
            "3": "`.js` is a JavaScript source file extension."
        }
    },
    {
        "id": "C2-054",
        "objective": "4.8",
        "difficulty": "easy",
        "tags": ["scripting", "python", "file-extensions", "interpreted"],
        "question": "Which file extension identifies source code files written for the Python programming language?",
        "options": [".py", ".ps1", ".sh", ".vbs"],
        "answer": 0,
        "explanation": "Python source code scripts use the `.py` file extension and are executed by the Python interpreter runtime (`python script.py`). `.ps1` is for PowerShell, `.sh` is for Linux shell scripts, and `.vbs` is for VBScript.",
        "distractor_analysis": {
            "1": "`.ps1` is the file extension for PowerShell scripts.",
            "2": "`.sh` is the file extension for Unix/Linux Bash scripts.",
            "3": "`.vbs` is the file extension for Microsoft VBScript files."
        }
    },
    {
        "id": "C2-055",
        "objective": "4.8",
        "difficulty": "easy",
        "tags": ["scripting", "vbscript", "file-extensions", "legacy"],
        "question": "Which file extension is used for legacy Microsoft Visual Basic Scripting Edition (VBScript) files executed by Windows Script Host (`wscript.exe` / `cscript.exe`)?",
        "options": [".vbs", ".ps1", ".bat", ".py"],
        "answer": 0,
        "explanation": "VBScript (Visual Basic Scripting Edition) files use the `.vbs` extension and are executed natively in Windows via the Windows Script Host engines (`cscript.exe` for console output or `wscript.exe` for GUI dialogs). `.ps1` is for modern PowerShell, `.bat` is for batch scripts, and `.py` is for Python.",
        "distractor_analysis": {
            "1": "`.ps1` is the file extension for Microsoft PowerShell.",
            "2": "`.bat` is the file extension for Command Prompt batch scripts.",
            "3": "`.py` is the file extension for Python scripts."
        }
    },
    {
        "id": "C2-056",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["windows-tools", "dxdiag", "directx", "diagnostics"],
        "question": "A technician is troubleshooting video stuttering and 3D graphics rendering errors on a CAD workstation. Which Windows diagnostic tool tests DirectX display and sound acceleration and generates a detailed hardware report?",
        "options": ["`dxdiag.exe`", "`msinfo32.exe`", "`cleanmgr.exe`", "`eventvwr.msc`"],
        "answer": 0,
        "explanation": "The DirectX Diagnostic Tool (`dxdiag.exe`) tests video graphics display adapters, DirectDraw/Direct3D acceleration, audio sound devices, and game controllers, providing driver version details and diagnostic reporting. `msinfo32` provides broad system hardware summaries, `cleanmgr` runs Disk Cleanup, and `eventvwr` views Event Viewer logs.",
        "distractor_analysis": {
            "1": "`msinfo32.exe` provides system summaries and driver lists without executing interactive DirectX 3D graphics diagnostic tests.",
            "2": "`cleanmgr.exe` is the Windows Disk Cleanup utility used to delete temporary files and cached installer files.",
            "3": "`eventvwr.msc` displays Windows operating system and application event logs."
        }
    },
    {
        "id": "C2-057",
        "objective": "2.7",
        "difficulty": "medium",
        "tags": ["security-best-practices", "password-complexity", "authentication", "gpo"],
        "question": "According to enterprise password security best practices and NIST guidelines, which policy combination creates the strongest protection against dictionary and brute-force password cracking attacks?",
        "options": ["Enforcing long passphrases (15+ characters) with multifactor authentication (MFA)", "Requiring 6-character passwords changed every 7 days", "Allowing blank passwords for local administrator accounts", "Using the employee's username reversed as the password"],
        "answer": 0,
        "explanation": "Modern password security guidelines (including NIST SP 800-63B) recommend long passphrases (15+ characters consisting of multiple words) combined with mandatory Multifactor Authentication (MFA). Length exponentially increases entropy, making offline cracking infeasible. Short passwords changed weekly cause user fatigue and predictable substitution patterns, blank passwords eliminate security entirely, and username-derived passwords are trivial to guess.",
        "distractor_analysis": {
            "1": "Short 6-character passwords have minuscule entropy and can be cracked in seconds regardless of weekly rotation schedules.",
            "2": "Blank passwords provide zero authentication protection and allow unauthenticated administrative logon.",
            "3": "Using reversed usernames is easily cracked by standard dictionary attack tools."
        }
    },
    {
        "id": "C2-058",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-security", "wpa2-personal", "pre-shared-key", "psk"],
        "question": "A small business deploys a Wi-Fi network using WPA2-Personal. What authentication method is used to authenticate client devices to the access point?",
        "options": ["A Pre-Shared Key (PSK) passphrase entered on each client", "A central RADIUS 802.1X server with digital certificates", "An unencrypted open captive portal", "A TACACS+ authentication server"],
        "answer": 0,
        "explanation": "WPA2-Personal (also called WPA2-PSK) uses a Pre-Shared Key (passphrase between 8 and 63 characters) entered into the router and shared with all connecting client devices to derive pairwise encryption keys. WPA2-Enterprise uses 802.1X with a RADIUS server, captive portals are used on public open networks, and TACACS+ is for network device administration.",
        "distractor_analysis": {
            "1": "RADIUS servers and digital certificates are utilized in WPA2/WPA3-Enterprise, not WPA2-Personal.",
            "2": "Captive portals on open networks authenticate web sessions without WPA2-Personal pre-shared keys.",
            "3": "TACACS+ is an administration protocol for switches and routers, not client WPA2-Personal Wi-Fi."
        }
    },
    {
        "id": "C2-059",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["windows-tools", "system-properties", "sysdm", "computer-name"],
        "question": "Which control panel applet executable directly opens the System Properties dialog, allowing an administrator to change the computer name, workgroup, or domain membership?",
        "options": ["`sysdm.cpl`", "`ncpa.cpl`", "`appwiz.cpl`", "`firewall.cpl`"],
        "answer": 0,
        "explanation": "`sysdm.cpl` directly opens the System Properties dialog (Computer Name, Hardware, Advanced, System Protection, and Remote tabs), allowing administrators to rename the machine, join domains, or configure environment variables. `ncpa.cpl` opens Network Connections, `appwiz.cpl` opens Programs and Features, and `firewall.cpl` opens Windows Defender Firewall.",
        "distractor_analysis": {
            "1": "`ncpa.cpl` opens the Network Connections control panel applet to configure adapter IP addresses.",
            "2": "`appwiz.cpl` opens Programs and Features to uninstall or repair desktop applications.",
            "3": "`firewall.cpl` opens the Windows Defender Firewall configuration applet."
        }
    },
    {
        "id": "C2-060",
        "objective": "4.9",
        "difficulty": "medium",
        "tags": ["remote-access", "ssh", "port-22", "security"],
        "question": "A network administrator needs to remotely manage a Linux server over an unencrypted public network. Which protocol provides an encrypted command-line interface session using TCP port 22?",
        "options": ["SSH (Secure Shell)", "Telnet", "HTTP", "FTP"],
        "answer": 0,
        "explanation": "Secure Shell (SSH) operates over TCP port 22 and provides strong cryptographic authentication (passwords or public/private key pairs) and end-to-end symmetric encryption for remote command-line sessions. Telnet (port 23) transmits credentials in cleartext plaintext, HTTP (port 80) is unencrypted web traffic, and FTP (port 21) is unencrypted file transfer.",
        "distractor_analysis": {
            "1": "Telnet operates on port 23 and transmits all administrative logins and commands across the network in plaintext.",
            "2": "HTTP runs on port 80 for unencrypted web page delivery, not interactive remote CLI shells.",
            "3": "FTP operates on port 21 for transferring files in plaintext without shell command execution."
        }
    },
    {
        "id": "C2-061",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["windows-tools", "appwiz", "programs-and-features", "uninstall"],
        "question": "Which Control Panel command launches the Programs and Features applet to uninstall or repair desktop applications in Windows?",
        "options": ["`appwiz.cpl`", "`sysdm.cpl`", "`ncpa.cpl`", "`powercfg.cpl`"],
        "answer": 0,
        "explanation": "`appwiz.cpl` opens the Programs and Features (Add/Remove Programs) applet, which lists all installed software, allows uninstalling or repairing applications, and links to 'Turn Windows features on or off'. `sysdm.cpl` is System Properties, `ncpa.cpl` is Network Connections, and `powercfg.cpl` is Power Options.",
        "distractor_analysis": {
            "1": "`sysdm.cpl` opens System Properties to manage computer name, domain join, and paging files.",
            "2": "`ncpa.cpl` opens Network Connections to view and configure network interface adapters.",
            "3": "`powercfg.cpl` opens Power Options to configure sleep timers and battery plans."
        }
    },
    {
        "id": "C2-062",
        "objective": "2.9",
        "difficulty": "hard",
        "tags": ["data-destruction", "shredding", "incineration", "physical-destruction"],
        "question": "An intelligence agency mandates the permanent physical destruction of magnetic hard drives containing top-secret data. Which method guarantees complete physical destruction of the storage media platters?",
        "options": ["Industrial mechanical shredding / incineration", "Performing a standard NTFS Full Format", "Deleting all partitions in Disk Management", "Overwriting the drive with a single pass of zeroes"],
        "answer": 0,
        "explanation": "For top-secret and highly classified data, physical destruction (industrial cross-cut shredding, disintegration, degaussing followed by crushing, or incineration in a certified smelting furnace) physically destroys the drive platters, making data recovery mathematically and physically impossible. Formatting, partition deletion, and single-pass overwriting leave data vulnerable to specialized laboratory recovery techniques.",
        "distractor_analysis": {
            "1": "A Full Format overwrites sectors with zeroes on a functioning drive but does not destroy the physical hardware or protect bad sectors.",
            "2": "Deleting partitions merely removes partition table records from sector 0, leaving all raw data blocks intact.",
            "3": "Single-pass zero fills do not meet high-security classified data destruction standards."
        }
    },
    {
        "id": "C2-063",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["windows-tools", "ncpa", "network-connections", "cpl"],
        "question": "Which command-line shortcut directly opens the Network Connections control panel window displaying all physical and virtual network adapters in Windows?",
        "options": ["`ncpa.cpl`", "`sysdm.cpl`", "`appwiz.cpl`", "`desk.cpl`"],
        "answer": 0,
        "explanation": "`ncpa.cpl` (Network Control Panel Applet) opens the Network Connections window, where technicians can view, enable, disable, rename, and configure properties (IP addresses, DNS, subnet masks, gateway) for all Ethernet, Wi-Fi, and virtual adapters. `sysdm.cpl` opens System Properties, `appwiz.cpl` opens Programs and Features, and `desk.cpl` opens Display Settings.",
        "distractor_analysis": {
            "1": "`sysdm.cpl` opens the System Properties dialog for computer naming and domain joins.",
            "2": "`appwiz.cpl` opens the Programs and Features window to manage application installations.",
            "3": "`desk.cpl` opens the legacy Display properties configuration window."
        }
    },
    {
        "id": "C2-064",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["windows-tools", "powercfg", "power-options", "energy"],
        "question": "Which Control Panel command launches the Power Options management applet to configure sleep timers, screen turn-off intervals, and power button behaviors?",
        "options": ["`powercfg.cpl`", "`ncpa.cpl`", "`sysdm.cpl`", "`inetcpl.cpl`"],
        "answer": 0,
        "explanation": "`powercfg.cpl` opens the Power Options control panel applet, allowing users and technicians to select power plans (Balanced, High Performance, Power Saver), configure display sleep timeouts, and define power button actions. `ncpa.cpl` is Network Connections, `sysdm.cpl` is System Properties, and `inetcpl.cpl` is Internet Options.",
        "distractor_analysis": {
            "1": "`ncpa.cpl` opens Network Connections to configure network interface adapters.",
            "2": "`sysdm.cpl` opens System Properties for domain membership and hardware settings.",
            "3": "`inetcpl.cpl` opens Internet Properties to configure proxy settings and browser security zones."
        }
    },
    {
        "id": "C2-065",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["windows-tools", "inetcpl", "internet-options", "proxy"],
        "question": "Which command launches the Internet Properties applet, used to configure browser security zones, enterprise proxy server settings, and SSL/TLS cipher suites in Windows?",
        "options": ["`inetcpl.cpl`", "`ncpa.cpl`", "`sysdm.cpl`", "`appwiz.cpl`"],
        "answer": 0,
        "explanation": "`inetcpl.cpl` launches the Internet Properties configuration dialog. Technicians use this applet to configure LAN proxy servers, manage browser security zones (Internet, Local Intranet, Trusted Sites, Restricted Sites), manage saved certificates, and enable/disable TLS 1.2/1.3 protocol versions. `ncpa.cpl` is Network Connections, `sysdm.cpl` is System Properties, and `appwiz.cpl` is Programs and Features.",
        "distractor_analysis": {
            "1": "`ncpa.cpl` manages network interface card adapter settings and IPv4/IPv6 addresses.",
            "2": "`sysdm.cpl` manages computer name, domain join, and system properties.",
            "3": "`appwiz.cpl` manages desktop application installations and uninstalls."
        }
    },
    {
        "id": "C2-066",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "ipconfig", "dns", "flushdns"],
        "question": "A technician updates a company's internal DNS record, but a client workstation continues attempting to connect to the obsolete IP address. Which command purges the local Windows DNS client resolver cache?",
        "options": ["`ipconfig /flushdns`", "`ipconfig /release`", "`ipconfig /renew`", "`ipconfig /registerdns`"],
        "answer": 0,
        "explanation": "The `ipconfig /flushdns` command immediately clears and purges the local DNS client resolver cache in Windows. This forces the operating system to send fresh DNS queries to the configured DNS server rather than relying on stale cached name-to-IP mappings. `/release` drops the DHCP lease, `/renew` requests a new DHCP lease, and `/registerdns` refreshes DNS registrations for the local host.",
        "distractor_analysis": {
            "1": "`ipconfig /release` releases the current DHCP IP address lease from the network interface.",
            "2": "`ipconfig /renew` requests a renewed DHCP lease from the local DHCP server.",
            "3": "`ipconfig /registerdns` initiates manual dynamic registration for the DNS names and IP addresses configured on the computer."
        }
    },
    {
        "id": "C2-067",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "ping", "icmp", "connectivity"],
        "question": "Which command-line diagnostic tool sends ICMP Echo Request packets to a remote host to test basic network connectivity and measure round-trip latency?",
        "options": ["`ping`", "`tracert`", "`nslookup`", "`netstat`"],
        "answer": 0,
        "explanation": "`ping` sends ICMP Echo Request messages to an IP address or hostname and listens for ICMP Echo Reply packets, testing layer 3 connectivity and measuring packet loss and round-trip delay time in milliseconds. `tracert` maps the hop-by-hop path, `nslookup` queries DNS servers, and `netstat` displays active network socket connections.",
        "distractor_analysis": {
            "1": "`tracert` traces the route that packets take across intermediary routers to reach a destination host.",
            "2": "`nslookup` queries DNS name servers to resolve domain names to IP addresses.",
            "3": "`netstat` displays active TCP connections, listening ports, and protocol statistics."
        }
    },
    {
        "id": "C2-068",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "tracert", "routing", "hops"],
        "question": "A technician needs to identify which specific router along a wide area network (WAN) path is dropping packets and causing connection failures. Which diagnostic utility displays the route and transit delay of each hop across the network?",
        "options": ["`tracert`", "`ping`", "`ipconfig`", "`netstat`"],
        "answer": 0,
        "explanation": "`tracert` (Trace Route) uses ICMP Echo Requests with incrementally increasing Time-to-Live (TTL) values to map the path taken by packets across all intermediate routers (hops) to a destination, displaying each router's IP address and latency. `ping` only tests end-to-end reachability, `ipconfig` displays local network adapter settings, and `netstat` shows active sockets.",
        "distractor_analysis": {
            "1": "`ping` verifies basic connectivity to a destination but cannot identify which intermediate router hop along the path is failing.",
            "2": "`ipconfig` shows local IP address, subnet mask, default gateway, and DNS configuration on the local machine.",
            "3": "`netstat` lists active inbound and outbound network connections and listening ports on the local host."
        }
    },
    {
        "id": "C2-069",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "nslookup", "dns", "records"],
        "question": "Which command-line utility is used by systems administrators to query Domain Name System (DNS) servers to resolve hostnames, verify MX records, and troubleshoot DNS delegation?",
        "options": ["`nslookup`", "`ipconfig`", "`ping`", "`netstat`"],
        "answer": 0,
        "explanation": "`nslookup` (Name Server Lookup) queries DNS servers directly to inspect DNS records (A, AAAA, MX, CNAME, PTR, TXT) and verify that the nameserver is resolving names accurately. `ipconfig` manages local IP leases, `ping` tests ICMP reachability, and `netstat` monitors local network sockets.",
        "distractor_analysis": {
            "1": "`ipconfig` displays local network interface configuration and manages DHCP leases.",
            "2": "`ping` sends ICMP Echo requests to test layer 3 reachability.",
            "3": "`netstat` displays active TCP/UDP ports, connection states, and Ethernet interface statistics."
        }
    },
    {
        "id": "C2-070",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "netstat", "listening-ports", "sockets"],
        "question": "A security analyst needs to list all active TCP connections, listening ports, and the numerical IP addresses and port numbers on a Windows server. Which command should be executed?",
        "options": ["`netstat -an`", "`ipconfig /all`", "`tracert -d`", "`route print`"],
        "answer": 0,
        "explanation": "The `netstat -an` command displays all active network connections and listening ports (`-a`) in numerical format without attempting to resolve hostnames or well-known port names (`-n`), providing a clear snapshot of open network sockets. `ipconfig /all` shows full adapter settings, `tracert -d` traces hops without DNS resolution, and `route print` displays the local routing table.",
        "distractor_analysis": {
            "1": "`ipconfig /all` lists detailed local network adapter parameters (MAC address, DHCP server, lease dates) but not active socket connections.",
            "2": "`tracert -d` traces router hops to a remote destination without resolving router IP addresses to names.",
            "3": "`route print` displays the local IP routing table and active route entries."
        }
    },
    {
        "id": "C2-071",
        "objective": "2.7",
        "difficulty": "medium",
        "tags": ["security-best-practices", "mfa", "something-you-have", "authentication"],
        "question": "In a multifactor authentication (MFA) scheme, which item belongs strictly to the 'Something You Have' (possession) category?",
        "options": ["A hardware smart card (PIV card) or hardware OTP token", "A complex 16-character alphanumeric password", "A biometric retina scan", "The user's physical geographic GPS location"],
        "answer": 0,
        "explanation": "In authentication factor classification: 'Something you have' represents physical possession items (smart cards, hardware tokens, smartphone authenticator app keys, USB FIDO security keys). Passwords and PINs are 'Something you know', retina scans and fingerprints are 'Something you are', and GPS coordinates represent 'Somewhere you are'.",
        "distractor_analysis": {
            "1": "Passwords and PINs belong to the 'Something you know' (knowledge) factor.",
            "2": "Retina scans, facial recognition, and fingerprints belong to the 'Something you are' (biometric) factor.",
            "3": "GPS coordinates and IP subnet geolocation belong to the 'Somewhere you are' (location) factor."
        }
    },
    {
        "id": "C2-072",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["authentication", "biometrics", "something-you-are", "security"],
        "question": "Which authentication factor category encompasses physiological and behavioral characteristics such as fingerprints, facial geometry, and iris scans?",
        "options": ["Something you are", "Something you know", "Something you have", "Somewhere you are"],
        "answer": 0,
        "explanation": "'Something you are' refers to biometric authentication factors based on unique human biological or behavioral traits, including fingerprints, facial recognition, iris/retina patterns, voiceprints, and keystroke dynamics. 'Something you know' is knowledge (passwords), 'Something you have' is possession (smart cards), and 'Somewhere you are' is location.",
        "distractor_analysis": {
            "1": "'Something you know' involves memorized knowledge such as passwords, passphrases, and security PINs.",
            "2": "'Something you have' involves physical possession of smart cards, tokens, or security keys.",
            "3": "'Somewhere you are' involves physical geographic or network location verification."
        }
    },
    {
        "id": "C2-073",
        "objective": "2.7",
        "difficulty": "medium",
        "tags": ["security-best-practices", "authentication", "something-you-know", "pin"],
        "question": "Which authentication credential represents a 'Something You Know' factor in access control security?",
        "options": ["A memorized PIN code or password", "A hardware USB security key", "A fingerprint scan", "A smart badge with RFID chip"],
        "answer": 0,
        "explanation": "'Something you know' consists of information that the user memorizes and enters during authentication, such as passwords, passphrases, PINs, and answers to secret security questions. Hardware keys and RFID badges are 'Something you have', and fingerprints are 'Something you are'.",
        "distractor_analysis": {
            "1": "A hardware USB security key is a physical possession factor ('Something you have').",
            "2": "A fingerprint scan is a biometric factor ('Something you are').",
            "3": "An RFID smart badge is a physical possession factor ('Something you have')."
        }
    },
    {
        "id": "C2-074",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "vishing", "voice-phishing", "attacks"],
        "question": "A scammer calls an employee pretending to be a bank fraud investigator and attempts to trick the employee into reading a one-time verification code over the telephone. What specific social engineering attack is taking place?",
        "options": ["Vishing (Voice phishing)", "Smishing", "Shoulder surfing", "Dumpster diving"],
        "answer": 0,
        "explanation": "Vishing (Voice phishing) is the fraudulent practice of conducting social engineering attacks over voice telephone calls or VoIP systems to deceive victims into revealing sensitive financial data, passwords, or MFA codes. Smishing uses SMS text messages, shoulder surfing is visual eavesdropping, and dumpster diving searches physical trash.",
        "distractor_analysis": {
            "1": "Smishing is social engineering conducted via cellular SMS text messaging.",
            "2": "Shoulder surfing involves looking at a user's screen or keyboard to steal passwords.",
            "3": "Dumpster diving searches waste bins for discarded documents or hardware."
        }
    },
    {
        "id": "C2-075",
        "objective": "2.5",
        "difficulty": "easy",
        "tags": ["social-engineering", "smishing", "sms-phishing", "mobile-threats"],
        "question": "An employee receives a mobile text message claiming a package delivery failed and providing a link to 'reschedule delivery' that prompts for personal credit card information. What attack type is this?",
        "options": ["Smishing (SMS phishing)", "Vishing", "Tailgating", "Watering hole attack"],
        "answer": 0,
        "explanation": "Smishing (SMS phishing) is social engineering delivered through mobile SMS/MMS text messages containing deceptive links designed to harvest credentials or steal credit card data. Vishing takes place over voice telephone calls, tailgating is physical door following, and watering hole attacks compromise legitimate industry websites.",
        "distractor_analysis": {
            "1": "Vishing involves voice phone calls rather than text messages.",
            "2": "Tailgating is an unauthorized physical entry tactic through building doors.",
            "3": "A watering hole attack compromises industry websites frequented by targeted organizations."
        }
    }
]
