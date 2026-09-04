# 28 · Physical Security & Additional Security Measures (Module 18, Lesson 18.4)

**Exam objectives:** Core 2 · 2.1 Summarize various security measures and their purposes (physical security, physical security for staff, logical security, MDM, AD concepts).

## Perimeter & access control
| Control | Purpose |
|---|---|
| **Perimeter security** | Fences, bollards, barriers, gates; lighting; signage |
| **Access control vestibule** (mantrap) | **Two-door system - only one door can open at a time**; prevents tailgating; may include a guard/badge/biometric between doors |
| **Magnetometers** | **Metal detectors** - walk-through/handheld; detect weapons/devices |
| **Security guards** | Human verification, patrol, visitor logs, escort |
| **Badge readers** | Card/RFID/NFC/magnetic-stripe; log entry; combine with PIN |
| **Visitor sign-in / escort policy** | Accountability |
| **Bollards** | Vehicle barriers |
| Equipment: **Kensington lock** (laptop cable lock), **chassis/case lock**, **lockable equipment racks/cabinets**, USB port locks | Anti-theft/tamper |

## Lock types
| Lock | Notes |
|---|---|
| **Key** (mechanical) | Cheap; key control problem |
| **Electronic / cipher** | Keypad code |
| **Badge reader** | **NFC, RFID, magnetic stripe** |
| **Mobile digital key** | Phone app (hotel rooms) - Bluetooth/NFC |
| **Biometric** | **Fingerprint, palm/vein, retina/iris, facial, voice**; errors: **Type 1 = False Rejection** (legit user denied - FRR), **Type 2 = False Acceptance** (impostor admitted - FAR, more dangerous); crossover error rate (CER) |
| **Smart card / token** | Cert-based |
Layer them: something you have (badge) + something you know (PIN) + something you are.

## Alarms & surveillance
| System | Detects |
|---|---|
| **Circuit** (door/window contact) | Opening |
| **Motion** (PIR/ultrasonic) | Movement |
| **Proximity** | Approach to an object |
| **Duress / panic button** | Staff under threat - silent alarm |
| **Video / CCTV** | Wired IP cameras or wireless; recording, motion-triggered, deterrent + evidence; PTZ |
| **Lighting** | Illuminates areas for surveillance and deterrence |
| Glass-break, temperature/water/smoke sensors | Environmental |

## Physical security for staff
- ID badges worn visibly, key fobs, smart cards, keys, biometrics; **clean desk policy**; **privacy screens**; **cable locks**; **secure printing**; **shred/lock sensitive documents**; **lock screen when away (Win+L)**; **escort visitors**; challenge unbadged people; **do not hold doors** (tailgating).

## Logical & other measures listed under 2.1 (cross-references)
- **Logical**: least privilege, ACLs, MFA, SSO, hard/soft tokens, principle of implicit deny - file 22.
- **AD concepts**: login scripts, domain, GPO, OUs, home folder, folder redirection, security groups - file 22.
- **MDM** - file 15/30.
- **Data-at-rest encryption** - BitLocker/EFS/FileVault - files 25/29.
- Equipment/asset tracking, secure disposal - files 31/32.

## Self-test
1. What is an access control vestibule and what attack does it stop?
2. Magnetometer purpose.
3. Type 1 vs Type 2 biometric errors - which is worse for security?
4. Name three badge technologies.
5. Duress alarm; proximity vs motion sensor.
6. Kensington lock is for what?
7. Why lighting counts as a security control.
8. Three staff-level physical practices.
