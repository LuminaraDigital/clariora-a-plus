# 08 · BIOS/UEFI & Hardware Troubleshooting (Module 04)

**Exam objectives:** Core 1 · 3.5 (motherboard/CPU config) · 5.1 Troubleshoot motherboards, RAM, CPU, and power · 5.2 Troubleshoot drive and RAID issues · 5.3 Troubleshoot video, projector, and display issues.

---

# Part A - BIOS and UEFI (Lesson 4.1)

## What firmware does
- **BIOS** (Basic Input/Output System) - legacy 16-bit firmware; runs **POST**, initialises hardware, hands off to the boot loader from an **MBR** disk.
- **UEFI** (Unified Extensible Firmware Interface) - modern replacement: 32/64-bit, GUI + mouse, boots from **GPT** disks >2 TB, **Secure Boot**, network stack, faster boot. Most "BIOS" screens today are UEFI.
- Enter setup by pressing the interrupt key during POST - **Del, F2, F10, F12, Esc** vary by manufacturer (deck says research each vendor). Windows: Settings → Recovery → Advanced startup → UEFI Firmware Settings.

## Settings you must know

### Boot options
- **Boot order / priority**: fixed disk (HDD/SSD/NVMe), optical, USB, **network / PXE**.
- Change first boot device to install an OS or run recovery media (Lab 02).
- If the first device has no bootable media, firmware falls through to the next.
- Boot mode: **UEFI vs Legacy/CSM**; **Secure Boot** on/off.

### USB permissions
Enable/disable USB controllers, individual ports, or all ports - a physical-security control (block data exfiltration, block boot from USB).

### Fan considerations
Fan curves - optimised / balanced / performance; temperature monitoring; manual curves or third-party apps.

### Passwords
- **Supervisor / Admin / BIOS password** - restricts *changing* firmware settings.
- **User / system / power-on password** - required to *boot* at all.
- Forgotten? Clear CMOS jumper / remove RTC battery (desktops); laptops often need vendor service.

### Secure Boot
- Only allows boot loaders/OS kernels with a valid **digital signature** to load → blocks bootkits/rootkits.
- Required for **Windows 11**.

### TPM - Trusted Platform Module
- Hardware chip (or firmware TPM in CPU) that **securely stores** cryptographic keys, digital certificates (e.g. Secure Boot keys), and hashed passwords.
- Used by **BitLocker** and required (v2.0) by **Windows 11**.
- **HSM** (hardware security module) - external/USB device that stores keys; enterprise-grade.

### Other firmware settings
Virtualization (VT-x/AMD-V), SATA mode (AHCI/RAID), integrated peripherals on/off, XMP/EXPO memory profiles, date/time, hardware monitor.

---

# Part B - Power and disk troubleshooting (Lesson 4.2)

## Power issues
- **Follow the power flow**: outlet → power cable → PSU → motherboard → components. Verify each individually.
- Tools: **PSU tester**, multimeter, known-good PSU/cable.
- Check the **115/230 V switch**, the PSU rocker switch, the power strip.
- Nothing at all (no LEDs/fans) → outlet/cable/PSU. Fans spin but nothing else → PSU rails / board / CPU.

## POST issues
- POST = power-on self-test. Failure indicators: **beep codes** (need a case speaker), on-board **POST/debug LEDs** or 2-digit codes, no display.
- Checklist from deck: verify recent **changes**, check **cables and connections**, faulty interfaces, verify **PSU**, faulty **CPU or firmware**.
- Common beep patterns (vendor-specific, but typical): 1 short = OK; continuous/repeating short = **RAM**; 1 long 2-3 short = **video**. Reseat RAM one stick at a time.

## Boot issues (after POST)
- Power, data connections, UEFI/BIOS boot order, **M.2/NVMe drive faults** (drive not detected → check slot support, keying, firmware).
- **"No boot device found"** → wrong boot order, dead drive, loose SATA cable, corrupt boot sector.

## Boot sector issues
- **MBR/GPT errors**, missing OS, "BOOTMGR is missing".
- Check display connection isn't the real problem; check beep codes; **malware** can corrupt boot sectors; **repair options** = WinRE, `bootrec /fixmbr`, `/fixboot`, `/rebuildbcd`, `diskpart` (file 21).

## OS errors and crash screens
- **BSOD** (Windows) / **pinwheel** (macOS) / kernel panic (Linux).
- Causes deck lists: **device driver issues, corrupt system files, defective hardware, overheating or PSU issues**.
- Read the stop code / QR; check Event Viewer; roll back drivers; test RAM (Windows Memory Diagnostic / MemTest86); `sfc /scannow`.

## Drive availability
Symptoms: **unusual noise (clicking/grinding), LED status/activity lights, "boot device not found", missing drive in OS, read/write failures, audible alarms (RAID), BSOD**.

## Drive reliability & performance
- **S.M.A.R.T.** - drive self-monitoring; read attributes with vendor tools/CrystalDiskInfo/`wmic diskdrive get status`.
- **IOPS** - input/output operations per second (performance metric, especially SSD/enterprise).
- **Bad sectors** - `chkdsk /r` marks them; increasing count = replace drive.
- Slow drive → nearly full, fragmentation (HDD only), failing, or wrong interface mode.

## RAID failure
- **Device failure** (single disk) → array **degraded**; replace disk, rebuild.
- **Array failure** (too many disks) → restore from backup.
- **Controller alerts** - audible/LED/software; also check controller battery/firmware.
- Never assume the disk - check cables/backplane first.

---

# Part C - System and display issues (Lesson 4.3)

## Component diagnostics (deck steps)
1. Eliminate **software** issues first.
2. Identify **patterns** (when, what load).
3. Check **power supply**.
4. **Suspect hardware** - swap known-good.
5. Observe **physical symptoms**.

## Overheating
- Check **temperature sensors** (firmware/HWMonitor), **CPU and case fans** spinning, **heat sink** seated with paste, **blanking plates** present, environment (dust, ambient heat, blocked vents).
- Symptoms: random shutdowns/reboots under load, throttling, loud fans, thermal-shutdown messages.

## Physical damage
Causes: **ESD, power spikes, overheating, careless connector insertion, dirt, liquid spills**. Signs: **scorch marks, swollen/leaking capacitors** (→ replace board), burnt smell, bent pins.

## Performance issues
Overheating or misconfiguration; **verify the problem** and **rule out software and networking** before blaming hardware.

## Inaccurate system date/time
- The **RTC (real-time clock) / CMOS battery** (**CR2032** coin cell) keeps time and (on legacy boards) settings when unplugged.
- Symptoms: clock resets, "CMOS checksum error", settings lost, date defaults to a past year → **replace the CR2032**.
- Time drift while running → NTP sync issue (file 21).

## Missing video
- **Physical cable** (loose, wrong input, bad cable), monitor power, wrong source.
- **Projectors**: **burnt-out/blown bulb**, projector **shutdown from overheating** (blocked filter/vents).
- No POST video → GPU seating/power, integrated vs discrete output confusion, RAM.

## Video quality
| Symptom | Likely cause |
|---|---|
| Dim / fuzzy image | Backlight/inverter failing; wrong resolution (non-native); VGA cable |
| Flashing / flickering | Loose cable, failing backlight, refresh rate, driver |
| **Dead pixels** | Panel defect (permanently off); *stuck* pixels may be revived; replace panel if many |
| **Burn-in** | Static image retained - OLED/plasma; use screensavers, pixel shift |
| Incorrect colour | Cable/pin damage, colour profile, driver, dying panel |
| Artifacts / garbage | **GPU** overheating or failing, bad driver, bad VRAM |
| Wrong aspect / stretched | Resolution not native |

## Quick symptom → cause matrix (all of Module 04)

| Symptom | First suspect |
|---|---|
| No power, no LEDs | Outlet / cable / PSU switch / PSU |
| Fans spin, no POST | RAM, CPU, board, GPU |
| Continuous beeps | RAM |
| Random shutdowns under load | Overheating or PSU under-sized |
| Clicking / grinding | HDD mechanical failure - back up now |
| Clock resets on power-off | CR2032 |
| Boot device not found | Boot order / cable / dead drive / boot sector |
| BSOD after new hardware/driver | Driver - roll back |
| Swollen capacitors / scorch | Replace board/PSU |
| Projector image dies, fan loud | Bulb / overheating |
| Screen visible only with a torch | Backlight/inverter |
| Screen artifacts | GPU |

## Self-test
1. What's the difference between the supervisor and user firmware passwords?
2. What does Secure Boot check, and what does Windows 11 require alongside it?
3. What does a TPM store? What is an HSM?
4. In what order do you trace a power problem?
5. Repeating short beeps usually mean what? First fix?
6. What is S.M.A.R.T.? What is IOPS?
7. Degraded vs failed RAID - what do you do for each?
8. Five steps of the component diagnostic process?
9. Battery type for the RTC and the symptom of it dying?
10. Toner rubs off / screen artifacts / dead pixels - one-word cause each.
