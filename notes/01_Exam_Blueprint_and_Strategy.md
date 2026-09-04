# 01 · Exam Blueprint & Strategy

## The two exams

| | Core 1 (220-1201) | Core 2 (220-1202) |
|---|---|---|
| Questions | up to 90 | up to 90 |
| Time | 90 min | 90 min |
| Pass mark | 675 / 900 | 700 / 900 |
| Question types | Multiple choice (single & multiple), drag-and-drop, PBQs | Same |
| Course modules | M01-M10 | M11-M22 |

You must pass **both** to earn the A+. They are independent - book Core 1, pass it, then start Core 2 study.

## Domain weights and what they really mean

### Core 1
| Domain | Weight | Course modules | What the questions look like |
|---|---|---|---|
| 1.0 Mobile Devices | 15% | M09 | Laptop FRU replacement, port replicator vs docking station, cellular/SIM/eSIM, hotspot vs tethering, sync/EMM |
| 2.0 Networking | 20% | M05, M06, M07 | **Ports**, cable categories, Wi-Fi standards, IP addressing, DHCP/DNS, network services, SOHO config |
| 3.0 Hardware | 25% | M02, M03, M10 | Connectors, RAM, storage/RAID, CPU sockets, PSU, **printers** |
| 4.0 Virtualization & Cloud | 11% | M08 | Type 1 vs 2, IaaS/PaaS/SaaS/DaaS, deployment models, cloud characteristics |
| 5.0 HW & Network Troubleshooting | 29% | M01, M04, M07, M09, M10 | Symptom → cause. Largest domain. Methodology order questions. |

### Core 2
| Domain | Weight | Course modules | What the questions look like |
|---|---|---|---|
| 1.0 Operating Systems | 31% | M11-M17 | Windows editions, install/upgrade, **CLI commands**, consoles by filename, Linux/macOS |
| 2.0 Security | 25% | M15, M18, M19, M20 | Social engineering vocab, WPA ladder, NTFS vs share, malware types, SOHO hardening |
| 3.0 Software Troubleshooting | 22% | M14, M19, M20 | Boot failure, BSOD, malware removal **order**, mobile app issues |
| 4.0 Operational Procedures | 22% | M11, M21, M22 | Ticketing, change management, backup types, safety, scripting extensions |

## Question archetypes to recognise

1. **"Which of the following is the BEST / MOST likely / FIRST..."** - CompTIA wants the textbook-methodology answer, not the clever one. If it says FIRST, think step 1 of the relevant procedure.
2. **Port lookup** - direct recall. No partial credit.
3. **Symptom → component** - e.g. "toner smudges off the page" → fuser. Learn the symptom tables in file 08, 16, 21.
4. **Scenario with distractors** - several answers are technically possible; pick the one that matches the course's stated best practice (least privilege, backup first, escalate when out of scope).
5. **Order-the-steps drag & drop** - troubleshooting methodology, laser process, malware removal, DORA, change management, boot sequence.
6. **PBQs** - usually 3-5 at the start. Common ones: configure a SOHO router (SSID/WPA/channel), run CLI diagnostics in a simulated prompt (`ipconfig`, `ping`, `tracert`, `nslookup`), match cable pinouts, match RAID levels, drag ports to services.

## PBQ time management
- PBQs come first and eat time. If one looks long, **flag it and skip**. Do all the multiple choice, then return.
- There is no penalty for wrong answers - never leave a blank.
- PBQs are usually partial-credit. Fill in what you know.

## Study order (Core 1)
1. Ports table (file 12) - start day 1, drill daily.
2. Troubleshooting methodology (file 02).
3. Hardware files 03-08.
4. Networking files 09-13.
5. Files 14-16.
6. Practice questions, then labs 02, 04-08.

## Study order (Core 2)
1. Windows CLI (file 19) + Labs 21-24 in a VM. Highest yield.
2. Consoles by filename (file 19).
3. Windows editions (file 23), NTFS vs share (file 22).
4. Security files 26-30 - vocabulary heavy.
5. Files 17, 18, 20, 21, 24, 25, 31, 32.
6. Practice questions, then labs 09-34.

## The three habits that pass this exam
- **Say it out loud before you look.** Every file ends with self-test questions. Answering aloud without peeking is what moves things to long-term memory.
- **Type every command.** Never just read a command table. Open a VM prompt and type it.
- **Explain the "why" for every "what."** If you can say *why* RAID 5 needs 3 drives, you'll never confuse it with RAID 6.
