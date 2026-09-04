# 32 · Change Management, Asset Management, Safety, Environment & Scripting (Module 22)

**Exam objectives:** Core 2 · 4.1 (asset management documentation) · 4.2 Apply change management procedures · 4.4 Use common safety procedures · 4.5 Summarize environmental impacts and local environmental controls · 4.8 Identify the basics of scripting.

---

# Lesson 22.1 - Change and inventory management

## Change management process
Policies/procedures that **reduce the risk of outages caused by changes**.

| Stage | Content |
|---|---|
| **1. Change request (RFC)** | **Purpose, scope, type** (standard/normal/emergency), **timeline / date & time**, **effect / affected systems & users**, requester |
| **2. Risk analysis** | Identify possible issues; controls/monitors to reduce risk; **cause and effect**; **qualitative** (high/med/low) and **quantitative** (£, hours) analysis; risk level |
| **3. Change board approval** | **CAB - Change Advisory Board** officially approves after review; **standard/pre-approved** and **emergency** changes (incident response) may bypass full board |
| **4. Plan** | Step-by-step implementation; test in sandbox first |
| **5. Rollback / backout plan** | How to revert if it fails; **backup first** |
| **6. Implementation** | In the maintenance window; communicate |
| **7. End-user acceptance** | Verify with users; sign-off |
| **8. Documentation** | Update CMDB, KB, ticket; lessons learned |

Obj 4.2 keywords: request forms, purpose, scope, date/time, affected systems/impact, risk analysis/level, change board approvals, end-user acceptance, rollback plan, sandbox testing, responsible staff member.

## Asset management
- **Inventory** fields: **name, make, model, asset ID (tags/barcodes/RFID), manufacturer, specifications, dates (purchase, warranty), cost, location, assigned user, status**.
- **CMDB** - configuration management database - assets + relationships/configurations.
- **Lifecycle** - **procurement → deployment → maintenance → disposal/destruction**; assigned users; procurement life cycle.
- **Warranty & licensing** - **invoice documentation**, **warranty timelines/paperwork** (know the process to claim), **licence allocations/limits and usage**; software inventory to prove compliance.

---

# Lesson 22.2 - Safety and environmental procedures

## Compliance with regulations
- **Health & safety** law; **building codes**; **fire and electrical** protection; **environmental** regulations for **waste disposal (chemicals, lithium batteries, e-waste)**; local government regulations.

## Electrical safety
- Terms: **current (amps), voltage (volts), resistance (ohms)**; power (watts).
- Tools: **voltage testers**, multimeter, **fuses**, circuit breakers, **grounding** (equipment grounding/earth; ESD grounding).
- **Power handling**: don't overload circuits/strips; **disconnect power before repair**; PSU and CRT/laser fuser hold charge - don't open PSUs; wet hands/floors; **remove jewellery**.
- **Electrical fire**: **CO₂ or dry powder (Class C / UK "electrical")** extinguishers - **NEVER water**.
- **Equipment placement** - stable surfaces, cable management, ventilation, weight limits (racks).

## Other hazard mitigations
- **Trip hazards** - cable management, covers, tidy workspace.
- **Lifting techniques** - **lift with legs, not back**; keep load close; **use multiple people** for heavy items (servers, printers) or a cart; weight limits (~50 lb / 22 kg alone).
- **PPE**: **safety goggles** (dust, chemicals, springs), **mask/air filtration** (toner, dust), gloves, ESD strap.
- Hot components (fuser, CPU) - let cool.

## Environmental impacts & controls
- **Dust cleanup** - mask, **vacuum (toner-safe/ESD)**, **compressed air** (outside/blow-out; not on laser printers), filters.
- **Temperature** - servers/rooms cool; **humidity** - ~**30-50%** (too low = ESD; too high = condensation/corrosion); **ventilation/airflow**; hot/cold aisle; HVAC monitoring.
- **Location/equipment placement**; **proper ventilation**; environmental sensors.

## ESD mitigation (memorise)
- **ESD can damage components** even below the human-perception threshold (~3,000 V felt; damage from tens of volts).
- **ESD strap** (wrist, clipped to ground/chassis), **ESD mat**, **grounded workbench**, **antistatic bags / dissipative packaging** for storage & transport, self-grounding (touch metal chassis), avoid carpets/synthetic clothing, humidity control, handle boards by edges, leave components in bags until needed.

## Building power issues & mitigations
| Problem | Mitigation |
|---|---|
| **Surge / spike** | **Surge suppressor/protector** (joule rating, clamping voltage); replace after big surges |
| **Under-voltage / sag / brownout** | **UPS** (line-interactive/online) conditions and supports |
| **Power failure / blackout** | **UPS** (**battery backup - short-term only, for graceful shutdown/ride-through**), then **generator** (**gas, diesel, propane, natural gas**) for long outages |
| Noise/harmonics | Line conditioner, online UPS |
UPS sizing (VA/W, runtime), management software for auto-shutdown; test batteries.

## Materials handling & disposal
- **MSDS / SDS** - (Material) Safety Data Sheet - **hazards, handling, first aid, cleanup, disposal** for chemicals, toner, batteries; keep accessible.
- **Proper disposal**: **batteries** (lithium/NiCd - recycling centres, never trash/incinerate), **toner cartridges** (recycle/return), **chemicals/solvents** (hazmat), **devices/assets** (e-waste recycling; data destruction first - file 31), CRTs (lead), fluorescent (mercury). Follow local regulations & manufacturer instructions.

---

# Lesson 22.3 - Scripting basics

## What a script is
- **Series of commands executed in order** by an interpreter; **specific to an OS/shell**; written in a text editor or **IDE** (integrated development environment - editor + debugger + tools).

## Script types - memorise the extensions
| Extension | Language | Platform / use |
|---|---|---|
| **.sh** | **Linux/Unix shell** (Bash - Bourne Again Shell; ksh - Korn; zsh) | Linux/macOS automation |
| **.ps1** | **PowerShell** | Windows (and cross-platform) admin - cmdlets `Verb-Noun` |
| **.bat** | **Batch file** (cmd) | Legacy Windows automation |
| **.vbs** | **VBScript** | Legacy Windows (WSH) - deprecated |
| **.py** | **Python** | **General purpose - automation, software apps**; interpreter/**IDLE** IDE; cross-platform |
| **.js** | **JavaScript** | **Web content/apps** (browser, Node.js) |

## Basic constructs
| Construct | Meaning / examples |
|---|---|
| **Comments** | Not executed - `#` (sh/ps1/py), `REM` or `::` (bat), `//` (js) |
| **Variables** | Store values - `$name` (sh/ps1), `%name%` (bat), `name = ` (py); **environment variables** (`%PATH%`, `$HOME`) |
| **Data types** | integer, string, boolean, float, arrays/lists |
| **Branches** | `if / else / elif`, `switch/case` |
| **Loops** | `for`, `while`, `foreach`, `do-until` |
| **Operators** | arithmetic, comparison, logical (below) |
| Functions, input/output, error handling | |

### Comparison & logical operators (deck table)
| Symbol | Bash test switch | Meaning |
|---|---|---|
| **==** | **-eq** | equal |
| **!=** | **-ne** | not equal |
| **<** | **-lt** | less than |
| **>** | **-gt** | greater than |
| **<=** | **-le** | less than or equal |
| **>=** | **-ge** | greater than or equal |
| **&&** | AND | both true |
| **\|\|** | OR | either true |
| **!** | NOT | negate |

## Use cases (obj 4.8)
- **Basic automation**, **restarting machines**, **remapping network drives**, **installation of applications**, **automated backups**, **gathering information/data (inventory)**, **updating system OS and apps**, **API use** (query/automate cloud services), scheduled maintenance, user provisioning.

## Considerations / risks
- **Malware** - scripts can carry/introduce it (unknown source, obfuscated); sign scripts, execution policy (`Set-ExecutionPolicy`).
- **Inadvertent system/settings changes** - test in a sandbox, backups, review before running as admin.
- **Browser or system crashes / resource mishandling** - infinite loops, memory leaks, runaway processes.
- Least privilege for script accounts; logging; version control.

## Self-test
1. Six things a change request must contain; who approves; what may bypass the CAB?
2. Rollback plan vs sandbox testing vs end-user acceptance.
3. Six asset inventory fields; what is a CMDB; asset lifecycle stages.
4. Electrical fire extinguisher types; the one thing never to use.
5. Correct lifting; two PPE items and when.
6. Humidity range and why both extremes are bad.
7. Surge vs sag vs blackout - mitigation for each; UPS vs generator roles.
8. What is an SDS? Where do batteries and toner go?
9. .sh .ps1 .bat .vbs .py .js - language and platform.
10. Bash `-eq -ne -lt -gt -le -ge`; three scripting risks; five use cases.
