# 03. Core 1: Mobile Devices, Virtualization, Cloud & Printers (220-1201)

This module covers mobile device hardware, displays, virtualization, cloud deployment models, and printing technologies based on Modules 8, 9, and 10 of the curriculum.

---

## 1. Mobile Devices & Display Technologies

### Laptop Components & Upgrades
* **Field Replaceable Units (FRUs)**: RAM (SO-DIMM), M.2 NVMe/SATA SSDs, Wi-Fi/Bluetooth mini-PCIe card, Battery, Keyboard.
* **Display Technologies**:
  * **LCD (TN)**: Fast response time, poor viewing angles, low color accuracy.
  * **LCD (IPS)**: Excellent viewing angles and color accuracy, slightly slower response time.
  * **OLED**: Organic Light Emitting Diode. No backlight required (pixels emit own light). True blacks, high contrast, thinner screen, higher cost.
* **Backlighting**: CCFL (Cold Cathode Fluorescent Lamp - requires AC inverter board) vs. LED (Direct DC, no inverter required).
* **Digitizer**: Touch-screen glass layer that converts physical finger touches into digital signals.

---

## 2. Virtualization & Cloud Computing

### Hypervisor Classification
* **Type 1 (Bare-Metal) Hypervisor**: Runs directly on hardware host without underlying OS. Extremely efficient. Examples: VMware ESXi, Microsoft Hyper-V, Proxmox VE.
* **Type 2 (Hosted) Hypervisor**: Runs as an application inside a host operating system (e.g., Windows 10/11). Examples: Oracle VM VirtualBox, VMware Workstation.

### Cloud Service Models
* **IaaS (Infrastructure as a Service)**: Provides raw computing power, virtual machines, storage, and networking. Customer manages OS, software, and data. (Example: AWS EC2, Azure VMs).
* **PaaS (Platform as a Service)**: Provides software development framework and runtime environment. Cloud provider manages OS and hardware. (Example: AWS Elastic Beanstalk, Heroku).
* **SaaS (Software as a Service)**: Complete cloud-hosted application ready for end users. (Example: Google Workspace, Microsoft 365, Salesforce).

### Cloud Deployment Models
* **Public**: Shared multi-tenant infrastructure accessible over public internet.
* **Private**: Dedicated single-tenant infrastructure owned/operated exclusively by one organization.
* **Hybrid**: Combination of public and private cloud environments linked together.
* **Community**: Shared infrastructure used jointly by several organizations with shared compliance/security goals.

---

## 3. Printing Technologies & Troubleshooting

### The 7-Step Laser Printing Process (CRITICAL EXAM CONCEPT)

```
  ┌────────────────────────────────────────────────────────┐
  │ 1. Processing  ➜  Engine processes page in memory      │
  │ 2. Charging    ➜  Primary Corona/Roller places -600V  │
  │                   charge on Photosensitive Drum        │
  │ 3. Exposing    ➜  Laser writes image onto drum,        │
  │                   reducing charge to -100V             │
  │ 4. Developing  ➜  Toner cartridge applies -600V toner  │
  │                   which sticks to -100V exposed area   │
  │ 5. Transferring➜  Transfer roller places + charge on   │
  │                   paper, pulling toner from drum       │
  │ 6. Fusing      ➜  Heat & pressure rollers fuse toner   │
  │                   permanently into paper fibers        │
  │ 7. Cleaning    ➜  Rubber blade scrapes leftover toner  │
  │                   off drum into waste bin              │
  └────────────────────────────────────────────────────────┘
```

### Thermal & Inkjet Printers
* **Thermal Printers**: Use heat-sensitive thermal paper. No ink needed. Direct thermal fades over time with heat exposure. Commonly used for receipts and shipping labels.
* **Inkjet Printers**: Spray liquid ink droplets via piezoelectric or thermal nozzles. Maintenance requires print head alignment and cleaning cycles.
* **3D Printers**: Fused Filament Fabrication (FFF). Melts plastic filament (PLA/ABS) layer-by-layer on a heated print bed.
