# c2_fixed_data_part3.py: C2-143 to C2-200
part3 = [
    {
        "id": "C2-143",
        "objective": "1.2",
        "difficulty": "medium",
        "tags": ["windows-editions", "domain-join", "active-directory", "pro"],
        "question": "Which Windows edition is required to join an Active Directory domain for corporate workstations in a datacenter operations team?",
        "options": ["Windows 11 Home", "Windows 11 Pro or Enterprise", "Windows 11 S Mode only", "Windows 10 IoT Core"],
        "answer": 1,
        "explanation": "Joining a Windows Server Active Directory domain requires Windows Pro, Enterprise, or Education editions. Windows Home and consumer editions lack the networking architecture and security components to join a domain. S Mode restricts execution to Microsoft Store apps, and IoT Core is an embedded OS for single-board computers.",
        "distractor_analysis": {
            "0": "Windows 11 Home lacks Active Directory domain joining capabilities and Group Policy client processing.",
            "2": "Windows 11 S Mode is a locked-down mode restricted to Microsoft Store apps and does not provide enterprise domain management on its own.",
            "3": "Windows 10 IoT Core is designed for headless smart devices and embedded appliances, not interactive enterprise desktop workstations."
        }
    },
    {
        "id": "C2-144",
        "objective": "1.4",
        "difficulty": "easy",
        "tags": ["task-manager", "resource-monitor", "performance", "real-time"],
        "question": "A technician needs to view real-time CPU, memory, disk, and network utilization while investigating a sluggish file server. Which built-in tool is BEST?",
        "options": ["Notepad", "Task Manager or Resource Monitor", "Disk Cleanup", "Character Map"],
        "answer": 1,
        "explanation": "Task Manager and Resource Monitor (`resmon.exe`) provide live, real-time telemetry, graphs, and per-process breakdowns of CPU, RAM, Disk I/O, and Network utilization. Notepad is a text editor, Disk Cleanup removes cached files, and Character Map inserts special typographic symbols.",
        "distractor_analysis": {
            "0": "Notepad is a basic plain-text editing tool with no performance monitoring capabilities.",
            "2": "Disk Cleanup is a maintenance utility used to delete temporary and cached files from storage drives.",
            "3": "Character Map displays Unicode and ASCII font glyphs for copying into text documents."
        }
    },
    {
        "id": "C2-145",
        "objective": "1.4",
        "difficulty": "easy",
        "tags": ["mmc", "eventvwr", "event-viewer", "logs"],
        "question": "Which MMC snap-in opens Event Viewer to review Application, System, and Security logs on a Windows server?",
        "options": ["`eventvwr.msc`", "`devmgmt.msc`", "`diskmgmt.msc`", "`services.msc`"],
        "answer": 0,
        "explanation": "`eventvwr.msc` launches Windows Event Viewer, the central console for viewing system event logs, application crash reports, and security audit entries. `devmgmt.msc` opens Device Manager, `diskmgmt.msc` opens Disk Management, and `services.msc` manages background services.",
        "distractor_analysis": {
            "1": "`devmgmt.msc` opens Device Manager to inspect, update, and troubleshoot hardware device drivers.",
            "2": "`diskmgmt.msc` opens Disk Management to partition, format, and assign drive letters to storage volumes.",
            "3": "`services.msc` opens the Services console to start, stop, and configure Windows background system services."
        }
    },
    {
        "id": "C2-146",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "gpupdate", "group-policy", "force"],
        "question": "A help desk technician must force an immediate Group Policy refresh on a domain-joined laptop after a GPO change. Which command is correct?",
        "options": ["`ipconfig /renew`", "`gpupdate /force`", "`net start spooler`", "`chkdsk C:`"],
        "answer": 1,
        "explanation": "The `gpupdate /force` command instructs the Windows client to contact the domain controller and immediately reapply all user and computer Group Policy settings, bypassing standard background refresh intervals (90 minutes by default). `ipconfig /renew` renews DHCP leases, `net start` starts services, and `chkdsk` checks disk volumes.",
        "distractor_analysis": {
            "0": "`ipconfig /renew` requests a renewed IPv4/IPv6 lease from the DHCP server without refreshing Group Policy.",
            "2": "`net start spooler` starts the Windows Print Spooler service.",
            "3": "`chkdsk C:` scans the C: drive volume for file system metadata corruption."
        }
    },
    {
        "id": "C2-147",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "netstat", "listening-ports", "pids"],
        "question": "Which command displays detailed TCP/UDP listening ports and active sockets along with their associated Process IDs (PIDs) on a Windows computer?",
        "options": ["`tracert -d`", "`netstat -ano`", "`nslookup -type=mx`", "`route print`"],
        "answer": 1,
        "explanation": "`netstat -ano` displays all active network connections and listening ports (`-a`), numeric IP and port addresses (`-n`), and the owning Process ID (`-o`) for each socket. `tracert` traces router hops, `nslookup` queries DNS records, and `route print` displays the local routing table.",
        "distractor_analysis": {
            "0": "`tracert -d` traces intermediate router hops without performing reverse DNS resolution on IP addresses.",
            "2": "`nslookup -type=mx` queries DNS servers specifically for Mail Exchange (MX) records.",
            "3": "`route print` displays the system IP routing table and active network interface gateway routes."
        }
    },
    {
        "id": "C2-148",
        "objective": "1.9",
        "difficulty": "easy",
        "tags": ["linux", "top", "htop", "performance"],
        "question": "A Linux rack server must show which process is consuming the most CPU in real time. Which interactive command provides this live performance dashboard?",
        "options": ["`cat /proc/cpuinfo`", "`top` or `htop`", "`uname -a`", "`grep cpu /var/log/messages`"],
        "answer": 1,
        "explanation": "`top` (and the enhanced `htop`) provides a dynamic, real-time interactive process viewer displaying CPU, memory, load average, and active process PIDs sorted by resource utilization. `cat /proc/cpuinfo` displays static CPU hardware model specs, `uname -a` shows kernel versions, and `grep` searches log text files.",
        "distractor_analysis": {
            "0": "`cat /proc/cpuinfo` outputs static hardware processor specifications (model, cores, cache), not live process CPU consumption.",
            "2": "`uname -a` displays operating system kernel architecture, hostname, and build release information.",
            "3": "`grep cpu /var/log/messages` searches system log files for historical text strings matching 'cpu'."
        }
    },
    {
        "id": "C2-149",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "chmod", "permissions", "octal"],
        "question": "Which Linux permission command allows the file owner full read, write, and execute control, the group read and execute access, and denies all permissions to others?",
        "options": ["`chmod 640`", "`chmod 750`", "`chmod 777`", "`chmod 600`"],
        "answer": 1,
        "explanation": "Octal permissions evaluate Read=4, Write=2, Execute=1. Owner full control (`rwx`) equals 4+2+1=7. Group read and execute (`r-x`) equals 4+1=5. Others no permissions (`---`) equals 0. Combining these gives `chmod 750`. `chmod 640` is rw-/r--/---, `chmod 777` gives full access to everyone, and `chmod 600` is owner rw- only.",
        "distractor_analysis": {
            "0": "`chmod 640` grants Owner read/write (6), Group read-only (4), and Others none (0), lacking execute bits.",
            "2": "`chmod 777` grants full read, write, and execute permissions to all users (Owner, Group, and Others).",
            "3": "`chmod 600` grants Owner read/write only, with zero permissions for Group and Others."
        }
    },
    {
        "id": "C2-150",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "filevault", "encryption", "apple"],
        "question": "A macOS administrator needs to enable encrypted full-disk volume protection for a company MacBook using XTS-AES 128-bit encryption. Which built-in macOS feature provides this?",
        "options": ["Time Machine", "FileVault", "Gatekeeper", "Keychain Access"],
        "answer": 1,
        "explanation": "FileVault is Apple's native full-disk volume encryption technology in macOS. It uses XTS-AES-128 encryption with a 256-bit key to protect the entire startup disk and prevent unauthorized access if the device is lost or stolen. Time Machine handles backups, Gatekeeper verifies application code signatures, and Keychain Access stores passwords.",
        "distractor_analysis": {
            "0": "Time Machine is Apple's automated backup utility for creating incremental volume snapshots.",
            "2": "Gatekeeper is a macOS security feature that enforces code-signing requirements to prevent untrusted software execution.",
            "3": "Keychain Access is a credential manager for storing website passwords and digital certificates."
        }
    },
    {
        "id": "C2-151",
        "objective": "2.9",
        "difficulty": "medium",
        "tags": ["data-destruction", "cipher", "diskpart", "free-space"],
        "question": "Which Windows command-line utility can securely overwrite and wipe unallocated free space on an NTFS volume without destroying existing active files?",
        "options": ["`format /q`", "`cipher /w:C:`", "`sfc /scannow`", "`gpupdate /force`"],
        "answer": 1,
        "explanation": "The `cipher /w:directory` command removes residual data from deallocated disk sectors by overwriting all unallocated free space with zeroes, ones, and random numbers across three passes, preventing forensic file recovery while leaving existing valid files untouched. `format /q` wipes volume tables, `sfc` checks system files, and `gpupdate` refreshes Group Policy.",
        "distractor_analysis": {
            "0": "`format /q` initializes file allocation tables on the entire drive, destroying pointers to existing active files.",
            "2": "`sfc /scannow` checks and repairs corrupted Windows operating system binaries.",
            "3": "`gpupdate /force` updates Group Policy settings from domain controllers."
        }
    },
    {
        "id": "C2-152",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "net-use", "mapping", "network-drives"],
        "question": "A technician needs to map a persistent network drive letter Z: to a shared folder `\\\\filesrv01\\backups` from the command line. Which command is correct?",
        "options": ["`net use Z: \\\\filesrv01\\backups /persistent:yes`", "`net share Z:=\\\\filesrv01\\backups`", "`ipconfig /map Z: \\\\filesrv01\\backups`", "`robocopy Z: \\\\filesrv01\\backups`"],
        "answer": 0,
        "explanation": "The `net use` command connects computers to shared network resources and maps drive letters. Specifying `net use Z: \\\\filesrv01\\backups /persistent:yes` maps the share to drive Z: and configures Windows to reconnect the share automatically upon subsequent logons. `net share` creates local network shares, `ipconfig` manages IP leases, and `robocopy` copies files.",
        "distractor_analysis": {
            "1": "`net share` is used on the host server to publish and export a local folder as a network share.",
            "2": "`ipconfig` manages network interface IP configuration and has no command switches to map network drives.",
            "3": "`robocopy` is a file replication tool, not a drive mapping utility."
        }
    },
    {
        "id": "C2-153",
        "objective": "1.3",
        "difficulty": "easy",
        "tags": ["windows-settings", "startup-apps", "performance", "optimization"],
        "question": "Which Windows Settings menu location is used to manage and toggle startup applications to improve boot performance?",
        "options": ["Settings -> Personalization -> Colors", "Settings -> Apps -> Startup", "Settings -> Time & Language -> Region", "Settings -> Gaming -> Captures"],
        "answer": 1,
        "explanation": "In Windows 10 and 11, startup applications are managed under Settings -> Apps -> Startup (or in Task Manager on the Startup apps tab). This interface allows users to toggle applications on or off to optimize boot time. Colors customizes window themes, Region sets regional formatting, and Captures configures game clip recording.",
        "distractor_analysis": {
            "0": "Personalization Colors manages light/dark mode and accent color themes.",
            "2": "Time & Language Region configures date formatting, currency symbols, and regional localization.",
            "3": "Gaming Captures configures screenshot shortcuts and game video recording parameters."
        }
    },
    {
        "id": "C2-154",
        "objective": "1.7",
        "difficulty": "medium",
        "tags": ["networking", "apipa", "dhcp-failure", "ip-addressing"],
        "question": "A Windows workstation displays an IPv4 address of `169.254.88.14` and cannot reach the internet or local file servers. What does this address indicate?",
        "options": ["The computer successfully leased an enterprise static IP address", "The client failed to contact a DHCP server and self-assigned an Automatic Private IP Addressing (APIPA) address", "The computer is configured in an isolated DMZ subnet", "The default gateway assigned a public class B address"],
        "answer": 1,
        "explanation": "The `169.254.0.1` to `169.254.255.254` address block with a `/16` subnet mask is reserved for Automatic Private IP Addressing (APIPA). When a Windows client configured for DHCP fails to receive a response from a DHCP server (due to cable disconnection, server outage, or VLAN misconfiguration), it automatically self-assigns an APIPA address, allowing local link-local communication but preventing routing across gateways.",
        "distractor_analysis": {
            "0": "Static IP addresses are configured manually by administrators and do not fall in the link-local APIPA range.",
            "2": "DMZ subnets utilize routable private or public IP blocks assigned via DHCP or static configuration.",
            "3": "169.254.x.x is a non-routable link-local address range and is never assigned by a default gateway."
        }
    },
    {
        "id": "C2-155",
        "objective": "1.1",
        "difficulty": "easy",
        "tags": ["file-systems", "ntfs", "windows-default", "security"],
        "question": "Which file system is the standard default for modern Windows operating system volumes, supporting file-level security permissions, encryption, compression, and disk quotas?",
        "options": ["FAT32", "exFAT", "NTFS", "ext4"],
        "answer": 2,
        "explanation": "NTFS (New Technology File System) is the proprietary default file system for Windows system boot drives and internal storage. It provides essential enterprise features including NTFS Access Control Lists (ACLs), Encrypting File System (EFS), volume shadow copies, file compression, and disk quotas. FAT32 and exFAT lack ACL permissions, and ext4 is a Linux file system.",
        "distractor_analysis": {
            "0": "FAT32 lacks support for security permissions, encryption, and files larger than 4 GB.",
            "1": "exFAT is designed for flash drives and external storage to support large files, but lacks granular NTFS permissions and quotas.",
            "3": "ext4 is the default journaling file system for Linux distributions, not native Windows boot volumes."
        }
    },
    {
        "id": "C2-156",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "chgrp", "recursive", "permissions"],
        "question": "A Linux administrator must recursively change the group ownership of `/opt/apps` and all files inside it to the group `opsgroup`. Which command is correct?",
        "options": ["`chgrp -R opsgroup /opt/apps`", "`chmod -R 777 /opt/apps`", "`chown root /opt/apps`", "`ls -R /opt/apps`"],
        "answer": 0,
        "explanation": "The `chgrp` (change group) command with the `-R` (recursive) flag updates the group ownership across the specified parent directory and all nested subdirectories and files. `chmod -R 777` alters permission bits, `chown root` modifies user owner only on the top folder, and `ls -R` lists directories recursively.",
        "distractor_analysis": {
            "1": "`chmod -R 777` grants universal read/write/execute permissions to all users, creating severe security risks without changing the group owner.",
            "2": "`chown root` changes only the user owner of the top folder without modifying group ownership or recursing.",
            "3": "`ls -R` lists directory contents recursively without modifying filesystem ownership metadata."
        }
    },
    {
        "id": "C2-157",
        "objective": "3.1",
        "difficulty": "easy",
        "tags": ["safe-mode", "troubleshooting", "minimal-drivers", "windows-boot"],
        "question": "Which Windows diagnostic boot option loads a minimal set of core device drivers and services with standard low-resolution display drivers to isolate software faults?",
        "options": ["Normal Startup", "Safe Mode (or Safe Mode with Networking)", "Selective Startup with All Services", "Fast Boot Mode"],
        "answer": 1,
        "explanation": "Safe Mode boots Windows with an absolute minimum set of trusted Microsoft drivers and essential system services, bypassing third-party startup applications, rogue drivers, and display accelerators. This clean environment is ideal for troubleshooting driver conflicts, resolving BSODs, and removing persistent malware. Normal Startup loads all drivers.",
        "distractor_analysis": {
            "0": "Normal Startup loads all installed third-party drivers, background services, and startup software.",
            "2": "Selective Startup with All Services enables third-party services and does not isolate system conflicts.",
            "3": "Fast Boot (Fast Startup) uses hybrid hibernation to speed up standard boots without loading diagnostic minimal drivers."
        }
    },
    {
        "id": "C2-158",
        "objective": "1.5",
        "difficulty": "easy",
        "tags": ["cli", "systeminfo", "hardware-specs", "hotfixes"],
        "question": "A technician needs to view the system hostname, exact OS build version, installed Windows hotfixes/patches, and physical memory configuration from Command Prompt. Which command produces this report?",
        "options": ["`hostname`", "`systeminfo`", "`ver`", "`whoami`"],
        "answer": 1,
        "explanation": "`systeminfo` displays a comprehensive configuration summary of the local or remote computer, including OS name and version, product ID, BIOS version, physical memory, network cards, domain membership, and a complete list of installed hotfixes/patches. `hostname` displays only the computer name, `ver` shows simple OS version string, and `whoami` shows the active username.",
        "distractor_analysis": {
            "0": "`hostname` outputs only the netbios computer name of the local system.",
            "2": "`ver` outputs a single line showing the Windows kernel version string.",
            "3": "`whoami` displays the current logged-on domain and username."
        }
    },
    {
        "id": "C2-159",
        "objective": "1.4",
        "difficulty": "medium",
        "tags": ["task-scheduler", "automation", "robocopy", "scheduled-tasks"],
        "question": "Which Windows administrative management utility is used to schedule a nightly automated robocopy backup script to execute every morning at 02:00 AM without user intervention?",
        "options": ["Task Scheduler (`taskschd.msc`)", "Task Manager", "Services console (`services.msc`)", "Resource Monitor"],
        "answer": 0,
        "explanation": "Task Scheduler (`taskschd.msc`) is the native Windows automation utility used to schedule tasks, scripts, and executables based on predefined time triggers (e.g., daily at 02:00 AM) or system event triggers. Task Manager monitors active processes, Services manages persistent background daemons, and Resource Monitor tracks live resource utilization.",
        "distractor_analysis": {
            "1": "Task Manager monitors active running applications and processes but cannot schedule future recurring batch tasks.",
            "2": "Services console configures persistent background system services, not time-triggered scheduled batch jobs.",
            "3": "Resource Monitor graphs real-time CPU, RAM, disk, and network counters without providing task automation."
        }
    },
    {
        "id": "C2-160",
        "objective": "1.9",
        "difficulty": "easy",
        "tags": ["linux", "pwd", "cli", "navigation"],
        "question": "In Linux, which command prints the current working directory path to the terminal?",
        "options": ["`pwd`", "`cd`", "`ls`", "`whereis`"],
        "answer": 0,
        "explanation": "`pwd` (print working directory) outputs the full absolute path of the directory currently active in the shell session. `cd` changes directories, `ls` lists files, and `whereis` locates binary executables.",
        "distractor_analysis": {
            "1": "`cd` changes the current working directory to a specified target directory path.",
            "2": "`ls` lists files and subdirectories located inside the current directory.",
            "3": "`whereis` searches standard system directories to find the binary, source, and manual page files for a command."
        }
    },
    {
        "id": "C2-161",
        "objective": "1.7",
        "difficulty": "medium",
        "tags": ["networking", "dns", "hostname-resolution", "troubleshooting"],
        "question": "A Windows workstation can successfully ping the public IP address `8.8.8.8` but fails to load web pages when navigating to `www.google.com`. What network configuration component is misconfigured?",
        "options": ["DNS server configuration", "Subnet mask", "Default gateway IP address", "Physical Ethernet cable"],
        "answer": 0,
        "explanation": "Because the workstation can successfully ping an external public IP address (`8.8.8.8`), the physical network cable, local IP address, subnet mask, and default gateway routing are fully functional. The failure to resolve domain names (`www.google.com`) isolates the fault directly to an invalid, unreachable, or misconfigured DNS server address. Subnet masks and gateways affect all layer 3 IP traffic.",
        "distractor_analysis": {
            "1": "If the subnet mask was invalid, local and default gateway routing would fail, preventing pings to 8.8.8.8.",
            "2": "If the default gateway was unreachable, packets could not leave the local subnet to reach 8.8.8.8.",
            "3": "If the Ethernet cable was broken, all physical link communication and IP traffic would drop completely."
        }
    },
    {
        "id": "C2-162",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "spotlight", "search", "apple"],
        "question": "Which macOS feature provides instant system-wide desktop search across files, emails, contacts, installed applications, and web results?",
        "options": ["Finder", "Spotlight", "Siri Remote", "Mission Control"],
        "answer": 1,
        "explanation": "Spotlight is Apple's built-in desktop search indexer in macOS, invoked via `Command + Space` or the magnifying glass icon in the menu bar. It provides fast search across files, metadata, apps, dictionaries, and web knowledge. Finder is the file manager, Siri Remote is an Apple TV peripheral, and Mission Control manages open application windows.",
        "distractor_analysis": {
            "0": "Finder is the macOS graphical file system browser, not the global indexing search bar.",
            "2": "Siri Remote is a physical hardware remote control used with Apple TV hardware.",
            "3": "Mission Control provides a visual overview of open application windows and virtual desktop spaces."
        }
    },
    {
        "id": "C2-163",
        "objective": "4.8",
        "difficulty": "hard",
        "tags": ["powershell", "winrm", "remote-management", "wsman"],
        "question": "A datacenter jump box requires PowerShell remoting (`Enter-PSSession`) enabled across 50 Windows servers. Which Windows service and management protocol underpins PowerShell remoting?",
        "options": ["Telnet Service", "Windows Remote Management (WinRM / WS-Management)", "Simple Network Management Protocol (SNMP)", "Network File System (NFS)"],
        "answer": 1,
        "explanation": "PowerShell Remoting relies on the Windows Remote Management (WinRM) service, Microsoft's implementation of the standard WS-Management SOAP-based protocol. WinRM communicates over HTTP (port 5985) or HTTPS (port 5986) using Kerberos or certificate authentication. Telnet is unencrypted CLI, SNMP monitors device metrics, and NFS is a file-sharing protocol.",
        "distractor_analysis": {
            "0": "Telnet is an insecure plaintext terminal protocol that is disabled by default and unrelated to PowerShell Remoting.",
            "2": "SNMP queries hardware metrics and network interface counters, lacking remote interactive shell capabilities.",
            "3": "NFS is a network file sharing protocol used to mount remote storage volumes."
        }
    },
    {
        "id": "C2-164",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "systemd", "systemctl", "init"],
        "question": "Which system initialization and service manager is the modern standard on major Linux distributions (such as Ubuntu, RHEL, and Debian) and is managed via the `systemctl` command?",
        "options": ["`systemd`", "`SysVinit`", "`Upstart`", "`GRUB2`"],
        "answer": 0,
        "explanation": "`systemd` is the standard init system and service manager on modern Linux distributions. It initializes user space, manages daemons, controls logging (`journald`), and is controlled using `systemctl` (e.g., `systemctl start apache2`). `SysVinit` is the legacy init script system, `Upstart` is an older event-driven init system, and `GRUB2` is a bootloader.",
        "distractor_analysis": {
            "1": "`SysVinit` is the legacy Unix init system that relied on sequential shell scripts in `/etc/init.d/`.",
            "2": "`Upstart` was an interim event-based init daemon developed by Canonical, since superseded by `systemd`.",
            "3": "`GRUB2` is the Grand Unified Bootloader responsible for loading the Linux kernel into RAM at boot."
        }
    },
    {
        "id": "C2-165",
        "objective": "2.2",
        "difficulty": "medium",
        "tags": ["firewall", "windows-defender", "inbound-rules", "default-deny"],
        "question": "In accordance with standard network defense-in-depth principles, how are Windows Defender Firewall default inbound and outbound traffic rules configured on corporate endpoints?",
        "options": ["Allow all inbound and allow all outbound", "Block all inbound connections unless explicitly allowed, and allow all outbound connections unless explicitly blocked", "Block all outbound connections and allow all inbound connections", "Disable all firewall filtering across public profiles"],
        "answer": 1,
        "explanation": "Standard host firewall architecture enforces a default-deny inbound policy (blocking all incoming unsolicited connections unless an explicit rule allows them, e.g., RDP port 3389) and a default-allow outbound policy (permitting workstations to initiate outbound web and DNS connections unless specifically restricted). Allowing all inbound traffic exposes the host to remote exploits.",
        "distractor_analysis": {
            "0": "Allowing all inbound connections leaves all network ports wide open to scanning and remote exploitation.",
            "2": "Blocking all outbound traffic prevents normal web browsing and DNS resolution while allowing dangerous inbound attacks.",
            "3": "Disabling firewall filtering eliminates perimeter host packet inspection completely."
        }
    },
    {
        "id": "C2-166",
        "objective": "1.8",
        "difficulty": "easy",
        "tags": ["macos", "time-machine", "backup", "apple"],
        "question": "A user needs an automated offline incremental backup solution on macOS to an external USB drive. Which built-in macOS application should be configured?",
        "options": ["Time Machine", "Boot Camp", "Finder", "Terminal"],
        "answer": 0,
        "explanation": "Time Machine is Apple's built-in backup application for macOS that automatically creates hourly, daily, and weekly snapshots to external storage drives or network volumes. Boot Camp configures Windows dual-booting, Finder manages files, and Terminal provides shell access.",
        "distractor_analysis": {
            "1": "Boot Camp is used on Intel Macs to partition storage and install Microsoft Windows.",
            "2": "Finder is the desktop graphical file browser for macOS.",
            "3": "Terminal is the command-line interface for running shell commands."
        }
    },
    {
        "id": "C2-167",
        "objective": "1.5",
        "difficulty": "easy",
        "tags": ["cli", "ipconfig", "flushdns", "dns"],
        "question": "Which command clears the local DNS resolver cache on Windows to force the workstation to query nameservers for updated IP records?",
        "options": ["`ipconfig /flushdns`", "`ipconfig /release`", "`nslookup /clear`", "`netstat -r`"],
        "answer": 0,
        "explanation": "`ipconfig /flushdns` clears and flushes the local DNS client resolver cache in Windows. `/release` drops the DHCP lease, `nslookup /clear` is invalid syntax, and `netstat -r` displays the routing table.",
        "distractor_analysis": {
            "1": "`ipconfig /release` releases the active DHCP IP lease from the network adapter.",
            "2": "`nslookup /clear` is non-existent command syntax.",
            "3": "`netstat -r` displays the contents of the IP routing table."
        }
    },
    {
        "id": "C2-168",
        "objective": "1.10",
        "difficulty": "medium",
        "tags": ["software-installation", "prerequisites", "runtime", "compatibility"],
        "question": "An enterprise line-of-business software installer fails with an error stating that the Microsoft .NET Desktop Runtime is missing. What deployment step was omitted?",
        "options": ["Verifying vendor prerequisite software and runtime dependencies before application installation", "Installing a larger power supply unit", "Formatting the boot drive with FAT32", "Disabling Windows Update services"],
        "answer": 0,
        "explanation": "Enterprise software applications often depend on prerequisite framework packages (such as .NET Runtime, Java JRE, Visual C++ Redistributables, or DirectX runtimes). Verifying and staging vendor prerequisite packages is an essential step in software installation planning. Hardware power supplies, FAT32 formatting, and disabling updates are unrelated.",
        "distractor_analysis": {
            "1": "Power supplies deliver DC electrical wattage to motherboard rails and have zero relation to software framework runtimes.",
            "2": "Formatting with FAT32 degrades storage security and reduces file compatibility.",
            "3": "Disabling Windows Update prevents security patching and does not provide missing application runtimes."
        }
    },
    {
        "id": "C2-169",
        "objective": "1.4",
        "difficulty": "easy",
        "tags": ["mmc", "compmgmt", "computer-management", "console"],
        "question": "Which Windows administrative console consolidates Device Manager, Disk Management, Event Viewer, Task Scheduler, and Local Users and Groups into a single unified interface?",
        "options": ["Computer Management (`compmgmt.msc`)", "Control Panel", "Task Manager", "Registry Editor (`regedit.exe`)"],
        "answer": 0,
        "explanation": "Computer Management (`compmgmt.msc`) is a unified Microsoft Management Console containing three major sections: System Tools (Event Viewer, Task Scheduler, Shared Folders, Local Users and Groups, Performance, Device Manager), Storage (Disk Management), and Services and Applications. Task Manager monitors live processes, and Registry Editor edits raw keys.",
        "distractor_analysis": {
            "1": "Control Panel provides links to individual applets but lacks the hierarchical tree structure of Computer Management MMC.",
            "2": "Task Manager monitors live running applications, process CPU utilization, and startup items.",
            "3": "Registry Editor is dedicated to editing low-level registry keys and values."
        }
    },
    {
        "id": "C2-170",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "tail", "logs", "cli"],
        "question": "A Linux technician needs to monitor a system log file (`/var/log/syslog`) in real time, displaying newly appended log entries as they occur. Which command should be used?",
        "options": ["`tail -f /var/log/syslog`", "`head -n 20 /var/log/syslog`", "`cat /var/log/syslog`", "`grep error /var/log/syslog`"],
        "answer": 0,
        "explanation": "The `tail -f` (follow) command outputs the last lines of a file and keeps the stream open, actively displaying new data appended to the file in real time. `head` displays the beginning of a file, `cat` dumps the static contents once, and `grep` searches for matching text patterns statically.",
        "distractor_analysis": {
            "1": "`head -n 20` outputs the first 20 lines from the top of the file and terminates immediately.",
            "2": "`cat` displays the entire contents of the file from start to finish without following live updates.",
            "3": "`grep error` searches for the static string 'error' in the file and exits."
        }
    },
    {
        "id": "C2-171",
        "objective": "1.1",
        "difficulty": "easy",
        "tags": ["partitioning", "gpt", "large-drives", "uefi"],
        "question": "Which partition table standard supports disk capacities larger than 2 TB and natively supports up to 128 primary partitions in Windows?",
        "options": ["MBR (Master Boot Record)", "GPT (GUID Partition Table)", "Dynamic Extended Partition", "FAT32"],
        "answer": 1,
        "explanation": "GUID Partition Table (GPT) supports storage capacities well beyond 2 TB (up to 9.4 ZB) and up to 128 primary partitions in Windows. MBR is limited to 2.2 TB and 4 primary partitions. FAT32 is a file system format, not a partition table standard.",
        "distractor_analysis": {
            "0": "MBR is capped at 2.2 TB and 4 primary partitions due to 32-bit sector addressing.",
            "2": "Dynamic Extended Partition is a legacy term for logical drive containers inside MBR extended partitions.",
            "3": "FAT32 is a file allocation table file system format with a 32 GB volume limit in Windows."
        }
    },
    {
        "id": "C2-172",
        "objective": "1.5",
        "difficulty": "medium",
        "tags": ["cli", "diskpart", "partitioning", "disk-management"],
        "question": "Which Windows command-line tool manages disks, partitions, and volumes, allowing technicians to create, delete, format, and assign drive letters via scripts or an interactive prompt?",
        "options": ["`diskpart`", "`chkdsk`", "`defrag`", "`sfc`"],
        "answer": 0,
        "explanation": "`diskpart` is the powerful command-line disk management utility in Windows used to manage storage objects (disks, partitions, volumes, virtual hard disks). It supports scripting and interactive commands like `clean`, `create partition primary`, `format fs=ntfs quick`, and `assign letter=X`. `chkdsk` checks volume health, `defrag` optimizes clusters, and `sfc` checks system files.",
        "distractor_analysis": {
            "1": "`chkdsk` scans file systems and disk sectors for corruption and bad blocks.",
            "2": "`defrag` reorganizes fragmented file pieces on magnetic hard drives.",
            "3": "`sfc` inspects protected Windows operating system DLLs and binaries."
        }
    },
    {
        "id": "C2-173",
        "objective": "1.3",
        "difficulty": "medium",
        "tags": ["hyper-v", "virtualization", "slat", "hardware-requirements"],
        "question": "A technician is enabling Hyper-V on a Windows 11 Pro workstation to host test virtual machines. Which hardware CPU feature must be supported by the processor and enabled in UEFI?",
        "options": ["Hardware virtualization support (Intel VT-x or AMD-V) and Second Level Address Translation (SLAT)", "Hyper-Threading technology exclusively", "Integrated onboard graphics processing", "Overclocked memory XMP profiles"],
        "answer": 0,
        "explanation": "Client Hyper-V requires a 64-bit processor with Second Level Address Translation (SLAT) and hardware virtualization extensions (Intel VT-x or AMD-V) enabled in the system UEFI/BIOS. Hyper-Threading, integrated graphics, and XMP memory overclocking are not mandatory virtualization prerequisites.",
        "distractor_analysis": {
            "1": "Hyper-Threading provides virtual CPU threads but is not a mandatory hardware virtualization hypervisor prerequisite.",
            "2": "Integrated graphics displays video and has no role in hypervisor CPU instruction virtualization.",
            "3": "XMP memory overclocking increases RAM frequency for gaming and is unrelated to virtualization support."
        }
    },
    {
        "id": "C2-174",
        "objective": "1.9",
        "difficulty": "medium",
        "tags": ["linux", "curl", "api", "networking"],
        "question": "Which Linux command-line tool transfers data to or from a network server using protocols like HTTP, HTTPS, and FTP, making it ideal for API testing and file downloads?",
        "options": ["`curl`", "`ls`", "`chmod`", "`kill`"],
        "answer": 0,
        "explanation": "`curl` (Client URL) is a versatile command-line utility used to send and receive data over network protocols (HTTP, HTTPS, FTP, SFTP), widely used for testing REST APIs, downloading files, and inspecting HTTP headers. `ls` lists files, `chmod` changes permissions, and `kill` terminates processes.",
        "distractor_analysis": {
            "1": "`ls` lists directory contents in the file system.",
            "2": "`chmod` modifies file read, write, and execute permissions.",
            "3": "`kill` sends process signals to terminate running application PIDs."
        }
    },
    {
        "id": "C2-175",
        "objective": "2.5",
        "difficulty": "easy",
        "tags": ["social-engineering", "tailgating", "piggybacking", "physical-security"],
        "question": "A visitor follows closely behind an employee through a badge-controlled datacenter security door without scanning an authorized credential. What physical security breach is this?",
        "options": ["Shoulder surfing", "Tailgating / Piggybacking", "Quishing", "Dumpster diving"],
        "answer": 1,
        "explanation": "Tailgating (or piggybacking) is a physical social engineering breach where an unauthorized individual slips through an electronic badge-controlled door by closely following an authorized employee. Shoulder surfing is looking at screens, quishing uses QR codes, and dumpster diving searches trash.",
        "distractor_analysis": {
            "0": "Shoulder surfing involves visually spying on passwords or screens in close proximity.",
            "2": "Quishing delivers malicious phishing links via QR code images.",
            "3": "Dumpster diving searches waste containers for sensitive documents."
        }
    },
    {
        "id": "C2-176",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["access-control", "least-privilege", "rbac", "security-principles"],
        "question": "Which access control method BEST implements the principle of least privilege for a junior operator who only needs to reset domain user passwords?",
        "options": ["Add the operator to the Domain Admins group", "Delegate specific password-reset permissions to the target Organizational Unit (OU) via Role-Based Access Control (RBAC)", "Share the Enterprise Administrator password", "Grant Full Control permissions on all Active Directory partitions"],
        "answer": 1,
        "explanation": "Delegating specific administrative permissions (such as password resets) within a designated Organizational Unit (OU) using Role-Based Access Control (RBAC) grants the junior operator only the exact privileges required for their job duties, strictly enforcing least privilege. Domain Admins, Enterprise Admins, and root Full Control grant excessive domain-wide authority.",
        "distractor_analysis": {
            "0": "Domain Admins membership grants full enterprise control over the entire Active Directory domain, violating least privilege.",
            "2": "Sharing the Enterprise Admin password gives unchecked control across all forest domains.",
            "3": "Full Control over Active Directory partitions allows schema and security policy alterations."
        }
    },
    {
        "id": "C2-177",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-security", "wpa3-enterprise", "802.1x", "radius"],
        "question": "Corporate Wi-Fi for staff laptops should use which modern enterprise encryption and authentication standard combining AES encryption and 802.1X RADIUS authentication?",
        "options": ["WEP-Open", "WPA3-Enterprise or WPA2-Enterprise", "WPA-Personal (TKIP)", "WPS with static PIN"],
        "answer": 1,
        "explanation": "WPA2-Enterprise and WPA3-Enterprise utilize IEEE 802.1X port-based authentication connected to a backend RADIUS server with AES encryption, ensuring that every user authenticates with unique individual credentials or certificates. WEP is broken, WPA-Personal uses a shared passphrase, and WPS is vulnerable to PIN brute-forcing.",
        "distractor_analysis": {
            "0": "WEP is an obsolete, insecure protocol broken by static RC4 key reuse.",
            "2": "WPA-Personal relies on a shared passphrase and uses deprecated TKIP encryption.",
            "3": "WPS is an insecure automated pairing feature vulnerable to brute-force PIN attacks."
        }
    },
    {
        "id": "C2-178",
        "objective": "2.4",
        "difficulty": "easy",
        "tags": ["malware", "ransomware", "crypto-malware", "threats"],
        "question": "Malware that encrypts files on local and network drives and demands cryptocurrency payment in exchange for a private decryption key is classified as what?",
        "options": ["Adware", "Ransomware / Crypto-malware", "Spyware", "Keylogger"],
        "answer": 1,
        "explanation": "Ransomware (specifically crypto-malware) locks or encrypts user files using strong cryptographic algorithms and demands an extortion payment (usually Bitcoin or other cryptocurrency) to obtain the decryption key. Adware displays ads, spyware tracks browsing, and keyloggers record keystrokes.",
        "distractor_analysis": {
            "0": "Adware displays unwanted advertising banners and pop-up windows.",
            "2": "Spyware monitors user habits and system telemetry covertly without encrypting files.",
            "3": "Keyloggers capture keyboard keystrokes to harvest passwords silently."
        }
    },
    {
        "id": "C2-179",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "bec", "whaling", "financial-fraud"],
        "question": "A CFO receives an email appearing to come from the CEO directing an urgent, confidential wire transfer to a foreign supplier account to close an acquisition. What social engineering attack is this?",
        "options": ["Business Email Compromise (BEC) / Whaling", "Shoulder surfing", "Dumpster diving", "Watering hole attack"],
        "answer": 0,
        "explanation": "Business Email Compromise (BEC) and Whaling are targeted social engineering attacks that impersonate senior executives or business partners to manipulate financial personnel into authorizing fraudulent wire transfers or disclosing confidential data. Shoulder surfing is visual spying, dumpster diving is rummaging through trash, and watering hole attacks compromise websites.",
        "distractor_analysis": {
            "1": "Shoulder surfing involves visually observing a user's screen or keyboard input in person.",
            "2": "Dumpster diving is physically searching waste receptacles for discarded paperwork.",
            "3": "A watering hole attack compromises a third-party website frequented by targeted employees."
        }
    },
    {
        "id": "C2-180",
        "objective": "2.2",
        "difficulty": "easy",
        "tags": ["encryption", "bitlocker", "tpm", "full-disk-encryption"],
        "question": "Which Windows security feature encrypts entire storage volumes (including the operating system and system files) to protect data at rest against offline physical theft?",
        "options": ["BitLocker Drive Encryption", "User Account Control (UAC)", "Windows Defender SmartScreen", "Disk Defragmenter"],
        "answer": 0,
        "explanation": "BitLocker Drive Encryption provides full volume encryption (FVE) on Windows Pro and Enterprise editions. It encrypts the entire volume using AES and integrates with the motherboard TPM chip to protect data against offline attacks if the drive is physically removed. UAC manages elevation prompts, SmartScreen blocks malicious URLs, and Defragmenter optimizes disks.",
        "distractor_analysis": {
            "1": "UAC enforces privilege boundaries during an active Windows session but does not encrypt storage blocks.",
            "2": "SmartScreen warns users about untrusted download files and phishing websites.",
            "3": "Disk Defragmenter reorganizes file clusters on spinning magnetic disks."
        }
    },
    {
        "id": "C2-181",
        "objective": "2.6",
        "difficulty": "easy",
        "tags": ["malware-removal", "quarantine", "comptia-7-step", "containment"],
        "question": "After verifying that a workstation is infected with active malware, what is the FIRST action the technician must take according to the CompTIA malware removal methodology?",
        "options": ["Educate the end user", "Disconnect/quarantine the host from all wired and wireless networks", "Disable the local firewall", "Enable System Restore"],
        "answer": 1,
        "explanation": "Step 2 of the CompTIA 7-step malware removal process is to Quarantine the infected system by disconnecting Ethernet cables and disabling Wi-Fi/Bluetooth, isolating the host to prevent lateral malware movement. Educating users is Step 7, firewalls should not be disabled, and enabling System Restore is Step 6.",
        "distractor_analysis": {
            "0": "Educating the end user is Step 7, the final step in the malware removal methodology.",
            "2": "Disabling the firewall weakens network defenses and violates security protocols.",
            "3": "Enabling System Restore is Step 6, performed after the infection has been completely remediated."
        }
    },
    {
        "id": "C2-182",
        "objective": "2.1",
        "difficulty": "easy",
        "tags": ["mfa", "authentication", "smart-card", "security"],
        "question": "Which authentication approach requires presenting credentials from at least two different factor categories (e.g., 'Something you know' combined with 'Something you have')?",
        "options": ["Single-factor authentication", "Multifactor authentication (MFA)", "Anonymous authentication", "Password complexity policy"],
        "answer": 1,
        "explanation": "Multifactor Authentication (MFA) requires presenting two or more independent credentials from different authentication categories: Something you know (password/PIN), Something you have (smart card/hardware token), or Something you are (biometrics). Single-factor uses one category, anonymous uses no credentials, and password complexity is a password policy.",
        "distractor_analysis": {
            "0": "Single-factor authentication relies on credentials from only one category (e.g., password only).",
            "2": "Anonymous authentication permits unauthenticated access without verifying identity.",
            "3": "Password complexity policies govern password length and characters within a single knowledge factor."
        }
    },
    {
        "id": "C2-183",
        "objective": "2.9",
        "difficulty": "easy",
        "tags": ["data-destruction", "degaussing", "shredding", "sanitization"],
        "question": "Degaussing or industrial physical shredding of decommissioned enterprise hard disk drives is an example of which security procedure?",
        "options": ["Logical data recovery", "Physical data destruction / media sanitization", "In-place OS upgrade", "Volume defragmentation"],
        "answer": 1,
        "explanation": "Degaussing and physical shredding are physical data destruction and media sanitization methods designed to permanently destroy data stored on magnetic or solid-state media so it can never be recovered. Data recovery retrieves lost files, OS upgrades update software, and defragmentation reorganizes clusters.",
        "distractor_analysis": {
            "0": "Data recovery is the process of restoring lost files from damaged drives, the opposite of intentional destruction.",
            "2": "In-place OS upgrades update the operating system while preserving existing user files.",
            "3": "Volume defragmentation reorganizes file fragments on spinning disks to optimize read speeds."
        }
    },
    {
        "id": "C2-184",
        "objective": "2.11",
        "difficulty": "medium",
        "tags": ["browser-security", "certificates", "https", "tls-warning"],
        "question": "A user encounters a red browser warning stating 'Your connection is not private' when visiting an internal company portal. What is the MOST common root cause?",
        "options": ["Expired, untrusted, or mismatched SSL/TLS digital certificate", "The computer display monitor is unplugged", "The mouse DPI setting is too high", "The workstation power supply is failing"],
        "answer": 0,
        "explanation": "Browser TLS/HTTPS security warnings occur when the website's SSL/TLS digital certificate has expired, was issued by an untrusted Certificate Authority (CA) whose root certificate is missing from the client trust store, or does not match the domain name in the URL (Common Name mismatch). Hardware monitors, mice, and power supplies do not cause TLS cryptographic warnings.",
        "distractor_analysis": {
            "1": "An unplugged display monitor results in a black screen, not a browser software certificate error.",
            "2": "Mouse DPI settings adjust pointer tracking sensitivity on the desktop.",
            "3": "Power supply hardware faults cause sudden system shutdowns, not web browser cryptographic errors."
        }
    },
    {
        "id": "C2-185",
        "objective": "2.2",
        "difficulty": "medium",
        "tags": ["active-directory", "gpo", "group-policy", "windows-security"],
        "question": "Which Active Directory component applies password policies, account lockouts, software restrictions, and desktop settings centrally across thousands of domain workstations?",
        "options": ["Group Policy Object (GPO)", "Local HOSTS file", "Static DNS MX record", "DHCP Reservation"],
        "answer": 0,
        "explanation": "Group Policy Objects (GPOs) in Active Directory allow administrators to centrally manage, configure, and enforce security policies, password complexity rules, software restrictions, and system settings across domain-joined computers and users. HOSTS files map local IPs, MX records route email, and DHCP reservations assign static IP addresses.",
        "distractor_analysis": {
            "1": "The local HOSTS file maps static IP addresses to hostnames on a single individual computer.",
            "2": "A DNS MX record specifies the mail exchange servers responsible for accepting incoming email.",
            "3": "A DHCP reservation assigns a fixed IP address to a specific network MAC address."
        }
    },
    {
        "id": "C2-186",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-security", "evil-twin", "mitm", "on-path"],
        "question": "Evil Twin rogue wireless access points primarily enable which class of cyberattack by tricking victims into connecting?",
        "options": ["On-path / wireless eavesdropping and credential harvesting", "Hardware CPU destruction", "Physical hard drive degaussing", "RAM chip soldering degradation"],
        "answer": 0,
        "explanation": "An Evil Twin access point mimics a legitimate Wi-Fi network's SSID to trick clients into connecting. Once connected, all client traffic routes through the attacker's rogue AP, enabling on-path (Man-in-the-Middle) eavesdropping, packet sniffing, SSL stripping, and credential harvesting. It cannot physically alter CPU silicon, degauss drives, or damage RAM soldering.",
        "distractor_analysis": {
            "1": "Wireless network connections cannot cause physical silicon destruction of the client computer processor.",
            "2": "Degaussing requires powerful physical electromagnetic fields applied directly to magnetic storage platters.",
            "3": "Connecting to a rogue Wi-Fi access point has no physical impact on motherboard RAM solder joints."
        }
    },
    {
        "id": "C2-187",
        "objective": "2.8",
        "difficulty": "easy",
        "tags": ["mobile-security", "mdm", "remote-wipe", "lost-device"],
        "question": "Which mobile security control allows an IT administrator to securely erase all data from a lost or stolen corporate smartphone over the cellular network?",
        "options": ["Remote wipe via MDM", "Local biometric lock", "Bluetooth tethering", "NFC pairing"],
        "answer": 0,
        "explanation": "Mobile Device Management (MDM) platforms provide remote wipe functionality, allowing administrators to send a cryptographic erase command over cellular or Wi-Fi networks to sanitize all data on a lost or stolen device. Biometric locks require physical presence, tethering shares internet, and NFC is short-range tap communication.",
        "distractor_analysis": {
            "1": "Biometric locks (fingerprint/face) authenticate physical users at the lock screen but cannot initiate network wipe commands.",
            "2": "Bluetooth tethering shares a cellular internet connection with nearby paired devices.",
            "3": "NFC pairing establishes short-range (under 4 cm) communication for mobile payments and device pairing."
        }
    },
    {
        "id": "C2-188",
        "objective": "2.10",
        "difficulty": "easy",
        "tags": ["soho-security", "router-hardening", "default-passwords", "firewall"],
        "question": "When deploying a brand-new SOHO router and firewall, what should the administrator do with the factory default administrator password?",
        "options": ["Leave it set to the factory default for easier remote tech support", "Change it immediately to a strong, unique administrative password and store it securely", "Disable all passwords on the router", "Write the password on a public whiteboard"],
        "answer": 1,
        "explanation": "Leaving factory default credentials (e.g., admin/admin, admin/password) on a router is a severe security vulnerability that automated bots and attackers exploit within minutes. The administrator must immediately change default credentials to a strong, unique passphrase. Leaving defaults, disabling passwords, or posting them publicly invites compromise.",
        "distractor_analysis": {
            "0": "Leaving default credentials allows automated internet worms and attackers to easily seize control of the router.",
            "2": "Disabling administrative passwords removes all authentication protection from the management console.",
            "3": "Displaying administrative credentials on a public whiteboard violates physical and operational security standards."
        }
    },
    {
        "id": "C2-189",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["vulnerabilities", "zero-day", "threats", "patches"],
        "question": "A zero-day vulnerability is characterized by which condition?",
        "options": ["The vulnerability is actively exploited before the software vendor has developed and released an official security patch", "The vulnerability was patched ten years ago", "The vulnerability only affects legacy dial-up modems", "The vulnerability occurs only on the first day of every month"],
        "answer": 0,
        "explanation": "A zero-day vulnerability refers to a software security flaw that is known to attackers or actively exploited in the wild before the software developer has created and distributed an official security patch (leaving zero days of protection). It does not refer to calendar dates, patched legacy bugs, or dial-up modems.",
        "distractor_analysis": {
            "1": "Patched vulnerabilities are known, historical flaws for which remediation updates already exist.",
            "2": "Zero-day vulnerabilities can affect any software, operating system, or firmware application.",
            "3": "The term 'zero-day' reflects the absence of patch lead time, not calendar days of the month."
        }
    },
    {
        "id": "C2-190",
        "objective": "2.2",
        "difficulty": "hard",
        "tags": ["ntfs-permissions", "modify", "full-control", "ownership"],
        "question": "In Windows NTFS permissions, what specific capability does Full Control grant that Modify permission does NOT grant?",
        "options": ["Reading file contents", "Changing file permissions and taking file ownership", "Deleting files and folders", "Executing executable programs"],
        "answer": 1,
        "explanation": "In NTFS permissions, the Modify permission allows reading, writing, executing, and deleting files and subfolders. However, only Full Control grants the special rights to Change Permissions (modify ACLs) and Take Ownership of the file or folder. Read, delete, and execute are included in Modify.",
        "distractor_analysis": {
            "0": "Reading file contents is granted by standard Read permissions as well as Modify.",
            "2": "Deleting files and subdirectories is explicitly included in the NTFS Modify permission.",
            "3": "Executing application binaries is included in the Read & Execute and Modify permissions."
        }
    },
    {
        "id": "C2-191",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["radius", "aaa", "authentication", "network-access"],
        "question": "Which protocol is standard for providing centralized Authentication, Authorization, and Accounting (AAA) for enterprise 802.1X wireless networks and VPNs over UDP?",
        "options": ["RADIUS", "FTP", "Telnet", "SMTP"],
        "answer": 0,
        "explanation": "RADIUS (Remote Authentication Dial-In User Service) provides centralized AAA management for network access clients, VPNs, and 802.1X wireless networks over UDP. FTP transfers files, Telnet is unencrypted CLI, and SMTP transfers email.",
        "distractor_analysis": {
            "1": "FTP (File Transfer Protocol) transfers files over TCP ports 20/21 and does not provide network AAA services.",
            "2": "Telnet operates on TCP port 23 for unencrypted command-line sessions.",
            "3": "SMTP (Simple Mail Transfer Protocol) routes electronic mail messages between mail servers."
        }
    },
    {
        "id": "C2-192",
        "objective": "2.4",
        "difficulty": "easy",
        "tags": ["malware", "keylogger", "spyware", "credential-theft"],
        "question": "A hardware or software keylogger installed on an employee workstation is designed primarily to steal what type of information?",
        "options": ["Keystrokes, passwords, and sensitive typed text", "Physical CPU clock speeds", "Monitor display refresh rates", "Motherboard fan speeds"],
        "answer": 0,
        "explanation": "Keyloggers (software spyware or hardware inline USB devices) covertly record every keystroke pressed on the physical keyboard, capturing user account credentials, credit card numbers, confidential messages, and search queries. They do not monitor CPU clock frequencies, refresh rates, or fan speeds.",
        "distractor_analysis": {
            "1": "CPU clock speeds are hardware telemetry metrics managed by motherboard firmware, not targets of keyloggers.",
            "2": "Monitor refresh rates are video display settings, not sensitive typed user input.",
            "3": "Fan speeds are managed by thermal hardware controllers, having zero relationship with typed keystrokes."
        }
    },
    {
        "id": "C2-193",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["supply-chain", "third-party", "vendor-risk", "security-threats"],
        "question": "A supply chain attack compromises an enterprise organization's security by targeting which vector?",
        "options": ["Trusted third-party vendors, software update pipelines, or hardware suppliers", "The building's janitorial cleaning supplies", "Local coffee shop menu boards", "Workstation mouse pads"],
        "answer": 0,
        "explanation": "A supply chain attack compromises a target organization indirectly by infiltrating trusted third-party suppliers, upstream software development repositories, code-signing certificates, or hardware vendors (e.g., injecting malicious backdoors into legitimate vendor software updates). Janitorial supplies, menus, and mouse pads are not IT supply chain attack vectors.",
        "distractor_analysis": {
            "1": "Janitorial cleaning supplies are physical facility maintenance items and do not compromise IT software supply chains.",
            "2": "Coffee shop menu boards are external public displays unrelated to enterprise software delivery pipelines.",
            "3": "Mouse pads are passive physical desk accessories without computational logic."
        }
    },
    {
        "id": "C2-194",
        "objective": "2.11",
        "difficulty": "medium",
        "tags": ["browser-security", "cloud-admin", "hardening", "extensions"],
        "question": "Which security practice BEST hardens a web browser used by datacenter engineers to manage cloud infrastructure administrative consoles?",
        "options": ["Install dozens of unverified third-party shopping extensions", "Keep the browser updated to the latest patched version, limit extensions to verified tools, and enforce MFA", "Disable all browser certificate validation warnings", "Save all administrative passwords in plaintext on the desktop"],
        "answer": 1,
        "explanation": "Securing web browsers used for administrative consoles requires applying regular browser updates and patches, disabling or removing unnecessary third-party extensions, using dedicated administrative browser profiles, enforcing MFA, and respecting HTTPS certificate warnings. Unverified extensions, ignoring certificate alerts, and plaintext passwords create massive vulnerabilities.",
        "distractor_analysis": {
            "0": "Installing unverified browser add-ons dramatically increases the attack surface and risks credential theft via malicious extensions.",
            "2": "Disabling certificate validation warnings exposes administrative sessions to on-path (MitM) eavesdropping.",
            "3": "Storing administrative passwords in plaintext files on the desktop violates basic credential management security."
        }
    },
    {
        "id": "C2-195",
        "objective": "2.5",
        "difficulty": "easy",
        "tags": ["shoulder-surfing", "privacy-filter", "physical-security", "awareness"],
        "question": "What is the MOST effective physical countermeasure against shoulder surfing when an employee is working on sensitive documents in an airport lounge?",
        "options": ["Installing an anti-glare physical privacy filter screen over the laptop display", "Disabling the laptop Wi-Fi card", "Increasing the display brightness to maximum", "Changing the desktop wallpaper to bright yellow"],
        "answer": 0,
        "explanation": "Physical privacy filters (privacy screens) fit over laptop displays and use micro-louver technology to restrict the viewing angle, making the screen appear completely black from side angles and preventing nearby people from viewing sensitive text (shoulder surfing). Disabling Wi-Fi, increasing brightness, and changing wallpapers do not restrict side viewing angles.",
        "distractor_analysis": {
            "1": "Disabling Wi-Fi disconnects network access but leaves open local documents completely visible to anyone standing nearby.",
            "2": "Increasing screen brightness makes text easier for nearby bystanders to read from a distance.",
            "3": "Changing desktop wallpaper colors does not obscure active application windows containing confidential data."
        }
    },
    {
        "id": "C2-196",
        "objective": "2.2",
        "difficulty": "easy",
        "tags": ["defender", "antivirus", "real-time-protection", "windows-security"],
        "question": "Which native Windows security component provides real-time signature-based and behavioral anti-malware scanning for all installed applications and downloaded files?",
        "options": ["Microsoft Defender Antivirus", "Windows Media Player", "Disk Defragmenter", "Character Map"],
        "answer": 0,
        "explanation": "Microsoft Defender Antivirus is the built-in anti-malware solution integrated into Windows 10 and 11, providing continuous real-time scanning, cloud-delivered behavioral protection, and signature updates. Media Player plays video/audio, Defragmenter optimizes hard drives, and Character Map displays font symbols.",
        "distractor_analysis": {
            "1": "Windows Media Player is an entertainment application for multimedia playback.",
            "2": "Disk Defragmenter optimizes file cluster placement on magnetic hard drives.",
            "3": "Character Map is a utility used to locate and copy special typographic font characters."
        }
    },
    {
        "id": "C2-197",
        "objective": "2.4",
        "difficulty": "medium",
        "tags": ["malware", "rootkit", "kernel", "stealth"],
        "question": "Why is a Rootkit considered one of the most dangerous forms of malware on an enterprise operating system?",
        "options": ["It operates with kernel/system privileges and modifies OS binaries to conceal its active processes and files from security tools", "It only deletes desktop wallpaper images", "It displays non-intrusive pop-up ads in web browsers", "It increases system memory speed by 10%"],
        "answer": 0,
        "explanation": "Rootkits are exceptionally dangerous because they execute at Ring 0 (kernel space) or bootloader level, subverting the operating system itself to intercept API calls and hide their files, network connections, and processes from antivirus scanners and Task Manager. They do not merely delete wallpapers, display benign ads, or improve performance.",
        "distractor_analysis": {
            "1": "Rootkits aim to establish persistent, hidden administrative control rather than trivial visual desktop modifications.",
            "2": "Displaying advertisements is the function of user-space adware, not covert kernel-level rootkits.",
            "3": "Malware never improves hardware memory performance; rootkits consume system resources and compromise security."
        }
    },
    {
        "id": "C2-198",
        "objective": "2.9",
        "difficulty": "medium",
        "tags": ["data-destruction", "certificate-of-destruction", "compliance", "audit"],
        "question": "Why is obtaining a formal Certificate of Destruction essential when an organization contracts a third-party vendor to shred decommissioned hard disk drives?",
        "options": ["It provides legally recognized proof of proper media sanitization for regulatory compliance audits (e.g., HIPAA, PCI-DSS, GDPR)", "It automatically updates the Windows registry on all client PCs", "It provides a 100% discount on future hardware purchases", "It allows the company to reuse the shredded drive platters"],
        "answer": 0,
        "explanation": "A Certificate of Destruction provides legally binding documentation detailing the serial numbers, destruction method (shredding/incineration), date/time, and authorized witness signatures for destroyed media. This document is required to prove compliance during regulatory audits (HIPAA, PCI-DSS, GDPR, SOX). It does not update registries, grant discounts, or allow reusing shredded scrap metal.",
        "distractor_analysis": {
            "1": "A physical paper certificate of destruction has no interaction with operating system registry hives.",
            "2": "Certificates of destruction are compliance records, not commercial discount coupons for hardware vendors.",
            "3": "Shredded hard drive platters are destroyed into tiny metal fragments and cannot be reconstructed or reused."
        }
    },
    {
        "id": "C2-199",
        "objective": "2.5",
        "difficulty": "hard",
        "tags": ["web-security", "sql-injection", "input-validation", "attacks"],
        "question": "How does an attacker successfully execute a SQL Injection (SQLi) attack against a web application database?",
        "options": ["By inputting unfiltered SQL query statements into vulnerable web form input fields to manipulate backend database commands", "By cutting the physical fiber optic cable connecting to the web server", "By setting the browser zoom level to 200%", "By sending standard ICMP ping packets to port 80"],
        "answer": 0,
        "explanation": "SQL Injection (SQLi) occurs when a web application fails to properly sanitize or parameterize user input, allowing an attacker to inject malicious SQL commands (e.g., `' OR '1'='1`) into input fields or URL parameters to bypass authentication, dump database contents, or modify records. Cutting cables is physical sabotage, zoom levels change display size, and ICMP pings test network reachability.",
        "distractor_analysis": {
            "1": "Cutting physical network cabling causes a denial of service at the physical layer, not a software SQL injection vulnerability.",
            "2": "Adjusting browser zoom modifies visual magnification on the client display without altering web server query syntax.",
            "3": "ICMP ping packets operate at layer 3 and do not interact with application layer database query parameters."
        }
    },
    {
        "id": "C2-200",
        "objective": "2.5",
        "difficulty": "hard",
        "tags": ["web-security", "xss", "cross-site-scripting", "javascript"],
        "question": "What is the primary objective of a Cross-Site Scripting (XSS) attack against a web application?",
        "options": ["To inject malicious client-side scripts (such as JavaScript) into trusted websites to execute in other users' browsers and steal session cookies", "To physically overheat the web server CPU", "To scramble magnetic data on enterprise storage arrays", "To rewrite the router BIOS firmware"],
        "answer": 0,
        "explanation": "Cross-Site Scripting (XSS) attacks exploit improper input sanitization in web applications to inject malicious client-side JavaScript into web pages viewed by other users. When victims view the page, their browser executes the script, allowing the attacker to steal session cookies, hijack account tokens, or redirect users to phishing sites. XSS does not overheat CPUs, alter magnetic storage, or flash router firmware.",
        "distractor_analysis": {
            "1": "Client-side script execution inside a browser sandbox cannot cause physical overheating of server-side CPUs.",
            "2": "XSS executes in client web browsers and has no capability to degauss or modify magnetic enterprise storage arrays.",
            "3": "XSS operates at the web application layer and cannot flash or rewrite low-level network router BIOS firmware."
        }
    }
]
