# 05. Core 2: Other OS & Command Line Master Reference (220-1202)

This module covers Windows CLI (`cmd`), PowerShell, Linux terminal commands, and macOS utilities based on Modules 14, 17, and Labs 21-24 of the curriculum.

---

## 1. Essential Windows Command Line Reference (`cmd`)

### Network Diagnostics
* `ipconfig /all` - Displays detailed IP address, subnet mask, default gateway, MAC address, and DNS server info.
* `ipconfig /release` & `ipconfig /renew` - Drops and requests new DHCP IP lease.
* `ipconfig /flushdns` - Clears DNS resolver cache.
* `ping <ip/host> -t` - Sends continuous ICMP Echo Requests to test connectivity.
* `tracert <ip/host>` - Traces network hop route to destination server.
* `nslookup <domain>` - Queries DNS server to resolve hostname to IP address.
* `netstat -an` - Displays all active TCP/UDP socket connections and listening ports.

### File System & Maintenance Commands
* `dir` - Lists contents of current directory.
* `cd <path>` - Changes current directory.
* `copy <source> <dest>` - Copies single file.
* `xcopy <source> <dest> /s /e` - Copies files and directory trees.
* `robocopy <source> <dest> /mir` - Robust File Copy tool; mirrors directory structure.
* `chkdsk C: /f /r` - Fixes file system errors (/f) and locates bad sectors to recover readable info (/r).
* `sfc /scannow` - System File Checker; scans and repairs corrupted Windows system files.
* `diskpart` - Opens CLI disk partitioning utility.
* `tasklist` - Displays all running processes with Process IDs (PIDs).
* `taskkill /PID <id> /F` - Forcefully terminates process by PID.
* `gpupdate /force` - Forcefully refreshes local & Active Directory Group Policies.
* `gpresult /r` - Displays applied Group Policy Objects (GPOs) for user and computer.

---

## 2. Linux Operating System & Terminal Commands

### Linux File System Structure
* `/` - Root directory.
* `/home` - User home directories.
* `/etc` - System configuration files.
* `/var` - Variable log files (`/var/log`).
* `/bin` & `/usr/bin` - Essential user command binaries.

### Master Linux Command Table
| Command | Description / Usage Example |
| :--- | :--- |
| `pwd` | Print Working Directory. Shows absolute path of current folder. |
| `ls -la` | List all files in long format including hidden files (`.filename`). |
| `cd /path` | Change directory. `cd ..` moves up one folder. |
| `cp file.txt /dest` | Copy file to destination directory. |
| `mv file.txt /dest` | Move or rename file. |
| `rm -rf dir` | Forcefully and recursively remove files/directories. |
| `chmod 755 script.sh`| Change file permissions (7=rwx owner, 5=r-x group, 5=r-x others). |
| `chown user:group file`| Change file owner and group ownership. |
| `sudo <command>` | Execute command with superuser / root privileges. |
| `grep "error" log.txt`| Search for matching text pattern inside a file. |
| `ps aux` | Display all active system processes. |
| `top` / `htop` | Interactive real-time process manager & resource monitor. |
| `df -h` | Display disk space usage in human-readable format. |
| `apt-get install <pkg>`| Debian/Ubuntu package manager installation tool. |

---

## 3. macOS Features & System Tools

* **Time Machine**: Automated built-in backup utility for macOS.
* **Keychain Access**: Encrypted password and certificate manager.
* **Spotlight (`Cmd + Space`)**: System-wide search utility for files, apps, and settings.
* **Finder**: File manager GUI in macOS.
* **Disk Utility**: Format, partition, and repair APFS/HFS+ disk volumes.
