# 07. Core 2: Operational Procedures, Safety & Service Management (220-1202)

This module covers change management, ticketing systems, backup rules, ESD safety, data destruction, and professionalism based on Modules 11, 21, and 22 of the curriculum.

---

## 1. Change Management & Documentation

### The 7 Steps of Change Management
1. **Purpose and Scope of Change**: Define the technical problem and proposed resolution.
2. **Risk Analysis**: Assess risk level (High/Medium/Low) and potential downtime.
3. **Plan for Change**: Detailed step-by-step implementation guide.
4. **Rollback Plan**: Clear plan to revert changes if the update fails or breaks production systems.
5. **User Impact Analysis**: Notify affected departments regarding scheduled maintenance windows.
6. **CAB Approval**: Change Advisory Board approves or rejects change proposal.
7. **Document Changes**: Record final outcomes in ticketing system and internal Knowledge Base (KB).

---

## 2. Data Security & Backup Strategies

### The 3-2-1 Backup Rule
* **3 Copies of Data**: 1 primary production copy + 2 backup copies.
* **2 Different Media Types**: e.g., Local NAS + External Hard Drive.
* **1 Offsite / Cloud Copy**: e.g., AWS S3 / Cloud Backup to protect against physical disaster (fire/flood).

### Backup Types & Archive Bits
| Backup Type | Description | Archive Bit Status | Restore Speed |
| :--- | :--- | :--- | :--- |
| **Full Backup** | Backs up all selected files regardless of changes. | Resets (clears) bit | Fastest (1 file set) |
| **Differential Backup**| Backs up all files modified since last Full backup. | Does NOT reset bit | Medium (Full + 1 Diff) |
| **Incremental Backup**| Backs up only files modified since last Full or Incremental backup. | Resets (clears) bit | Slowest (Full + All Incs)|

### Physical Data Destruction
* **Degaussing**: High-powered magnetic field destroys data on magnetic HDDs and tapes. (Does NOT work on SSDs!).
* **Shredding / Crushing**: Physical destruction of drives into tiny pieces.
* **Sanitization**: DoD 5220.22-M 3-pass / 7-pass overwrite standards.

---

## 3. Physical Safety & ESD Controls

### Electrostatic Discharge (ESD) Prevention
ESD occurs when static electricity transfers between objects with different electrical potentials. As little as **10 Volts** can damage sensitive microchips.
* **Anti-Static Wrist Strap**: Attaches to technician's wrist and clips to unpainted metal chassis ground.
* **Anti-Static Mat**: Grounds work table surface.
* **Self-Grounding**: Touch unpainted metal chassis before handling components.
* **Humidity Control**: Maintain ambient humidity between **30% and 50%**. Low humidity increases static accumulation.

### Environmental Safety
* **Safety Data Sheets (SDS / MSDS)**: Chemical hazard information, disposal instructions, and first-aid procedures for batteries, cleaning solvents, and toner.
* **Battery Disposal**: Hazardous waste; must be recycled at certified hazardous materials facilities. Never dispose in standard trash.
