# 02. Core 1: Networking, Ports & Network Services (220-1201)

This module covers networking cables, hardware, IP addressing, wireless standards, protocols, and network troubleshooting based on Modules 5, 6, and 7 of the curriculum.

---

## 1. Network Cables & Connectors

### Twisted Pair Cabling (UTP / STP)
Unshielded Twisted Pair (UTP) uses twisted copper pairs to minimize electromagnetic interference (EMI) and crosstalk.

| Category | Max Speed | Max Distance | Bandwidth | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Cat 5** | 100 Mbps | 100 meters | 100 MHz | Legacy Fast Ethernet |
| **Cat 5e** | 1 Gbps (1000BASE-T) | 100 meters | 100 MHz | Standard Gigabit Ethernet |
| **Cat 6** | 10 Gbps (10GBASE-T) | 55 meters (10 Gbps) / 100m (1 Gbps) | 250 MHz | High-speed LANs |
| **Cat 6a** | 10 Gbps | 100 meters | 500 MHz | Augmented 10 Gigabit |

### Cabling Standards (ANSI/TIA-568)
* **T568A Pinout**: White/Green, Green, White/Orange, Blue, White/Blue, Orange, White/Brown, Brown.
* **T568B Pinout**: White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown.
* **Straight-Through Cable**: T568B on both ends (connects different device types: PC to Switch).
* **Crossover Cable**: T568A on one end, T568B on the other (connects similar devices: PC to PC, Switch to Switch).

### Fiber Optic Cables
* **Single-Mode Fiber (SMF)**: Yellow jacket, narrow core ($9 \mu m$), uses laser light. Supports long distances (up to 40 km).
* **Multi-Mode Fiber (MMF)**: Aqua/Orange jacket, wide core ($50/62.5 \mu m$), uses LED light. Used for short-distance LAN backbones (<500 meters).
* **Connectors**: **ST** (Straight Tip - bayonet twist), **SC** (Subscriber Connector - square snap-in), **LC** (Lucent Connector - small latching), **BNC** (Coaxial).

---

## 2. Networking Hardware & Wireless Standards

### Hardware Devices
* **Switch**: Layer 2 OSI device. Uses **MAC address tables** to forward frames to specific destination ports.
* **Router**: Layer 3 OSI device. Uses **IP routing tables** to forward packets between different subnets/networks.
* **Access Point (AP)**: Wireless bridge connecting Wi-Fi client devices to wired Ethernet network.
* **Power over Ethernet (PoE)**: Transmits electrical power + data over Ethernet cable.
  * **PoE (802.3af)**: 15.4 Watts.
  * **PoE+ (802.3at)**: 30.0 Watts.
  * **PoE++ (802.3bt)**: Up to 60W (Type 3) / 90W (Type 4).

### Wireless Wi-Fi Standards (802.11)
| Standard | Frequency | Max Theoretical Speed | Key Feature |
| :--- | :--- | :--- | :--- |
| **802.11a** | 5 GHz | 54 Mbps | Legacy 5 GHz |
| **802.11b** | 2.4 GHz | 11 Mbps | Legacy 2.4 GHz |
| **802.11g** | 2.4 GHz | 54 Mbps | Backward compatible with 802.11b |
| **802.11n (Wi-Fi 4)** | 2.4 & 5 GHz | 600 Mbps | Introduced MIMO (Multiple Input Multiple Output) |
| **802.11ac (Wi-Fi 5)** | 5 GHz | 6.9 Gbps | Introduced MU-MIMO & 80MHz channel bonding |
| **802.11ax (Wi-Fi 6/6E)**| 2.4, 5 & 6 GHz | 9.6 Gbps | OFDMA, reduced latency, 6 GHz spectrum |

---

## 3. Comprehensive Ports & Protocols Master Table

| Port Number | Protocol | Transport | Description / Application |
| :---: | :--- | :---: | :--- |
| **20 / 21** | **FTP** (File Transfer Protocol) | TCP | Transfers files between client and server (20=Data, 21=Control). |
| **22** | **SSH** (Secure Shell) / SFTP | TCP | Secure encrypted remote command-line login. |
| **23** | **Telnet** | TCP | Unencrypted legacy remote command-line login (cleartext). |
| **25** | **SMTP** (Simple Mail Transfer Protocol) | TCP | Sends email between mail servers. |
| **53** | **DNS** (Domain Name System) | UDP/TCP | Resolves domain names (e.g., google.com) to IP addresses. |
| **67 / 68** | **DHCP** (Dynamic Host Configuration Protocol)| UDP | Automatically assigns IP, Subnet Mask, Gateway, DNS to hosts. |
| **69** | **TFTP** (Trivial File Transfer Protocol) | UDP | Lightweight file transfer (used for PXE network booting). |
| **80** | **HTTP** (Hypertext Transfer Protocol) | TCP | Unencrypted web browser traffic. |
| **110** | **POP3** (Post Office Protocol v3) | TCP | Downloads email from server to local inbox (deletes from server). |
| **123** | **NTP** (Network Time Protocol) | UDP | Synchronizes clock time across network devices. |
| **143** | **IMAP** (Internet Message Access Protocol) | TCP | Syncs email across multiple client devices (keeps email on server). |
| **161 / 162**| **SNMP** (Simple Network Mgmt Protocol) | UDP | Network monitoring & device management (161=Poll, 162=Trap). |
| **389** | **LDAP** (Lightweight Directory Access Protocol)| TCP | Queries Active Directory user directory services. |
| **443** | **HTTPS** (HTTP Secure) | TCP | Encrypted SSL/TLS web browser traffic. |
| **445** | **SMB** (Server Message Block) | TCP | Windows file and printer sharing. |
| **636** | **LDAPS** (LDAP Secure) | TCP | Encrypted Active Directory directory queries via SSL/TLS. |
| **3389** | **RDP** (Remote Desktop Protocol) | TCP | Windows Remote Desktop graphical session access. |

---

## 4. IP Addressing & Subnetting

### IPv4 Structure & Private IP Ranges
An IPv4 address consists of 32 bits divided into 4 octets ($8$ bits each).

* **Class A Private**: `10.0.0.0` to `10.255.255.255` (`10.0.0.0/8`)
* **Class B Private**: `172.16.0.0` to `172.31.255.255` (`172.16.0.0/12`)
* **Class C Private**: `192.168.0.0` to `192.168.255.255` (`192.168.0.0/16`)
* **APIPA (Automatic Private IP Addressing)**: `169.254.0.1` to `169.254.255.254`. Indicates host failed to reach a DHCP server.
* **Loopback Address**: `127.0.0.1` (IPv4) / `::1` (IPv6). Used to test local NIC stack.

### DHCP DORA Process
```
  Client                                     DHCP Server
    │                                             │
    ├───────── Discover (Broadcast UDP 67) ───────►│
    │                                             │
    │◄──────── Offer (Unicast UDP 68) ────────────┤
    │                                             │
    ├───────── Request (Broadcast UDP 67) ────────►│
    │                                             │
    │◄──────── Acknowledge (Unicast UDP 68) ──────┤
    │                                             │
```
