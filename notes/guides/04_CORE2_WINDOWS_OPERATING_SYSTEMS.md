# 04. Core 2: Windows Operating Systems (220-1202)

This module covers Windows 10/11 editions, installation methods, administration tools, file systems, and system recovery based on Modules 12, 13, 14, and 16 of the curriculum.

---

## 1. Windows Editions & Feature Matrix

| Feature | Windows 10/11 Home | Windows 10/11 Pro | Windows 10/11 Enterprise |
| :--- | :---: | :---: | :---: |
| **Max Physical RAM (64-bit)** | 128 GB | 2 TB | 6 TB |
| **Active Directory Domain Join** | No | Yes | Yes |
| **Group Policy Management (`gpedit.msc`)** | No | Yes | Yes |
| **BitLocker Drive Encryption** | No | Yes | Yes |
| **Remote Desktop Host (RDP Server)** | No | Yes | Yes |
| **Hyper-V Client** | No | Yes | Yes |

---

## 2. Windows Administrative & Diagnostic Tools

* **Task Manager (`taskmgr.exe`)**: Monitor CPU/RAM/Disk utilization, end unresponsive tasks, manage Startup apps, view running Services.
* **Event Viewer (`eventvwr.msc`)**: System, Security, Application logs. Error levels: Information, Warning, Error, Critical.
* **Device Manager (`devmgmt.msc`)**: View hardware devices, update/rollback drivers, disable hardware, inspect driver error codes (e.g., Code 10, Code 43).
* **Disk Management (`diskmgmt.msc`)**: Initialize new disks, partition drives, format file systems, assign drive letters, shrink/extend volumes, manage dynamic disks.
* **Services MMC (`services.msc`)**: Configure background service startup types: Automatic, Automatic (Delayed Start), Manual, Disabled.
* **System Information (`msinfo32.exe`)**: Detailed summary of OS version, BIOS/UEFI version, hardware resources, memory addresses.
* **System Configuration (`msconfig.exe`)**: Safe boot options, boot configuration, diagnostic startup.

---

## 3. Storage & File Systems

* **FAT32**: Max file size = 4 GB. Max volume size = 32 GB (in Windows GUI). No native file-level security permissions.
* **NTFS (New Technology File System)**: Supports file-level security (NTFS permissions), file compression, EFS encryption, disk quotas, volume shadow copies. Max file size = 16 TB+.
* **exFAT**: Extended FAT designed for flash drives. Supports files >4 GB without NTFS security overhead. Compatible with Windows and macOS.
* **Partitioning Schemes**:
  * **MBR (Master Boot Record)**: Legacy scheme. Max 4 primary partitions. Max disk size 2 TB.
  * **GPT (GUID Partition Table)**: Modern UEFI scheme. Supports up to 128 primary partitions. Supports volumes >2 TB.

---

## 4. System Recovery & Boot Repairs

If Windows fails to boot, access **WinRE (Windows Recovery Environment)**:
* **Startup Repair**: Automated fix for corrupted system boot files.
* **System Restore (`rstrui.exe`)**: Reverts system registry and system files to a previously saved Restore Point without affecting personal files.
* **Command Prompt Boot Repairs**:
  * `bootrec /fixmbr` - Writes a new master boot record to system partition.
  * `bootrec /fixboot` - Writes a new boot sector to system partition.
  * `bootrec /rebuildbcd` - Scans all disks for Windows installations and rebuilds BCD boot database.
