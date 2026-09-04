# 26 · Threats, Attacks & Social Engineering (Module 18, Lesson 18.1)

**Exam objectives:** Core 2 · 2.5 Compare and contrast common social engineering attacks, threats, and vulnerabilities.

## Vulnerabilities (weaknesses)
| Vulnerability | Explanation |
|---|---|
| **Non-compliant systems** | Deviate from the security **baseline** (missing patches, wrong config) |
| **Unprotected systems** | **Missing or misconfigured** controls - no AV, no firewall, default creds |
| **Software vulnerabilities** | Bugs in application code (buffer overflow, injection) |
| **Zero-day** | Vulnerability **previously unknown to the developer/vendor** - no patch exists yet when exploited |
| **Unpatched / EOL OS** | No updates available or applied |
| **BYOD** | Personal devices may not be maintained/patched by the owner; mixed data |
| Also: weak passwords, open ports, physical exposure | |

## Social engineering - "hacking the human"
Manipulation or intimidation of people to reveal confidential info or grant access. Techniques rely on authority, urgency, familiarity, scarcity, trust.

| Attack | Description | Defence |
|---|---|---|
| **Impersonation** | Pretend to be IT, a vendor, an executive, a delivery person | Verify identity via known channels; policy |
| **Dumpster diving** | Retrieve documents/media from the trash | Shred; secure disposal |
| **Shoulder surfing** | Watch someone type a password / read a screen | Privacy screens, awareness, screen locks |
| **Tailgating** | Follow an authorised person through a secure door **without their consent/knowledge** | Access control vestibule, badges, challenge strangers |
| **Piggybacking** | Same, but **with** the authorised person's consent ("hold the door") | Same |
| **Pretexting** | Invented scenario to obtain info | Verify |
| **Baiting** | Leave infected USB stick to be plugged in | Disable AutoRun; policy |

## Phishing family - memorise every variant
| Term | Vector |
|---|---|
| **Phishing** | Mass **email** impersonating a trusted party to harvest creds/deliver malware |
| **Spear phishing** | **Targeted** phishing at a specific person/organisation, using researched detail |
| **Whaling** | Spear phishing at **executives / high-value targets** (CEO, CFO) |
| **Vishing** | **Voice** call phishing |
| **SMiShing** | **SMS/text** phishing |
| **Quishing** | **QR-code** phishing - fake QR codes lead to malicious sites |
| **Pharming** | Redirect a legitimate site's traffic to a fake via DNS poisoning/hosts |
| **Business email compromise (BEC)** | Spoofed/compromised exec mailbox requests wire transfers |
| **Evil twin** | Rogue **Wi-Fi AP with a similar/identical SSID** to snoop traffic / phish captive portal |

## Threat types
| Threat | Description |
|---|---|
| **External vs internal (insider)** | Outsiders vs employees/contractors (malicious or negligent) |
| **Footprinting / reconnaissance** | Gathering information about the organisation (OSINT, scanning) before an attack |
| **Spoofing** | Masquerading as a trusted user/system - **IP spoofing, MAC spoofing**, email spoofing, caller ID |
| **On-path attack** (formerly man-in-the-middle) | Attacker sits between two parties, intercepting/altering traffic (ARP poisoning, evil twin, rogue proxy) |
| **DoS / DDoS** | Overwhelm a service; **DDoS uses a botnet** of compromised hosts |
| **Botnet** | Network of malware-controlled machines (zombies) under a C2 server |
| **Insider threat**, APT | |

## Password attacks
| Attack | Description | Defence |
|---|---|---|
| **Plaintext / sniffing** | Protocols like **Telnet, FTP, HTTP** send creds unencrypted → captured on the wire | Use SSH/SFTP/HTTPS |
| **Dictionary** | Try words from a wordlist - deck cites **RockYou.txt (14 M passwords)** and **RockYou2024 (10 B)** | Long passphrases, not in dictionaries |
| **Brute force** | **Every possible combination** and substitution - guaranteed eventually, slow | Length + complexity, **lockout policy**, MFA, rate limiting |
| Rainbow table | Precomputed hashes | Salting |
| Credential stuffing | Reuse leaked user/pass pairs across sites | Unique passwords, MFA |
| Password spraying | One common password against many accounts | Lockout, MFA |

## Web application attacks
### Cross-site scripting (XSS)
- Attacker **injects a malicious script into a trusted website**; victims' **browsers execute it** because it appears to come from the trusted site → steal cookies/sessions, deface, redirect. Stored vs reflected.
- Defence: input validation/output encoding, CSP, HttpOnly cookies.

### SQL injection (SQLi)
- **SQL** (SELECT, INSERT, UPDATE, DELETE) queries databases; attacker enters SQL syntax into a form/URL to **manipulate the database** (`' OR 1=1 --`) → dump data, bypass login, delete tables.
- **Prevention (deck)**: **input validation & sanitisation**, **parameterised queries** (prepared statements), **stored procedures** (precompiled SQL), least-privilege DB accounts, WAF.

## Other threats worth knowing (obj 2.5 list)
- **Insider threat**, **cross-site request forgery**, **wireless attacks** (deauth, WPS brute-force, evil twin), **exploits/vulnerability scanning**, **rootkits/keyloggers** (file 29), **unpatched software**, **BYOD**.

## Self-test
1. Define zero-day. Why is EOL software a vulnerability?
2. Tailgating vs piggybacking.
3. Phishing / spear / whaling / vishing / smishing / quishing / evil twin - one line each.
4. Footprinting; spoofing (two kinds); on-path attack; DDoS vs DoS.
5. Which protocols send passwords in plaintext?
6. Dictionary vs brute force; what's RockYou.txt?
7. What does XSS exploit and where does the script run?
8. Four SQL keywords; three SQLi preventions.
9. What is a botnet used for?
10. Insider vs external threat - which is harder to detect?
