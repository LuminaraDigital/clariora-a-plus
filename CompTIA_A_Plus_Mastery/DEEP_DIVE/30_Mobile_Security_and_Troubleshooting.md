# 30 · Mobile OS Security & Troubleshooting (Module 20)

**Exam objectives:** Core 2 · 2.8 Apply common methods for securing mobile devices · 3.2 Troubleshoot common mobile OS and application issues · 3.3 Troubleshoot common mobile OS and application security issues.

---

# Lesson 20.1 - Mobile OS security

## Screen locks
| Lock | Notes |
|---|---|
| **Swipe** | **No authentication** - don't rely on it |
| **PIN** | 4-6 digits; **password/passphrase preferred** (longer alphanumeric) |
| **Pattern** | Connect dots - smudge attacks; weaker |
| **Fingerprint** | Biometric - convenient; needs backup PIN |
| **Facial recognition** | Face ID etc.; backup PIN when it fails (instructor note: always configure a backup method) |
| **Failed-attempt lockout** | Device **locks for a period after N failed attempts**; optional **erase after 10 failed** attempts (iOS) |
| Auto-lock timeout | Short |

## Security software
- **Patching / OS updates** - keep OS *and* apps current (auto-update).
- **Antivirus / anti-malware** apps (esp. Android); **firewall** apps/MDM controls; **safe browsing**; secure DNS.

## Enterprise mobility management - ownership models (memorise)
| Model | Meaning |
|---|---|
| **BYOD** - Bring Your Own Device | Personal device on corporate systems; company may require monitoring/agent; privacy tension; use MAM containers |
| **COBO** - Corporate-Owned, Business Only | Company device, **business use only** |
| **COPE** - Corporate-Owned, Personally Enabled | Company device, **personal use allowed under AUP** (social media etc.) |
| **CYOD** - Choose Your Own Device | Like COPE but the **user selects the model** from an approved list |

## MDM capabilities
- **Manage device settings**, **enforce security policies** (PIN, encryption, screen lock), **control app installs & permissions** (allow/block lists, corporate store), **regulate network access** (Wi-Fi/VPN profiles, certificates), **monitor compliance**, **remote management** (**lock, locate, wipe**, selective wipe of corporate data), inventory, geofencing.

## Two-factor / MFA on mobile
- **Two different factors** - e.g. **something you are + something you have**; **push notification** or **authenticator app** (Microsoft/Google Authenticator, RSA SecurID), SMS OTP (weaker), hardware keys (NFC/USB-C).

## Mobile data security
- **Device encryption**: **Apple - always on, cannot be disabled** (tied to passcode); **Android - file-based encryption default** on modern versions.
- **Remote backup**: **iCloud**, **Google Drive/One**, **OneDrive**, **Dropbox**; or **local backup to a computer** (Finder/iTunes, vendor tools). Test restores.
- Also: VPN on public Wi-Fi, disable unused radios, app permissions review, biometric + strong passcode.

## Locator apps & remote wipe
- Location via **GPS / IPS / Wi-Fi / cellular**; **Find My (Apple)** / **Find My Device (Android/Google)**; remote actions: **lock, play sound, display message, wipe (factory reset)**; **Activation Lock** stops re-use after wipe.

---

# Lesson 20.2 - Troubleshoot mobile OS & app software

## Tools
- **Settings app**; quick panels - **swipe down from top** (notifications/quick settings) / **swipe up from bottom** (iOS Control Center on older, app switcher); **reboot** (soft reset) - first fix for most things; **force restart**; **factory reset** (last resort - back up first); **battery health report / cycle count**; **smart/optimized charging**; safe mode (Android); Apple Diagnostics; developer options for logs.

## Device & OS issues (deck list) - symptom → actions
| Symptom | Actions |
|---|---|
| **OS fails to update** | Check **storage space**, **battery level/charging**, **Wi-Fi**, restart, retry; too-old device (unsupported) |
| **Device randomly reboots** | Update OS/apps, check battery health, remove case (overheating), safe mode to find bad app, factory reset, hardware fault |
| **Slow to respond** | Close/limit background apps, **clear cache**, free **storage**, update, restart, check for malware, battery-saver mode throttling, aging battery |
| **Auto-rotate not working** | **Rotation lock on** (quick settings), app doesn't support rotation, calibrate/restart sensor, hardware failure |
| Battery drains fast / overheating | Screen brightness, background refresh/location, radios, old battery, malware |
| Touch unresponsive / ghost touch | Screen protector, moisture, restart, digitizer (file 15) |
| No sound / no display | Do-not-disturb, volume, restart, hardware |
| Storage full | Offload/delete, cloud, clear caches |

## App issues
| Symptom | Actions |
|---|---|
| **App fails to launch / closes / crashes** | **Android: Settings → Apps → Force Stop / Disable / Clear cache & data**; **iOS: swipe up from bottom (app switcher), swipe the app card up to close**; update the app; reinstall; update OS; check permissions/storage |
| **App fails to install** | **Verify storage** and **permissions**; **corporate MDM restrictions**; **connectivity** - some restrict downloads to **Wi-Fi only**; OS version too old; region/store account |
| App slow / high battery | Update; restrict background; reinstall |
| Sync fails (mail/contacts) | Account creds, server settings, storage quota, re-add account |

## Connectivity issues
- **Signal strength & interference** (metal, walls, distance) - move; toggle airplane mode; forget & rejoin Wi-Fi; reset network settings; carrier settings/PRL update; check SIM seated.
- **Configuration** - wrong password/security, VPN/proxy, MAC filtering, DHCP.
- **NFC** - enabled? phone position/case thickness; wallet setup; screen must be on/unlocked.
- **AirDrop** - receiving set to **Everyone / Contacts Only / Off**; both devices need Wi-Fi + Bluetooth on; **range** ~9 m; personal hotspot off; Android equivalent **Nearby Share (Quick Share)**.
- **Bluetooth** - pairing mode, forget & re-pair, distance, too many paired devices, restart both.

---

# Lesson 20.3 - Troubleshoot mobile OS & app security

## Root / jailbreak / developer mode
| Term | Platform | Effect |
|---|---|---|
| **Root** | **Android** | Root-level access **bypassing OS controls** - voids warranty, breaks MDM compliance, malware risk |
| **Jailbreak** | **iOS** | Admin access to install unsigned apps/tweaks - same risks; MDM will flag |
| **Developer mode** | Both | **NOT rooting/jailbreaking** - enables **diagnostic data access, USB debugging, advanced settings** for developers; still a mild risk if left on |

## App source security concerns
- **App spoofing** (fake apps mimicking real ones), **enterprise apps** (side-loaded via enterprise certs - abused), **APK sideloading** (Android installs outside Play), **bootleg app stores**.
- Rule: **only trusted sources (App Store / Google Play / corporate store), verify the developer/digital signature**, review permissions, keep "install unknown apps" off.

## Mobile security symptoms (obj 3.3)
- **Excessive ads / fake security warnings** (adware, scareware).
- **Unexpected app behaviour** (crashes, apps you didn't install, permissions changed, camera/mic indicator on).
- **Leaked personal files/data**, unauthorised account access, unexpected charges/SMS.
- **High data usage / network traffic**, **high battery drain / hot device** (cryptominer, spyware), **limited/no Internet**, sluggish response.
- **Location services abuse** - apps tracking; **geotagging photos and videos** leaks location metadata (disable for camera or strip EXIF before sharing).
- Response: uninstall suspect apps (safe mode), run AV, revoke permissions, update OS, change passwords, factory reset if needed, report to MDM/security team.

## Self-test
1. Which screen lock offers no authentication? Why configure a backup unlock method?
2. BYOD / COBO / COPE / CYOD - define each.
3. Six things MDM can do.
4. iOS vs Android device encryption defaults.
5. Four remote actions from a locator app.
6. iOS vs Android - how do you close/force-stop a misbehaving app?
7. App won't install - four things to check.
8. Auto-rotate not working - first check?
9. Root vs jailbreak vs developer mode.
10. Five mobile malware/security symptoms; what is geotagging and why is it a concern?
