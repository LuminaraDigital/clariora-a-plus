# 24 · Linux Client Features & Commands (Module 17, Lessons 17.1-17.2)

**Exam objectives:** Core 2 · 1.9 Identify common features and tools of the Linux client/desktop operating system.

---

# Lesson 17.1 - Linux features

## Architecture
- **Bootloader** (GRUB) → **kernel** → init system (**systemd**) → services → **desktop environment** (GNOME, KDE, XFCE) or text login.
- **Shell** = command interpreter - **Bash** (default), **zsh**, **ksh**, sh. **Terminal** app connects you to a shell. Streams: **stdin (0), stdout (1), stderr (2)**.
- **Console switching**: **Ctrl+Alt+F1…F6** virtual consoles (Fx returns to GUI, often F7 or F1/F2 depending on distro).
- Distros: **Debian family** (Ubuntu, Mint, Kali) use **apt**; **Red Hat family** (RHEL, Fedora, CentOS/Rocky) use **dnf/yum**; Arch (pacman), SUSE (zypper).

## Command interface
- **`command -options arguments`**; short `-a` vs long `--all`; combine `-la`.
- **Case sensitive** (`File` ≠ `file`).
- **Help**: `man command`, `command --help`, `info`, `whatis`, `apropos`.
- **Pipes `|`** - output of one command → input of the next (`ps aux | grep ssh`). **Redirection** `>` overwrite, `>>` append, `<` input, `2>` errors, `2>&1`.
- **`;`** run commands in sequence; **`&&`** run next only if previous succeeded; `||` if failed; `&` background.
- **Metacharacters & escaping**: **`*`** wildcard (any chars), `?` one char, `[abc]`; **backslash `\`** escapes; **single quotes** `'…'` literal; **double quotes** `"…"` allow `$var` expansion.
- **Text editors**: **vi / vim** (modal - `i` insert, `Esc`, `:wq` save-quit, `:q!` quit without saving), **nano** (Ctrl+O save, Ctrl+X exit).

## Filesystem layout
- **No drive letters** - single tree from **root `/`**; other disks are **mounted** into directories.
- `/bin`, `/sbin` - binaries · `/etc` - config · `/home/user` - user homes · `/root` - root's home · `/var` - logs (`/var/log`), spool · `/tmp` · `/dev` - devices · `/mnt`, `/media` - mount points · `/usr` - programs · `/boot` - kernel/GRUB · `/proc`, `/sys` - kernel info.
- Hidden files start with `.`; `~` = home; `.` current, `..` parent.

## Navigation commands
| Command | Purpose |
|---|---|
| **`pwd`** | Print working directory (where am I) |
| **`cd`** | Change directory (`cd ..`, `cd ~`, `cd /etc`) |
| **`ls`** | List; `-l` long, `-a` all (hidden), `-h` human sizes, `-R` recursive |
| **`cat`** | Display file contents; `less`/`more` page; `head`/`tail` (`tail -f log`) |

## Search commands
| Command | Purpose |
|---|---|
| **`find`** | Search files by **name, owner, size, type, mtime**: `find / -name "*.conf"`, `find /home -user bob -size +10M` |
| **`grep`** | Search **strings inside files/output**: `grep error /var/log/syslog`; **`-i`** ignore case, `-r` recursive, `-n` line numbers, `-v` invert, `-E` regex |
| `locate`, `which`, `whereis` | Fast index / path of a command |

## Filesystem management
| Command | Purpose |
|---|---|
| **`mount`** | Logically attach a filesystem: `mount /dev/sdb1 /mnt/data`; `mount` alone lists; `umount` detaches |
| **`/etc/fstab`** | File listing filesystems to mount at boot - device/UUID, mount point, type, options |
| **`fsck`** | File system check & repair (unmounted FS): `fsck /dev/sdb1` |
| **`df -h`** | Disk **free** space per filesystem |
| **`du -sh dir`** | Disk **used** by a directory |
| `lsblk`, `fdisk -l`, `parted`, `mkfs.ext4` | List block devices, partition, format |
| `dd` | Raw copy / image (`dd if=... of=... bs=4M`) - careful |

## File management
| Command | Purpose |
|---|---|
| **`cp`** | Copy (`-r` recursive dirs, `-p` preserve) |
| **`mv`** | Move **or rename** |
| **`rm`** | Remove (`-r` recursive, `-f` force - **`rm -rf` is dangerous; no recycle bin**) |
| `mkdir`, `rmdir` | Make/remove dir (`mkdir -p a/b/c`) |
| `touch` | Create empty file / update timestamp |
| `ln -s` | Symbolic link |
| `tar`, `gzip`, `zip` | Archive/compress (`tar -czvf a.tar.gz dir`, `tar -xzvf`) |
| `nano`, `vim` | Edit |

## User account management
| Command / file | Purpose |
|---|---|
| **`su`** | Switch user (`su -` root; needs target's password) |
| **`sudo`** | Run one command as root/elevated; user must be in **`/etc/sudoers`** (or `sudo`/`wheel` group); `sudo -i` root shell |
| **`/etc/passwd`** | Account list (name, UID, GID, home, shell) - world-readable |
| **`/etc/shadow`** | **Hashed passwords** - root only |
| `/etc/group` | Groups |
| **`useradd` / `usermod` / `userdel`** | Create/modify/delete users (`useradd -m bob`, `usermod -aG sudo bob`) |
| **`groupadd` / `groupmod` / `groupdel`** | Groups |
| `passwd` | Set/change password; `id`, `whoami`, `who`, `w` |

## Permissions
- Every file: **owner, group, others** each with **r (4) w (2) x (1)**. `ls -l` shows e.g. `-rwxr-xr--` (owner rwx, group r-x, others r--); leading `d` = directory, `l` = link.
- **Symbolic mode**: `chmod u+x file`, `chmod g-w file`, `chmod o=r file`, `chmod a+r`.
- **Octal mode**: **read 4 + write 2 + execute 1** per triad → `chmod 755` (rwx r-x r-x), `644` (rw- r-- r--), `700`, `777` (avoid).
- **`chown user:group file`** - change ownership (`-R` recursive); `chgrp`.
- Special: SUID (4), SGID (2), sticky bit (1) - `chmod 4755`. `umask` default mask.

---

# Lesson 17.2 - Package, process, network & scheduling

## Package management
| Family | Commands |
|---|---|
| **Debian/Ubuntu - apt** (dpkg underneath) | **`sudo apt update`** (refresh repo lists) → **`sudo apt upgrade`** (upgrade installed) → **`sudo apt install pkg`** / `apt remove` / `apt autoremove` / `apt search`; `dpkg -i file.deb` |
| **Red Hat - dnf** (yum older; rpm underneath) | **`dnf check-update`**, **`dnf update` / `dnf upgrade`**, **`dnf install pkg`**, **`dnf remove pkg`**; `rpm -i file.rpm` |
| Others | `pacman`, `zypper`, `snap`, `flatpak`, `pip` |
Packages come from **repositories (repos)** defined in `/etc/apt/sources.list` or `/etc/yum.repos.d/`.

## Process monitoring
| Command | Purpose |
|---|---|
| **`ps`** | Snapshot of processes (`ps aux`, `ps -ef`); PID |
| **`top`** (`htop`) | **Real-time** process/resource view; `k` kill, `q` quit |
| `kill PID` / `kill -9 PID` / `killall name` / `pkill` | Terminate |
| `nice`/`renice` | Priority |
| **`systemd`** | Init system & service manager |
| **`systemctl`** | `systemctl start|stop|restart|status|enable|disable sshd`; `systemctl list-units --type=service` |
| `journalctl` | systemd logs (`-u sshd`, `-f`) |
| `free -h`, `uptime`, `vmstat`, `iostat`, `lscpu`, `lsusb`, `lspci`, `dmesg` | Resource / hardware info |

## Network management
| Command / file | Purpose |
|---|---|
| **`ip`** | `ip addr` (`ip a`) show addresses; `ip link`; `ip route`; `ip addr add`; replaces `ifconfig` |
| `ifconfig`, `iwconfig`, `nmcli`, `nmtui` | Legacy / NetworkManager |
| **`/etc/hosts`** | Local hostname→IP mapping - **queried before DNS** |
| **`/etc/resolv.conf`** | **DNS server** list (`nameserver 8.8.8.8`) - often managed by systemd-resolved/NetworkManager |
| `/etc/hostname`, `hostname`, `hostnamectl` | Hostname |
| **`ping`** | Connectivity (runs continuously - Ctrl+C; `-c 4`) |
| **`dig`** | DNS query (`dig example.com MX`); also `nslookup`, `host` |
| **`curl`** | Transfer data to/from URL (`curl -O url`, test APIs); `wget` download |
| **`traceroute`** | Path trace (`tracepath`, `mtr`) |
| `netstat -tulpn` / **`ss -tulpn`** | Listening ports/sockets |
| `ssh user@host`, `scp`, `sftp`, `rsync` | Remote access/copy |
| `ufw` / `iptables` / `firewalld` | Firewall |

## Backup & scheduling
- **`cron`** - task scheduler daemon; **`crontab -e`** edit your jobs, `crontab -l` list, `-r` remove; system `/etc/crontab`, `/etc/cron.d`, `cron.daily`.
- **Syntax (5 fields + command)**: **`mm hh dd MM weekday command`** - minute (0-59) hour (0-23) day-of-month (1-31) month (1-12) day-of-week (0-7, 0/7=Sun).
 - `0 2 * * * /backup.sh` = 02:00 daily. `*/15 * * * *` every 15 min. `30 6 * * 1-5` 06:30 weekdays.
- Backup tools: `tar`, `rsync -av src dst`, `dd`, `cp -a`; snapshots (LVM/btrfs); Timeshift, Déjà Dup.
- Also `at` (one-off), `systemd` timers.

## Common Linux troubleshooting
Permission denied → `ls -l`, `sudo`, `chmod/chown`. Command not found → not installed / not in `$PATH`. Disk full → `df -h`, `du -sh /* | sort -h`. Service down → `systemctl status`, `journalctl -u`. No network → `ip a`, `ping gateway`, `/etc/resolv.conf`, `dig`.

## Self-test
1. Shell vs terminal; three shells; the three standard streams.
2. `pwd`, `ls -la`, `cat`, `find` vs `grep -i`.
3. What is `/etc/fstab`? What does `mount` do? `fsck`?
4. `df` vs `du`. `cp -r`, `mv` (two uses), `rm -rf` danger.
5. `su` vs `sudo`; which file must a sudo user be in; where are password hashes?
6. `chmod 755` / `644` meaning; symbolic `u+x`; `chown user:group`.
7. apt three-command sequence; dnf equivalents; what's a repo?
8. `ps` vs `top`; systemctl start/enable difference; `journalctl`.
9. `ip addr`; `/etc/hosts` vs `/etc/resolv.conf`; `dig`, `curl`, `traceroute`.
10. Crontab field order; write "every day at 3:30 am".
