# 13 · DHCP, DNS, VLANs, VPNs & Network Troubleshooting (Module 06 Lesson 6.4, Module 07 Lesson 7.3)

**Exam objectives:** Core 1 · 2.5 (network configuration concepts) · 5.7 Troubleshoot problems with wired and wireless networks.

---

# DHCP - Dynamic Host Configuration Protocol

- Server automatically issues IP configuration to clients. UDP **67 (server) / 68 (client)**.
- **Scope** - the pool of addresses (and options: mask, gateway, DNS, lease time) for a subnet.
- **Lease** - address is loaned for a period; client renews at 50% (T1) and 87.5% (T2).
- **Reservation** - a fixed IP always given to a specific **MAC address** (printers, servers) - you need the MAC to create one.
- **Exclusions** - addresses in the range the server must not hand out (statically assigned devices).
- **DHCP relay / IP helper** - forwards broadcasts across routers to a central DHCP server.

## DORA - memorise the order and cast
| Step | Direction | Type |
|---|---|---|
| **D**iscover | Client → all | Broadcast |
| **O**ffer | Server → client | Unicast/broadcast |
| **R**equest | Client → server | Broadcast (so other servers withdraw) |
| **A**cknowledge | Server → client | Confirms lease |

No DHCP answer → **APIPA 169.254.x.x** (Windows) → local-only.

---

# DNS - Domain Name System

- Resolves **FQDN / hostname → IP** (and reverse). UDP/TCP **53**.
- **FQDN** = host.domain.tld. e.g. `www.example.com.` - **TLD** = `.com`; second-level = `example`; host = `www`.
- Hierarchy: **root** servers → **TLD** servers → **authoritative** name servers for the domain.

## Resolution order (deck: DNS Queries)
1. Local **HOSTS** file (`C:\Windows\System32\drivers\etc\hosts`; `/etc/hosts`)
2. Local resolver cache (`ipconfig /displaydns`)
3. Configured **local DNS server** (recursive resolver - ISP / router / AD DC)
4. Resolver asks **root** → **TLD** → **authoritative** server, caches the answer, returns it.

## Record types - memorise
| Record | Purpose |
|---|---|
| **A** | Hostname → **IPv4** |
| **AAAA** | Hostname → **IPv6** |
| **CNAME** | Alias → canonical name |
| **MX** | **Mail exchanger** - which server receives mail for the domain (with priority) |
| **NS** | Name servers authoritative for the zone |
| **SOA** | Start of authority - zone serial, refresh, primary NS |
| **PTR** | **Reverse** lookup - IP → name |
| **TXT** | Free text - used for **SPF, DKIM, DMARC**, domain verification |
| **SRV** | Service locator - e.g. AD, SIP (`_ldap._tcp.domain`) |

## Email anti-spoofing records (all TXT)
- **SPF** (Sender Policy Framework) - lists which servers may send mail for the domain.
- **DKIM** (DomainKeys Identified Mail) - cryptographic signature on outbound mail; public key in DNS.
- **DMARC** - policy telling receivers what to do when SPF/DKIM fail (none/quarantine/reject) + reporting.

---

# VLANs - Virtual LANs
- Implemented on **switches**: logically split one physical switch into multiple broadcast domains.
- Benefits (deck): **increased performance** (smaller broadcast domains), **increased security** (segmentation - VoIP, guests, IoT, servers), **control of communication** between networks/nodes.
- Traffic between VLANs needs a **router / Layer 3 switch**. **Trunk** ports (802.1Q tagging) carry multiple VLANs between switches - capstone item 5.

---

# VPNs - Virtual Private Networks
- **Secure, encrypted tunnel** over an untrusted network (the Internet, **public Wi-Fi**).
- **Remote-access VPN**: user's device ↔ corporate VPN gateway (client software or built-in Windows VPN). **Site-to-site**: router ↔ router.
- Protocols: IPsec, SSL/TLS VPNs, L2TP/IPsec, OpenVPN, WireGuard, (PPTP obsolete/insecure).
- Full tunnel vs split tunnel.

---

# Lesson 7.3 - Troubleshooting networks

## Wired connectivity
- **Cable and NIC issues** - physical damage, loose plugs, wrong pinout, bad crimp; check the path **wall port → patch panel → switch**.
- Link lights: none = no physical link; amber often = 10/100 or error.
- **Port flapping** - link continuously goes up/down → bad cable/connector, failing NIC/port, duplex/speed mismatch, loose SFP.

## Speed issues
Speed limited by: **port configuration** (auto-neg to 100 Mbps, half duplex), **NIC / switch port** capability, **cabling** (Cat 5 on a gigabit link, too long, damaged), **interference** (EMI on unshielded runs), **malware** (bandwidth hogging), also congestion, QoS.

## Wireless issues
- **Intermittent connectivity** - configuration, **band selection**, **standard mismatch**, **signal strength / RSSI**, interference, channel overlap → **Wi-Fi analyzer**.
- Move closer / reposition AP / change channel / update drivers / firmware.

## VoIP issues
- **Latency** - delay (one-way >150 ms is bad).
- **Jitter** - **variation in delay** over time (choppy audio).
- Packet loss.
- Fix: **QoS** - prioritise voice traffic; separate voice VLAN.

## Limited connectivity
- Determine the **scope** (one user? one switch? whole site?), **cable configuration**, **VLAN configuration** (port in wrong VLAN → gets no DHCP / can't reach servers), DHCP exhaustion, DNS failure ("Internet works by IP but not by name").

## Windows-side network troubleshooting commands (detail in file 20)
`ipconfig /all` → `ping 127.0.0.1` → `ping <own IP>` → `ping <gateway>` → `ping 8.8.8.8` → `nslookup` → `tracert` / `pathping`.

## Self-test
1. DORA - expand and give the direction of each.
2. What is a DHCP reservation and what do you need to create one?
3. Name resolution order on a Windows host?
4. Records: A, AAAA, MX, CNAME, PTR, NS, SOA, TXT, SRV - one line each.
5. SPF, DKIM, DMARC - what each does.
6. Three benefits of VLANs; which device routes between them?
7. What is a VPN for; when would a home user use one?
8. Latency vs jitter; the fix for VoIP.
9. What is port flapping and its likely causes?
10. Ping order for isolating a connectivity fault?
