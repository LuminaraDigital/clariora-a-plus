# 08. CompTIA A+ Complete Practical Labs Execution Guide

This guide synthesizes all **34 hands-on practical lab exercises** from the [`Labs for A+`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A%2B) directory into an actionable walkthrough for real-world practice and PBQ mastery.

---

## 1. Operating System & Installation Labs

### [Lab 01 & Lab 03 & Lab 10: Installing Windows 10](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2001%20Install%20OS.docx)
* **Objective**: Perform a clean installation of Windows 10 on unallocated disk space.
* **Key Steps**:
  1. Boot from USB installation media created via Windows Media Creation Tool.
  2. Select language, time format, keyboard layout.
  3. Choose **Custom: Install Windows only (advanced)**.
  4. Select unallocated space, click **New** to create partition, format partition as NTFS.
  5. Complete Out-of-Box Experience (OOBE) setup, create local admin user account.

### [Lab 02: Investigate BIOS / UEFI Settings](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2002%20-%20Investigate%20BIOS%20or%20UEFI%20Settings.docx)
* **Objective**: Navigate UEFI configuration utility to view hardware parameters and security options.
* **Key Steps**:
  1. Press `F2`, `F12`, `Del`, or `Esc` during POST.
  2. Verify CPU frequency, total installed RAM, CPU temperature, and fan speeds.
  3. Inspect **Boot Sequence / Boot Priority**: Set USB drive or NVMe SSD as primary boot device.
  4. Enable **Intel VT-x / AMD-V** virtualization extensions.
  5. Verify **TPM 2.0 State (Enabled)** and **Secure Boot (Enabled)**.

---

## 2. Hardware & Networking Labs

### [Lab 04: Build & Test a Network Cable](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2004%20-%20Build%20and%20Test%20a%20Network%20Cable.docx)
* **Objective**: Terminate UTP Ethernet cable using RJ45 connectors and T568B pinning.
* **Steps**:
  1. Strip 1 inch of outer cable jacket with cable stripper.
  2. Untwist and arrange wires in T568B order: **White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown**.
  3. Trim wires straight ($0.5$ inch exposed), insert into RJ-45 connector until copper contacts align.
  4. Crimp connector firmly with RJ45 crimping tool.
  5. Test cable continuity using hardware cable tester (verify lights 1-8 illuminate sequentially).

### [Lab 05: Configure NIC to Use DHCP in Windows](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2005%20-%20Configure%20a%20NIC%20to%20Use%20DHCP%20in%20Windows.docx)
* **Objective**: Configure Ethernet NIC for dynamic IP assignment and verify connectivity.
* **Steps**:
  1. Open Network Connections (`ncpa.cpl`).
  2. Right-click Ethernet adapter -> Properties -> Internet Protocol Version 4 (TCP/IPv4).
  3. Select **Obtain an IP address automatically** and **Obtain DNS server address automatically**.
  4. Open `cmd` and execute `ipconfig /renew`. Verify valid IP address (not APIPA `169.254.x.x`).
  5. Test connectivity with `ping 8.8.8.8` and `nslookup google.com`.

### [Lab 06: Configure a Wireless Network](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2006%20-%20Configure%20a%20Wireless%20Network.docx)
* **Objective**: Set up SOHO wireless router settings and connect client PC.
* **Steps**:
  1. Connect PC to router LAN port, open browser to `192.168.1.1` or `192.168.0.1`.
  2. Log in with admin credentials, change default admin password immediately.
  3. Change default wireless SSID name.
  4. Set Security Mode to **WPA2-Personal (AES)** or **WPA3-Personal**. Configure strong passphrase.
  5. Connect laptop wirelessly using new SSID and passphrase.

### [Lab 07: Configure Firewall Settings (DMZ & Port Forwarding)](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2007%20-%20Configure%20Firewall%20Settings.docx)
* **Objective**: Configure port forwarding and MAC filtering on SOHO router.
* **Steps**:
  1. In router GUI, navigate to Port Forwarding settings.
  2. Create rule: Forward External Port 80 to Internal Web Server IP `192.168.1.100` TCP Port 80.
  3. Navigate to Wireless MAC Filtering. Enable Whitelist mode. Add client MAC address (`00:1A:2B:3C:4D:5E`).

---

## 3. Windows System Administration & Command Line Labs

### [Lab 09: Create Partitions in Windows](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2009%20-%20Create%20a%20Partition%20in%20Windows.docx)
* **Objective**: Partition drive using `diskmgmt.msc` and command line `diskpart`.
* **Steps**:
  1. Open `diskmgmt.msc`, locate Unallocated disk space.
  2. Right-click -> **New Simple Volume** -> Set volume size -> Assign drive letter `E:`.
  3. Format volume with **NTFS** file system, allocation unit size default, volume label "DataDrive".
  4. Perform in CLI: Open `cmd` as Admin -> type `diskpart` -> `list disk` -> `select disk 1` -> `create partition primary` -> `format fs=ntfs quick` -> `assign letter=F`.

### [Lab 13: Work with Task Manager](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2013%20-%20Work%20with%20Task%20Manager.docx)
* **Objective**: Manage processes, system performance, and startup items.
* **Steps**:
  1. Press `Ctrl + Shift + Esc` to open Task Manager.
  2. View **Processes** tab; sort by CPU and Memory usage.
  3. Locate unresponsive process -> Right-click -> **End task**.
  4. View **Startup** tab; right-click unwanted startup program -> **Disable**.

### [Lab 21-24: Windows Command Shell CLI Master Lab](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2021%20-%20Work%20in%20the%20Windows%20Command%20Shell.docx)
* **Objective**: Practice essential system maintenance CLI tools.
* **Steps**:
  1. File management: `mkdir C:\TestFolder`, `dir C:\TestFolder`, `copy file.txt C:\TestFolder`.
  2. Disk health check: Run `chkdsk C: /f /r` to verify file system integrity.
  3. System File Repair: Run `sfc /scannow` to verify Windows system files.
  4. Process termination: Run `tasklist` to locate PID, then `taskkill /PID <id> /F`.

---

## 4. Security & Policy Management Labs

### [Lab 30: BitLocker and BitLocker To Go Configuration](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2030%20-%20Bitlocker%20and%20Bitlocker%20To%20Go.docx)
* **Objective**: Encrypt system drive and USB flash drive using BitLocker.
* **Steps**:
  1. Open Control Panel -> BitLocker Drive Encryption.
  2. Select system drive C: -> Click **Turn on BitLocker**.
  3. Save 48-digit recovery key to active directory or secure file.
  4. For BitLocker To Go: Insert USB drive -> Click **Turn on BitLocker** -> Set decryption password.

### [Lab 32: Configure Windows Local Security Policy](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2032%20-%20Configure%20Windows%20Local%20Security%20Policy.docx)
* **Objective**: Harden password and account lockout rules using `secpol.msc`.
* **Steps**:
  1. Open `secpol.msc` -> Navigate to **Account Policies** -> **Password Policy**.
  2. Set **Minimum password length** to 12 characters.
  3. Set **Password must meet complexity requirements** to Enabled.
  4. Navigate to **Account Lockout Policy**: Set **Account lockout threshold** to 5 invalid logon attempts.

### [Lab 33: Configure Users and Groups in Windows](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A+/Lab%2033%20-%20Configure%20Users%20and%20Groups%20in%20Windows.docx)
* **Objective**: Create local user accounts and assign security group memberships (`lusrmgr.msc`).
* **Steps**:
  1. Open `lusrmgr.msc` -> Right-click **Users** -> **New User**.
  2. Set username `TechUser`, assign strong password, check **User must change password at next logon**.
  3. Select **Groups** -> Open **Administrators** group -> Click **Add** -> Add `TechUser`.
