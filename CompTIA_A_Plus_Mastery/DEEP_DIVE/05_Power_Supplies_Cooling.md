# 05 · Power Supplies & Cooling (Module 03, Lesson 3.1)

**Exam objectives:** Core 1 · 3.6 Given a scenario, install or replace the appropriate power supply.

## What a PSU does
Converts **AC** from the wall to low-voltage **DC** rails the components use.

### Input voltage
- **115 V** (North America) vs **230 V** (UK/EU/most of the world).
- Older PSUs have a red **selector switch** - wrong setting = no power or a destroyed PSU. Modern PSUs are **auto-switching (100-240 V)**.

### Output rails
| Rail | Used by |
|---|---|
| **+3.3 V** | Chipset, RAM, some cards |
| **+5 V** | USB, drive logic, legacy |
| **+12 V** | CPU, GPU, motors (fans, HDD spindles) - **most important / most heavily loaded rail in modern PCs** |
| **−12 V** | Legacy serial; tiny load |
| **+5 VSB (standby)** | Always on while plugged in - powers Wake-on-LAN, USB charging when off |

The deck notes: **+3.3 V and +5 V outputs share a combined limit**; +12 V dominates modern loads.

## Wattage and sizing
- Add up component draw (CPU TDP + GPU + drives + fans + margin) and choose a PSU with **10-15% headroom** (deck instructor note).
- Under-sizing → **system instability**, random reboots under load, **component damage**.
- **Match power needs to power supply** - but also match physical form factor (ATX vs SFX for small cases) and connectors.

## 80 PLUS efficiency
Efficiency = DC out ÷ AC in. Higher = less waste heat, lower bills.

| Tier | Efficiency (at 50% load, 115 V) |
|---|---|
| 80 PLUS | 80% |
| **Bronze** | 85% |
| **Silver** | 88% |
| **Gold** | 90% |
| **Platinum** | 92% |
| **Titanium** | 94% |

The course names Bronze, Silver, Gold explicitly. Exact percentages vary slightly by load/voltage - know the *order*.

## Connectors - memorise

| Connector | Pins | Purpose |
|---|---|---|
| **P1 / main ATX** | **24-pin** (or 20+4) | Motherboard main power |
| Legacy main | 20-pin | Older boards; 20→24 adapter exists |
| **EPS / CPU** | 4-pin or **8-pin** (4+4) | CPU voltage regulators |
| **PCIe** | 6-pin or 8-pin (6+2); new **12VHPWR 16-pin** | Graphics cards |
| **SATA power** | 15-pin (flat, L-shaped) | SATA drives |
| **Molex** | 4-pin | Legacy drives, fans, accessories |
| Berg / floppy | 4-pin mini | Legacy floppy |

### Wire colours (from the deck)
| Colour | Voltage |
|---|---|
| Black | Ground |
| Yellow | +12 V |
| Red | +5 V |
| Orange | +3.3 V |
| Purple | +5 VSB |
| Green | PS_ON (short to ground to jump-start a PSU for testing) |
| Blue | −12 V |
| Grey | Power good |

## Modular vs non-modular
- **Modular**: detachable cables - attach only what you need → less clutter, **better airflow**.
- Semi-modular: main 24-pin and CPU fixed, rest detachable.
- Non-modular: all cables permanently attached.

## Redundant power supplies
- Two PSUs sharing the load; if one fails the other carries on = **failover protection**.
- Standard in **servers / datacentre** chassis.
- **Hot-swappable** (replace while running) vs **cold-swappable** (must power down).

## Cooling

### Why
Excess heat damages components and causes throttling, instability, and shutdowns.

### Passive vs active
- **Heat sink** = passive: metal fins increase surface area to shed heat.
- **Thermal paste / TIM** bridges microscopic gaps between CPU heat spreader and heat sink base - thin layer, reapply when re-mounting.
- **Fans** = active: move air across heat sinks and through the case.

### Airflow design
- **Cool air in from the front (or side/bottom)**, **hot air out the rear and top**.
- Positive pressure (more intake than exhaust) reduces dust ingress.
- Keep slot **blanking plates** in place - missing plates disrupt the airflow path.
- Cable management matters for airflow.

### Liquid cooling
Components of a loop (deck list): **water block** (on CPU/GPU) → **tubing** → **pump** → **radiator** → **fans** → **coolant**.
- **AIO (all-in-one / closed loop)** - sealed, no maintenance.
- **Open loop / custom** - needs periodic coolant top-up, leak checks, cleaning.

### Fan control
- Firmware fan curves (file 08): balance noise vs temperature; manual or via third-party software.
- 4-pin **PWM** fans allow fine speed control.

## Troubleshooting power (preview of file 08)
- Follow the **power flow**: outlet → cable → PSU → motherboard → components.
- **PSU tester** or multimeter to check rails.
- No fans, no LEDs → power path. Fans spin, no POST → board/CPU/RAM.
- Burning smell, scorch marks, **swollen capacitors** → replace.

## Self-test
1. Which rail carries most of a modern PC's load?
2. What does +5 VSB do?
3. What headroom does the course recommend when sizing a PSU?
4. Order Bronze/Silver/Gold/Platinum/Titanium.
5. Main ATX connector pin count? CPU power? PCIe?
6. Yellow, red, orange, black wires - voltages?
7. Why choose a modular PSU?
8. What's the difference between hot- and cold-swappable redundant PSUs?
9. List the parts of a liquid cooling loop.
10. Which direction should case airflow run?
