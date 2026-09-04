# 04 · Motherboards & Expansion Cards (Module 02, Lesson 2.2)

**Exam objectives:** Core 1 · 3.5 Given a scenario, install and configure motherboards, CPUs, and add-on cards.

## What the motherboard does
- Provides **data and power bus connectivity** between all components.
- The **system clock** provides timing.
- Major manufacturers named in the deck: Acer, ASRock, ASUSTek, Biostar, Intel, MSI (also Gigabyte, EVGA in the wild).

## Form factors - memorise the sizes

| Form factor | Dimensions | Expansion slots | Typical use |
|---|---|---|---|
| **ATX** | 12 × 9.6 in (305 × 244 mm) | up to 7 | Full towers, workstations |
| **Micro-ATX (mATX)** | 9.6 × 9.6 in (244 × 244 mm) | up to 4 | Mid/small towers; fits ATX cases (same mounting holes) |
| **Mini-ITX** | 6.7 × 6.7 in (170 × 170 mm) | 1 | SFF, HTPC, low power |

Bigger boards fit bigger cases; smaller boards fit bigger cases too (standoff holes are a subset). The reverse is not true.

## Chipset
- **Northbridge** (legacy) - CPU ↔ RAM ↔ graphics; now integrated into the CPU die (memory controller and PCIe lanes on-CPU).
- **Southbridge / PCH (Platform Controller Hub)** - slower I/O: SATA, USB, audio, onboard NIC, firmware.
- Chipset determines: CPU generation supported, RAM type, number of PCIe lanes, USB/SATA port count, overclocking support.

## Sockets and slots on the board

### CPU socket
Must match the CPU exactly (file 07 for socket types). Zero-insertion-force lever. Orientation marked by a triangle in one corner.

### Memory slots
- **DIMM** slots, keyed by generation - DDR2/3/4/5 are **physically incompatible** (notch positions differ).
- Colour-coded pairs indicate channels: populate matching colours for **dual-channel** (usually slots 2 & 4 first - check the manual).

### Storage connectors
- **SATA** ports (7-pin data).
- **M.2** slot - for SSDs (SATA or NVMe/PCIe), Wi-Fi cards. Keyed: **B-key, M-key, B+M**. Length codes 2242/2260/2280 (22 mm wide × length in mm).
- **eSATA** on some rear I/O panels.

### PCI Express (PCIe)
- Serial, point-to-point, uses **lanes**: **x1, x4, x8, x16**.
- Versions 2 → 6; each version roughly **doubles** bandwidth per lane. (PCIe 3.0 ≈ 1 GB/s/lane, 4.0 ≈ 2, 5.0 ≈ 4.)
- **Backward compatible**: a x1 card works in a x16 slot; a PCIe 3.0 card works in a 4.0 slot (at 3.0 speed).
- A physical x16 slot may be electrically only x4 or x8 - check the manual.

### PCI (legacy)
- Parallel shared bus, 32-bit, 33 MHz.
- **Not compatible with PCIe slots** - different keying.

### Headers
- **Front-panel header:** power switch, reset switch, power LED, HDD activity LED (tiny 2-pin plugs; polarity matters for LEDs).
- **Front audio header** (HD Audio).
- **USB headers** (USB 2.0 9-pin, USB 3.0 19/20-pin, USB-C key-A).
- **Fan headers**: CPU_FAN, SYS_FAN/CHA_FAN; 3-pin (voltage control) vs 4-pin (**PWM** control).
- Others: TPM header, RGB, COM, speaker (for beep codes).

### Power connectors on the board
- **P1 / 24-pin main ATX** (or 20+4). Older boards used 20-pin - an adapter exists.
- **CPU power: 4-pin or 8-pin EPS** (sometimes 8+4 or 8+8 on high-end).
- See file 05 for wire colours and PSU detail.

## Electrical safety & ESD (this is tested)
- **Never work on energized equipment.** Unplug the PSU; press the power button once to drain capacitors.
- **ESD** (electrostatic discharge) can destroy components with far less charge than you can feel.
- Controls: **ESD wrist strap** clipped to unpainted metal chassis, **ESD mat**, electrically safe workbench, store parts in **antistatic bags**, self-ground by touching the case, keep humidity ~30-50%.
- Full safety treatment in file 32.

## Motherboard installation procedure (deck order)
1. **Review documentation** (manual).
2. **Install the I/O shield** into the case first (easy to forget; can't add later without removing the board).
3. **Insert standoffs** in the case matching the board's holes - no extra standoffs (short-circuit risk).
4. **Pre-install the CPU, cooler and memory** on the board while it's outside the case (easier).
5. **Align and secure** the board - screws through the board into standoffs; don't overtighten.
6. **Final assembly** - connect P1, CPU power, front-panel headers, storage, fans, GPU.
7. **Cable management** - airflow and tidiness.

## Expansion cards

### Video / graphics cards
- Contain a **GPU**, **dedicated graphics memory** (GDDR6 etc.), and video ports (HDMI, DP, DVI).
- Fit **PCIe x16**; high-end need extra **6/8-pin PCIe power** and take 2-3 slots.
- Ensure PSU wattage and case clearance.

### Capture cards
- Capture video feeds - gaming, HDMI streaming. **TV tuner** cards receive broadcast. Internal (PCIe) or external (USB).

### Sound cards
- Add higher-quality audio / more channels; 3.5 mm jack colours (file 03); optical S/PDIF sometimes.

### Network interface cards (NICs)
- Copper Ethernet (**RJ-45**), fibre (SFP/SFP+ ports), wireless (antennas), coax (legacy).
- **RJ-11** appears on modem/DSL cards, not NICs.
- Also USB NICs for laptops.

### Other add-on cards
- Storage controllers / RAID cards / HBAs; USB expansion cards; Thunderbolt add-in cards; M.2 riser cards.

## Installing an expansion card
1. Power off, unplug, ground yourself.
2. Remove the slot cover.
3. Align the card and press firmly and evenly until the retention clip clicks (x16 slots have a latch).
4. Screw the bracket down; connect any auxiliary power.
5. Boot, install drivers, verify in Device Manager.

## Self-test
1. Dimensions of ATX, mATX, Mini-ITX?
2. Which chipset component now lives inside the CPU?
3. Can a PCIe x1 card go in an x16 slot? Can a PCI card?
4. What are M.2 B-key and M-key? What does "2280" mean?
5. What are the two power connectors every modern board needs from the PSU?
6. What must you install in the case *before* the motherboard?
7. Name the four front-panel header connections.
8. What's the difference between a 3-pin and 4-pin fan header?
9. What connector do NICs use? Modem cards?
10. Where does an ESD strap clip to?
