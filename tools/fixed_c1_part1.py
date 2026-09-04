#!/usr/bin/env python3
"""Part 1 of fixed Core 1 questions: C1-001 to C1-050."""

PART1_QUESTIONS = [
    {
        "id": "C1-001",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is an environmental threat or phenomenon that damages electronic components rather than a physical tool found in a technician's toolkit?",
        "options": [
            "USB thumb drive with diagnostic utilities",
            "Hex nut driver for motherboard standoffs",
            "Multimeter / voltage tester",
            "Electromagnetic pulse (EMP) discharge"
        ],
        "answer": 3,
        "explanation": "An electromagnetic pulse (EMP) is a sudden burst of electromagnetic radiation that damages or destroys electronic circuits; it is an environmental hazard, not a tool. Diagnostic thumb drives, nut drivers for mounting standoffs, and multimeters/voltage testers are standard physical equipment carried in a technician's toolkit.",
        "distractor_analysis": {
            "0": "USB thumb drives with diagnostic software and bootable ISOs are essential portable tools for field technicians.",
            "1": "Nut drivers are standard mechanical hand tools used to tighten motherboard standoffs and chassis mounting screws.",
            "2": "Multimeters and voltage testers are essential diagnostic electrical tools used to verify AC wall outlets and DC PSU rail voltages."
        },
        "tags": ["tools", "safety", "environmental"]
    },
    {
        "id": "C1-002",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "A datacenter technician needs to measure the AC line voltage and verify proper grounding at a standard commercial wall receptacle. Which tool should the technician use?",
        "options": [
            "Radio frequency interference (RFI) probe",
            "Electrostatic discharge (ESD) field meter",
            "Digital multimeter / voltmeter",
            "Precision mechanical tweezers"
        ],
        "answer": 2,
        "explanation": "A digital multimeter (or dedicated voltmeter/receptacle tester) measures AC voltage, DC voltage, resistance, and circuit continuity, making it the proper tool to verify that an electrical wall outlet supplies expected line voltage (e.g., 120V in North America or 230V in Europe). RFI probes detect wireless electromagnetic interference. ESD field meters measure static charge accumulation. Tweezers are assembly tools that present severe shock hazards if inserted into electrical outlets.",
        "distractor_analysis": {
            "0": "RFI probes measure high-frequency radio signal emissions, not 50/60 Hz AC electrical line power.",
            "1": "ESD field meters measure static electrostatic potential on surfaces, not line voltage from power mains.",
            "3": "Inserting metal tweezers into an energized AC wall receptacle creates a dangerous short circuit and severe electric shock hazard."
        },
        "tags": ["tools", "multimeter", "power", "electrical"]
    },
    {
        "id": "C1-003",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A tier-1 help desk technician is troubleshooting a complex server failure that exceeds their technical expertise and authorization level. According to professional support best practices, what should the technician do next?",
        "options": [
            "Ask the end user for technical advice on how to repair the server",
            "Completely disassemble the server hardware without a diagnostic plan",
            "Inform the customer that the problem is impossible to fix and close the ticket",
            "Escalate the issue to a senior engineer following established support procedures"
        ],
        "answer": 3,
        "explanation": "When an issue falls outside a technician's skill set, access permissions, or organizational scope of practice, the professional and standard procedure is to escalate the ticket to senior engineering or specialized vendor support. Asking the customer for technical instructions is unprofessional, disassembling hardware blindly causes further downtime, and dismissing the problem without escalation damages customer trust.",
        "distractor_analysis": {
            "0": "End users look to IT support for technical solutions; asking them how to fix server infrastructure is unprofessional.",
            "1": "Disassembling complex systems without a tested diagnostic theory wastes time and risks damaging hardware.",
            "2": "Telling a customer a problem cannot be fixed instead of seeking higher-tier engineering support violates SLA and customer service standards."
        },
        "tags": ["troubleshooting", "methodology", "escalation"]
    },
    {
        "id": "C1-004",
        "objective": "3.7",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following computer peripheral devices functions strictly as an output device for presenting data to users?",
        "options": [
            "Studio condenser microphone",
            "Standalone laser printer",
            "USB web camera",
            "Mechanical keyboard"
        ],
        "answer": 1,
        "explanation": "A printer is an output device that converts digital electronic documents into hardcopy physical media. Microphones capture acoustic audio signals into digital data (input), web cameras capture video streams (input), and keyboards capture keystrokes and user commands (input).",
        "distractor_analysis": {
            "0": "A microphone captures analog sound waves and converts them into digital audio data, making it an input device.",
            "2": "A web camera captures optical images and transmits video data into the computer system, making it an input device.",
            "3": "A keyboard sends keystroke scan codes into the operating system, making it a primary human input device."
        },
        "tags": ["hardware", "peripherals", "input-output"]
    },
    {
        "id": "C1-005",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is a specialized AI accelerator processor developed specifically by Google for cloud machine learning workloads rather than a standard commodity PC component?",
        "options": [
            "Graphics Processing Unit (GPU)",
            "Random Access Memory (RAM)",
            "Central Processing Unit (CPU)",
            "Tensor Processing Unit (TPU)"
        ],
        "answer": 3,
        "explanation": "A Tensor Processing Unit (TPU) is a proprietary application-specific integrated circuit (ASIC) custom-built by Google for machine learning and neural network training in cloud datacenters, not a standard commodity PC component. CPUs, GPUs, and RAM modules are the foundational components found in standard personal computers and workstations.",
        "distractor_analysis": {
            "0": "A GPU is a standard PC component responsible for rendering graphics and executing parallel compute tasks.",
            "1": "RAM is the primary volatile system memory installed on every personal computer motherboard.",
            "2": "The CPU is the central processing unit that executes general-purpose operating system and application instructions in every PC."
        },
        "tags": ["hardware", "processors", "cpu", "tpu"]
    },
    {
        "id": "C1-006",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "A community technology center provides public access to shared electronic workbenches, 3D printers, soldering stations, and PC building tools. What term describes this collaborative community workspace?",
        "options": [
            "Makerspace / hackerspace",
            "Server blade chassis",
            "Cleanroom laboratory",
            "Demilitarized zone (DMZ)"
        ],
        "answer": 0,
        "explanation": "A makerspace (or hackerspace) is a collaborative community workspace located in schools, libraries, or public facilities where students, technicians, and hobbyists can gain hands-on experience with computer hardware, electronics, microcontrollers, and fabrication tools at little or no cost. A blade chassis is a datacenter server enclosure, a cleanroom is a sealed facility for silicon manufacturing/drive recovery, and a DMZ is a network perimeter segment.",
        "distractor_analysis": {
            "1": "A server blade chassis is high-density datacenter rack hardware housing modular blade servers, not a community learning space.",
            "2": "A cleanroom is an ultra-filtered industrial laboratory used for semiconductor fabrication or platter-level hard drive recovery.",
            "3": "A DMZ is a physical or logical subnet that exposes external-facing services to an untrusted network like the Internet."
        },
        "tags": ["hardware", "community", "makerspace"]
    },
    {
        "id": "C1-007",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "When a CPU receives binary machine language patterns from system RAM across the data bus, what internal microprocessor component or structure decodes the opcodes into execution micro-operations?",
        "options": [
            "External data bus",
            "General-purpose register",
            "Instruction decoder / microcode table",
            "Address bus transceiver"
        ],
        "answer": 2,
        "explanation": "The instruction decoder (utilizing the internal microcode engine and instruction lookup logic) interprets incoming binary machine code opcodes fetched from memory and translates them into control signals and micro-operations executed by the ALU and execution units. Registers are internal high-speed storage locations. The external data bus transfers data between the CPU and memory controller. The address bus conveys memory physical addresses.",
        "distractor_analysis": {
            "0": "The external data bus consists of physical conductive traces carrying raw binary data between the CPU and RAM, but does not decode instructions.",
            "1": "Registers are tiny, ultra-fast memory cells inside the CPU used to temporarily hold operands and memory pointers during computation.",
            "3": "The address bus carries memory addresses specifying where data should be read from or written to in RAM."
        },
        "tags": ["hardware", "cpu", "architecture", "microcode"]
    },
    {
        "id": "C1-008",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is NOT a recognized CPU Instruction Set Architecture (ISA) standard used in modern computing?",
        "options": [
            "x86 (32-bit IA-32)",
            "x86-64 / AMD64 (64-bit)",
            "ARM / AArch64",
            "x84 architecture"
        ],
        "answer": 3,
        "explanation": "'x84' is a non-existent, fictitious term. The prominent instruction set architectures in modern computing include x86 (the 32-bit architecture originated by Intel), x86-64/AMD64 (the 64-bit extension designed by AMD and adopted industry-wide), and ARM/AArch64 (widely used in mobile, embedded, and modern power-efficient cloud servers).",
        "distractor_analysis": {
            "0": "x86 is the foundational 32-bit instruction set architecture used in personal computers for decades.",
            "1": "x86-64 (AMD64/Intel 64) is the dominant 64-bit processor architecture used in contemporary PC and datacenter x86 servers.",
            "2": "ARM is a widely adopted RISC processor architecture powering smartphones, tablets, and modern cloud server processors."
        },
        "tags": ["hardware", "cpu", "isa", "architecture"]
    },
    {
        "id": "C1-009",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "In the processor model designation 'Intel Core i9-12900K', which component of the alphanumeric string specifies the CPU generation?",
        "options": [
            "Intel (Manufacturer brand)",
            "Core i9 (Product line and tier)",
            "12 (Microprocessor generation)",
            "K (Unlocked multiplier suffix)"
        ],
        "answer": 2,
        "explanation": "In Intel's Core processor naming convention, the first one or two digits of the model number indicate the generation. In 'i9-12900K', '12' represents the 12th Generation Core architecture. 'Intel' is the brand, 'Core i9' is the product brand and performance tier, '900' is the SKU/model number, and 'K' is the suffix designating an unlocked overclocking multiplier.",
        "distractor_analysis": {
            "0": "'Intel' is the corporation name and master brand, not a generation identifier.",
            "1": "'Core i9' designates the performance brand modifier and tier within Intel's product line.",
            "3": "'K' is a product suffix indicating that the processor has an unlocked multiplier for overclocking."
        },
        "tags": ["hardware", "cpu", "intel", "specifications"]
    },
    {
        "id": "C1-010",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician is preparing to unpack and install an expensive server CPU into a motherboard socket. What is the primary safety practice to prevent electrostatic damage to the processor before and during installation?",
        "options": [
            "Work on a grounded ESD mat while wearing an antistatic wrist strap",
            "Connect the OEM CPU cooling fan to power before seating the chip",
            "Pre-apply thermal paste directly into the socket pin holes",
            "Rely entirely on the socket plastic orientation notch for ESD grounding"
        ],
        "answer": 0,
        "explanation": "Working on a dissipative, grounded Electrostatic Discharge (ESD) mat while wearing an antistatic wrist strap bonded to chassis ground equalizes electrical potential and safely drains static charge away from sensitive semiconductor microcircuits. Applying thermal paste into socket pin holes destroys electrical contact and ruins the motherboard. Powering the fan beforehand or relying on plastic alignment notches provides zero ESD protection.",
        "distractor_analysis": {
            "1": "Connecting the cooling fan before the CPU is installed does not provide ESD protection and could cause physical interference during socket latching.",
            "2": "Thermal paste must only be applied between the CPU integrated heat spreader (IHS) and the heatsink base; placing it in the socket pins causes catastrophic electrical faults.",
            "3": "Orientation notches are physical alignment keys that ensure correct socket orientation, not conductive electrical grounds."
        },
        "tags": ["hardware", "cpu", "esd", "safety"]
    },
    {
        "id": "C1-011",
        "objective": "3.3",
        "type": "single",
        "difficulty": "easy",
        "question": "A desktop computer technician is installing a 16 GB DDR4 desktop memory module into a motherboard DIMM slot. How many physical pins does a standard DDR4 desktop DIMM possess?",
        "options": [
            "168 pins",
            "240 pins",
            "288 pins",
            "184 pins"
        ],
        "answer": 2,
        "explanation": "DDR4 desktop unbuffered DIMMs feature 288 pins and a notched keyed edge to prevent insertion into incompatible slots. Legacy DDR3 and DDR2 desktop DIMMs have 240 pins, original DDR DIMMs have 184 pins, and legacy SDR SDRAM DIMMs have 168 pins.",
        "distractor_analysis": {
            "0": "168 pins is the pin count for legacy single data rate (SDR) SDRAM desktop DIMMs.",
            "1": "240 pins is the pin count for DDR2 and DDR3 desktop DIMM modules.",
            "3": "184 pins is the pin count for first-generation DDR (DDR1) desktop DIMMs."
        },
        "tags": ["hardware", "ram", "ddr4", "pin-counts"]
    },
    {
        "id": "C1-012",
        "objective": "1.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which memory form factor is engineered specifically for compact laptops, small-form-factor devices, and thin clients due to its smaller physical dimensions?",
        "options": [
            "Standard desktop unbuffered DIMM",
            "Small Outline Dual In-line Memory Module (SO-DIMM)",
            "Single In-line Memory Module (SIMM)",
            "Registered ECC full-height server DIMM"
        ],
        "answer": 1,
        "explanation": "SO-DIMMs (Small Outline Dual In-line Memory Modules) are approximately half the physical length of standard desktop DIMMs, making them the universal standard memory module form factor for laptops, notebooks, all-in-one PCs, and compact small-form-factor systems. Desktop DIMMs, SIMMs, and full-height server DIMMs are physically too large to fit into laptop chassis.",
        "distractor_analysis": {
            "0": "Desktop DIMMs are full-length modules designed for desktop ATX and microATX motherboards, unable to fit into laptop memory slots.",
            "2": "SIMMs are obsolete 30-pin and 72-pin memory modules from legacy 1990s personal computers.",
            "3": "Registered ECC server DIMMs are full-height enterprise modules designed for multi-socket rackmount servers."
        },
        "tags": ["mobile", "laptop", "ram", "so-dimm"]
    },
    {
        "id": "C1-013",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A server administrator requires memory modules that detect single-bit and multi-bit memory errors and automatically correct single-bit errors on the fly to prevent server crashes. What type of RAM must be specified?",
        "options": [
            "Non-ECC unbuffered desktop RAM",
            "Error-Correcting Code (ECC) RAM",
            "Single-channel dynamic RAM",
            "Double-sided consumer RAM"
        ],
        "answer": 1,
        "explanation": "Error-Correcting Code (ECC) RAM includes extra memory bits and dedicated controller logic that calculate checksums to detect and correct single-bit memory corruption in real time, as well as detect multi-bit errors and halt safely. This is critical for enterprise datacenter servers and mission-critical financial systems. Non-ECC RAM lacks error correction. Channel configurations and double-sided physical layouts do not provide error correction.",
        "distractor_analysis": {
            "0": "Non-ECC RAM cannot detect or correct memory bit flips, which can lead to silent data corruption or blue-screen system crashes.",
            "2": "Single-channel describes memory bus architecture width (64 bits), not data integrity error detection capabilities.",
            "3": "Double-sided RAM refers to memory chips being mounted on both physical sides of the PCB, which is unrelated to error correction."
        },
        "tags": ["hardware", "ram", "ecc", "data-integrity"]
    },
    {
        "id": "C1-014",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "When populating RAM modules on a newly assembled motherboard to enable multi-channel memory performance, what documentation should the technician consult to determine the exact slot population order?",
        "options": [
            "Motherboard manufacturer user manual / technical specification guide",
            "Operating system installation media documentation",
            "Power supply modular cable pinout diagram",
            "Computer case chassis front-panel wiring sheet"
        ],
        "answer": 0,
        "explanation": "The motherboard manufacturer's manual explicitly defines the recommended memory slot population order (such as slots DIMM_A2 and DIMM_B2 for dual-channel operation) and supported speeds. Following manufacturer specifications ensures optimal stability and enables multi-channel bandwidth. OS documentation, PSU diagrams, and chassis wiring sheets do not contain motherboard memory trace routing rules.",
        "distractor_analysis": {
            "1": "Operating system manuals explain software installation and kernel settings, not motherboard-specific physical memory slot population topologies.",
            "2": "Power supply cable diagrams detail voltage rails and modular connector pinouts, having no information on RAM channeling.",
            "3": "Chassis front-panel wiring diagrams show power switch and LED header connections, not memory configuration."
        },
        "tags": ["hardware", "ram", "motherboard", "best-practices"]
    },
    {
        "id": "C1-015",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A workstation running memory-intensive CAD software experiences significant performance slowdowns and constant drive thrashing due to heavy paging to the virtual memory swap file. What is the most effective hardware upgrade to resolve this bottleneck?",
        "options": [
            "Install additional physical RAM to reduce paging to secondary storage",
            "Disable virtual memory entirely in the operating system advanced settings",
            "Downgrade to an older single-core processor with higher clock frequency",
            "Replace the existing motherboard with a smaller Mini-ITX form factor"
        ],
        "answer": 0,
        "explanation": "When physical RAM is exhausted, the operating system pages inactive memory pages to the disk (virtual memory/swap file), which causes severe performance degradation (disk thrashing) because storage access latency is orders of magnitude slower than physical RAM. Adding more physical RAM ensures applications remain in high-speed system memory, eliminating page thrashing. Disabling virtual memory causes crashes. CPU downgrades or changing form factors do not alleviate memory exhaustion.",
        "distractor_analysis": {
            "1": "Disabling virtual memory when physical memory is already constrained leads to out-of-memory errors and immediate application crashes.",
            "2": "Downgrading the CPU reduces processing capability and does nothing to solve physical memory capacity constraints.",
            "3": "Switching to a Mini-ITX motherboard typically reduces the number of available DIMM slots, making memory expansion even harder."
        },
        "tags": ["hardware", "ram", "virtual-memory", "troubleshooting"]
    },
    {
        "id": "C1-016",
        "objective": "5.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician is following the CompTIA Troubleshooting Methodology to resolve intermittent memory errors. The technician has identified the problem, established a theory of probable cause (unseated RAM), and successfully tested the theory. What is the NEXT step in the methodology?",
        "options": [
            "Establish a plan of action to resolve the problem and implement the solution",
            "Document findings, actions, and outcomes in the ticketing system",
            "Question the user about environmental and software changes",
            "Verify full system functionality and implement preventive measures"
        ],
        "answer": 0,
        "explanation": "The CompTIA 6-step Troubleshooting Methodology proceeds in order: (1) Identify the problem, (2) Establish a theory of probable cause, (3) Test the theory to determine cause, (4) Establish a plan of action to resolve the problem and implement the solution, (5) Verify full system functionality and implement preventive measures, and (6) Document findings, actions, and outcomes. After testing and confirming the theory, the technician must establish a plan of action and implement the solution (reseating or replacing the RAM).",
        "distractor_analysis": {
            "1": "Documenting findings is Step 6, the final step performed after the issue is fully resolved, verified, and closed.",
            "2": "Questioning the user is part of Step 1 (Identify the problem), which occurred at the very start of troubleshooting.",
            "3": "Verifying full system functionality is Step 5, performed after the solution has been implemented in Step 4."
        },
        "tags": ["troubleshooting", "methodology", "comptia"]
    },
    {
        "id": "C1-017",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "Firmware routines stored permanently in non-volatile ROM/Flash chips on a motherboard that provide basic low-level hardware abstraction and communication before an OS loads are known as:",
        "options": [
            "Power-On Self-Test (POST) diagnostic scripts",
            "System BIOS / UEFI firmware services",
            "Complementary Metal-Oxide Semiconductor (CMOS) volatile RAM",
            "Operating system ring-0 kernel device drivers"
        ],
        "answer": 1,
        "explanation": "System BIOS (Basic Input/Output System) and modern UEFI firmware contain firmware routines/services that initialize hardware, provide low-level abstraction, and facilitate early communication between motherboard hardware components before the operating system boots. POST is the diagnostic self-test run by BIOS. CMOS is the small volatile memory that holds user settings. OS device drivers execute after the operating system kernel is initialized.",
        "distractor_analysis": {
            "0": "POST is a diagnostic routine executed during startup to verify essential hardware components, not the general firmware interface itself.",
            "2": "CMOS is the volatile memory chip historically used to store BIOS setup parameters, powered by a coin-cell battery.",
            "3": "OS device drivers are software modules loaded by the operating system to interact with hardware, not firmware stored on motherboard ROM."
        },
        "tags": ["hardware", "bios", "uefi", "firmware"]
    },
    {
        "id": "C1-018",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following critical diagnostic programs is stored directly inside the motherboard BIOS/UEFI firmware chip?",
        "options": [
            "Power-On Self-Test (POST)",
            "Central Processing Unit (CPU) silicon die",
            "CR2032 lithium coin-cell battery",
            "Real-Time Clock (RTC) crystal oscillator"
        ],
        "answer": 0,
        "explanation": "The Power-On Self-Test (POST) is a firmware routine embedded directly within the BIOS/UEFI flash memory chip on the motherboard. Upon power-on, POST verifies system hardware (CPU, RAM, video, keyboard) before handing off control to the bootloader. The CPU is seated in the socket, the CR2032 battery is a physical power cell mounted on the PCB, and the RTC crystal is a discrete timing component.",
        "distractor_analysis": {
            "1": "The CPU is a separate microprocessor installed into the motherboard socket, not software contained inside the BIOS firmware chip.",
            "2": "The CR2032 battery is an external lithium cell mounted on the motherboard to provide continuous power to volatile CMOS/RTC settings.",
            "3": "The RTC crystal is a physical quartz oscillator on the motherboard circuit board, not a program inside firmware."
        },
        "tags": ["hardware", "bios", "post", "firmware"]
    },
    {
        "id": "C1-019",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the primary function of the Power-On Self-Test (POST) during computer startup?",
        "options": [
            "It conducts initial hardware diagnostic checks before booting the operating system",
            "It serves as a secondary expansion card to benchmark 3D graphics rendering",
            "It supplies regulated +12V DC power to the processor VRM circuits",
            "It encrypts local storage drive sectors using BitLocker hardware keys"
        ],
        "answer": 0,
        "explanation": "The primary role of POST is to perform rapid pre-boot hardware diagnostic checks on critical subsystems (CPU registers, system memory, video controller, firmware integrity) to verify system viability before attempting to load the operating system bootloader. POST is firmware, not a graphics card; power is supplied by the PSU/VRM; and disk encryption is handled by BitLocker/TPM.",
        "distractor_analysis": {
            "1": "POST is a firmware routine inside BIOS, not an add-in PCIe graphics card used for 3D rendering.",
            "2": "The power supply unit (PSU) and motherboard voltage regulator modules (VRMs) supply DC power, not POST.",
            "3": "Storage encryption is managed by disk encryption software and TPM security chips, not basic POST routines."
        },
        "tags": ["troubleshooting", "post", "hardware", "boot"]
    },
    {
        "id": "C1-020",
        "objective": "5.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A workstation fails to display any video on screen during power-on, and the motherboard speaker emits a specific series of beep codes. Which subsystem failure is most commonly indicated by pre-video POST beep codes?",
        "options": [
            "Video adapter or system RAM initialization failure",
            "Missing USB mouse or keyboard device",
            "Shared network printer offline",
            "Operating system partition file system corruption"
        ],
        "answer": 0,
        "explanation": "POST beep codes are designed to signal catastrophic hardware failures that occur before the video display subsystem can be initialized (such as faulty/unseated video adapters, missing/corrupted RAM, or motherboard faults). Missing USB mice or network printers do not halt POST with fatal beep codes, and OS partition corruption occurs later during the bootloader stage with on-screen error messages.",
        "distractor_analysis": {
            "1": "Missing USB input devices are either ignored or produce on-screen warning messages once the display initializes, rather than fatal beep codes.",
            "2": "Network printer issues have no impact on local workstation motherboard POST execution.",
            "3": "Operating system corruption occurs after POST passes and the BIOS hands control to the drive boot sector."
        },
        "tags": ["troubleshooting", "post", "beep-codes", "hardware"]
    },
    {
        "id": "C1-021",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "How does a technician typically enter the UEFI/BIOS Setup utility on a standard PC during power-on?",
        "options": [
            "Press the designated manufacturer function key (e.g., F2, F12, or Del) during initial startup",
            "Press and hold the physical power button on the chassis for 30 seconds while running Windows",
            "Unplug the AC power cord while the system is running and reconnect it immediately",
            "Type a setup command at the Windows operating system command prompt without administrative rights"
        ],
        "answer": 0,
        "explanation": "Entering the BIOS/UEFI setup utility requires pressing a specific key designated by the motherboard manufacturer (commonly Del, F2, F10, or F12) immediately after powering on the computer before the OS bootloader initializes. Holding the power button forces an emergency hard shutdown. Unplugging power can cause disk corruption. Standard Windows CLI prompts require specific commands and reboot parameters (e.g., shutdown /r /fw).",
        "distractor_analysis": {
            "1": "Holding down the power button forces a hard power cutoff, potentially corrupting active disk write operations.",
            "2": "Disconnecting AC power abruptly causes power loss without entering firmware setup.",
            "3": "Standard command prompt execution without specific UEFI reboot flags cannot launch firmware menus while Windows is running."
        },
        "tags": ["hardware", "bios", "uefi", "configuration"]
    },
    {
        "id": "C1-022",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A system administrator needs to prevent unauthorized users in a public computer lab from booting an operating system or accessing local data without authentication. Which firmware security setting should be configured in UEFI/BIOS?",
        "options": [
            "Configure a BIOS/UEFI User / Power-On boot password",
            "Flash the motherboard firmware to a beta version",
            "Remove the CR2032 CMOS battery from the motherboard",
            "Change the display refresh rate from 60 Hz to 120 Hz"
        ],
        "answer": 0,
        "explanation": "Configuring a User (or Power-On / Boot) password in the BIOS/UEFI setup prevents the computer from loading the operating system or accessing drives until the correct password is entered during POST. Flashing firmware updates code but does not restrict boot access. Removing the CMOS battery resets settings. Display refresh rates only affect monitor scanning speed.",
        "distractor_analysis": {
            "1": "Flashing firmware updates code features and security patches, but does not enforce pre-boot authentication.",
            "2": "Removing the CMOS battery resets volatile firmware settings to factory defaults and disables security passwords on older systems.",
            "3": "Display refresh rate is a video timing parameter with no relation to boot security or access control."
        },
        "tags": ["hardware", "bios", "security", "passwords"]
    },
    {
        "id": "C1-023",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "Which firmware security feature built into UEFI environments prevents unauthorized operating systems, bootloaders, and rootkits from executing at startup by verifying digital signatures against trusted keys?",
        "options": [
            "Secure Boot",
            "Fast Boot",
            "Wake-on-LAN (WoL)",
            "Hyper-Threading"
        ],
        "answer": 0,
        "explanation": "Secure Boot is a UEFI security standard that ensures a system boots using only software and kernel drivers that are trusted by the Original Equipment Manufacturer (OEM), checking digital signatures of bootloaders and option ROMs against stored PKI certificates. Fast Boot skips certain hardware initialization steps to decrease boot times. Wake-on-LAN powers on systems via network magic packets. Hyper-Threading creates logical CPU cores.",
        "distractor_analysis": {
            "1": "Fast Boot optimizes boot speed by bypassing full peripheral self-checks, offering no digital signature verification.",
            "2": "Wake-on-LAN allows a sleeping computer to be powered on remotely via an Ethernet network packet.",
            "3": "Hyper-Threading is a CPU architectural feature that presents two logical execution threads per physical core."
        },
        "tags": ["hardware", "uefi", "secure-boot", "security"]
    },
    {
        "id": "C1-024",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which dedicated hardware microchip installed on modern motherboards securely generates, stores, and protects cryptographic keys, platform certificates, and biometric measurements used for full disk encryption?",
        "options": [
            "Trusted Platform Module (TPM)",
            "Real-Time Clock (RTC)",
            "Complementary Metal-Oxide Semiconductor (CMOS)",
            "Serial Peripheral Interface (SPI) flash chip"
        ],
        "answer": 0,
        "explanation": "A Trusted Platform Module (TPM) is a dedicated international standard microcontroller designed to provide hardware-based cryptographic operations, secure key generation, platform integrity measurements, and tamper-resistant storage for encryption systems like BitLocker and Measured Boot. The RTC maintains time, CMOS stores legacy settings, and SPI flash holds firmware code.",
        "distractor_analysis": {
            "1": "The RTC maintains system time and date, not cryptographic encryption keys.",
            "2": "CMOS is volatile memory holding legacy configuration data, lacking cryptographic encryption processors.",
            "3": "The SPI flash chip holds the binary BIOS/UEFI firmware image, not protected cryptographic encryption keys."
        },
        "tags": ["hardware", "tpm", "security", "encryption"]
    },
    {
        "id": "C1-025",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician flashes the motherboard firmware to the latest version. What is the primary operational benefit and purpose of performing a BIOS/UEFI firmware update?",
        "options": [
            "To add support for newer CPU models, improve system stability, and patch firmware security vulnerabilities",
            "To permanently increase the physical capacity of installed DDR4 RAM modules",
            "To convert an analog VGA video port into a digital HDMI connector",
            "To repair physical bad sectors on a mechanical hard drive"
        ],
        "answer": 0,
        "explanation": "Firmware updates provide microcode updates to support newly released CPU models, enhance memory timing stability, fix known hardware bugs, and patch firmware-level security vulnerabilities. Firmware cannot change physical hardware dimensions, expand RAM capacity, alter physical video port pinouts, or fix physical platter defects on hard drives.",
        "distractor_analysis": {
            "1": "Physical RAM capacity is determined by the memory chips soldered onto the DIMMs, which cannot be expanded by software or firmware.",
            "2": "Physical video ports and their electrical wiring cannot be modified by updating system firmware.",
            "3": "Physical platter bad sectors on a hard drive are magnetic hardware defects that cannot be repaired by a motherboard BIOS flash."
        },
        "tags": ["hardware", "bios", "firmware", "upgrade"]
    },
    {
        "id": "C1-026",
        "objective": "3.5",
        "type": "single",
        "difficulty": "hard",
        "question": "Which of the following describes the potential danger of an unexpected power outage occurring midway through a BIOS/UEFI firmware flashing process?",
        "options": [
            "The motherboard firmware chip may become corrupted, leaving the system in an unbootable bricked state",
            "The computer's liquid crystal display panel will permanently crack",
            "The power supply unit will reverse its output polarity and destroy connected USB devices",
            "The network interface card MAC address will be permanently deleted from the switch"
        ],
        "answer": 0,
        "explanation": "Flashing overwrites the non-volatile EEPROM/flash memory that contains the boot initialization code. If power is interrupted mid-flash, incomplete or corrupt code is written, leaving the motherboard unable to execute POST or boot (bricked), unless the board has a dual-BIOS or dedicated hardware flashback recovery mechanism. Power cuts during flashing do not crack LCDs, invert PSU polarity, or erase network switch MAC tables.",
        "distractor_analysis": {
            "1": "Power failure during firmware flashing has no physical or mechanical impact on the LCD display panel.",
            "2": "Power supplies operate on independent voltage regulation circuitry; a firmware crash cannot invert electrical polarity.",
            "3": "Network switches dynamically rebuild MAC address tables, and hardware MAC addresses are burned into NIC ROMs, unaffected by motherboard flashing."
        },
        "tags": ["hardware", "bios", "flashing", "troubleshooting"]
    },
    {
        "id": "C1-027",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician is selecting a motherboard form factor for a high-performance datacenter workstation requiring four PCIe 4.0 expansion cards and four memory channels. Which standard desktop motherboard form factor measures 12 x 9.6 inches and provides the maximum expansion slots?",
        "options": [
            "Advanced Technology Extended (ATX)",
            "Mini-ITX",
            "MicroATX",
            "Nano-ITX"
        ],
        "answer": 0,
        "explanation": "Standard ATX motherboards measure 12 x 9.6 inches (305 x 244 mm) and typically offer up to seven expansion slots, providing maximum flexibility for multiple GPUs, sound cards, and storage controllers. MicroATX measures 9.6 x 9.6 inches with up to four slots, Mini-ITX measures 6.7 x 6.7 inches with only one slot, and Nano-ITX is an ultra-small embedded form factor.",
        "distractor_analysis": {
            "1": "Mini-ITX is a compact form factor (6.7 x 6.7 inches) supporting only one single PCIe expansion slot.",
            "2": "MicroATX measures 9.6 x 9.6 inches and supports a maximum of four expansion slots, fewer than standard ATX.",
            "3": "Nano-ITX is a very small embedded form factor (4.7 x 4.7 inches) intended for specialized industrial and IoT appliances."
        },
        "tags": ["hardware", "motherboards", "form-factors", "atx"]
    },
    {
        "id": "C1-028",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the primary physical dimension and expansion slot limitation of a Mini-ITX motherboard compared to standard ATX?",
        "options": [
            "It measures 6.7 x 6.7 inches and typically features only a single PCIe expansion slot",
            "It requires three separate 24-pin ATX main power connectors to boot",
            "It cannot support 64-bit multi-core processors or solid-state storage",
            "It uses liquid nitrogen cooling by default instead of standard heatsinks"
        ],
        "answer": 0,
        "explanation": "Mini-ITX motherboards measure 6.7 x 6.7 inches (170 x 170 mm) and are designed for space-constrained, small-form-factor builds, featuring exactly one PCIe expansion slot and usually two RAM slots. Mini-ITX boards use standard 24-pin power connectors, fully support modern 64-bit CPUs and SSDs, and utilize standard air or liquid cooling solutions.",
        "distractor_analysis": {
            "1": "Mini-ITX motherboards use a single standard 24-pin ATX power connector (or external DC adapter), not three connectors.",
            "2": "Mini-ITX boards support standard modern high-performance 64-bit multi-core CPUs and NVMe SSDs.",
            "3": "Mini-ITX boards utilize standard copper/aluminum heatsinks or all-in-one liquid coolers, not liquid nitrogen."
        },
        "tags": ["hardware", "motherboards", "mini-itx", "form-factors"]
    },
    {
        "id": "C1-029",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "Which motherboard component or chipset bus architecture historically managed high-speed communication between the CPU, system RAM, and the primary PCIe x16 graphics slot?",
        "options": [
            "Northbridge controller",
            "Southbridge controller",
            "Super I/O controller",
            "Platform Controller Hub legacy serial bridge"
        ],
        "answer": 0,
        "explanation": "In traditional PC motherboard chipset architecture, the Northbridge (or Memory Controller Hub) handled high-speed communication between the CPU, RAM, and high-speed PCIe/AGP graphics. (In modern CPUs, these Northbridge functions are fully integrated directly into the processor die). The Southbridge managed slower peripherals (USB, SATA, audio, legacy PCI). The Super I/O chip handles legacy serial, parallel, and sensor interfaces.",
        "distractor_analysis": {
            "1": "The Southbridge managed lower-speed peripheral connections, including SATA storage, USB ports, onboard audio, and legacy expansion buses.",
            "2": "The Super I/O controller manages low-bandwidth legacy ports such as PS/2, serial COM ports, floppy drives, and temperature sensors.",
            "3": "The Platform Controller Hub (PCH) replaced the Southbridge in modern unified chipset designs."
        },
        "tags": ["hardware", "chipsets", "northbridge", "architecture"]
    },
    {
        "id": "C1-030",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which PCIe expansion slot configuration provides the highest raw bandwidth for modern discrete graphics cards and high-speed NVMe RAID adapter cards?",
        "options": [
            "PCIe x16 slot",
            "PCIe x1 slot",
            "PCIe x4 slot",
            "Legacy PCI 32-bit slot"
        ],
        "answer": 0,
        "explanation": "A PCIe x16 slot contains 16 full-duplex differential data lanes, providing the highest throughput of standard PCIe slot configurations and serving as the universal standard for discrete graphics cards and high-bandwidth expansion adapters. PCIe x1 and x4 slots have fewer lanes and lower total bandwidth. Legacy 32-bit PCI is a slow, obsolete parallel bus sharing 133 MB/s total.",
        "distractor_analysis": {
            "1": "PCIe x1 features only one data lane, providing 1/16th of the bandwidth of an x16 slot, typically used for network cards or sound cards.",
            "2": "PCIe x4 provides four data lanes, commonly used for storage expansion cards and capture cards, but less bandwidth than an x16 slot.",
            "3": "Legacy 32-bit PCI is an obsolete parallel bus limited to 133 MB/s shared among all devices on the bus."
        },
        "tags": ["hardware", "pcie", "expansion-cards", "bandwidth"]
    },
    {
        "id": "C1-031",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician is installing an expansion card into a PCIe slot. What physical feature of the PCI Express standard allows a smaller PCIe card (such as a PCIe x4 card) to be installed into a larger physical slot (such as a PCIe x16 slot)?",
        "options": [
            "Up-plugging compatibility in the PCIe serial point-to-point architecture",
            "PCI parallel bus bridging and termination",
            "AGP Universal Voltage keying switches",
            "Direct IDE ribbon cable jumper adaptation"
        ],
        "answer": 0,
        "explanation": "PCI Express is a serial point-to-point architecture that supports up-plugging: a card with fewer lanes (e.g., x1 or x4) can be physically installed and operated in any slot with equal or greater lane count (e.g., x8 or x16), and the link will automatically negotiate to the card's maximum supported lane width. Parallel bus bridging, AGP voltage keys, and IDE jumpers do not apply to PCI Express.",
        "distractor_analysis": {
            "1": "PCIe is a serial point-to-point packetized bus, not a shared parallel bus requiring termination resistors.",
            "2": "AGP voltage keying was a mechanism used in legacy 1990s AGP slots to prevent 3.3V and 1.5V card mismatches.",
            "3": "IDE jumpers configured master/slave relationships on legacy parallel ATA ribbon cables, completely unrelated to PCIe."
        },
        "tags": ["hardware", "pcie", "expansion-slots", "compatibility"]
    },
    {
        "id": "C1-032",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which motherboard CPU socket architecture features physical spring-loaded contact pins mounted inside the motherboard socket while the underside of the processor has flat gold contact pads?",
        "options": [
            "Land Grid Array (LGA)",
            "Pin Grid Array (PGA)",
            "Ball Grid Array (BGA)",
            "Single Edge Contact Cartridge (SECC)"
        ],
        "answer": 0,
        "explanation": "In a Land Grid Array (LGA) socket (standard for modern Intel desktop CPUs and AMD AM5 / EPYC / Threadripper processors), the delicate contact pins reside on the motherboard socket itself, while the underside of the CPU features flat gold contact pads (lands). Pin Grid Array (PGA) has pins on the CPU. Ball Grid Array (BGA) is permanently soldered. SECC is an obsolete cartridge format.",
        "distractor_analysis": {
            "1": "Pin Grid Array (PGA) sockets have holes that receive physical pins protruding from the bottom of the CPU package.",
            "2": "Ball Grid Array (BGA) packages are surface-mounted and soldered directly to the motherboard PCB using solder balls.",
            "3": "Single Edge Contact Cartridge (SECC) is a legacy late-1990s cartridge design used for Pentium II and III processors."
        },
        "tags": ["hardware", "cpu", "sockets", "lga", "pga"]
    },
    {
        "id": "C1-033",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which CPU socket type features physical pins extending from the underside of the CPU package that insert into corresponding pin holes on the motherboard socket and lock via a Zero Insertion Force (ZIF) lever?",
        "options": [
            "Pin Grid Array (PGA)",
            "Land Grid Array (LGA)",
            "Ball Grid Array (BGA)",
            "Surface-Mount Device (SMD)"
        ],
        "answer": 0,
        "explanation": "In a Pin Grid Array (PGA) design (used by legacy Intel and AMD AM4 processors), the pins are attached to the underside of the CPU package and mate with holes in the motherboard socket, secured with a Zero Insertion Force (ZIF) lever. LGA places the pins on the socket. BGA is soldered to the board. SMD is a generic component mounting classification.",
        "distractor_analysis": {
            "1": "Land Grid Array (LGA) features flat contact pads on the processor and pins in the socket, the inverse of PGA.",
            "2": "Ball Grid Array (BGA) processors are permanently soldered to the motherboard during manufacturing and cannot be replaced via socket levers.",
            "3": "Surface-Mount Device (SMD) describes electronic components soldered directly to PCB pads, not a CPU socket standard."
        },
        "tags": ["hardware", "cpu", "pga", "sockets"]
    },
    {
        "id": "C1-034",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician is installing an enterprise CPU onto a high-performance motherboard. What substance must be applied between the top of the CPU integrated heat spreader (IHS) and the base of the heatsink to eliminate microscopic air gaps?",
        "options": [
            "Thermal paste / thermal interface material (TIM)",
            "Dielectric silicone adhesive sealant",
            "Mineral oil immersion fluid",
            "Cyanoacrylate super glue"
        ],
        "answer": 0,
        "explanation": "Thermal Interface Material (TIM / thermal paste) fills microscopic imperfections and air pockets between the CPU integrated heat spreader (IHS) and the metal base of the heatsink. Because air is a terrible thermal conductor, TIM provides high thermal conductivity to efficiently transfer heat away from the processor. Adhesives, mineral oil, and glue are improper and can destroy hardware.",
        "distractor_analysis": {
            "1": "Silicone adhesive sealants are rubberizing insulators that act as thermal barriers and glue components permanently.",
            "2": "Mineral oil is used in specialized whole-system submersion cooling tanks, not as a concentrated thermal compound between CPU and heatsink.",
            "3": "Cyanoacrylate glue permanently bonds surfaces, provides poor thermal conduction, and destroys the CPU upon removal."
        },
        "tags": ["hardware", "cpu", "cooling", "thermal-paste"]
    },
    {
        "id": "C1-035",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following thermal cooling solutions utilizes a closed loop containing a water block, liquid coolant, a motorized pump, tubing, and an external radiator with fans to dissipate processor heat?",
        "options": [
            "All-In-One (AIO) liquid cooling system",
            "Passive aluminum finned heatsink",
            "Single-phase phase-change refrigeration compressor",
            "Standard passive copper heat pipe array"
        ],
        "answer": 0,
        "explanation": "An All-In-One (AIO) liquid cooling system circulates liquid coolant through a closed loop: a pump-integrated water block absorbs heat from the CPU, tubes carry the heated fluid to a radiator, and fans blow air across the radiator fins to dissipate heat before returning the cooled liquid to the block. Passive heatsinks and heat pipes rely solely on air convection without pumps or liquid loops.",
        "distractor_analysis": {
            "1": "Passive heatsinks rely purely on natural thermal conduction and case airflow without pumps, tubing, or liquid loops.",
            "2": "Phase-change systems use active vapor-compression refrigeration compressors, which are complex industrial units rarely used in standard PCs.",
            "3": "Heat pipes use small sealed copper tubes containing a phase-change fluid that evaporates and condenses internally, but lack external pumps and radiators."
        },
        "tags": ["hardware", "cooling", "liquid-cooling", "aio"]
    },
    {
        "id": "C1-036",
        "objective": "3.6",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the primary main power connector used to supply DC power from a modern ATX power supply to the system motherboard?",
        "options": [
            "24-pin ATX main power connector (20+4 pin)",
            "4-pin peripheral Molex connector",
            "15-pin SATA power connector",
            "6-pin PCIe auxiliary power cable"
        ],
        "answer": 0,
        "explanation": "The 24-pin ATX main power connector (often configured as a 20+4 pin connector for backward compatibility) is the primary electrical harness that delivers +3.3V, +5V, +12V, and -12V DC power from the power supply unit (PSU) to the motherboard. Molex supplies legacy peripherals, SATA powers storage drives, and 6-pin PCIe supplies auxiliary power to graphics cards.",
        "distractor_analysis": {
            "1": "The 4-pin Molex connector supplies +12V and +5V to legacy IDE hard drives, optical drives, and case fans.",
            "2": "The 15-pin SATA power connector supplies power directly to SATA hard drives and optical storage devices.",
            "3": "The 6-pin PCIe connector provides dedicated auxiliary +12V power directly to high-draw PCIe expansion cards."
        },
        "tags": ["hardware", "power", "psu", "atx"]
    },
    {
        "id": "C1-037",
        "objective": "3.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A power supply certification program rates PSUs based on energy efficiency under varying workload levels (20%, 50%, and 100% load). Which of the following is the highest 80 PLUS efficiency rating level?",
        "options": [
            "80 PLUS Titanium",
            "80 PLUS Platinum",
            "80 PLUS Gold",
            "80 PLUS Bronze"
        ],
        "answer": 0,
        "explanation": "The 80 PLUS certification ranks power supply efficiency in ascending order: 80 PLUS (Standard/White) -> Bronze -> Silver -> Gold -> Platinum -> Titanium. 80 PLUS Titanium represents the highest standard, requiring at least 90% to 94% efficiency across all load ranges and including efficiency testing at 10% load.",
        "distractor_analysis": {
            "1": "80 PLUS Platinum is the second highest tier (up to 92-94% efficiency), exceeded only by 80 PLUS Titanium.",
            "2": "80 PLUS Gold is a mid-tier efficiency level (87-90% efficiency), below Platinum and Titanium.",
            "3": "80 PLUS Bronze is an entry-level efficiency rating (82-85% efficiency), lower than Silver, Gold, Platinum, and Titanium."
        },
        "tags": ["hardware", "power", "80-plus", "efficiency"]
    },
    {
        "id": "C1-038",
        "objective": "3.6",
        "type": "single",
        "difficulty": "medium",
        "question": "When configuring a dual-voltage power supply on a server shipped from North America (115V) to Europe (230V), what physical component must the technician adjust before plugging into wall power if the PSU lacks active Power Factor Correction (PFC)?",
        "options": [
            "The red voltage selector slider switch on the rear of the PSU",
            "The motherboard CMOS clear jumper pins",
            "The CPU fan speed potentiometer dial",
            "The optical drive region code switch"
        ],
        "answer": 0,
        "explanation": "On power supplies that feature manual dual-voltage input (lacking auto-switching active PFC), a red slider switch on the rear of the power supply unit toggles between 115V (for North America/Japan) and 230V (for Europe and most other countries). Plugging a PSU set to 115V into a 230V outlet without changing the switch causes immediate catastrophic overvoltage failure and explosive capacitor blowout. CMOS jumpers, fan dials, and region codes do not adjust electrical mains voltage.",
        "distractor_analysis": {
            "1": "The CMOS clear jumper resets firmware parameters to default, having no role in electrical voltage rectification.",
            "2": "Fan speed potentiometers adjust cooling fan RPM, not electrical AC input voltage.",
            "3": "Optical drive region codes are firmware settings for DVD/Blu-ray playback, unrelated to power supply electronics."
        },
        "tags": ["hardware", "power", "voltage", "psu"]
    },
    {
        "id": "C1-039",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the standard physical drive form factor commonly used for traditional 3.5-inch desktop hard disk drives (HDDs) versus 2.5-inch laptop and SATA solid-state drives?",
        "options": [
            "3.5-inch form factor for desktop HDDs and 2.5-inch for laptop/SATA SSDs",
            "5.25-inch form factor for all modern laptop NVMe solid-state storage",
            "1.8-inch form factor for enterprise 3U datacenter storage enclosures",
            "M.2 2280 form factor for traditional spinning magnetic platters"
        ],
        "answer": 0,
        "explanation": "Standard desktop mechanical hard disk drives use the 3.5-inch form factor, while laptop drives and standard SATA solid-state drives utilize the 2.5-inch form factor. 5.25-inch was used for optical drives and vintage HDDs, 1.8-inch was for ultra-portable legacy media players, and M.2 2280 is a small gumstick form factor for flash memory (not spinning magnetic platters).",
        "distractor_analysis": {
            "1": "5.25-inch is the form factor for optical disc drives (DVD/Blu-ray), far too large for any laptop storage.",
            "2": "1.8-inch drives were micro-drives used in early portable MP3 players and ultra-thin laptops, not enterprise 3U server arrays.",
            "3": "M.2 2280 is a flash memory card form factor measuring 22x80 mm, incapable of holding spinning mechanical platters."
        },
        "tags": ["hardware", "storage", "form-factors", "hdd", "ssd"]
    },
    {
        "id": "C1-040",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following rotational speeds is a standard spindle speed for high-performance enterprise mechanical hard disk drives (HDDs)?",
        "options": [
            "15,000 RPM (or 10,000 / 7,200 RPM)",
            "1,200 RPM",
            "45,000 RPM",
            "100,000 RPM"
        ],
        "answer": 0,
        "explanation": "Standard mechanical hard disk drive spindle speeds include 5,400 RPM (energy-efficient laptops/desktops), 7,200 RPM (standard performance desktops), and 10,000 / 15,000 RPM (high-performance enterprise SAS server drives). Speeds such as 1,200 RPM are too slow, and 45,000 or 100,000 RPM are mechanically impossible for HDD magnetic platters without catastrophic disintegration.",
        "distractor_analysis": {
            "1": "1,200 RPM is far below the operating range of any modern hard drive, which would cause unacceptable read/write latency.",
            "2": "45,000 RPM is beyond the physical tolerance of mechanical drive motors and platter bearings.",
            "3": "100,000 RPM is a fictitious speed that would cause physical platter destruction due to centrifugal force."
        },
        "tags": ["hardware", "storage", "hdd", "rpm"]
    },
    {
        "id": "C1-041",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the maximum theoretical interface data transfer speed of the Serial ATA Revision 3.0 (SATA III / 6 Gbps) standard?",
        "options": [
            "6 Gbps (approximately 600 MB/s actual throughput)",
            "1.5 Gbps (approximately 150 MB/s actual throughput)",
            "32 Gbps (approximately 4 GB/s actual throughput)",
            "40 Gbps (approximately 5 GB/s actual throughput)"
        ],
        "answer": 0,
        "explanation": "The SATA Revision 3.0 (SATA III) specification defines a maximum physical signaling rate of 6 Gbps, which after 8b/10b line encoding yields a maximum uncompressed data throughput of approximately 600 MB/s. SATA I operates at 1.5 Gbps (150 MB/s), SATA II at 3.0 Gbps (300 MB/s), PCIe 3.0 x4 at 32 Gbps (4 GB/s), and Thunderbolt 3/4 at 40 Gbps.",
        "distractor_analysis": {
            "1": "1.5 Gbps is the legacy speed of first-generation SATA Revision 1.0 (SATA I).",
            "2": "32 Gbps is the bandwidth of a PCIe 3.0 x4 M.2 NVMe connection, not SATA III.",
            "3": "40 Gbps is the bandwidth of Thunderbolt 3 and Thunderbolt 4 external interfaces."
        },
        "tags": ["hardware", "storage", "sata", "bandwidth"]
    },
    {
        "id": "C1-042",
        "objective": "3.4",
        "type": "single",
        "difficulty": "medium",
        "question": "Which solid-state drive host communications protocol communicates directly across high-speed PCI Express lanes rather than utilizing the legacy AHCI protocol designed for spinning disks?",
        "options": [
            "Non-Volatile Memory Express (NVMe)",
            "Advanced Host Controller Interface (AHCI)",
            "Integrated Drive Electronics (IDE)",
            "Small Computer System Interface (SCSI-1)"
        ],
        "answer": 0,
        "explanation": "Non-Volatile Memory Express (NVMe) is an open host controller interface specification engineered from the ground up for solid-state storage. It communicates directly over PCI Express bus lanes, supporting up to 64,000 command queues with 64,000 commands per queue, vastly outperforming legacy AHCI (which was designed for high-latency rotating hard disks and limited to 1 queue of 32 commands).",
        "distractor_analysis": {
            "1": "AHCI was developed for spinning mechanical SATA drives and is bottlenecked by single command queues and SATA bus bandwidth limits.",
            "2": "IDE is an obsolete 1980s/1990s parallel ATA storage interface limited to 133 MB/s.",
            "3": "SCSI-1 is a legacy 1986 parallel storage standard, completely unrelated to modern PCIe solid-state drives."
        },
        "tags": ["hardware", "storage", "nvme", "ssd", "pcie"]
    },
    {
        "id": "C1-043",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "Among the following storage interfaces, which provides the fastest maximum throughput and lowest latency by communicating directly across dedicated PCIe lanes?",
        "options": [
            "PCIe NVMe M.2 solid-state drive",
            "SATA Revision 3.0 2.5-inch solid-state drive",
            "External eSATA 3 Gbps hard disk drive",
            "USB 2.0 HighSpeed external flash drive"
        ],
        "answer": 0,
        "explanation": "PCIe NVMe M.2 drives communicate directly over PCIe lanes (e.g., PCIe 4.0 x4 provides ~7,000 MB/s, and PCIe 5.0 x4 provides ~14,000 MB/s), making NVMe orders of magnitude faster than SATA III (capped at 600 MB/s), eSATA (capped at 300-600 MB/s), and USB 2.0 (capped at 60 MB/s).",
        "distractor_analysis": {
            "1": "SATA Revision 3.0 is capped at a maximum throughput of 6 Gbps (~600 MB/s), far slower than PCIe NVMe.",
            "2": "eSATA is an external SATA interface limited to 3 or 6 Gbps bandwidth.",
            "3": "USB 2.0 is an old external bus limited to a theoretical maximum of 480 Mbps (~48 MB/s practical throughput)."
        },
        "tags": ["hardware", "storage", "nvme", "performance"]
    },
    {
        "id": "C1-044",
        "objective": "3.4",
        "type": "single",
        "difficulty": "medium",
        "question": "Which enterprise storage interface combines the command set and reliability of SCSI with the point-to-point serial physical interface compatible with SATA drive bays?",
        "options": [
            "Serial Attached SCSI (SAS)",
            "Parallel ATA (PATA)",
            "Fibre Channel over IP (FCIP)",
            "Enhanced IDE (EIDE)"
        ],
        "answer": 0,
        "explanation": "Serial Attached SCSI (SAS) is an enterprise point-to-point serial storage interface that transmits SCSI commands over high-speed serial links (supporting 12 Gbps or 24 Gbps). SAS backplanes are backward-compatible with SATA drives, allowing enterprise systems to mix high-performance SAS drives and cost-effective SATA drives in the same enclosure. PATA and EIDE are legacy ribbon-cable interfaces, and FCIP is a SAN tunneling protocol.",
        "distractor_analysis": {
            "1": "Parallel ATA (PATA) is an obsolete 40-pin or 80-conductor parallel ribbon cable interface.",
            "2": "FCIP is a storage networking protocol used to encapsulate Fibre Channel frames inside TCP/IP packets across WANs.",
            "3": "Enhanced IDE (EIDE) is an early 1990s standard that expanded original IDE storage limits to 8.4 GB."
        },
        "tags": ["hardware", "storage", "sas", "scsi", "enterprise"]
    },
    {
        "id": "C1-045",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "What storage networking protocol encapsulates SCSI storage commands directly inside standard TCP/IP packets to allow servers to access remote block-level SAN storage over Ethernet networks?",
        "options": [
            "Internet Small Computer System Interface (iSCSI)",
            "Dynamic Host Configuration Protocol (DHCP)",
            "Simple Mail Transfer Protocol (SMTP)",
            "Hypertext Transfer Protocol Secure (HTTPS)"
        ],
        "answer": 0,
        "explanation": "iSCSI (Internet Small Computer System Interface) encapsulates SCSI command blocks within standard IP packets (typically over TCP port 3260), allowing client initiators to attach to remote storage targets over standard Ethernet networks and treat them as local block devices. DHCP assigns IP addresses, SMTP transfers emails, and HTTPS serves encrypted web pages.",
        "distractor_analysis": {
            "1": "DHCP is a network service that dynamically distributes IP addresses and subnet masks to network clients.",
            "2": "SMTP is an application-layer protocol used to transmit email between mail servers over TCP port 25.",
            "3": "HTTPS is an encrypted web protocol used to deliver secure web content to browsers over TCP port 443."
        },
        "tags": ["networking", "storage", "iscsi", "san", "protocols"]
    },
    {
        "id": "C1-046",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "Which storage device classification contains no moving mechanical parts, resulting in silent operation, lower power consumption, and extreme resistance to physical shock?",
        "options": [
            "Solid-State Drive (SSD)",
            "Hard Disk Drive (HDD)",
            "Digital Versatile Disc (DVD) drive",
            "Magnetic tape backup drive"
        ],
        "answer": 0,
        "explanation": "Solid-State Drives (SSDs) use non-volatile NAND flash memory chips and electronic controllers without any spinning platters, spindle motors, or mechanical actuator arms. This makes SSDs completely silent, fast, energy-efficient, and highly resistant to physical shocks and vibration. HDDs, optical drives, and magnetic tape drives all rely on mechanical motors and moving parts.",
        "distractor_analysis": {
            "1": "Mechanical hard disk drives contain spinning magnetic platters and actuator read/write heads vulnerable to physical drops and vibration.",
            "2": "DVD optical drives utilize rotating spindle motors and optical laser pickup sleds with moving parts.",
            "3": "Magnetic tape drives use mechanical reels and capstans to physically wind tape across magnetic read heads."
        },
        "tags": ["hardware", "storage", "ssd", "nand"]
    },
    {
        "id": "C1-047",
        "objective": "3.4",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary operational advantage of implementing a Redundant Array of Independent Disks (RAID) in enterprise server storage?",
        "options": [
            "To provide fault tolerance, data redundancy, and increased read/write performance",
            "To eliminate the need for regular off-site and cloud data backups",
            "To permanently increase the rotational speed of installed magnetic drive spindles",
            "To convert SATA storage drives into high-voltage AC electrical generators"
        ],
        "answer": 0,
        "explanation": "RAID combines multiple physical disk drives into a single logical unit to achieve data redundancy/fault tolerance (protecting against drive failure) and/or increased performance (striping I/O across multiple spindles/channels). However, RAID is not a backup solution. RAID cannot modify physical drive spindle speeds or generate electricity.",
        "distractor_analysis": {
            "1": "RAID provides high availability against drive hardware failures, but does not protect against malware, accidental deletion, or disaster; backups remain essential.",
            "2": "RAID is a logical drive controller configuration; it cannot alter the physical rotational speed of hard drive spindle motors.",
            "3": "Storage drives consume DC power and cannot function as electrical generators."
        },
        "tags": ["hardware", "storage", "raid", "fault-tolerance"]
    },
    {
        "id": "C1-048",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "Which RAID configuration stripes data across two or more drives to maximize read/write performance but provides ZERO fault tolerance or data redundancy?",
        "options": [
            "RAID 0 (Disk Striping)",
            "RAID 1 (Disk Mirroring)",
            "RAID 5 (Striping with Distributed Parity)",
            "RAID 10 (Striped Mirrors)"
        ],
        "answer": 0,
        "explanation": "RAID 0 (Disk Striping) divides data across two or more physical drives without parity or mirroring, maximizing read and write throughput and utilizing 100% of raw disk capacity. However, if any single drive in the array fails, all data across the entire volume is lost. RAID 1, 5, and 10 all provide fault tolerance.",
        "distractor_analysis": {
            "1": "RAID 1 duplicates (mirrors) identical data across two drives, providing complete 1-drive fault tolerance.",
            "2": "RAID 5 stripes data and distributed parity across three or more drives, tolerating the failure of one single drive.",
            "3": "RAID 10 combines mirroring and striping across at least four drives, tolerating drive failures in redundant pairs."
        },
        "tags": ["hardware", "storage", "raid", "raid0"]
    },
    {
        "id": "C1-049",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician needs to configure a storage volume using two identical hard drives that provides complete data redundancy so that if one drive fails, the system continues running without data loss. Which RAID level should be deployed?",
        "options": [
            "RAID 1 (Disk Mirroring)",
            "RAID 0 (Disk Striping)",
            "RAID 5 (Distributed Parity)",
            "JBOD (Just a Bunch of Disks)"
        ],
        "answer": 0,
        "explanation": "RAID 1 (Disk Mirroring) writes identical copies of all data simultaneously to two separate physical drives. If either drive suffers a hardware failure, the remaining drive continues to service all read and write requests with zero downtime or data loss. RAID 0 provides no redundancy, RAID 5 requires at least three drives, and JBOD simply concatenates drives without redundancy.",
        "distractor_analysis": {
            "1": "RAID 0 offers no fault tolerance; the failure of either drive destroys all data on the volume.",
            "2": "RAID 5 requires a minimum of three physical drives to calculate distributed parity, so it cannot be deployed on two drives.",
            "3": "JBOD simply spans storage capacity across separate drives without providing any data redundancy or fault tolerance."
        },
        "tags": ["hardware", "storage", "raid", "raid1"]
    },
    {
        "id": "C1-050",
        "objective": "3.4",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the minimum number of physical hard drives required to create a RAID 5 array with distributed parity?",
        "options": [
            "3 physical drives",
            "1 physical drive",
            "2 physical drives",
            "8 physical drives"
        ],
        "answer": 0,
        "explanation": "RAID 5 (Striping with Distributed Parity) requires a minimum of 3 physical hard drives. Data and parity information are striped across all drives in the array, allowing the array to survive the total failure of any single drive without data loss. RAID 0/1 requires 2 drives, and a single drive cannot form a redundant array.",
        "distractor_analysis": {
            "1": "A single drive cannot form a RAID array; it represents a single standalone disk with no redundancy.",
            "2": "Two drives can form RAID 0 or RAID 1, but cannot support RAID 5 because distributed parity calculations require at least three members.",
            "3": "Eight drives can be used in large RAID 5 or RAID 6 arrays, but the minimum required drive count for RAID 5 is 3."
        },
        "tags": ["hardware", "storage", "raid", "raid5"]
    }
]
