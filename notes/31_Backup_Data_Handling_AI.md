# 31 · Backup & Recovery, Data Handling, Data Destruction & AI Basics (Module 21)

**Exam objectives:** Core 2 · 4.3 Implement workstation backup and recovery methods · 2.9 Compare and contrast data destruction and disposal methods · 4.6 Prohibited content/activity, privacy, licensing, policy · 4.10 Explain basic concepts related to artificial intelligence · 2.1 (security measures).

---

# Lesson 21.1 - Data backup and recovery

## Backup operations
- Purpose: **protect against data loss** (deletion, corruption, ransomware, hardware failure, disaster).
- **Backup scheme** = series of backup **types and timelines** (e.g. hourly VM snapshots + weekly file backups).
- Windows tools: **File History** (versioned copies of user folders to external/network drive), **Backup and Restore (Windows 7)** (system image), OneDrive; **Time Machine** (mac); enterprise agents.
- **Versioning** - keep multiple historical versions to roll back before corruption/ransomware.

## Backup methods
- **Frequency** - how often (RPO: how much data can you afford to lose).
- **Retention** - how long backups are kept (policy/regulation).
- **Backup chain types - memorise**

| Type | Backs up | Job time & storage | Restore complexity | **Archive bit** |
|---|---|---|---|---|
| **Full** | **All** selected data regardless of prior backups | High | **Low (single job)** | **Cleared** |
| **Incremental** | New/modified **since the last backup of ANY type** | **Low** | **High (full + every incremental in order)** | **Cleared** |
| **Differential** | New/modified **since the last FULL** | Moderate (grows daily) | **Moderate (full + latest differential = two jobs)** | **NOT cleared** |
| **Synthetic full** | Server **appends incremental changes to the original full** to make a new full without re-reading the source | Low load on client | Low | - |

Deck example: full on the 1st at 07:00, then incrementals every 3 hours the rest of the month.
Exam trick: **only differential leaves the archive bit set** - that's how it keeps growing relative to the last full.

## Media & rotation
- **Media**: **magnetic tape** (LTO - cheap, offline, long retention), **internal/external HDD**, **NAS/SAN**, **cloud**, optical (rare). **Media reuse** & rotation policies.
- **GFS - Grandfather-Father-Son**: daily (son) → weekly (father) → monthly (grandfather) rotation; balances retention and media count.
- **On-site vs off-site** - off-site protects against site disaster; cloud is easy off-site.
- **3-2-1 rule (memorise)**: **3 copies of the data (production + 2), on 2 different media types, 1 off-site (and ideally offline/immutable)**. Deck example: production system + external HDD on site + cloud copy.

## Testing & recovery best practices
- **Always test backups** - verify data after backup, **periodic test restores**, procedural compliance audits; monitor job success; encrypt backups; protect credentials (ransomware targets backups).
- **Recovery options**: **in-place** (restore to original system/location) vs **alternate system/site location** (test restores, DR site, when original is destroyed).
- Recovery objectives: **RTO** (how fast) / **RPO** (how much loss). Bare-metal restore, file-level restore, VM snapshot restore.

---

# Lesson 21.2 - Data handling best practices

## Regulated data classifications - memorise
| Class | Definition | Regulation |
|---|---|---|
| **PII** - personally identifiable information | Anything that identifies a person (name+DOB, address, email, IP) | **US Privacy Act, GDPR** (EU), CCPA |
| **PGI / government-issued ID** | **SSN/NI number, passport, driver's licence** numbers | Various |
| **PHI** - protected health information | Medical records, insurance | **HIPAA** (US) |
| **PCI / cardholder data** | **Credit/debit card** numbers, CVV, transactions | **PCI-DSS** (industry standard, not law) |
| Also: intellectual property, trade secrets, classified (govt), financial (SOX/GLBA) | | |
Handling: classify → label → encrypt → least privilege → retention/disposal → breach notification.

## Prohibited content & licensing
- **Prohibited content/activity**: material **not applicable to work**, **obscene**, **illegally copied/pirated** software or media, harassment, hacking tools - defined by the **AUP**. **Incident response** on discovery: report to supervisor/security per policy, preserve evidence, don't investigate alone.
- **Licensing**:
  - **EULA** - end-user licence agreement; **licence compliance** audits.
  - **Personal vs corporate/commercial** use; **single-user vs multi-user/volume/site**; **subscription vs perpetual**; **concurrent** licences.
  - **Open-source** - source available, licence terms (GPL, MIT…) - **does not necessarily mean free of cost or free to use commercially**; **closed-source/proprietary**.
  - **DRM** - digital rights management restricts copying/use of media/software.
  - **NDA** - non-disclosure agreement protects confidential info.

## Incident response
- **Standard procedures/policy** for a data breach, malware outbreak, outage. **Incident response plan**; **CIRT / CERT / CSIRT** - designated team. Phases: preparation → identification → containment → eradication → recovery → lessons learned.
- **First responder duties**: identify, report through proper channels, **preserve data/devices**, don't power off unless directed, escalate.

## Data integrity & preservation (forensics)
- **Forensics** - collecting evidence **to a standard accepted in court**; **certified technicians and facilities**.
- **Document, document, document** - photos, videos, notes, timestamps.
- **Order of volatility** - capture most volatile first: CPU registers/cache → RAM → network state/running processes → disk → backups/archives → printouts.
- **Chain of custody** - **positive, documented control over evidence** at all times: who collected, stored, processed, transported; signed logs; sealed bags; prevents tampering claims. Legal hold. Copy/image drives (write-blocker), hash the image.

## Data destruction & disposal
| Method | Notes |
|---|---|
| **Sanitization / erasing / wiping** | Overwrite; **re-formatting is NOT sufficient**; **low-level format** (vendor tool); **secure erase** (ATA command - SSD); **instant secure erase / crypto-erase** (destroy the encryption key - SEDs); DoD/NIST 800-88 patterns |
| **Degaussing** | Strong magnetic field - **only magnetic media (HDD, tape)**; **useless on SSD/flash/optical**; destroys drive |
| **Physical destruction** | **Drilling**, **shredding**, crushing, **incineration** - for any media, definitive |
| **Outsourcing** | Third-party disposal/recycling; obtain a **certificate of destruction/recycling** with serials |
Choose by media type + sensitivity + reuse intent (wipe if reusing/donating; destroy if not).

---

# Lesson 21.3 - Artificial intelligence basics (obj 4.10)

- **Application integration** - AI analyses data and provides recommendations; **third-party providers** (website chatbot add-ons, copilots); fields: **NLP** (natural language processing), **ML** (machine learning), **computer vision**; generative AI/LLMs.
- **Policy** - organisation must dictate **legal and ethical use, or banning**, of AI tools; **AUP may restrict what corporate data can be shared** with AI services (data leakage/training on your data).
- **Limitations**: **bias** ("garbage in, garbage out"), **hallucinations** (confidently wrong output), **accuracy** - **trust but verify**; privacy; explainability; copyright.
- **Private vs public AI**: **private** = for sole use of the organisation on its own data (on-prem/tenant-isolated); **public** = open services (**ChatGPT, Gemini/Bard**, Copilot free) - assume anything entered may be retained.
- Also: appropriate use, plagiarism/attribution, data privacy considerations, model updates.

## Self-test
1. Full / incremental / differential - what each backs up, restore steps, archive bit.
2. What is a synthetic full?
3. 3-2-1 rule with an example. GFS.
4. Why test restores? In-place vs alternate location.
5. PII / PHI / PCI / PGI - regulation for each.
6. Open source = free? What are DRM, EULA, NDA?
7. What does an incident-response first responder do?
8. Order of volatility (top three). Chain of custody definition.
9. Which destruction method fails on SSDs? Which is "not sufficient"? What document to get from an outsourcer?
10. Three AI limitations; private vs public AI; why the AUP matters for AI.
