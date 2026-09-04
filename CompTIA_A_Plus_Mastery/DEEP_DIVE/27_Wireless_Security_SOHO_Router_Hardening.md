# 27 · Wireless Security Protocols & SOHO Router Hardening (Module 18, Lessons 18.2-18.3)

**Exam objectives:** Core 2 · 2.3 Compare and contrast wireless security protocols and authentication methods · 2.10 Apply security settings on SOHO wireless and wired networks.

---

# Lesson 18.2 - Wireless security protocols

## The encryption ladder - memorise
| Protocol | Encryption | Integrity/keying | Status |
|---|---|---|---|
| **WEP** | RC4, static key | CRC - broken | **Never use** |
| **WPA** | **TKIP** (Temporal Key Integrity Protocol) - still **RC4** but per-packet keys | MIC | Deprecated |
| **WPA2** | **AES** (Advanced Encryption Standard, symmetric) with **CCMP** (replaced TKIP) | Robust | Minimum acceptable |
| **WPA3** | **AES-GCMP** (replaces CCMP), 192-bit enterprise mode | **SAE** authentication | Best - use where supported |

Notes:
- **TKIP** was a stop-gap to run on WEP hardware; **AES-CCMP** required new hardware.
- **WPA2 with TKIP** compatibility mode weakens it - choose **WPA2-AES** or **WPA2/WPA3 mixed** only if needed.

## Authentication methods
| Mode | How |
|---|---|
| **WPA2-Personal (PSK)** | **Pre-shared key / passphrase** (8-63 chars) used by everyone to derive the key |
| **WPA3-Personal (SAE)** | Still a **passphrase**, but **Simultaneous Authentication of Equals** (Dragonfly handshake) - resists offline dictionary attacks; **perfect forward secrecy** = **compromised keys cannot decrypt previously captured traffic** because keys change per session |
| **WPA2/WPA3-Enterprise (ENT)** | **IEEE 802.1X** port-based access control with **EAP** (Extensible Authentication Protocol); users/devices authenticate to an **AAA server** (RADIUS/TACACS+) with **individual credentials or certificates**; supports **MFA**; per-user keys |
| **Open / OWE** | No password; WPA3 "Enhanced Open" encrypts anyway |
| **WPS** | Push-button/PIN pairing - PIN is brute-forceable → **disable** |
| **Captive portal** | Web page login for guests |

## Enterprise auth protocols
| Protocol | Port | Purpose |
|---|---|---|
| **RADIUS** (Remote Authentication Dial-In User Service) | **UDP 1812** auth / 1813 accounting | Forwards user credentials to the auth server; network access (Wi-Fi, VPN); combines auth+authz |
| **TACACS+** (Terminal Access Controller Access-Control System Plus) | **TCP 49** | **Device/remote-admin authentication** (routers, switches); separates AAA; encrypts full payload; Cisco |
| **Kerberos** | **UDP 88** (TCP possible) | **Microsoft/AD** SSO ticket-based auth (KDC, TGT, tickets); mutual auth; time-sensitive |
| EAP variants | | EAP-TLS (certs both sides - strongest), PEAP (server cert + MS-CHAPv2), EAP-TTLS, EAP-FAST |

---

# Lesson 18.3 - SOHO router security

## Setup
- **Physical placement**: **high elevation** (avoid furniture/human interference), **central** location for coverage; away from microwaves/metal.
- Cable: **ISP/modem → WAN port**, then power.
- **Login portal**: web GUI (192.168.0.1 / 1.1) or app; setup wizard.
- **Change the default admin password immediately** (default `admin/admin` is public knowledge). Change default admin *username* if possible. Disable **remote (WAN-side) management** unless needed.

## Firmware
- Keep **firmware and drivers updated** (security fixes); manual download & apply, or update via GUI; **maintain power throughout** the flash. Enable auto-update if offered.

## LAN / WLAN configuration
- **SSID** - change from default (default reveals vendor/model); consider not broadcasting (**disable SSID broadcast = obscurity, not security**).
- **Encryption**: **WPA2 (AES) or WPA3**; **strong passphrase**.
- **Disable guest access** unless needed; if used, isolate it (guest isolation/VLAN).
- **Channels** - pick least-congested (1/6/11 on 2.4 GHz) or auto; adjust **radio power** to limit spill.
- **Disable WPS**.
- **Change default IP range** (optional); **DHCP** - limit scope size; **static/DHCP reservations** for servers/printers/cameras.
- **MAC filtering** - allow-list of NIC addresses; easily spoofed → **defence in depth, not primary control**.
- Segment **IoT** onto its own SSID/VLAN.

## Firewall configuration
- **Inbound and outbound ACLs**; rules by **source/destination IP**, **source/destination port**, protocol; **content filtering** (URL/category, parental controls, safe search); block by schedule.
- Default deny inbound; SPI (stateful packet inspection) on.

## Port forwarding / triggering
- **Port forwarding**: **traffic arriving on an Internet-facing port is directed to a specific internal host** (and optionally a **different internal port**) - needed for hosting a game/web/camera server behind NAT. Requires the host to have a **static IP or DHCP reservation**.
- **Port triggering**: outbound traffic on a trigger port temporarily opens an inbound port.
- **Disable all unused ports/forwards.** Each forward is an exposure - secure the service behind it.

## UPnP - Universal Plug and Play
- Lets **devices/apps configure ACL/port-forwarding rules for themselves** with no authentication → malware/IoT can open holes.
- **Disable if not required.**

## Screened subnet (formerly DMZ)
- **Segment** where **Internet-facing hosts** live, isolated so they **cannot reach the internal LAN** if compromised; admins direct external traffic to it.
- SOHO "DMZ host" setting = **forward *all* inbound ports to one host** - convenient but exposes that host fully; use only for a hardened/sacrificial device, prefer specific port forwards.

## Other SOHO hardening (obj 2.10 list)
- Change default passwords ✓, IP filtering, firmware ✓, content filtering ✓, physical placement/secure access ✓, DHCP reservations ✓, static WAN IP if hosting, UPnP off ✓, screened subnet ✓, disable unused services (Telnet, remote admin), enable logging, WPA3, guest network, disable WPS, reduce transmit power.

## Self-test
1. WEP → WPA → WPA2 → WPA3 - encryption/protocol at each step.
2. What replaced TKIP? What replaced CCMP?
3. What is SAE and what does perfect forward secrecy mean?
4. PSK vs Enterprise - what does Enterprise need on the network?
5. RADIUS vs TACACS+ vs Kerberos - port, transport, main use.
6. First thing to do after logging into a new router?
7. Why is disabling SSID broadcast not real security? Why is MAC filtering weak?
8. Port forwarding - what it does and what the internal host needs.
9. What is UPnP and why disable it?
10. Screened subnet vs the SOHO "DMZ host" setting.
