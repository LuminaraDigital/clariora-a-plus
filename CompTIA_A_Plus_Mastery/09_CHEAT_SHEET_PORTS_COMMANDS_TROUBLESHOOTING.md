# 09. Clariora Quick-Recall Cheat Sheet

Use this sheet for rapid last-minute revision before taking the **220-1201 (Core 1)** and **220-1202 (Core 2)** exams.

---

## 1. Network Ports & Protocols Quick Table

| Port | Protocol | Purpose / Key Detail |
| :---: | :--- | :--- |
| **20/21** | FTP | Transfers files (20 Data, 21 Control). |
| **22** | SSH / SFTP | Encrypted remote CLI session. |
| **23** | Telnet | Unencrypted cleartext remote CLI session. |
| **25** | SMTP | Sends email between mail servers. |
| **53** | DNS | Resolves hostnames to IP addresses. |
| **67/68**| DHCP | Automatically assigns IP configuration. |
| **80** | HTTP | Unencrypted web traffic. |
| **110** | POP3 | Downloads email locally (deletes from server). |
| **123** | NTP | Synchronizes system clocks. |
| **143** | IMAP | Syncs email across multiple devices. |
| **161/162**| SNMP | Monitors network devices (161 Poll, 162 Trap). |
| **389** | LDAP | Directory lookup in Active Directory. |
| **443** | HTTPS | Encrypted web traffic (SSL/TLS). |
| **445** | SMB | Windows file and printer sharing. |
| **636** | LDAPS | Encrypted LDAP via SSL/TLS. |
| **3389** | RDP | Windows Remote Desktop graphical access. |

---

## 2. Command Line Quick Reference (Windows vs. Linux)

| Task | Windows CLI (`cmd`) | Linux Terminal |
| :--- | :--- | :--- |
| **List Directory Contents** | `dir` | `ls -la` |
| **Print Current Path** | `cd` | `pwd` |
| **Copy File** | `copy` / `xcopy` / `robocopy` | `cp` |
| **Move / Rename File** | `move` / `ren` | `mv` |
| **Delete File** | `del` | `rm` |
| **Display Active Processes**| `tasklist` | `ps aux` / `top` |
| **Kill Process** | `taskkill /PID <id> /F` | `kill -9 <pid>` |
| **Check Network IP Config** | `ipconfig /all` | `ip addr` / `ifconfig` |
| **Test Network Reachability**| `ping <ip>` | `ping <ip>` |
| **Trace Hop Route** | `tracert <ip>` | `traceroute <ip>` |
| **Check Disk Integrity** | `chkdsk C: /f /r` | `fsck` |
| **Repair OS System Files** | `sfc /scannow` | N/A |

---

## 3. Hardware Symptom & Resolution Matrix

| Symptom | Primary Suspect | Instant Fix |
| :--- | :--- | :--- |
| **No Power / Blank Screen** | Wall outlet, PSU switch, 24-pin ATX cable. | Check outlet voltage switch (115V/230V), test PSU with multimeter. |
| **Continuous POST Beeping** | Unseated RAM / RAM failure. | Reseat RAM in DIMM slots 2 & 4; test individual sticks. |
| **System Shuts Down After 5 Min** | CPU Overheating / Fan failure. | Check CPU fan, clear dust, reapply thermal paste to heatsink. |
| **Loud Mechanical Clicking** | Failing HDD read/write head. | Backup data immediately; replace drive with NVMe/SATA SSD. |
| **Garbage / Artifacts on Screen**| GPU overheating or corrupted display driver. | Reseat graphics card, replace HDMI/DP cable, reinstall GPU driver. |
| **Distended Capacitors** | Aged or damaged motherboard. | Replace motherboard. |
| **IP Address `169.254.x.x`** | Failed DHCP server contact (APIPA). | Check Ethernet cable connection, run `ipconfig /renew`, check DHCP service. |

---

## 4. Laser Printing 7-Step Sequence

```
1. Processing   ➜  Engine generates page image in memory.
2. Charging     ➜  Primary corona roller places uniform -600V charge on drum.
3. Exposing     ➜  Laser writes image onto drum, discharging exposed areas to -100V.
4. Developing   ➜  Toner roller applies -600V toner; toner sticks to -100V drum areas.
5. Transferring ➜  Transfer roller places positive charge on paper, pulling toner.
6. Fusing       ➜  Heat & pressure rollers fuse toner permanently into paper.
7. Cleaning     ➜  Blade scrapes leftover toner off drum into waste cavity.
```

---

## 5. CompTIA Troubleshooting 6-Step Order

1. **Identify the problem** (Ask user questions, perform backup before changes).
2. **Establish a theory of probable cause** (Question the obvious).
3. **Test the theory to determine cause**.
4. **Establish a plan of action and implement the solution** (Escalate if needed).
5. **Verify full system functionality** (Implement preventive measures).
6. **Document findings, actions, and outcomes** (Update ticket & KB).
