# 18 · Windows Settings & Configuration (Module 12)

**Exam objectives:** Core 2 · 1.6 Configure Microsoft Windows settings · 1.10 Install applications according to requirements · 1.11 Install and configure cloud-based productivity tools · 1.4 (Control Panel / Administrative Tools).

---

# Lesson 12.1 - User settings

## Interfaces
- **Windows 10**: Start button **bottom-left**. **Windows 11**: Start **centred** on the taskbar (can be moved). Both: taskbar **search**, Task View, notification area, Action/Quick settings.

## Settings vs Control Panel
- **Settings** - modern, touch-friendly; where Microsoft is moving everything.
- **Control Panel** - legacy **applets** (`.cpl`); still needed for some tasks (Devices and Printers, Programs and Features, Network Connections `ncpa.cpl`, Internet Options `inetcpl.cpl`, Mail, BitLocker, Power Options `powercfg.cpl`, System `sysdm.cpl`, User Accounts, Windows Defender Firewall).
- Learners should know **both**.

## Accounts
- **Profile** - settings/config for one user (`C:\Users\<name>`).
- **Microsoft account** (cloud, syncs settings, OneDrive, Store) vs **local account** (device only). Work/school account for AAD/Entra.
- **UAC** settings - prevent unauthorised use of admin privileges (file 22).
- Sign-in options: Windows Hello (PIN, face, fingerprint), security key, password, picture password.

## Privacy
- Microsoft data collection is **default opt-in** - diagnostics/telemetry, ad ID.
- Per-app access toggles: **contacts, calendar, email, files**, location, camera, microphone.

## Desktop settings
- **Time & language**: date/time format, **time zone**, sync; **language** - spelling, localisation, keyboard input, speech recognition.
- **Personalization**: themes, wallpaper, screensaver, colours, fonts, lock screen, taskbar.

## Ease of Access / Accessibility
| Group | Options |
|---|---|
| **Vision** | Cursor size/indicators, high-contrast, colour filters, **Magnifier**, Narrator, text size |
| **Hearing** | Volume, mono audio, **visual notifications**, **closed captions** |
| **Interaction** | Keyboard (Sticky/Filter/Toggle keys, on-screen keyboard), mouse keys, **speech** and **eye control** |

## File Explorer
- GUI file management. Objects: user folder, **OneDrive**, **This PC**, **Network**, **Recycle Bin**, drives, Quick access.
- System folders: `C:\Windows`, `C:\Program Files`, `C:\Program Files (x86)` (32-bit apps), `C:\Users`, `C:\ProgramData` (hidden).

### File Explorer Options (Folder Options)
- **General**: layout, **single- vs double-click**, open in same/new window, privacy (recent files).
- **View**: **hide extensions for known file types** (turn OFF for security - spot `invoice.pdf.exe`), **hidden files and folders**, **hide protected OS files**, default folder view; **Search** options.

## Indexing Options
Builds an index of file contents/properties → faster search. Add/remove locations; rebuild if search misbehaves.

---

# Lesson 12.2 - System settings

## System
Display, sound, notifications, **power**, **remote desktop**, **clipboard** (history/sync), **About** (edition, version, spec, rename PC), storage, multitasking.

## Update & Security
- **Windows Update** - OS + Microsoft products + drivers; **feature updates** vs **quality/cumulative updates**; **patch** = minor fix; pause/defer/active hours; update history; **uninstall an update** (file 21).
- **Windows Security** - **Defender antivirus**, **firewall**, account protection, device security (TPM/Secure Boot).
- **Activation** - anti-piracy; digital licence or product key.
- Backup (File History), Recovery (Reset this PC, Advanced startup), Troubleshoot.

## Devices
- **Bluetooth & devices** - pair; **printers & scanners**; **mouse/touchpad/pen/AutoPlay**; **Mobile devices** (Phone Link).
- Legacy **Devices and Printers** (Control Panel) - manually add.

## Display & Sound
- **Scale** (125% etc. for high-DPI), **resolution** (use native), **refresh rate (Hz)**, **colour calibration/HDR/night light**, **multiple displays** (extend/duplicate/second screen only, primary, arrangement), orientation.
- **Sound**: choose **output/input device**, levels, app volume mixer, spatial sound.

## Power options
| State | What happens |
|---|---|
| **Sleep / standby / suspend (S3)** | Cuts power to most devices, **keeps RAM powered**; instant resume |
| **Hibernate (S4)** | **Saves RAM contents to disk** (`hiberfil.sys`), **powers off everything**; slower resume, survives power loss |
| Hybrid sleep / Fast Startup | Combination |
| **Power plans** | **Power saver / Balanced / High performance** (+ Ultimate); screen-off & sleep timers; **power button/lid actions**; USB selective suspend; `powercfg.cpl`, `powercfg /energy`, `/batteryreport` |

## Apps
- **Apps & Features** - view/**uninstall**, modify, **default apps**, **startup apps**, optional features, **Windows Features** (Hyper-V, .NET 3.5, SMB1, IIS, **WSL** - Windows Subsystem for Linux, run a distro without a VM).
- **Store apps** run in a **restricted sandbox**, **don't need admin** to install.
- Legacy **Programs and Features** (`appwiz.cpl`) - uninstall desktop programs, **View installed updates**, Turn Windows features on/off.
- **Mail** applet - Outlook profiles. **Gaming** - Game Mode (suspends updates, prioritises game).

## Network settings
- **Network & Internet** - status, Wi-Fi, Ethernet, VPN, mobile hotspot, airplane, proxy, **advanced network settings** → adapters (**Network Connections `ncpa.cpl`** to change IP properties), **Network and Sharing Center**, **advanced sharing** (network discovery, file/printer sharing per profile), **Windows Defender Firewall**, **Internet Options** (system-wide browser/proxy settings). Detail in file 20.

## Administrative Tools (Windows Tools) - memorise the filenames
| Tool | Run |
|---|---|
| Computer Management | `compmgmt.msc` |
| Defragment & Optimize Drives | `dfrgui.exe` |
| Disk Cleanup | `cleanmgr.exe` |
| Event Viewer | `eventvwr.msc` |
| Local Security Policy | `secpol.msc` |
| Resource Monitor | `resmon.exe` |
| Performance Monitor | `perfmon.msc` / `perfmon.exe` |
| Registry Editor | `regedit.exe` |
| Services | `services.msc` |
| Task Scheduler | `taskschd.msc` |
| Device Manager | `devmgmt.msc` |
| Disk Management | `diskmgmt.msc` |
| Local Users and Groups | `lusrmgr.msc` |
| Group Policy Editor | `gpedit.msc` |
| Certificates | `certmgr.msc` (user) / `certlm.msc` (computer) |
| System Information | `msinfo32.exe` |
| System Configuration | `msconfig.exe` |
| Windows Memory Diagnostic | `mdsched.exe` |
| Print Management | `printmanagement.msc` |
| Task Manager | `taskmgr.exe` / Ctrl+Shift+Esc |
| DirectX Diagnostic | `dxdiag` |
| Remote Desktop | `mstsc.exe` |
| System Properties | `sysdm.cpl` |

## Management shortcuts
- **Win + X** (or right-click Start) - power-user menu: Device Manager, Disk Management, Terminal (Admin), Run, etc.
- **Instant search** from Start; **Run dialog** (**Win + R**) - type any of the above filenames.
- Win + I Settings · Win + E Explorer · Win + L lock · Win + D desktop · Win + Tab task view.

---

# Lesson 12.3 - Installing applications

## System requirements
- **CPU** (clock, cores, architecture), **memory**, **storage** (free space), **graphics** (GPU/VRAM/DirectX), **external hardware token** (smart card / USB key for licensing or auth).
- **OS requirements**: version, **64-bit vs 32-bit** (32-bit app runs on 64-bit OS; not the reverse).

## Distribution methods
- **Physical media** (CD/DVD, USB), **download** from vendor, **mount an ISO** directly in Windows (double-click), package managers/winget, Store, network deployment (GPO/MDM). **UAC** prompts to confirm changes.

## Other considerations
- **Business impacts** - licensing, support, training.
- **Operational impacts** - deployment, updating, maintenance.
- **Device & network impacts** - local resources, **network bandwidth**.

---

# Lesson 12.4 - Cloud-based applications

- **Email**: Outlook on the web (Microsoft 365), Gmail (Google Workspace).
- **Storage**: **OneDrive, Google Drive, iCloud** - sync across platforms; Files On-Demand.
- **Collaboration**: Office 365 / Google Docs & Slides - **simultaneous multi-user editing**, near-real-time sync with change tracking; **videoconferencing** - Zoom, Teams, Slack (video/audio/chat/screen share).
- **Licensing**: **personal vs commercial**, multi-user, **enterprise admin portal** issues licences to accounts.
- **Identity synchronization**: one **cloud identity** across apps; **single sign-on (SSO)** / **federated** access (SAML/OAuth); Entra ID Connect syncs on-prem AD to the cloud.

## Self-test
1. Where's the Start button on Win 10 vs 11?
2. Name five Control Panel applets still relevant.
3. Microsoft vs local account - two differences.
4. Vision / hearing / interaction - one accessibility option each.
5. Why turn off "hide extensions for known file types"?
6. Sleep vs hibernate - RAM powered? Data where?
7. Three power plans.
8. What is WSL? Do Store apps need admin?
9. Run commands for: Event Viewer, Local Security Policy, Services, Task Scheduler, Disk Management, Device Manager, Group Policy, System Info, msconfig, Local Users and Groups.
10. Win+X does what? What's a hardware token requirement?
