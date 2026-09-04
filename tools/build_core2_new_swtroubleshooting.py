import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import c2_utils

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARDS_DIR = os.path.join(ROOT, "_bank", "shards")
os.makedirs(SHARDS_DIR, exist_ok=True)

questions_data = [
    # 3.1 Troubleshooting Windows (14 questions: C2N-W-001..014)
    {
        "id": "C2N-W-001",
        "objective": "3.1",
        "difficulty": "hard",
        "tags": ["windows-troubleshooting", "bsod", "driver", "minidump"],
        "question": "A workstation encounters repeated Blue Screen of Death (BSOD) stop errors shortly after a graphics driver update. Which tool or log should the technician examine first to identify the exact failing driver binary?",
        "options": [
            "Inspect the Windows memory dump file (%SystemRoot%\\MEMORY.DMP or Minidump) using WinDbg or BlueScreenView to identify the faulting driver module",
            "Run Disk Cleanup to remove temporary setup files",
            "Open Device Manager and disable the network adapter",
            "Rebuild the Boot Configuration Data (BCD) using `bootrec /rebuildbcd`"
        ],
        "answer": 0,
        "explanation": "When Windows encounters a kernel panic (BSOD/bugcheck), it creates a crash dump file in the minidump folder or %SystemRoot%\\MEMORY.DMP. Analyzing this dump with debugging tools such as WinDbg or BlueScreenView pinpoints the precise driver file (e.g., nvlddmkm.sys) and memory address that caused the crash. Disk Cleanup removes temporary files but does not diagnose kernel panics, disabling network cards does not diagnose graphics driver faults, and BCD rebuilds are for boot-loader discovery issues.",
        "distractor_analysis": {
            "1": "Disk Cleanup frees storage space by removing cached installer files but provides zero forensic insight into kernel stop codes or crash dump stacks.",
            "2": "Disabling the network adapter is unrelated to graphics subsystem kernel crashes and removes network connectivity unnecessarily.",
            "3": "The `bootrec /rebuildbcd` command repairs boot manager entries when Windows fails to locate OS installations, not post-boot kernel driver crashes."
        }
    },
    {
        "id": "C2N-W-002",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "sfc", "dism", "system-integrity"],
        "question": "A Windows 11 machine displays corrupt icon resources and crashes when opening system dialogs. The technician runs `sfc /scannow`, but it reports: 'Windows Resource Protection found corrupt files but was unable to fix some of them.' Which command should the technician execute next?",
        "options": [
            "`DISM /Online /Cleanup-Image /RestoreHealth`",
            "`chkdsk /f /r`",
            "`gpupdate /force`",
            "`ipconfig /release`"
        ],
        "answer": 0,
        "explanation": "When the System File Checker (`sfc /scannow`) cannot repair corrupt system binaries because its local component store cache (WinSxS) is also corrupted, running the Deployment Image Servicing and Management tool (`DISM /Online /Cleanup-Image /RestoreHealth`) repairs the Windows component store by downloading pristine replacement files from Windows Update. `chkdsk` repairs NTFS filesystem metadata and disk sectors, `gpupdate` refreshes Group Policy, and `ipconfig` manages DHCP leases.",
        "distractor_analysis": {
            "1": "`chkdsk` checks physical drive sectors and filesystem structures but cannot download or restore damaged Windows component store binaries.",
            "2": "`gpupdate /force` pulls updated Group Policy objects from Active Directory and has no role in repairing corrupted operating system DLLs.",
            "3": "`ipconfig /release` drops the active IPv4/IPv6 lease, which interrupts network connectivity without fixing OS file integrity."
        }
    },
    {
        "id": "C2N-W-003",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "bootmgr", "bcd", "startup-repair"],
        "question": "Upon powering on a desktop, the screen displays: 'BOOTMGR is missing. Press Ctrl+Alt+Del to restart.' What is the MOST effective method to repair the boot sequence?",
        "options": [
            "Boot into Windows Recovery Environment (WinRE) and run Startup Repair or execute `bootrec /fixboot` and `bootrec /rebuildbcd`",
            "Flash the motherboard UEFI to the latest firmware revision",
            "Replace the power supply unit (PSU)",
            "Run Disk Defragmenter in Safe Mode"
        ],
        "answer": 0,
        "explanation": "The 'BOOTMGR is missing' error indicates that the BIOS/UEFI cannot find the Windows Boot Manager file or the Boot Configuration Data (BCD) pointer is corrupted. Booting into WinRE and executing automated Startup Repair or using the Command Prompt with `bootrec /fixmbr`, `bootrec /fixboot`, and `bootrec /rebuildbcd` repairs the master boot record and rebuilds the BCD store. Motherboard flashing, PSU replacement, and disk defragmentation do not repair boot sector files.",
        "distractor_analysis": {
            "1": "Flashing the UEFI firmware updates motherboard low-level code but does not recreate missing OS bootloader binaries on the storage volume.",
            "2": "The power supply is successfully delivering power to POST and display the error message; hardware power is not the root cause.",
            "3": "Disk Defragmenter reorganizes file clusters on spinning disks and cannot run when the operating system fails to boot."
        }
    },
    {
        "id": "C2N-W-004",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "driver-rollback", "device-manager", "video"],
        "question": "Immediately following an automatic driver update for a network interface card (NIC), a workstation loses all network connectivity. What is the fastest and least disruptive method to restore connectivity?",
        "options": [
            "Open Device Manager, view the NIC properties, and select 'Roll Back Driver'",
            "Format the C: drive and reinstall Windows from scratch",
            "Replace the motherboard network interface hardware",
            "Delete the `System32` directory from Command Prompt"
        ],
        "answer": 0,
        "explanation": "Device Manager includes a dedicated 'Roll Back Driver' button on the Driver tab of any hardware device's properties dialog. This feature immediately restores the previously working driver package and registry settings without requiring a full system restore or OS reinstall. Reinstalling Windows is unnecessarily disruptive, hardware replacement is premature, and deleting system directories causes complete system destruction.",
        "distractor_analysis": {
            "1": "Reinstalling the entire operating system causes severe downtime and data loss when a simple 10-second driver rollback solves the issue.",
            "2": "Replacing hardware is unwarranted when the fault was directly triggered by a software driver installation.",
            "3": "Deleting `System32` destroys core operating system executables and permanently bricks the Windows installation."
        }
    },
    {
        "id": "C2N-W-005",
        "objective": "3.1",
        "difficulty": "hard",
        "tags": ["windows-troubleshooting", "profile-corruption", "registry", "user-profile"],
        "question": "A user logs into Windows and receives the message: 'You have been logged on with a temporary profile.' Any files saved to the desktop disappear after rebooting. How should the technician permanently fix this corrupted profile?",
        "options": [
            "Back up user data, delete the corrupted profile registry key in `HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList` with the .bak extension, and recreate the profile folder",
            "Increase the virtual memory paging file size on the C: drive",
            "Run `netstat -ano` to find conflicting network sockets",
            "Disable User Account Control in Control Panel"
        ],
        "answer": 0,
        "explanation": "When Windows cannot load a user's `NTUSER.DAT` registry hive, it loads a temporary profile and renames the user's ProfileList SID key in `HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList` with a `.bak` extension. To resolve it permanently, the technician backs up data from the old user directory, removes the corrupted `.bak` registry reference, and allows Windows to regenerate a clean profile upon the next logon. Paging files, netstat, and UAC have no impact on profile registry locks.",
        "distractor_analysis": {
            "1": "Virtual memory paging manages RAM overflow to disk and cannot repair a locked or corrupted user registry hive (`NTUSER.DAT`).",
            "2": "`netstat -ano` displays active TCP/UDP connections and PID bindings, providing zero utility for user profile hive corruption.",
            "3": "Disabling UAC changes administrative elevation prompts but does not repair corrupted user profile paths in the registry."
        }
    },
    {
        "id": "C2N-W-006",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "slow-boot", "task-manager", "startup-apps"],
        "question": "A user complains that their Windows 11 laptop takes over five minutes to reach a usable desktop after entering their password. Which tool should the technician use to identify and disable high-impact startup applications?",
        "options": [
            "Task Manager under the Startup apps tab",
            "Windows Memory Diagnostic",
            "Disk Management",
            "Disk Cleanup"
        ],
        "answer": 0,
        "explanation": "The 'Startup apps' tab in Windows Task Manager (or Settings -> Apps -> Startup) displays all applications configured to launch during user login, along with their measured 'Startup impact' (High, Medium, Low, or None). Disabling non-essential high-impact startup applications directly reduces boot and login times. Windows Memory Diagnostic tests physical RAM cells, Disk Management manages partitions, and Disk Cleanup removes temporary files.",
        "distractor_analysis": {
            "1": "Windows Memory Diagnostic executes offline memory pattern tests to detect faulty physical RAM chips, not slow application startups.",
            "2": "Disk Management is used for partitioning, drive letter assignment, and volume resizing, having no visibility into startup apps.",
            "3": "Disk Cleanup deletes cache and log files but does not manage the list of applications configured to execute upon user login."
        }
    },
    {
        "id": "C2N-W-007",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "services", "services-msc", "service-startup"],
        "question": "A critical line-of-business accounting database service fails to start automatically upon Windows boot, preventing users from connecting. In `services.msc`, the service startup type is set to 'Automatic'. What configuration change ensures the service starts even if dependent network services take longer to initialize?",
        "options": [
            "Change the startup type to 'Automatic (Delayed Start)' and configure recovery restart actions on the Recovery tab",
            "Set the service startup type to 'Disabled'",
            "Change the service logon account to 'Guest'",
            "Delete the service executable using Command Prompt"
        ],
        "answer": 0,
        "explanation": "Setting the startup type to 'Automatic (Delayed Start)' instructs the Windows Service Control Manager to launch the service shortly after the main boot cycle completes, giving prerequisite network and database infrastructure time to fully initialize. Additionally, configuring the 'Recovery' tab enables Windows to automatically restart the service upon first and second failures. Setting it to Disabled stops it permanently, Guest accounts lack necessary service permissions, and deleting the binary destroys the service.",
        "distractor_analysis": {
            "1": "Setting the service to Disabled prevents it from starting under any circumstances, exacerbating the outage.",
            "2": "The built-in Guest account lacks the necessary 'Log on as a service' rights and system privileges required to run database services.",
            "3": "Deleting the executable binary permanently breaks the application and requires a full software reinstall."
        }
    },
    {
        "id": "C2N-W-008",
        "objective": "3.1",
        "difficulty": "hard",
        "tags": ["windows-troubleshooting", "dll-missing", "regsvr32", "application-crash"],
        "question": "A custom financial reporting tool crashes on startup with the error: 'Component custom_math.dll failed to load or is not registered.' The DLL file exists in the application directory. Which command-line utility registers the DLL with the Windows subsystem?",
        "options": [
            "`regsvr32 custom_math.dll`",
            "`sfc /scannow custom_math.dll`",
            "`bcdedit /set custom_math.dll`",
            "`chkdsk /f custom_math.dll`"
        ],
        "answer": 0,
        "explanation": "The Microsoft Register Server tool (`regsvr32.exe`) is used to register and unregister COM DLLs and ActiveX controls in the Windows Registry (under HKEY_CLASSES_ROOT). Running `regsvr32 custom_math.dll` from an elevated prompt writes the required class IDs and interfaces. `sfc` scans protected Windows system files, `bcdedit` edits the boot database, and `chkdsk` verifies disk sectors.",
        "distractor_analysis": {
            "1": "`sfc /scannow` checks only core protected Microsoft Windows binaries against system manifest hashes; it does not register third-party COM DLLs.",
            "2": "`bcdedit` manages Windows Boot Configuration Data store parameters and has no functionality related to DLL registration.",
            "3": "`chkdsk` accepts drive letters (e.g., C:) to check disk volume structures, not individual DLL registration parameters."
        }
    },
    {
        "id": "C2N-W-009",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "safe-mode", "msconfig", "clean-boot"],
        "question": "A technician needs to isolate whether an application crash is caused by third-party startup software and background services versus the core operating system. Which utility is used to perform a 'clean boot' by selectively disabling non-Microsoft startup services?",
        "options": [
            "System Configuration (`msconfig`)",
            "Registry Editor (`regedit`)",
            "Disk Defragmenter (`dfrgui`)",
            "Driver Verifier (`verifier`)"
        ],
        "answer": 0,
        "explanation": "System Configuration (`msconfig`) allows technicians to perform a clean boot by going to the 'Services' tab, checking 'Hide all Microsoft services', and clicking 'Disable all', combined with disabling startup items in Task Manager. This starts Windows with only core Microsoft services, isolating third-party software conflicts. Registry Editor edits raw hive keys, Disk Defragmenter reorganizes clusters, and Driver Verifier stresses kernel drivers.",
        "distractor_analysis": {
            "1": "Registry Editor modifies low-level configuration hives directly but lacks the automated clean-boot toggle workflow provided by `msconfig`.",
            "2": "Disk Defragmenter optimizes hard drive storage layout and has no capability to manage service startup states.",
            "3": "Driver Verifier is a developer tool that subjects kernel-mode drivers to extreme stress tests to catch memory leaks, rather than performing clean boots."
        }
    },
    {
        "id": "C2N-W-010",
        "objective": "3.1",
        "difficulty": "hard",
        "tags": ["windows-troubleshooting", "event-viewer", "system-log", "application-hang"],
        "question": "A business-critical accounting program hangs randomly once per day without displaying an error dialog. Where in Event Viewer should the technician look to find the crash logs and faulting module details?",
        "options": [
            "Windows Logs -> Application (filtering for Event ID 1000 Error or Event ID 1002 Hang)",
            "Windows Logs -> Security (filtering for Event ID 4624)",
            "Applications and Services Logs -> Microsoft -> Windows -> Windows Defender -> Operational",
            "Windows Logs -> Setup"
        ],
        "answer": 0,
        "explanation": "In Windows Event Viewer, the `Application` log records application-level failures. Event ID 1000 indicates an Application Error (listing the faulting application name, version, faulting module, and exception code), and Event ID 1002 indicates an Application Hang. The Security log records audit events like successful logons (4624), the Defender log tracks antivirus malware detections, and the Setup log records OS upgrade and patch milestones.",
        "distractor_analysis": {
            "1": "The Security log tracks user authentication, privilege use, and object access (e.g., Event ID 4624 for successful logon), not software crashes.",
            "2": "The Windows Defender Operational log records malware scans, threat remediations, and signature updates.",
            "3": "The Setup log records operating system installation events, servicing stack updates, and feature updates."
        }
    },
    {
        "id": "C2N-W-011",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "black-screen", "graphics-driver", "keyboard-shortcut"],
        "question": "A user logs into Windows and the display turns completely black, showing only a working mouse cursor. Which key combination can the technician press to immediately restart the graphics driver subsystem in Windows 10/11?",
        "options": [
            "Win + Ctrl + Shift + B",
            "Ctrl + Alt + Del followed by Escape",
            "Alt + F4",
            "Win + Pause/Break"
        ],
        "answer": 0,
        "explanation": "In Windows 10 and 11, pressing `Win + Ctrl + Shift + B` triggers an instant beep and flashes the screen, signaling the OS to discard the graphics surface buffer and restart the video graphics display driver. This often resolves black screen issues caused by a hung graphics driver without rebooting the system. `Ctrl + Alt + Del` opens the security screen, `Alt + F4` closes the active window, and `Win + Pause/Break` opens the System About dialog.",
        "distractor_analysis": {
            "1": "`Ctrl + Alt + Del` interrupts processing to display the Windows Security screen (Lock, Switch User, Task Manager), but does not restart the display driver subsystem.",
            "2": "`Alt + F4` sends a close command to the active foreground application window.",
            "3": "`Win + Pause/Break` opens the Windows Settings About page showing system processor and RAM specifications."
        }
    },
    {
        "id": "C2N-W-012",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "chkdsk", "ntfs", "bad-sectors"],
        "question": "A workstation frequently freezes and reports read errors when opening large spreadsheet files on the D: drive. Which command should the technician run to scan the volume for file system metadata errors and recover readable data from bad sectors?",
        "options": [
            "`chkdsk D: /f /r`",
            "`sfc /scanfile=D:\\`",
            "`format D: /fs:NTFS`",
            "`robocopy D:\\ C:\\ /mir`"
        ],
        "answer": 0,
        "explanation": "The Check Disk command (`chkdsk D: /f /r`) scans the specified volume (D:). The `/f` switch fixes file system directory errors on disk, while the `/r` switch locates bad physical sectors and recovers readable information (which also implies `/f`). `sfc` only scans Windows OS system files on the boot drive, `format` wipes all data on the volume, and `robocopy /mir` mirrors directories without diagnosing disk health.",
        "distractor_analysis": {
            "1": "`sfc` is designed specifically to verify operating system core binaries and does not check general secondary data volumes for NTFS sector corruption.",
            "2": "Formatting the drive destroys all existing data on the volume without attempting to repair or recover current files.",
            "3": "`robocopy` is a file replication tool that will fail or hang when encountering the unreadable bad sectors."
        }
    },
    {
        "id": "C2N-W-013",
        "objective": "3.1",
        "difficulty": "hard",
        "tags": ["windows-troubleshooting", "system-restore", "rstrui", "winre"],
        "question": "Following the installation of an incompatible system utility, Windows fails to reach the login screen and continuously loops into the Automatic Repair screen. How can the technician revert Windows to its state prior to the utility installation without losing the user's personal documents?",
        "options": [
            "Access Advanced Options in WinRE, select 'System Restore' (`rstrui.exe`), and choose the restore point created before the installation",
            "Select 'Reset this PC' with the 'Remove everything' option",
            "Use Command Prompt in WinRE to run `format C:`",
            "Boot into BIOS and disable the TPM 2.0 security chip"
        ],
        "answer": 0,
        "explanation": "Windows System Restore (accessible from WinRE under Troubleshoot -> Advanced Options -> System Restore, or `rstrui.exe`) reverts system files, registry keys, and installed drivers to a previously created snapshot (restore point) without altering, deleting, or overwriting user personal files (such as documents, photos, or emails). 'Reset this PC - Remove everything' and `format C:` destroy all data, and disabling TPM prevents secure booting entirely.",
        "distractor_analysis": {
            "1": "Resetting the PC with 'Remove everything' wipes all user data, applications, and settings completely.",
            "2": "Formatting the C: drive erases all partitions and files, requiring a complete fresh reinstall.",
            "3": "Disabling TPM will trigger BitLocker recovery prompts and prevents Windows 11 from booting properly."
        }
    },
    {
        "id": "C2N-W-014",
        "objective": "3.1",
        "difficulty": "medium",
        "tags": ["windows-troubleshooting", "memory-diagnostic", "ram", "hardware-fault"],
        "question": "A desktop computer experiences random application crashes and intermittent Blue Screen errors with stop codes `MEMORY_MANAGEMENT` and `PAGE_FAULT_IN_NONPAGED_AREA`. Which built-in Windows utility should be scheduled to test the physical RAM modules?",
        "options": [
            "Windows Memory Diagnostic (`mdsched.exe`)",
            "Resource Monitor (`resmon.exe`)",
            "Performance Monitor (`perfmon.exe`)",
            "System Information (`msinfo32.exe`)"
        ],
        "answer": 0,
        "explanation": "Windows Memory Diagnostic (`mdsched.exe`) prompts the user to restart the computer immediately or on the next boot, loading a specialized pre-boot diagnostic environment that writes test patterns to RAM cells to detect hardware memory defects. Resource Monitor and Performance Monitor track live runtime resource metrics, and System Information (`msinfo32`) reports hardware and software inventory without testing physical silicon integrity.",
        "distractor_analysis": {
            "1": "Resource Monitor provides real-time graphs and PID breakdown of memory usage but cannot test physical RAM silicon for defective memory cells.",
            "2": "Performance Monitor logs historical performance counters and OS telemetry over time rather than executing low-level hardware memory tests.",
            "3": "System Information (`msinfo32`) displays hardware summaries, BIOS versions, and environment variables without performing diagnostics."
        }
    },

    # 3.2 Troubleshooting mobile devices (10 questions: C2N-W-015..024)
    {
        "id": "C2N-W-015",
        "objective": "3.2",
        "difficulty": "hard",
        "tags": ["mobile-troubleshooting", "swollen-battery", "safety", "hardware"],
        "question": "A user brings a corporate smartphone to the help desk, noting that the screen is bulging outwards and separating from the aluminum chassis. The phone feels warm even when powered off. What is the MANDATORY safety action the technician must take?",
        "options": [
            "Immediately power down the device, do not charge it, and place it in an airtight fireproof / sand-filled battery safety container",
            "Press firmly on the glass display to snap the bezel back into the chassis",
            "Connect the smartphone to a fast charger to test the power management IC",
            "Pierce the battery pouch with a fine probe to release the trapped gas"
        ],
        "answer": 0,
        "explanation": "A bulging screen or separated chassis indicates a swollen lithium-ion battery caused by internal shorting, thermal runaway, or gas accumulation. Swollen batteries pose a severe fire and explosion risk. The mandatory safety protocol is to immediately disconnect all power, turn off the device, handle it with care, and store it in a dedicated fireproof battery container or sand bucket away from flammable materials until safe disposal. Never puncture, charge, or apply pressure to a swollen battery.",
        "distractor_analysis": {
            "1": "Applying physical pressure to a swollen lithium-ion battery can puncture the separator membrane, triggering an explosive chemical fire.",
            "2": "Charging a compromised lithium battery introduces additional current and heat, likely causing catastrophic thermal runaway.",
            "3": "Puncturing a lithium battery pouch causes immediate air exposure, resulting in violent chemical combustion and toxic gas release."
        }
    },
    {
        "id": "C2N-W-016",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "battery-drain", "background-apps", "power"],
        "question": "A smartphone battery depletes from 100% to 15% in less than three hours while sitting idle in a pocket. Which diagnostic step should the technician perform first on the device?",
        "options": [
            "Check Settings -> Battery to identify rogue background apps consuming disproportionate battery percentage and inspect Battery Health",
            "Replace the smartphone motherboard",
            "Perform a factory reset immediately without backing up data",
            "Turn on the mobile hotspot and maximum screen brightness"
        ],
        "answer": 0,
        "explanation": "The built-in Battery utility in iOS and Android provides detailed telemetry showing which specific applications consume battery power in the background, along with overall Battery Health (maximum capacity percentage). A rogue app stuck in a background synchronization or location loop is the most common cause of sudden drain. Motherboard replacement and factory resets are extreme, and enabling hotspots and maximum brightness increases battery drain further.",
        "distractor_analysis": {
            "1": "Motherboard replacement is an expensive hardware repair that does not address software-driven background battery drain.",
            "2": "Factory resetting without prior backup or diagnosis causes permanent data loss for what is usually a single misbehaving application.",
            "3": "Enabling hotspot functionality and full brightness places maximum electrical load on the battery, compounding the problem."
        }
    },
    {
        "id": "C2N-W-017",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "touchscreen", "unresponsive-screen", "reboot"],
        "question": "A user's tablet screen is fully illuminated and displaying the home screen, but the touchscreen does not respond to any touch, tap, or swipe gestures. What is the FIRST troubleshooting step the technician should perform?",
        "options": [
            "Perform a forced hardware restart (hard reboot) using the device's physical button combination",
            "Replace the digitizer and LCD assembly",
            "Submerge the tablet in isopropyl alcohol",
            "Downgrade the cellular modem firmware"
        ],
        "answer": 0,
        "explanation": "An unresponsive touchscreen on a functioning display is frequently caused by a frozen OS input handler or temporary software glitch. Performing a forced hard restart (using the device-specific physical button combination, e.g., Volume Up + Power) forces the OS and hardware digitizer controller to reinitialize. If the issue persists after rebooting and removing screen protectors, hardware digitizer replacement may be considered. Submerging devices or modifying modem firmware is destructive or irrelevant.",
        "distractor_analysis": {
            "1": "Physical screen assembly replacement is time-consuming and unnecessary if a simple forced button reboot clears the software freeze.",
            "2": "Submerging electronic devices in liquid risks fluid ingress into internal cavities and speaker membranes.",
            "3": "Cellular modem firmware manages baseband radio towers and has zero role in touchscreen capacitive input handling."
        }
    },
    {
        "id": "C2N-W-018",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "overheating", "thermal-throttling", "performance"],
        "question": "A mobile device shuts down unexpectedly during video recording outdoors on a sunny day and displays a high-temperature warning icon upon attempting to power on. What is causing this behavior?",
        "options": [
            "Thermal protection safeguards shutting down the device to prevent permanent semiconductor and battery damage",
            "The cellular carrier network disconnecting the SIM card",
            "A corrupted display driver inside the operating system",
            "A malicious ransomware encryption process completing"
        ],
        "answer": 0,
        "explanation": "Mobile devices contain internal thermistors that monitor battery, CPU, and ambient temperatures. When operating in direct sunlight or under heavy compute loads (such as 4K video recording), the device triggers thermal throttling and eventually an automated thermal shutdown to protect the lithium-ion battery from fire and prevent silicon degradation. Moving the device to a cool, shaded environment allows it to recover once cooled. Carrier disconnects, display drivers, and ransomware do not cause physical temperature shutdowns.",
        "distractor_analysis": {
            "1": "Cellular SIM disconnects result in 'No Service' status indicators, not hardware thermal protection shutdowns.",
            "2": "Display driver crashes cause screen flickers or OS reboots, not high-temperature thermal warning screens.",
            "3": "Ransomware targets files for encryption; temperature cutoffs are hardware-driven thermal sensor protections."
        }
    },
    {
        "id": "C2N-W-019",
        "objective": "3.2",
        "difficulty": "easy",
        "tags": ["mobile-troubleshooting", "storage-full", "app-crash", "os-updates"],
        "question": "A smartphone user reports that mobile apps crash immediately upon launching, camera photos fail to save, and system updates cannot download. Storage settings reveal 0 MB of available internal storage. What should the technician advise the user to do first?",
        "options": [
            "Offload or delete unused large applications, delete cached media and temporary files, and back up photos to cloud storage",
            "Replace the device's internal flash memory chip",
            "Change the cellular data APN settings",
            "Disable the lock screen PIN"
        ],
        "answer": 0,
        "explanation": "When internal flash storage is completely exhausted (0 MB free), mobile operating systems cannot create temporary scratch files, write application state caches, or download update packages, leading to immediate app crashes and save errors. Freeing storage space by deleting unused large apps, clearing app caches, and offloading photos/videos to cloud storage immediately restores stability. Memory chips are soldered and cannot be replaced individually, APN settings manage cellular data, and PIN settings are unrelated.",
        "distractor_analysis": {
            "1": "Mobile flash storage is soldered directly onto the system board (eMMC/UFS) and is not a user-replaceable component.",
            "2": "APN (Access Point Name) settings configure cellular data routing with the mobile network operator and do not resolve storage exhaustion.",
            "3": "Disabling device lock security removes authentication protection without freeing storage bytes on the internal volume."
        }
    },
    {
        "id": "C2N-W-020",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "connectivity", "airplane-mode", "bluetooth", "wi-fi"],
        "question": "A user's smartphone fails to connect to both corporate Wi-Fi and Bluetooth headsets simultaneously, showing erratic connection drops. What is the quickest first-level troubleshooting step to reset all local wireless radio stacks?",
        "options": [
            "Toggle Airplane Mode ON for 15 seconds, then turn it back OFF (or perform a Network Settings Reset)",
            "Perform a factory wipe of the smartphone",
            "Replace the SIM card with a new eSIM profile",
            "Increase the display timeout to 30 minutes"
        ],
        "answer": 0,
        "explanation": "Toggling Airplane Mode ON powers down all internal wireless transceivers (Wi-Fi, Bluetooth, Cellular, NFC, GPS) and turning it back OFF reinitializes the hardware radio controllers and restarts connection handshakes. If toggling fails, performing a 'Reset Network Settings' clears corrupted Wi-Fi profiles and Bluetooth pairings. Factory wipes are overly disruptive for basic radio glitches, SIM swaps do not fix Wi-Fi/Bluetooth, and display timeout is unrelated.",
        "distractor_analysis": {
            "1": "A full factory wipe erases all personal data, apps, and accounts, which is disproportionate for a simple wireless radio glitch.",
            "2": "The SIM card provisions cellular voice and data connections and has no influence over local Wi-Fi or Bluetooth radios.",
            "3": "Display timeout governs screen sleep intervals and has zero impact on RF radio stack initialization."
        }
    },
    {
        "id": "C2N-W-021",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "charging", "lightning", "usb-c", "lint"],
        "question": "A mobile device only charges when the USB-C charging cable is held tightly at an upward angle. Trying multiple known-good cables produces the same loose, intermittent connection. What is the MOST likely cause?",
        "options": [
            "Lint and debris compacted inside the device charging port preventing the cable from seating completely",
            "A corrupted battery driver inside the mobile operating system",
            "The electrical wall outlet delivering incorrect AC frequency",
            "A malware infection on the mobile device"
        ],
        "answer": 0,
        "explanation": "Pocket lint and dust frequently accumulate and become compacted at the bottom of mobile charging ports (USB-C or Lightning). This physical barrier prevents charging cables from clicking fully into place, causing loose or angle-dependent connections. Carefully cleaning the port with a non-conductive wooden or plastic pick clears the obstruction. Battery drivers, AC wall frequencies, and malware do not cause mechanical cable loose-fit symptoms.",
        "distractor_analysis": {
            "1": "Battery software drivers cannot cause physical looseness or mechanical failure of the cable connector latch.",
            "2": "AC wall frequency does not affect the physical fit or retention clips of the USB-C connector inside the smartphone.",
            "3": "Malware is malicious software and cannot alter the mechanical tolerance of physical hardware ports."
        }
    },
    {
        "id": "C2N-W-022",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "app-crashes", "app-cache", "update"],
        "question": "A single banking application crashes immediately upon launch on an Android device, while all other applications function perfectly. Which sequence of troubleshooting steps should the technician perform for this specific app?",
        "options": [
            "Clear the app cache and data in Settings -> Apps, check for app updates in the app store, and reinstall the app if necessary",
            "Format the device and replace the internal battery",
            "Disable mobile data and connect only to public Wi-Fi",
            "Change the device language to English (UK)"
        ],
        "answer": 0,
        "explanation": "When an isolated application crashes, the issue is almost always a corrupted local application cache/data store or a version bug. The standard troubleshooting sequence is: 1. Force stop the app, 2. Clear app cache and data in Settings, 3. Check the Google Play Store / App Store for an updated version, and 4. Uninstall and cleanly reinstall the application. Formatting devices or replacing batteries is unwarranted, and changing system language does not fix application crashes.",
        "distractor_analysis": {
            "1": "Formatting the device and replacing the battery are extreme and irrelevant measures for a single application-level software fault.",
            "2": "Disabling cellular data does not resolve corrupt application cache or code incompatibility bugs.",
            "3": "Changing device localization language has no effect on app runtime exceptions or memory allocation faults."
        }
    },
    {
        "id": "C2N-W-023",
        "objective": "3.2",
        "difficulty": "hard",
        "tags": ["mobile-troubleshooting", "gps", "location-services", "cellular-triangulation"],
        "question": "A delivery driver reports that their mobile mapping application places their location several miles away from their actual physical position. What troubleshooting steps should be checked to resolve inaccurate location tracking?",
        "options": [
            "Ensure Location Services is set to 'High Accuracy' (using GPS, Wi-Fi, and Cellular), verify clear line-of-sight to the sky, and calibrate the compass",
            "Replace the SIM card in the delivery tablet",
            "Perform a factory reset on the mobile device",
            "Disable Wi-Fi scanning in the mobile OS"
        ],
        "answer": 0,
        "explanation": "Mobile location accuracy relies on assisted GPS (A-GPS), which combines satellite GPS signals, nearby Wi-Fi network BSSID scanning, and cellular tower triangulation. Setting Location to 'High Accuracy' / 'Precise Location', verifying that the vehicle's metallic roof or windshield tint is not blocking satellite line-of-sight, and calibrating the device compass resolves drift. SIM replacement does not improve GPS triangulation, and disabling Wi-Fi scanning degrades location precision.",
        "distractor_analysis": {
            "1": "SIM cards authenticate the subscriber on the cellular carrier network and do not provide GPS satellite radio signals.",
            "2": "Factory resets erase all user data without addressing physical RF signal attenuation or location accuracy settings.",
            "3": "Disabling Wi-Fi scanning actually decreases urban location accuracy because the OS relies on Wi-Fi BSSID beacons for fast positioning."
        }
    },
    {
        "id": "C2N-W-024",
        "objective": "3.2",
        "difficulty": "medium",
        "tags": ["mobile-troubleshooting", "sound", "speaker", "dnd", "mute-switch"],
        "question": "An iPhone user reports that the device vibrates for incoming calls and notifications, but no ringtone or audio plays through the internal speaker. Media in the Music app plays audio normally. What is the MOST likely cause?",
        "options": [
            "The physical Ring/Silent switch on the side of the iPhone is set to Silent (orange indicator showing) or Focus / Do Not Disturb is enabled",
            "The internal speaker hardware has physically failed",
            "The Lightning/USB-C port is defective",
            "The SIM card is locked with a PIN"
        ],
        "answer": 0,
        "explanation": "Because media audio plays normally through the speaker, the physical speaker hardware is completely functional. The separation between media audio and alert audio indicates that the physical Ring/Silent switch is set to Silent (showing the orange indicator) or software Focus / Do Not Disturb mode is silencing incoming calls and notification alerts. Physical speaker failure would affect all audio including music, port defects affect charging, and SIM locks block cellular connectivity entirely.",
        "distractor_analysis": {
            "1": "If the internal speaker had failed, music and media playback would also produce zero sound.",
            "2": "A defective charging port does not selectively suppress incoming ringtones while allowing music playback through speakers.",
            "3": "A SIM PIN lock prevents the device from connecting to the cellular network at boot, preventing incoming calls entirely."
        }
    },

    # 3.3 Troubleshooting mobile device security (7 questions: C2N-W-025..031)
    {
        "id": "C2N-W-025",
        "objective": "3.3",
        "difficulty": "hard",
        "tags": ["mobile-security-troubleshooting", "mdm-compliance", "jailbreak-detection", "byod"],
        "question": "An enterprise Mobile Device Management (MDM) console flags an executive's enrolled tablet as 'Non-Compliant' and automatically blocks access to Microsoft 365 email. The MDM agent reports an unauthorized superuser binary (`/system/xbin/su`). What has occurred?",
        "options": [
            "The tablet has been rooted or jailbroken, triggering the MDM compliance posture engine to revoke corporate data access",
            "The user forgot their device PIN code three times",
            "The tablet's battery is below 20%",
            "The corporate Wi-Fi access point experienced an outage"
        ],
        "answer": 0,
        "explanation": "MDM agents actively monitor enrolled devices for indicators of compromise, specifically rooting (on Android) or jailbreaking (on iOS), evidenced by the presence of binaries like `su` or Cydia/Magisk. Because rooting breaks OS kernel sandboxing and exposes corporate data to malware, the MDM compliance policy automatically marks the device non-compliant and revokes access to corporate email and resources. Forgotten PINs trigger device lockouts, and low battery or Wi-Fi outages do not generate `su` binary alerts.",
        "distractor_analysis": {
            "1": "Entering an incorrect PIN locks the device screen or triggers local delay timers, but does not install `su` superuser binaries.",
            "2": "Low battery triggers battery-saver mode, not unauthorized root binary detection alerts.",
            "3": "A Wi-Fi outage causes network disconnection, not MDM jailbreak/root compliance posture violations."
        }
    },
    {
        "id": "C2N-W-026",
        "objective": "3.3",
        "difficulty": "medium",
        "tags": ["mobile-security-troubleshooting", "data-usage", "spyware", "unauthorized-access"],
        "question": "A user notices their corporate smartphone incurs massive cellular data overage charges (50 GB in three days) while remaining idle on their desk. The battery is constantly hot. What security issue should the technician investigate?",
        "options": [
            "Malicious spyware or crypto-mining malware running in the background and exfiltrating data or computing hashes",
            "The user enabling Dark Mode in system settings",
            "A defective SIM card sending duplicate cellular pings",
            "The cellular carrier upgrading local cell towers to 5G"
        ],
        "answer": 0,
        "explanation": "Sudden extreme data consumption combined with constant thermal heat and battery drain on an idle mobile device is a classic symptom of malicious background activity, such as spyware exfiltrating audio/video/files to a command-and-control server or a covert crypto-miner utilizing the GPU/CPU. Dark mode actually saves battery on OLED displays, SIM cards do not transfer gigabytes of payload data on their own, and carrier 5G upgrades do not cause unauthorized client data transmission.",
        "distractor_analysis": {
            "1": "Dark Mode reduces display power consumption on OLED screens and has zero effect on network data usage.",
            "2": "A damaged SIM card produces cellular registration errors, not massive 50 GB background data transfers.",
            "3": "Carrier network upgrades change radio tower frequencies without generating unauthorized data transmissions from client devices."
        }
    },
    {
        "id": "C2N-W-027",
        "objective": "3.3",
        "difficulty": "hard",
        "tags": ["mobile-security-troubleshooting", "rogue-certificates", "mitm", "ssl-inspection"],
        "question": "While connected to public airport Wi-Fi, a user's mobile browser begins displaying invalid SSL/TLS certificate warnings for major banking and search websites. What mobile security threat is the user experiencing?",
        "options": [
            "An on-path (Man-in-the-Middle) attack via a rogue Wi-Fi access point (Evil Twin) intercepting and inspecting encrypted traffic",
            "The user's mobile device battery requires replacement",
            "The mobile device camera has a hardware defect",
            "The cellular carrier disabled SMS text messaging"
        ],
        "answer": 0,
        "explanation": "When connecting to untrusted public Wi-Fi, attackers can deploy an Evil Twin access point or ARP spoofing to intercept traffic. When the attacker attempts SSL stripping or decrypts HTTPS sessions with a fake proxy certificate, the user's browser detects that the certificate was not signed by a trusted root CA and triggers invalid certificate warnings. Battery health, camera hardware, and SMS carrier status have no relationship with TLS certificate validation on Wi-Fi.",
        "distractor_analysis": {
            "1": "Battery health issues cause unexpected shutdowns, not cryptographic SSL certificate validation failures in browsers.",
            "2": "Camera hardware issues affect photo capture and have zero role in network TLS certificate verification.",
            "3": "SMS carrier provisioning governs cellular text messaging and does not alter Wi-Fi HTTPS certificate chains."
        }
    },
    {
        "id": "C2N-W-028",
        "objective": "3.3",
        "difficulty": "medium",
        "tags": ["mobile-security-troubleshooting", "unauthorized-apps", "sideloading", "remediation"],
        "question": "A user discovers several unfamiliar game applications and utility toolbars installed on their corporate Android tablet that they never downloaded from the Google Play Store. What setting should the technician verify and disable to prevent this in the future?",
        "options": [
            "Disable 'Install unknown apps' / third-party sideloading permissions in Settings -> Security",
            "Enable Bluetooth Discoverable mode permanently",
            "Disable the screen lock passcode",
            "Enable developer USB debugging and leave it unattended"
        ],
        "answer": 0,
        "explanation": "Android security controls include the 'Install unknown apps' permission (or 'Unknown sources' in older versions). Disabling this permission prevents the device from installing `.apk` packages downloaded from web browsers, messaging apps, or unverified third-party repositories, restricting software installation strictly to vetted enterprise or official app stores. Enabling Bluetooth discoverability, removing passcodes, and enabling USB debugging all decrease device security.",
        "distractor_analysis": {
            "1": "Keeping Bluetooth in discoverable mode exposes the device to unauthorized pairing and Blueborne/Bluesnarfing attacks.",
            "2": "Disabling screen lock passcodes leaves the device completely vulnerable to unauthorized physical access.",
            "3": "Enabling USB debugging allows any connected computer to execute shell commands via Android Debug Bridge (ADB), creating a massive security risk."
        }
    },
    {
        "id": "C2N-W-029",
        "objective": "3.3",
        "difficulty": "medium",
        "tags": ["mobile-security-troubleshooting", "permissions", "privacy", "camera-microphone"],
        "question": "A user notices the green/orange privacy indicator dot at the top of their smartphone screen illuminates randomly when no applications are actively in use. What does this indicate, and how should it be investigated?",
        "options": [
            "An app is accessing the camera or microphone in the background; inspect Settings -> Privacy -> Permission Manager to revoke unauthorized access",
            "The screen backlight is failing and needs physical replacement",
            "The battery is fully charged to 100%",
            "The cellular radio is connecting to a 4G LTE tower"
        ],
        "answer": 0,
        "explanation": "Modern mobile operating systems (iOS and Android) display visual privacy indicators (an orange or green dot in the status bar) whenever an application accesses the device's microphone or camera. If this occurs while the user is idle, a background app is recording audio or video. The technician should immediately open Privacy / Permission Manager, review the access log, revoke microphone/camera permissions from suspicious apps, and uninstall unauthorized software. It is not a backlight failure, charging indicator, or cellular beacon.",
        "distractor_analysis": {
            "1": "Privacy indicator dots are software-driven OS security indicators, not hardware LCD backlight failures.",
            "2": "Battery charging state is indicated by the battery gauge icon, not the microphone/camera privacy indicator dot.",
            "3": "Cellular network generation is indicated by status text (e.g., 5G, LTE), not the privacy dot."
        }
    },
    {
        "id": "C2N-W-030",
        "objective": "3.3",
        "difficulty": "hard",
        "tags": ["mobile-security-troubleshooting", "sim-swapping", "account-takeover", "cellular"],
        "question": "A senior manager suddenly loses all cellular service on their smartphone, displaying 'No Service' or 'SOS only'. Minutes later, they receive email notifications that their bank password and cloud account recovery details were changed from an unknown location. What attack has occurred?",
        "options": [
            "SIM card swapping / port-out fraud by a social engineering threat actor targeting the carrier",
            "A standard local micro-SIM mechanical failure",
            "The smartphone's Wi-Fi antenna burning out",
            "The mobile carrier performing scheduled tower maintenance"
        ],
        "answer": 0,
        "explanation": "SIM swapping occurs when an attacker impersonates the victim to the cellular carrier (or bribes an insider) to transfer (port) the victim's phone number to a new SIM card under the attacker's control. Once transferred, the victim's phone immediately loses cellular connection ('No Service'), and the attacker receives all SMS-based 2FA codes and password reset tokens, enabling rapid account takeovers. Mechanical SIM failures and tower maintenance do not coincide with immediate targeted account takeovers.",
        "distractor_analysis": {
            "1": "A simple physical SIM failure disables cellular connectivity but would not result in simultaneous unauthorized password resets across external banking accounts.",
            "2": "A burnt-out Wi-Fi antenna affects Wi-Fi connections only and has no effect on cellular tower reception or SIM registration.",
            "3": "Carrier maintenance temporarily interrupts signal but does not trigger concurrent fraudulent account takeovers and credential resets."
        }
    },
    {
        "id": "C2N-W-031",
        "objective": "3.3",
        "difficulty": "medium",
        "tags": ["mobile-security-troubleshooting", "bluetooth-security", "bluesnarfing", "pairing"],
        "question": "An employee working in a public coffee shop receives multiple unsolicited Bluetooth pairing requests from unknown device names attempting to establish connections. What immediate actions should the employee take?",
        "options": [
            "Reject the pairing requests and turn off Bluetooth (or disable Bluetooth discoverability)",
            "Accept the pairing requests to inspect the remote device identity",
            "Factory reset the mobile device immediately",
            "Enter '0000' or '1234' on the keypad"
        ],
        "answer": 0,
        "explanation": "Receiving unsolicited Bluetooth pairing requests indicates a nearby attacker attempting Bluejacking (sending unsolicited messages) or Bluesnarfing (unauthorized access to contacts and data via Bluetooth). The user must immediately reject the requests and turn off Bluetooth or ensure the device is not set to discoverable mode. Accepting requests or entering default PINs gives the attacker an active paired connection into the device.",
        "distractor_analysis": {
            "1": "Accepting the pairing request establishes a trusted Bluetooth channel, allowing the attacker to access data or exploit protocol vulnerabilities.",
            "2": "Factory resetting the smartphone is an extreme overreaction when simply disabling Bluetooth stops the attempt immediately.",
            "3": "Entering default PINs completes pairing authentication with the attacker's unauthorized device."
        }
    },

    # 3.4 Troubleshooting security issues (7 questions: C2N-W-032..038)
    {
        "id": "C2N-W-032",
        "objective": "3.4",
        "difficulty": "medium",
        "tags": ["security-troubleshooting", "popups", "adware", "browser-redirects"],
        "question": "A user reports that whenever they open their web browser, dozens of pop-up windows appear claiming the PC is infected with 43 viruses and offering a toll-free number to purchase 'Tech Support Gold.' The default homepage has also been changed. What security issue is present?",
        "options": [
            "Rogue antivirus / Scareware and browser hijacking",
            "A hardware failure of the network interface card",
            "A legitimate Windows Defender security alert",
            "A standard Windows operating system update prompt"
        ],
        "answer": 0,
        "explanation": "Rogue antivirus (scareware) uses fake alert dialogs, artificial virus counts, and persistent pop-ups designed to frighten users into paying for fraudulent tech support or downloading malware payloads. This is frequently accompanied by browser hijacking (changing default homepages and search engines). Legitimate Windows Defender alerts appear in the Windows Notification Center and never ask users to call a phone number with payment information.",
        "distractor_analysis": {
            "1": "Network interface card hardware faults cause complete loss of network connectivity, not fake pop-up advertisement generation.",
            "2": "Microsoft Defender Antivirus integrates directly into the Windows Security Center and never displays third-party phone numbers or payment demands.",
            "3": "Windows Update prompts appear in Settings and system notifications, focusing exclusively on OS and security patch installations."
        }
    },
    {
        "id": "C2N-W-033",
        "objective": "3.4",
        "difficulty": "hard",
        "tags": ["security-troubleshooting", "compromised-account", "spam-email", "incident-response"],
        "question": "Several corporate clients notify the help desk that they received phishing emails containing invoice attachments sent directly from a company account executive's email address. The executive states they never sent these messages. What is the FIRST step the technician should take?",
        "options": [
            "Immediately disable or reset the executive's domain/cloud account password, terminate all active login sessions, and enable MFA",
            "Reformat the executive's desktop computer immediately",
            "Delete the executive's entire email mailbox from the mail server",
            "Reply to all recipient clients stating the emails were genuine"
        ],
        "answer": 0,
        "explanation": "When an email account is actively sending unauthorized spam/phishing messages, the account credentials have been compromised (often via credential harvesting or session token theft). The immediate containment step is resetting the user's password, revoking/terminating all active OAuth tokens and web sessions, and verifying/enforcing multifactor authentication (MFA). Reformatting the PC does not stop cloud-based webmail access, deleting the mailbox destroys business records, and validating phishing emails causes further compromise.",
        "distractor_analysis": {
            "1": "Reformatting the local PC does not revoke stolen cloud session tokens or change compromised domain passwords being used by attackers remotely.",
            "2": "Deleting the entire mailbox permanently erases vital company communications and forensic evidence required for the security investigation.",
            "3": "Confirming phishing emails as genuine misleads clients and accelerates financial fraud against the organization's partners."
        }
    },
    {
        "id": "C2N-W-034",
        "objective": "3.4",
        "difficulty": "medium",
        "tags": ["security-troubleshooting", "unauthorized-access", "audit-logs", "event-viewer"],
        "question": "An administrator suspects an unauthorized user is accessing a shared accounting workstation after hours. Which Windows log in Event Viewer should be audited to inspect successful and failed logon attempts, and which Event IDs are relevant?",
        "options": [
            "Security Log (Event ID 4624 for Successful Logon and Event ID 4625 for Failed Logon)",
            "Application Log (Event ID 1000 for Application Error)",
            "System Log (Event ID 6005 for Event Log service started)",
            "Setup Log (Event ID 1 for OS servicing update)"
        ],
        "answer": 0,
        "explanation": "The Windows `Security` event log records all security audit events. Event ID 4624 documents every successful logon (including logon type, username, workstation name, and source IP address), while Event ID 4625 documents failed logon attempts. The Application log tracks program errors, the System log tracks OS service and driver events, and the Setup log tracks Windows installation and update events.",
        "distractor_analysis": {
            "1": "The Application log records software crashes (Event ID 1000) and application-level exceptions, not user authentication events.",
            "2": "The System log records operating system kernel, hardware, and service milestones (such as Event ID 6005 for service startup).",
            "3": "The Setup log records operating system feature installation and upgrade packages, having no user logon audit telemetry."
        }
    },
    {
        "id": "C2N-W-035",
        "objective": "3.4",
        "difficulty": "hard",
        "tags": ["security-troubleshooting", "certificate-expired", "pki", "https-errors"],
        "question": "Users across an entire enterprise cannot access the internal HR intranet portal, receiving browser alerts that the website's security certificate is invalid because the 'Valid to' date has passed. What is the root cause and proper remediation?",
        "options": [
            "The web server's SSL/TLS digital certificate has expired; the server administrator must renew and bind a newly issued certificate from the CA",
            "The client computers' hard drives have run out of free space",
            "The network switch port is configured for half-duplex",
            "The user entered an incorrect domain password"
        ],
        "answer": 0,
        "explanation": "X.509 digital certificates have strict validity date ranges ('Valid from' and 'Valid to'). Once the expiration timestamp passes, browsers reject the certificate and warn users of a potential security breach. The resolution is for the web server administrator to generate a new Certificate Signing Request (CSR), obtain a renewed certificate from the Certificate Authority (CA), and bind it to the HTTPS service on the web server. Disk space, switch duplex, and user passwords do not cause certificate expiration.",
        "distractor_analysis": {
            "1": "Client hard drive storage capacity has zero relationship with server-side TLS certificate validity dates.",
            "2": "A half-duplex network switch port causes packet collisions and slow throughput, not cryptographic certificate expiration errors.",
            "3": "Incorrect user passwords result in HTTP 401/403 authentication failures, which occur after TLS session negotiation."
        }
    },
    {
        "id": "C2N-W-036",
        "objective": "3.4",
        "difficulty": "medium",
        "tags": ["security-troubleshooting", "services-disabled", "security-center", "antivirus"],
        "question": "A user notices that the Windows Defender Security Center icon has a red warning indicator. Opening the console reveals that 'Real-time protection' is turned off and the toggle switch is greyed out. What is the MOST likely cause?",
        "options": [
            "Malware has modified the registry / Group Policy to disable Windows Defender, or a third-party antivirus suite is managing endpoint security",
            "The monitor refresh rate is set to 60 Hz",
            "The computer's CMOS battery is slightly low",
            "The system RAM is running in single-channel mode"
        ],
        "answer": 0,
        "explanation": "When Windows Defender real-time protection is disabled and greyed out, it typically indicates that malicious software has altered system registry keys (e.g., `DisableAntiSpyware` under HKLM) or Group Policy to prevent the antivirus from running. Alternatively, installing a registered third-party antivirus package intentionally disables Defender to prevent engine conflicts. Monitor refresh rates, CMOS batteries, and RAM channel modes have no control over Windows Security services.",
        "distractor_analysis": {
            "1": "Display monitor refresh rates control visual frame rates and have no connection to Windows Security real-time protection engines.",
            "2": "A weak CMOS battery causes system clock loss during power-off, not administrative grey-out of antivirus toggle controls.",
            "3": "RAM channel architecture dictates memory bandwidth performance and does not modify antivirus service policies."
        }
    },
    {
        "id": "C2N-W-037",
        "objective": "3.4",
        "difficulty": "hard",
        "tags": ["security-troubleshooting", "open-ports", "netstat", "c2-traffic"],
        "question": "During an investigation of an endpoint suspected of malware infection, a technician runs `netstat -ano` from an elevated prompt and spots an established TCP connection on port 4444 to an unknown external IP address with Process ID (PID) 3812. What action should the technician take to identify the executable?",
        "options": [
            "Open Task Manager -> Details tab (or run `tasklist /fi \"PID eq 3812\"`) to identify the executable file name and file path associated with PID 3812",
            "Reboot the machine into BIOS settings to clear the connection",
            "Run `ipconfig /flushdns` to terminate the PID",
            "Delete the Windows `pagefile.sys` file"
        ],
        "answer": 0,
        "explanation": "The `netstat -ano` command lists active network sockets along with their owning Process Identifier (PID). Using Task Manager (Details tab, sorting by PID) or executing `tasklist /fi \"PID eq 3812\"` correlates PID 3812 with the exact executable binary name, user account, and directory path. Right-clicking the process in Task Manager and selecting 'Open file location' reveals the binary for quarantine. BIOS reboots, DNS flushes, and pagefile deletions do not identify or analyze the running malicious process.",
        "distractor_analysis": {
            "1": "Rebooting into BIOS terminates the active session, destroying volatile RAM evidence and network socket states needed for forensic attribution.",
            "2": "Flushing DNS clears the local DNS resolver name cache; it does not identify or terminate running process binaries.",
            "3": "Deleting the virtual memory pagefile destroys crash data and virtual memory storage without identifying the suspicious PID."
        }
    },
    {
        "id": "C2N-W-038",
        "objective": "3.4",
        "difficulty": "medium",
        "tags": ["security-troubleshooting", "file-renamed", "ransomware", "containment"],
        "question": "A user notices that files in their Documents folder are rapidly changing to have `.cryptolocker` file extensions and icons are turning blank. What is the IMMEDIATE containment action the technician must instruct the user to take?",
        "options": [
            "Immediately disconnect the computer from the network (unplug the Ethernet cable and disable Wi-Fi) and power off if instructed by policy",
            "Open the files in Notepad to see what went wrong",
            "Send an email to all staff with an attached encrypted file",
            "Run Disk Defragmenter on the drive"
        ],
        "answer": 0,
        "explanation": "Active file renaming with ransomware extensions indicates a live encryption process that will rapidly spread across mapped network drives and shared enterprise storage. The immediate emergency containment action is physically disconnecting the machine from the network (pulling the Ethernet cable and disabling Wi-Fi/Bluetooth) to isolate the infection and stop lateral encryption across network shares. Opening files in Notepad, emailing infected attachments, and running defragmentation worsen the disaster.",
        "distractor_analysis": {
            "1": "Opening encrypted files in Notepad does nothing to halt the background encryption thread from continuing across remaining directories.",
            "2": "Emailing infected attachments risks spreading malicious payloads and files to colleagues across the enterprise.",
            "3": "Running Disk Defragmenter reads and writes disk sectors extensively, accelerating the encryption and destroying unencrypted sectors."
        }
    }
]

def build_shard():
    final_questions = []
    for q in questions_data:
        obj = q["objective"]
        dom = c2_utils.get_domain(obj)
        notes_ref = c2_utils.get_notes_ref(obj)
        vid_ref = c2_utils.get_video_ref(obj)
        
        item = {
            "exam": "core2",
            "domain": dom,
            "objective": obj,
            "type": "single",
            "difficulty": q.get("difficulty", "medium"),
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "explanation": q["explanation"],
            "distractor_analysis": q["distractor_analysis"],
            "video_reference": vid_ref,
            "notes_reference": notes_ref,
            "tags": q.get("tags", []),
            "id": q["id"]
        }
        final_questions.append(item)
    
    out_file = os.path.join(SHARDS_DIR, "core2_new_swtroubleshooting.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"questions": final_questions}, f, indent=2, ensure_ascii=False)
    print(f"Built {len(final_questions)} questions in {out_file}")

if __name__ == "__main__":
    build_shard()
