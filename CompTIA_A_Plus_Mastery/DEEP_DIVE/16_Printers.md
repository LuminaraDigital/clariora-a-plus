# 16 · Printers & Multifunction Devices (Module 10)

**Exam objectives:** Core 1 · 3.7 Given a scenario, deploy and configure multifunction devices/printers and settings · 3.8 (printer consumables & maintenance) · 5.6 Troubleshoot printer issues.

---

# Lesson 10.1 - Deploying printers & MFDs

## Selection & placement
- Choose on **speed (ppm), resolution (dpi), paper handling, options** (duplexer, trays, finisher).
- Location: **power, network, environmental** (dust, humidity, heat, ventilation - laser printers emit ozone/heat), **accessibility**.
- Unboxing: **two people** for heavy units, remove **all packing materials/tape** (inside toner cartridge too), let it **acclimate to temperature/humidity** before powering on.

## Firmware
- Even new printers may need updates. **Reset/reflash** firmware to fix malfunctions; **back up configuration first**; keep **stable power during flashing** (interruption = brick).

## Connectivity
| Method | Notes |
|---|---|
| **USB** | Direct to one PC; that PC can share it |
| **Ethernet** | Own IP on the LAN; set static/reservation |
| **Wireless** | Wi-Fi infrastructure, Wi-Fi Direct/ad hoc, **Bluetooth** to a PC |
| **Cloud** | Registered with a cloud print service; print from anywhere |

## Drivers & page description languages
- **Plug and Play** usually finds a driver; otherwise **manual install** for the correct **PDL**.
- **PDLs**: **PCL** (HP, fast, business), **PostScript** (Adobe, graphics/DTP, device-independent), **XPS** (Microsoft).
- PDLs support **scalable fonts, vector graphics, colour**. Colour model **CMYK** (cyan, magenta, yellow, black/key).
- Wrong PDL → **garbled output**.

## Printer Properties vs Printing Preferences
- **Properties** (device-level, admin): **print queue**, sharing, ports, **paper tray** config, installed options, **fonts**, **driver**, security.
- **Preferences** (per-job/user defaults): **quality/DPI**, **economy/draft**, **paper type & size**, **finishing** (**duplex**, **multiple pages per sheet**, **collate**, staple), **orientation** (portrait/landscape), colour/greyscale.

## Sharing
- **Public** printers - no access controls.
- **Print server** - a PC/server shares the printer to the network (Windows share `\\server\printer`); install **additional drivers** for other OS/architectures.
- Direct network printers - clients connect by IP (TCP/IP port 9100 / IPP 631 / LPD 515).

## Printer security
- **User authentication**; **secured/pull printing** - job held until user enters **PIN or swipes badge**; **audit logs** track every job; disable unused protocols; change admin password; firmware updates; segment on VLAN.

## Scanner / MFD configuration
- **OCR** - turns scanned characters into editable text.
- **Flatbed** - moving scan head under glass. **ADF** (automatic document feeder) - fixed head, paper moves; supports duplex scanning.
- Network scanning destinations: **scan to email** (needs SMTP config), **scan to SMB** share (needs credentials/path), **scan to cloud**.

---

# Lesson 10.2 - Maintenance & imaging processes

## Laser printer - the 7-step imaging process (memorise order)
| # | Step | What happens |
|---|---|---|
| 1 | **Processing** | Page rasterised into a bitmap in printer memory |
| 2 | **Charging** | **Primary charge roller (or corona)** applies a uniform **negative** charge to the **photosensitive imaging drum** (~−600 V) |
| 3 | **Exposing** | **Laser** writes the image, **removing charge** where it hits (~−100 V) |
| 4 | **Developing** | Negatively charged **toner** sticks to the **less-negative (exposed)** areas |
| 5 | **Transferring** | Transfer roller/corona gives **paper a positive charge**; toner jumps from drum to paper; static eliminator strip |
| 6 | **Fusing** | **Heat + pressure** rollers melt toner into the paper (~200 °C) |
| 7 | **Cleaning** | Blade scrapes residual toner into waste bin; erase lamp neutralises drum |

Mnemonic: **P**eople **C**an't **E**xpect **D**ogs **T**o **F**etch **C**ats.

## Laser maintenance
- Load paper; **replace toner** (remove sealing tape/packing); **clean** - **never compressed air** (toner is fine powder; use a toner vacuum / damp cloth for exterior); apply **maintenance kit** (**fuser, imaging unit/drum, transfer/pickup rollers**) at the page-count interval, then reset the counter; **calibrate**.

## Inkjet
- **Thermal (bubble-jet)** - heats ink to form a bubble that bursts and sprays. **Piezoelectric** - crystal flexes to push ink through the nozzle. **Carriage** holds print head (and often cartridges) and moves across the page; **feed rollers**; **duplexing assembly**.
- Maintenance: **replace cartridges / refill ink tanks**, **clean print heads**, **calibrate/align heads**, **replace rollers**, clear **paper jams**, correct paper loading.

## Thermal
- **Heat-sensitive (wax-coated) paper** darkens under a heating element; **no ink**; **receipts, shipping/barcode labels**.
- Maintenance: replace paper roll, **clean the heating element** (isopropyl), **remove paper debris/dust from tearing** regularly. Prints fade with heat/light.

## Impact (dot matrix)
- **Print head pins** strike a **ribbon** onto paper - a **dot matrix** forms characters.
- **Multipart / carbon(less) paper** (white/yellow/pink layers) - **multiple copies in one pass**; **tractor-fed** continuous paper with sprocket holes.
- Maintenance: replace **ribbon**, **print head**, paper; adjust head gap.

## 3D printers (obj 3.7 mentions)
Filament (PLA/ABS) melted layer by layer (FFF/FDM) or resin (SLA); level the bed; nozzle cleaning.

---

# Lesson 10.3 - Troubleshooting

## Connectivity
Powered on & **online**? consumables loaded? **print a test page** from the printer panel (isolates PC vs printer). Check cable / IP / Wi-Fi; **firmware & driver updates**; cloud printers → **verify registration**.

## Feed issues
- **Paper jams** - follow on-screen path instructions; check **paper settings** (weight/size), **feed/pickup roller** wear (worn = multiple sheets or none), humidity-curled paper, overfilled tray.
- **Grinding noises** - cartridge / print head **not seated**, gear/roller failure.

## Print quality - symptom → fix (memorise)
| Symptom | Cause / fix |
|---|---|
| **Faded / faint** | Low toner (shake cartridge as a stopgap), economy mode, **print resolution**; **replace toner** |
| **Black stripes / all-black page** | **Charge roller** or **high-voltage power supply** failure |
| **Vertical / horizontal lines, repeating marks** | Dirty/damaged **rollers** or scratched drum; clean rollers, replace drum |
| **Smudged / smeared toner (rubs off)** | **Fuser** not heating → **replace fuser** |
| **A colour missing** | Empty/blocked cartridge; **replace cartridge, clean contacts** |
| Ghost images | Drum/cleaning blade |
| Speckling / toner on back | Toner leak, dirty rollers |
| **Garbled / gibberish** | **Wrong PDL / driver**; corrupt job - clear queue, reinstall driver |
| Inkjet streaks / gaps | Clogged nozzles → clean/align print head |
| Always: **print test page** to verify results after each fix | |

## Finishing issues
- Wrong **page orientation**; **hole-punch** errors → verify **max page count**; **staple** errors → **stapler jam** or **staples empty**.

## Print job issues
- **Print monitor/queue** shows status. **Clear old jobs**; **frozen queue → stop and restart the Print Spooler service** (`services.msc` / `net stop spooler` → clear `%systemroot%\System32\spool\PRINTERS` → `net start spooler`).
- **Tray not recognised** → tray fully inserted, configured in Properties.
- **Garbled** → PDL; test page good = application-specific issue.
- Job prints on wrong printer / wrong tray → default printer / preferences.

## Self-test
1. Seven laser steps in order, and what charge the drum has after charging and after exposing.
2. Which step uses heat? Which component causes toner to rub off?
3. What is a PDL? Name three. Symptom of wrong PDL?
4. Properties vs Preferences - where do you set duplex? Where do you set sharing?
5. What's needed for scan-to-email? scan-to-SMB?
6. Why never use compressed air on a laser printer?
7. Thermal vs piezoelectric inkjet.
8. Thermal printer paper and use cases; maintenance items.
9. Multipart paper and tractor feed belong to which printer type?
10. Frozen queue - the fix? Black stripes - the part? Missing colour - the fix?
