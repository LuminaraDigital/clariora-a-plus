# 21 · Remote Access, Performance Tools & Windows OS Troubleshooting (Module 14, Lessons 14.2-14.4)

**Exam objectives:** Core 2 · 4.9 Use remote access technologies · 1.4 (performance tools) · 3.1 Troubleshoot common Windows OS problems.

---

# Lesson 14.2 - Remote access technologies

| Technology | Port | Notes |
|---|---|---|
| **RDP** - Remote Desktop Protocol | **TCP 3389** | **Remote Desktop Connection (`mstsc.exe`)**; encrypted auth + session; need **IP/FQDN + credentials**; full remote GUI session (locks the console). **Client in all editions; RDP *server* (host) only in Pro/Enterprise/Education**. Enable: Settings → System → **Remote Desktop**; user must be in Remote Desktop Users group |
| **VNC** - Virtual Network Computing | **TCP 5900** | Cross-platform screen sharing (RealVNC, TightVNC); shares the console |
| **Microsoft Remote Assistance (MSRA)** | Ephemeral **49152-65535** | **Invitation-based** (helper needs an invite/password); **chat + view/control**; both see the screen; requires firewall openings |
| **Quick Assist** | **TCP 443 (HTTPS)** | Modern replacement - **no firewall reconfiguration**; code-based; Microsoft account |
| **WinRM** - Windows Remote Management | 5985 (HTTP) / 5986 (HTTPS) | **SOAP-based**; exchange management info across the network; **interoperable** across platforms via HTTP/HTTPS; **PowerShell remoting** (`Enter-PSSession`, `Invoke-Command`) |
| **SSH** | **TCP 22** | Encrypted CLI; **password or key-based auth**; OpenSSH client/server built into Windows 10+ |
| **Telnet** | 23 | Plaintext - don't |
| **RMM** - remote monitoring & management | vendor | **MSP tool** for remote support of many customers - agents report health, push patches, remote control |
| **Desktop management / MDM** | vendor | Manage devices belonging to **one organisation** (Intune etc.) |
| **EDR** - endpoint detection & response | vendor | Security tool - scans, reports, **pre-programmed automated responses** (isolate host) |
| **SPICE** - Simple Protocol for Independent Computing Environments | | Remote display to **interact with a VM** (KVM/QEMU, oVirt); Kerberos & other auth; **TLS** encrypted |
| **Screen sharing** | | TeamViewer, LogMeIn, AnyDesk; also **video conferencing** (Teams, Zoom) screen share |
| **File transfer** | | **AirDrop** (Apple), **Nearby Sharing** (Windows), **Nearby Share/Quick Share** (Android); SFTP/SCP; cloud drives |
| **VPN** | | Encrypted tunnel to internal network via the **VPN gateway/server**, then use RDP/SMB inside |

Security considerations: use encrypted tools only, MFA, restrict by firewall/VPN, least privilege, log sessions, disable when not needed.

---

# Lesson 14.3 - Performance & troubleshooting tools

## System Information (`msinfo32`)
System summary: **OS version, firmware/BIOS version, hardware resources (IRQ/DMA/memory), components, software environment (drivers, services, environment variables, startup programs, network status)**. Export for support.

## Event Viewer (`eventvwr.msc`)
- **Windows Logs**: **Application, Security** (audit - logon success/failure), **Setup, System** (drivers, services, hardware), **Forwarded Events** (from other PCs). Plus Applications and Services Logs.
- **Levels**: **Information, Warning, Error, Critical** (+ Audit Success/Failure). Filter/create custom views; Event ID lookup.

## Task Manager (`taskmgr`)
- Open: **Ctrl+Shift+Esc**, Ctrl+Alt+Del → Task Manager, right-click Start/taskbar.
- **Processes** - apps/background, CPU/mem/disk/network/GPU per process; End task. **Details** - PID, **Set priority**, affinity, open file location, analyze wait chain.
- **Performance** - **CPU** (utilisation, speed, **cores & logical processors (Hyper-Threading)**, **virtualization** enabled?, cache), **Memory** (**in use, committed, cached, paged/non-paged pool**, slots used, speed - *high utilisation can be normal*), **Disk** (type, capacity, active time, response), **Network** (IP/MAC, throughput; **SSID, signal, standard** for Wi-Fi), **GPU** (dedicated adapter utilisation, **graphics memory**).
- **App history** - resource use of Store apps over time.
- **Startup** - enable/disable startup programs and see impact (Lab 26).
- **Users** - logged-in users, **send message, sign out, disconnect**, per-user processes/resources.
- **Services** - start/stop, open Services console.

## Services console (`services.msc`)
Startup types **Automatic, Automatic (Delayed Start), Manual, Disabled**; log-on account; recovery actions; dependencies. Disable non-essential services for performance/security. `net start/stop`, `sc`.

## Resource Monitor (`resmon`) & Performance Monitor (`perfmon`)
- **Resource Monitor** - live drill-down beyond Task Manager: which process holds which file/handle, disk queue, network connections per process, memory hard faults.
- **Performance Monitor** - **real-time charts and logs for long-term analysis**; **Data Collector Sets**: **counter logs** (metrics over time - baselines!), **trace logs** (events), alerts. Common **counters**: **% Processor Time**, **Avg. Disk Queue Length**, **Memory Pages/sec**, **Paging File % Usage**, Available MBytes, Disk % Idle, Network Bytes Total/sec. Capstone item 20 (baselines) uses this.

## System Configuration (`msconfig`)
Tabs: **General** (normal/diagnostic/selective startup), **Boot** (Safe boot: minimal/network, boot log, base video, no GUI boot, timeout, default OS), **Services** (hide Microsoft → disable third-party for clean boot), **Startup** (redirects to Task Manager), **Tools** (launch utilities).

---

# Lesson 14.4 - Troubleshoot Windows OS problems

## The boot process - memorise
| Legacy **BIOS / MBR** | **UEFI / GPT** |
|---|---|
| POST | POST |
| BIOS reads **MBR** → active partition boot sector | Firmware reads **GPT**, finds **EFI System Partition** |
| **BOOTMGR.EXE** (boot manager) reads **BCD** | **BCD** + **BOOTMGFW.EFI** |
| **WINLOAD.EXE** (OS loader) | WINLOAD.EFI |
| **Kernel** (NTOSKRNL.EXE) | Kernel |
| **HAL.DLL** | HAL.DLL |
| **Drivers** & services → Winlogon → shell | Drivers → logon |

**BCD** = Boot Configuration Data (`bcdedit`).

## Boot recovery tools
- **Advanced Boot Options / WinRE**: interrupt boot (fail 2-3 times → auto WinRE), **hold Shift while clicking Restart**, Settings → Recovery → Advanced startup, boot from install media → Repair.
- WinRE → **Troubleshoot** → **Startup Repair** (auto-fix), **Advanced options**: **System Restore**, **Uninstall Updates**, **Startup Settings** (Safe Mode, Safe Mode with Networking, Enable low-res video, disable driver signature enforcement, disable early-launch anti-malware, boot logging), **Command Prompt** (`bootrec /fixmbr`, `/fixboot`, `/scanos`, `/rebuildbcd`; `bcdedit`; `diskpart`; `sfc /scannow /offbootdir= /offwindir=`; `chkdsk`), **System Image Recovery**, **UEFI Firmware Settings**, **Reset this PC**.

## System Restore
- **System Protection** on the drive → **restore points** (auto before updates/installs, manual); allocate **disk space**; restores registry/system files/programs, **not personal files** (`rstrui.exe`). Note malware-removal procedure disables it temporarily (file 29).

## Roll back
- **Update**: Settings → Update history → **Uninstall updates**, or **Programs and Features → View installed updates** → uninstall; or WinRE → Uninstall Updates.
- **Driver**: **Device Manager → Properties → Driver → Roll Back Driver**.

## Repair / reinstall / reimage
- **Recovery image** - backup used to restore config and files (System Image, or vendor recovery partition).
- **Reset this PC** (Settings → Recovery, or WinRE): **Keep my files** (refresh - reinstalls Windows, keeps data, removes apps) or **Remove everything** (clean); cloud download vs local reinstall.
- **In-place upgrade repair** - run setup from media over the existing install; **clean install** as last resort (back up first!).

## Symptom → fix table (deck content)
| Symptom | Actions |
|---|---|
| **Failure to boot / no OS found** | Remove USB/floppy media set to boot first; check boot order; **`chkdsk`, `bootrec`** from WinRE prompt; **`diskpart`** → verify system partition is **active** (MBR); check drive detected in firmware |
| **GUI fails to load / black screen** | Monitor on & correct **video port/input**; **Safe Mode**; roll back GPU driver; explorer.exe restart |
| **Profile issues** (temp profile, slow logon) | Enable **highly detailed status messages** (GPO) to see where it hangs; check **drivers/services set to load at startup**; **rebuild the local profile** (rename `C:\Users\name`, delete ProfileList key, log in again) |
| **Degraded performance / sluggish** | **Task Manager / PerfMon / ResMon** to find the hog; **reboot**; **update OS, apps, drivers**; **scan for malware**, update AV; check disk space/fragmentation/SSD health; **power management** (power saver plan throttles); startup bloat |
| **BSOD** | Note stop code / **QR code** → research; recent driver/update → roll back; hardware (RAM test `mdsched`, disk, temps); `sfc`, DISM; Event Viewer; minidump analysis |
| **System instability / frequent unplanned shutdowns** | **Overheating**, PSU, **corrupt system files** (sfc), failing hardware, malware |
| **USB issues** | **Controller resource issues** (too many devices, power/bandwidth exceeded - use powered hub), driver, port damage, disable USB selective suspend |
| **Application crashes** | **Update** app; if no change **uninstall/reinstall**; compatibility mode; run as admin; check Event Viewer Application log; dependencies (.NET/VC++) |
| **Services not starting** | Verify **startup type Automatic**, dependencies, log-on account/password, Event Viewer System log; `net start`; recovery actions |
| **Time drift** | While off → **replace RTC battery (CR2032)**; while on → **synchronise with NTP** (`w32tm /resync`), check time zone/domain time hierarchy |
| Slow boot | Startup apps, disk, Fast Startup, drivers |
| Low memory warnings | Close apps, add RAM, check leaks, page file settings |
| No boot after update | Uninstall update in WinRE, System Restore, Safe Mode |

## Self-test
1. RDP port and which editions can *host* it? VNC port? Quick Assist port and its advantage over MSRA?
2. WinRM protocol style and use; SSH auth methods; SPICE purpose.
3. RMM vs MDM vs EDR.
4. Event Viewer main logs and severity levels.
5. Task Manager: how to open (3 ways); which tab sets priority; which shows logical processors/virtualization; which lets you sign out users.
6. Four service startup types.
7. ResMon vs PerfMon; three PerfMon counters.
8. msconfig tabs and what Safe boot: Network does.
9. BIOS boot chain and UEFI boot chain in order.
10. Three ways into WinRE; four `bootrec` switches; where to roll back a driver; how to fix time drift (two causes).
