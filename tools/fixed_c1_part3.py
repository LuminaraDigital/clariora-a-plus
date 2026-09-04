#!/usr/bin/env python3
"""Part 3 of fixed Core 1 questions: C1-101 to C1-150."""

PART3_QUESTIONS = [
    {
        "id": "C1-101",
        "objective": "1.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following characteristics is NOT typical of modern consumer smartphones and mobile devices compared to desktop computers?",
        "options": [
            "Modular field-upgradeable internal CPU and RAM sockets",
            "Sealed, compact integrated chassis construction",
            "Touch-driven mobile operating system (e.g., iOS or Android)",
            "Integrated multi-band wireless antennas (Wi-Fi, Bluetooth, Cellular)"
        ],
        "answer": 0,
        "explanation": "Consumer smartphones and tablets feature tightly integrated, sealed architectures with System-on-Chip (SoC) processors and RAM permanently soldered to the logic board; they do not have modular, user-upgradeable CPU or RAM sockets. Desktop PCs, in contrast, feature modular sockets and slots designed for field upgrades.",
        "distractor_analysis": {
            "1": "Smartphones are manufactured as sealed units with glued glass and metal frames to maximize water and dust resistance.",
            "2": "Mobile devices run specialized mobile operating systems tailored for touch interfaces, power management, and sandboxed apps.",
            "3": "Smartphones integrate multi-frequency antennas for 5G cellular, Wi-Fi 6, Bluetooth, and GPS into the chassis frame."
        },
        "tags": ["mobile", "hardware", "architecture", "soc"]
    },
    {
        "id": "C1-102",
        "objective": "1.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following physical connector types is NOT a standard native wired interface built directly into modern smartphones for charging and data synchronization?",
        "options": [
            "Direct 8P8C (RJ-45) modular Ethernet port",
            "USB Type-C reversible port",
            "Apple proprietary 8-pin Lightning connector",
            "Micro-USB 2.0 Type-B connector"
        ],
        "answer": 0,
        "explanation": "Smartphones are too thin to house a physical 8P8C (RJ-45) Ethernet modular jack natively, requiring a USB-C or Lightning-to-Ethernet adapter for wired network connectivity. USB Type-C, Apple Lightning, and legacy Micro-USB are standard native physical mobile connectors.",
        "distractor_analysis": {
            "1": "USB Type-C is the universal industry-standard reversible port for charging, data transfer, and video output on modern smartphones.",
            "2": "The Lightning connector is Apple's proprietary reversible 8-pin connector used across older iPhone and iPad models.",
            "3": "Micro-USB 2.0 was the historical standard charging and data port on older generation Android smartphones."
        },
        "tags": ["mobile", "accessories", "connectors", "cabling"]
    },
    {
        "id": "C1-103",
        "objective": "1.3",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the primary official application repository and distribution platform for certified Android apps and digital content?",
        "options": [
            "Google Play Store",
            "Apple App Store",
            "Microsoft Store for Windows",
            "Valve Steam Client"
        ],
        "answer": 0,
        "explanation": "The Google Play Store is the primary official digital distribution service operated by Google for downloading certified Android applications, games, and media. The Apple App Store distributes iOS/macOS apps, Microsoft Store serves Windows software, and Steam distributes PC gaming software.",
        "distractor_analysis": {
            "1": "The Apple App Store is the official application store exclusively for iOS, iPadOS, and macOS devices.",
            "2": "The Microsoft Store distributes applications and Universal Windows Platform (UWP) software for Windows PCs.",
            "3": "Steam is a gaming platform and digital storefront for Windows, macOS, and Linux PCs, not mobile Android APKs."
        },
        "tags": ["mobile", "android", "apps", "play-store"]
    },
    {
        "id": "C1-104",
        "objective": "1.3",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following is a cellular configuration update historically used by CDMA carriers to specify radio bands, sub-bands, and service provider cell tower priorities on a mobile phone?",
        "options": [
            "Preferred Roaming List (PRL) update",
            "Dynamic Host Configuration Protocol lease renewal",
            "Spanning Tree Protocol (STP) convergence recalculation",
            "Graphics Processing Unit shader cache compile"
        ],
        "answer": 0,
        "explanation": "A Preferred Roaming List (PRL) update delivers carrier-specified database tables to a mobile phone, informing the device which radio bands, frequencies, and partner cellular towers to prioritize when connecting or roaming. DHCP manages local IP leases, STP manages switch loop prevention, and shader caches optimize 3D GPU rendering.",
        "distractor_analysis": {
            "1": "DHCP lease renewals occur on local IP networks to refresh client IP address leases, not cellular tower roaming tables.",
            "2": "STP convergence is an Ethernet switch protocol mechanism to prevent Layer 2 bridging loops in wired networks.",
            "3": "Shader cache compilation compiles graphics shaders for GPU execution, completely unrelated to cellular radio provisioning."
        },
        "tags": ["mobile", "cellular", "prl", "roaming"]
    },
    {
        "id": "C1-105",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following port numbers is used for unencrypted, plaintext Internet Message Access Protocol (IMAP) communication?",
        "options": [
            "TCP port 143 (Plaintext IMAP)",
            "TCP port 993 (IMAPS / IMAP over TLS)",
            "TCP port 587 (SMTP Submission with STARTTLS)",
            "TCP port 995 (POP3S / POP3 over TLS)"
        ],
        "answer": 0,
        "explanation": "TCP port 143 is the default port for standard unencrypted IMAP, transmitting email queries and credentials across the network in plaintext. TCP port 993 is IMAPS (IMAP over SSL/TLS), TCP port 587 is secure SMTP submission, and TCP port 995 is POP3S (POP3 over SSL/TLS).",
        "distractor_analysis": {
            "1": "TCP port 993 is the standard secure port for IMAP over TLS (IMAPS), providing transport-layer encryption.",
            "2": "TCP port 587 is used by email clients to submit outgoing mail to SMTP servers securely via STARTTLS.",
            "3": "TCP port 995 is the secure port for Post Office Protocol version 3 over TLS (POP3S)."
        },
        "tags": ["networking", "ports", "imap", "email", "security"]
    },
    {
        "id": "C1-106",
        "objective": "1.3",
        "type": "single",
        "difficulty": "medium",
        "question": "In mobile device data management, what is the key distinction between real-time data synchronization and an asynchronous data backup?",
        "options": [
            "Synchronization continuously reconciles two-way additions and edits across active devices, whereas a backup is a point-in-time snapshot for recovery",
            "Synchronization only operates over 10GbE fiber-optic cables, whereas backups require Bluetooth",
            "Backups continuously delete user contacts on the mobile phone, whereas synchronization preserves them",
            "Synchronization requires rooting or jailbreaking the mobile operating system"
        ],
        "answer": 0,
        "explanation": "Data synchronization is a continuous bidirectional (two-way) process that ensures changes made on one device (such as adding a calendar event or editing a contact) are immediately updated across all linked devices and cloud services. A backup is a static, one-way, point-in-time archive of device data created for disaster recovery. Neither requires fiber/Bluetooth exclusively, neither erases contacts, and jailbreaking is not required.",
        "distractor_analysis": {
            "1": "Synchronization operates over standard Wi-Fi and cellular IP connections, not specialized 10GbE fiber cables.",
            "2": "Backups create safe redundant archives and do not delete local user contacts or data.",
            "3": "Data synchronization is a native feature supported by all standard mobile operating systems without jailbreaking."
        },
        "tags": ["mobile", "synchronization", "backup", "cloud"]
    },
    {
        "id": "C1-107",
        "objective": "1.3",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is a hardware two-factor authentication generator rather than a standard direct screen lock passcode option on a smartphone?",
        "options": [
            "Hardware RSA SecurID hardware token fob",
            "Numeric PIN passcode",
            "Complex alphanumeric password",
            "Geometric directional gesture swipe pattern"
        ],
        "answer": 0,
        "explanation": "A hardware token (such as an RSA SecurID key fob or YubiKey) is an external hardware device that generates one-time authentication codes, rather than a direct screen unlock method configured in phone settings. Native screen lock methods on smartphones include PINs, alphanumeric passwords, swipe patterns, and biometrics (fingerprint/facial recognition).",
        "distractor_analysis": {
            "1": "Numeric PINs (4 to 6+ digits) are standard native lock screen security options on Android and iOS devices.",
            "2": "Alphanumeric passwords provide high entropy for locking mobile device screens and decrypting user partitions.",
            "3": "Gesture swipe patterns allow users to connect a grid of dots on screen as a native lock screen credential."
        },
        "tags": ["mobile", "security", "screen-lock", "authentication"]
    },
    {
        "id": "C1-108",
        "objective": "5.4",
        "type": "single",
        "difficulty": "easy",
        "question": "A user reports that their smartphone screen appears very dim while working in bright sunlight. Which setting or sensor should the technician check first before diagnosing hardware failure?",
        "options": [
            "Adaptive / Auto-brightness setting and ambient light sensor occlusion",
            "Cellular baseband radio transceiver power output",
            "NFC mobile payment antenna configuration",
            "SIM card IMSI carrier registration"
        ],
        "answer": 0,
        "explanation": "A dim display in changing light conditions is typically caused by the Adaptive / Auto-brightness feature being disabled, set too low, or the ambient light sensor at the top of the phone being blocked by a dirty screen protector or case. Checking brightness settings and cleaning the sensor is the first troubleshooting step. Cellular radios, NFC, and SIM cards have no control over display brightness.",
        "distractor_analysis": {
            "1": "Cellular radio output regulates wireless signal strength to cell towers, with no effect on display backlight brightness.",
            "2": "NFC handles contactless payment communication over short distances, unrelated to screen illumination.",
            "3": "SIM card IMSI identifies the subscriber to the mobile network operator, having no impact on screen display brightness."
        },
        "tags": ["troubleshooting", "mobile", "display", "brightness"]
    },
    {
        "id": "C1-109",
        "objective": "3.8",
        "type": "single",
        "difficulty": "easy",
        "question": "What consumable consumable material is used in electrophotographic laser printers to form the visible printed image on paper before being fused with heat and pressure?",
        "options": [
            "Toner powder (composed of plastic resin, iron oxide, and pigments)",
            "Liquid dye-sublimation ink cartridges",
            "Wax-impregnated dot-matrix fabric ribbon",
            "Thermally reactive chemical coating on specialty paper"
        ],
        "answer": 0,
        "explanation": "Laser printers use toner, a fine, dry powder composed of plastic polymer resins, color pigments, and iron oxide/carbon black. The toner is electrostatically attracted to the photosensitive drum and transferred to paper before heat and pressure from the fuser melt the plastic particles into the paper fibers. Inkjet printers use liquid ink, impact printers use ribbons, and thermal printers use heat-sensitive paper.",
        "distractor_analysis": {
            "1": "Liquid ink is used in inkjet printers, which spray liquid droplets onto paper via thermal or piezoelectric nozzles.",
            "2": "Inked fabric ribbons are used in impact dot-matrix printers, where physical pins strike the ribbon against paper.",
            "3": "Thermally reactive paper is used in direct thermal printers (e.g., POS receipt printers) where heated elements activate dye in the paper."
        },
        "tags": ["hardware", "printers", "laser", "toner"]
    },
    {
        "id": "C1-110",
        "objective": "3.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which four standard process color inks are used in full-color inkjet and color laser printing systems to reproduce full color photographic images?",
        "options": [
            "Cyan, Magenta, Yellow, and Key/Black (CMYK)",
            "Red, Green, Blue, and White (RGBW)",
            "Orange, Purple, Brown, and Gray (OPBG)",
            "Infrared, Ultraviolet, Red, and Blue (IURB)"
        ],
        "answer": 0,
        "explanation": "Subtractive color printing utilizes CMYK (Cyan, Magenta, Yellow, and Key/Black) inks or toners. By combining varying percentages of these four subtractive primary pigments, printers absorb specific wavelengths of reflected light to reproduce a full gamut of visible colors. RGB is an additive color model used for illuminated computer monitors and screens, not physical printing inks.",
        "distractor_analysis": {
            "1": "RGBW is an additive color model used in video displays and LED stage lighting, not standard subtractive ink printing.",
            "2": "OPBG is a fictitious color combination not used as a primary printing standard.",
            "3": "Infrared and ultraviolet are invisible electromagnetic spectra outside the human visual printing range."
        },
        "tags": ["hardware", "printers", "cmyk", "color-model"]
    },
    {
        "id": "C1-111",
        "objective": "3.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following operations is NOT part of the mechanical printing process of an impact dot-matrix printer?",
        "options": [
            "Pre-heating the printhead to 200 degrees Celsius using a ceramic thermal heating bar",
            "Solenoid electromagnets driving stiff metal pins forward against a fabric ribbon",
            "Inked cloth or carbon ribbon transferring ink impressions onto multi-part paper",
            "Tractor-feed sprockets pulling continuous form paper past the platen roller"
        ],
        "answer": 0,
        "explanation": "Impact dot-matrix printers operate purely through mechanical force: electromagnetic solenoids propel stiff metal pins forward to strike an inked ribbon against paper; they do not heat the printhead. Thermal printheads (used in thermal receipt printers) use heated elements, but impact printers are unheated mechanical impact devices.",
        "distractor_analysis": {
            "1": "Solenoid coils inside the impact printhead fire pins against the ribbon; this is the core mechanism of impact printing.",
            "2": "Striking the inked ribbon transfers ink to paper and creates physical carbon impressions on multi-part forms.",
            "3": "Tractor-feed mechanisms with sprocket wheels advance continuous perforated paper through impact printers."
        },
        "tags": ["hardware", "printers", "impact", "dot-matrix"]
    },
    {
        "id": "C1-112",
        "objective": "3.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following maintenance procedures is NOT applicable to direct thermal receipt printers because the component does not exist in thermal printer architectures?",
        "options": [
            "Replacing the fuser assembly and halogen heating lamp",
            "Cleaning the thermal heating element line using isopropyl alcohol (IPA)",
            "Replacing the roll of specialized heat-sensitive thermal paper",
            "Blowing out paper dust and debris with compressed air"
        ],
        "answer": 0,
        "explanation": "Thermal printers do not use toner and therefore have no fuser assembly, heat lamps, or pressure rollers. Fusers exist only in electrophotographic laser printers to melt toner into paper. Thermal printer maintenance consists of wiping the thermal printhead with isopropyl alcohol, clearing paper dust, and replacing thermal paper rolls.",
        "distractor_analysis": {
            "1": "Cleaning the thermal printhead with an alcohol swab or cleaning pen is standard preventive maintenance to remove residue.",
            "2": "Replacing thermal paper rolls when depleted is standard routine maintenance for receipt and label printers.",
            "3": "Clearing paper dust and debris with compressed air prevents paper feed jams on thermal roller assemblies."
        },
        "tags": ["hardware", "printers", "thermal", "maintenance"]
    },
    {
        "id": "C1-113",
        "objective": "3.8",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the most ubiquitous physical local connection interface used to connect a dedicated desktop printer directly to a personal computer workstation?",
        "options": [
            "Universal Serial Bus (USB Type-A to Type-B)",
            "DB-25 IEEE 1284 Centronics Parallel cable",
            "Legacy RS-232 9-pin Serial COM port",
            "Optical TOSLINK digital audio cable"
        ],
        "answer": 0,
        "explanation": "Universal Serial Bus (USB), typically using a USB Type-A connection at the PC and a USB Type-B port on the printer, is the universal standard physical interface for locally attached desktop printers. DB-25 parallel and RS-232 serial are obsolete legacy interfaces, and TOSLINK is for digital audio.",
        "distractor_analysis": {
            "1": "Centronics parallel (IEEE 1284) was the dominant printer interface in the 1990s, but has been completely superseded by USB.",
            "2": "RS-232 serial ports are legacy interfaces occasionally found on industrial equipment, not standard modern desktop printers.",
            "3": "TOSLINK optical cables transmit digital audio streams to AV receivers, not printer control data."
        },
        "tags": ["hardware", "printers", "connectivity", "usb"]
    },
    {
        "id": "C1-114",
        "objective": "2.3",
        "type": "single",
        "difficulty": "medium",
        "question": "When sharing a locally connected printer across a Windows workgroup network, which of the following statements is INCORRECT?",
        "options": [
            "A client computer must first install a local dummy printer and then convert its physical port to shared mode",
            "The host computer sharing the printer must remain powered on and connected to the network for clients to print",
            "File and Printer Sharing must be enabled in the host Windows Network and Sharing Center",
            "Connecting clients can discover and attach to the shared printer via its UNC path (\\\\HostName\\PrinterShareName)"
        ],
        "answer": 0,
        "explanation": "To connect to a shared network printer in Windows, the client computer does NOT create a local printer and convert it; rather, the user selects 'Add a printer', chooses 'Add a network, wireless or Bluetooth printer', and browses or enters the UNC path directly. The host PC must stay powered on, File and Printer Sharing must be enabled, and UNC paths are standard.",
        "distractor_analysis": {
            "1": "If the host computer connected locally to the printer is turned off or sleeping, client print jobs cannot reach the printer.",
            "2": "Windows Firewall and Network settings must allow File and Printer Sharing for remote clients to access the shared print queue.",
            "3": "Clients can map shared printers directly using Universal Naming Convention (UNC) paths like \\\\Server\\LaserPrinter."
        },
        "tags": ["networking", "printers", "sharing", "windows"]
    },
    {
        "id": "C1-115",
        "objective": "3.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following steps is NOT a standard phase in the computer-aided design and 3D additive manufacturing printing workflow?",
        "options": [
            "Executing an optical laser transfer corona cleaning cycle on an electrostatic drum",
            "Creating or acquiring a 3D digital model file (.STL or .OBJ)",
            "Generating G-code toolpaths using specialized slicing software",
            "Pre-heating the thermal extruder nozzle and heated print bed to the filament target temperatures"
        ],
        "answer": 0,
        "explanation": "Laser transfer corona cleaning cycles are part of electrophotographic 2D laser printing, not 3D printing. The 3D printing workflow consists of: (1) Designing a 3D CAD model (.STL/.OBJ), (2) Slicing the model into horizontal layers and generating G-code instructions, (3) Preheating the extruder and bed, and (4) Extruding molten filament layer-by-layer (Fused Deposition Modeling).",
        "distractor_analysis": {
            "1": "Creating an STL or OBJ polygonal mesh 3D model is the foundational first step of any 3D print job.",
            "2": "Slicing software converts 3D geometry into precise layer-by-layer motor coordinates and extrusion rates (G-code).",
            "3": "Preheating the hotend nozzle and heated bed ensures proper thermoplastic filament flow and bed adhesion."
        },
        "tags": ["hardware", "printers", "3d-printing", "additive-manufacturing"]
    },
    {
        "id": "C1-116",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary thermodynamic performance advantage of a closed-loop liquid cooling system over a standard compact aluminum heatsink fan for an overclocked processor?",
        "options": [
            "Liquid coolant has significantly higher specific heat capacity and transfers heat to a larger remote radiator surface area",
            "Liquid cooling eliminates all electrical power consumption inside the PC chassis",
            "Liquid cooling converts the CPU from x86 architecture into an ARM RISC processor",
            "Liquid cooling prevents all software operating system malware infections"
        ],
        "answer": 0,
        "explanation": "Liquid cooling utilizes water/glycol coolant, which has a vastly higher specific heat capacity and thermal conductivity than air, rapidly absorbing thermal energy from the CPU water block and transporting it to a large-surface-area external radiator where large, slow-spinning fans dissipate heat efficiently. Liquid cooling still requires electrical pump/fan power, does not change CPU architecture, and has no impact on software security.",
        "distractor_analysis": {
            "1": "Liquid cooling systems require continuous electrical power to run the motorized pump and radiator fans.",
            "2": "Cooling systems only dissipate thermal heat and cannot alter CPU microarchitecture or instruction sets.",
            "3": "Thermal cooling solutions have zero relationship to operating system malware defense."
        },
        "tags": ["hardware", "cooling", "liquid-cooling", "thermodynamics"]
    },
    {
        "id": "C1-117",
        "objective": "3.3",
        "type": "single",
        "difficulty": "easy",
        "question": "Which generation of double-data-rate (DDR) SDRAM desktop memory modules features a standard 240-pin DIMM layout?",
        "options": [
            "DDR3 and DDR2 desktop DIMMs (240 pins)",
            "DDR4 desktop DIMMs (288 pins)",
            "DDR5 desktop DIMMs (288 pins with onboard PMIC)",
            "Legacy DDR1 desktop DIMMs (184 pins)"
        ],
        "answer": 0,
        "explanation": "Both DDR2 and DDR3 desktop unbuffered DIMMs feature 240 pins (though their keying notches are placed in different physical positions to prevent accidental cross-insertion). DDR4 and DDR5 desktop DIMMs have 288 pins, and original DDR1 DIMMs have 184 pins.",
        "distractor_analysis": {
            "1": "DDR4 desktop DIMMs have 288 pins and a slightly curved contact edge to reduce insertion force.",
            "2": "DDR5 desktop DIMMs feature 288 pins with an onboard Power Management IC (PMIC) and dual 32-bit subchannels.",
            "3": "DDR1 (original DDR) desktop DIMMs have 184 pins."
        },
        "tags": ["hardware", "ram", "ddr3", "ddr2", "pin-counts"]
    },
    {
        "id": "C1-118",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following firmware diagnostic programs is stored directly within the non-volatile motherboard BIOS/UEFI ROM chip?",
        "options": [
            "Power-On Self-Test (POST)",
            "External CR2032 coin-cell lithium battery",
            "Physical quartz Real-Time Clock crystal",
            "Chassis front-panel power reset switch"
        ],
        "answer": 0,
        "explanation": "The Power-On Self-Test (POST) is a firmware program stored permanently in the motherboard BIOS/UEFI flash ROM chip that runs diagnostic tests on essential hardware components upon startup. The battery, RTC crystal, and reset switch are physical hardware components, not firmware routines.",
        "distractor_analysis": {
            "1": "The CR2032 battery is an external replaceable chemical battery that powers volatile CMOS RAM when mains AC is unplugged.",
            "2": "The RTC crystal is an analog quartz timing oscillator on the motherboard circuit board.",
            "3": "The front-panel power switch is a mechanical momentary push-button wired to the motherboard front panel header."
        },
        "tags": ["hardware", "bios", "post", "firmware"]
    },
    {
        "id": "C1-119",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which digital video interface standard natively supports High-bandwidth Digital Content Protection (HDCP) encryption to protect commercial high-definition digital media streams?",
        "options": [
            "High-Definition Multimedia Interface (HDMI)",
            "Legacy 15-pin analog VGA",
            "Composite RCA analog video",
            "S-Video 4-pin mini-DIN"
        ],
        "answer": 0,
        "explanation": "HDMI natively implements High-bandwidth Digital Content Protection (HDCP), a cryptographic handshake protocol that encrypts digital video and audio streams between source devices (Blu-ray players, PCs, consoles) and displays to prevent unauthorized digital copying. Legacy analog standards like VGA, Composite RCA, and S-Video transmit unencrypted analog electrical waves without HDCP support.",
        "distractor_analysis": {
            "1": "VGA is an analog video signal standard that cannot carry digital HDCP encryption handshakes.",
            "2": "Composite RCA transmits an unencrypted analog composite baseband signal with no digital DRM capability.",
            "3": "S-Video separates analog luma and chroma signals over analog pins without any digital encryption features."
        },
        "tags": ["hardware", "cables", "hdmi", "hdcp", "drm", "video"]
    },
    {
        "id": "C1-120",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "A datacenter technician needs to quickly verify that a commercial 3-prong AC wall receptacle has correct hot, neutral, and ground wiring polarity before plugging in an equipment rack. Which tool provides immediate three-light indicator verification?",
        "options": [
            "AC receptacle tester / circuit analyzer",
            "Electrostatic discharge (ESD) wrist strap",
            "Radio frequency field strength meter",
            "Fiber optic visual fault locator"
        ],
        "answer": 0,
        "explanation": "An AC receptacle tester (or 3-prong circuit analyzer) plugs directly into a standard wall outlet and uses three diagnostic indicator lights to instantly confirm correct wiring, open ground, open neutral, open hot, or reversed hot/neutral polarity. ESD straps ground technicians, RF meters detect wireless waves, and visual fault locators test fiber optic continuity.",
        "distractor_analysis": {
            "1": "An ESD wrist strap drains static electricity from a technician's body to ground, but cannot test AC wall outlet polarity.",
            "2": "RF field meters measure high-frequency electromagnetic radiation, having no ability to test 120V/230V AC wall wiring.",
            "3": "A visual fault locator (VFL) uses a visible red laser to identify breaks in fiber optic strands, not electrical wall sockets."
        },
        "tags": ["tools", "electrical", "receptacle-tester", "safety"]
    },
    {
        "id": "C1-121",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "According to the CompTIA 6-step Troubleshooting Methodology, what is the very first step a technician must perform when responding to a technical support ticket?",
        "options": [
            "Identify the problem (gather information, question user, identify symptoms)",
            "Establish a theory of probable cause (question the obvious)",
            "Implement the solution or escalate as necessary",
            "Document findings, actions, and outcomes"
        ],
        "answer": 0,
        "explanation": "Step 1 of the CompTIA Troubleshooting Methodology is to 'Identify the problem', which involves questioning the user, identifying user changes, performing backups before changes, inquiring about environmental changes, and reviewing system logs. Step 2 is establishing a theory, Step 4 is implementing the solution, and Step 6 is documenting findings.",
        "distractor_analysis": {
            "1": "Establishing a theory of probable cause is Step 2, performed after information is gathered in Step 1.",
            "2": "Implementing the solution is Step 4, performed after testing and confirming the theory in Step 3.",
            "3": "Documenting findings is Step 6, the final step performed after verifying full system functionality."
        },
        "tags": ["troubleshooting", "methodology", "comptia", "best-practices"]
    },
    {
        "id": "C1-122",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which standardized 8-position 8-contact (8P8C) modular copper connector is used on twisted-pair network cables to connect computer workstations to Ethernet LANs?",
        "options": [
            "RJ-45 (8P8C) connector",
            "PS/2 Mini-DIN 6-pin connector",
            "DB-25 parallel printer connector",
            "BNC coaxial connector"
        ],
        "answer": 0,
        "explanation": "RJ-45 (Registered Jack 45 / 8P8C) is the universal standard modular connector used on Category 5e, 6, and 6a unshielded and shielded twisted-pair Ethernet cables. PS/2 connects legacy keyboards/mice, DB-25 connects legacy parallel printers, and BNC connects legacy coaxial video or 10BASE2 networks.",
        "distractor_analysis": {
            "1": "PS/2 Mini-DIN connectors were used for legacy keyboard (purple) and mouse (green) connections on older motherboards.",
            "2": "DB-25 is a 25-pin D-subminiature connector used for legacy IEEE 1284 parallel printer connections.",
            "3": "BNC is a bayonet-style coaxial cable connector used for CCTV video feeds and legacy 10BASE2 Thinnet networks."
        },
        "tags": ["hardware", "cables", "connectors", "rj45", "ethernet"]
    },
    {
        "id": "C1-123",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "During custom PC assembly, which of the following materials is applied strictly as an interface layer between the top of the processor and the heatsink base, rather than being seated into a motherboard socket or slot?",
        "options": [
            "Thermal paste / thermal grease",
            "Central Processing Unit (CPU)",
            "DDR4 RAM memory module",
            "PCIe NVMe M.2 expansion card"
        ],
        "answer": 0,
        "explanation": "Thermal paste (thermal interface material) is applied exclusively between the CPU integrated heat spreader (IHS) and the heatsink/waterblock base plate; it must never be allowed into CPU sockets or RAM slots. The CPU installs in the CPU socket, RAM inserts into DIMM slots, and M.2 SSDs install into M.2 slots on the motherboard.",
        "distractor_analysis": {
            "1": "The CPU is a semiconductor component that installs directly into the motherboard CPU socket (LGA or PGA).",
            "2": "RAM modules are printed circuit boards that insert directly into motherboard DIMM memory slots.",
            "3": "PCIe NVMe M.2 SSDs screw directly into dedicated M.2 slots on the motherboard PCB."
        },
        "tags": ["hardware", "cpu", "thermal-paste", "motherboard", "assembly"]
    },
    {
        "id": "C1-124",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is an individual processing microchip component that requires a motherboard, RAM, power supply, and firmware to function, rather than being a complete standalone computer system?",
        "options": [
            "Central Processing Unit (CPU)",
            "Enterprise laptop",
            "Touchscreen tablet",
            "Raspberry Pi single-board computer"
        ],
        "answer": 0,
        "explanation": "A CPU is an integrated circuit microchip that executes calculations and instructions; it is an individual component that cannot function on its own without supporting subsystems (motherboard, RAM, storage, power supply, firmware). Laptops, tablets, and Raspberry Pi devices are complete, fully functional computing systems containing all necessary subsystems.",
        "distractor_analysis": {
            "1": "A laptop is a complete standalone computer integrating motherboard, CPU, RAM, storage, display, keyboard, and battery.",
            "2": "A tablet is a complete mobile computer integrating processor, memory, storage, touchscreen, and operating system.",
            "3": "A Raspberry Pi is a complete single-board computer containing SoC, RAM, video output, USB controllers, and GPIO interfaces on one board."
        },
        "tags": ["hardware", "cpu", "architecture", "concepts"]
    },
    {
        "id": "C1-125",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "What term describes the fundamental internal hardware design, circuit layout, and pipeline implementation upon which specific families of microprocessors (such as Intel Alder Lake or AMD Zen 4) are engineered?",
        "options": [
            "Microarchitecture",
            "High-level programming language",
            "Base-10 decimal numbering system",
            "Operating system swap file"
        ],
        "answer": 0,
        "explanation": "A microarchitecture is the underlying physical hardware implementation of an instruction set architecture (ISA), detailing pipeline stages, execution units, branch prediction logic, cache hierarchies, and semiconductor fabrication layouts for a CPU family (e.g., Intel Golden Cove, AMD Zen 4). High-level languages are software, decimal is a number system, and swap files are disk-based virtual memory.",
        "distractor_analysis": {
            "1": "High-level programming languages (Python, C++) are human-readable code compiled into machine instructions, not silicon CPU circuit designs.",
            "2": "Base-10 is standard human decimal counting; computer hardware operates internally in base-2 binary.",
            "3": "A swap file is operating system storage used for virtual memory paging, having no role in CPU semiconductor design."
        },
        "tags": ["hardware", "cpu", "microarchitecture", "engineering"]
    },
    {
        "id": "C1-126",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "How does a modern processor achieve multi-gigahertz core clock speeds (e.g., 4.5 GHz) when the motherboard base clock (BCLK) generator crystal operates at a standard frequency of 100 MHz?",
        "options": [
            "Internal CPU clock multipliers (Phase-Locked Loop / PLL circuitry)",
            "Liquid cooling radiator pumps",
            "Dual-channel memory bus interleaving",
            "Software virtual memory paging tables"
        ],
        "answer": 0,
        "explanation": "Modern CPUs use internal clock multipliers driven by Phase-Locked Loop (PLL) circuits. The motherboard provides a stable base reference clock (BCLK, typically 100 MHz), and the CPU multiplies this frequency by an internal ratio multiplier (e.g., 100 MHz base clock x 45 multiplier = 4.5 GHz core frequency). Coolers regulate temperature, RAM interleaving increases memory bandwidth, and paging manages virtual storage.",
        "distractor_analysis": {
            "1": "Radiator pumps circulate cooling liquid to dissipate heat, but do not generate or multiply clock timing signals.",
            "2": "Memory bus interleaving distributes memory access across multiple channels to improve throughput, not CPU clock frequencies.",
            "3": "Virtual memory paging tables map virtual address spaces to physical memory, unrelated to hardware clock synthesis."
        },
        "tags": ["hardware", "cpu", "clock-multiplier", "bclk"]
    },
    {
        "id": "C1-127",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "In a modern multi-core processor's SRAM cache hierarchy, which level of cache has the largest capacity but the slowest access latency compared to the other internal caches?",
        "options": [
            "Level 3 (L3) shared cache",
            "Level 1 (L1) instruction/data cache",
            "Level 2 (L2) dedicated core cache",
            "CPU internal general-purpose registers"
        ],
        "answer": 0,
        "explanation": "The CPU cache hierarchy is structured by speed and capacity: Registers are the fastest and smallest -> L1 Cache is next fastest (per core) -> L2 Cache is larger but slightly slower (per core) -> L3 Cache is the largest (shared across all cores) but has the highest latency of on-die SRAM caches. All caches remain significantly faster than system DRAM.",
        "distractor_analysis": {
            "1": "L1 cache is the fastest on-die SRAM cache, located directly adjacent to the CPU core execution pipelines with minimal single-cycle latency.",
            "2": "L2 cache is faster than L3 cache, typically dedicated to individual cores to provide low-latency intermediate storage.",
            "3": "Internal registers are tiny, ultra-fast memory cells integrated directly inside the execution ALU with zero wait states."
        },
        "tags": ["hardware", "cpu", "cache", "l3-cache", "hierarchy"]
    },
    {
        "id": "C1-128",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician is about to remove a sensitive server CPU from its packaging and insert it into a motherboard. Which safety device must be attached to the technician's wrist and connected to unpainted chassis ground to prevent electrostatic damage?",
        "options": [
            "Antistatic ESD wrist strap",
            "Insulated rubber high-voltage lineman gloves",
            "Grounding rod driven through the datacenter floor tile",
            "Magnetic screwdriver wristband"
        ],
        "answer": 0,
        "explanation": "An antistatic Electrostatic Discharge (ESD) wrist strap contains a conductive band and a 1-Megaohm current-limiting resistor attached via a clip to unpainted metal chassis ground. It continuously drains static electrical charges from the technician's body, preventing ESD damage to delicate semiconductor transistors. Rubber gloves are for high-voltage electricians, ground rods are building earth grounds, and magnetic wristbands hold steel screws.",
        "distractor_analysis": {
            "1": "High-voltage lineman gloves are thick rubber insulators used for working on energized high-voltage power lines, not delicate computer microelectronics.",
            "2": "Building ground rods are structural earthing components installed during building construction, not handheld technician wearables.",
            "3": "Magnetic screw wristbands hold steel screws and do not provide an electrical ground path for electrostatic discharge."
        },
        "tags": ["hardware", "esd", "safety", "wrist-strap"]
    },
    {
        "id": "C1-129",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "In memory hardware terminology, what does the term 'double-sided RAM' traditionally signify regarding the electrical memory ranks and physical layout of the module?",
        "options": [
            "The memory module contains two separate electrical 64-bit ranks of chips, requiring the memory controller to switch between ranks",
            "The RAM module can be physically installed upside down into the motherboard slot",
            "The RAM module provides both volatile DRAM and non-volatile NAND flash storage simultaneously",
            "The RAM module features two physical notch keys on opposite sides"
        ],
        "answer": 0,
        "explanation": "Electrically, 'double-sided' memory refers to a dual-rank module where memory chips are grouped into two separate 64-bit ranks (often physically mounted on both sides of the PCB). The memory controller accesses one rank at a time by toggling chip select lines. RAM modules are physically keyed and cannot be inserted upside down, do not mix NAND flash on standard DIMMs, and feature a single off-center keying notch.",
        "distractor_analysis": {
            "1": "DIMM slots have asymmetrical keying notches that strictly prevent installing modules upside down or in reverse orientation.",
            "2": "Standard DDR DIMMs use volatile dynamic RAM chips exclusively, not non-volatile flash storage.",
            "3": "Standard DDR DIMM modules feature a single physical keying notch positioned along the bottom contact edge."
        },
        "tags": ["hardware", "ram", "memory-ranks", "double-sided"]
    },
    {
        "id": "C1-130",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "What term describes short adapter cables that plug into internal motherboard headers or proprietary ports to present standard external I/O connectors (such as USB, serial, or display jacks) at the chassis rear or front panel?",
        "options": [
            "Header adapter cables / breakout dongles",
            "Motherboard standoff screws",
            "PCIe riser bracket slot covers",
            "Heat spreader clamps"
        ],
        "answer": 0,
        "explanation": "Header cables and breakout dongles plug into internal pin headers on the motherboard (e.g., USB 3.0, COM serial, audio, or Thunderbolt headers) and route the signals to external mounting brackets or chassis ports. Standoffs hold motherboards off the chassis, slot covers seal unused expansion bays, and clamps secure heatsinks.",
        "distractor_analysis": {
            "1": "Motherboard standoffs are threaded brass or steel spacers that physically support the motherboard and prevent electrical shorts to the chassis.",
            "2": "Slot covers are flat metal brackets that cover unused PCIe expansion openings at the rear of the computer case.",
            "3": "Heat spreader clamps physically fasten CPU heatsinks to socket retention brackets."
        },
        "tags": ["hardware", "motherboard", "cables", "dongles", "headers"]
    },
    {
        "id": "C1-131",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the primary operational benefit of implementing meticulous internal cable management (routing cables through chassis cutouts, behind the motherboard tray, and securing with zip ties)?",
        "options": [
            "It optimizes internal chassis airflow, enhances cooling efficiency, and prevents cables from obstructing fan blades",
            "It automatically doubles the data transfer bandwidth of connected SATA storage drives",
            "It converts standard copper power wires into high-speed fiber-optic connections",
            "It eliminates the need for grounded AC wall receptacles"
        ],
        "answer": 0,
        "explanation": "Proper internal cable management secures wires neatly behind the motherboard tray and along chassis channels, eliminating tangled clutter that impedes intake/exhaust airflow across CPU and GPU heatsinks, while preventing loose cables from getting caught in spinning fan blades. Cable routing does not alter storage bus speed, change wire physics to fiber, or eliminate electrical grounding requirements.",
        "distractor_analysis": {
            "1": "SATA transfer speed is governed by the SATA revision specification and controller capabilities (e.g., 6 Gbps), unaffected by external cable routing aesthetics.",
            "2": "Cable management organizes physical copper wires; it cannot transform copper conductors into optical fiber.",
            "3": "Grounding electrical receptacles is a mandatory building safety standard, completely unrelated to chassis wire routing."
        },
        "tags": ["hardware", "cable-management", "airflow", "cooling"]
    },
    {
        "id": "C1-132",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following physical interface panels is mounted on the external front or top of a PC chassis to provide immediate user access to power controls and peripheral jacks?",
        "options": [
            "Front-panel I/O assembly (Power switch, Reset switch, Activity LEDs, USB and Audio ports)",
            "Motherboard rear I/O shield plate",
            "Power supply internal high-voltage transformer",
            "CPU voltage regulator module (VRM) chokes"
        ],
        "answer": 0,
        "explanation": "The front-panel I/O assembly is mounted on the front or top of the computer case, containing the power push-button, reset switch, drive activity LEDs, front USB ports, and 3.5mm headphone/mic jacks wired via headers to the motherboard. The rear I/O shield sits at the back, transformers are sealed inside the PSU, and VRM chokes are on the motherboard.",
        "distractor_analysis": {
            "1": "The rear I/O shield is a metal bezel snapped into the back of the case around the motherboard onboard port cluster.",
            "2": "The high-voltage transformer is an internal electrical component inside the sealed PSU enclosure.",
            "3": "VRM chokes are square inductive power components soldered onto the motherboard near the CPU socket."
        },
        "tags": ["hardware", "case", "front-panel", "chassis"]
    },
    {
        "id": "C1-133",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "When building or upgrading a workstation, why is it recommended to perform an out-of-case 'bench test' (installing CPU, cooler, RAM, and PSU on a non-conductive surface) before mounting the motherboard into the chassis?",
        "options": [
            "To verify POST functionality and ensure basic hardware operation before investing time in full chassis mounting and cable management",
            "To calibrate the internal liquid crystal display panel refresh rate",
            "To format all secondary storage drives with FAT16 file systems",
            "To permanently solder the motherboard to the brass standoffs"
        ],
        "answer": 0,
        "explanation": "Bench testing (or breadboarding) the core components (motherboard, CPU, cooler, RAM, PSU, and display) on a non-conductive box or antistatic mat verifies that the core hardware initializes and passes POST. If a component is DOA (dead on arrival) or improperly seated, troubleshooting is fast and easy without having to disassemble a fully screwed-in case. Bench testing does not format disks, calibrate screens, or solder boards.",
        "distractor_analysis": {
            "1": "Bench testing verifies pre-boot electrical and POST viability, having no relation to LCD panel calibration.",
            "2": "Bench testing checks hardware initialization prior to OS boot, before any storage formatting occurs.",
            "3": "Motherboards are secured to standoffs using removable Phillips screws, never soldered permanently."
        },
        "tags": ["hardware", "motherboard", "assembly", "bench-testing"]
    },
    {
        "id": "C1-134",
        "objective": "3.6",
        "type": "single",
        "difficulty": "easy",
        "question": "What dedicated auxiliary power cable connects directly from an ATX power supply to a 4-pin or 8-pin (EPS12V) header located near the CPU socket on the motherboard to provide dedicated power for the processor?",
        "options": [
            "4-pin / 8-pin ATX12V / EPS12V CPU power connector",
            "15-pin SATA power connector",
            "4-pin Molex peripheral connector",
            "Berg 4-pin floppy drive connector"
        ],
        "answer": 0,
        "explanation": "The 4-pin ATX12V or 8-pin EPS12V connector connects directly from the power supply to the dedicated power header adjacent to the CPU socket, supplying dedicated +12V DC power to the processor voltage regulator modules (VRMs). SATA cables power storage drives, Molex powers legacy accessories, and Berg powered legacy floppy drives.",
        "distractor_analysis": {
            "1": "15-pin SATA power connectors deliver +3.3V, +5V, and +12V DC power to storage drives (HDDs, SSDs, optical drives).",
            "2": "4-pin Molex connectors supply +12V and +5V to legacy PATA hard drives, optical drives, and case accessories.",
            "3": "Berg connectors are small 4-pin power connectors designed for legacy 3.5-inch floppy diskette drives."
        },
        "tags": ["hardware", "power", "psu", "cpu", "atx12v"]
    },
    {
        "id": "C1-135",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following processor cooling architectures typically offers the lowest acoustic noise levels during high-workload processing?",
        "options": [
            "Large-radiator closed-loop liquid cooling with large low-RPM fans",
            "Small high-RPM 40mm server chassis blower fan",
            "Stock low-profile aluminum air heatsink with a screaming 70mm fan",
            "Unmuffled industrial server delta-vane fan running at 8,000 RPM"
        ],
        "answer": 0,
        "explanation": "Liquid cooling systems featuring large radiators (280mm or 360mm) equipped with large-diameter (120mm/140mm) fans can spin at much lower RPM while dissipating large amounts of thermal energy, producing whisper-quiet acoustic noise. Small fans must spin at extreme RPMs (e.g., 5,000-8,000 RPM in 1U/2U rack servers), producing loud, high-pitched whining noise.",
        "distractor_analysis": {
            "1": "Small 40mm blower fans must spin at extreme speeds to move sufficient air volume, generating loud, high-pitched whine.",
            "2": "Low-profile small aluminum heatsinks have low thermal mass, forcing small fans to spin at maximum speed under load.",
            "3": "High-RPM server delta fans generate industrial-grade noise exceeding 60-70 dB, designed purely for datacenter airflow rather than quiet operation."
        },
        "tags": ["hardware", "cooling", "acoustics", "noise", "liquid-cooling"]
    },
    {
        "id": "C1-136",
        "objective": "5.1",
        "type": "single",
        "difficulty": "medium",
        "question": "When a computer CPU reaches critical thermal junction limits (Tjunction Max) due to a failed cooling fan or unseated heatsink, what safety behavior is automatically triggered by the processor hardware?",
        "options": [
            "Aggressive thermal throttling (reducing clock multipliers and voltage) followed by thermal emergency shutdown",
            "Permanent overclocking to burn off excess heat through copper traces",
            "Automatic deletion of the operating system bootloader partition",
            "Reversing the AC power plug polarity at the wall outlet"
        ],
        "answer": 0,
        "explanation": "Modern processors have built-in digital thermal sensors (DTS) that monitor junction temperature in real time. If temperatures exceed safe operating thresholds (typically 95-105 C), the CPU automatically engages thermal throttling (lowering clock frequencies and voltages to reduce heat); if temperatures continue rising, the CPU triggers an immediate hardware thermal trip shutdown to prevent physical silicon destruction. CPUs do not delete bootloaders or invert AC polarity.",
        "distractor_analysis": {
            "1": "Overclocking increases power draw and thermal generation, accelerating thermal destruction rather than cooling.",
            "2": "Thermal protection circuits are purely hardware safety triggers that cut CPU power; they do not modify or delete disk partitions.",
            "3": "Processor thermal sensors operate within the CPU die and cannot physically manipulate external building AC wall wiring."
        },
        "tags": ["troubleshooting", "cpu", "thermal-throttling", "overheating"]
    },
    {
        "id": "C1-137",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which dedicated diagnostic testing tool plugs into all output harnesses of an ATX power supply (24-pin, EPS12V, PCIe, SATA, Molex) to measure and verify +12V, +5V, +3.3V, and Power Good (PG) signals under load?",
        "options": [
            "Power supply tester (PSU tester)",
            "Bent metal paperclip inserted into green wire pins",
            "Optical time-domain reflectometer",
            "Loopback plug inserted into a USB port"
        ],
        "answer": 0,
        "explanation": "A specialized power supply tester connects to the 24-pin ATX main harness, 8-pin CPU, PCIe, and peripheral connectors, displaying exact voltage levels for the +12V, +5V, +3.3V, -12V, and +5VSB rails on an LCD screen along with the Power Good (PG) millisecond delay timer. Paperclips only short the PS_ON pin to ground to test basic spin-up without measuring voltage stability, TDRs test cables, and loopback plugs test network/serial ports.",
        "distractor_analysis": {
            "1": "The paperclip test only bridges PS_ON (green wire) to ground (black wire) to see if fans spin, but cannot measure voltage tolerance or voltage drop under load.",
            "2": "An OTDR is an optical testing instrument used to characterize fiber-optic cabling, not electrical power supplies.",
            "3": "A loopback plug tests physical network, serial, or parallel port transceiver circuitry, not power supply voltage rails."
        },
        "tags": ["tools", "psu", "power-supply-tester", "troubleshooting"]
    },
    {
        "id": "C1-138",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician hears a loud pop inside a desktop computer case followed immediately by complete power loss and an acrid, pungent burning chemical odor. What catastrophic hardware failure has occurred?",
        "options": [
            "Power supply unit capacitor rupture / electrical blowout",
            "Operating system screen saver timeout",
            "DisplayPort cable shielding grounding loop",
            "Thermal paste curing on the CPU heatsink"
        ],
        "answer": 0,
        "explanation": "A loud popping sound followed by immediate power shutdown and a pungent burning chemical smell is the classic signature of an electrolytic capacitor blowout or catastrophic switching MOSFET failure inside the power supply unit (or motherboard VRM). Screen savers are software, cable grounding loops cause subtle hums/flicker, and thermal paste curing is odorless.",
        "distractor_analysis": {
            "1": "Screen savers are graphical OS utilities that activate during idle periods without making sounds or emitting burning odors.",
            "2": "Ground loops in display cables cause visual hum bars or audio buzzing, not loud mechanical pops or burning smells.",
            "3": "Thermal paste curing is a gradual, odorless thermodynamic bonding process between heatsinks and CPUs."
        },
        "tags": ["troubleshooting", "hardware", "power", "psu", "capacitors"]
    },
    {
        "id": "C1-139",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A user reports a loud, rhythmic clicking or buzzing noise coming from inside a running desktop tower that started immediately after the PC was moved. What is the most probable mechanical cause?",
        "options": [
            "A loose internal power or data cable has shifted into contact with spinning cooling fan blades",
            "The system RAM memory chips are executing parity error checksums",
            "The CPU instruction decoder is processing floating-point calculations",
            "The optical fiber patch cord is transmitting high-speed laser pulses"
        ],
        "answer": 0,
        "explanation": "Loud, rhythmic buzzing or clicking sounds that appear after moving a computer are almost universally caused by an unmanaged internal cable or zip tie shifting into the path of spinning chassis or heatsink fan blades. Solid-state RAM chips, CPU execution units, and fiber-optic pulses make zero acoustic mechanical noise.",
        "distractor_analysis": {
            "1": "RAM is solid-state semiconductor memory with no moving physical parts; parity checks generate zero audible sound.",
            "2": "CPU floating-point calculation occurs at the microscopic transistor level and produces no mechanical sound.",
            "3": "Optical fiber carries modulated light photons through glass, which generates zero acoustic mechanical noise."
        },
        "tags": ["troubleshooting", "hardware", "noise", "fans", "cables"]
    },
    {
        "id": "C1-140",
        "objective": "5.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician installs two new 16 GB DDR4 memory modules into a desktop computer. When booting into the UEFI/BIOS setup utility, only 16 GB of RAM is detected across all channels instead of 32 GB. What is the first troubleshooting action the technician should take?",
        "options": [
            "Power off the system, remove the RAM modules, inspect for dust, and firmly reseat both modules into the designated primary slots until latches click",
            "Replace the motherboard voltage regulator modules with higher amperage capacitors",
            "Flash the solid-state drive firmware to a legacy version",
            "Reinstall the 64-bit operating system from installation media"
        ],
        "answer": 0,
        "explanation": "When installed memory fails to register in BIOS/UEFI setup, the most common issue is improper physical seating (DIMM latches not fully locked) or debris in the slot contacts. Powering off, inspecting the slot, and firmly reseating the modules until the retaining latches snap into place resolves the vast majority of memory detection issues. Soldering VRMs, flashing SSDs, or reinstalling the OS does not fix pre-boot hardware DIMM detection.",
        "distractor_analysis": {
            "1": "Motherboard VRM capacitors are factory-soldered components that should not be modified by field technicians.",
            "2": "SSD firmware manages storage controller flash translation layers and has no impact on RAM detection in BIOS.",
            "3": "Operating system reinstallation only affects secondary disk software; the BIOS detects RAM long before the OS loads."
        },
        "tags": ["troubleshooting", "hardware", "ram", "seating", "bios"]
    },
    {
        "id": "C1-141",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is a system firmware management interface rather than a physical bootable storage medium that can be configured in a BIOS/UEFI boot device priority list?",
        "options": [
            "UEFI Firmware Setup Utility",
            "USB Flash Drive",
            "M.2 NVMe Solid-State Drive",
            "PXE Network Boot Interface (Ethernet NIC)"
        ],
        "answer": 0,
        "explanation": "UEFI (Unified Extensible Firmware Interface) is the motherboard firmware environment and setup utility itself, not a storage medium containing an operating system bootloader. USB flash drives, NVMe SSDs, optical discs, and PXE network adapters are valid boot devices that can be set in the boot order list.",
        "distractor_analysis": {
            "1": "USB flash drives containing bootable ISO media (e.g., Windows installer) are standard primary boot choices.",
            "2": "M.2 NVMe SSDs hosting the primary OS partition (e.g., Windows Boot Manager) are standard primary boot devices.",
            "3": "PXE network boot allows a computer to boot an OS image across the local network via its NIC."
        },
        "tags": ["hardware", "bios", "uefi", "boot-order"]
    },
    {
        "id": "C1-142",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A user turns on their desktop computer and encounters a black screen with the error message: 'No bootable device found. Press any key to retry.' What is the most likely cause of this error?",
        "options": [
            "The UEFI/BIOS boot order is prioritized to a non-bootable USB drive or the internal primary drive boot sector is disconnected/corrupted",
            "The computer case fan speed is set to Silent mode in motherboard settings",
            "The USB mouse optical sensor is dirty and failing to register movement",
            "The monitor HDMI cable is operating in High-Speed mode instead of Standard mode"
        ],
        "answer": 0,
        "explanation": "'No bootable device found' occurs when the BIOS/UEFI attempts to boot from the configured boot sequence but finds no valid Master Boot Record (MBR) or EFI System Partition (ESP) bootloader (e.g., an unbootable flash drive was left plugged in, the internal drive SATA/NVMe cable became disconnected, or the drive failed). Fan speeds, mouse sensors, and HDMI cable modes do not trigger boot sector errors.",
        "distractor_analysis": {
            "1": "Fan speed profiles control cooling noise and thermal curves, having no impact on storage boot device detection.",
            "2": "A dirty optical mouse sensor affects cursor tracking in the OS, completely unrelated to firmware boot device discovery.",
            "3": "HDMI cable speed modes govern digital video bandwidth, with no influence on storage bootloader execution."
        },
        "tags": ["troubleshooting", "boot", "no-boot-device", "bios"]
    },
    {
        "id": "C1-143",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "According to the legacy PC 99 system design standard, what color coding is designated for the physical 6-pin Mini-DIN PS/2 mouse port?",
        "options": [
            "Green (PS/2 Mouse)",
            "Purple (PS/2 Keyboard)",
            "Teal (Serial COM Port)",
            "Pink (Microphone Input)"
        ],
        "answer": 0,
        "explanation": "Under the industry-standard Microsoft/Intel PC 99 design guide, PS/2 mouse ports are color-coded Green, while PS/2 keyboard ports are color-coded Purple. Pink is color-coded for analog microphone inputs, and Light Blue is for audio line-in.",
        "distractor_analysis": {
            "1": "Purple is the designated standard color for the PS/2 Mini-DIN keyboard port.",
            "2": "Teal/Turquoise was historically used for legacy DB-9 serial COM ports on older ATX motherboards.",
            "3": "Pink is the universal standard color coding for the 3.5mm analog microphone input jack."
        },
        "tags": ["hardware", "connectors", "ps2", "color-coding"]
    },
    {
        "id": "C1-144",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which standard Windows operating system management console or configuration applet allows a technician to customize mouse pointer speed, double-click sensitivity, and button mapping?",
        "options": [
            "Windows Settings (Bluetooth & devices -> Mouse) / Control Panel (Mouse applet)",
            "Disk Management console (diskmgmt.msc)",
            "Performance Monitor (perfmon.msc)",
            "Services management console (services.msc)"
        ],
        "answer": 0,
        "explanation": "Mouse settings (pointer speed, acceleration, primary button swapping, double-click speed, scroll wheel lines) are configured in Windows Settings under 'Bluetooth & devices -> Mouse' or via the classic 'Mouse' applet (main.cpl) in Control Panel. Disk Management handles drive partitions, Performance Monitor graphs hardware metrics, and Services manages background OS services.",
        "distractor_analysis": {
            "1": "Disk Management is used to partition, format, and assign drive letters to storage drives.",
            "2": "Performance Monitor graphs real-time CPU, memory, and disk counters for system performance analysis.",
            "3": "Services console is used to start, stop, and configure startup types for background Windows services."
        },
        "tags": ["hardware", "peripherals", "mouse", "windows", "configuration"]
    },
    {
        "id": "C1-145",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which dedicated audio interface standard provides pure multi-channel digital audio output over optical fiber (TOSLINK) or coaxial RCA cables to home theater receivers without analog conversion loss?",
        "options": [
            "Sony/Philips Digital Interface (S/PDIF)",
            "3.5mm analog stereo headphone jack",
            "Analog pink 3.5mm microphone jack",
            "DB-15 legacy MIDI/gameport connector"
        ],
        "answer": 0,
        "explanation": "S/PDIF (Sony/Philips Digital Interface) is a dedicated digital audio interconnect standard that carries uncompressed stereo PCM or compressed 5.1/7.1 surround sound (Dolby Digital/DTS) over optical fiber (TOSLINK) or 75-ohm coaxial RCA cables without suffering analog signal degradation. Standard 3.5mm jacks carry analog electrical voltages.",
        "distractor_analysis": {
            "1": "The 3.5mm TRS stereo jack transmits analog audio voltages prone to electrical noise and ground loop hum.",
            "2": "The pink 3.5mm jack is an analog microphone input, converting analog voice signals to electrical voltages.",
            "3": "The DB-15 gameport was a legacy 1990s port for analog joysticks and MIDI musical instruments."
        },
        "tags": ["hardware", "audio", "spdif", "toslink", "digital-audio"]
    },
    {
        "id": "C1-146",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "When selecting a physical expansion slot on a motherboard to install a high-end dual-slot discrete graphics card, which of the following is NOT a physical hardware clearance or architectural consideration?",
        "options": [
            "The specific version and edition of the desktop operating system to be installed later",
            "Physical slot clearance and obstruction of adjacent PCIe slots by the thick cooler shroud",
            "Adequate chassis airflow spacing between the GPU intake fans and the PSU shroud or adjacent cards",
            "The physical lane width and generation of the slot (e.g., PCIe 4.0 x16 wired directly to the CPU)"
        ],
        "answer": 0,
        "explanation": "The specific software operating system version has zero bearing on the physical slot selection on the motherboard PCB; PCIe hardware standards are universally governed by hardware geometry and electrical signaling. Physical slot spacing, cooler clearance, airflow obstruction, and electrical lane routing (x16 directly to CPU vs chipset) are critical hardware considerations.",
        "distractor_analysis": {
            "1": "Multi-slot GPU cooler shrouds often physically block adjacent PCIe slots, requiring careful placement planning.",
            "2": "Ensuring adequate clearance between GPU fans and adjacent components is critical to prevent thermal throttling.",
            "3": "Installing a GPU in a slot with full x16 CPU lanes ensures maximum memory and compute bandwidth."
        },
        "tags": ["hardware", "pcie", "expansion-cards", "motherboard", "form-factor"]
    },
    {
        "id": "C1-147",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is a dangerous, incorrect procedure that must NEVER be performed when installing an internal PCIe expansion card onto a motherboard?",
        "options": [
            "Installing the expansion card into the PCIe slot while the computer is fully powered on and running",
            "Powering off the PC, unplugging the AC power cord, and pressing the power button to discharge capacitors",
            "Aligning the card bracket with the chassis opening and pressing firmly until seated evenly",
            "Securing the metal card retention bracket to the chassis frame with a mounting screw"
        ],
        "answer": 0,
        "explanation": "Standard PCIe expansion cards on desktop motherboards are not hot-pluggable. Attempting to insert or remove a PCIe card while the system is powered on causes massive electrical short circuits across power pins (+12V/+3.3V), instantly destroying the expansion card, motherboard, and processor. Proper procedure requires shutting down, unplugging AC power, discharging residual power, seating the card, and screwing down the bracket before powering on.",
        "distractor_analysis": {
            "1": "Disconnecting AC power and draining residual capacitance is the mandatory electrical safety procedure for internal PC maintenance.",
            "2": "Aligning the card and pressing firmly until it seats evenly into the PCIe slot is the standard installation procedure.",
            "3": "Securing the bracket with a screw or chassis latch prevents mechanical sagging and prevents the card from pulling out of the slot."
        },
        "tags": ["hardware", "pcie", "safety", "installation"]
    },
    {
        "id": "C1-148",
        "objective": "4.1",
        "type": "single",
        "difficulty": "easy",
        "question": "When sizing and building a dedicated workstation intended to host multiple concurrent virtual machines simultaneously, which two hardware resources require the largest capacity allocations?",
        "options": [
            "Physical System RAM capacity and Multi-Core CPU processing threads",
            "High-end 3D ray-tracing gaming graphics card and RGB lighting controller",
            "Analog 5.1 surround sound audio expansion card and microphone preamp",
            "Optical Blu-ray writer drive and mechanical floppy drive"
        ],
        "answer": 0,
        "explanation": "Virtualization workstations partition physical host compute resources among multiple guest operating systems. Therefore, maximizing physical RAM capacity (so each guest VM has sufficient dedicated memory without paging) and multi-core CPU threads (providing vCPUs for concurrent execution) are the two most critical hardware requirements. 3D gaming GPUs, sound cards, and optical drives are non-essential for virtualization hosts.",
        "distractor_analysis": {
            "1": "High-end 3D ray-tracing GPUs are built for gaming and workstation 3D rendering, unnecessary for standard server virtualization hosts.",
            "2": "Surround sound audio cards provide analog audio output, having no impact on virtualization capacity or VM density.",
            "3": "Optical Blu-ray and floppy drives are legacy storage devices completely unnecessary for modern VM provisioning via ISO images."
        },
        "tags": ["virtualization", "hardware", "cpu", "ram", "sizing"]
    },
    {
        "id": "C1-149",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the core hardware storage technology implemented inside a Network Attached Storage (NAS) appliance to ensure high data availability and protect stored shared files against drive failure?",
        "options": [
            "Redundant Array of Independent Disks (RAID array)",
            "Single standalone unpartitioned dynamic disk",
            "Internal optical DVD-RAM jukebox",
            "Dual-port analog 56k dial-up modem card"
        ],
        "answer": 0,
        "explanation": "Network Attached Storage (NAS) appliances rely on RAID arrays (such as RAID 1, RAID 5, RAID 6, or RAID 10) across multiple hard drives or SSDs to provide storage pooling, data redundancy, and uninterrupted file-sharing services even if one or two drives fail. Standalone single disks provide no redundancy, optical jukeboxes are legacy archives, and 56k modems are obsolete dial-up interfaces.",
        "distractor_analysis": {
            "1": "A single standalone disk has no fault tolerance; if that drive fails, all shared NAS data is immediately lost.",
            "2": "Optical jukeboxes are specialized legacy archival hardware, not standard NAS file storage engines.",
            "3": "56k dial-up modems provide slow analog serial WAN communication, completely irrelevant to LAN NAS storage arrays."
        },
        "tags": ["hardware", "storage", "nas", "raid", "fault-tolerance"]
    },
    {
        "id": "C1-150",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following statements is INCORRECT regarding Digital Visual Interface (DVI) video connectors and signaling standards?",
        "options": [
            "DVI-I connectors can only carry analog RGB signals and are incapable of transmitting digital video",
            "DVI-I (Integrated) carries both digital video signals and analog RGB video signals on the same physical connector",
            "DVI-D (Digital-only) carries purely digital video streams and cannot be connected to VGA with a passive pin adapter",
            "Dual-Link DVI incorporates a second TMDS data transmitter to support higher resolutions (e.g., 2560x1600 at 60Hz)"
        ],
        "answer": 0,
        "explanation": "DVI-I (Integrated) carries BOTH digital signals (via TMDS pins) and analog RGB signals (via the four pins surrounding the flat blade). Therefore, stating that DVI-I can only carry analog signals is false. DVI-D is digital-only, and Dual-Link DVI doubles bandwidth for high-resolution displays.",
        "distractor_analysis": {
            "1": "DVI-I indeed integrates both digital and analog pins, allowing passive DVI-to-VGA adapters to extract the analog signal.",
            "2": "DVI-D omits the analog pins around the flat blade and only transmits digital TMDS signals.",
            "3": "Dual-link DVI features 24 digital pins utilizing two TMDS transmitters to support resolutions up to 2560x1600."
        },
        "tags": ["hardware", "cables", "dvi", "video", "connectors"]
    }
]
