# 01. Core 1: Hardware & System Components (220-1201)

This module covers motherboards, CPUs, RAM, storage, power supplies, cooling systems, and PC hardware troubleshooting based on Modules 2, 3, and 4 of the curriculum.

---

## 1. Motherboards & Expansion Slots

### Form Factors
* **ATX (Advanced Technology eXtended)**: Standard desktop size ($12 \times 9.6$ inches / $305 \times 244$ mm). Up to 7 expansion slots.
* **Micro-ATX (mATX)**: Compact desktop size ($9.6 \times 9.6$ inches / $244 \times 244$ mm). Up to 4 expansion slots. Backwards compatible with ATX mounting holes.
* **Mini-ITX**: Small Form Factor (SFF) size ($6.7 \times 6.7$ inches / $170 \times 170$ mm). 1 expansion slot. Used in home theater PCs (HTPCs) and low-power systems.

### Motherboard Components & Chipsets
* **Bus Architecture**: Internal bus connects CPU to memory; Expansion bus connects CPU to peripheral slots.
* **Chipset**:
  * **Northbridge** (Legacy): High-speed communications with CPU, RAM, and PCIe graphics. (Now integrated directly into modern CPU dies).
  * **Southbridge**: Controls slower I/O peripherals (SATA, USB, audio, BIOS/UEFI, onboard NIC).
* **Expansion Slots**:
  * **PCI Express (PCIe)**: Point-to-point serial communication using dedicated lanes ($x1, x4, x8, x16$).
  * **PCIe Speeds per Lane**: PCIe 3.0 (~1 GB/s), PCIe 4.0 (~2 GB/s), PCIe 5.0 (~4 GB/s).
* **Firmware**:
  * **BIOS (Basic Input/Output System)**: Legacy 16-bit firmware initializes hardware via POST (Power-On Self-Test).
  * **UEFI (Unified Extensible Firmware Interface)**: Modern 64-bit firmware interface. Supports drives >2.2 TB (GPT), Secure Boot, fast boot, and GUI mouse navigation.
  * **TPM (Trusted Platform Module)**: Security microchip on motherboard used for cryptographic key storage (required for BitLocker & Windows 11).

---

## 2. Processors (CPUs)

### Architectures & Sockets
* **Architectures**: x86 (32-bit, max 4 GB RAM), x64 (64-bit, max 16 EB RAM), ARM (RISC-based architecture used in mobile devices and Apple Silicon).
* **Socket Types**:
  * **LGA (Land Grid Array)**: Pins are located on the **motherboard socket**; CPU has flat gold pads. (Used by Intel CPUs, e.g., LGA 1700).
  * **PGA (Pin Grid Array)**: Pins are located on the **CPU package**; socket has receiving holes. (Used by legacy AMD CPUs, e.g., AM4).
  * **BGA (Ball Grid Array)**: CPU is permanently soldered onto motherboard (laptops/embedded).

### Performance Features
* **Cores**: Single-core vs Multi-core (Dual, Quad, Octa-core).
* **Hyper-Threading / SMT**: Enables a single physical core to execute 2 logical threads simultaneously.
* **Cache Memory**: L1 (fastest, smallest, per-core), L2 (medium speed, per-core), L3 (largest, shared across all cores).
* **Virtualization Hardware Support**: **Intel VT-x** and **AMD-V** must be enabled in BIOS/UEFI for hypervisors to run VMs.

---

## 3. Random Access Memory (RAM)

### RAM Types & Form Factors
* **DIMM (Dual In-line Memory Module)**: 288-pin form factor for desktop motherboards.
* **SO-DIMM (Small Outline DIMM)**: Compact form factor for laptops ($260$-pin DDR4 / $262$-pin DDR5).

### DDR Memory Standards
| Standard | Data Rate / Transfer Speed | Key Features |
| :--- | :--- | :--- |
| **DDR4** | 1600 - 3200 MT/s | 288 pins, 1.2V operation, increased density over DDR3. |
| **DDR5** | 4800 - 8400+ MT/s | 288 pins (different notch position), 1.1V, onboard PMIC voltage regulation. |

### Memory Technologies
* **Multi-Channel Architecture**: Single, Dual (2 matching sticks), Triple, and Quad-channel modes double/quadruple memory bandwidth.
* **ECC (Error-Correcting Code) RAM**: Detects and corrects single-bit memory errors. Used in enterprise servers and workstations. Requires ECC-compatible motherboard and CPU.
* **Non-ECC Unbuffered RAM**: Standard consumer desktop memory.

---

## 4. Storage Solutions & RAID

### Drive Types
* **Hard Disk Drives (HDDs)**: Magnetic spinning platters ($5400$ RPM or $7200$ RPM). 3.5" for desktops, 2.5" for laptops. SATA III interface ($6$ Gbps / ~550 MB/s throughput).
* **Solid-State Drives (SSDs)**: Flash-based non-volatile memory (NAND).
  * **SATA SSD**: 2.5" form factor, maxes out at ~550 MB/s.
  * **M.2 NVMe SSD**: Uses PCIe lanes directly ($x4$). Speeds range from $3,500$ MB/s (Gen 3) to $7,000+$ MB/s (Gen 4/5).

### RAID Configurations (Redundant Array of Independent Disks)
| RAID Level | Description | Min Drives | Fault Tolerance | Capacity Efficiency |
| :--- | :--- | :---: | :---: | :---: |
| **RAID 0** | Striping (High Performance) | 2 | None (1 failure = total data loss) | 100% |
| **RAID 1** | Mirroring (High Redundancy) | 2 | 1 drive failure | 50% |
| **RAID 5** | Striping with Distributed Parity | 3 | 1 drive failure | $(N - 1) / N$ |
| **RAID 10** | Striping + Mirroring (RAID 1+0) | 4 | Up to 1 drive per mirrored pair | 50% |

---

## 5. Power Supplies & Cooling Systems

### Power Supply Units (PSU)
* **AC to DC Conversion**: Converts household AC voltage (115V in US, 230V in EU) to low-voltage DC (+3.3V, +5V, +12V).
* **PSU Connectors**:
  * **24-pin ATX**: Main motherboard power.
  * **4/8-pin EPS/CPU**: Dedicated power for CPU.
  * **6/8-pin PCIe**: Auxiliary power for high-performance graphics cards.
  * **15-pin SATA**: Power for SATA HDDs/SSDs.
* **80 Plus Efficiency Ratings**: Bronze ($82\%$), Silver ($85\%$), Gold ($87\%$), Platinum ($90\%$), Titanium ($92\%$).

### Cooling Systems
* **Air Cooling**: Metal heat sink with copper heat pipes + thermal paste + fan.
* **Liquid Cooling**: Closed-loop AIO (All-In-One) radiator + pump + coolant + cold plate attached to CPU.

---

## 6. PC Hardware Troubleshooting Matrix

| Symptom | Probable Cause | Action / Resolution |
| :--- | :--- | :--- |
| **No Power / No LED Light** | Unplugged PSU, blown fuse, tripped breaker, loose 24-pin ATX connector. | Check outlet, test PSU with multimeter or PSU tester, verify 115V/230V switch. |
| **Continuous Beep / POST Code** | RAM unseated or failed, graphics card error. | Reseat RAM sticks in slots 2 & 4; test one stick at a time. |
| **System Shuts Down Randomly** | CPU Overheating, thermal throttling. | Check CPU fan operation, reapply thermal paste, clear dust filters. |
| **Loud Clicking / Grinding Noise** | Mechanical HDD read/write head failure. | Backup data immediately; replace failing hard drive. |
| **Distorted Video / Artifacts** | Overheating GPU, loose video cable, corrupted graphics driver. | Reseat GPU, replace HDMI/DisplayPort cable, update GPU drivers. |
| **Distended / Swollen Capacitors** | Power surge or aged motherboard capacitors. | Replace motherboard. |
