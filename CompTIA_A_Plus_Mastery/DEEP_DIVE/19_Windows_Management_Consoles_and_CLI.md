# 19 · Windows Management Consoles & Command-Line Tools (Module 13, Lessons 13.1-13.2)

**Exam objectives:** Core 2 · 1.4 Use Microsoft Windows OS features and tools · 1.5 Use the appropriate Microsoft command-line tools.

---

# Lesson 13.1 - Management consoles

Most are **MMC snap-ins** (`.msc`). **Computer Management (`compmgmt.msc`)** bundles Task Scheduler, Event Viewer, Shared Folders, Local Users and Groups, Performance, Device Manager, Disk Management, Services.

## Device Manager (`devmgmt.msc`)
- **Update drivers** (auto or browse), view **driver info/version**, **Roll Back Driver**, **troubleshoot** malfunctioning devices (built-in troubleshooter), **disable** (keeps driver, stops device), **uninstall** (removes driver), scan for hardware changes, view hidden devices, resources.
- Status icons: **yellow ⚠** = problem/no driver; **↓ arrow** = disabled; error codes (Code 10 cannot start, Code 43 reported a problem, Code 28 no driver).
- Some devices can also be disabled in **BIOS/UEFI**. Some hardware is **hot-swappable**, some needs power-off.

## Disk Management (`diskmgmt.msc`)
- Manage fixed/removable disks: **initialize** (choose **MBR/GPT**), **partition** (New Simple Volume), **format** (NTFS/FAT32/exFAT, allocation unit, label, quick), assign/change **drive letter or mount path**, **extend/shrink** volumes (needs adjacent unallocated space to extend), **delete**, mark active, convert basic → dynamic, storage spaces.
- Disk status: Online, Offline, Not Initialized, Unallocated, Healthy, RAW (no valid FS).
- **Primary vs extended/logical** (MBR only): max 4 primaries, or 3 + 1 extended holding logical drives.

## Disk maintenance
- **Defragment & Optimize (`dfrgui`)** - HDD: **reorganises data into contiguous clusters**; SSD: runs **TRIM** instead (never "defrag" an SSD manually). Scheduled weekly by default.
- **Disk Cleanup (`cleanmgr`)** - removes temp files, Recycle Bin, thumbnails, **old Windows installations (Windows.old)** and superseded updates ("Clean up system files"). Storage Sense automates.

## Task Scheduler (`taskschd.msc`)
- **Automate** tasks at intervals or on **triggers** (logon, event, idle, startup); actions (run program/script); conditions; **history/logging** for troubleshooting failures. Uses: **updates, backups, sync scripts**. CLI: `schtasks` (Lab 27).

## Local Users and Groups (`lusrmgr.msc`)
- Advanced local account management (not in Home - use `net user`); create/modify users, reset passwords, disable, **security groups** for permission assignment (Lab 33). Domain equivalent = Active Directory Users and Computers.

## Certificate Manager
- **`certmgr.msc`** = current **user** certificates; **`certlm.msc`** = **local machine/computer** certificates. Manage trusted roots, personal certs, view details, import/export.

## Group Policy Editor (`gpedit.msc`)
- **Local** policies for computer and user configuration - settings without direct registry edits, applied system-wide (password policy, UAC, removable storage, desktop lockdown). Domain: GPMC on a DC. `gpupdate /force`, `gpresult /r`.

## Registry Editor (`regedit`)
- Hierarchical DB of OS/user/hardware/app settings. **Five root keys**:
 - **HKEY_CLASSES_ROOT (HKCR)** - file associations, COM
 - **HKEY_CURRENT_USER (HKCU)** - logged-on user's settings
 - **HKEY_LOCAL_MACHINE (HKLM)** - machine-wide hardware/software/security
 - **HKEY_USERS (HKU)** - all loaded user profiles
 - **HKEY_CURRENT_CONFIG (HKCC)** - current hardware profile
- Keys, subkeys, values (String, DWORD, Binary…). **Back up (export) before editing.** Startup entries: `HKLM/HKCU\Software\Microsoft\Windows\CurrentVersion\Run` (Lab 26).

## Custom MMC
- `mmc.exe` → File → Add/Remove Snap-in → build a **console with all the snap-ins you need in one place**; save as `.msc`; can target remote computers.

---

# Lesson 13.2 - Command-line tools

## Command Prompt basics
- Open `cmd`; **Run as administrator** for elevated tasks (UAC).
- **Syntax**: `command /switch argument`. **`Ctrl+C`** stops a running command. **Help**: `command /?` or `help command`. `help | more` pages output; `cls` clears; **F7** history; ↑ recalls last command; `exit`.
- PowerShell is the modern shell (cmdlets `Verb-Noun`, e.g. `Get-Process`); most cmd commands work in it.

## Navigation
| Command | Notes |
|---|---|
| `dir` | List. Switches: `/o:` order (**n**ame, **s**ize, **e**xtension, **d**ate), `/t:` time field (**c**reated, **a**ccessed, **w**ritten), `/a:` attributes (**r**ead-only, **h**idden, **s**ystem, **a**rchive), `/s` subdirs, `/p` page, `/w` wide |
| `cd` (`chdir`) | `cd folder`, `cd ..` (up one), `cd \` (root), `cd` alone shows current dir, `cd /d D:\path` change drive+dir |
| `D:` | Type a drive letter + colon to change drive |
| `tree` | Show folder tree |

## File management
| Command | Notes |
|---|---|
| `md` / `mkdir` | Make directory - creates intermediate dirs; `md a\b\c`; multiple: `md f1 f2` |
| `rd` / `rmdir` | Remove directory; **`/s`** removes non-empty (with subdirs); `/q` quiet |
| `copy` | Single/simple copies; `copy src dst` |
| `xcopy` | Copies trees; **`/s`** subdirs (non-empty), **`/e`** subdirs **including empty**, `/h` hidden, `/y` no prompt |
| **`robocopy`** | Robust - **recommended for long filenames, NTFS attributes**, resumable after network interruption, skips identical files, **`/mir`** mirrors, `/e`, `/z`, `/mt` multithread, `/log:` |
| `move` | Move/rename; wildcards `move file* ..\dest` |
| `ren` / `rename` | Rename |
| `del` / `erase` | Delete files; wildcards `del *doc2*`; `del *.*` all; `/s`, `/q`, `/f` |
| `type` / `more` | Show file contents (`more` pages) |
| `echo text > file.txt` | Create/overwrite; `>>` appends |
| `attrib` | View/set +r +h +s +a attributes |
| `find` / `findstr` | Search text in files |

## Disk management commands
| Command | Notes |
|---|---|
| **`diskpart`** | CLI Disk Management. `list disk` → `select disk 1` → `detail disk` → `list partition` → `select partition 1` → `create partition primary [size=]` → `format fs=ntfs quick [label=]` → `assign [letter=]` → `delete partition` → `extend` → `active` → `clean` (wipes) → `convert gpt` → `exit`. Also `list volume`, `select volume` |
| **`format`** | Erase and reformat: `format E: /fs:NTFS /q /v:label` |
| **`chkdsk`** | Scan FS and sectors: `/f` fix errors, `/r` locate bad sectors & recover (implies /f), `/x` dismount; on system drive schedules at reboot |
| `convert` | `convert E: /fs:ntfs` FAT32→NTFS without data loss (Lab 09) |
| `defrag` | CLI defrag/optimise |

## System management commands
| Command | Notes |
|---|---|
| **`shutdown`** | `/s` shutdown, `/r` restart, `/h` hibernate, `/l` log off, **`/t nn`** delay seconds, `/a` abort, `/f` force, `/m \\pc` remote, `/o` advanced boot options. `shutdown /r /t 45` restarts in 45 s |
| **`sfc /scannow`** | System File Checker - verify/repair protected system files (run elevated; `/verifyonly`, `/scanfile=`) |
| **`DISM`** | `DISM /Online /Cleanup-Image /RestoreHealth` repairs the component store when SFC can't (Lab 24) |
| **`winver`** | Windows version dialog |
| **`whoami`** | Current user (`/groups`, `/priv`) |
| `hostname` | Computer name |
| `systeminfo` | Detailed system summary |
| **`tasklist`** | Running processes with PIDs; `/svc`, `/fi "imagename eq x"`, `/s \\pc` remote |
| **`taskkill`** | `/pid n /f`, `/im name.exe /f`, `/t` tree |
| `schtasks` | Create/query/run/delete scheduled tasks |
| **`gpupdate`** | Refresh Group Policy (`/force` all) |
| **`gpresult`** | Show applied policy (`/r` summary, `/h file.html`) |
| **`net user`** | List/manage accounts: `net user bob P@ss /add`, `/delete`, `/active:no` |
| `net localgroup` | `net localgroup administrators bob /add` |
| **`net use`** | Map drives: `net use Z: \\server\share /persistent:yes`; `net use * /delete` |
| `net share`, `net view`, `net start/stop <service>` | Shares, browse, control services (`net stop spooler`) |
| `set` | Environment variables |
| `path` | Show/set PATH |
| `wmic` (deprecated) / PowerShell `Get-CimInstance` | Hardware queries |

Network commands (`ipconfig`, `ping`, `tracert`, `pathping`, `nslookup`, `netstat`, `arp`, `netsh`) are in file 20.

## Self-test
1. Disable vs uninstall in Device Manager. Yellow ⚠ vs ↓ arrow.
2. What does "optimize" do on an SSD vs HDD?
3. Which console for scheduling, for local users, for user certificates vs machine certificates?
4. Five registry root keys.
5. `dir /o:s` vs `dir /a:h`; how do you page long output?
6. `xcopy /s` vs `/e`; why prefer robocopy? What does `/mir` do?
7. `rd` on a non-empty folder - which switch?
8. Full diskpart sequence to create and format a partition.
9. `chkdsk /f` vs `/r`; `sfc /scannow` vs DISM.
10. `shutdown /r /t 45`; `net use`; `gpupdate /force`; `taskkill` by PID and by name.
