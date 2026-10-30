# 06. Core 2: Security & SOHO Router Hardening (220-1202)

This module covers threat vectors, social engineering, wireless security, BitLocker, permissions, and Local Security Policy based on Modules 15, 18, and 19 of the curriculum.

---

## 1. Security Threats & Social Engineering

### Malware Classifications
* **Ransomware**: Encrypts user files and demands payment (crypto/cash) for decryption key.
* **Trojan**: Malicious program disguised as legitimate software.
* **Rootkit**: Modifies OS kernel to gain deep administrative control while hiding from antivirus tools.
* **Keylogger**: Captures keystrokes to steal passwords and sensitive credentials.
* **Worm**: Self-replicating malware that spreads across network vulnerabilities without human interaction.
* **Spyware**: Secretly monitors user activity and collects personal data.

### Social Engineering Attacks
* **Phishing**: Mass deceptive emails soliciting passwords or personal information.
* **Spear Phishing**: Targeted phishing campaign against a specific individual or enterprise role.
* **Whaling**: Phishing targeted specifically at high-profile corporate executives (CEOs/CFOs).
* **Vishing / Smishing**: Voice call phishing / SMS text message phishing.
* **Tailgating / Piggybacking**: Following an authorized person through a secure door without scanning a badge.
* **Shoulder Surfing**: Looking over someone's shoulder to view passwords or sensitive data on screen.

---

## 2. SOHO Router Security & Hardening

1. **Change Default Admin Passwords**: Change default router credentials (`admin`/`admin`).
2. **Wi-Fi Encryption**: Use **WPA3-Personal (SAE)** or **WPA2-Enterprise (802.1X/RADIUS)**. Avoid deprecated WEP and WPA.
3. **SSID Configuration**: Change default network name (SSID). Disabling SSID broadcast adds security-by-obscurity.
4. **MAC Address Filtering**: Permit only whitelisted MAC addresses to connect to wireless network.
5. **Disable UPnP (Universal Plug and Play)**: UPnP allows applications to automatically open router ports without authentication, creating severe security vulnerabilities.
6. **DMZ (Demilitarized Zone)**: Places a designated single host outside the internal firewall to accept all incoming internet traffic (used for public web/game servers).
7. **Port Forwarding**: Redirects specific incoming external port traffic (e.g., Port 80) to an internal static IP host.

---

## 3. Windows Security Implementation

### Local Security Policy (`secpol.msc`)
* **Account Lockout Policy**: Set **Account Lockout Threshold** (e.g., lock account after 5 failed attempts) to prevent brute-force attacks.
* **Password Policy**: Enforce Minimum Password Length (12+ chars), Password Complexity (uppercase, lowercase, numbers, symbols), and Enforce Password History.

### Disk & File Encryption
* **BitLocker**: Whole-disk encryption for system drives. Requires **TPM 2.0** chip or USB startup key.
* **BitLocker To Go**: Encrypts removable flash drives and external HDDs with password protection.
* **EFS (Encrypting File System)**: File and folder-level encryption built into NTFS.

### NTFS vs. Share Permissions Rule
* **NTFS Permissions**: Local and network file access controls. Explicit Deny overrides Explicit Allow.
* **Share Permissions**: Network-only access controls (Full Control, Change, Read).
* **Effective Permissions Rule**: When accessing a file over the network, **Effective Permission = Most Restrictive combination of Share vs. NTFS permissions**.
