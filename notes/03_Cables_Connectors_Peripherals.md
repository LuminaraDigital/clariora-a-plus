# 03 · Cables, Connectors & Peripherals (Module 02, Lessons 2.1 & 2.3)

**Exam objectives:** Core 1 · 3.1 Compare and contrast display components and attributes · 3.2 Summarize basic cable types and their connectors, features and purposes.

## The PC case

- **Front:** disk drive access, power switch, LEDs, often front peripheral ports, air intake vents.
- **Rear:** power plug, PSU, rear I/O ports, expansion card slot covers, exhaust vents.
- **Keep vents clean** - dust and ambient heat are recurring troubleshooting causes (file 08).
- **Peripherals** = external components that add functionality (input, output, storage, network).

## Units of measure - you will be asked to convert

| Unit | Bits or bytes | Notes |
|---|---|---|
| **b** (bit) | 1 bit | Network/interface speeds are in **bits** per second (Mbps, Gbps) |
| **B** (byte) | 8 bits | Storage capacity and file sizes are in **bytes** (MB, GB, TB) |
| Kilo (K) | 10³ (or 2¹⁰ = 1024) | |
| Mega (M) | 10⁶ | |
| Giga (G) | 10⁹ | |
| Tera (T) | 10¹² | |
| Peta (P) | 10¹⁵ | |

Rule of thumb: divide a bits/s figure by 8 (or ~10 for real-world overhead) to get bytes/s. SATA III "6 Gbps" ≈ 600 MB/s - the deck lists this exact conversion.

## USB

- Standard for modern peripherals: audio, video, printers, storage, input, output. Carries **power and data**.
- Cable length limit: **3 m (USB 3.x) / 5 m (USB 2.0)**.
- Connectors: Type-A, Type-B, Mini-B, Micro-B, **USB-C** (reversible; being mandated in the EU for phones/tablets).
- Cable ends can be identical or convert between types.
- Port colour: USB 3.x is *often* blue, but **there is no official colour standard** - check documentation to tell 2.x from 3.x. (Instructor note in the deck; a classic exam distractor.)

| Standard | Speed | Marketing name |
|---|---|---|
| USB 1.0 / 1.1 | 1.5 Mbps (Low) / 12 Mbps (Full) | |
| USB 2.0 | 480 Mbps | Hi-Speed |
| USB 3.0 | 5 Gbps | SuperSpeed (= 3.1 Gen 1 = 3.2 Gen 1) |
| USB 3.1 | 10 Gbps | SuperSpeed+ (= 3.1 Gen 2 = 3.2 Gen 2) |
| USB 3.2 | Gen 1 = 5, Gen 2 = 10, Gen 2×2 = 20 Gbps | |
| USB 4 | 40 Gbps | Uses USB-C only |

## Thunderbolt

| Version | Connector | Speed | Notes |
|---|---|---|---|
| 1 / 2 | Mini DisplayPort | up to 20 Gbps | Daisy-chaining |
| 3 | USB-C | 40 Gbps (over ≤0.5 m cable) | |
| 4 | USB-C | 40 Gbps | Tighter minimums than 3 |
| 5 | USB-C | 80-120 Gbps | High-speed / future |

Thunderbolt carries PCIe, DisplayPort and power over one connector. Daisy-chain multiple devices.

## Lightning
Apple proprietary connector on older iPhone/iPad. Being replaced by USB-C.

## Display types (obj 3.1)

| Type | How it works | Pros | Cons |
|---|---|---|---|
| **LCD - TN** (twisted nematic) | Backlit liquid crystal | Fast response, cheap | Poor viewing angles/colour |
| **LCD - IPS** (in-plane switching) | Backlit | Best colour & viewing angles | Slower, pricier |
| **LCD - VA** (vertical alignment) | Backlit | Good contrast | Middle ground |
| **OLED** | Each pixel emits its own light - no backlight | True blacks, thin, high contrast | Burn-in, cost |
| **Mini-LED** | LCD with thousands of tiny backlight zones | Bright, good HDR | Not per-pixel like OLED |

### Display components & attributes
- **Touch screen / digitizer** - glass layer converting touch to input (file 15).
- **Inverter** - converts DC to AC for **CCFL** backlights (older LCDs). LED backlights need no inverter. Symptom: very dim image visible only with a torch = backlight/inverter failure.
- **Resolution** - pixels W×H (1920×1080 = Full HD, 3840×2160 = 4K).
- **Refresh rate** - Hz; how many times per second the image redraws (60/120/144).
- **Cable choice can limit quality** - VGA is analog and lower quality than DP/HDMI.

## Video cables

| Cable | Signal | Audio? | Notes |
|---|---|---|---|
| **VGA** (DE-15, 15-pin, blue) | Analog | No | Legacy; image degrades over long/cheap cables |
| **DVI** | Digital (DVI-D), analog (DVI-A), both (DVI-I) | No | Legacy; single/dual link |
| **HDMI** | Digital | Yes | Consumer standard; versions raise resolution/refresh/HDR; Type A (full), C (mini), D (micro) |
| **DisplayPort** | Digital | Yes | Pro/gaming; high refresh; **daisy-chain multiple monitors (MST)** from one port; Mini-DP variant |

Adapters exist HDMI↔DP, DP↔DVI, HDMI↔VGA (needs **active** conversion digital→analog).

## Serial (RS-232)
- **DB-9** (DE-9) connector on PCs today; DB-25 legacy.
- Appears as a **COM port** in Windows.
- Still used for **console access to network equipment** (switches/routers) - often via a USB-to-serial adapter.

## Storage cables

### SATA
| Revision | Speed | ≈ Throughput |
|---|---|---|
| SATA 1 | 1.5 Gbps | 150 MB/s |
| SATA 2 | 3 Gbps | 300 MB/s |
| SATA 3 | 6 Gbps | 600 MB/s |

- 7-pin **data** cable + 15-pin **power** connector.
- Internal SATA cable max ~1 m.
- **eSATA** - external variant; **not compatible with internal SATA cables**; max **2 m**.

### Molex
4-pin legacy power connector: **Red = +5 V, Yellow = +12 V, Black = ground (×2)**. Used for older drives, fans, some accessories.

### SCSI / SAS
- **SCSI** legacy parallel bus; **SAS** (Serial Attached SCSI) is the modern enterprise drive interface, backward-compatible with SATA drives (SATA drives fit SAS backplanes, not vice versa).
- Host Bus Adapter (**HBA**) card installed in a PCIe slot provides SAS/SCSI ports.

### IDE / PATA
Legacy 40-pin ribbon cable, master/slave jumpers. Only appears now as "how do we recover data from old drives" - use a USB-to-IDE adapter.

## Adapters, hubs, converters
- **Passive adapter** - just rewires pins (DP→HDMI when the source supports DP++).
- **Active adapter** - contains a chip and may need power (HDMI→VGA, USB-C→HDMI, DP→dual-link DVI).
- **USB hub** - expands ports; **powered hub** needed when many devices or high-draw devices are attached (bus power alone insufficient).
- USB-to-Ethernet, USB-to-serial, USB-to-SATA all exist.

## Audio jacks (3.5 mm) - colour codes

| Colour | Function |
|---|---|
| Green | Line out / front speakers |
| Black | Rear speakers (out) |
| Orange | Centre / subwoofer (out) |
| Blue | Line in |
| Pink | Microphone in |

## Network connectors (preview - full detail in file 09)
RJ-45 (Ethernet, 8P8C), RJ-11 (phone/DSL, 6P2C/6P4C), F-type (coax), ST/SC/LC (fibre).

## Self-test
1. USB 2.0, 3.0, 3.1, 3.2 Gen 2×2 and USB4 speeds?
2. Why can't you rely on a blue port meaning USB 3?
3. Which display type has no backlight? Which one needs an inverter?
4. Which video cable carries no audio? Which lets you daisy-chain monitors?
5. SATA 3 speed in Gbps and MB/s? eSATA max cable length?
6. Molex wire colours and voltages?
7. What is DB-9 used for today?
8. Which colour audio jack is the microphone?
9. When do you need a powered USB hub?
10. Bits vs bytes - which one are network speeds quoted in?
