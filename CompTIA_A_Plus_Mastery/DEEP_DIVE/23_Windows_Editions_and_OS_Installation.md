# 23 · Windows Editions & OS Installation/Upgrade (Module 16)

**Exam objectives:** Core 2 · 1.1 Identify basic features of Microsoft Windows editions · 1.2 Perform OS installations and upgrades in a diverse OS environment.

---

# Lesson 16.1 - Windows editions

## Versions and architectures
- **32-bit vs 64-bit**: 64-bit addresses >4 GB RAM and runs 32- and 64-bit apps. **Windows 11 is 64-bit only.**
- Editions: **Home, Pro, Pro for Workstations, Enterprise, Education** (+ Pro Education, IoT, LTSC).
- **N editions** - no Media Player/media features, for **EU regulatory compliance**. **KN** for Korea.

## Feature matrix - memorise
| Feature | **Home** | **Pro** | **Pro for Workstations** | **Enterprise / Education** |
|---|---|---|---|---|
| Target | **SOHO / consumer** | Business | High-end workstations | Large orgs / schools |
| **Domain join** | ✗ | ✓ | ✓ | ✓ |
| **Group Policy Editor** | ✗ | ✓ | ✓ | ✓ |
| **BitLocker** (disk & USB) | ✗ | ✓ | ✓ | ✓ |
| **EFS** | ✗ | ✓ | ✓ | ✓ |
| **RDP** | **client only** | client + **server (host)** | ✓ | ✓ |
| Hyper-V | ✗ | ✓ | ✓ | ✓ |
| Windows Update for Business, Assigned Access | ✗ | ✓ | ✓ | ✓ |
| **DirectAccess, AppLocker, MDOP**, Credential Guard | ✗ | ✗ | ✗ | ✓ |
| **Max RAM (64-bit)** | **128 GB** | **2 TB** | **6 TB** | **6 TB** (Ent) / 2 TB (Edu) |
| **Max cores** | **64** | **128** | **256** | **256** (Ent) / 128 (Edu) |
| **CPU sockets** | **1** | 2 | 4 | 2-4 |
| **Licensing** | **OEM, retail** | **OEM, retail, volume** | OEM, retail, volume | **Volume only** |
| ReFS create | ✗ | ✗ | ✓ | ✓ (Server) |
| Requires MS account online at setup (11) | ✓ (Home) | | | |

Key exam facts:
- **Home cannot do: domain, GPO, BitLocker/EFS, host RDP.**
- Enterprise/Education = **volume licensing only**.
- Pro for Workstations = Pro + more RAM/cores + ReFS + persistent memory support.

## Upgrade paths & servicing
- **Windows 10 → 11** in-place requires **TPM 2.0, UEFI with Secure Boot, supported CPU (8th-gen Intel/Zen 2+), 4 GB RAM, 64 GB storage**.
- Upgrade **same edition** or **Home → Pro** (buy key); **Home → Enterprise needs a licence** (via Pro); **downgrade Pro → Home = clean install** (deck says downgrade requires reinstall - you cannot in-place downgrade).
- 32-bit → 64-bit = clean install always.
- **Windows 10**: semi-annual feature updates; **support ended October 2025** (ESU available). **Windows 11**: **annual feature update** cycle (23H2, 24H2…), monthly quality updates.

---

# Lesson 16.2 - OS installations and upgrades

## Installation types
| Type | Description |
|---|---|
| **Clean install** | Repartition/reformat then install fresh; no old data/apps (back up first) |
| **In-place upgrade** | Run setup over existing OS → new version; **user data, apps, settings remain**; `Windows.old` kept for rollback (10 days) |
| **Repair install** | In-place upgrade with the same version to fix corruption |
| **Refresh / Reset** | Reset this PC - keep files (refresh) or remove everything (file 21) |
| **Recovery partition** | **OEM-created hidden partition** to restore factory image |
| **Image deployment** | Sysprep + capture (WIM/DISM/MDT/SCCM/Intune) → push to many PCs |
| **Multiboot** | Multiple OSs each on their own partition; boot menu at startup (install oldest first / Windows before Linux) |

## Considerations before install/upgrade (deck list)
- **Hardware compatibility** (requirements, TPM, CPU), **application and driver support**, **back up files and user preferences**, obtain **third-party drivers** (storage/NIC - may need to "Load driver" during setup), **feature updates** afterwards, product key/activation, language/region, time zone, **BitLocker suspend** before firmware/upgrade, domain/workgroup, edition choice, partition scheme.

## Unattended / automated
- **Unattended installation** - answer file (`unattend.xml`/autounattend) supplies all setup answers.
- **Network-pushed** - image over the LAN (WDS/MDT).
- **Zero-touch** - fully automated; **remote install via cloud service that deploys the image onto hardware** (Windows Autopilot + Intune).
- **Image/clone** - Sysprep generalises (SIDs) before capture.

## Boot devices / installation media
Configured in **BIOS/UEFI** boot order:
- **Optical** (DVD), **USB** flash / external drive / hot-swappable drive, **network boot (PXE - "pixie", needs DHCP + TFTP/WDS server)**, **Internet-based** (Autopilot/HTTP boot), **internal drive** (recovery partition), and for **multiboot** the OS selection menu.
- Create USB media: **Media Creation Tool**, Rufus. Requires UEFI/GPT-formatted (FAT32 EFI) or legacy/MBR to match firmware mode.

## Disk configuration
| Scheme | Details |
|---|---|
| **MBR** (master boot record) | **First 512-byte sector** holds boot code + **partition table**; **max 4 primary** (or 3 + extended with logicals); **max 2 TB**; legacy BIOS boot |
| **GPT** (GUID partition table) | **Up to 128 partitions in Windows**, **>2 TB volumes**, protective MBR, redundant header; **required for UEFI boot** |
Convert: `mbr2gpt` (no data loss, offline/online), or diskpart `clean` + `convert gpt` (destructive).

### Formats
| OS | FS |
|---|---|
| Windows | **NTFS** (system), FAT32/exFAT removable |
| macOS | **APFS** (HFS+ older) |
| Linux | **ext3/ext4**, XFS, swap |
Formatting: **quick** (rebuild FS tables) vs **full** (also scans sectors); allocation unit/cluster size; volume label.

### Typical Windows UEFI layout
EFI System Partition (FAT32, ~100 MB) · MSR (16 MB) · Windows (NTFS) · Recovery (NTFS, ~500 MB+).

## Post-install checklist
Activate, Windows Update, drivers (Device Manager clean), join domain/workgroup, create users, install apps, security (Defender/BitLocker), power/backup config, verify (Lab 11).

## Self-test
1. What can't Home do (four things)?
2. Which editions are volume-licence only?
3. RAM and core caps: Home / Pro / Enterprise.
4. Windows 11 hardware requirements (three).
5. Can you in-place downgrade Pro → Home? Upgrade Home → Enterprise directly?
6. Clean vs in-place vs repair install; what's `Windows.old`?
7. Zero-touch deployment - what technology and what's needed?
8. PXE - what does it need on the network?
9. MBR vs GPT: sector size, partition count, size limit, firmware.
10. Default FS for Windows / macOS / Linux.
