# 06 · Storage Devices & RAID (Module 03, Lesson 3.2)

**Exam objectives:** Core 1 · 3.4 Compare and contrast storage devices · 5.2 Troubleshoot drive and RAID issues (see file 08).

## Choosing storage
Evaluate on **reliability, performance, and use** (deck wording). Also cost/GB, capacity, interface, form factor.

## Hard disk drives (HDD)
- **Magnetic** platters, read/write heads on an actuator arm; **moving parts** → mechanical failure modes (clicking, grinding).
- **Rotational speed** determines latency/throughput:
 - Consumer: **5,400 / 7,200 RPM**
 - Enterprise (SAS): **10,000 / 15,000 RPM**
- Form factors: **3.5"** desktop, **2.5"** laptop.
- Interface: **SATA** (or SAS in servers).
- Lowest cost per GB; highest capacity; slowest.

## Solid-state drives (SSD)
- **NAND flash**, no moving parts, non-magnetic, silent, shock-resistant, low power.
- Much faster read/write; higher cost per GB (though falling).
- Wear: finite write cycles; **TRIM** helps the OS tell the drive which blocks are free (why "defrag" on an SSD actually runs TRIM - file 19).

### SSD connection methods (deck list)
| Interface | Form factor | Speed ceiling |
|---|---|---|
| **SATA** | 2.5" or M.2 (SATA-keyed) | ~550-600 MB/s (SATA III) |
| **PCIe / NVMe** | **M.2** (M-key), U.2, add-in card | ~3,500 MB/s (Gen 3 ×4) → 7,000+ (Gen 4) → 12,000+ (Gen 5) |
| **SAS** | 2.5" enterprise | 12 Gbps |

- **NVMe** (Non-Volatile Memory Express) is the *protocol* designed for flash over PCIe. **NVMHCI** is the older host controller interface term the deck mentions.
- **mSATA** - older mini-card SSD (laptops), SATA speeds. **M.2** superseded it.
- An M.2 slot may support SATA only, NVMe only, or both - check the manual.

## Removable & external storage
- **Drive enclosures** - put a bare 2.5"/3.5" drive in a USB / Thunderbolt / eSATA box.
- **NAS** (network-attached storage) - file-level storage over the LAN (SMB/NFS); often runs RAID. **SAN** (storage-area network) is block-level over a dedicated network (iSCSI/Fibre Channel) - relevant to your capstone.
- **Flash drives** (USB), **memory cards** (SD, microSD, CF) - read via a **card reader**; rated by capacity and **speed class** (Class 10, UHS-I/II/III, V30/V60/V90, A1/A2 for apps).

## Optical drives
- 5.25" bay; CD / DVD / Blu-ray; increasingly absent from new PCs - use USB external.

| Media | Capacity |
|---|---|
| CD | 700 MB |
| DVD single-layer, single-sided | 4.7 GB |
| DVD dual-layer | 8.5 GB |
| DVD dual-layer, double-sided | ~17 GB |
| Blu-ray | 25 GB per layer (50 GB dual-layer; BDXL 100/128 GB) |

## RAID - Redundant Array of Independent Disks
Distributes data across multiple physical drives for **performance**, **redundancy**, or **capacity**. Implemented in hardware (RAID controller card / motherboard firmware) or software (OS).

| Level | Technique | Min drives | Survives | Capacity | Notes |
|---|---|---|---|---|---|
| **RAID 0** | Striping, no parity | 2 | **0 failures** | 100% | Fastest; any drive dies = all data lost |
| **RAID 1** | Mirroring | 2 | 1 (of 2) | 50% | Simple redundancy; read speed can improve |
| **RAID 5** | Striping + **single distributed parity** | **3** | 1 | (n−1)/n | Fast reads, **slower writes** (parity calc); rebuild is slow and risky on big drives |
| **RAID 6** | Striping + **double parity** | **4** | **2** | (n−2)/n | More redundancy than 5, less usable space; deck: "2 drive failure will cause degraded performance" (i.e. runs degraded, still up) |
| **RAID 10 (1+0)** | **Stripe of mirrors** | **4** | 1 per mirrored pair | 50% | Must be **even** number of drives; best mix of speed + redundancy; expensive |

**Memory hooks:**
- 0 = zero redundancy. 1 = one copy of everything (mirror). 5 = five looks like "S" for Single parity. 6 = one more than 5 → double parity. 10 = 1 and 0 combined.
- Min drives: 0→2, 1→2, 5→3, 6→4, 10→4.

### RAID troubleshooting terms (file 08 expands)
- **Degraded** - a drive failed, array still running (RAID 1/5/6/10). Replace and **rebuild** ASAP.
- **Failed** - more drives lost than the level tolerates → restore from backup.
- Controller alerts / beeps / LEDs; check firmware and cabling before assuming disk death.
- **RAID is not a backup** - it protects against disk failure, not deletion, ransomware, or fire.

## Partition tables (preview - file 23)
- **MBR**: 512-byte first sector, max 4 primary partitions, max 2 TB.
- **GPT**: up to 128 partitions in Windows, >2 TB, required for UEFI boot.

## Self-test
1. Consumer vs enterprise HDD RPMs?
2. Three SSD interfaces and their rough speed ceilings?
3. What is NVMe and why is it faster than SATA?
4. Capacities: CD, DVD SL, DVD DL, Blu-ray per layer?
5. NAS vs SAN - file vs block, and which protocol does the capstone use?
6. Minimum drives for RAID 0/1/5/6/10?
7. Which RAID levels survive two simultaneous drive failures?
8. Why is RAID 5 write slower than read?
9. Why must RAID 10 have an even number of drives?
10. Is RAID a backup? Why not?
