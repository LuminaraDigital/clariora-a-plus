# 17 · Support Procedures, Professional Communication & OS Types (Module 11)

**Exam objectives:** Core 2 · 4.1 Implement best practices associated with documentation and support systems information management · 4.6 Prohibited content/activity, privacy, licensing, policy (AUP) · 4.7 Use proper communication techniques and professionalism · 1.1 (OS types & file systems).

---

# Lesson 11.1 - Documentation

## Documents to know
| Document | Purpose |
|---|---|
| **SOP** (standard operating procedure) | **Step-by-step instructions** for a task. Use *guidelines* instead when many variables/complex decisions are involved |
| **SLA** (service level agreement) | **Defines the metrics of service delivery** - response/resolution times, uptime. **Internal** (between departments) or **external** (ISP, cloud provider) |
| **AUP** (acceptable use policy) | **List of acceptable behaviours** on corporate networks/systems; reinforced by **splash-screen reminders**; sign at onboarding |
| **Knowledge base (KB)** | **Self-serve central repository** of articles, checklists, troubleshooting steps; may include OEM/vendor content |
| **Support docs / KB articles** | Record the resolution; give future techs initial diagnosis checks and steps that worked before |
| **After-action report / lessons learned** | In-depth analysis of an incident that **drives changes to policy/procedure**; can become a new SOP |
| Network topology diagrams, asset inventory, incident reports, regulatory compliance docs, onboarding/offboarding checklists | (obj 4.1 list) |

## The "rule of nines" (availability)
| Availability | Downtime per year |
|---|---|
| 99% (two nines) | ~3.65 days |
| 99.9% | ~8.77 hours |
| 99.99% | ~52.6 minutes |
| **99.999% (five nines)** | **~5.26 minutes** |
| 99.999999% (eight nines) | ~315 ms |
Also applied to acceptable **data loss** in DR planning (RPO/RTO).

## Ticketing systems
- Manage **requests, incidents, problems**; assign to techs; track updates through resolution.
- **Categories** (organisation-specific):
 - **Request** - provision assets (new account, new laptop)
 - **Incident** - error/unexpected condition
 - **Problem** - incidents whose fix requires reconfiguring the system/network (root cause)
- **Severity/priority**: **Critical, Major, Minor** (impact × urgency).
- Ticket content: user info, device info, **description of the problem**, category, severity, **progress notes**, **problem resolution**. Keep notes **clear and concise**.

## Escalation tiers
| Tier | Who |
|---|---|
| **Tier 0** | **Self-service** (KB, FAQ, chatbot) |
| **Tier 1** | **Initial agent** - diagnosis, basic fixes |
| **Tier 2** | **Senior technicians** |
| **Tier 3** | **Engineering team / senior management / vendor** |
Escalate **internally** (another tech/department) or **externally** (third-party provider, manufacturer support).

---

# Lesson 11.2 - Professional communication

## Support processes
- Document **service hours** and how to open a ticket; **set and meet expectations/timelines**; offer **repair vs replacement** options; **follow up** to confirm the fix worked.

## Delivery
- **Arrive on time**; **avoid distractions** (personal calls, texts, social media, talking to co-workers); handle **confidential/private material** properly - **do not access data on a system without permission**.

## Appearance & language
- Professional attire matched to the environment; **proper language, avoid jargon/acronyms/slang**; **cultural sensitivity** (customs vary; use appropriate titles).

## Communication techniques
- **Active listening** - eye contact, **don't interrupt**, take notes, **repeat back your understanding**.
- **Open-ended questions** first ("What happens when…?") to draw out information; **closed-ended** (yes/no) to **confirm** the suspected issue.

## Difficult situations
- Maintain a **positive attitude / project confidence**; **avoid arguing, dismissing, being judgmental**.
- Difficult customers: recognise anger early, **don't take it personally**, **actively listen**, get a supervisor/another tech if needed, **hang up / end contact if abusive or threatening**.
- **Do not post experiences on social media** - follow company policy.

---

# Lesson 11.3 - Types of operating systems

## Desktop / server OS
| OS | Notes |
|---|---|
| **Windows** 10 / 11 (client), **Server 2019 / 2022 / 2025** | Server editions optimised for enterprise management (AD, Hyper-V, roles) |
| **macOS** | Apple hardware only |
| **UNIX** | **Shell** (user interaction) + **kernel** (manages resources) architecture; the ancestor |
| **Linux** | UNIX-like, **open source**; distros = kernel + shell + desktop environment + package manager; **standard release** (Ubuntu LTS) vs **rolling release** (Arch) |
| **Chrome OS** | Google, Linux-based, for **web apps**; Chromebooks |

## Mobile OS
- **iOS** - iPhone only (iPadOS, watchOS, tvOS siblings); closed.
- **Android** - **open source** (AOSP), runs on **many vendors' hardware**; vendor skins.

## File systems - memorise
| FS | OS | Notes |
|---|---|---|
| **NTFS** | Windows | **Journaling**, **security** (ACLs/permissions), **compression**, **EFS encryption**, **quotas**, **snapshots (VSS)**, **indexing**, **dynamic disks**; huge files/volumes |
| **ReFS** | Windows Server / Pro-for-Workstations | Resilient FS - **large storage, data integrity**, scalable; no boot |
| **FAT32** | Universal | **4 GB max file**, 32 GB volume via Windows GUI; no permissions; USB sticks / EFI system partition |
| **exFAT** | Windows/macOS/many | FAT extended for flash - big files, no NTFS overhead |
| **ext4** | Linux | Default journaling FS (ext3 predecessor) |
| **XFS** | Linux (RHEL default) | High-performance, large files |
| **APFS** | macOS/iOS | Apple File System - snapshots, encryption, SSD-optimised (replaced HFS+) |
| **HFS+** | older macOS | |

## OS compatibility & life cycle
- OS is built for specific hardware (Windows 11 needs **TPM 2.0**); apps built for a specific OS/FS; network compatibility (SMB versions, AD); **train and support users** through changes.
- **EOL / EOSL** - vendor no longer supports → no patches → security risk (Windows 10 support ended **Oct 2025**).

## Self-test
1. SOP vs guideline; SLA internal vs external example.
2. Five nines = how much downtime per year?
3. Request vs incident vs problem. Three severity levels.
4. Tiers 0-3.
5. Open vs closed questions - which first and why?
6. Three things to *avoid* with an upset customer; when may you end the call?
7. UNIX architecture - two parts and their roles.
8. Standard vs rolling release.
9. NTFS features (name five). FAT32 max file size.
10. Which FS for Linux? macOS? Flash drives shared between Mac & Windows?
