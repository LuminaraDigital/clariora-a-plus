# 34 · Master Recall Tables - everything that must be memorised, one page

Print this. Cover columns. Drill daily. Ports every day without exception.

---

## 1. Ports
| Port | Service | | Port | Service |
|---|---|---|---|---|
| 20/21 | FTP | | 389 | LDAP |
| 22 | SSH / SFTP / SCP | | 443 | HTTPS |
| 23 | Telnet | | 445 | SMB |
| 25 | SMTP | | 465 / 587 | SMTPS / submission |
| 49 | TACACS+ (TCP) | | 514 | Syslog |
| 53 | DNS | | 636 | LDAPS |
| 67/68 | DHCP (srv/cli) | | 993 | IMAPS |
| 69 | TFTP | | 995 | POP3S |
| 80 | HTTP | | 1433 | MS SQL |
| 88 | Kerberos | | 1812/1813 | RADIUS auth/acct (UDP) |
| 110 | POP3 | | 3389 | RDP |
| 123 | NTP | | 4460 | NTS |
| 137-139 | NetBIOS | | 5900 | VNC |
| 143 | IMAP | | 8080 | HTTP-alt / proxy |
| 161/162 | SNMP / trap | | 49152-65535 | Ephemeral |

TCP: connection, handshake SYN→SYN/ACK→ACK, reliable - HTTP(S), SSH, FTP, SMTP, RDP. UDP: connectionless - DHCP, DNS, TFTP, SNMP, NTP, VoIP.

## 2. Private / special IPv4
| Range | Meaning |
|---|---|
| 10.0.0.0/8 | Private A |
| 172.16.0.0/12 (172.16-172.31) | Private B |
| 192.168.0.0/16 | Private C |
| 169.254.0.0/16 | APIPA (no DHCP) |
| 127.0.0.1 | Loopback |
| Class A 0-127 /8 · B 128-191 /16 · C 192-223 /24 · D 224-239 multicast | |
| IPv6: `::1` loopback · `fe80::/10` link-local · `fc00::/7` unique local · 128-bit, 8 hex groups | |

## 3. RAID
| Level | Method | Min | Survives |
|---|---|---|---|
| 0 | Stripe | 2 | 0 |
| 1 | Mirror | 2 | 1 |
| 5 | Stripe + 1 parity | 3 | 1 |
| 6 | Stripe + 2 parity | 4 | 2 |
| 10 | Stripe of mirrors (even #) | 4 | 1 per pair |

## 4. Cable categories
| Cat | Speed | Distance |
|---|---|---|
| 5 | 100 Mbps | 100 m |
| 5e | 1 Gbps | 100 m |
| 6 | 1 G / 10 G | 100 m / 55 m |
| 6A | 10 Gbps | 100 m |
| 7 | 10 Gbps | 100 m |
| 8 | 25/40 Gbps | 30 m |
T568B: W-Or Or W-Gr Bl W-Bl Gr W-Br Br. T568A swaps orange↔green pairs. UTP max 100 m. Plenum for air spaces. RJ-45 Ethernet, RJ-11 phone, F-type coax (RG-6), ST/SC/LC fibre. SMF long/laser 9 µm; MMF short/LED 50-62.5 µm.

## 5. Wi-Fi
| 802.11 | Wi-Fi | Band | Max |
|---|---|---|---|
| a | - | 5 | 54 Mbps |
| b | - | 2.4 | 11 Mbps |
| g | - | 2.4 | 54 Mbps |
| n | 4 | 2.4/5 | 600 Mbps (MIMO) |
| ac | 5 | 5 only | ~2.1-6.9 Gbps (MU-MIMO) |
| ax | 6/6E | 2.4/5/6 | 4.8-9.6 Gbps (OFDMA) |
| be | 7 | 2.4/5/6 | 46 Gbps |
2.4 GHz non-overlapping channels 1/6/11. Security: WEP → WPA (TKIP/RC4) → WPA2 (AES-CCMP) → WPA3 (SAE, GCMP, PFS). Enterprise = 802.1X/EAP + RADIUS(1812)/TACACS+(49). Kerberos 88.

## 6. PoE
802.3af PoE 15.4 W · 802.3at PoE+ 30 W · 802.3bt PoE++ 60/90 W.

## 7. USB / Thunderbolt / SATA
| Interface | Speed |
|---|---|
| USB 1.1 | 12 Mbps |
| USB 2.0 | 480 Mbps |
| USB 3.0 / 3.2 Gen 1 | 5 Gbps |
| USB 3.1 / 3.2 Gen 2 | 10 Gbps |
| USB 3.2 Gen 2×2 | 20 Gbps |
| USB4 / TB3 / TB4 | 40 Gbps |
| TB1/TB2 (Mini-DP) | 10/20 Gbps |
| SATA 1/2/3 | 1.5/3/6 Gbps (150/300/600 MB/s) |
| eSATA cable | 2 m; USB 3 m/5 m |
PSU wires: black GND · red +5 · yellow +12 · orange +3.3 · purple +5VSB. Molex R/Y/B/B. Main ATX 24-pin, CPU 4/8-pin EPS, PCIe 6/8-pin, SATA 15-pin. 80 PLUS: Bronze<Silver<Gold<Platinum<Titanium.

## 8. DDR
| Gen | MT/s | GB/s | Max/module | Pins DIMM/SODIMM |
|---|---|---|---|---|
| DDR3 | 800-2133 | 6.4-17.1 | 16 GB | 240/204 |
| DDR4 | 1600-3200 | 12.8-25.6 | 32 GB | 288/260 |
| DDR5 | 4800-8000+ | 38.4-51.2+ | 128 GB+ | 288/262 |
Keyed differently. ECC needs board+CPU; don't mix.

## 9. CPU sockets
PGA pins on CPU - AMD AM4/TR4/SP3. LGA pins on socket - Intel LGA1200/1700 (AMD AM5 also LGA). BGA soldered. VT-x/AMD-V enable in firmware for VMs. Fetch-Decode-Execute-Write-back.

## 10. Motherboards
ATX 12×9.6" (7 slots) · mATX 9.6×9.6" (4) · Mini-ITX 6.7×6.7" (1). PCIe x1/x4/x8/x16 backward compatible; PCI not. M.2 B/M key; 2280.

## 11. Optical
CD 700 MB · DVD 4.7 / 8.5 / 17 GB · Blu-ray 25 GB/layer.

## 12. Laser process
Processing → Charging → Exposing → Developing → Transferring → Fusing → Cleaning.
Faded=toner · black stripes=charge roller/HV PSU · lines=rollers · smudge=fuser · missing colour=cartridge · garbled=PDL. No compressed air. Thermal=receipts. Impact=multipart/tractor.

## 13. Troubleshooting methodology
Identify → Theory (question the obvious) → Test → Plan & implement → Verify (+prevent) → Document. Back up first. Escalate: skill / knowledge / scope.

## 14. Malware removal
Verify symptoms → Quarantine → Disable System Restore → Remediate (update AV, scan in safe mode/WinRE) → Schedule scans & updates → Enable System Restore + create point → Educate user.

## 15. Change management
Request (purpose, scope, type, timeline, effect) → Risk analysis → CAB approval → Plan + rollback → Implement → User acceptance → Document.

## 16. DORA
Discover (bcast) → Offer → Request (bcast) → Acknowledge. UDP 67/68. Fail → 169.254.

## 17. DNS records
A v4 · AAAA v6 · CNAME alias · MX mail · NS · SOA · PTR reverse · TXT (SPF/DKIM/DMARC) · SRV service.

## 18. Backup types
| Type | Since | Restore | Archive bit |
|---|---|---|---|
| Full | all | 1 job | cleared |
| Incremental | last *any* | full + all incs | cleared |
| Differential | last *full* | full + last diff | **not cleared** |
3-2-1: 3 copies, 2 media, 1 offsite. GFS rotation. Test restores. Degauss ≠ SSD.

## 19. Boot chains
BIOS: POST → MBR → BOOTMGR → BCD → WINLOAD.EXE → Kernel → HAL.DLL → drivers.
UEFI: POST → GPT/ESP → BOOTMGFW.EFI + BCD → WINLOAD.EFI → Kernel → HAL → drivers.
MBR 4 primaries/2 TB · GPT 128/>2 TB. bootrec /fixmbr /fixboot /scanos /rebuildbcd.

## 20. Windows editions
| | Home | Pro | Ent/Edu |
|---|---|---|---|
| Domain/GPO/BitLocker/EFS/RDP host | ✗ | ✓ | ✓ |
| RAM | 128 GB | 2 TB | 6 TB |
| Cores | 64 | 128 | 256 |
| Licence | OEM/retail | +volume | volume only |
Win11: 64-bit only, TPM 2.0, UEFI+Secure Boot. Win10 EOL Oct 2025.

## 21. Consoles by filename
compmgmt · devmgmt · diskmgmt · eventvwr · secpol · gpedit · lusrmgr · services · taskschd · perfmon · certmgr(user)/certlm(machine) · printmanagement · wf.msc | resmon · msinfo32 · msconfig · regedit · cleanmgr · dfrgui · mstsc · msra · rstrui · mdsched · dxdiag · taskmgr | ncpa.cpl · appwiz.cpl · sysdm.cpl · powercfg.cpl · inetcpl.cpl · firewall.cpl

## 22. Windows CLI
ipconfig (/all /release /renew /flushdns /displaydns) · ping · tracert · pathping · nslookup (-type=) · netstat (-a -b -n -o -e -s) · arp -a · hostname · sfc /scannow · DISM /Online /Cleanup-Image /RestoreHealth · chkdsk (/f /r) · diskpart · format · convert · shutdown (/s /r /h /l /t /a) · tasklist · taskkill (/pid /im /f /t) · schtasks · gpupdate /force · gpresult /r · net user · net localgroup · net use · net share · winver · whoami · robocopy (/e /mir) · xcopy (/s /e) · md · rd /s · dir (/o /a /t) · cd · copy · move · ren · del · type · attrib · bcdedit · bootrec · manage-bde

## 23. Linux
pwd cd ls cat · find grep -i · cp mv rm -rf · mkdir · df du · mount /etc/fstab fsck · chmod (rwx = 4/2/1; 755/644) chown · su sudo /etc/sudoers /etc/passwd /etc/shadow · useradd/usermod/userdel groupadd · apt update/upgrade/install · dnf check-update/update/install/remove · ps top kill · systemctl start/stop/enable/status · journalctl · ip addr · /etc/hosts (before DNS) /etc/resolv.conf · ping dig curl traceroute · crontab (min hr dom mon dow cmd) · vi/nano · Ctrl+Alt+Fx · | ; && > >>

## 24. macOS
Cmd+Space Spotlight · F3 Mission Control · Cmd+Opt+Esc Force Quit · Cmd=Ctrl, Option=Alt · Finder · Dock · Keychain · FileVault · Gatekeeper · Time Machine (APFS, deletes oldest) · Disk Utility First Aid · .dmg image / .pkg installer / drag to Trash · App Store + Software Update + Rapid Security Response · AirDrop Everyone/Contacts/Off · Cmd+R Recovery (Intel) · /Applications /Library /System /Users ~/Library

## 25. Security vocab
Vulnerability→weakness · Threat→potential · Risk→likelihood×impact. CIA. IAAA. Least privilege, implicit deny, zero trust. Symmetric 1 key / asymmetric pair / hash one-way / signature = hash+private key. MFA: know/have/are/do/where. Phishing→spear→whaling; vishing/smishing/quishing; evil twin; tailgating vs piggybacking; on-path; footprinting; spoofing; XSS; SQLi (parameterised queries). Virus/worm/Trojan/fileless; rootkit/ransomware/cryptominer/keylogger/spyware/adware/backdoor. EDR/MDR/XDR. BYOD/COBO/COPE/CYOD. Root (Android)/jailbreak (iOS). NTFS+share → most restrictive; deny wins; local = NTFS only. Type1 err = false reject, Type2 = false accept.

## 26. Ops vocab
SOP · SLA · AUP · KB · CMDB · CAB · MSDS/SDS · EULA · NDA · DRM · PII/PHI/PCI-DSS/GDPR/HIPAA · chain of custody · order of volatility · five nines = 5.26 min · tiers 0-3 · request/incident/problem · critical/major/minor · UPS short / generator long · CO₂/powder never water · lift with legs · humidity 30-50% · .sh .ps1 .bat .vbs .py .js · -eq -ne -lt -gt -le -ge

## 27. Cloud
Type 1 bare metal (Hyper-V, ESXi) / Type 2 hosted (VirtualBox, Parallels). IaaS/PaaS/SaaS/DaaS. Public/private/hosted private/community/hybrid. HA · scalability · elasticity · pooling · metered. CDN.
