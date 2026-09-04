# 25 · macOS Features (Module 17, Lesson 17.3)

**Exam objectives:** Core 2 · 1.8 Explain common features and tools of the macOS/desktop operating system.

## Interface
| Feature | Details |
|---|---|
| **Menu bar** | Top of screen - Apple menu (left), app menus, status icons (right: Wi-Fi, battery, Control Center, Spotlight, clock) |
| **Dock** | Bottom (or side) - one-click apps, running indicators, Downloads stack, Trash |
| **Spotlight** | **Cmd + Space** - search files, apps, settings, web, calculations |
| **Finder** | The **file manager** (= File Explorer); sidebar (Favorites, iCloud, Locations); Get Info (= Properties); tags |
| **Terminal** | CLI (zsh default; bash earlier) - same Unix commands as file 24 |
| **Mission Control** | Overview of windows and **multiple desktops (Spaces)**; **F3** / swipe up; add desktops top-right |
| Launchpad, Notification Center, Control Center, Stage Manager | Other UI |
| **Force Quit** | Apple menu → Force Quit, or **Cmd + Option + Esc**, for unresponsive apps |
| Keyboard | **Command ⌘ ≈ Windows Ctrl** (Cmd+C/V/Q), **Option ⌥ ≈ Alt**, **Control ⌃**; screenshot Cmd+Shift+3/4/5 |

## System folders
| Path | Contents |
|---|---|
| **/Applications** | Installed apps (`.app` bundles) |
| **/Library** | **System-wide** resources, settings, fonts, launch agents |
| **/System** | **Core OS files** - protected (SIP) |
| **/Users** | User home folders (Desktop, Documents, Downloads, Pictures…) |
| **~/Library** (`/Users/name/Library`) | **Hidden per-user** prefs, caches, app support (hold Option in Finder Go menu) |
| /Volumes | Mounted drives |

## System Settings (formerly System Preferences)
- **Displays** - scaling/resolution, arrangement, Night Shift, refresh rate.
- **Accessibility** - vision (VoiceOver, zoom, contrast), hearing, motor.
- **Network** - Wi-Fi/Ethernet, **Details/Advanced → TCP/IP (IP, DHCP/manual), DNS, Proxies, 802.1X**; VPN.
- **Users & Groups** - accounts (Admin/Standard/Sharing Only), login items, **Apple ID** (App Store purchases, **iCloud sync/storage**), Family.
- **Privacy & Security** - **analytics/telemetry**, app **permissions** (camera, mic, location, full disk access), Gatekeeper (App Store / identified developers), **FileVault**, Firewall, Lockdown Mode.
- **Internet Accounts** - mail/calendar accounts (Google, Exchange).
- **General → Software Update, Storage, Sharing (Screen Sharing/Remote Login SSH/File Sharing SMB), Time Machine, Startup Disk, Login Items**.
- **Printers & Scanners** - add/manage (AirPrint, IPP).
- **Keyboard/Trackpad/Mouse**, Sound, Bluetooth, Battery, Screen Time.

## Security & user management
- **Keychain (Keychain Access / Passwords app)** - encrypted store of passwords, certificates, keys; **iCloud Keychain** syncs.
- **FileVault** - **full-disk encryption** (APFS); recovery key / iCloud escrow.
- **Gatekeeper** & notarisation; **XProtect** built-in anti-malware; **SIP** (System Integrity Protection); firewall; **Find My Mac** + Activation Lock; MDM via **Apple Business Manager** (corporate restrictions).
- Antivirus: keep updates enabled if third-party AV used.

## iCloud & Continuity
- **iCloud**: Mail, Contacts, Calendar, Photos, Notes, Reminders, **iCloud Drive** (files/desktop & documents sync), backup of iOS devices, Keychain.
- **FaceTime** (audio/video), **iMessage** (Apple messaging).
- **Continuity**: **Handoff** (start on one device, finish on another), Universal Clipboard, Sidecar (iPad as display), Continuity Camera, iPhone calls/SMS on Mac, Universal Control.
- **AirDrop** - direct Wi-Fi/Bluetooth file sharing between Apple devices (Everyone/Contacts Only/Off - receiving setting).

## App installation & management
| Item | Notes |
|---|---|
| **App Store** | Apps, **OS updates**; **Apple ID required**; auto-update toggle |
| **.dmg** | **Disk image** (like Windows ISO) - mount, drag app to /Applications, eject |
| **.pkg** | **Installer package** - wizard-based install (may need admin) |
| .app | The application bundle itself |
| **Uninstall** | **Drag app to Trash** (some have uninstallers / leave prefs in ~/Library) |
| Security settings | System Settings → Privacy & Security to allow apps from identified developers / "Open Anyway" |
| Corporate | Restrictions via **Business Manager** / MDM |
| Homebrew | CLI package manager (`brew install`) |

## OS & app updates
- **App Store** - enable automatic app updates.
- **macOS updates** - **System Settings → General → Software Update**; enable automatic.
- **Rapid Security Response (RSR)** - small **security updates direct from Apple** between releases; **best practice: enable automatic install**.

## Network & device settings
- Network status menu → **Advanced/Details** → configure **IP, DNS, Wi-Fi** options; Wi-Fi diagnostics (Option-click Wi-Fi icon).
- **Printers & Scanners** - add/manage.
- **Disk Utility** - **verify/repair disks and file systems (First Aid)**, erase/format (**APFS**, Mac OS Extended/HFS+, exFAT, MS-DOS/FAT), partition, RAID, mount images.
- Activity Monitor (= Task Manager), Console (= Event Viewer), System Information (About This Mac → System Report), Terminal `top`, `diskutil`, `networksetup`.

## Time Machine backup
- Built-in **backup utility using a separate physical drive or partition** (or NAS/Time Capsule); drive **must be APFS** (or HFS+ older) formatted.
- Hourly/daily/weekly snapshots; **auto-deletes oldest backups when full**; browse & restore files by date; **Migration Assistant** restores whole Mac; **local snapshots** on the internal SSD.

## Troubleshoot crashes & boot issues
- **Force Quit** unresponsive apps (Apple menu / Cmd+Opt+Esc); Activity Monitor → Quit process.
- **Spinning wait cursor ("pinwheel")** = hung app / low resources.
- **Kernel panic** - restart, check peripherals/RAM, update.
- **Recovery (macOS Recovery)**: Intel - hold **Cmd + R** at power-on until Apple logo; Apple Silicon - hold power button → Options. Tools: **Reinstall macOS** (downloads a fresh copy if Internet available), **Disk Utility**, **Restore from Time Machine**, Terminal, Startup Security Utility. Internet Recovery: Cmd+Option+R.
- **Safe Mode**: hold **Shift** at boot (Intel) - minimal drivers, clears caches.
- Reset **NVRAM/PRAM** (Cmd+Opt+P+R) and **SMC** on Intel Macs for power/display/fan oddities.
- Startup Disk / boot options: hold Option (Intel) for boot picker.

## Self-test
1. Spotlight shortcut; Mission Control key; Force Quit shortcut.
2. Which macOS key equals Windows Ctrl? Alt?
3. /Applications, /Library, /System, /Users, ~/Library - one line each.
4. Keychain vs FileVault vs Gatekeeper.
5. .dmg vs .pkg; how do you uninstall most Mac apps?
6. Where are macOS updates? What is Rapid Security Response?
7. AirDrop receiving options; Handoff is part of what?
8. Time Machine drive format and behaviour when full.
9. Disk Utility's repair feature name; the macOS equivalent of Task Manager.
10. How to enter Recovery on Intel and Apple Silicon; what can Recovery do if online?
