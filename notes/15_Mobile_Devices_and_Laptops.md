# 15 · Mobile Devices & Laptops (Module 09)

**Exam objectives:** Core 1 · 1.1 Install and configure laptop hardware and components · 1.2 Compare and contrast accessories and connectivity options for mobile devices · 1.3 Configure basic mobile device network connectivity and application support · 5.4 Troubleshoot common mobile device issues.

---

# Lesson 9.1 - Mobile devices & peripherals

## Accessories & input
- **Digitizer** (touch layer over the display; converts touch/gesture/stylus to input), **trackpad/touchpad**, **pointing stick** (the "little nub" - TrackPoint), **stylus**, microphone, camera/webcam, speakers, headset.

## Wired connections
- **USB-C, micro-USB, mini-USB**, Lightning (Apple, being replaced), **serial** (rare), video (**HDMI, VGA, DP/mini-DP, Thunderbolt**).

## Port replicator vs docking station
- **Port replicator** - plugs into one port (usually USB-C/Thunderbolt) and gives you the desktop peripherals' ports (monitor, keyboard, mouse, Ethernet). Simple.
- **Docking station** - laptop connects and behaves as a **desktop**; may add **extra connections, power, expansion card slots**; often proprietary connector. The deck's field-tech scenario ("plugs into a device that provides a full complement of ports") = docking station.

## Wi-Fi on mobile
- Enable/disable via **hardware switch or Fn-key combo**, Settings, or **Airplane mode** (kills all/most radios: cellular, Wi-Fi, GPS, Bluetooth, NFC).
- Laptop **antenna wires run around the display edges** - replace screens carefully; loose antenna → weak signal.

## Cellular
| Gen | Tech | Speed (deck) |
|---|---|---|
| **3G** | GSM (SIM-based, global) vs CDMA (US carriers) | ~7.2 Mbps |
| **4G LTE** | Unified; supports GSM & CDMA carriers | ~300 Mbps |
| **5G** | mMIMO, mmWave/sub-6 | up to ~10 Gbps |

- **SIM** (subscriber identity module) - small card **identifying the device/subscriber on the mobile network**.
- **eSIM** - embedded/electronic SIM; **multiple carrier profiles on one device**; provisioned by QR code.
- **PRL** (preferred roaming list) / carrier settings updates; **IMEI** identifies the handset, **IMSI** the subscriber.

## Hotspot vs tethering
- **Tethering** - share the phone's data over a **USB cable** (or Bluetooth) to one device.
- **Hotspot** - phone acts as a **Wi-Fi AP** for multiple devices (peer-to-peer Wi-Fi). Both use cellular data.

## Bluetooth
- **2.4 GHz**, ~10 m. **Pairing**: enable BT → discoverable → select device → **confirm PIN/code** → test. Profiles (A2DP audio, HID input).

## NFC
- Very short range; **contactless payment**, **device configuration / launching apps** (tap tags), badge access, quick pairing.

---

# Lesson 9.2 - Mobile apps & data

## Apps
- **iOS**: only from **Apple App Store**; developed with **Xcode / Swift**; sandboxed.
- **Android**: **Google Play** and **third-party** stores / APK sideloading (risk - file 30).
- **App permissions** - location, network, camera, microphone, contacts; review them.

## Accounts and sync
- **Apple ID** / **Google account** (Microsoft account too) - **synchronize settings and data across devices**.
- Data types to sync: **contacts, calendar, mail, multimedia, documents, apps, passwords** (+ bookmarks).
- Sync targets: **cloud**, **to PC** (USB or wireless - iTunes/Finder, Phone Link), **to automobile** (**CarPlay**, **Android Auto**).

## Email configuration
- **Commercial**: Gmail, Outlook.com, Yahoo - usually **AutoDiscover** just needs address + password.
- **Enterprise**: **Microsoft Exchange** via **ActiveSync** (mail + contacts + calendar push; enforces policies).
- **Manual**: **SMTP** (send, 587/465), **IMAP** (143/993) or **POP3** (110/995), server names, TLS. Know the ports (file 12).

## Enterprise mobility management
- **EMM** - umbrella term.
- **MDM** (mobile device management) - controls the **device**: networks, hardware use, remote lock/**reset/wipe**, enforce PIN/encryption, push config, compliance.
- **MAM** (mobile application management) - controls **apps and their settings/data** (corporate container).
- Enrollment platforms: **Apple Business Manager**, **Managed Google Play**; MDM products: Intune, Jamf, Workspace ONE. Ownership models in file 30.

## Location services
- **GPS** - satellites; outdoors.
- **Indoor positioning (IPS)** - cell towers, Wi-Fi APs, **Bluetooth/RFID beacons**.
- Enables Find My, geofencing, geotagging (privacy consideration).

---

# Lesson 9.3 - Laptop hardware

## Disassembly principles
- Smaller components, **hand tools** (precision screwdrivers, spudgers), keep screws organised (many lengths), plastics/clips are **easily damaged**, consult the service manual, ground yourself, **remove battery/disconnect power first**.

## Field-replaceable components
| Component | Notes |
|---|---|
| **Battery** | External: **release tab**; internal: **screws** + connector; use OEM. AC adapter = the power supply - check voltage/amperage/tip |
| **RAM** | **SODIMM**; limited slots (often 1-2, or **soldered**); mixed soldered + slot |
| **Adapter cards** | **Mini PCIe** (older), **M.2** (Wi-Fi/Bluetooth, WWAN); reconnect the tiny antenna leads |
| **Storage** | **2.5" HDD/SSD** (SATA), **mSATA** (older), **M.2** SATA/NVMe. **Migrate data** first (clone) or reinstall |
| **Keyboard** | May need **full disassembly**; individual **keycap** replacement for cleaning |
| **Biometrics / security** | Fingerprint reader, **NFC scanner** |
| **Camera / microphone** | Behind the **screen bezel** - remove bezel |
| **Screen / display** | Panel, inverter (CCFL), digitizer, Wi-Fi antennas |
| **DC jack, fan, heat pipe, speakers, touchpad** | Model-specific |

---

# Lesson 9.4 - Troubleshoot mobile devices

## Power & battery
- Check **AC adapter output / outlet voltage**, battery **seated**, **battery health** (Settings → Battery; cycle count).
- **Improper charging** - heat and constant 100% shorten life; **intelligent/optimized charging** learns habits.
- **Swollen battery** - bulging case, lifted trackpad/screen → **stop using immediately, remove, dispose properly** (hazardous waste). Never puncture.
- Poor battery life → screen brightness, background apps, radios, GPS, old battery, malware.

## Hardware failure
- **Overheating** - vents, dust, **cooling pad**, heavy apps.
- **Liquid damage** - power off, dry; **IP rating** (IP67 etc.) indicates dust/water resistance.
- **Physical damage to ports** (loose USB-C/charging port), **dust/moisture exposure**.

## Screen & calibration
- **Backlight failure** - image faint, visible with a torch.
- **Broken screen** - glass can cut; replace ASAP.
- **Digitizer damage** - **touch input stops** even if the image is fine.
- **Cursor drift / touch calibration** - driver updates, calibration utility; **screen protectors and cases can reduce sensitivity**.
- Auto-rotate not working - rotation lock on, sensor fault (file 30).

## Connectivity
- Interference, **antenna connectors firmly seated** (after screen work), test with another network/device; airplane mode toggle; forget/rejoin; update carrier settings.

## Malware indicators on mobile
- **Data collection & external reporting**, unexpected **background processes**, **data transfers over limits**, **hardware permission changes** (camera/mic used without consent), **malware may block new app downloads**, excessive ads, hot device, fast battery drain (more in file 30).

## Self-test
1. What's the pointing "nub" called? What is a digitizer?
2. Port replicator vs docking station.
3. What does airplane mode disable? Where are laptop Wi-Fi antennas?
4. SIM vs eSIM; 3G/4G/5G speeds; GSM vs CDMA.
5. Tethering vs hotspot.
6. iOS apps come from where and are built with what? Android sideloading term?
7. MDM vs MAM; two enrollment platforms.
8. GPS vs IPS - how does IPS locate you?
9. Laptop RAM form factor; storage form factors you might find.
10. Swollen battery - action? Touch works but no image / image but no touch - which part each?
