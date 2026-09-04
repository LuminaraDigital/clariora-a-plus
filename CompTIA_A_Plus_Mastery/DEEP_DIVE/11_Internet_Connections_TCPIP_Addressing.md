# 11 · Internet Connections, TCP/IP & IP Addressing (Module 06, Lessons 6.1-6.2)

**Exam objectives:** Core 1 · 2.5 (TCP/IP addressing) · 2.6 Configure basic wired/wireless SOHO networks · 2.7 Internet connection types.

> Note: Module 6's title-slide notes wrongly describe hypervisors - that's a paste error from Module 8. Ignore.

---

# Lesson 6.1 - Internet connection types

## The path out
Your LAN → **router WAN port** → **modem** (or ONT) → **ISP** (Internet service provider) → **IXP** (Internet exchange point, where ISPs interconnect) → the Internet.
The **modem** establishes the link between the router's WAN interface and the ISP's access network; the type of modem depends on the medium.

| Type | Medium | Speeds / notes |
|---|---|---|
| **DSL** | Copper telephone line (**PSTN**), two-pair | **ADSL** = asymmetric (download ≫ upload); **SDSL** = symmetric; **VDSL** faster/shorter; needs a **filter/splitter** to separate voice and data on the same line; distance from exchange limits speed |
| **Cable** | Coaxial cable-TV network, **F-type** connector | **DOCSIS** standard (3.0/3.1/4.0); shared neighbourhood bandwidth; asymmetric |
| **Fibre - FTTC** | Fibre to the *curb/cabinet*, then **copper** into the home | VDSL from the cabinet |
| **Fibre - FTTP / FTTH** | Fibre all the way into the premises | **ONT** (optical network terminal) converts light to Ethernet; symmetric gigabit+ |
| **Satellite** | Dish ↔ satellite | **Geostationary** = **high latency** (~600 ms), weather-sensitive; **LEO** (Starlink) = lower latency; rural |
| **WISP** | Wireless ISP - long-range Wi-Fi/fixed wireless from a tower | Rural; line-of-sight |
| **Cellular** | 3G / 4G LTE / 5G | Mobile hotspot, fixed 5G home broadband; **3G**: GSM vs CDMA; **4G LTE** unifies; **5G**: mMIMO, mmWave, low latency |

## Routers & firewalls (in the SOHO context)
- Router: **IP-address-based forwarding**, separates **broadcast domains**, NAT (below).
- Firewall: **ACL** (access control list) rules allow/deny by **IP, MAC, protocol, port**; SOHO firewalls default to "allow all outbound, block unsolicited inbound".

---

# Lesson 6.2 - TCP/IP concepts

## The TCP/IP model (4 layers) - know the PDU per layer

| Layer | Job | Addressing | PDU | Devices / examples |
|---|---|---|---|---|
| **Application** | High-level services | - | **Data** | HTTP, DNS, SMTP, SSH |
| **Transport** | End-to-end delivery, ports | Port number | **Segment** (TCP) / Datagram (UDP) | TCP, UDP |
| **Internet** | Between networks | **IP address** | **Packet** | IP, ICMP; **routers** |
| **Link / Network Interface** | Local segment | **MAC address** | **Frame** | Ethernet, Wi-Fi; **switches**, NICs |

(OSI mapping: Application layer = OSI 5-7; Transport = 4; Internet = 3; Link = 1-2.)

## IPv4 addressing
- **32-bit**, written as **four octets** in dotted decimal, each **0-255**.
- Address = **Network ID** + **Host ID**, split by the **subnet mask** (network prefix). Written `192.168.1.10/24` = mask `255.255.255.0`.
- Host bits all 0 = network address; all 1 = broadcast address; usable hosts = 2ⁿ − 2.

### Classful ranges - memorise
| Class | 1st octet | Default mask | Prefix | Binary mask |
|---|---|---|---|---|
| **A** | 0-127 | 255.0.0.0 | /8 | 11111111.00000000.00000000.00000000 |
| **B** | 128-191 | 255.255.0.0 | /16 | 11111111.11111111.00000000.00000000 |
| **C** | 192-223 | 255.255.255.0 | /24 | 11111111.11111111.11111111.00000000 |
| D | 224-239 | multicast | | |
| E | 240-255 | experimental | | |

Modern networks use **CIDR** (classless) - any prefix length. Common: /24 = 254 hosts, /25 = 126, /26 = 62, /27 = 30, /28 = 14, /30 = 2.

### Special addresses - memorise
| Range | Meaning |
|---|---|
| **10.0.0.0 - 10.255.255.255** (10/8) | Private, Class A |
| **172.16.0.0 - 172.31.255.255** (172.16/12) | Private, Class B |
| **192.168.0.0 - 192.168.255.255** (192.168/16) | Private, Class C |
| **169.254.0.1 - 169.254.255.254** (169.254/16) | **APIPA** - self-assigned when DHCP fails |
| **127.0.0.1** (127/8) | Loopback |
| 0.0.0.0 | "Any" / default route |
| 255.255.255.255 | Limited broadcast |

**Private addresses are not routable on the Internet** → **NAT**.

## NAT - Network Address Translation
- Router rewrites private source IPs to its public IP (**PAT / NAT overload** tracks by port so many hosts share one public IP).
- **Private → public** for outbound; **public → private** for **port forwarding** inbound (file 27).

## IPv4 forwarding
- Host compares destination with its own network (using the mask):
 - **Same network** → uses **ARP** to find the destination's MAC and sends the frame directly (a router with source and destination on the same interface forwards it back out that same interface).
 - **Different network** → sends to the **default gateway** (router), which consults its routing table and forwards out the appropriate interface.
- **ARP** (Address Resolution Protocol) maps IP → MAC on the local segment; `arp -a` shows the cache.

## Host address configuration
Every IPv4 host needs four things:
1. **IP address**
2. **Subnet mask**
3. **Default gateway** (router's LAN IP)
4. **DNS server** IP(s)

### Static vs dynamic
- **Static** - typed manually into the NIC; use for servers, printers, network gear (or DHCP **reservations**).
- **DHCP** - server hands out a lease automatically (file 13 for DORA).
- **APIPA** - if no DHCP reply, Windows self-assigns 169.254.x.x with no gateway → **local-only** connectivity. Seeing 169.254 = "I couldn't reach DHCP".

## SOHO router configuration (obj 2.6)
- Multiple **interfaces**: WAN (to modem), LAN switch ports, WLAN radio(s).
- Manage via **web GUI** (`192.168.0.1` / `192.168.1.1`), app, or console.
- Typical tasks: WAN type (DHCP/PPPoE/static), LAN IP range & DHCP scope, SSID/security, firmware update, admin password, port forwarding, guest network. Hardening in file 27.

## IPv6 addressing
- **128-bit**, written as **eight 16-bit hex groups** separated by colons: `2001:0db8:0000:0000:0000:ff00:0042:8329`.
- Shortening: drop leading zeros in a group; replace **one** run of all-zero groups with `::` → `2001:db8::ff00:42:8329`.
- **Prefixes**: typically /64 for a LAN (first 64 bits network, last 64 interface ID, often derived from MAC via EUI-64 or randomised).
- Special: `::1` loopback; `fe80::/10` **link-local** (auto-configured, every interface has one); `fc00::/7` unique local (private); `2000::/3` global unicast; `ff00::/8` multicast. **No broadcast** in IPv6.
- Autoconfig: **SLAAC** (stateless, from router advertisements) or DHCPv6.
- **Dual stack** - hosts run IPv4 and IPv6 simultaneously during transition. Tunneling (6to4, Teredo) encapsulates v6 in v4.

## Self-test
1. What does a modem do, and what device replaces it on FTTP?
2. ADSL vs SDSL; what's a DSL filter for?
3. DOCSIS belongs to which connection type? Connector?
4. Why is geostationary satellite high-latency? What is LEO?
5. Name the four TCP/IP layers and the PDU at each.
6. First-octet ranges and default masks for Class A/B/C.
7. All three private ranges. APIPA range. Loopback.
8. What does 169.254.x.x tell you?
9. Four settings every IPv4 host needs.
10. IPv6 length, notation, and the two shortening rules. What does `fe80::` mean?
