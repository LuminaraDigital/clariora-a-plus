# 12 · Ports, Protocols & Network Services (Module 06 Lesson 6.3, Module 07 Lessons 7.1-7.2)

**Exam objectives:** Core 1 · 2.1 Compare and contrast TCP and UDP ports, protocols, and their purposes · 2.3 Summarize services provided by networked hosts · 2.4 (network security appliances).

This is the **highest-yield recall file on Core 1**. Drill the port table every day.

---

# Ports and transport

- Transport layer uses **port numbers** so multiple conversations run at once. **65,536 ports (0-65535)**.
- **Well-known**: 0-1023 · **Registered**: 1024-49151 · **Dynamic / ephemeral**: **49152-65535** (client side).
- A **socket** = IP : port.

## TCP vs UDP
| | **TCP** | **UDP** |
|---|---|---|
| Connection | **Connection-oriented** | **Connectionless** |
| Reliability | **Guaranteed delivery** - sequencing, ACKs, retransmission, flow control | Best-effort - no sequencing, no ACK |
| Setup | **Three-way handshake: SYN → SYN/ACK → ACK** | None |
| Overhead | Higher | Lower / faster |
| Header flags | SYN, ACK, FIN, RST, PSH, URG | - |
| Examples (deck) | **HTTPS, SSH, FTP**, HTTP, SMTP, RDP | **DHCP, DNS, TFTP**, SNMP, NTP, VoIP/streaming |

DNS uses UDP 53 for queries and TCP 53 for zone transfers/large responses.

## THE PORT TABLE - memorise every row

| Port | Protocol | TCP/UDP | Purpose |
|---|---|---|---|
| **20 / 21** | **FTP** | TCP | File transfer - 20 data, 21 control. Plaintext. |
| **22** | **SSH** (also **SFTP**, SCP) | TCP | Encrypted remote shell / file transfer |
| **23** | **Telnet** | TCP | Remote shell - **plaintext, insecure** |
| **25** | **SMTP** | TCP | Send mail (server↔server) |
| **49** | **TACACS+** | TCP | AAA - device admin auth (Cisco) |
| **53** | **DNS** | UDP (TCP) | Name resolution |
| **67 / 68** | **DHCP** | UDP | 67 server, 68 client |
| **69** | **TFTP** | UDP | Trivial file transfer (PXE boot, firmware) |
| **80** | **HTTP** | TCP | Web, plaintext |
| **88** | **Kerberos** | UDP (TCP) | AD authentication |
| **110** | **POP3** | TCP | Retrieve mail (download & delete) |
| **123** | **NTP** | UDP | Time sync |
| **137-139** | **NetBIOS** | UDP/TCP | Legacy Windows naming/sessions |
| **143** | **IMAP** | TCP | Retrieve mail (keep on server, sync) |
| **161 / 162** | **SNMP** | UDP | 161 agent (poll), **162 trap** (agent → manager alert) |
| **389** | **LDAP** | TCP | Directory queries (AD) |
| **443** | **HTTPS** | TCP | Web over TLS |
| **445** | **SMB / CIFS** | TCP | Windows file & printer sharing |
| **465 / 587** | **SMTPS / SMTP-submission** | TCP | Encrypted mail sending (587 STARTTLS is the modern standard; 465 implicit TLS) |
| **514** | **Syslog** | UDP | Log forwarding |
| **636** | **LDAPS** | TCP | LDAP over TLS |
| **993** | **IMAPS** | TCP | IMAP over TLS |
| **995** | **POP3S** | TCP | POP3 over TLS |
| **1812 / 1813** | **RADIUS** | UDP | AAA - 1812 auth, 1813 accounting |
| **3389** | **RDP** | TCP | Remote Desktop |
| **4460** | **NTS** | TCP | Network Time Security (secure NTP key exchange) |
| **5900** | **VNC** | TCP | Cross-platform remote desktop |
| **8080** | HTTP-alt / **proxy** | TCP | Common proxy/dev web port |

Pairs to learn together: 80/443 · 25/465-587 · 110/995 · 143/993 · 389/636 · 23/22 · 20-21/22(SFTP) · 161/162 · 67/68 · 1812/49.

---

# Lesson 7.1 - Networked host services

## File / print servers
- **SMB** (Server Message Block) - Windows sharing; **Samba** implements SMB on Linux. **NetBIOS** legacy name service.
- **FTP** - plaintext. **FTPS** = FTP over **TLS**. **SFTP** = file transfer over **SSH** (port 22). Don't confuse FTPS and SFTP.

## Database servers
- Flat file vs database. **Relational** (SQL): Oracle, MySQL, MariaDB, SQL Server (1433), PostgreSQL. **Non-relational / NoSQL**: MongoDB, CouchDB.

## Web servers
- Host sites over **HTTP 80** / **HTTPS 443**. **URL** = scheme://host:port/path?query.
- **HTTPS** = HTTP over **TLS**: server presents a **certificate** issued by a trusted **Certificate Authority (CA)**; browser shows the **lock icon**. Encryption + authentication of the server.

## Mail servers
- **SMTP 25** transfers mail between servers (and client → server on 587/465 with TLS).
- **Mailbox** access: **POP3 110/995** downloads (usually deletes from server - single device) vs **IMAP 143/993** keeps mail on server and syncs folders (multi-device).
- Exchange/ActiveSync for enterprise (file 15).

## Directory & authentication
- **LDAP 389 / LDAPS 636** - query the directory (Active Directory).
- **AAA** = Authentication, Authorization, Accounting. Roles: **supplicant** (client) → **NAS / authenticator** (switch/AP/VPN) → **AAA server**.
 - **RADIUS** UDP 1812/1813 - network access (Wi-Fi enterprise, VPN).
 - **TACACS+** TCP 49 - device administration; separates the three A's.
 - **Kerberos** UDP 88 - Windows domain SSO tickets.

## Remote terminal access
- **SSH 22** encrypted; **Telnet 23** plaintext; terminal emulator e.g. **PuTTY**; **RDP 3389** graphical Windows.

## Time
- **NTP 123** - sync clocks. **Stratum** levels: 0 = atomic/GPS clock, 1 = directly attached server, 2 = syncs from 1, … Lower = more accurate. **NTS 4460** secures it.
- Wrong time breaks Kerberos, certificates, logs.

## Network monitoring
- **SNMP** - **agents** on devices, **manager/NMS** polls **161**; agents send **traps** to **162**. Uses **MIB/OID** data. **v1/v2c** community strings (plaintext) vs **v3** (auth + encryption - use this).
- **Syslog 514** - devices forward log messages to a central collector; severity 0 (emergency) → 7 (debug).

---

# Lesson 7.2 - Internet and embedded appliances

| Appliance | What it does |
|---|---|
| **Proxy server** | Makes web requests **on behalf of clients**; caches content (bandwidth), **content filtering**, logging, hides internal IPs. Forward vs reverse proxy. Port 8080 common. |
| **Spam gateway** | Filters inbound mail; verifies **SPF, DKIM, DMARC** DNS records (file 13) |
| **UTM** (unified threat management) | **Single appliance**: firewall + AV/anti-malware + IDS/IPS + content filter + VPN + spam |
| **Firewall / NGFW** | ACLs; next-gen adds app awareness, IPS |
| **IDS / IPS** | Detects (alerts) vs Prevents (blocks) intrusions inline |
| **Load balancer** | Distributes requests across multiple servers → performance + availability |
| **Legacy systems** | **EOL / EOSL** - no vendor support/patches → security risk; isolate |
| **Embedded systems** | Purpose-built devices with fixed function firmware |
| **ICS** (industrial control system) | Controls power, HVAC, pumps - **OT** (operational technology) networks |
| **SCADA** (supervisory control and data acquisition) | Monitors/controls **two or more ICSs** across sites |
| **IoT** | Wearables, appliances, vehicles, cameras - a **hub/controller** manages smart devices; comms via **Zigbee**, **Z-Wave**, Wi-Fi, Bluetooth; often insecure - segment onto its own VLAN |

## Self-test
1. Ephemeral port range?
2. TCP handshake steps? Name three TCP and three UDP protocols.
3. Ports: FTP, SSH, Telnet, SMTP, DNS, DHCP, HTTP, POP3, IMAP, HTTPS, SMB, RDP, LDAP, LDAPS, SNMP, NTP, Syslog, RADIUS, TACACS+, Kerberos, VNC, SMTPS, IMAPS, POP3S.
4. FTPS vs SFTP?
5. POP3 vs IMAP - which suits multiple devices?
6. Supplicant / NAS / AAA server - which is which? RADIUS vs TACACS+ transport and use?
7. What is an NTP stratum?
8. SNMP trap port? Which SNMP version is secure?
9. Proxy vs load balancer vs UTM - one line each.
10. ICS vs SCADA; two IoT protocols.
