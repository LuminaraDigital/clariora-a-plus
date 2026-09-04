# 07 · System Memory & CPUs (Module 03, Lessons 3.3 & 3.4)

**Exam objectives:** Core 1 · 3.3 Compare and contrast RAM characteristics · 3.5 Install and configure motherboards, CPUs, add-on cards.

---

# Part A - RAM

## System RAM and virtual memory
- RAM = volatile working memory; each location has an **address**; CPU ↔ RAM via **address pathway** (which location) and **data pathway** (the contents).
- **Virtual memory / paging file**: when RAM is full the OS swaps pages to disk (`pagefile.sys`). Slow disk paging = "thrashing" = the classic "add more RAM" symptom.

## RAM types (evolution)
- **DRAM** → **SDRAM** (synchronous, clocked) → **DDR SDRAM** (double data rate - transfers on rising *and* falling clock edge).
- **CAS latency (CL)** - clock cycles between a read request and data available; lower is faster at the same clock.

## DDR generations - memorise

| Type | Data rate | Transfer rate | Max per module (course) | Voltage | Pins (DIMM / SODIMM) |
|---|---|---|---|---|---|
| DDR1 | 200-400 MT/s | 1.6-3.2 GB/s | 1 GB | 2.5 V | 184 / 200 |
| DDR2 | 400-1066 MT/s | 3.2-8.5 GB/s | 4 GB | 1.8 V | 240 / 200 |
| DDR3 | 800-2133 MT/s | 6.4-17.1 GB/s | 16 GB | 1.5 V (1.35 L) | 240 / 204 |
| **DDR4** | 1600-3200 MT/s | 12.8-25.6 GB/s | 32 GB | 1.2 V | **288 / 260** |
| **DDR5** | 4800-8000+ MT/s | 38.4-51.2+ GB/s | 128 GB+ | 1.1 V | **288 / 262** |

- Naming: **DDR4-3200** = 3200 MT/s; **PC4-25600** = 25,600 MB/s (MT/s × 8).
- **Generations are physically keyed** - notch position differs; DDR4 will not fit a DDR3 slot. Never force.
- DDR5 has an on-module PMIC (power management IC) and two 32-bit sub-channels per DIMM.

## Module form factors
- **DIMM** - desktop, full-length.
- **SODIMM** (small outline) - laptops, mini PCs, some AIOs.
- Install: open the clips, align notch, press straight down evenly until both clips snap. Remove: push both clips out.

## Multi-channel memory
- **Single / dual / triple / quad channel** - matched modules in the correct slots let the memory controller access them in parallel → higher bandwidth.
- Populate the slots the manual says (often the same-coloured pair, or slots 2 & 4).
- **Mismatched modules** (different size/speed) may fall back to single-channel or run at the slowest module's speed. Best practice: buy a matched kit.

## ECC vs non-ECC
- **ECC** (error-correcting code) detects and corrects single-bit errors - servers, workstations, anywhere data integrity is critical.
- Requires **motherboard AND CPU support**.
- **Do not mix ECC and non-ECC**.
- **Registered / buffered** (RDIMM) vs unbuffered (UDIMM) - servers use registered; not interchangeable.

## RAM compatibility checklist
Motherboard/CPU supported generation → speed → capacity per slot and total → ECC/non-ECC → DIMM vs SODIMM → channel population.

---

# Part B - CPUs

## Instruction cycle
**Fetch → Decode → Execute → Write-back.**

## Architectures
| Architecture | Bits | Who | Notes |
|---|---|---|---|
| **x86** | 32-bit | Intel, AMD | Max 4 GB addressable RAM; legacy |
| **x64 (x86-64 / AMD64)** | 64-bit | Intel, AMD | Runs 32- **and** 64-bit OS/apps; the desktop standard |
| **ARM** | 32/64 (RISC) | Apple Silicon, Qualcomm, etc. | Mobile, tablets, Chromebooks, Macs, Windows on ARM; **SoC** - CPU + GPU + memory controller + video/sound/network/storage controllers on one chip; power efficient |

- Inside: **ALU** (arithmetic logic unit), registers, **cache L1 / L2 / L3** (L1 smallest & fastest per core; L3 largest, shared).
- A 32-bit OS cannot use a 64-bit app; a 64-bit OS can run most 32-bit apps (Program Files (x86)).

## CPU features (deck list)
- **Multithreading / SMT (Hyper-Threading)** - one physical core exposes 2 logical processors.
- **Symmetric multiprocessing (SMP)** - multiple physical CPUs on one board (servers).
- **Multicore** - 2, 4, 6, 8, 16… cores on one die.
- **Virtualization extensions** - **Intel VT-x / AMD-V** (and VT-d/AMD-Vi for I/O). Must be **enabled in BIOS/UEFI** for hypervisors (file 14).
- Also: clock speed (GHz), turbo/boost, TDP (watts of heat = cooler sizing), integrated GPU (iGPU) vs none ("F" Intel / non-"G" AMD).

## Socket types - memorise which brand uses which

| Socket style | Pins located on… | Vendor & examples |
|---|---|---|
| **PGA** (pin grid array) | the **CPU** | AMD - **AM4**, **TR4**, **SP3** |
| **LGA** (land grid array) | the **motherboard socket** | Intel - **LGA 1200**, **LGA 1700**; AMD's newest **AM5** is also LGA |
| **BGA** (ball grid array) | soldered - not replaceable | Laptops, phones, embedded |

Bent pins on PGA = damaged CPU; bent pins on LGA = damaged motherboard.

## Choosing a CPU
- **Socket must match the motherboard** (and chipset must support that CPU generation - sometimes a BIOS update is needed).
- Core count / performance tier: **desktop** (general), **workstation** (many cores, ECC, PCIe lanes - Xeon W / Threadripper), **server** (Xeon Scalable / EPYC, multi-socket).
- Mobile CPUs are usually BGA - not upgradeable.

## Installing a CPU
1. Ground yourself. Lift the socket lever/load plate.
2. Align the **triangle marker** on CPU with the socket. Drop in - **zero force**.
3. Close the load plate/lever.
4. Apply a **pea-sized dot of thermal paste** (unless the cooler has pre-applied pad).
5. Mount the cooler evenly (cross-pattern screws), plug into **CPU_FAN**.
6. Boot into firmware - check temps.

## Self-test
1. What do "MT/s" and "PC4-25600" mean?
2. Which DDR generations use 288 pins? How can you tell DDR4 from DDR5 physically?
3. What does CAS latency measure?
4. Two requirements for using ECC RAM? Can you mix ECC and non-ECC?
5. Why populate slots 2 & 4 (or same colours)?
6. Fetch-decode-execute-?
7. x86 vs x64 RAM limit; can x64 run 32-bit apps?
8. What is an SoC and where is ARM used?
9. PGA vs LGA - pins where? Which vendor traditionally uses which? Name two sockets of each.
10. What must be enabled in firmware for VMs?
