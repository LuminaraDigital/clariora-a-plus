import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import c2_utils

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARDS_DIR = os.path.join(ROOT, "_bank", "shards")
os.makedirs(SHARDS_DIR, exist_ok=True)

questions_data = [
    # 2.1 Physical, logical, and authentication-based access security (4 questions: C2N-S-001..004)
    {
        "id": "C2N-S-001",
        "objective": "2.1",
        "difficulty": "hard",
        "tags": ["physical-security", "access-control", "mantrap", "datacenter"],
        "question": "A datacenter security manager needs to prevent unauthorized individuals from following authorized employees through the server room entrance (tailgating/piggybacking). Which physical security control is MOST effective at enforcing single-person entry?",
        "options": [
            "An access control vestibule (mantrap) with interlocking doors and weight sensors",
            "A high-definition CCTV security camera mounted above the doorway",
            "A keycard badge reader that sounds an audible beep upon successful swipe",
            "A biometric fingerprint scanner installed on a standard swing door"
        ],
        "answer": 0,
        "explanation": "An access control vestibule (mantrap) features two interlocking doors where the second door cannot open until the first door closes and the occupant is validated (often combined with weight sensors or optical counters). This physical barrier strictly prevents tailgating. CCTV cameras record footage but do not physically block tailgating. Standard badge readers and biometric scanners on a single door validate access but allow an unauthorized person to slip in behind an authorized user while the door is open.",
        "distractor_analysis": {
            "1": "CCTV cameras provide detective controls and forensic video logs, but they do not physically restrict entry or prevent piggybacking in real time.",
            "2": "A single-door badge reader unlocks the latch for several seconds, allowing an unauthenticated follower to catch the door before it closes.",
            "3": "Biometric scanners verify identity accurately, but when fitted to a single swing door, they cannot physically stop a second person from walking in behind the authenticated individual."
        }
    },
    {
        "id": "C2N-S-002",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["authentication", "mfa", "smart-card", "piv"],
        "question": "An enterprise requires all systems engineers to authenticate to administrative consoles using multifactor authentication (MFA). Which authentication combination fulfills true MFA requirements?",
        "options": [
            "A complex 16-character alphanumeric password and a secondary memorized PIN",
            "A hardware smart card (PIV card) and an associated 6-digit PIN entered on the keypad",
            "A username and password combined with answering three secret security questions",
            "An SMS verification code sent to a mobile phone alongside an emailed OTP code"
        ],
        "answer": 1,
        "explanation": "True MFA requires credentials from at least two different authentication categories: something you know (PIN/password), something you have (smart card/hardware token), or something you are (biometrics). A smart card (something you have) combined with a PIN (something you know) satisfies two distinct factors. Passwords plus PINs or passwords plus security questions represent two items from the same category (something you know). SMS codes and email OTPs are both token-based possession factors and do not provide distinct category separation when used without a knowledge/biometric factor.",
        "distractor_analysis": {
            "0": "A password and a PIN are both knowledge factors ('something you know'), making this single-factor authentication with two knowledge inputs.",
            "2": "Security questions and passwords both belong to the 'something you know' category, failing the multi-category requirement of true MFA.",
            "3": "SMS and email codes are both possession-based delivery channels and do not constitute distinct multi-category factors on their own."
        }
    },
    {
        "id": "C2N-S-003",
        "objective": "2.1",
        "difficulty": "medium",
        "tags": ["access-control", "rbac", "least-privilege", "active-directory"],
        "question": "A junior administrator is assigned to provision accounts in Active Directory. To enforce the principle of least privilege, how should the administrator configure the junior technician's permissions?",
        "options": [
            "Assign the junior technician role-based access control (RBAC) permissions delegated specifically to the target Organizational Unit",
            "Add the junior technician's user account directly to the Domain Admins global group",
            "Provide the junior technician with the built-in local Administrator account password for all domain controllers",
            "Grant Full Control permissions across the root of Active Directory Domain Services"
        ],
        "answer": 0,
        "explanation": "The principle of least privilege dictates that users receive only the minimum permissions required to perform their specific job functions. Delegating specific administrative tasks (such as user creation and password resets) within a designated Organizational Unit (OU) using Role-Based Access Control (RBAC) limits their scope without granting domain-wide control. Domain Admins membership, root Full Control, and built-in local DC Administrator rights grant unlimited domain supremacy, creating immense security risk.",
        "distractor_analysis": {
            "1": "Adding the technician to Domain Admins grants complete control over the entire domain infrastructure, directly violating least privilege.",
            "2": "Sharing the built-in local Administrator password gives unmonitored, unchecked control over core domain controllers.",
            "3": "Full Control at the domain root allows modifying schema and enterprise policies, far exceeding account provisioning needs."
        }
    },
    {
        "id": "C2N-S-004",
        "objective": "2.1",
        "difficulty": "hard",
        "tags": ["authentication", "radius", "tacacs", "aaa"],
        "question": "A network architect is deploying centralized authentication for datacenter network switches and firewalls. The team requires encryption of the entire authentication and command authorization packet payload, not just the password. Which AAA protocol must be selected?",
        "options": [
            "TACACS+ over TCP port 49",
            "RADIUS over UDP port 1812",
            "LDAP over TCP port 389",
            "Kerberos over UDP port 88"
        ],
        "answer": 0,
        "explanation": "TACACS+ (Terminal Access Controller Access-Control System Plus) operates over TCP port 49, separates Authentication, Authorization, and Accounting (AAA), and encrypts the entire packet payload (headers remain clear). In contrast, RADIUS (UDP ports 1812/1813) only encrypts the password field within the Access-Request packet, leaving username, attributes, and accounting data unencrypted. LDAP is a directory access protocol, and Kerberos is a ticket-based authentication protocol, neither of which provides granular AAA command authorization for network devices.",
        "distractor_analysis": {
            "1": "RADIUS encrypts only the password attribute in transit; the remainder of the packet and authorization data is transmitted in plaintext.",
            "2": "Standard LDAP transmits directory queries in plaintext on port 389 and does not provide AAA command accounting for switch management.",
            "3": "Kerberos provides ticket-granting authentication for domain environments but does not separate AAA command-level authorization on network gear."
        }
    },

    # 2.2 Windows security: Defender, firewall, security settings, Active Directory (4 questions: C2N-S-005..008)
    {
        "id": "C2N-S-005",
        "objective": "2.2",
        "difficulty": "medium",
        "tags": ["bitlocker", "encryption", "tpm", "windows-security"],
        "question": "An enterprise laptop containing proprietary engineering schematics is stolen from a technician's vehicle. Which Windows security feature prevents the thief from reading the storage drive contents by connecting the drive to another computer?",
        "options": [
            "BitLocker Drive Encryption backed by a Trusted Platform Module (TPM)",
            "User Account Control (UAC) set to the Always Notify level",
            "NTFS permissions configured on the parent folder",
            "Windows Defender SmartScreen filter enabled in the browser"
        ],
        "answer": 0,
        "explanation": "BitLocker encrypts the entire volume (data, OS, system files) using AES-128 or AES-256 encryption tied to the hardware TPM chip or recovery key. If the drive is removed and connected to a secondary machine, the data remains unreadable ciphertext without the encryption key. NTFS permissions and UAC are enforced only by the running local operating system; attaching the drive to a secondary OS completely bypasses NTFS and UAC. SmartScreen protects against malicious URLs and executables, not physical drive theft.",
        "distractor_analysis": {
            "1": "UAC prevents unauthorized administrative software execution within an active Windows session but offers zero protection against offline disk access.",
            "2": "NTFS access control lists (ACLs) are ignored when a hard drive is attached as a secondary drive to an external operating system.",
            "3": "SmartScreen warns users about untrusted download files and phishing websites, having no role in volume-level data-at-rest encryption."
        }
    },
    {
        "id": "C2N-S-006",
        "objective": "2.2",
        "difficulty": "hard",
        "tags": ["gpo", "active-directory", "account-lockout", "password-policy"],
        "question": "To protect against offline and online password brute-force attacks across 500 domain-joined workstations, an administrator must enforce a policy where accounts lock for 30 minutes after five consecutive failed attempts. Where should this policy be configured?",
        "options": [
            "In the Default Domain Policy Group Policy Object (GPO) under Computer Configuration -> Windows Settings -> Security Settings -> Account Policies",
            "In the Local Group Policy Editor (gpedit.msc) on the administrator's desktop under User Configuration",
            "In the Windows Defender Firewall with Advanced Security inbound rules on each local client",
            "In the System Properties Advanced tab under User Profiles settings"
        ],
        "answer": 0,
        "explanation": "Domain-wide account policies (Password Policy, Account Lockout Policy, and Kerberos Policy) are enforced at the domain level through the Default Domain Policy GPO linked to the root of the domain. In Active Directory, domain user accounts evaluate account lockout settings defined in the Default Domain Policy. Local Group Policy affects only the local machine accounts, not domain accounts across 500 workstations. Windows Firewall controls network traffic, and User Profiles settings manage local profile storage.",
        "distractor_analysis": {
            "1": "Editing Local Group Policy on a single desktop modifies only that specific machine's local SAM account database, not Active Directory domain accounts.",
            "2": "Windows Defender Firewall manages packet filtering by port, protocol, and application, but cannot enforce Active Directory account lockout thresholds.",
            "3": "The User Profiles dialog manages roaming and temporary profile caching, having no capability to configure domain security policies."
        }
    },
    {
        "id": "C2N-S-007",
        "objective": "2.2",
        "difficulty": "medium",
        "tags": ["windows-firewall", "security-rules", "advanced-security", "port-filtering"],
        "question": "A systems administrator needs to block all inbound Telnet connections (TCP port 23) across a Windows Server fleet while allowing SSH (TCP port 22) and HTTPS (TCP port 443). Which management tool is used to create this granular port rule?",
        "options": [
            "Windows Defender Firewall with Advanced Security (wf.msc)",
            "Device Manager (devmgmt.msc)",
            "Disk Management (diskmgmt.msc)",
            "Task Scheduler (taskschd.msc)"
        ],
        "answer": 0,
        "explanation": "Windows Defender Firewall with Advanced Security (launched via wf.msc or the Windows Tools menu) allows administrators to create granular inbound and outbound filtering rules based on specific protocols (TCP/UDP), port numbers, IP addresses, programs, and IPsec security associations. Device Manager configures hardware drivers, Disk Management configures partition layouts, and Task Scheduler automates background batch jobs.",
        "distractor_analysis": {
            "1": "Device Manager is used to inspect, update, and troubleshoot hardware device drivers, not network firewall filtering rules.",
            "2": "Disk Management is responsible for volume formatting, drive partitioning, and VHD management.",
            "3": "Task Scheduler triggers scheduled scripts and maintenance tasks based on time triggers or system events, not packet inspection."
        }
    },
    {
        "id": "C2N-S-008",
        "objective": "2.2",
        "difficulty": "hard",
        "tags": ["uac", "windows-security", "privilege-escalation", "elevation"],
        "question": "A standard domain user attempts to install an unapproved monitoring utility on a Windows 11 workstation. The screen dims and presents a User Account Control (UAC) credential prompt requesting administrative credentials. What security boundary is UAC enforcing in this scenario?",
        "options": [
            "It prevents unauthorized software installation by requiring administrative token elevation before modifying system files and registry keys",
            "It automatically quarantines the installer executable in Windows Defender Antivirus storage",
            "It blocks the network interface card from communicating with the local default gateway",
            "It forces the user's domain password to expire and triggers an Active Directory lockout"
        ],
        "answer": 0,
        "explanation": "User Account Control (UAC) ensures that standard users cannot perform system-level changes (such as writing to Program Files or HKLM in the registry) without explicit administrative elevation. When a standard user runs an installer, UAC prompts for an administrator username and password (over-the-shoulder credential prompt). UAC does not quarantine files (which is Defender's job), disable network interfaces, or expire user account passwords.",
        "distractor_analysis": {
            "1": "Quarantining malicious software is the function of Windows Defender Antivirus / Microsoft Defender for Endpoint, not the UAC prompt mechanism.",
            "2": "UAC does not modify network adapter states or sever gateway communication.",
            "3": "Triggering a UAC prompt is a standard privilege control and does not invalidate domain credentials or lock the user account."
        }
    },

    # 2.3 Wireless encryption and authentication methods (4 questions: C2N-S-009..012)
    {
        "id": "C2N-S-009",
        "objective": "2.3",
        "difficulty": "hard",
        "tags": ["wireless-security", "wpa3", "sae", "encryption"],
        "question": "A network engineer is upgrading a corporate campus wireless network from WPA2-Personal to WPA3-Personal. Which key cryptographic improvement in WPA3 replaces the Pre-Shared Key (PSK) 4-way handshake to prevent offline dictionary attacks?",
        "options": [
            "Simultaneous Authentication of Equals (SAE)",
            "Temporal Key Integrity Protocol (TKIP)",
            "Wired Equivalent Privacy with RC4 (WEP)",
            "Extensible Authentication Protocol-MD5 (EAP-MD5)"
        ],
        "answer": 0,
        "explanation": "WPA3-Personal replaces the vulnerable WPA2 PSK 4-way handshake with Simultaneous Authentication of Equals (SAE), also known as the Dragonfly handshake. SAE uses zero-knowledge proofs and forward secrecy, making offline dictionary attacks impossible even if an attacker captures the initial wireless exchange. TKIP and WEP are obsolete, broken protocols that use weak RC4 encryption. EAP-MD5 is an insecure legacy authentication method susceptible to collision attacks.",
        "distractor_analysis": {
            "1": "TKIP was a stopgap protocol for WPA based on RC4; it was deprecated due to fundamental cryptographic vulnerabilities.",
            "2": "WEP is an obsolete, insecure legacy standard using static 64-bit/128-bit RC4 keys that can be cracked in minutes.",
            "3": "EAP-MD5 provides only client-to-server password hashes over clear text without server authentication or dynamic key generation."
        }
    },
    {
        "id": "C2N-S-010",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-security", "802.1x", "wpa2-enterprise", "radius"],
        "question": "An organization wants to eliminate shared Wi-Fi passwords and require every employee to authenticate to the corporate SSID using their individual Active Directory domain credentials. Which wireless security configuration must be implemented?",
        "options": [
            "WPA2/WPA3-Enterprise using 802.1X and a backend RADIUS server",
            "WPA2-Personal with a 63-character Pre-Shared Key (PSK)",
            "Disabling SSID broadcast and enabling MAC address filtering",
            "Configuring an unencrypted captive portal with a shared guest PIN"
        ],
        "answer": 0,
        "explanation": "WPA2/WPA3-Enterprise utilizes IEEE 802.1X port-based network access control combined with an authentication server (such as RADIUS/NPS). Each user connects using their personal directory credentials or digital certificates, generating unique per-session encryption keys and enabling individual revocation. WPA2-Personal relies on a shared passphrase. SSID hiding and MAC filtering provide zero cryptographic protection, and captive portals on open networks leave traffic unencrypted.",
        "distractor_analysis": {
            "1": "WPA2-Personal still uses a single Pre-Shared Key shared across all devices, preventing individual credential tracking or selective access revocation.",
            "2": "Hiding SSIDs and filtering MAC addresses are security-by-obscurity measures easily bypassed with packet sniffers and MAC spoofing.",
            "3": "Captive portals on open networks authenticate users after connection but transmit all ongoing wireless data payloads completely unencrypted."
        }
    },
    {
        "id": "C2N-S-011",
        "objective": "2.3",
        "difficulty": "hard",
        "tags": ["wireless-security", "eap-tls", "certificates", "pki"],
        "question": "A financial institution requires the highest level of wireless authentication security for executive laptops, requiring mutual authentication where both the client and the authentication server validate each other using digital certificates. Which EAP protocol is required?",
        "options": [
            "EAP-TLS",
            "PEAP-MSCHAPv2",
            "EAP-FAST",
            "LEAP"
        ],
        "answer": 0,
        "explanation": "EAP-TLS (Transport Layer Security) is the gold standard for enterprise wireless authentication because it mandates mutual authentication: the RADIUS server presents a server certificate to the client, and the client device must present a valid client certificate issued by the organization's Public Key Infrastructure (PKI). PEAP-MSCHAPv2 requires only a server-side certificate while authenticating users via passwords. LEAP is an insecure proprietary Cisco protocol susceptible to dictionary attacks. EAP-FAST relies on Protected Access Credentials (PACs).",
        "distractor_analysis": {
            "1": "PEAP-MSCHAPv2 authenticates the server with a certificate, but authenticates the client using username and password rather than a client-side digital certificate.",
            "2": "EAP-FAST uses PAC files rather than requiring mandatory client-side X.509 digital certificates.",
            "3": "LEAP is a deprecated, vulnerable protocol that transmits MS-CHAP challenge-responses in a format easily cracked with offline tools."
        }
    },
    {
        "id": "C2N-S-012",
        "objective": "2.3",
        "difficulty": "medium",
        "tags": ["wireless-security", "aes-ccmp", "encryption-standards", "wpa2"],
        "question": "A technician is configuring an access point for WPA2. Which encryption cipher suite must be selected to comply with the standard and provide robust AES-based confidentiality?",
        "options": [
            "AES-CCMP",
            "RC4-TKIP",
            "DES-CBC",
            "MD5-HMAC"
        ],
        "answer": 0,
        "explanation": "WPA2 mandates the use of CCMP (Counter Mode Cipher Block Chaining Message Authentication Code Protocol), which is built on the Advanced Encryption Standard (AES) cipher algorithm with 128-bit keys. TKIP is based on RC4 and was only used in original WPA as an interim fix for WEP. DES is an obsolete 56-bit symmetric cipher, and MD5 is a hashing algorithm, not an encryption cipher suite.",
        "distractor_analysis": {
            "1": "TKIP uses the deprecated RC4 stream cipher and does not meet WPA2 AES compliance standards.",
            "2": "DES is an insecure legacy symmetric encryption algorithm with a 56-bit key space that is easily brute-forced.",
            "3": "MD5-HMAC is an integrity checksum/hashing mechanism, not a symmetric encryption cipher used for payload confidentiality."
        }
    },

    # 2.4 Malware types and anti-malware tools (3 questions: C2N-S-013..015)
    {
        "id": "C2N-S-013",
        "objective": "2.4",
        "difficulty": "medium",
        "tags": ["malware", "ransomware", "crypto-malware", "threats"],
        "question": "A user arrives at work to discover all documents on their local drive have been renamed with a .locked extension. A text file on the desktop demands a Bitcoin payment to obtain the private decryption key. What type of malware has infected the computer?",
        "options": [
            "Ransomware / Crypto-malware",
            "Spyware",
            "Keylogger",
            "Rootkit"
        ],
        "answer": 0,
        "explanation": "Ransomware (specifically crypto-malware) encrypts user files using strong asymmetric/symmetric algorithms, appends custom extensions, and demands extortion payments (usually in cryptocurrency) in exchange for the decryption tool. Spyware stealthily monitors user activity without altering file availability. Keyloggers capture keystrokes to harvest passwords. Rootkits conceal malware processes and maintain persistent kernel-level access.",
        "distractor_analysis": {
            "1": "Spyware operates covertly to collect browsing habits and telemetry without encrypting files or leaving ransom notes.",
            "2": "Keyloggers record keyboard input to capture credentials silently, avoiding overt signs of system tampering.",
            "3": "Rootkits modify system binaries and kernel hooks to hide presence from security tools, rather than encrypting data for ransom."
        }
    },
    {
        "id": "C2N-S-014",
        "objective": "2.4",
        "difficulty": "hard",
        "tags": ["malware", "rootkit", "kernel", "stealth"],
        "question": "A compromised system exhibits severe performance degradation, yet standard Task Manager and user-mode antivirus scans report zero abnormal processes or detections. A bootable offline scanner reveals unauthorized modifications to the OS kernel and boot loader. Which malware type is responsible?",
        "options": [
            "Rootkit",
            "Adware",
            "Macro virus",
            "Logic bomb"
        ],
        "answer": 0,
        "explanation": "Rootkits operate at deep system levels (Ring 0 / kernel space or boot loader / UEFI level) to hook system APIs and intercept calls from monitoring tools like Task Manager and antivirus software, effectively rendering themselves invisible to the active OS. Detecting rootkits typically requires offline scanning tools or hardware-rooted verification (Secure Boot). Adware displays unwanted advertising, macro viruses embed inside Office documents, and logic bombs execute only when specific conditions are triggered.",
        "distractor_analysis": {
            "1": "Adware generates pop-ups and banner advertisements in user space and does not subvert kernel-level OS reporting.",
            "2": "Macro viruses run within script-enabled document environments (like Word or Excel) rather than replacing core OS kernel components.",
            "3": "Logic bombs lie dormant until a specific trigger event occurs (e.g., date or employee termination) but do not inherently hide kernel API calls."
        }
    },
    {
        "id": "C2N-S-015",
        "objective": "2.4",
        "difficulty": "medium",
        "tags": ["malware", "trojan", "social-engineering", "payload"],
        "question": "A user downloads a free third-party PDF utility from an untrusted forum. After installation, the PDF tool functions as expected, but the computer secretly begins communicating with an external command-and-control server as part of a botnet. Which classification BEST describes this malware?",
        "options": [
            "Trojan",
            "Worm",
            "Ransomware",
            "Polymorphic virus"
        ],
        "answer": 0,
        "explanation": "A Trojan (Trojan horse) masquerades as a legitimate, desirable application (such as a utility, media player, or game) while secretly carrying a malicious payload (like a backdoor or botnet agent). Unlike worms, Trojans do not self-replicate across the network; they rely on user deception to execute. Ransomware holds data hostage for payment, and polymorphic viruses alter their code signature to evade static hash detection.",
        "distractor_analysis": {
            "1": "Worms self-propagate autonomously across network vulnerabilities without requiring user interaction or disguised legitimate wrappers.",
            "2": "Ransomware locks or encrypts files and displays extortion demands, rather than stealthily operating as a functional utility.",
            "3": "A polymorphic virus is defined by its ability to mutate its binary signature upon replication, whereas the question describes disguised delivery."
        }
    },

    # 2.5 Social engineering, attacks, and security vulnerabilities (4 questions: C2N-S-016..019)
    {
        "id": "C2N-S-016",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "spear-phishing", "whaling", "email-security"],
        "question": "The Chief Financial Officer receives an urgent email that appears to come from the Chief Executive Officer, referencing an upcoming confidential acquisition and requesting an immediate wire transfer to an offshore escrow account. Which social engineering attack is taking place?",
        "options": [
            "Whaling (targeted executive spear phishing)",
            "Vishing",
            "Shoulder surfing",
            "Watering hole attack"
        ],
        "answer": 0,
        "explanation": "Whaling is a highly targeted form of spear phishing directed specifically at high-profile senior executives (such as CEOs, CFOs, or board members) with personalized context, often aiming to authorize fraudulent wire transfers or disclose sensitive corporate data. Vishing takes place over voice telephone calls. Shoulder surfing involves visually observing someone's screen or keyboard. A watering hole attack infects a third-party website frequented by the target organization.",
        "distractor_analysis": {
            "1": "Vishing involves social engineering conducted via voice telephone calls or VoIP systems rather than targeted executive emails.",
            "2": "Shoulder surfing is physical observation of sensitive input or screens in close proximity to the victim.",
            "3": "A watering hole attack compromises a legitimate industry website to deliver drive-by malware to visiting employees."
        }
    },
    {
        "id": "C2N-S-017",
        "objective": "2.5",
        "difficulty": "medium",
        "tags": ["social-engineering", "tailgating", "physical-security", "piggybacking"],
        "question": "An unauthenticated person in delivery attire carrying heavy cardboard boxes approaches a secure building entrance. As an employee badges into the facility, the delivery person asks the employee to hold the door open for them. What social engineering tactic is being used?",
        "options": [
            "Tailgating / Piggybacking",
            "Dumpster diving",
            "Smishing",
            "Brute-force attack"
        ],
        "answer": 0,
        "explanation": "Tailgating (or piggybacking) is a physical social engineering technique where an unauthorized person follows an authorized individual through a secure door, often exploiting social norms of politeness (such as holding the door for someone carrying packages). Dumpster diving involves rummaging through trash for sensitive documents. Smishing is phishing conducted via SMS text messages. Brute-force attacks use automated password guessing.",
        "distractor_analysis": {
            "1": "Dumpster diving searches physical waste receptacles for discarded paperwork, passwords, or hardware asset tags.",
            "2": "Smishing is social engineering delivered through mobile SMS/MMS text messages containing malicious links.",
            "3": "Brute-force attacks systematically attempt password combinations using cryptographic software tools."
        }
    },
    {
        "id": "C2N-S-018",
        "objective": "2.5",
        "difficulty": "hard",
        "tags": ["network-attacks", "mitm", "on-path", "arp-poisoning"],
        "question": "A threat actor on a local subnet transmits unsolicited ARP reply packets associating the default gateway's IP address with the attacker's own MAC address. This allows the attacker to intercept and modify all outbound traffic from subnet workstations. What attack is occurring?",
        "options": [
            "On-path attack (Man-in-the-Middle via ARP poisoning)",
            "Denial of Service (DoS) ping flood",
            "SQL injection attack",
            "Cross-Site Scripting (XSS)"
        ],
        "answer": 0,
        "explanation": "ARP poisoning (ARP spoofing) corrupts the ARP cache on local hosts, causing them to send traffic destined for the gateway directly to the attacker's MAC address. This places the attacker in the middle of the communication stream, executing an On-Path (Man-in-the-Middle) attack to eavesdrop or alter data. A ping flood overwhelms bandwidth without routing traffic through the attacker. SQL injection targets backend database queries, and XSS exploits client-side browser script execution.",
        "distractor_analysis": {
            "1": "A ping flood (ICMP flood) aims to exhaust device processing capacity or network bandwidth, rather than intercepting and inspecting routed packets.",
            "2": "SQL injection injects malicious SQL statements into web input fields to manipulate database tables.",
            "3": "Cross-Site Scripting injects malicious JavaScript into trusted web pages to steal session cookies from other users' web browsers."
        }
    },
    {
        "id": "C2N-S-019",
        "objective": "2.5",
        "difficulty": "hard",
        "tags": ["vulnerabilities", "zero-day", "patching", "threats"],
        "question": "Security researchers discover a critical remote code execution flaw in a widely used web server application for which no security patch or update currently exists from the software vendor. How is this vulnerability classified?",
        "options": [
            "Zero-day vulnerability",
            "Brute-force vulnerability",
            "Default credential flaw",
            "Legacy protocol deprecation"
        ],
        "answer": 0,
        "explanation": "A zero-day vulnerability is a software security flaw that is known to researchers or actively exploited in the wild before the software developer has released an official patch or fix (leaving zero days of protection). Administrators must rely on workarounds, web application firewalls (WAFs), or disabling affected services until a patch is published. Default credentials and legacy protocols are known configuration issues, not unpatched zero-day flaws.",
        "distractor_analysis": {
            "1": "Brute-force is an attack method that guesses credentials iteratively; it is not a term describing unpatched zero-day vulnerabilities.",
            "2": "Default credential flaws stem from failing to change factory passwords (e.g., admin/admin), not zero-day software code flaws.",
            "3": "Legacy protocol deprecation refers to retiring outdated standards (like SSLv3 or TLS 1.0) due to known architectural weaknesses."
        }
    },

    # 2.6 Malware removal (4 questions: C2N-S-020..023)
    {
        "id": "C2N-S-020",
        "objective": "2.6",
        "difficulty": "hard",
        "tags": ["malware-removal", "methodology", "comptia-7-step", "quarantine"],
        "question": "A technician verifies that a workstation is infected with an active ransomware variant that is attempting to encrypt mapped network shares. Following the CompTIA 7-step malware removal process, what is the technician's IMMEDIATE next step?",
        "options": [
            "Quarantine the infected system by disconnecting its network cable and disabling Wi-Fi",
            "Disable System Restore in the system settings",
            "Run a full anti-malware scan using updated definitions",
            "Educate the end user on recognizing malicious email attachments"
        ],
        "answer": 0,
        "explanation": "The CompTIA 7-step malware removal process is: 1. Investigate and verify symptoms, 2. Quarantine infected systems, 3. Disable System Restore, 4. Remediate infected systems, 5. Schedule scans and run updates, 6. Enable System Restore and create a restore point, 7. Educate the end user. Once symptoms are verified, Step 2 is immediately quarantining the machine (disconnecting network/Wi-Fi) to prevent malware spread. Disabling System Restore is Step 3, remediation is Step 4, and user education is Step 7.",
        "distractor_analysis": {
            "1": "Disabling System Restore is Step 3 of the process and must only occur after the machine is quarantined to stop lateral network transmission.",
            "2": "Remediating the system with scans is Step 4; running scans on a connected machine allows ransomware to continue encrypting shared files.",
            "3": "User education is the 7th and final step of the methodology, performed after the system is fully cleansed, protected, and restored."
        }
    },
    {
        "id": "C2N-S-021",
        "objective": "2.6",
        "difficulty": "medium",
        "tags": ["malware-removal", "system-restore", "methodology", "remediation"],
        "question": "Why does the CompTIA malware removal methodology require disabling Windows System Restore BEFORE initiating anti-malware scans and remediation?",
        "options": [
            "To prevent the malware from hiding copies of itself inside previous system restore snapshots and reinfecting the system later",
            "To free up disk space required by the anti-malware scanning engine",
            "To speed up the network download rate of updated signature definitions",
            "To allow standard users to perform administrative scans without a UAC prompt"
        ],
        "answer": 0,
        "explanation": "Disabling System Restore purges all existing restore points. If System Restore remains enabled, infected system files and registry hives can be archived into restore snapshots. If the system is later restored to a prior date, the malware will be resurrected, reinfecting the cleansed workstation. Disabling System Restore does not affect signature download speeds, free disk space for engine installation, or bypass UAC controls.",
        "distractor_analysis": {
            "1": "While disabling System Restore does clear disk space, the explicit security rationale is eliminating infected snapshot backups.",
            "2": "System Restore operates locally on disk volume snapshots and has no bearing on network bandwidth or definition update downloads.",
            "3": "UAC security boundaries are unaffected by the operational state of the Volume Shadow Copy / System Restore service."
        }
    },
    {
        "id": "C2N-S-022",
        "objective": "2.6",
        "difficulty": "medium",
        "tags": ["malware-removal", "safe-mode", "remediation", "clean-boot"],
        "question": "A technician is attempting to remediate an infected workstation, but the malware actively terminates the antivirus process whenever an on-demand scan begins. What remediation environment should the technician use to overcome this active defense?",
        "options": [
            "Boot into Windows Safe Mode or use a standalone bootable WinPE / Linux rescue disk",
            "Launch the anti-malware utility from a secondary standard user account",
            "Increase the paging file size in Advanced System Settings",
            "Run the `ipconfig /flushdns` command in Command Prompt"
        ],
        "answer": 0,
        "explanation": "When active malware intercepts or terminates security software, booting into Windows Safe Mode prevents third-party autorun drivers and rogue services from loading. Alternatively, booting into an offline pre-installation environment (such as a WinPE or Linux rescue USB drive) mounts the drive without running any host OS binaries, allowing the scanner to detect and delete locked malware files. Secondary standard accounts, paging file adjustments, and DNS flushes do not stop running malware hooks.",
        "distractor_analysis": {
            "1": "The malware runs at system/admin level and will continue terminating security processes across all interactive user logon sessions.",
            "2": "Adjusting virtual memory paging files has zero effect on active process termination or malicious rootkit hooks.",
            "3": "Flushing DNS resolver cache clears cached name-to-IP mappings but does not disable or terminate resident malware processes."
        }
    },
    {
        "id": "C2N-S-023",
        "objective": "2.6",
        "difficulty": "medium",
        "tags": ["malware-removal", "restore-point", "user-education", "methodology"],
        "question": "A technician has successfully remediated a severe trojan infection, scheduled daily automated anti-malware scans, and applied all pending operating system updates. What is the NEXT step in the CompTIA malware removal methodology?",
        "options": [
            "Enable System Restore and create a clean baseline restore point",
            "Reformat the drive and reinstall the operating system from scratch",
            "Close the trouble ticket without contacting the end user",
            "Disable the Windows Defender Real-time Protection engine"
        ],
        "answer": 0,
        "explanation": "Following Step 5 (Schedule scans and run updates), Step 6 of the CompTIA malware removal methodology is to re-enable System Restore and create a new, verified clean restore point. This establishes a clean recovery baseline. Reformatting is unnecessary after successful remediation. Closing the ticket without educating the user violates Step 7 (Educate the end user), and disabling real-time protection leaves the host vulnerable.",
        "distractor_analysis": {
            "1": "Reformatting is a last-resort measure when remediation fails; performing it after successful remediation destroys user productivity.",
            "2": "Step 7 requires engaging and educating the end user on prevention strategies rather than closing tickets silently.",
            "3": "Disabling real-time protection leaves the cleansed system completely defenseless against immediate reinfection."
        }
    },

    # 2.7 Security best practices (3 questions: C2N-S-024..026)
    {
        "id": "C2N-S-024",
        "objective": "2.7",
        "difficulty": "medium",
        "tags": ["security-best-practices", "screen-lock", "inactivity-timeout", "gpo"],
        "question": "In a healthcare facility, medical staff frequently step away from workstation terminals to assist patients, leaving electronic health records visible on unattended displays. Which security control BEST mitigates this risk?",
        "options": [
            "Configuring an automatic screen saver lockout policy after 3 minutes of inactivity via Group Policy",
            "Requiring users to change their complex passwords every 14 days",
            "Disabling the local USB storage ports on all medical workstations",
            "Installing anti-glare privacy filters on desktop monitors"
        ],
        "answer": 0,
        "explanation": "Enforcing an automatic screen lock policy after a brief period of inactivity (such as 3 minutes) ensures that unattended workstations secure themselves, requiring valid user re-authentication to resume. This directly prevents unauthorized passersby from viewing or tampering with open records. Frequent password changes do not lock unattended screens, USB port restrictions prevent data exfiltration via flash drives, and privacy filters protect against side-angle viewing but leave the terminal fully accessible to anyone sitting at the desk.",
        "distractor_analysis": {
            "1": "High-frequency password rotations cause user fatigue and bad password habits without solving unattended active sessions.",
            "2": "Disabling USB storage prevents unauthorized data copying but leaves open patient charts exposed to visual inspection.",
            "3": "Privacy filters prevent shoulder surfing from oblique angles, but do not prevent a person from walking up to the open console."
        }
    },
    {
        "id": "C2N-S-025",
        "objective": "2.7",
        "difficulty": "medium",
        "tags": ["security-best-practices", "account-management", "guest-account", "hardening"],
        "question": "During a routine workstation security audit, a security engineer notices that the built-in Guest account is enabled on several standalone accounting PCs. What security best practice should be applied IMMEDIATELY?",
        "options": [
            "Disable the built-in Guest account across all machines",
            "Assign the Guest account to the local Administrators group",
            "Set the Guest account password to never expire",
            "Rename the Guest account to Administrator"
        ],
        "answer": 0,
        "explanation": "Security best practices mandate disabling built-in default accounts that are not in use, specifically the Guest account. An enabled Guest account provides unauthenticated or low-privilege access to local system resources and network shares. Elevating the Guest account to Administrators creates a catastrophic security hole, setting its password to never expire prolongs the vulnerability, and renaming it to Administrator introduces confusion and violates renaming guidelines.",
        "distractor_analysis": {
            "1": "Adding the Guest account to Administrators gives anonymous or unverified users complete control over the local operating system.",
            "2": "Allowing passwords to never expire on unsecured built-in accounts exacerbates vulnerabilities.",
            "3": "Renaming Guest to Administrator creates administrative ambiguity and does not disable the vulnerable anonymous logon pathway."
        }
    },
    {
        "id": "C2N-S-026",
        "objective": "2.7",
        "difficulty": "hard",
        "tags": ["security-best-practices", "data-loss-prevention", "dlp", "usb-blocking"],
        "question": "An enterprise defense contractor needs to prevent employees from copying confidential project files onto personal USB thumb drives while still allowing authorized USB keyboards and mice. Which technology provides this specific protection?",
        "options": [
            "Data Loss Prevention (DLP) / Endpoint USB Removable Media blocking policies",
            "Disabling the USB Host Controller in system UEFI/BIOS",
            "Configuring an IPsec tunnel between workstations and domain controllers",
            "Enabling Network Address Translation (NAT) on the edge router"
        ],
        "answer": 0,
        "explanation": "Endpoint Data Loss Prevention (DLP) solutions and Windows Group Policy Removable Storage Access rules allow administrators to specifically block or restrict USB Mass Storage class devices (flash drives, external HDDs) while allowing Human Interface Devices (HID) like USB mice, keyboards, and smart card readers to operate normally. Disabling the USB controller in BIOS cuts power to all USB peripherals. IPsec encrypts network traffic, and NAT translates private IP addresses, neither of which manages USB device classes.",
        "distractor_analysis": {
            "1": "Disabling the hardware USB controller in UEFI completely disables all USB ports, preventing the use of necessary USB keyboards and mice.",
            "2": "IPsec provides network layer encryption and integrity between hosts but has no mechanism to govern local USB hardware classes.",
            "3": "NAT manages IP address translation at the network boundary and cannot enforce endpoint hardware peripheral policies."
        }
    },

    # 2.8 Mobile device security (3 questions: C2N-S-027..029)
    {
        "id": "C2N-S-027",
        "objective": "2.8",
        "difficulty": "medium",
        "tags": ["mobile-security", "mdm", "remote-wipe", "byod"],
        "question": "A sales executive leaves their company-enrolled smartphone in a taxi while traveling abroad. The smartphone contains sensitive customer databases and corporate emails. Which Mobile Device Management (MDM) action should the IT help desk execute immediately?",
        "options": [
            "Issue a remote wipe command to erase all device data or corporate container data",
            "Disable the user's Active Directory account and wait for the phone to run out of battery",
            "Send an SMS message to the phone offering a cash reward to the finder",
            "Configure a new SSID on the corporate wireless controller"
        ],
        "answer": 0,
        "explanation": "When an enrolled mobile device is lost or stolen, Mobile Device Management (MDM) allows administrators to trigger a remote wipe over cellular or Wi-Fi networks. This immediately erases cryptographic keys and sanitizes the flash memory (or corporate container in MAM environments), protecting sensitive data from being extracted. Disabling user accounts prevents new authentications but leaves cached offline data vulnerable on the physical device. SMS messages and SSID changes do not protect device data.",
        "distractor_analysis": {
            "1": "Disabling the user account stops future server synchronization but leaves all cached emails and local documents unencrypted and readable on the stolen phone.",
            "2": "Sending SMS messages relies on the thief's goodwill and does nothing to protect confidential data from forensic extraction.",
            "3": "Altering corporate SSIDs affects local office Wi-Fi and provides zero security mitigation for a lost device in a foreign taxi."
        }
    },
    {
        "id": "C2N-S-028",
        "objective": "2.8",
        "difficulty": "hard",
        "tags": ["mobile-security", "sideloading", "jailbreaking", "rooting"],
        "question": "An employee modifies their corporate Android smartphone's operating system to bypass vendor security restrictions and install unapproved .apk packages from third-party websites. What security term describes this action, and what major risk does it introduce?",
        "options": [
            "Rooting / Sideloading; it removes application sandboxing and exposes the device to unverified malicious code",
            "Tethering; it consumes excessive cellular data bandwidth",
            "Carrier unlocking; it violates cellular SIM card roaming agreements",
            "Containerization; it encrypts the personal profile partition"
        ],
        "answer": 0,
        "explanation": "Rooting (on Android) or Jailbreaking (on iOS) circumvents OS security boundaries, granting superuser/root privileges to the user and any malicious apps. Sideloading allows installing software packages (.apk) from unverified third-party sources rather than official curated app stores (Google Play, Apple App Store). This bypasses the OS application sandbox, allowing malware to access other apps' data, keystrokes, and system files. Tethering shares internet connections, carrier unlocking changes SIM providers, and containerization is a defensive security control.",
        "distractor_analysis": {
            "1": "Tethering shares a phone's cellular internet connection with nearby Wi-Fi or USB devices, having nothing to do with OS privilege escalation.",
            "2": "Carrier unlocking enables a phone to connect to different cellular network providers and does not compromise the OS kernel sandbox.",
            "3": "Containerization is an MDM security technique that separates corporate and personal data; it is the opposite of insecure OS rooting."
        }
    },
    {
        "id": "C2N-S-029",
        "objective": "2.8",
        "difficulty": "medium",
        "tags": ["mobile-security", "biometrics", "authenticator-app", "totp"],
        "question": "A financial firm requires field employees to use time-based one-time password (TOTP) codes for cloud portal access. Which mobile security technology generates these rolling 6-digit codes without requiring cellular SMS connectivity?",
        "options": [
            "Software authenticator applications (such as Microsoft Authenticator or Google Authenticator)",
            "Standard SMS cellular text messaging",
            "Automated interactive voice response (IVR) phone calls",
            "Unencrypted email delivery to the user's personal inbox"
        ],
        "answer": 0,
        "explanation": "Software authenticator applications use an algorithm (RFC 6238 TOTP) combining a shared secret cryptographic seed and the current Unix epoch time to generate synchronized 6-digit codes every 30 seconds. Because calculation happens locally on the smartphone, no cellular reception, SMS service, or internet connection is required at the moment of code generation. SMS and voice calls depend entirely on cellular carrier networks and are vulnerable to SIM-swapping attacks.",
        "distractor_analysis": {
            "1": "SMS text messaging relies on cellular carrier transmission and is vulnerable to interception, SS7 exploits, and SIM swap fraud.",
            "2": "Automated voice calls require active cellular connectivity and are susceptible to eavesdropping and call forwarding rerouting.",
            "3": "Email-based OTP delivery requires internet access and exposes OTP tokens to email account compromises."
        }
    },

    # 2.9 Data destruction and disposal (3 questions: C2N-S-030..032)
    {
        "id": "C2N-S-030",
        "objective": "2.9",
        "difficulty": "hard",
        "tags": ["data-destruction", "degaussing", "magnetic-media", "disposal"],
        "question": "A datacenter administrator is decommissioning 50 obsolete magnetic hard disk drives (HDDs) that previously stored classified government data. Which physical sanitization method uses powerful electromagnetic pulses to permanently disrupt magnetic domains and render the platters unrecoverable?",
        "options": [
            "Degaussing",
            "Performing a Windows Quick Format in Disk Management",
            "Overwriting the drive with a single pass of zeroes (Zero-fill)",
            "Executing the `format /q` command in Command Prompt"
        ],
        "answer": 0,
        "explanation": "Degaussing subjects magnetic media (such as traditional HDDs and magnetic tapes) to an extremely strong magnetic field (measured in oersteds/gauss), permanently destroying the magnetic domains on the platters and corrupting the factory-written servo tracks, rendering the drive completely inoperable and unrecoverable. Quick format only removes filesystem index tables while leaving all underlying data intact. Single-pass zero-filling does not meet high-security classified destruction standards. (Note: Degaussing does NOT sanitize flash-based SSDs).",
        "distractor_analysis": {
            "1": "A Quick Format only rebuilds file allocation structures and root directories, leaving raw file data completely retrievable with forensic carving tools.",
            "2": "Single-pass zero-fills sanitize logical sectors on functioning drives but do not meet strict classified physical destruction mandates and are ineffective on bad sectors.",
            "3": "`format /q` is identical to a Quick Format and provides zero cryptographic or magnetic data sanitization."
        }
    },
    {
        "id": "C2N-S-031",
        "objective": "2.9",
        "difficulty": "medium",
        "tags": ["data-destruction", "certificate-of-destruction", "compliance", "asset-disposal"],
        "question": "An enterprise contracts a certified e-waste disposal vendor to shred failed solid-state drives (SSDs) containing financial records. Which document MUST the vendor provide to legally prove compliance with data privacy regulations?",
        "options": [
            "A formal Certificate of Destruction detailing serial numbers, method, and date",
            "An invoice receipt listing total scrap metal weight",
            "A copy of the technician's CompTIA A+ certification card",
            "A manufacturer warranty replacement RMA slip"
        ],
        "answer": 0,
        "explanation": "A Certificate of Destruction is a legally recognized document provided by a certified disposal company that specifies the exact serial numbers of destroyed assets, the precise destruction method used (such as cross-cut shredding or incineration), the date and time of destruction, and the signature of the certified witness. This document is essential for passing regulatory audits (e.g., PCI-DSS, HIPAA, GDPR). Weight receipts, training cards, and RMA slips provide no legal proof of data destruction.",
        "distractor_analysis": {
            "1": "An invoice with scrap metal weight proves an exchange of raw material but fails to document individual drive serial numbers or verify data destruction.",
            "2": "A technician's personal certification does not provide legal chain-of-custody documentation or evidence of asset destruction.",
            "3": "An RMA slip documents a warranty exchange with a manufacturer and indicates the drive was returned rather than destroyed."
        }
    },
    {
        "id": "C2N-S-032",
        "objective": "2.9",
        "difficulty": "hard",
        "tags": ["data-destruction", "ssd-sanitization", "nvme", "purge", "nist-800-88"],
        "question": "A technician is preparing an NVMe Solid-State Drive (SSD) for repurposing within the same corporate department. Standard magnetic degaussing is ineffective on flash memory. Which method properly sanitizes the SSD in accordance with NIST 800-88 Clear/Purge guidelines?",
        "options": [
            "Executing the drive's built-in cryptographic erase (PSID revert) or ATA/NVMe Secure Erase command",
            "Running a standard magnetic degausser wand over the NAND flash chips",
            "Deleting the volume partition in Windows Disk Management",
            "Performing a standard file deletion and emptying the Recycle Bin"
        ],
        "answer": 0,
        "explanation": "NAND flash memory stores data electronically in floating-gate or charge-trap cells, making magnetic degaussing completely ineffective. To sanitize an SSD without physically destroying it, technicians execute the drive controller's built-in NVMe Format / ATA Secure Erase or Cryptographic Erase (Sanitize/PSID revert) command, which flashes voltage to all memory blocks or destroys the hardware encryption key. Deleting partitions or emptying the Recycle Bin merely removes pointers, leaving raw NAND cells intact.",
        "distractor_analysis": {
            "1": "Degaussing relies on altering magnetic orientations and has zero effect on the electronic charges stored within solid-state NAND flash cells.",
            "2": "Deleting partitions removes the partition table header but leaves the underlying data blocks accessible to data recovery software.",
            "3": "Emptying the Recycle Bin simply marks file index records as available for overwriting without modifying actual data on disk."
        }
    },

    # 2.10 Securing a SOHO network (2 questions: C2N-S-033..034)
    {
        "id": "C2N-S-034",
        "objective": "2.10",
        "difficulty": "medium",
        "tags": ["soho-security", "router-hardening", "default-credentials", "firmware"],
        "question": "A technician is installing a new SOHO router for a small accounting firm. Which baseline hardening step must the technician perform FIRST before connecting the router to the internet?",
        "options": [
            "Change the default administrative username and password and update to the latest firmware",
            "Enable Remote Management over HTTP on the WAN port for external support",
            "Enable Wi-Fi Protected Setup (WPS) to simplify printer connections",
            "Assign public IP addresses directly to all internal client workstations"
        ],
        "answer": 0,
        "explanation": "The very first and most critical step when setting up any SOHO router is changing the factory default administrator credentials (such as admin/admin or admin/password), followed immediately by updating the firmware to patch known security vulnerabilities. Leaving default credentials allows automated bots and attackers to take over the device. Remote WAN management and WPS represent critical security vulnerabilities, and assigning public IPs directly exposes internal clients.",
        "distractor_analysis": {
            "1": "Enabling remote WAN management over HTTP exposes the router's administrative login interface to unencrypted internet-wide attacks.",
            "2": "WPS (Wi-Fi Protected Setup) is fundamentally vulnerable to PIN brute-force attacks and should always be disabled in secure environments.",
            "3": "Public IP assignment bypasses router NAT and firewall protections, exposing internal workstations directly to internet scans."
        }
    },
    {
        "id": "C2N-S-033",
        "objective": "2.10",
        "difficulty": "medium",
        "tags": ["soho-security", "guest-network", "iot-isolation", "vlan"],
        "question": "A small business owner wants to offer complimentary Wi-Fi to visiting customers while ensuring they cannot access the company's internal point-of-sale (POS) terminals or network printers. How should the technician configure the SOHO router?",
        "options": [
            "Enable a dedicated Guest Wi-Fi network with client isolation enabled",
            "Share the primary WPA3 enterprise passphrase with customers on request",
            "Disable encryption on the primary SSID and filter customer MAC addresses",
            "Configure port forwarding on port 80 to the point-of-sale terminal"
        ],
        "answer": 0,
        "explanation": "Enabling a dedicated Guest Network (or guest SSID/VLAN) creates an isolated subnet separated from the internal LAN. Enabling client isolation prevents guest devices from communicating with one another or discovering internal business assets such as POS terminals and printers. Sharing the primary passphrase allows full LAN lateral movement, unencrypted Wi-Fi exposes traffic, and port forwarding opens internal devices to incoming external connections.",
        "distractor_analysis": {
            "1": "Sharing the primary business SSID allows visiting customers full network visibility and lateral access to sensitive internal POS systems.",
            "2": "Disabling encryption allows anyone nearby to sniff traffic, and MAC filtering is trivial to spoof without offering subnet isolation.",
            "3": "Port forwarding redirects incoming internet traffic to internal servers and does not provide Wi-Fi network segmentation."
        }
    },

    # 2.11 Browser security (2 questions: C2N-S-035..036)
    {
        "id": "C2N-S-035",
        "objective": "2.11",
        "difficulty": "medium",
        "tags": ["browser-security", "certificates", "https", "tls-warning"],
        "question": "A user attempts to navigate to their corporate webmail portal and receives a severe browser warning: 'Your connection is not private - NET::ERR_CERT_AUTHORITY_INVALID'. What is the MOST likely cause of this warning?",
        "options": [
            "The web server's SSL/TLS certificate is self-signed or issued by a Certificate Authority (CA) not trusted in the client's root certificate store",
            "The client computer's network cable is disconnected from the wall jack",
            "The web browser's pop-up blocker is preventing the webmail page from loading",
            "The user entered an incorrect username and password on the login screen"
        ],
        "answer": 0,
        "explanation": "The 'ERR_CERT_AUTHORITY_INVALID' error occurs when the browser cannot verify the cryptographic chain of trust because the website's SSL/TLS certificate was issued by an untrusted CA, is self-signed, or the enterprise private CA root certificate has not been installed in the operating system's trusted root certificate store. Physical disconnections prevent page loading entirely (DNS/timeout error), pop-up blockers do not trigger certificate warnings, and authentication errors occur at the application layer after a secure TLS session is established.",
        "distractor_analysis": {
            "1": "A disconnected network cable causes an immediate network unreachable or DNS resolution failure, not a cryptographic TLS certificate error.",
            "2": "Pop-up blockers suppress child browser windows without interfering with HTTPS certificate chain-of-trust verification.",
            "3": "Authentication errors happen after TLS handshake negotiation and display application login failures, not root CA validation warnings."
        }
    },
    {
        "id": "C2N-S-036",
        "objective": "2.11",
        "difficulty": "medium",
        "tags": ["browser-security", "extensions", "privacy", "cookies", "cache"],
        "question": "A user reports that search queries in their web browser constantly redirect to untrusted shopping websites, and intrusive advertising banners appear on every page. Inspection reveals three unknown browser add-ons installed. What actions should the technician take to resolve the issue?",
        "options": [
            "Remove the unauthorized browser extensions, clear browser cache and cookies, and reset the default search engine",
            "Reinstall the operating system using a clean ISO image",
            "Disable the Windows Defender Firewall private profile",
            "Change the display resolution in Windows Display Settings"
        ],
        "answer": 0,
        "explanation": "Malicious or unwanted browser extensions (adware/hijackers) frequently modify the default search provider, inject scripts into web sessions, and redirect search traffic. The proper remediation is removing all rogue extensions, clearing cached files and tracking cookies, resetting the default homepage and search engine, and running an anti-malware scan. Full OS reinstallation is excessive for simple extension hijacking, disabling the firewall weakens security, and display resolution is irrelevant.",
        "distractor_analysis": {
            "1": "Reinstalling the entire operating system is a drastic last resort when simple browser extension removal and resetting resolves the issue.",
            "2": "Disabling the Windows Defender Firewall removes critical network filtering without addressing malicious browser add-ons.",
            "3": "Changing screen resolution adjusts monitor display scaling and has zero relationship with browser redirection or extension management."
        }
    }
]

def build_shard():
    final_questions = []
    for q in questions_data:
        obj = q["objective"]
        dom = c2_utils.get_domain(obj)
        notes_ref = c2_utils.get_notes_ref(obj)
        vid_ref = c2_utils.get_video_ref(obj)
        
        item = {
            "exam": "core2",
            "domain": dom,
            "objective": obj,
            "type": "single",
            "difficulty": q.get("difficulty", "medium"),
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "explanation": q["explanation"],
            "distractor_analysis": q["distractor_analysis"],
            "video_reference": vid_ref,
            "notes_reference": notes_ref,
            "tags": q.get("tags", []),
            "id": q["id"]
        }
        final_questions.append(item)
    
    out_file = os.path.join(SHARDS_DIR, "core2_new_security.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"questions": final_questions}, f, indent=2, ensure_ascii=False)
    print(f"Built {len(final_questions)} questions in {out_file}")

if __name__ == "__main__":
    build_shard()
