# 36 · Datacentre Capstone Track - `Checklist-project.docx` decoded

The capstone checklist is a **Windows Server / infrastructure build**, not an A+ task. A+ gives you the vocabulary and the physical/network fundamentals; the rest needs Server-admin skills. This file maps every checklist item to (a) what A+ already taught you, (b) what you must learn separately, (c) the build order that actually works.

## The checklist (as written, de-duplicated numbering)
1. Plan & design → **two documents**: technical documentation (specs) + customer proposal - for approval
2. Identify servers/equipment, **install into rack**
3. Cable **out-of-band management (iLO / iDRAC)**, tested
4. Cable **NAS and switches**, tested
5. Configure network - **VLANs, trunks, link aggregation** - tested
6. Install **Windows Server on bare metal** - Servers 1 & 2
7. Configure **Hyper-V** - Servers 3 & 4
8. Create a **Windows domain** on Server 1
9. Promote Server 2 to **additional domain controller**
10. Join Servers 3 & 4 (Hyper-V) as **member servers**
11. Connect all four to **Windows Admin Center**
12. Create **LUNs on the NAS**, connect to Servers 1 & 2 via **iSCSI**
13. **Failover storage cluster** between Servers 1 & 2
14. **DHCP cluster/failover** between Servers 1 & 2
15. Create **2 × Windows workstation VMs** on each Hyper-V host
16. **Join workstation VMs to the domain**
17. **Policies to deploy client software** (GPO) - tested
18. **Live migration** of VMs across Hyper-V hosts
19. All VMs reachable via **RDP by FQDN**
20. **Disaster recovery** solution - tested
21. **Email notifications, logging, alerts**
22. Test **redundancy**: DC/DNS failover, DHCP failover, storage cluster failover
23. **Baselines** of all 4 servers (CPU, RAM, network, disk I/O)
24. **Handover** - instructor connects in as the client

## What A+ already gives you (per item)
| Item | A+ file |
|---|---|
| Racking, cabling, ESD, lifting, PSU/PDU, cable management | 04, 05, 09, 32 |
| RAID choice for server local disks and NAS | 06 |
| IP addressing plan, subnetting, DHCP scopes/reservations, DNS records | 11, 13 |
| Switch concepts (managed, VLAN, trunk, PoE), cable categories, patch panels | 09 |
| Hyper-V as Type 1, VM resource requirements, virtual switches | 14 |
| Windows Server vs client, editions, install methods, GPT/UEFI | 17, 23 |
| Domain vs workgroup, DC vs member server, OUs, GPO, `gpupdate` | 22 |
| RDP (3389) and why **DNS must resolve the FQDN** | 21, 13 |
| Performance Monitor counters for baselines | 21 |
| Backup types, 3-2-1, DR concepts, RTO/RPO | 31 |
| Change management & documentation (your two reports) | 17, 32 |
| Physical security of the rack, UPS | 28, 32 |

## What you must learn separately (Server-admin track)
| Topic | Learn |
|---|---|
| **iLO (HPE) / iDRAC (Dell)** | Dedicated management NIC; separate mgmt VLAN; default creds → change; remote console, virtual media (mount ISO to install OS remotely), power control, hardware health |
| **Switch config** | VLAN creation, access vs **trunk (802.1Q)** ports, native VLAN, **link aggregation (LACP / port-channel)** for NAS & Hyper-V hosts, spanning tree, management IP |
| **Windows Server install** | Server 2022/2025 Standard/Datacenter, Desktop Experience vs Core, static IPs, rename, updates, Server Manager |
| **Hyper-V role** | Install role, **external virtual switch** on a team/LAG, VM generation 2, VHDX, dynamic memory, checkpoints, **Hyper-V Replica** (DR), **live migration** (needs domain + Kerberos/CredSSP delegation + shared or SMB storage or shared-nothing) |
| **Active Directory DS** | `Install-WindowsFeature AD-Domain-Services`, promote to **new forest** (Server 1), **DNS role installed with it**, then **additional DC** (Server 2) replicating; **AD sites**, FSMO roles, `dcdiag`, `repadmin`; point all clients' DNS at both DCs |
| **DNS** | AD-integrated zones, forwarders, reverse zones, A/PTR/CNAME for every server; FQDN resolution is what makes item 19 work |
| **DHCP** | Role on both DCs, scope, options 003/006/015, **DHCP failover** (hot-standby or load-balance) - item 14 |
| **iSCSI** | NAS: create **LUN/target**, CHAP; Windows: **iSCSI Initiator** → discover portal → connect → MPIO; bring disk online in Disk Management |
| **Failover Clustering** | Feature on Servers 1 & 2, `Test-Cluster` validation, create cluster (name, IP), **witness (disk/file share/cloud)**, add iSCSI disks → **Cluster Shared Volumes** or a **File Server role** / Scale-Out File Server; test node failover - item 13/22 |
| **Windows Admin Center** | Install gateway (on a mgmt VM or Server 1), add all four servers, manage remotely (WinRM 5985/5986) |
| **Domain-join VMs** | `sysdm.cpl` / `Add-Computer`; place in OUs |
| **GPO software deployment** | Share an MSI on a UNC path (read for Domain Computers) → GPO → Computer Config → Software Settings → new package → assign → link to OU → `gpupdate /force` + reboot |
| **Disaster recovery** | Windows Server Backup / Hyper-V Replica to the other host / Azure Site Recovery; document RTO/RPO; **test a restore** |
| **Monitoring & alerts** | Event Viewer subscriptions/forwarding, Task Scheduler on event → send mail (`Send-MailMessage`/SMTP relay), Performance Monitor alerts, WAC alerts, or a tool (PRTG/Zabbix/Nagios); NAS/iDRAC email alerts |
| **Baselines** | PerfMon Data Collector Set: `\Processor(_Total)\% Processor Time`, `\Memory\Available MBytes`, `\Network Interface\Bytes Total/sec`, `\PhysicalDisk\Avg. Disk Queue Length`, `Disk Reads/sec` `Writes/sec`; run 24 h under normal load; save reports |
| **Documentation** | Technical spec: rack elevation, cabling diagram, IP/VLAN plan, hostnames, roles, storage layout, credentials vault reference, procedures. Customer proposal: requirements, design, BOM, cost, timeline, SLA, risks, acceptance criteria |

## Suggested design (fill in your own numbers)
- **VLANs**: 10 Management (iLO/iDRAC/switch/WAC), 20 Servers, 30 Storage/iSCSI (jumbo frames, no gateway), 40 Live-Migration/Cluster heartbeat, 50 Workstations, 60 Guest.
- **Addressing**: one /24 per VLAN; DCs `.10/.11`; gateway `.1`; DHCP scope `.100-.200` on VLAN 50.
- **Naming**: `DC01`, `DC02`, `HV01`, `HV02`, `NAS01`, `WS01-04`, domain `lab.local` (or a real subdomain).
- **Storage**: NAS RAID 5/6 or 10 → iSCSI LUNs (quorum ~1 GB, data ≥ 100 GB) → cluster.
- **Hyper-V hosts**: NIC team → external vSwitch; second NIC for iSCSI/live-migration where possible.

## Build order (dependencies enforced)
1. **Documents drafted** (spec + proposal) - keep a running build log from day one.
2. Rack, power, label everything; cable iLO/iDRAC on the mgmt VLAN; verify remote console works.
3. Switch: VLANs, trunks to hosts/NAS, LAG; verify with pings across VLANs (router/L3 for inter-VLAN).
4. Server 1 & 2: Windows Server bare metal (via iDRAC virtual media), static IPs, updates.
5. **Server 1**: AD DS + DNS → new forest → reboot. Point Server 2 DNS at Server 1 → **promote Server 2 as additional DC** (also DNS). Verify replication (`repadmin /replsummary`).
6. Servers 3 & 4: Hyper-V role → external vSwitch → **join domain** as member servers.
7. NAS: LUNs → iSCSI initiator on 1 & 2 → disks online → **Failover Cluster** (validate, witness, CSV/file-server role) → fail a node, prove it.
8. **DHCP** role on both DCs → scope → **failover partnership** → prove it by stopping one.
9. **Windows Admin Center** → add all four.
10. Create workstation VMs (2 per host) → domain-join → OU → **GPO software deployment** → prove install on reboot.
11. **Live migration** enabled (Kerberos delegation, network selection) → migrate a VM both ways.
12. RDP to every VM by **FQDN** (DNS A records exist? firewall? Remote Desktop Users?).
13. **DR**: Hyper-V Replica between hosts (or backups) → **test failover**.
14. **Alerts/logging/email** - configure and trigger a test alert.
15. **Redundancy tests**: pull DC1 offline → clients still authenticate/resolve; DHCP failover; cluster failover - record evidence.
16. **Baselines** - 24 h Data Collector Set on all four → export.
17. Final docs → **handover**: instructor connects as client (RDP by FQDN, mapped share, DHCP lease, printer if any).

## Evidence to capture for each checklist item
Screenshot + one-line note in the build log: config page, `ipconfig /all`, `Get-ADDomainController`, `Get-ClusterNode`, DHCP failover status, `Get-VM`, PerfMon report, alert email, RDP session by FQDN. This *is* the technical documentation.
