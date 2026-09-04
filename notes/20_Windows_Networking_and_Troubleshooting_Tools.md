# 20 · Windows Networking & Network Troubleshooting Tools (Module 13 Lesson 13.3, Module 14 Lesson 14.1)

**Exam objectives:** Core 2 · 1.7 Configure Microsoft Windows networking features on a client/desktop · 1.5 (network CLI tools).

---

# Lesson 13.3 - Windows networking

## Connection types
- **Wired**: adapters named **Ethernet, Ethernet 2, …**; advanced NIC properties via **Device Manager → Properties → Advanced** (speed/duplex, Wake-on-LAN, jumbo frames).
- **Wireless**: scan and pick SSID, or **enter SSID manually** (hidden network); **Connect automatically** - only for **trusted** networks; forget network to reset.
- **WWAN** - cellular data card/eSIM in the laptop; **metered connection** setting limits background data/updates.
- **VPN** - Settings → Network → VPN → Add: provider (Windows built-in), server, type (IKEv2, L2TP/IPsec, SSTP, PPTP-avoid), sign-in; or **third-party VPN apps** (NordVPN, ExpressVPN, corporate clients).
- **Proxy** - Settings → Network → Proxy: auto-detect / setup script (PAC) / **manual IP + port (8080 common)**; improves **performance and security**, saves bandwidth via **local cache**, filters content.

## IP addressing schemes on the client
- IPv4 (32-bit dotted decimal) and IPv6 (128-bit hex) - need **IP, subnet mask, default gateway, DNS**; **static** vs **dynamic (DHCP)** - DHCP is default; **Alternate configuration** tab for fallback static.
- Configure: Settings → Network → adapter → **Edit IP assignment**, or **Network Connections (`ncpa.cpl`)** → adapter → Properties → **Internet Protocol Version 4 (TCP/IPv4)** → Properties (Lab 05).

## Client configuration components (installed by default)
- **Client for Microsoft Networks**, **File and Printer Sharing for Microsoft Networks**, **IPv4**, **IPv6**, **QoS Packet Scheduler**, **Link-Layer Topology Discovery** (mapper + responder → network map/discovery).

## Network location / firewall profiles
| Profile | Behaviour |
|---|---|
| **Public** | **Not discoverable**, sharing **disabled**; most restrictive - coffee shop |
| **Private** | **Discoverable**, file/printer sharing allowed - home/office |
| **Domain** | Auto when joined to AD; **firewall managed via Group Policy** |
Change: Settings → Network → adapter → Network profile. Wrong profile = "can't see other PCs / share not reachable".

## Windows Defender Firewall
- Windows Security → **Firewall & network protection**: on/off per profile, **allow an app through**, advanced settings (`wf.msc`) for **inbound/outbound rules** by **program, port, protocol, predefined**, scope, action (allow/block/secure). Default: block unsolicited inbound, allow outbound. Third-party firewalls replace it (Lab 34).

## Network Discovery / sharing
- **Advanced sharing settings**: network discovery, file & printer sharing, public folder sharing, password-protected sharing - per profile. **Workgroup** vs **domain** (file 22).

---

# Lesson 14.1 - Troubleshoot Windows networking

## IP configuration issues
| Symptom | Cause | Check |
|---|---|---|
| **Limited / no connectivity, 169.254.x.x** | Can't reach **DHCP** (cable, switch port, DHCP service down, VLAN) - **APIPA** | `ipconfig`, cable, `ipconfig /release` + `/renew` |
| **No Internet access** but LAN OK | **Gateway/DNS** wrong or down | `ipconfig /all`, ping gateway, ping 8.8.8.8, `nslookup` |
| Duplicate IP | Static clash | Change/reserve |
| Wrong subnet mask | Static typo | Compare with gateway |

### `ipconfig`
- `ipconfig` - basic; **`/all`** - MAC, DHCP server, lease, DNS; **`/release`** / **`/renew`** - DHCP lease; **`/displaydns`** - resolver cache; **`/flushdns`** - clear cache; `/registerdns`.
- **`hostname`** - computer name.

## Local connectivity - the ping ladder (memorise the order)
1. `ping 127.0.0.1` (loopback - TCP/IP stack)
2. `ping <own IP>` (NIC)
3. `ping <default gateway>` (LAN + router)
4. `ping <remote IP e.g. 8.8.8.8>` (Internet routing)
5. `ping <FQDN e.g. google.com>` (DNS)

Interpretation (deck):
- Loopback/own IP fail → **network adapter configuration/driver**.
- Gateway fails → **DHCP options** correct? **Router IP** correct? cable/switch/VLAN.
- Remote FQDN/IP fails → **does the resource exist**? IP works but name fails → **DNS settings**.
- Switches: `-t` continuous, `-n 10` count, `-4`/`-6`, `-a` resolve name. Note firewalls may block ICMP.

## Remote connectivity
- **`tracert host`** - each hop with **RTT** (three probes); `*` = timeout at that hop; `-d` skip name lookup.
- **`pathping host`** - tracert then statistics: **latency and packet loss per hop** (takes ~5 min).

## Name resolution
- Test **by FQDN vs by IP** - if IP works, DNS is the problem.
- **`nslookup`** - query DNS: `nslookup host`, `nslookup host 8.8.8.8` (specific server), interactive `set type=MX` / **`-type=A|AAAA|MX|NS|PTR|CNAME|SOA|TXT`**.
- Also `ipconfig /flushdns`, check HOSTS file, try alternate DNS.

## Ports and connections
- **`netstat`** - active TCP/UDP connections. **`-a`** all incl. listening/**UDP**, **`-b`** **process (binary) that opened the port** (admin), **`-n`** numeric (no DNS), **`-o`** owning PID, **`-e`** Ethernet statistics, **`-s`** per-protocol statistics, `-r` routing table.
- `arp -a` (IP→MAC cache), `route print`, `netsh` (e.g. `netsh wlan show profiles`, `netsh int ip reset`, `netsh winsock reset`), `getmac`, `nbtstat` (NetBIOS), `telnet host port` / `Test-NetConnection` (PowerShell) to test a port.

## Wireless-specific
- Check band/standard support, driver, saved profile password, `netsh wlan show interfaces` for signal; forget & rejoin; airplane mode; MAC filtering on AP.

## Self-test
1. Public vs private vs domain profile - discoverability and who manages the firewall.
2. Where do you set a static IP in Windows? Which four fields?
3. What is Link-Layer Topology Discovery for?
4. Proxy - where set, common port, two benefits.
5. 169.254.x.x means what; two commands to fix?
6. The five-step ping ladder in order and what each step's failure implies.
7. `ipconfig /all` vs `/flushdns` vs `/renew`.
8. `tracert` vs `pathping`.
9. `nslookup -type=MX example.com` does what?
10. `netstat -a`, `-b`, `-n`, `-o`, `-e`, `-s`.
