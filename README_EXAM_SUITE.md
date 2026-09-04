# CompTIA A+ (Core 1 & Core 2) Master Practice Exam Suite

Welcome to your **CompTIA A+ (220-1101/1201 Core 1 & 220-1102/1202 Core 2)** exam training suite, engineered with datacenter technician and enterprise IT depth.

---

## 🚀 Quick Start (One-Click Launch)

- **Interactive Web Simulator**: Double-click [`Launch_Exam_Simulator.bat`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/Launch_Exam_Simulator.bat) (or directly open [`A_Plus_Exam_Simulator.html`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/A_Plus_Exam_Simulator.html) in any browser).
- **Terminal CLI Simulator**: Double-click [`Launch_Terminal_Exam.bat`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/Launch_Terminal_Exam.bat) (or run `python practice_exam.py` in PowerShell).

---

## 🎯 Exam Engine Specifications

| Feature | CompTIA Standard Specification | Simulator Implementation |
| :--- | :--- | :--- |
| **Time Allowed** | **90 Minutes** | Live countdown timer with 15m & 5m visual alerts, pause/resume |
| **Questions** | **Maximum of 90 Questions** | 90 questions per full simulation sampled across official domains |
| **Scoring Scale** | **100 to 900** | $\text{Score} = 100 + \text{round}\left(800 \times \frac{\text{Correct}}{\text{Total}}\right)$ |
| **Passing Score (Core 1)** | **675 / 900** | Pass/Fail determination against 675 threshold (~72%) |
| **Passing Score (Core 2)** | **700 / 900** | Pass/Fail determination against 700 threshold (~75%) |
| **Interface Features** | Pearson VUE Test Engine | Question matrix grid, Flag for Review, Distractor strikethrough, Review screen |
| **Reusability** | Infinite Retakes | Randomized questions & options, Domain practice mode, Missed question drill |

---

## 📚 Exam Domains & Official Weightings

### Core 1 (220-1101 / 220-1201)
1. **1.0 Mobile Devices (15%)**: Laptop hardware, screens/digitizers, batteries, port replicators, mobile connectivity (cellular, eSIM).
2. **2.0 Networking (20%)**: TCP/IP ports & protocols, IPv4/IPv6, subnetting, DHCP DORA, DNS, Wi-Fi standards (802.11ac/ax), Cat 6/6a cabling, fiber (SMF/MMF), network tools (toner probe, crimper).
3. **3.0 Hardware (25%)**: Motherboards, RAM (ECC vs non-ECC, DDR4/5), CPUs (LGA vs PGA), storage & RAID (0, 1, 5, 10), NVMe PCIe, 80 PLUS PSU efficiency, laser printer electrophotographic cycle.
4. **4.0 Virtualization & Cloud Computing (11%)**: Type 1 (bare metal) vs Type 2 hypervisors, IaaS / PaaS / SaaS, rapid elasticity, containerization vs VMs, VDI.
5. **5.0 Hardware & Network Troubleshooting (29%)**: 6-step troubleshooting methodology, POST beep codes, dead CMOS batteries, printer fuser/spooler issues, IP/DNS connectivity diagnostics.

### Core 2 (220-1102 / 220-1202)
1. **1.0 Operating Systems (31%)**: Windows 10/11 requirements (UEFI, TPM 2.0), GPT vs MBR, Windows CLI tools (`sfc /scannow`, `dism`, `gpupdate`, `gpresult`, `robocopy`), Registry root keys, macOS (Time Machine, Keychain), Linux CLI (`chmod`, `chown`, `grep`, `df -h`).
2. **2.0 Security (25%)**: Social engineering (whaling, baiting, phishing, tailgating), physical security (mantraps / access control vestibules), Wi-Fi security (WPA3 SAE, disabling WPS), 802.1X RADIUS, NTFS vs Share permissions, BitLocker vs EFS.
3. **3.0 Software Troubleshooting (22%)**: CompTIA 7-step malware remediation process, BSOD crash dump analysis, boot repair (`bootrec /rebuildbcd`), temporary profile repair, services dependencies.
4. **4.0 Operational Procedures (22%)**: Change management (RFC, CAB, backout plan), ESD precautions, environmental controls (humidity 40-60%, HVAC airflow), SDS safety sheets, 3-2-1 backup rule, degaussing/shredding, PowerShell automation scripts (`.ps1`).

---

## 🔄 Reusability & How to Study to Ace the Certification

1. **Step 1: Benchmark Simulation**: Take a full 90-question Core 1 simulation to establish your baseline score.
2. **Step 2: Review Missed Explanations**: After submitting, inspect the **Question-by-Question Deep Dive** section. Read the senior technician explanation for every question you missed or flagged.
3. **Step 3: Drill Missed Questions**: Click **"Drill Missed Questions"** to immediately retake only the questions you got wrong until they are firmly mastered.
4. **Step 4: Domain Mastery**: Use the **Domain Practice Drill** dropdown to focus on specific domains where your score fell below 80%.
5. **Step 5: Target 850+**: Continue rotating full exams until you consistently score above 850/900 on both Core 1 and Core 2.

---

## 🗂️ File Inventory

- [`A_Plus_Exam_Simulator.html`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/A_Plus_Exam_Simulator.html): Main interactive web application (exams + Study Library + Messer videos + APX ledger).
- [`ledger_engine.js`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/ledger_engine.js) / [`ledger_ui.js`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/ledger_ui.js): Proof-of-Mastery hash-chained ledger and APX token economy UI.
- [`exam_data.js`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/exam_data.js) / [`exam_data.json`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/exam_data.json): Compiled question bank from TOTAL 1201, Core 1 1101, legacy 1001 quizzes, practice exams, Mastery questions, and curated scenarios.
- [`study_library.js`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/study_library.js) / [`study_library.json`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/study_library.json): Unified Study Library (Mastery notes, DOCX lecture extracts, practice markdown, PDF catalog).
- [`build_exam_bank.py`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/build_exam_bank.py) & [`generate_complete_exam_bank.py`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/generate_complete_exam_bank.py): Question ingestion and compilation.
- [`build_study_library.py`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/build_study_library.py): Study-content ingestion from every CompTIA A+ course folder.
- [`create_desktop_dist.py`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/create_desktop_dist.py): Packages the Electron desktop app with exam bank + study assets.
- [`practice_exam.py`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/practice_exam.py): Standalone terminal-based Python exam runner.
- [`Launch_Exam_Simulator.bat`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/Launch_Exam_Simulator.bat): 1-click Windows shortcut for browser simulator.
- [`Launch_Terminal_Exam.bat`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/Launch_Terminal_Exam.bat): 1-click Windows shortcut for CLI exam.
- [`CompTIA_A_Plus_Desktop_App/Launch_CompTIA_A_Plus.bat`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+/CompTIA_A_Plus_Desktop_App/Launch_CompTIA_A_Plus.bat): 1-click desktop app launcher.
