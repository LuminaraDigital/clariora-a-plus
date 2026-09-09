# 00. CompTIA A+ Exam Strategy, Objectives & Troubleshooting Roadmap

Welcome to the **Clariora Knowledge Base**. This repository synthesizes all theoretical lectures, practical labs, and video demonstrations from the Datacentre Academy curriculum into a complete, exam-focused study guide for both **CompTIA A+ Core 1 (220-1201)** and **CompTIA A+ Core 2 (220-1202)**.

---

## 1. Exam Structure & Domain Breakdown

### CompTIA A+ Core 1 (Exam Code: 220-1201)
Focuses on physical hardware, mobile devices, networking technology, virtualization, cloud computing, and hardware troubleshooting.

| Domain | Weighting | Key Topics |
| :--- | :---: | :--- |
| **1.0 Mobile Devices** | 15% | Laptop hardware upgrades, displays, ports, mobile OS features, accessories. |
| **2.0 Networking** | 20% | Cables, connectors, TCP/IP ports, IPv4/IPv6, wireless standards, SOHO routers. |
| **3.0 Hardware** | 25% | RAM, storage (SSD/NVMe/HDD), CPUs, motherboards, PSUs, printers, displays. |
| **4.0 Virtualization & Cloud** | 11% | Cloud models (IaaS/PaaS/SaaS), hypervisors (Type 1 vs 2), VM configuration. |
| **5.0 Hardware & Network Troubleshooting** | 29% | Diagnostic methodology, POST/BSOD errors, network failures, printer issues. |

* **Exam Details**: Maximum 90 questions | Duration: 90 minutes | Passing Score: 675 / 900.

---

### CompTIA A+ Core 2 (Exam Code: 220-1202)
Focuses on operating system installation, configuration, security, software troubleshooting, operational procedures, and command line administration.

| Domain | Weighting | Key Topics |
| :--- | :---: | :--- |
| **1.0 Operating Systems** | 31% | Windows 10/11 editions, installation, CLI/PowerShell, macOS, Linux terminal. |
| **2.0 Security** | 25% | Threat vectors, social engineering, wireless security, BitLocker, permissions. |
| **3.0 Software Troubleshooting** | 22% | Boot errors, malware removal, app crashes, mobile OS security issues. |
| **4.0 Operational Procedures** | 22% | Documentation, ticketing, change management, ESD safety, communication. |

* **Exam Details**: Maximum 90 questions | Duration: 90 minutes | Passing Score: 700 / 900.

---

## 2. The CompTIA 6-Step Troubleshooting Framework

The CompTIA troubleshooting methodology is tested heavily on both Core 1 and Core 2. Every diagnostic scenario follows these exact 6 steps in strict sequential order:

```
  ┌────────────────────────────────────────────────────────┐
  │ Step 1: Identify the Problem                           │
  │ • Question user & identify user changes to computer.   │
  │ • Perform backups before making any changes.           │
  │ • Inquire about environmental/infrastructure changes.  │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ Step 2: Establish a Theory of Probable Cause           │
  │ • Question the obvious.                                │
  │ • Consider multiple approaches (Top-down / Bottom-up). │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ Step 3: Test the Theory to Determine Cause             │
  │ • Once theory is confirmed, determine next steps.      │
  │ • If theory is NOT confirmed, re-establish new theory. │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ Step 4: Establish a Plan of Action & Implement Fix     │
  │ • Build step-by-step resolution plan.                  │
  │ • Escalate if beyond technician scope or authority.     │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ Step 5: Verify Full System Functionality & Prevent     │
  │ • Test system thoroughly after resolution.             │
  │ • Implement preventive measures to avoid recurrence.   │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ Step 6: Document Findings, Actions, and Outcomes       │
  │ • Update ticketing system log & knowledge base (KB).   │
  └────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Exam Tip**: If an exam question asks "What is the VERY FIRST step a technician should take when a user reports an issue?", the answer is **Identify the problem** (or perform a backup before attempting repairs).

---

## 3. Performance-Based Questions (PBQs) Strategy

PBQs appear at the very beginning of the exam (usually 3 to 5 interactive simulations):
1. **Network Configuration PBQs**: Configuring wireless access points (SSID, WPA3, channel, subnet mask, gateway).
2. **Command Line PBQs**: Diagnostic terminal windows where you must run `ipconfig`, `ping`, `tracert`, `nslookup`, or `chkdsk`.
3. **Hardware Assembly PBQs**: Drag-and-drop matching of motherboard components, RAID types, or cable pinouts (T568A vs T568B).
4. **Time Management Rule**: Complete quick multiple-choice questions first if a PBQ seems complex, then return to PBQs with remaining time.

---

## 4. The Triad Fast-Track Learning Method

To master all course material in the shortest possible timeframe:
1. **Watch**: View short video demonstrations in [`Videos For A+`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Videos%20For%20A%2B) at 1.5x speed.
2. **Review**: Skim summary tables in [`PowerPoint for A+`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/PowerPoint%20for%20A%2B).
3. **Execute**: Complete hands-on steps in [`Labs for A+`](file:///c:/Users/lumin/Desktop/Datacentre_Academy/Labs%20for%20A%2B) using Command Prompt or Virtual Machines.
