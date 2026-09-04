# 10 · Wireless Networking (Module 05, Lesson 5.4)

**Exam objectives:** Core 1 · 2.2 Explain wireless networking technologies · 2.8 (Wi-Fi analyzer).

## Access points
- An **AP** bridges wireless clients (IEEE **802.11**) onto the wired LAN.
- **SSID** = network name (up to 32 chars). **BSSID** = the AP's radio **MAC address**. **ESSID** = same SSID across multiple APs for roaming.
- SOHO routers embed an AP; enterprises use many APs managed by a wireless controller.

## Frequency bands
| Band | Range / penetration | Channels | Notes |
|---|---|---|---|
| **2.4 GHz** | Longer range, better wall penetration | 11 (US) / 13 (UK/EU), 20 MHz wide, **only 1, 6, 11 non-overlapping** | Crowded - microwaves, Bluetooth, baby monitors |
| **5 GHz** | Shorter range | Many more non-overlapping channels; **DFS** channels must yield to radar | Faster, less interference |
| **6 GHz** | Shortest range | Wi-Fi 6E / 7 only | Very clean spectrum |

**Channel bonding** combines adjacent channels (40/80/160/320 MHz) for more throughput at the cost of more interference.

## Standards - memorise

| Standard | Wi-Fi name | Band(s) | Max rate | Signature tech |
|---|---|---|---|---|
| **802.11a** | - | 5 GHz | 54 Mbps | OFDM; DFS |
| **802.11b** | - | 2.4 GHz | 11 Mbps | DSSS |
| **802.11g** | - | 2.4 GHz | 54 Mbps | OFDM; b-compatible |
| **802.11n** | **Wi-Fi 4** | 2.4 **and** 5 (dual band) | 600 Mbps | **MIMO**, channel bonding (40 MHz) |
| **802.11ac** | **Wi-Fi 5** | **5 GHz only** (dual/tri-band routers keep 2.4 via n) | ~2.1-6.9 Gbps | **MU-MIMO** (downlink), 80/160 MHz |
| **802.11ax** | **Wi-Fi 6 / 6E** | 2.4 / 5 / **6 GHz (6E)** | ~1.1 Gbps @2.4, 4.8 Gbps @5 (up to 9.6 aggregate) | **OFDMA**, MU-MIMO up/down, TWT, BSS colouring |
| **802.11be** | **Wi-Fi 7** | 2.4 / 5 / 6 | up to 46 Gbps | 320 MHz channels, MLO (multi-link) |

Memory hooks: a→5 GHz first (unusual); b/g→2.4; n→both; ac→5 only; ax→adds 6 GHz; be→7.
Course numbers: 802.11n 600 Mbps; ac 2.1+ Gbps; ax 1.1 Gbps @2.4 / 4.8 Gbps @5; be 46 Gbps.

- **MIMO** - multiple antennas, multiple spatial streams to one client.
- **MU-MIMO** - serve multiple clients simultaneously.
- **OFDMA** - splits a channel into sub-carriers so many small transmissions share it efficiently (Wi-Fi 6's big win for dense environments).

## WLAN installation considerations
- **SSID** naming; **band** selection (dual-band steering); **channel** choice (1/6/11 on 2.4 GHz; auto or least-congested on 5 GHz); channel width; AP placement (central, high, away from metal/microwaves); power level; coverage overlap for roaming.
- Security config lives in file 27.

## Wi-Fi analyzers
Software/hardware that shows **signal strength (RSSI, dBm - closer to 0 is better; −30 excellent, −70 usable, −85 poor)**, channel usage, **interference**, neighbouring SSIDs. Used for site surveys and troubleshooting intermittent connectivity.

## Long-range fixed wireless
- Point-to-point / point-to-multipoint links with **high-gain directional antennas** (dish/yagi) - building-to-building, rural ISP.
- **Licensed** (exclusive frequency, paid, no interference) vs **unlicensed** (2.4/5/60 GHz ISM bands, free, shared).
- Regulatory power limits (EIRP).

## Bluetooth, RFID, NFC

| Tech | Range | Use |
|---|---|---|
| **Bluetooth** | ~10 m (Class 2), 2.4 GHz | **Pairing** process (PIN/confirm), PAN - headsets, keyboards, phones ↔ car; BLE for low power |
| **RFID** | cm to metres (passive tags read by a powered reader) | **Inventory/asset tracking, badge access** |
| **NFC** | ~4 cm | **Contactless payment (Apple/Google Pay), badge access, tap-to-pair/configure** - subset of RFID at 13.56 MHz |

## Cellular (also in file 15)
3G (GSM / CDMA) → 4G (**LTE**) → 5G (mMIMO, high band). Hotspot/tethering; SIM/eSIM.

## Wireless troubleshooting (from Lesson 7.3, expanded in file 13)
| Symptom | Check |
|---|---|
| Intermittent connectivity | Signal strength/RSSI, interference, channel overlap, AP overload, roaming |
| Slow | Band (2.4 vs 5), standard mismatch (old client drags down), channel width, distance |
| Can't connect | Wrong passphrase/security type, MAC filter, DHCP exhaustion, SSID hidden/typo, band not supported by client |
| Works near AP only | Placement / obstacles / power |

## Self-test
1. What is a BSSID? SSID?
2. Non-overlapping 2.4 GHz channels?
3. Which standard runs 5 GHz only? Which first used both bands? Which adds 6 GHz?
4. Wi-Fi 4/5/6/7 = which 802.11 letters?
5. MIMO vs MU-MIMO vs OFDMA - one line each.
6. What is DFS?
7. What does a Wi-Fi analyzer show and what RSSI value is "good"?
8. Licensed vs unlicensed fixed wireless trade-off?
9. RFID vs NFC - range and use case.
10. Bluetooth frequency and range class?
