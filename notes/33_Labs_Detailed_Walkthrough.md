# 33 · All 34 Labs - Detailed Walkthrough

Every lab in `Labs for A+`, what it teaches, which exam objective it serves, and the exact steps/commands to practise. Do the CLI labs (21-24) in a throwaway VM and **type every command**. Lab 31 is missing from the folder.

Priority key: ★★★ do it hands-on · ★★ do it once · ★ read it

---

## Lab 01 · Install an OS ★★
**Objective:** Core 2 1.2. **Task:** access Azure, download Windows Server + Windows 11 ISOs, open **Hyper-V Manager**, create a VM, install each OS as a VM.
- Enable Hyper-V: *Turn Windows features on or off* → Hyper-V (needs Pro/Enterprise + VT-x/AMD-V on in firmware).
- New VM wizard: Gen 2 (UEFI, Secure Boot), memory, virtual switch (Default Switch = NAT), VHDX size, mount ISO. Start → Connect → install.
- This is also the environment for **all** later Windows labs. Take a **checkpoint** after a clean install so you can revert.

## Lab 02 · Investigate BIOS/UEFI settings ★★★
**Objective:** Core 1 3.5 (firmware). Power on → press the setup key during POST (Del/F2/F10/F12/Esc - vendor specific). Record: **key used, firmware manufacturer, version**. Explore **main menus, security settings** (admin/user password, Secure Boot, TPM), **CPU** (speed, cores), **RAM** (speed, size), **HDD** info, **boot order** (first device, how many slots), then **set optical first, HDD second**; find **power management/ACPI**, **PnP**, **splash screen** settings; **save & exit**.
- Why optical first? To boot install media. No bootable disc → falls through to next device. No OS installed → "OS not found" is expected.

## Lab 03 / 10 · Install Windows 10 ★★
**Objective:** Core 2 1.2. Boot from media → language/time/keyboard → **Install now** → key (or skip) → edition → licence → **Custom: Install Windows only** → select unallocated space → **New** → apply (creates system/MSR/recovery partitions automatically) → format NTFS → install → reboots → **OOBE** (region, keyboard, network, account, privacy toggles).

## Lab 04 · Build and test a network cable ★★★
**Objective:** Core 1 3.1/2.8. **Straight-through UTP**, both ends **T568B** (or both T568A).
1. Cut to length, **strip ~1 inch** of jacket (don't nick conductors).
2. Untwist minimally, order **W-Or, Or, W-Gr, Bl, W-Bl, Gr, W-Br, Br** (pins 1→8, clip down).
3. Flatten, trim to **~½ inch**, insert fully into RJ-45 (copper visible at the tip, jacket inside the plug).
4. **Crimp**. Repeat other end.
5. **Cable tester** - LEDs 1-8 light in sequence on both units; a wrong order/open shows.
- Know T568A too (swap orange/green pairs). Crossover = A one end, B other.

## Lab 05 · Configure a NIC to use DHCP ★★★
**Objective:** Core 2 1.7 / Core 1 2.5. Two PCs on a switch/router with DHCP.
- `ncpa.cpl` → adapter → Properties → **IPv4** → **Obtain IP automatically / Obtain DNS automatically**.
- `ipconfig /all` - record IP, mask, gateway, DHCP server, DNS, lease. `ipconfig /release` then `/renew`. Verify **not 169.254.x.x**.
- `ping` the other PC (may need to allow ICMP in the firewall / private profile). Optionally set a **static** IP on both and re-test.

## Lab 06 · Configure a wireless network ★★★
**Objective:** Core 1 2.6 / Core 2 2.10. Cable PC → router LAN port → browse to router IP (192.168.0.1/1.1) → default creds → **change admin password** → wireless: **change SSID**, set **WPA2-AES/WPA3**, **strong passphrase**, choose **channel**/band, save. Connect the laptop to the new SSID; verify Internet.
- Also look at: DHCP scope, guest network, firmware update, WPS off.

## Lab 07 · Configure firewall settings (MAC filter, DMZ, port forwarding) ★★★
**Objective:** Core 2 2.10. In the router GUI:
- **MAC filtering** - enable, allow-list mode, add a client MAC (`ipconfig /all` → Physical Address). Test that unlisted devices are blocked.
- **DMZ host** - point at one internal IP; understand it exposes *all* ports → prefer specific rules.
- **Single port forwarding** - external port (e.g. 80) → internal IP + port (web server). Host needs a **static IP / reservation**.

## Lab 08 · Troubleshoot network problems ★★
**Objective:** Core 1 5.7. Instructor introduces faults (unplugged cable, wrong IP/mask/gateway, wrong DNS, disabled NIC, wrong Wi-Fi password). You **document** symptom → steps → fix using the methodology: `ipconfig /all`, ping ladder, check link lights, adapter status, `nslookup`.

## Lab 09 · Create a partition in Windows ★★★
**Objective:** Core 2 1.4/1.5. **Disk Management**: shrink C: → unallocated → **New Simple Volume** → size → letter → **FAT32** (note: GUI allows FAT32 ≤32 GB) → label. Copy a file. Then **`convert E: /fs:ntfs`** (non-destructive) - compare **FAT32 vs NTFS** properties (Security tab appears; 4 GB file limit gone; compression/encryption/quotas available). Delete the volume, extend C: back.

## Lab 11 · Finalize the Windows installation ★
**Objective:** Core 2 1.2/1.6. Add **user accounts** (Settings → Accounts → Family & other users; local vs Microsoft; standard vs admin), set **name/time zone**, run **Windows Update**, check **Device Manager** for missing drivers, activate, personalise, verify network.

## Lab 12 · Explore the Windows desktop ★
Start menu (pin/unpin, tiles/all apps), taskbar (pin, jump lists, position, notification area, hidden icons), search, Task View/virtual desktops, Action Center/Quick Settings, keyboard shortcuts.

## Lab 13 · Work with Task Manager ★★
**Objective:** Core 2 1.4. **Ctrl+Shift+Esc**. Open a browser → **Processes** tab (sort CPU/memory; expand app to see child processes) → **End task**. **Performance** tab (CPU logical processors, virtualization; memory in use/committed/cached; disk; network/Wi-Fi). **App history**, **Startup** (disable an item, note *Startup impact*), **Users** (disconnect/sign out), **Details** (set priority, PID), **Services**.

## Lab 14 · Working with File Explorer ★
Navigate; ribbon/View → **show hidden items, show file extensions**; **Folder Options** (single-click, hide protected OS files); properties (size on disk, attributes R/H); create/rename/move/copy/delete; Recycle Bin restore; libraries/Quick access; search & indexing.

## Lab 15 · Explore Control Panel categories ★
System and Security, Network and Internet, Hardware and Sound, Programs, User Accounts, Appearance, Clock and Region, Ease of Access; switch to **small icons** view to see every applet; find: Programs and Features, Device Manager, Power Options, Windows Defender Firewall, Administrative Tools, Sound, Mouse, BitLocker.

## Lab 16 · User accounts ★★
Create a **standard** local user via Control Panel/Settings; log in as it → try installing software → **UAC** prompts for admin credentials; change account **type** (standard ↔ administrator); set password/hint; picture; delete account (keep/delete files).

## Lab 17 · Use Device Manager ★★
`devmgmt.msc` - expand categories; **Properties → Driver tab** (provider, date, version, **Update / Roll Back / Disable / Uninstall**); Details/Events/Resources; **View → Show hidden devices**; find the display adapter and **monitor** (Settings → Display → Advanced → adapter properties, refresh rate, resolution).

## Lab 18 · Monitor and manage system resources ★★★
**Objective:** Core 2 1.4. **Administrative Tools**:
- **Event Viewer** - Windows Logs → System/Application/Security; filter by level; open an event; **create a custom view**.
- **Services** - find a service (e.g. Print Spooler), Properties → **startup type** (Automatic / Delayed / Manual / Disabled), stop/start; note dependencies.
- **Performance Monitor** - add counters (**% Processor Time, Avg. Disk Queue Length, Memory Pages/sec, Paging File % Usage**); create a **Data Collector Set**; view report.
- **Resource Monitor** - CPU/Memory/Disk/Network tabs; which process holds a file.
- **Computer Management** shortcuts to all of these.

## Lab 19 · System utilities ★★★
**msconfig** (General/Boot - Safe boot; Services - hide Microsoft; Tools), **regedit** (navigate HKCU/HKLM; **export** a key before change; find a value), **msinfo32**, **dxdiag**, **Disk Cleanup**, **Defragment/Optimize**, **System Properties (`sysdm.cpl`)** - computer name, remote, system protection, advanced (performance/virtual memory, environment variables, startup and recovery).

## Lab 20 · Manage system files ★★
**System File Checker `sfc /scannow`** (elevated), review `CBS.log`; **`msinfo32`** for system summary; **`dxdiag`**; **`winver`**; system folder locations; system restore point creation.

## Lab 21 · Work in the Windows command shell ★★★
Open **cmd**; `help`, `help | more` (space = next page; Enter = next line; q/Ctrl+C exit); `command /?`; fill the function table for **CD, CHKDSK, COPY, DEL, DIR, DISKPART, EXIT, FORMAT, GPRESULT, MD, TASKLIST, RD, ROBOCOPY, SHUTDOWN, XCOPY**; `md /?` → **`md a\b\c`** creates nested dirs in one go; verify with **`dir /s`** or `tree`; **`cls`**; **F7** history; ↑ recall; `exit`.

## Lab 22 · File system commands ★★★
```
cd                        (show current dir)
dir
md ITEfolder1
md ITEfolder2 ITEfolder3
cd ITEfolder3
md ITEfolder4\ITEfolder5   (or md ITEfolder4 then cd + md)
cd ..                     (up one)  cd \  (root)
cd ..\ITEfolder1
echo This is doc1.txt > doc1.txt      (create files; > redirect)
type doc1.txt / more doc1.txt
move doc2.txt C:\Users\ITEUser\ITEfolder2
copy doc2.txt doc2_copy.txt
move doc2_copy.txt ..\ITEfolder1
copy doc2.txt ..\ITEfolder1\doc2_new.txt
move doc2.txt ..\ITEfolder1\doc2_move.txt
dir ..\ITEfolder1          (list another dir without leaving)
move file* ..\ITEfolder3   (wildcard)
ren doc2_new.txt file.log
del *doc2*                 (delete matching)   del *.*  (all files)
xcopy ..\ITEfolder3 .      (files only; . = here)
xcopy /E ..\ITEfolder3 .   (with subdirs incl. empty)   /S = non-empty subdirs
robocopy /E src dst        (robust; resumable; mirror with /MIR)
rd ITEfolder2              (empty only)
rd /S ITEfolder1           (non-empty; confirm)
```
Reflection: CLI advantages - scripting/automation, remote/headless use, precision, speed, less resource use.

## Lab 23 · Disk CLI commands ★★★
- **`chkdsk`** options (`/?`); `chkdsk` (read-only report), `chkdsk C: /f` → "volume in use… schedule at next restart? Y"; `/r` finds bad sectors.
- **`diskpart`** (elevated): `list disk` → `select disk 0` → `list partition` → `list volume` → `select volume 3` → `help shrink` → **`shrink desired=500`** → **`create partition primary`** (also `extended` / `logical` on MBR) → `list partition` (* = selected) → `list volume` (new one is **RAW**) → **`format fs=ntfs label=new`** (or `quick`) → **`assign letter=w`** → verify; format from cmd too: `format W: /fs:fat32`. Cleanup: `select volume 4` → **`delete volume`** → `select volume 3` → **`extend`** → `list partition`.

## Lab 24 · Task and system CLI commands ★★★
- **`tasklist`** - all processes + PID; `tasklist /?`; **`tasklist /FI "imagename eq notepad.exe"`** filter; `/svc`, `/v`.
- **`taskkill`** - `taskkill /PID 3128`; **`taskkill /IM iexplore.exe`**; **`/T`** kills child tree; **`/F`** force.
- **`shutdown`** - review `/?` (`/i /l /s /r /g /a /p /h /e /o /hybrid /t`); e.g. `shutdown /r /t 60`, then `shutdown /a` to abort.
- **`sfc /?`, `sfc /scannow`** - repairs system files.
- **`DISM`** - `DISM /Online /Cleanup-Image /CheckHealth`, `/ScanHealth`, **`/RestoreHealth`** repairs the image SFC draws from; syntax `DISM.exe {/Image:<path> | /Online} [options]`.
- `gpupdate /force`, `gpresult /r`.

## Lab 25 · Windows Remote Desktop and Assistance ★★★
Two PCs, same LAN.
- **Remote Desktop**: on the *host* (Pro+): Settings → System → **Remote Desktop → On**; add user to Remote Desktop Users; note IP/name; firewall rule auto-enabled (**TCP 3389**). On the *client*: **`mstsc`** → computer → creds → session (host console locks). Options: display, local resources (drives/printers/clipboard), experience.
- **Remote Assistance**: `msra` → *Invite someone* → **save invitation file + password** → give to helper → helper opens file, enters password → user **accepts** → view, **chat**, **Request control** → user allows. Compare with **Quick Assist** (code, HTTPS 443, no firewall changes).

## Lab 26 · Manage the Startup folder ★★
- **Startup folder**: `shell:startup` (user) / `shell:common startup` (all users) = `C:\Users\<u>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`; drop a **shortcut** (e.g. to Notepad/IE) → reboot → it launches.
- **Registry Run key**: `regedit` → **`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`** (or HKLM) → New String Value → name + path. Export first.
- **Task Manager → Startup** tab to disable either.

## Lab 27 · Schedule a task (GUI and CLI) ★★
- **Task Scheduler** → Create Basic Task → name → trigger (daily/weekly/at logon) → action *Start a program* (e.g. `cleanmgr.exe`) → finish; Properties → run with highest privileges, conditions; **Run** to test; History tab.
- **CLI**: `schtasks /create /tn "Cleanup" /tr cleanmgr.exe /sc weekly /d MON /st 09:00`; `schtasks /query /tn "Cleanup"`; **`schtasks /run /tn "Cleanup"`**; `schtasks /delete /tn "Cleanup"`.

## Lab 28 · System Restore and hard drive backup ★★★
- **System Restore**: `sysdm.cpl` → System Protection → **Configure** (turn on, disk usage) → **Create** restore point → make a change (install app / registry edit) → **`rstrui`** → choose point → restore → verify change reverted; personal files untouched.
- **Backup**: Control Panel → **Backup and Restore (Windows 7)** → set up backup to second partition/external → let Windows choose or pick files/**system image** → schedule → run → **Restore** a file. Also **File History** (Settings → Update & Security → Backup → add drive) → restore previous versions.

## Lab 29 · Troubleshoot OS problems ★★
Instructor breaks things (service disabled, startup item, wrong display driver, missing boot file, corrupted profile). Use methodology + tools: Event Viewer, msconfig/Safe Mode, System Restore, sfc/DISM, Device Manager roll back, WinRE Startup Repair, `bootrec`. **Document** problem → cause → solution.

## Lab 30 · BitLocker and BitLocker To Go ★★★
Pro/Enterprise/Education only. Control Panel → **BitLocker Drive Encryption**.
- **System drive**: *Turn on BitLocker* → (TPM present, else GPO "allow without compatible TPM" + USB key/password) → **save recovery key** (Microsoft account / file *not on the encrypted drive* / print) → encrypt used space vs entire → new encryption mode → run system check → reboot → encrypts in background. Verify status: `manage-bde -status`.
- **To Go**: insert USB → *Turn on BitLocker* → **password** → save recovery key → encrypt. Remove & reinsert → prompts for password; test on another PC. Manage: change password, turn off (decrypt), auto-unlock.

## (Lab 31 - not present in the folder)

## Lab 32 · Configure Windows Local Security Policy ★★★
`secpol.msc` (stand-alone PCs; domain uses GPO). Requirements given: **≥8 chars; change every 90 days; may change once a day; unique for 8 changes; complexity (3 of 4 character types); lockout after 5 attempts, counter resets after 5 min; all audit policies enabled; reminder 7 days before expiry.**
- **Account Policies → Password Policy**: Enforce password history **8**; Maximum password age **90**; Minimum password age **1**; Minimum length **8**; Complexity **Enabled**; **Store passwords using reversible encryption = Disabled (always - it's plaintext-equivalent)**.
- **Account Lockout Policy**: set **threshold 5 first**, then duration/reset counter **5 min**.
- **Local Policies → Audit Policy**: each → **Success and Failure** (read the Explain tab).
- **User Rights Assignment** - view who can log on locally, shut down, etc.
- **Security Options** - "Interactive logon: Prompt user to change password before expiration" = **7**; rename admin/guest; message text at logon.
- **Test**: try a weak password (rejected), fail 5 logins (locked), then **Event Viewer → Security** log shows audit events (4625 failed logon, 4740 lockout).

## Lab 33 · Configure users and groups ★★★
`compmgmt.msc` → **Local Users and Groups** (or `lusrmgr.msc`).
- **Users**: Action → New User → `Student01` / `cisco12345`, uncheck *must change at next logon* → create Student02, Staff01, Staff02. New users land in the **Users** group (can run apps; **cannot make system-wide changes**). Log on as one → try creating a user → denied (needs admin).
- **Groups**: New Group **ITEStudent**, **ITEStaff** → add members. Note built-ins: Administrators, Users, Guests, Power Users, Remote Desktop Users, Backup Operators.
- **Permissions**: create folders → Properties → **Security** → Edit → add group → allow Modify/Read → log on as members and test (NTFS). Compare with Sharing tab for network access (file 22).
- Delete users; observe profile folder handling. CLI equivalents: `net user`, `net localgroup`.

## Lab 34 · Configure Windows Firewall ★★★
Two PCs, same workgroup/network (private profile).
- PC-1: create & **share a folder**; PC-2: access `\\PC-1\share` - works.
- **Windows Defender Firewall** → *Allow an app* → note **File and Printer Sharing** ticked for Private; untick → PC-2 can't reach the share; re-tick.
- **Advanced settings (`wf.msc`)** → **Inbound Rules** → find *File and Printer Sharing (Echo Request - ICMPv4-In)* → enable → PC-2 can **ping** PC-1; disable → ping fails. Create a **new inbound rule** (port/program), scope, action, profile; **Outbound** rule to block a program; profile behaviour public vs private; restore defaults.

---

## Lab → objective quick map
| Labs | Domain |
|---|---|
| 02, 04 | Core 1 hardware / cabling |
| 05, 06, 07, 08 | Core 1 networking / Core 2 SOHO security |
| 01, 03, 10, 11 | Core 2 1.2 install |
| 09, 12-20 | Core 2 1.4/1.6 tools & settings |
| 21-24 | Core 2 1.5 CLI |
| 25 | Core 2 4.9 remote access |
| 26, 27, 28, 29 | Core 2 1.4 / 3.1 troubleshooting |
| 30, 32, 33, 34 | Core 2 2.2 / 2.7 security |
