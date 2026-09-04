# 09 · Network Types, Hardware & Cabling (Module 05, Lessons 5.1-5.3)

**Exam objectives:** Core 1 · 2.7 Compare and contrast Internet connection types, network types, and their characteristics · 2.8 Explain networking tools and their purposes · 3.2 (cable types).

---

# Lesson 5.1 - Network types

| Type | Scope | Notes |
|---|---|---|
| **LAN** | Single geographic location (building/campus) | Ethernet (IEEE 802.3) |
| **WLAN** | Wireless LAN | **IEEE 802.11** (Wi-Fi) |
| **WAN** | Large geographic area - cities, countries | Links LANs; ISP/telecom provided; the Internet is the biggest WAN |
| **MAN** | Metropolitan - a city | Between LAN and WAN |
| **PAN** | Personal - a few metres | Bluetooth, NFC - phone ↔ earbuds ↔ watch |
| **SAN** | Storage area network | Block-level storage (iSCSI, Fibre Channel); servers see it as local disk |

## SOHO vs enterprise
- **SOHO** (small office / home office) - LAN with **a single appliance** doing everything: **router + switch + wireless AP** (+ sometimes modem + firewall).
- **Enterprise** - separate dedicated devices for each function; structured cabling; managed switches; positioning of components matters (core/distribution/access).

## Datacentre
A **site dedicated to housing server resources**: dedicated **network, power (UPS/generators), climate control**, and **secure physical access controls**. Racks, hot/cold aisles, redundant everything. (Your capstone builds a mini version.)

---

# Lesson 5.2 - Networking hardware

## NIC (network interface card)
- Ethernet (RJ-45), fibre (SFP), wireless.
- **MAC address** = hardware/physical address, **48-bit**, written as 12 hex digits (`00:1A:2B:3C:4D:5E`).
 - First **24 bits = OUI** (organisationally unique identifier - the manufacturer)
 - Last **24 bits** = NIC-specific.
- Operates at Layer 2 (Data Link).

## Patch panels
- Termination point: **wall jacks (keystone jacks)** → horizontal cable → **rear of patch panel** (punched down with a **punchdown tool** onto IDC blocks) → **front RJ-45 ports** → short patch cable → **switch port**.
- Lets you re-patch without touching wall cabling.

## Switches
- Connect end nodes on a LAN; forward frames by **MAC address** using the **CAM table** (content-addressable memory / MAC address table) - learns which MAC is on which port.
- Each switch port is its own **collision domain**; the whole switch (per VLAN) is one **broadcast domain**. (Hubs = one big collision domain; routers separate broadcast domains.)
- **Unmanaged** - plug and play, no config.
- **Managed** - web/CLI/SNMP management interface: VLANs, port speed/duplex, port security, link aggregation, monitoring. **Modular** chassis switches take line cards.

## Power over Ethernet
| Standard | Name | Power at PSE | Typical use |
|---|---|---|---|
| **802.3af** | PoE (Type 1) | 15.4 W | Phones, basic APs |
| **802.3at** | PoE+ (Type 2) | 30 W | Modern APs, PTZ cameras |
| **802.3bt** | PoE++ (Type 3 / Type 4) | 60 W / 90-100 W | High-power APs, displays, small switches |

Delivered by a **PoE-enabled switch** or a **PoE injector** (midspan) between a non-PoE switch and the device.

## Routers, firewalls (from M06 but belongs here)
- **Router** - forwards **packets by IP address** between networks; separates broadcast domains. Layer 3.
- **Firewall** - filters by **ACL** rules on packet header info: **IP, MAC, protocol, port**. Stateful inspection tracks connections. Also NGFW/UTM (file 12).

---

# Lesson 5.3 - Network cable types

## Twisted pair
- **UTP** (unshielded) - copper pairs twisted to cancel crosstalk/EMI; cheap; **100 m (328 ft)** max segment.
- **STP** (shielded) - foil around each pair and/or braided screen; **EMI protection** in noisy environments (factories, near fluorescent/motors); needs grounding.

### Category ratings - memorise
| Cat | Max rate | Distance | Ethernet standard |
|---|---|---|---|
| Cat 5 | 100 Mbps | 100 m | 100BASE-TX (Fast Ethernet) |
| **Cat 5e** | 1 Gbps | 100 m | 1000BASE-T (Gigabit) |
| **Cat 6** | 1 Gbps / **10 Gbps** | 100 m / **55 m** | 1000BASE-T / 10GBASE-T |
| **Cat 6A** | 10 Gbps | 100 m | 10GBASE-T |
| Cat 7 | 10 Gbps | 100 m | 10GBASE-T (shielded; not TIA-recognised) |
| Cat 8 | 25 / 40 Gbps | 30 m | 25GBASE-T / 40GBASE-T (datacentre) |

### T568A / T568B pinouts (Lab 04)
| Pin | T568A | T568B |
|---|---|---|
| 1 | White/Green | **White/Orange** |
| 2 | Green | **Orange** |
| 3 | White/Orange | **White/Green** |
| 4 | Blue | Blue |
| 5 | White/Blue | White/Blue |
| 6 | Orange | **Green** |
| 7 | White/Brown | White/Brown |
| 8 | Brown | Brown |

- **Straight-through**: same standard both ends (T568B/T568B is most common) - PC ↔ switch.
- **Crossover**: A one end, B the other - like ↔ like devices (PC ↔ PC, switch ↔ switch); mostly obsolete thanks to Auto-MDI/X.
- Mnemonic: A and B swap the **orange and green pairs** (pins 1/2 ↔ 3/6).

### Connectors
- **RJ-45** (8P8C) - Ethernet.
- **RJ-11** (6P2C/6P4C) - telephone, DSL.

### Installation considerations
- **Plenum-rated** cable - fire-resistant, low-smoke jacket for air-handling spaces (above drop ceilings). PVC/riser elsewhere.
- **Direct burial** - gel-filled/armoured for outdoor underground.
- Respect bend radius; don't run beside power cables.

## Copper cabling tools (obj 2.8)

| Tool | Use |
|---|---|
| **Cable / wire stripper** | Trim back outer jacket |
| **Snips / cutter** | Cut cable and wires to length |
| **Punchdown tool** | Push wires into IDC on keystone jacks / patch panels (110 blade) |
| **Crimper** | Attach RJ-45 / RJ-11 plugs |
| **Cable tester** | LEDs confirm continuity/pinout of each pair; certifiers measure performance |
| **Toner probe** (tone generator + probe) | Trace/locate a cable in a bundle or wall |
| **Loopback plug** | Tests a NIC/port's transmit ↔ receive path |
| **Network tap** | Passive - copies traffic without interrupting; Active - regenerates the signal and forwards; used for monitoring/IDS |
| Wi-Fi analyzer | Signal strength, channels, interference (file 10) |
| Multimeter / PSU tester | Electrical checks |

## Fibre optic
- Glass core carries light: **higher bandwidth, longer distance, immune to EMI**, no electrical hazard, more expensive/fragile.
- **Single-mode (SMF)** - tiny core (~9 µm), laser, **long distance** (km, tens of km); yellow jacket.
- **Multi-mode (MMF)** - larger core (50/62.5 µm), LED/VCSEL, **short distance** (up to a few hundred m); orange/aqua jacket.
- Connectors: **ST** (straight tip, bayonet, round), **SC** (subscriber, square push-pull), **LC** (lucent, small square latching - most common today), MTRJ/MPO less common. Transceivers: **SFP / SFP+ / QSFP**.

## Coaxial
- Central copper conductor, dielectric, braided shield, jacket.
- **RG-6** (cable TV / cable Internet, satellite), **RG-59** (older CCTV/short runs).
- Connector: **F-type** (screw-on, cable modem/TV); **BNC** (bayonet, CCTV/legacy).

## Self-test
1. LAN, WAN, MAN, PAN, SAN, WLAN - one line each and the IEEE standard for WLAN.
2. What one box does a SOHO router combine?
3. MAC address length and what the OUI is.
4. Path from wall jack to switch - what tool terminates the patch panel?
5. Collision domain vs broadcast domain - which device separates which?
6. 802.3af / at / bt wattages?
7. Cat 5e, 6, 6A, 8 speed and distance? Cat 6 at 10 Gbps distance?
8. T568B pin order? Which two pairs differ between A and B?
9. Punchdown vs crimper; toner probe vs cable tester; passive vs active tap.
10. SMF vs MMF - core size, light source, distance. Name three fibre connectors.
11. RG-6 connector type?
