import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import c2_utils

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARDS_DIR = os.path.join(ROOT, "_bank", "shards")
os.makedirs(SHARDS_DIR, exist_ok=True)

questions_data = [
    # 4.1 Documentation, ticketing, and asset management (3 questions: C2N-O-001..003)
    {
        "id": "C2N-O-001",
        "objective": "4.1",
        "difficulty": "medium",
        "tags": ["operational-procedures", "asset-management", "cmdb", "lifecycle"],
        "question": "An IT department is deploying 300 new laptops. Which operational process involves physically affixing scannable barcode/RFID tags and recording serial numbers, purchase dates, warranty terms, and assigned users in a Configuration Management Database (CMDB)?",
        "options": [
            "Asset management / Hardware inventory tracking",
            "Change management risk analysis",
            "Disaster recovery tabletop testing",
            "Software license harvesting"
        ],
        "answer": 0,
        "explanation": "Asset management is the lifecycle process of identifying, tracking, and managing physical and virtual IT assets from procurement to disposal. Affixing barcode/RFID asset tags and entering hardware specifications, serial numbers, warranty timelines, and assigned personnel into a CMDB ensures accurate hardware accountability and auditing. Change management evaluates system modifications, disaster recovery plans for outages, and license harvesting recovers unused software.",
        "distractor_analysis": {
            "1": "Change management governs the formal approval and rollout of infrastructure changes, not physical device inventory tagging.",
            "2": "Disaster recovery tabletop exercises simulate emergency operational responses to critical outages without managing hardware tag inventories.",
            "3": "License harvesting reclaims unused software allocations across workstations rather than cataloging physical laptop hardware assets."
        }
    },
    {
        "id": "C2N-O-002",
        "objective": "4.1",
        "difficulty": "medium",
        "tags": ["operational-procedures", "ticketing", "documentation", "kb"],
        "question": "A technician spends two hours diagnosing an uncommon VPN configuration error and successfully resolves the issue. According to standard operating procedures, what documentation step should the technician complete before closing the ticket?",
        "options": [
            "Document the root cause, symptoms, and step-by-step resolution in the ticketing work log and create a Knowledge Base (KB) article if applicable",
            "Delete the ticket history to save database storage on the ticketing server",
            "Email the company CEO detailing the technician's overtime hours",
            "Change the ticket priority to Critical and leave it open for 30 days"
        ],
        "answer": 0,
        "explanation": "Professional IT operational procedures require thorough incident documentation. Recording the detailed problem description, root cause analysis, and exact resolution steps in the ticketing system ensures organizational knowledge capture, aids future troubleshooting, and allows creating or updating internal Knowledge Base (KB) articles. Deleting tickets destroys audit history, emailing executive leadership is inappropriate, and falsely escalating closed tickets violates ticketing procedures.",
        "distractor_analysis": {
            "1": "Deleting ticket history destroys institutional memory, compliance audit trails, and troubleshooting references.",
            "2": "Escalating routine ticket resolution notes to the Chief Executive Officer violates communication hierarchy and operational protocols.",
            "3": "Leaving closed tickets open under a Critical status skews SLA metrics and misrepresents active incident queues."
        }
    },
    {
        "id": "C2N-O-003",
        "objective": "4.1",
        "difficulty": "hard",
        "tags": ["operational-procedures", "network-diagrams", "topology", "documentation"],
        "question": "A network technician needs to understand both the physical cable runs connecting patch panels to datacenter rack switches AND the logical IP addressing, VLAN segmentation, and routing boundaries. Which documentation resources are required?",
        "options": [
            "Both physical network diagrams (cable paths, rack elevations) and logical network topology diagrams (VLANs, subnets, routers)",
            "Software End-User License Agreements (EULA)",
            "Safety Data Sheets (SDS) for rack cleaning solvents",
            "Acceptable Use Policy (AUP) documentation"
        ],
        "answer": 0,
        "explanation": "Network documentation comprises two distinct types: Physical network diagrams illustrate actual hardware locations, rack elevations, patch panel ports, and physical cable pathways. Logical network diagrams illustrate data flow, IP addressing schemes, subnet masks, VLAN IDs, router gateways, and firewall security zones. EULAs govern software licensing, SDS covers chemical safety, and AUP governs employee computer behavior.",
        "distractor_analysis": {
            "1": "EULA documents detail software vendor licensing terms and offer zero network infrastructure mapping.",
            "2": "Safety Data Sheets provide chemical handling and first-aid instructions for hazardous substances in the workplace.",
            "3": "Acceptable Use Policies define permissible employee conduct on company networks rather than engineering topology maps."
        }
    },

    # 4.2 Change management (4 questions: C2N-O-004..007)
    {
        "id": "C2N-O-004",
        "objective": "4.2",
        "difficulty": "hard",
        "tags": ["change-management", "rollback-plan", "backout", "rfc"],
        "question": "A senior systems engineer submits a Request for Change (RFC) to upgrade the core datacenter hypervisor cluster. Why is a documented rollback (backout) plan a MANDATORY prerequisite for change approval?",
        "options": [
            "It provides step-by-step instructions and verified backups to restore systems to their previous working state if the change fails or causes unexpected downtime",
            "It automatically executes the hypervisor installation script without administrative supervision",
            "It eliminates the need to perform risk analysis or test in a staging environment",
            "It guarantees that no software bugs exist in the new hypervisor build"
        ],
        "answer": 0,
        "explanation": "A rollback (backout) plan is a critical risk mitigation requirement in formal change management. If an infrastructure change encounters unforeseen failures, performance degradation, or database corruption during execution, the rollback plan provides clear, tested steps (including restoring pre-change backups and reverting configuration states) to return the environment to a known good operational baseline within the maintenance window. Rollback plans do not automate installations, replace sandbox testing, or guarantee zero vendor bugs.",
        "distractor_analysis": {
            "1": "A rollback plan is a recovery procedure used upon failure, not an automated deployment script for primary installations.",
            "2": "Having a backout plan does not excuse the engineering team from conducting rigorous risk analyses and sandbox staging tests.",
            "3": "No documentation can guarantee that third-party vendor software is completely free of bugs or regressions."
        }
    },
    {
        "id": "C2N-O-005",
        "objective": "4.2",
        "difficulty": "medium",
        "tags": ["change-management", "cab", "approval", "rfc"],
        "question": "Which organizational governing body is responsible for reviewing proposed RFCs, evaluating business risk, assessing scheduling conflicts with other projects, and granting formal approval for major infrastructure changes?",
        "options": [
            "Change Advisory Board (CAB)",
            "Human Resources Disciplinary Panel",
            "Software Quality Assurance Beta Testers",
            "Local Emergency Response Team"
        ],
        "answer": 0,
        "explanation": "The Change Advisory Board (CAB) is a multidisciplinary committee composed of IT managers, systems architects, security officers, and business stakeholders that convenes periodically to review Requests for Change (RFCs). The CAB evaluates technical risk, business impact, rollback viability, and scheduling conflicts before officially approving or rejecting changes. HR handles employee relations, QA conducts code testing, and emergency teams handle physical crises.",
        "distractor_analysis": {
            "1": "Human Resources panels govern personnel management, employment policy, and workplace conduct, not technical infrastructure RFCs.",
            "2": "QA beta testers evaluate software usability and defect reporting prior to production release, lacking governance authority over enterprise change approvals.",
            "3": "Emergency response teams address physical building evacuations and hazards, not IT change management governance."
        }
    },
    {
        "id": "C2N-O-006",
        "objective": "4.2",
        "difficulty": "medium",
        "tags": ["change-management", "sandbox", "test-environment", "staging"],
        "question": "Before deploying a new security patch to 2,000 production database servers, the systems team validates the patch in an isolated replica environment that mirrors production hardware and application stacks. What is this environment called?",
        "options": [
            "Sandbox / Staging (Test) environment",
            "Live Production cluster",
            "Public cloud archive repository",
            "Client endpoint demilitarized zone (DMZ)"
        ],
        "answer": 0,
        "explanation": "A Sandbox or Staging environment is an isolated non-production network segment that closely duplicates the production configuration. Testing patches, scripts, and software upgrades in a sandbox allows engineers to detect software conflicts, application crashes, and performance regressions without impacting live business operations or real user data. Testing on live production risks immediate company-wide outages.",
        "distractor_analysis": {
            "1": "Testing unverified security patches directly on live production clusters risks catastrophic enterprise downtime and customer data corruption.",
            "2": "Public cloud archives are cold storage tiers for long-term retention of historical data, not execution testbeds.",
            "3": "A DMZ is a perimeter network exposed to the internet hosting external services (e.g., web servers), not an isolated patch staging environment."
        }
    },
    {
        "id": "C2N-O-007",
        "objective": "4.2",
        "difficulty": "medium",
        "tags": ["change-management", "maintenance-window", "stakeholders", "communication"],
        "question": "A systems engineer must migrate an enterprise email server to a new storage array. Why should this change be scheduled strictly during a predefined 'maintenance window'?",
        "options": [
            "To minimize business disruption and user impact by executing changes during low-traffic off-peak hours",
            "To ensure that server hardware runs at cooler operating temperatures",
            "To bypass the need for Change Advisory Board (CAB) approval",
            "To prevent the server from generating Windows Event Viewer logs"
        ],
        "answer": 0,
        "explanation": "A maintenance window is a pre-scheduled timeframe (typically during overnight hours or weekends) agreed upon by IT and business stakeholders during which planned service interruptions, reboots, and high-risk changes are permitted. Executing changes during off-peak hours minimizes the impact of potential downtime on employee productivity and customer operations. Maintenance windows do not alter hardware cooling, bypass CAB approval, or suppress event logging.",
        "distractor_analysis": {
            "1": "Hardware operating temperatures are governed by server room HVAC cooling, not calendar scheduling windows.",
            "2": "Scheduling within a maintenance window is a requirement of the CAB process, never a loophole to bypass formal approval.",
            "3": "Windows Event Viewer continues logging all driver, application, and system events normally regardless of the time of day."
        }
    },

    # 4.3 Backup and recovery (4 questions: C2N-O-008..011)
    {
        "id": "C2N-O-008",
        "objective": "4.3",
        "difficulty": "hard",
        "tags": ["backup-and-recovery", "incremental", "differential", "archive-bit"],
        "question": "A company executes a Full backup every Sunday night at 23:00. From Monday through Saturday, the backup software is configured to back up only files that have changed since the previous day's backup and then clear the archive bit. Which backup type is running on weeknights, and what is required for a complete restore on Thursday?",
        "options": [
            "Incremental backup; restoring Thursday requires Sunday's Full backup plus Monday, Tuesday, and Wednesday Incremental backups in sequential order",
            "Differential backup; restoring Thursday requires Sunday's Full backup plus only Wednesday's Differential backup",
            "Synthetic full backup; restoring Thursday requires only Monday's backup",
            "Full backup; restoring Thursday requires only Wednesday's backup"
        ],
        "answer": 0,
        "explanation": "An Incremental backup backs up all files modified since the last backup of ANY type (full or incremental) and CLEARS the archive bit (sets it to 0). Consequently, each daily incremental captures only that single day's changes. To restore data as of Thursday morning, the administrator must restore the last Full backup (Sunday) followed by each daily incremental backup in exact chronological order (Monday, Tuesday, Wednesday). Differential backups do not clear the archive bit and require only the Full plus the latest Differential.",
        "distractor_analysis": {
            "1": "Differential backups do not clear the archive bit and back up all changes since Sunday's Full, which does not match the question's daily clear behavior.",
            "2": "A synthetic full creates an assembled full backup on the backup server without needing individual client incremental chain playback.",
            "3": "Daily full backups would back up all enterprise data every single night, which is not the described incremental workflow."
        }
    },
    {
        "id": "C2N-O-009",
        "objective": "4.3",
        "difficulty": "medium",
        "tags": ["backup-and-recovery", "3-2-1-rule", "best-practices", "offsite"],
        "question": "An IT manager enforces the industry standard '3-2-1 backup rule' for corporate financial databases. Which configuration exemplifies strict adherence to the 3-2-1 rule?",
        "options": [
            "3 total copies of the data, on 2 different storage media types (e.g., local NVMe SAN and LTO tape), with 1 copy stored offsite/in the cloud",
            "3 copies of the data stored on 2 different partitions of the same physical hard drive",
            "3 backups taken every 2 hours using 1 single USB flash drive",
            "3 daily full backups kept on 2 optical DVDs stored in the server room desk"
        ],
        "answer": 0,
        "explanation": "The 3-2-1 backup rule is the benchmark for data protection: Maintain at least 3 total copies of your data (1 primary production copy + 2 backup copies), stored on at least 2 different storage media technologies (e.g., disk SAN + magnetic tape or cloud object storage), with at least 1 copy kept offsite (or in an immutable cloud repository) to survive localized physical disasters (fire, flood, theft). Storing copies on the same drive or room violates media diversity and offsite requirements.",
        "distractor_analysis": {
            "1": "Multiple partitions on the same physical drive all fail simultaneously if the underlying spindle motor or drive controller fails.",
            "2": "Relying on a single USB thumb drive provides zero media redundancy, zero drive diversity, and zero offsite disaster protection.",
            "3": "Keeping all DVD media inside the same server room offers zero protection against building fires, water leaks, or physical burglary."
        }
    },
    {
        "id": "C2N-O-010",
        "objective": "4.3",
        "difficulty": "hard",
        "tags": ["backup-and-recovery", "rto", "rpo", "disaster-recovery"],
        "question": "A financial transaction system defines a Recovery Point Objective (RPO) of 15 minutes and a Recovery Time Objective (RTO) of 2 hours. What do these metrics mandate from a backup and operational recovery perspective?",
        "options": [
            "Maximum allowable data loss is 15 minutes of transactions (requiring frequent snapshots/replication), and systems must be fully restored and operational within 2 hours of an outage",
            "Backups take 15 minutes to run and systems must run without maintenance for 2 hours",
            "Data must be retained for 15 months and restored in 2 days",
            "The disaster recovery site must be located 15 miles away and have 2 internet connections"
        ],
        "answer": 0,
        "explanation": "Recovery Point Objective (RPO) is the maximum acceptable amount of data loss measured in time (e.g., losing at most 15 minutes of committed transactions, necessitating continuous replication or 15-minute transactional logs). Recovery Time Objective (RTO) is the maximum acceptable duration of system downtime before service must be fully restored to normal operations following an outage (e.g., recovering within 2 hours). These are core business continuity metrics.",
        "distractor_analysis": {
            "1": "RPO and RTO measure business risk and downtime limits, not the computational runtime speed of backup software agents.",
            "2": "Data retention timelines are governed by legal compliance policies, not the operational definition of RPO and RTO.",
            "3": "Geographic distance between hot sites is dictated by disaster zone guidelines, not RPO/RTO time-based loss metrics."
        }
    },
    {
        "id": "C2N-O-011",
        "objective": "4.3",
        "difficulty": "medium",
        "tags": ["backup-and-recovery", "test-restores", "validation", "audit"],
        "question": "A backup administrator configures automated nightly image backups for 50 virtual servers. The backup dashboard displays green checkmarks indicating all backup jobs completed successfully. What CRITICAL operational procedure must the administrator conduct periodically to ensure data recoverability?",
        "options": [
            "Perform periodic test restores to an isolated sandbox network to verify data integrity and bootability",
            "Delete the previous week's backups to make room for newer checkmarks",
            "Disable encryption on backup volumes to speed up dashboard reporting",
            "Reboot the production database server every hour"
        ],
        "answer": 0,
        "explanation": "A backup is only as good as its restore. Automated backup job success checkmarks only confirm that data blocks were written to media; they do not guarantee that the resulting files, databases, or VM images are uncorrupted and capable of booting cleanly. Conducting periodic test restores in an isolated sandbox environment is the only way to validate true recoverability and measure realistic RTO timelines. Deleting backups, disabling encryption, and hourly reboots are harmful practices.",
        "distractor_analysis": {
            "1": "Deleting historical backups destroys version history and violates mandatory retention compliance guidelines.",
            "2": "Disabling backup encryption exposes sensitive company data to theft if backup tapes or cloud buckets are compromised.",
            "3": "Rebooting live production servers hourly causes severe business interruption without testing the backup restore pipeline."
        }
    },

    # 4.4 Safety procedures and ESD (3 questions: C2N-O-012..014)
    {
        "id": "C2N-O-012",
        "objective": "4.4",
        "difficulty": "medium",
        "tags": ["safety-procedures", "esd", "antistatic-wrist-strap", "hardware"],
        "question": "A technician is preparing to open a desktop chassis to replace the motherboard and RAM. What is the PROPER use of an electrostatic discharge (ESD) antistatic wrist strap?",
        "options": [
            "Attach the conductive strap snugly around the wrist and connect the alligator clip to an unpainted metal surface on the computer chassis while the PC is unplugged from the wall",
            "Attach the alligator clip directly to the hot pin of an active electrical wall outlet",
            "Wear the strap loosely over a long-sleeved wool sweater",
            "Connect the alligator clip directly to the CPU silicon die"
        ],
        "answer": 0,
        "explanation": "An ESD antistatic wrist strap equalizes the electrical potential between the technician's body and the computer equipment, safely draining static charges through a built-in 1-megaohm resistor. The strap must be worn tightly against bare skin, and the alligator clip must be attached to an unpainted metal section of the computer chassis with the power cord disconnected. Attaching clips to live outlets is life-threatening, wearing over clothes prevents skin contact, and clipping to silicon destroys the CPU.",
        "distractor_analysis": {
            "1": "Connecting an alligator clip to a live electrical wall receptacle creates an immediate risk of fatal electrocution.",
            "2": "Wearing the strap over wool clothing prevents direct skin contact, rendering the antistatic conductive band completely useless.",
            "3": "Clipping an alligator clamp to the delicate CPU silicon die causes immediate mechanical cracking and destroys semiconductor traces."
        }
    },
    {
        "id": "C2N-O-013",
        "objective": "4.4",
        "difficulty": "hard",
        "tags": ["safety-procedures", "high-voltage", "psu", "crt", "capacitors"],
        "question": "Which computer components contain high-voltage internal capacitors capable of storing lethal electrical charges even after being disconnected from wall power for days, and should NEVER be disassembled by standard field technicians?",
        "options": [
            "Power Supply Units (PSUs) and legacy CRT display monitors",
            "Solid-State Drives (SSDs) and NVMe cards",
            "DDR4 and DDR5 RAM memory modules",
            "Standard USB mice and keyboards"
        ],
        "answer": 0,
        "explanation": "Power Supply Units (PSUs) and legacy Cathode Ray Tube (CRT) monitors contain large high-voltage filter capacitors capable of storing thousands of volts of electrical charge long after mains power has been disconnected. Disassembling a PSU housing or CRT chassis can deliver a fatal electric shock. Standard technicians must treat PSUs as non-field-serviceable sealed Field Replaceable Units (FRUs) and replace the entire unit. SSDs, RAM, and USB mice operate on low-voltage DC (3.3V-5V) and carry no lethal capacitor charges.",
        "distractor_analysis": {
            "1": "Solid-state drives operate on low-voltage 3.3V / 5V DC power and do not contain lethal high-voltage energy storage capacitors.",
            "2": "DDR RAM modules operate at 1.1V - 1.35V DC and present zero high-voltage electrocution danger to technicians.",
            "3": "USB peripherals utilize standard 5V low-power circuits that carry no capacitor shock hazards."
        }
    },
    {
        "id": "C2N-O-014",
        "objective": "4.4",
        "difficulty": "medium",
        "tags": ["safety-procedures", "fire-safety", "class-c", "extinguisher"],
        "question": "A server power supply in a datacenter rack sparks violently and begins emitting dense smoke and flames. Which type of fire extinguisher is rated specifically for energized electrical equipment fires?",
        "options": [
            "Class C (or multipurpose ABC dry chemical / clean agent clean gas like CO2 or FM-200)",
            "Class A pressurized water extinguisher",
            "Class K wet chemical kitchen extinguisher",
            "A standard bucket of tap water"
        ],
        "answer": 0,
        "explanation": "Fires involving energized electrical equipment (such as servers, wiring, and breaker panels) are designated as Class C fires. Class C extinguishers use non-conductive extinguishing agents such as Carbon Dioxide (CO2), Halon alternatives (FM-200/Novec 1230), or dry chemicals that do not conduct electricity back to the operator. Pressurized water extinguishers (Class A) and buckets of water conduct electricity and cause fatal shocks when applied to energized equipment. Class K is for commercial cooking oils.",
        "distractor_analysis": {
            "1": "Water-based Class A extinguishers conduct electrical current directly back through the stream, posing severe electrocution danger.",
            "2": "Class K wet chemical extinguishers are specifically formulated to saponify commercial cooking fats and grease in restaurant kitchens.",
            "3": "Throwing liquid tap water on energized server racks causes immediate short-circuit electrocution and explosive arcing."
        }
    },

    # 4.5 Environmental impacts and controls (3 questions: C2N-O-015..017)
    {
        "id": "C2N-O-015",
        "objective": "4.5",
        "difficulty": "medium",
        "tags": ["environmental-controls", "sds", "msds", "chemical-safety"],
        "question": "A cleaning solvent is accidentally splashed into a technician's eyes while servicing an enterprise laser printer. Which safety documentation must be immediately referenced to find emergency first-aid and eye flushing instructions?",
        "options": [
            "Safety Data Sheet (SDS / MSDS) for the specific chemical product",
            "Printer Service User Manual troubleshooting appendix",
            "Company Acceptable Use Policy (AUP)",
            "Building Architectural Floorplan Diagram"
        ],
        "answer": 0,
        "explanation": "Safety Data Sheets (SDS), formerly known as Material Safety Data Sheets (MSDS), are federally mandated safety documents provided by chemical manufacturers. Section 4 of an SDS specifically outlines emergency first-aid measures, eye and skin exposure procedures, toxicity hazards, handling precautions, and required PPE. Hardware service manuals cover mechanical gears, AUP covers computer usage policies, and floorplans show physical architectural layouts.",
        "distractor_analysis": {
            "1": "Printer hardware manuals document mechanical disassembly and paper jam clearing, lacking detailed chemical toxicology and first-aid protocols.",
            "2": "Acceptable Use Policies dictate acceptable employee network conduct and provide zero chemical emergency response guidance.",
            "3": "Building floorplans show architectural layouts and fire exits without detailing chemical first-aid treatments."
        }
    },
    {
        "id": "C2N-O-016",
        "objective": "4.5",
        "difficulty": "medium",
        "tags": ["environmental-controls", "battery-disposal", "e-waste", "lead-acid"],
        "question": "A datacenter technician replaces twelve failed Lead-Acid batteries from an Uninterruptible Power Supply (UPS) system. How should these hazardous heavy-metal batteries be disposed of?",
        "options": [
            "Recycled through a licensed environmental hazardous waste / battery recycling facility in compliance with local environmental regulations",
            "Disposed of in standard municipal curbside trash dumpsters",
            "Incinerated in a standard facility waste burn barrel",
            "Crushed in a standard office cardboard compactor"
        ],
        "answer": 0,
        "explanation": "Lead-acid and lithium-ion batteries contain toxic heavy metals (lead, cadmium, lithium) and corrosive sulfuric acid electrolyte that contaminate groundwater and cause landfill fires. Environmental protection regulations (e.g., EPA/RCRA) strictly prohibit disposing of batteries in municipal trash. They must be collected, stored in acid-resistant containers, and handed over to certified environmental recycling facilities. Throwing in dumpsters, burning, or crushing causes severe chemical contamination and toxic fires.",
        "distractor_analysis": {
            "1": "Discarding toxic lead-acid batteries in regular municipal dumpsters violates environmental laws and causes heavy metal groundwater poisoning.",
            "2": "Incinerating batteries releases highly toxic airborne lead fumes and causes explosive battery ruptures.",
            "3": "Crushing lead-acid batteries in compactors releases sulfuric acid and toxic lead compounds, endangering workers and equipment."
        }
    },
    {
        "id": "C2N-O-017",
        "objective": "4.5",
        "difficulty": "hard",
        "tags": ["environmental-controls", "hvac", "humidity", "datacenter-environment"],
        "question": "Why is it critical for datacenter HVAC climate control systems to maintain relative humidity within an optimal range of approximately 40% to 60%?",
        "options": [
            "Low humidity (<30%) drastically increases the risk of Electrostatic Discharge (ESD), while high humidity (>60%) promotes condensation and metal corrosion",
            "Low humidity causes network packets to travel slower over copper cables",
            "High humidity speeds up server CPU clock frequencies",
            "Relative humidity controls the optical wavelength of fiber optic transceivers"
        ],
        "answer": 0,
        "explanation": "Datacenter environmental guidelines (such as ASHRAE TC 9.9) specify keeping relative humidity between 40% and 60% (with controlled dew point). If humidity drops below ~30%, the dry air significantly increases static charge generation, causing destructive ESD events on sensitive server electronics. If humidity rises above ~60-70%, moisture can condense onto cold metal components, causing electrical short circuits and terminal corrosion. Humidity has no effect on packet velocity, CPU clocks, or fiber wavelengths.",
        "distractor_analysis": {
            "1": "Relative humidity has zero effect on the propagation velocity of electromagnetic signals inside copper conductor wires.",
            "2": "Humidity levels do not alter processor silicon clock frequencies or multiplier ratios.",
            "3": "Optical wavelengths in fiber optic transceivers are governed by solid-state laser diodes, completely independent of ambient air humidity."
        }
    },

    # 4.6 Privacy, licensing, policies, and incident response (4 questions: C2N-O-018..021)
    {
        "id": "C2N-O-018",
        "objective": "4.6",
        "difficulty": "hard",
        "tags": ["incident-response", "chain-of-custody", "forensics", "evidence"],
        "question": "A technician acting as a first responder on a compromised workstation secures the physical machine for forensic investigation. Which document MUST be meticulously maintained to track every individual who handled, analyzed, or transferred the physical storage drive?",
        "options": [
            "Chain of Custody form",
            "Request for Change (RFC) document",
            "End-User License Agreement (EULA)",
            "Safety Data Sheet (SDS)"
        ],
        "answer": 0,
        "explanation": "In computer forensics and incident response, a Chain of Custody form is the legal documentation that accounts for the possession, transfer, analysis, and storage of physical or digital evidence from the moment of collection until trial. It records exact dates/times, names, badge numbers, serial numbers, and reasons for evidence custody transfer. Without an unbroken chain of custody, evidence is rendered inadmissible in a court of law. RFCs govern changes, EULAs govern software, and SDS covers chemical safety.",
        "distractor_analysis": {
            "1": "RFC documents are used in change management to request infrastructure modifications, not to track legal evidence possession.",
            "2": "EULAs define software licensing terms and conditions between vendors and customers.",
            "3": "Safety Data Sheets provide chemical hazard and first-aid instructions, having zero forensic evidence tracking utility."
        }
    },
    {
        "id": "C2N-O-019",
        "objective": "4.6",
        "difficulty": "medium",
        "tags": ["incident-response", "first-responder", "prohibited-activity", "policy"],
        "question": "While replacing a broken hard drive on an employee's computer, a technician discovers folders containing explicit illegal content. Following standard incident response procedures, what should the technician do IMMEDIATELY?",
        "options": [
            "Stop working on the system immediately, do not delete or alter any files, secure the workstation, and report the discovery to management / security incident team according to policy",
            "Copy the files to a personal USB flash drive to show coworkers",
            "Delete the offending folders and proceed with the hard drive replacement",
            "Confront the employee directly in front of their colleagues"
        ],
        "answer": 0,
        "explanation": "When encountering illegal material or severe policy violations, the mandatory first-responder procedure is: 1. Immediately cease all interaction with the system to avoid altering file timestamps or evidence, 2. Secure and isolate the device to prevent tampering, and 3. Promptly notify management, corporate legal counsel, and the designated Incident Response / Security team in accordance with organizational policy. Copying data, deleting evidence (spoliation), or confronting the suspect compromises the investigation.",
        "distractor_analysis": {
            "1": "Copying illicit material onto personal media is illegal, spreads contraband, and contaminates the technician with criminal liability.",
            "2": "Deleting folders constitutes spoliation of legal evidence and obstructs forensic and law enforcement investigations.",
            "3": "Confronting the employee tips off the suspect, risking evidence destruction and creating severe workplace conflict."
        }
    },
    {
        "id": "C2N-O-020",
        "objective": "4.6",
        "difficulty": "medium",
        "tags": ["privacy-regulations", "pii", "phi", "gdpr", "compliance"],
        "question": "A database contains customer Social Security numbers, dates of birth, full legal names, and home addresses. Under privacy frameworks (such as GDPR and NIST standards), how is this data categorized?",
        "options": [
            "Personally Identifiable Information (PII)",
            "Protected Health Information (PHI) exclusively",
            "Public Domain open-source telemetry",
            "Non-confidential marketing metadata"
        ],
        "answer": 0,
        "explanation": "Personally Identifiable Information (PII) refers to any data that can be used alone or in combination with other relevant information to identify, contact, or locate a specific individual (e.g., SSNs, full names, birthdates, biometric records, driver's license numbers). Protected Health Information (PHI) specifically involves medical records/health conditions tied to an individual. Public domain data is unrestrictedly open, and marketing metadata is non-identifying aggregate data.",
        "distractor_analysis": {
            "1": "PHI (Protected Health Information) specifically encompasses medical diagnoses, treatment notes, and healthcare billing records governed by HIPAA.",
            "2": "Public domain information is freely publishable without restriction, which is the exact opposite of highly sensitive customer SSNs.",
            "3": "Social Security numbers and residential addresses are strictly confidential regulatory data, not non-confidential marketing telemetry."
        }
    },
    {
        "id": "C2N-O-021",
        "objective": "4.6",
        "difficulty": "medium",
        "tags": ["licensing", "compliance", "commercial-license", "open-source"],
        "question": "A business purchases 50 standalone commercial software licenses for an image editing program. During an internal audit, the IT team discovers the software is installed on 85 corporate workstations. What type of compliance violation has occurred?",
        "options": [
            "Software license compliance violation / under-licensing breach",
            "Denial of Service (DoS) attack",
            "Physical asset theft",
            "Hardware warranty expiration"
        ],
        "answer": 0,
        "explanation": "Software licensing compliance requires organizations to possess valid, legal license entitlements for every active installation of proprietary commercial software. Having 85 active installations with only 50 purchased seats represents an under-licensing breach (software piracy/contract violation) that exposes the company to severe financial penalties and legal liability from vendor audits (e.g., BSA). It is not a DoS attack, physical theft, or warranty expiration.",
        "distractor_analysis": {
            "1": "A Denial of Service attack is a network cyberattack designed to overwhelm system resources, not a software license accounting deficit.",
            "2": "Physical asset theft involves stealing physical hardware devices, whereas under-licensing is an intellectual property contract infringement.",
            "3": "Hardware warranty expiration marks the end of OEM hardware repair coverage and does not relate to software seat count compliance."
        }
    },

    # 4.7 Professionalism and communication (3 questions: C2N-O-022..024)
    {
        "id": "C2N-O-023",
        "objective": "4.7",
        "difficulty": "easy",
        "tags": ["professionalism", "communication", "active-listening", "customer-service"],
        "question": "A frustrated user calls the help desk in an agitated state because a projector failed right before a major executive presentation. Which communication technique should the technician employ FIRST?",
        "options": [
            "Practice active listening: remain calm, do not interrupt, acknowledge the user's urgency with empathy, and clarify the problem concisely",
            "Immediately interrupt the user and explain that projectors fail all the time",
            "Put the user on hold for 15 minutes to allow them to calm down",
            "Argue with the user and state that AV equipment is not IT's responsibility"
        ],
        "answer": 0,
        "explanation": "CompTIA professional communication guidelines emphasize active listening and de-escalation when interacting with distressed or angry customers: maintain a calm, professional tone, allow the customer to explain without interruption, validate their situation with genuine empathy, and ask clarifying diagnostic questions to resolve the issue swiftly. Interrupting, argumentative behavior, or placing agitated users on long holds damages customer rapport and escalates tension.",
        "distractor_analysis": {
            "1": "Interrupting the customer invalidates their concern, creates defensive hostility, and prevents gathering essential troubleshooting details.",
            "2": "Placing an agitated user on an unannounced hold increases customer frustration and delays time-critical presentation support.",
            "3": "Arguing with customers or deflecting responsibility is unprofessional and directly violates customer service standards."
        }
    },
    {
        "id": "C2N-O-022",
        "objective": "4.7",
        "difficulty": "medium",
        "tags": ["professionalism", "jargon", "communication", "clarity"],
        "question": "While explaining a printer connectivity issue to a non-technical marketing executive, how should the technician describe the root cause?",
        "options": [
            "Use clear, plain language avoiding obscure acronyms and technical jargon, explaining that the printer lost its network address assignment",
            "Tell the user that 'the DHCP pool exhausted its lease scope and ARP requests dropped with 100% packet loss on the 802.1Q trunk'",
            "Refuse to explain the issue because non-technical users cannot understand networking",
            "Advise the user to read the IEEE 802.3 Ethernet standards documentation"
        ],
        "answer": 0,
        "explanation": "Professional IT communication requires adapting technical language to the audience. When speaking with non-technical users, technicians should avoid heavy technical jargon, obscure protocol acronyms, and condescending terminology. Explaining concepts clearly in plain terms builds trust and ensures effective communication. Inundating users with low-level protocol acronyms or dismissing their questions violates professional standards.",
        "distractor_analysis": {
            "1": "Overloading non-technical clients with complex networking jargon confuses the customer and hampers collaborative communication.",
            "2": "Refusing to communicate technical status is disrespectful, unhelpful, and fosters a toxic IT-business relationship.",
            "3": "Instructing business executives to review IEEE technical specifications is dismissive and unprofessional."
        }
    },
    {
        "id": "C2N-O-024",
        "objective": "4.7",
        "difficulty": "medium",
        "tags": ["professionalism", "expectations", "follow-up", "documentation"],
        "question": "A technician determines that a replacement laptop display panel must be ordered from the vendor, which will take two business days to arrive. What should the technician communicate to the customer?",
        "options": [
            "Set realistic expectations by explaining the parts timeline, provide a temporary loaner laptop if available, and update the ticket with follow-up milestones",
            "Promise the customer that the laptop will definitely be ready in one hour",
            "Close the ticket immediately and tell the customer to check back next week",
            "Take the user's laptop home over the weekend without logging a ticket"
        ],
        "answer": 0,
        "explanation": "Setting clear and realistic expectations is a fundamental tenet of IT customer service. When parts must be ordered, the technician should provide an honest delivery timeline, offer interim solutions (such as a loaner machine) to maintain user productivity, document the status in the ticketing system, and provide periodic progress updates. Falsely promising unrealistic turnaround times, closing unresolved tickets, or removing hardware off-site violates professional ethics.",
        "distractor_analysis": {
            "1": "Promising a one-hour resolution when parts require two days to ship sets false expectations and destroys customer trust.",
            "2": "Closing active tickets before hardware repair completion distorts service queues and leaves the customer without resolution tracking.",
            "3": "Taking company hardware off-site without authorization violates asset management, security policy, and professional ethics."
        }
    },

    # 4.8 Scripting languages and use cases (3 questions: C2N-O-025..027)
    {
        "id": "C2N-O-025",
        "objective": "4.8",
        "difficulty": "hard",
        "tags": ["scripting", "file-extensions", "powershell", "bash", "python"],
        "question": "A systems administrator is reviewing automated administrative maintenance scripts across Windows and Linux environments. Which script file extension is correctly paired with its native scripting interpreter?",
        "options": [
            "`.ps1` - Microsoft PowerShell",
            "`.sh` - Windows Command Prompt batch processor",
            "`.bat` - Linux Bourne-Again Shell (Bash)",
            "`.py` - AppleScript interpreter"
        ],
        "answer": 0,
        "explanation": "In system administration scripting: `.ps1` files execute in Microsoft PowerShell, `.sh` files are shell scripts executed by Unix/Linux shells (such as Bash), `.bat` and `.cmd` files are legacy batch scripts executed by Windows `cmd.exe`, and `.py` files execute in the Python runtime interpreter. `.vbs` represents VBScript and `.js` represents JavaScript.",
        "distractor_analysis": {
            "1": "`.sh` files are Unix/Linux Bourne/Bash shell scripts, not Windows Command Prompt batch files.",
            "2": "`.bat` files are MS-DOS/Windows batch scripts, whereas Linux uses `.sh` shell scripts.",
            "3": "`.py` files are executed by the Python runtime environment, whereas AppleScript uses `.scpt` or `.applescript`."
        }
    },
    {
        "id": "C2N-O-026",
        "objective": "4.8",
        "difficulty": "medium",
        "tags": ["scripting", "constructs", "variables", "loops", "conditionals"],
        "question": "A technician writes a script that must iterate through a text file containing 100 computer hostnames and execute a ping test on each machine one by one. Which programming construct is used to repeat this operation across the list?",
        "options": [
            "A loop construct (such as a `for` or `foreach` loop)",
            "A constant variable declaration",
            "A comment block (`#` or `REM`)",
            "An environment variable export"
        ],
        "answer": 0,
        "explanation": "A loop construct (such as `for`, `foreach`, or `while`) iterates over a collection or list of items (like 100 hostnames from a file), executing the defined block of commands once for each element in sequence until the collection is exhausted. Constants store immutable single values, comments are non-executing documentation annotations, and environment variables hold global OS session values.",
        "distractor_analysis": {
            "1": "Constants store fixed, non-changing data values and cannot iterate through arrays of hostnames.",
            "2": "Comments provide explanatory notes within source code and are completely ignored by the script interpreter during execution.",
            "3": "Environment variables store global system paths and configuration data rather than executing iterative programming logic."
        }
    },
    {
        "id": "C2N-O-027",
        "objective": "4.8",
        "difficulty": "hard",
        "tags": ["scripting", "data-types", "string", "integer", "boolean"],
        "question": "In a PowerShell or Python script, a variable is assigned the value `$isServerOnline = $true` (or `is_server_online = True`). Which basic computer data type does this variable represent?",
        "options": [
            "Boolean (representing true or false)",
            "Integer (whole numeric value)",
            "Floating-point number (decimal value)",
            "String (text character sequence)"
        ],
        "answer": 0,
        "explanation": "A Boolean data type represents one of two binary truth values: True or False (often represented as 1 or 0). It is universally used in programming and scripting to evaluate conditionals (`if`/`else` statements). Integers represent whole numbers (e.g., 42), floating-point numbers represent decimals (e.g., 3.14), and strings represent alphanumeric text strings enclosed in quotes.",
        "distractor_analysis": {
            "1": "Integers represent whole numbers without decimal points (e.g., -5, 0, 100), not binary True/False logic states.",
            "2": "Floating-point variables represent fractional numbers containing decimal points (e.g., 19.99), not Boolean truth states.",
            "3": "Strings represent character arrays and textual data enclosed in quotation marks (e.g., \"Server01\"), not native Boolean primitives."
        }
    },

    # 4.9 Remote access technologies (3 questions: C2N-O-028..030)
    {
        "id": "C2N-O-028",
        "objective": "4.9",
        "difficulty": "medium",
        "tags": ["remote-access", "rdp", "port-3389", "windows-remote-desktop"],
        "question": "A systems administrator needs to establish a fully encrypted graphical desktop management session into a remote Windows Server across the corporate LAN. Which native protocol and default TCP port does Windows Remote Desktop utilize?",
        "options": [
            "RDP (Remote Desktop Protocol) over TCP port 3389",
            "Telnet over TCP port 23",
            "VNC over TCP port 80",
            "SSH over UDP port 53"
        ],
        "answer": 0,
        "explanation": "Windows Remote Desktop utilizes Microsoft's proprietary Remote Desktop Protocol (RDP), which by default listens on TCP port 3389 (and optionally UDP 3389 for enhanced performance). RDP provides an encrypted, full GUI desktop session. Telnet operates on port 23 in unencrypted plaintext CLI, VNC defaults to TCP port 5900, and SSH operates over TCP port 22 for secure CLI access.",
        "distractor_analysis": {
            "1": "Telnet operates on TCP port 23 and transmits all administrative credentials and commands across the network in unencrypted plaintext.",
            "2": "VNC (Virtual Network Computing) operates by default on TCP port 5900, while port 80 is unencrypted HTTP web traffic.",
            "3": "SSH operates over TCP port 22 for secure command-line administration; UDP 53 is used for DNS queries."
        }
    },
    {
        "id": "C2N-O-029",
        "objective": "4.9",
        "difficulty": "hard",
        "tags": ["remote-access", "msra", "remote-assistance", "rdp-vs-msra"],
        "question": "A help desk technician needs to view an end user's desktop screen and provide guidance while the user remains logged in and actively watching the session. Which Windows built-in tool is designed specifically for this collaborative screen-sharing scenario?",
        "options": [
            "Windows Remote Assistance (`msra.exe`) / Quick Assist",
            "Standard Remote Desktop Connection (`mstsc.exe`)",
            "Secure Shell (`ssh.exe`)",
            "Diskpart (`diskpart.exe`)"
        ],
        "answer": 0,
        "explanation": "Windows Remote Assistance (`msra.exe`) and Quick Assist allow a technician and a remote user to view the same desktop screen simultaneously, share mouse/keyboard control upon user permission, and chat without logging the user out. In contrast, standard Remote Desktop (`mstsc.exe`) locks the local user's screen or disconnects their active interactive console session on client editions of Windows. SSH provides a CLI shell, and Diskpart manages disk partitions.",
        "distractor_analysis": {
            "1": "Standard Remote Desktop (`mstsc.exe`) locks out the local user or terminates their interactive desktop session, preventing collaborative troubleshooting.",
            "2": "SSH (`ssh.exe`) opens a secure command-line terminal session without providing a shared graphical desktop interface.",
            "3": "Diskpart is a command-line disk partitioning and storage configuration utility, completely unrelated to remote desktop assistance."
        }
    },
    {
        "id": "C2N-O-030",
        "objective": "4.9",
        "difficulty": "medium",
        "tags": ["remote-access", "ssh", "port-22", "linux-management"],
        "question": "A systems engineer needs to securely connect to a remote headless Linux database server's command-line shell to modify configuration files over an untrusted network. Which protocol and default port must be used?",
        "options": [
            "SSH (Secure Shell) over TCP port 22",
            "Telnet over TCP port 23",
            "FTP over TCP port 21",
            "TFTP over UDP port 69"
        ],
        "answer": 0,
        "explanation": "SSH (Secure Shell) operates over TCP port 22 and provides strong public-key/password authentication and symmetric encryption for remote command-line access, file transfers (SFTP/SCP), and port forwarding. Telnet (port 23) transmits all session text unencrypted, FTP (port 21) transfers files in plaintext, and TFTP (UDP 69) is a simple unauthenticated UDP file transfer protocol.",
        "distractor_analysis": {
            "1": "Telnet operates on TCP port 23 and transmits all passwords and commands in cleartext, making it insecure for remote administration.",
            "2": "FTP (File Transfer Protocol) runs on port 21 for transferring files and does not provide an interactive remote shell environment.",
            "3": "TFTP (Trivial File Transfer Protocol) uses UDP 69 for basic bootstrap firmware transfers without authentication or shell access."
        }
    },

    # 4.10 Managing artificial intelligence (2 questions: C2N-O-031..032)
    {
        "id": "C2N-O-031",
        "objective": "4.10",
        "difficulty": "hard",
        "tags": ["artificial-intelligence", "data-privacy", "confidentiality", "ip-leakage"],
        "question": "A junior software developer pastes proprietary internal source code and customer database connection strings into a public, consumer-tier Generative AI chatbot to optimize a query. What major enterprise security and privacy risk has occurred?",
        "options": [
            "Data privacy violation and Intellectual Property (IP) exfiltration, as public AI models may store and use user prompt inputs for future model training",
            "An immediate Denial of Service (DoS) attack on the local database server",
            "Physical damage to the developer's laptop processor",
            "A hardware motherboard firmware bricking event"
        ],
        "answer": 0,
        "explanation": "Pasting proprietary source code, credentials, API keys, or Personally Identifiable Information (PII) into public, unvetted consumer AI platforms exposes the organization to massive intellectual property leaks and regulatory compliance violations. Many public AI services retain prompt data to train future models, potentially exposing confidential data to external users. Enterprise AI deployments require data-retention opt-outs and privacy boundaries. It does not cause DoS attacks or hardware processor damage.",
        "distractor_analysis": {
            "1": "Entering text into a public web chatbot does not generate high-volume traffic floods required for a Denial of Service attack on internal database servers.",
            "2": "Web-based AI queries are processed on cloud server clusters and cannot cause physical electrical damage to client workstation processors.",
            "3": "Submitting web prompts does not flash or modify the local computer's motherboard UEFI firmware."
        }
    },
    {
        "id": "C2N-O-032",
        "objective": "4.10",
        "difficulty": "medium",
        "tags": ["artificial-intelligence", "hallucinations", "verification", "copilot"],
        "question": "An IT technician uses an AI assistant to generate a complex PowerShell script for server provisioning. The AI produces code referencing non-existent cmdlet parameters that fail when executed. What AI phenomenon describes this behavior, and what operational procedure MUST the technician always follow?",
        "options": [
            "AI Hallucination; the technician must always review, verify, and test all AI-generated code and configuration scripts in a sandbox before executing in production",
            "Buffer Overflow; the technician should delete the PowerShell application from Windows",
            "Phishing attack; the technician should immediately format the workstation drive",
            "SQL Injection; the technician should replace the server RAM modules"
        ],
        "answer": 0,
        "explanation": "AI Hallucination refers to generative AI models confidently producing plausible-sounding but factually incorrect, synthetically fabricated, or non-existent syntax, commands, or data. IT operational best practices mandate that human engineers treat all AI-generated content as unverified drafts: technicians must critically review the syntax, verify command parameters against official documentation, and rigorously test scripts in an isolated sandbox environment before running them in production.",
        "distractor_analysis": {
            "1": "Buffer overflow is a memory management vulnerability in binary software, not an AI model generating non-existent script parameters.",
            "2": "Phishing is social engineering via deceptive communication; receiving incorrect AI responses is not a phishing attack requiring drive wiping.",
            "3": "SQL injection is a web database attack; erroneous AI script suggestions have zero connection to physical RAM hardware defects."
        }
    }
]

def build_shard():
    final_questions = []
    for q in questions_data:
        obj = q["objective"]
        dom = c2_utils.get_domain(obj)
        notes_ref = c2_utils.get_notes_ref(obj)
        vid_ref = c2_utils.get_video_ref(obj)
        
        item = {
            "exam": "core2",
            "domain": dom,
            "objective": obj,
            "type": "single",
            "difficulty": q.get("difficulty", "medium"),
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "explanation": q["explanation"],
            "distractor_analysis": q["distractor_analysis"],
            "video_reference": vid_ref,
            "notes_reference": notes_ref,
            "tags": q.get("tags", []),
            "id": q["id"]
        }
        final_questions.append(item)
    
    out_file = os.path.join(SHARDS_DIR, "core2_new_opprocedures.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"questions": final_questions}, f, indent=2, ensure_ascii=False)
    print(f"Built {len(final_questions)} questions in {out_file}")

if __name__ == "__main__":
    build_shard()
