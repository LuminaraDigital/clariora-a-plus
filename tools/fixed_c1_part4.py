#!/usr/bin/env python3
"""Part 4 of fixed Core 1 questions: C1-151 to C1-200."""

PART4_QUESTIONS = [
    {
        "id": "C1-151",
        "objective": "5.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A user notices that their external desktop monitor displays distorted color patterns (such as a severe pink or green color tint across the entire image). Which troubleshooting action should the technician perform first?",
        "options": [
            "Inspect the video cable pins and firmly reseat the video cable connectors at both ends",
            "Replace the liquid crystal display panel subpixel matrix",
            "Degauss the LED backlit monitor using an electromagnetic wand",
            "Permanently disable hardware graphics acceleration in the OS"
        ],
        "answer": 0,
        "explanation": "Incorrect or tinted color patterns across a display are commonly caused by a loose, unseated, or damaged video cable (VGA, DVI, HDMI, DisplayPort) where individual color signal pins (red, green, or blue channels) lose physical electrical contact. Reseating or replacing the cable resolves this. Dead pixels or subpixel physical defects require panel replacement, degaussing only applies to vintage CRT monitors, and disabling GPU acceleration does not fix physical pin contacts.",
        "distractor_analysis": {
            "1": "Replacing the LCD panel is an expensive physical teardown and should only be considered after testing basic external cable seating.",
            "2": "Degaussing is a magnetic demagnetizing procedure used exclusively on cathode ray tube (CRT) monitors, not flat-panel LED displays.",
            "3": "Disabling GPU hardware acceleration alters software rendering pipelines and cannot restore disconnected physical video cable pins."
        },
        "tags": ["troubleshooting", "display", "cables", "color-tint"]
    },
    {
        "id": "C1-152",
        "objective": "5.3",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following conditions is NOT a cause of graphics card (GPU) overheating and thermal throttling inside a workstation chassis?",
        "options": [
            "A failed CCFL high-voltage backlight inverter inside an external monitor",
            "A seized or malfunctioning GPU cooling fan",
            "Clogged chassis intake dust filters and inadequate case ventilation",
            "Sustained 100% compute workload during 3D rendering or cryptographic hashing"
        ],
        "answer": 0,
        "explanation": "A high-voltage backlight inverter is an internal component of older CCFL-backlit LCD monitors; if it fails, the external monitor screen goes black or very dim, but it has zero physical or thermal connection to the computer's internal PCIe graphics card. Seized GPU fans, clogged chassis filters, and sustained 100% GPU compute workloads directly cause graphics card overheating.",
        "distractor_analysis": {
            "1": "A failed or seized GPU fan stops forced-air convection across the GPU heatsink fins, causing immediate thermal spikes.",
            "2": "Clogged dust filters prevent cool ambient air from entering the chassis, starving internal components of cooling airflow.",
            "3": "Sustained heavy 3D or compute workloads push GPU power draw to maximum TDP, generating high continuous heat."
        },
        "tags": ["troubleshooting", "gpu", "overheating", "display"]
    },
    {
        "id": "C1-153",
        "objective": "2.6",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the correct hexadecimal character representation of the 4-bit binary nibble 1100?",
        "options": [
            "Hexadecimal C (decimal value 12)",
            "Hexadecimal A (decimal value 10)",
            "Hexadecimal B (decimal value 11)",
            "Hexadecimal D (decimal value 13)"
        ],
        "answer": 0,
        "explanation": "In hexadecimal conversion, 4-bit binary values map as follows: 1010 = A (10), 1011 = B (11), 1100 = C (12), 1101 = D (13), 1110 = E (14), and 1111 = F (15). Therefore, 1100 (8 + 4 = 12) equals hexadecimal C.",
        "distractor_analysis": {
            "1": "Hexadecimal A represents binary 1010 (decimal 10).",
            "2": "Hexadecimal B represents binary 1011 (decimal 11).",
            "3": "Hexadecimal D represents binary 1101 (decimal 13)."
        },
        "tags": ["networking", "hexadecimal", "binary", "addressing"]
    },
    {
        "id": "C1-154",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "How many hexadecimal characters are used to represent a 48-bit Layer 2 Media Access Control (MAC) address?",
        "options": [
            "12 hexadecimal characters (organized as 6 pairs, e.g., 00:1A:2B:3C:4D:5E)",
            "8 hexadecimal characters",
            "16 hexadecimal characters",
            "32 hexadecimal characters"
        ],
        "answer": 0,
        "explanation": "A standard MAC address is 48 bits long. Because each hexadecimal character represents exactly 4 bits (a nibble), 48 bits / 4 bits = 12 hexadecimal characters (expressed as 6 colon- or hyphen-separated octets, e.g., 00:1A:2B:3C:4D:5E, or 3 groups of 4 digits in Cisco format 001a.2b3c.4d5e).",
        "distractor_analysis": {
            "1": "8 hexadecimal characters represents 32 bits, which is the size of an IPv4 address.",
            "2": "16 hexadecimal characters represents 64 bits, which is the size of an EUI-64 interface identifier.",
            "3": "32 hexadecimal characters represents 128 bits, which is the total length of an IPv6 address."
        },
        "tags": ["networking", "mac-address", "hexadecimal", "layer-2"]
    },
    {
        "id": "C1-155",
        "objective": "2.6",
        "type": "single",
        "difficulty": "easy",
        "question": "In an IPv4 subnet mask (such as 255.255.255.0), what does the value 255 in an octet indicate to the IP routing stack?",
        "options": [
            "All 8 bits in that octet represent the network portion of the address and must match within the subnet",
            "All 8 bits in that octet are available for assigning unique host interfaces",
            "The octet is reserved exclusively for multicast streaming groups",
            "The network interface must operate in half-duplex mode"
        ],
        "answer": 0,
        "explanation": "In IPv4 subnet masking, 255 in decimal equals 11111111 in binary (all 1s). A bit value of 1 in a subnet mask designates that the corresponding bit in the IP address belongs to the Network/Subnet ID. Conversely, a bit value of 0 (e.g., in the last octet of a /24 mask) indicates available Host ID bits.",
        "distractor_analysis": {
            "1": "Host address bits are indicated by 0s in the subnet mask, not 255 (which is all 1s).",
            "2": "Multicast addresses are defined by Class D IPv4 address ranges (224.0.0.0/4), not the subnet mask value 255.",
            "3": "Duplex mode is a Layer 2 physical/data link layer negotiation setting completely independent of Layer 3 subnet masks."
        },
        "tags": ["networking", "subnet-mask", "ipv4", "addressing"]
    },
    {
        "id": "C1-156",
        "objective": "5.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A traveling executive cannot connect to a hotel wireless network that their laptop previously used last month. The hotel reports the Wi-Fi is working for other guests. What is the most practical first troubleshooting step on the executive's laptop?",
        "options": [
            "Delete / forget the saved wireless network profile and reconnect by entering the current credentials",
            "Reboot the hotel core gateway router into recovery mode",
            "Install a high-gain directional Yagi antenna onto the laptop display bezel",
            "Re-flash the laptop motherboard BIOS firmware"
        ],
        "answer": 0,
        "explanation": "When a client device cannot connect to a previously used public or commercial Wi-Fi network, the cached wireless profile on the laptop often contains outdated security certificates, encryption keys, or authentication parameters from the previous stay. Deleting ('forgetting') the network profile in Windows/macOS forces the OS to re-probe the SSID and prompt for fresh authentication credentials. Guests cannot reboot hotel infrastructure, hardware antennas are unnecessary, and BIOS flashing is inappropriate.",
        "distractor_analysis": {
            "1": "End users and guests have no administrative authorization or physical access to hotel enterprise network routers.",
            "2": "Attaching external directional Yagi antennas is unnecessary for standard hotel Wi-Fi and impractical for business travel.",
            "3": "Flashing system BIOS firmware is high-risk and irrelevant to standard 802.11 cached SSID profile authentication errors."
        },
        "tags": ["troubleshooting", "wireless", "wifi", "profiles", "forget-network"]
    },
    {
        "id": "C1-157",
        "objective": "2.7",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following statements is INCORRECT regarding legacy analog dial-up Internet connections compared to modern broadband connections?",
        "options": [
            "Analog dial-up connections support multi-megabit broadband speeds of 1.5 Mbps to 100 Mbps",
            "Analog dial-up connections max out at a theoretical maximum speed of 56 Kbps using the V.90/V.92 standard",
            "Broadband connections (DSL, Cable, Fiber) provide 'always-on' high-speed connectivity",
            "Cable broadband networks transmit data over coaxial lines using the DOCSIS specification"
        ],
        "answer": 0,
        "explanation": "Analog dial-up connections over the public switched telephone network (PSTN) are fundamentally limited by voice-band analog audio bandwidth to a theoretical maximum of 56 Kbps (0.056 Mbps); they cannot achieve multi-megabit broadband speeds. Broadband is always-on, DSL uses PPPoE/ATM over copper phone pairs, and cable broadband uses DOCSIS over hybrid fiber-coaxial lines.",
        "distractor_analysis": {
            "1": "Dial-up modem technology historically peaked at 56 Kbps under the ITU V.90 and V.92 standards.",
            "2": "Broadband services maintain continuous dedicated digital connections without dialing up phone numbers.",
            "3": "Cable modems utilize Data Over Cable Service Interface Specification (DOCSIS) standards to provide high-speed internet over TV coaxial cable."
        },
        "tags": ["networking", "internet-connections", "dial-up", "broadband", "docsis"]
    },
    {
        "id": "C1-158",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "In File Transfer Protocol (FTP) operations, which standard TCP port is used for command/control session management, and which TCP port is used for active mode data transfers?",
        "options": [
            "TCP port 21 for Control/Commands and TCP port 20 for Active Data transfer",
            "TCP port 20 for Control and TCP port 21 for Data",
            "TCP port 22 for Control and TCP port 23 for Data",
            "TCP port 80 for Control and TCP port 443 for Data"
        ],
        "answer": 0,
        "explanation": "Standard File Transfer Protocol (FTP) uses two separate TCP ports: TCP port 21 is the Control port (used for establishing the connection, authentication, and issuing commands like GET/PUT), while TCP port 20 is the Data port used in Active FTP mode for transferring the actual files. Port 22 is SSH/SFTP, Port 23 is Telnet, Port 80 is HTTP, and Port 443 is HTTPS.",
        "distractor_analysis": {
            "1": "The port roles are reversed; port 21 handles control commands and port 20 handles active data connections.",
            "2": "TCP port 22 is Secure Shell (SSH) and TCP port 23 is Telnet, which are remote command-line terminal protocols.",
            "3": "TCP port 80 (HTTP) and TCP port 443 (HTTPS) are web protocols, not standard FTP ports."
        },
        "tags": ["networking", "ports", "ftp", "protocols"]
    },
    {
        "id": "C1-159",
        "objective": "1.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following built-in hardware input devices is permanently integrated directly into the palmrest of standard portable laptop computers but absent on standalone desktop tower cases?",
        "options": [
            "Integrated capacitive touchpad / trackpad with gesture support",
            "Dedicated function keys (F1 through F12)",
            "Operating system graphics driver stack",
            "Direct motherboard expansion slots"
        ],
        "answer": 0,
        "explanation": "A capacitive touchpad (or trackpad) is integrated directly into the laptop palmrest assembly to provide pointing and gesture control without requiring an external mouse. Desktop computers rely on external standalone mice. Function keys exist on desktop keyboards, graphics drivers are software, and expansion slots are internal.",
        "distractor_analysis": {
            "1": "Function keys (F1-F12) are standard on all full-size desktop keyboards as well as laptop keyboards.",
            "2": "Operating system graphics drivers are software modules present on both desktop and laptop systems.",
            "3": "Direct expansion slots (PCIe) are standard features on desktop motherboards."
        },
        "tags": ["mobile", "laptop", "touchpad", "hardware"]
    },
    {
        "id": "C1-160",
        "objective": "1.2",
        "type": "single",
        "difficulty": "easy",
        "question": "What technology superimposes computer-generated digital graphical elements, text, and 3D overlays onto the user's real-world physical visual environment in real time?",
        "options": [
            "Augmented Reality (AR)",
            "Fully immersive Virtual Reality (VR)",
            "DisplayPort Multi-Stream Transport (MST)",
            "Liquid Crystal Subpixel Addressing"
        ],
        "answer": 0,
        "explanation": "Augmented Reality (AR) superimposes computer-generated graphics, sensor telemetry, and digital annotations on top of the real physical world (viewed through smartphone cameras, smart glasses, or heads-up displays). Virtual Reality (VR) replaces the physical world entirely with a simulated virtual environment. MST is display daisy-chaining, and subpixel addressing is an LCD panel driving method.",
        "distractor_analysis": {
            "1": "Virtual Reality (VR) occludes the physical world completely, immersing the user in an entirely synthetic 3D environment via a closed headset.",
            "2": "DisplayPort MST is a video cable standard that allows daisy-chaining multiple physical monitors.",
            "3": "Subpixel addressing is the electronic driving of individual red, green, and blue subpixels in flat-panel displays."
        },
        "tags": ["mobile", "accessories", "augmented-reality", "ar", "vr"]
    },
    {
        "id": "C1-161",
        "objective": "5.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following user actions is a high-risk security hazard that invites malware infections and phishing exploits rather than a cybersecurity best practice?",
        "options": [
            "Opening and executing unexpected email file attachments and embedded macro links from unknown senders",
            "Applying operating system and application security patches regularly",
            "Maintaining active, updated anti-malware and endpoint detection software",
            "Enabling and configuring a host-based stateful firewall"
        ],
        "answer": 0,
        "explanation": "Opening unverified email attachments, downloading unknown payloads, or executing embedded macros from untrusted sources is a major vector for ransomware, trojans, and credential harvesting. In contrast, applying security updates promptly, running anti-malware protection, and maintaining host firewalls are core defense-in-depth best practices.",
        "distractor_analysis": {
            "1": "Regularly applying software security patches closes known vulnerabilities before attackers can exploit them.",
            "2": "Running updated anti-malware software detects and blocks malicious binaries in real time.",
            "3": "Configuring a host-based firewall restricts unauthorized incoming network probes and rogue connections."
        },
        "tags": ["security", "best-practices", "malware", "email"]
    },
    {
        "id": "C1-162",
        "objective": "3.6",
        "type": "single",
        "difficulty": "easy",
        "question": "On a standard 4-pin Molex peripheral power connector from an ATX power supply, what DC voltage is delivered by the yellow wire?",
        "options": [
            "+12 V DC (Yellow wire)",
            "+5 V DC (Red wire)",
            "+3.3 V DC (Orange wire)",
            "Ground / Common 0V (Black wires)"
        ],
        "answer": 0,
        "explanation": "On a standard 4-pin Molex power connector: the Yellow wire delivers +12V DC (primarily powering drive spindle motors and fans), the Red wire delivers +5V DC (powering logic circuitry), and the two center Black wires provide electrical Ground. +3.3V is delivered via Orange wires on 24-pin ATX and SATA power connectors.",
        "distractor_analysis": {
            "1": "+5V DC is supplied by the Red wire on Molex, 24-pin ATX, and SATA power connectors.",
            "2": "+3.3V DC is supplied by Orange wires on modern SATA power and 24-pin main ATX connectors, absent on 4-pin Molex.",
            "3": "Ground (0V reference) is provided by the two center Black wires on the 4-pin Molex connector."
        },
        "tags": ["hardware", "power", "molex", "voltage", "color-coding"]
    },
    {
        "id": "C1-163",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which CPU socket architecture features arrayed metal contact pins protruding from the bottom of the processor package that insert into matching socket holes on the motherboard?",
        "options": [
            "Pin Grid Array (PGA)",
            "Land Grid Array (LGA)",
            "Ball Grid Array (BGA)",
            "Surface Mount Technology (SMT)"
        ],
        "answer": 0,
        "explanation": "In a Pin Grid Array (PGA) socket design (traditionally used on AMD socket AM4 and older Intel processors), the physical connector pins are attached to the processor package and insert into mating holes on the motherboard socket, locked in place by a Zero Insertion Force (ZIF) lever. LGA places the pins in the socket, and BGA is soldered.",
        "distractor_analysis": {
            "1": "Land Grid Array (LGA) places the spring-loaded pins inside the motherboard socket, while the processor has flat gold contact pads.",
            "2": "Ball Grid Array (BGA) solders the processor directly onto the motherboard PCB using microscopic solder balls.",
            "3": "Surface Mount Technology (SMT) is an automated manufacturing process for soldering components onto PCBs."
        },
        "tags": ["hardware", "cpu", "pga", "sockets"]
    },
    {
        "id": "C1-164",
        "objective": "3.3",
        "type": "single",
        "difficulty": "easy",
        "question": "How many total electrical contact pins are present on a standard desktop DDR4 unbuffered Dual In-line Memory Module (DIMM)?",
        "options": [
            "288 pins",
            "240 pins",
            "260 pins",
            "204 pins"
        ],
        "answer": 0,
        "explanation": "DDR4 desktop unbuffered DIMMs feature 288 pins with an off-center keying notch and slightly curved bottom edge to reduce insertion force. 240 pins is used for DDR2 and DDR3 desktop DIMMs, 260 pins is for DDR4 laptop SO-DIMMs, and 204 pins is for DDR3 laptop SO-DIMMs.",
        "distractor_analysis": {
            "1": "240 pins is the standard pin count for DDR2 and DDR3 desktop DIMMs.",
            "2": "260 pins is the standard pin count for DDR4 laptop SO-DIMM modules.",
            "3": "204 pins is the standard pin count for DDR3 laptop SO-DIMM modules."
        },
        "tags": ["hardware", "ram", "ddr4", "pin-counts"]
    },
    {
        "id": "C1-165",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the maximum theoretical interface signaling bandwidth of the Serial ATA Revision 3.0 (SATA III) storage specification?",
        "options": [
            "6 Gbps (yielding ~600 MB/s actual uncompressed throughput)",
            "1.5 Gbps (yielding ~150 MB/s throughput)",
            "3 Gbps (yielding ~300 MB/s throughput)",
            "10 Gbps (yielding ~1 GB/s throughput)"
        ],
        "answer": 0,
        "explanation": "The SATA Revision 3.0 (SATA III) standard operates at a bus speed of 6 Gbps, which after 8b/10b line encoding overhead provides a maximum net data throughput of approximately 600 MB/s. SATA I operates at 1.5 Gbps, SATA II operates at 3 Gbps, and 10 Gbps is standard for USB 3.2 Gen 2.",
        "distractor_analysis": {
            "1": "1.5 Gbps was the bandwidth of first-generation SATA Revision 1.0 (SATA I).",
            "2": "3 Gbps was the bandwidth of second-generation SATA Revision 2.0 (SATA II).",
            "3": "10 Gbps is the bandwidth of USB 3.2 Gen 2 or 10GBASE-T Ethernet, not SATA."
        },
        "tags": ["hardware", "storage", "sata", "bandwidth", "specifications"]
    },
    {
        "id": "C1-166",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "Which high-performance solid-state drive host interface communicates directly across PCIe lanes to achieve multi-gigabyte per second throughput and ultra-low command latency?",
        "options": [
            "Non-Volatile Memory Express (NVMe)",
            "Legacy SATA Revision 3.0",
            "mSATA (Mini-SATA)",
            "Parallel ATA (PATA / IDE)"
        ],
        "answer": 0,
        "explanation": "Non-Volatile Memory Express (NVMe) communicates directly across high-speed PCI Express bus lanes (e.g., PCIe 4.0 x4 providing up to 8 GB/s bandwidth) with 64,000 deep command queues, bypassing the legacy AHCI bottleneck. SATA and mSATA are capped at 6 Gbps (600 MB/s) over SATA controllers, and PATA is legacy 133 MB/s.",
        "distractor_analysis": {
            "1": "SATA III is limited by SATA controller architecture to a maximum theoretical throughput of 6 Gbps (~600 MB/s).",
            "2": "mSATA uses the SATA protocol across a mini-PCIe physical form factor, sharing the same 6 Gbps SATA speed ceiling.",
            "3": "Parallel ATA is an obsolete legacy ribbon interface limited to 133 MB/s maximum burst bandwidth."
        },
        "tags": ["hardware", "storage", "nvme", "pcie", "ssd"]
    },
    {
        "id": "C1-167",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A desktop computer functions normally while powered on, but every time the AC power cord is disconnected or the power strip is switched off, the system clock resets to January 1st and BIOS settings revert to default. What is the permanent fix?",
        "options": [
            "Replace the CR2032 lithium coin-cell battery on the motherboard",
            "Replace the main power supply unit (PSU)",
            "Reinstall the 64-bit Windows operating system",
            "Flash the motherboard BIOS with beta overclocking firmware"
        ],
        "answer": 0,
        "explanation": "The CR2032 3V lithium coin-cell battery on the motherboard provides continuous trickle power to the volatile CMOS RAM and Real-Time Clock (RTC) chip when the computer is unplugged from AC mains. When this battery dies, disconnecting mains power drains volatile memory, causing the clock to reset and BIOS settings to revert to factory defaults. Replacing the battery permanently resolves the issue.",
        "distractor_analysis": {
            "1": "The PSU powers the computer while plugged in; it does not maintain RTC clock state when unplugged from the wall.",
            "2": "Operating system reinstallation does not affect pre-boot motherboard RTC hardware registers.",
            "3": "Flashing firmware updates code logic but does not restore electrical power to depleted CMOS battery cells."
        },
        "tags": ["troubleshooting", "hardware", "cmos", "battery", "cr2032", "rtc"]
    },
    {
        "id": "C1-168",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary security function of the UEFI Secure Boot feature during system initialization?",
        "options": [
            "It validates the cryptographic digital signatures of bootloader binaries, Option ROMs, and OS kernel drivers against trusted OEM certificates",
            "It enforces complex user passwords before unlocking BIOS menus",
            "It scans installed system RAM memory chips for physical bit flip errors",
            "It automatically encrypts the entire solid-state drive with AES-256"
        ],
        "answer": 0,
        "explanation": "UEFI Secure Boot uses a Public Key Infrastructure (PKI) hierarchy embedded in firmware (the Signature Database / db and KEK) to verify that the bootloader (e.g., Windows Boot Manager, bootx64.efi), Option ROMs, and kernel drivers are digitally signed by a trusted certificate authority before allowing them to execute. This blocks rootkits and unauthorized boot media. Password enforcement, RAM parity checks, and disk encryption are separate features.",
        "distractor_analysis": {
            "1": "BIOS User and Administrator passwords enforce pre-boot authentication, which is distinct from digital signature verification.",
            "2": "RAM error checking is performed by ECC memory hardware and POST memory tests, not Secure Boot.",
            "3": "Full-disk encryption (BitLocker) encrypts storage sectors using TPM keys, independent of Secure Boot signature verification."
        },
        "tags": ["hardware", "uefi", "secure-boot", "security", "certificates"]
    },
    {
        "id": "C1-169",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which specific hardware cryptographic security processor specification is a mandatory platform prerequisite for installing or upgrading to the Microsoft Windows 11 operating system?",
        "options": [
            "Trusted Platform Module version 2.0 (TPM 2.0)",
            "Legacy TPM version 1.2",
            "Hardware Security Module (HSM) PCIe expansion blade",
            "Smart card CAC reader terminal"
        ],
        "answer": 0,
        "explanation": "Microsoft Windows 11 mandates hardware-based security requirements, including UEFI firmware with Secure Boot capability and a Trusted Platform Module (TPM) version 2.0 (either discrete dTPM or firmware fTPM / Intel PTT / AMD fTPM) for secure identity, credential protection, and virtualization-based security (VBS). TPM 1.2 does not meet Windows 11 requirements.",
        "distractor_analysis": {
            "1": "TPM 1.2 is an older standard that lacks modern cryptographic algorithms (SHA-256) and does not satisfy the official Windows 11 hardware baseline.",
            "2": "A Hardware Security Module (HSM) is an enterprise cryptographic accelerator for datacenter servers, not a consumer Windows 11 requirement.",
            "3": "Smart card readers are authentication peripherals used for two-factor login, not a mandatory OS prerequisite."
        },
        "tags": ["hardware", "tpm", "windows11", "security", "specifications"]
    },
    {
        "id": "C1-170",
        "objective": "5.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A user brings in a laptop whose display appears completely black, but when a bright flashlight is shined at a close angle against the screen, the Windows desktop icons and open windows are faintly visible. What is the root cause of this failure?",
        "options": [
            "A failed CCFL/LED backlight assembly or inverter board",
            "A completely dead discrete graphics processing unit (GPU)",
            "A cracked capacitive digitizer glass layer",
            "A loose external HDMI audio cable"
        ],
        "answer": 0,
        "explanation": "If the LCD panel is rendering images properly (visible with a flashlight) but no illumination is produced, the liquid crystals are active while the illumination system has failed (either a faulty LED backlight strip, defective backlight driver circuitry on the motherboard, or a failed CCFL inverter on older laptops). If the GPU were dead, no image would be generated at all. A broken digitizer affects touch input, and HDMI audio cables have no relation to internal laptop screens.",
        "distractor_analysis": {
            "1": "If the GPU were dead or unseated, the frame buffer would not generate any image on the LCD panel, even under a flashlight.",
            "2": "A cracked digitizer impacts touch and pen recognition, but does not extinguish the screen's backlight.",
            "3": "External HDMI audio cables carry sound to external TVs/monitors and have no connection to internal laptop LCD backlighting."
        },
        "tags": ["troubleshooting", "display", "backlight", "inverter", "flashlight-test"]
    },
    {
        "id": "C1-171",
        "objective": "5.4",
        "type": "single",
        "difficulty": "medium",
        "question": "A tablet displays a clear, vibrant image with no visual defects, but tapping, swiping, or touching the glass produces zero response across the entire screen. Which component has failed and must be replaced?",
        "options": [
            "The capacitive touchscreen digitizer panel",
            "The LED backlight array",
            "The high-voltage backlight inverter",
            "The graphics processing unit (GPU)"
        ],
        "answer": 0,
        "explanation": "A touchscreen display assembly consists of two distinct layers: the display panel (LCD/OLED) that produces visual images and the digitizer (a transparent capacitive glass grid) that detects touch coordinates and converts touch into digital input. When the image is perfect but touch does not register, the digitizer (or its flex cable) has failed. Backlight/inverter failures cause dark screens, and GPU failures cause graphical artifacts or black screens.",
        "distractor_analysis": {
            "1": "The LED backlight provides screen brightness; if it failed, the screen would be dark, but touch input would still function.",
            "2": "The backlight inverter powers CCFL backlights on older screens and does not process touch input signals.",
            "3": "The GPU renders visual frames; if it failed, the display would show graphical corruption, artifacts, or no video output."
        },
        "tags": ["troubleshooting", "mobile", "digitizer", "touchscreen"]
    },
    {
        "id": "C1-172",
        "objective": "5.3",
        "type": "single",
        "difficulty": "medium",
        "question": "During a presentation, a conference room projector suddenly goes completely dark, the warning LED flashes amber, and its internal cooling fan spins at maximum speed for several minutes. What is the most likely cause?",
        "options": [
            "The projector lamp/bulb has overheated or burned out due to thermal thermal buildup or clogged air filters",
            "The video source resolution was automatically changed from 1080p to 4K",
            "The HDMI cable lost ground pin continuity",
            "The operating system video device driver crashed silently"
        ],
        "answer": 0,
        "explanation": "Projector high-intensity discharge (HID) lamps generate immense heat. If thermal sensors detect excessive temperature (e.g., due to clogged intake filters or a failed cooling fan) or if the bulb reaches its end-of-life and burns out, the projector shuts off the lamp immediately while running fans at maximum speed to cool internal optical prisms and prevent glass meltdown. Resolution changes or driver crashes do not trigger maximum emergency fan cooling cycles.",
        "distractor_analysis": {
            "1": "Resolution mismatches cause 'Out of Range' on-screen messages, not emergency high-speed thermal fan cool-down cycles.",
            "2": "A disconnected HDMI cable produces a 'No Signal' blue/black screen while fans run at normal whisper-quiet speeds.",
            "3": "An OS driver crash stops video output from the PC, but does not trigger the projector's internal thermal warning LEDs."
        },
        "tags": ["troubleshooting", "display", "projectors", "bulb", "overheating"]
    },
    {
        "id": "C1-173",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which USB specification standard was the first to introduce a maximum data transfer rate of 10 Gbps (SuperSpeed+)?",
        "options": [
            "USB 3.1 Gen 2 (USB 3.2 Gen 2 / SuperSpeed+)",
            "USB 2.0 (HighSpeed)",
            "USB 3.0 / USB 3.1 Gen 1 (SuperSpeed)",
            "USB 1.1 (Full Speed)"
        ],
        "answer": 0,
        "explanation": "USB 3.1 Gen 2 (later rebranded as USB 3.2 Gen 2) introduced the 10 Gbps SuperSpeed+ signaling rate using 128b/132b encoding. USB 2.0 maxes at 480 Mbps, USB 3.0 / 3.1 Gen 1 maxes at 5 Gbps, and USB 1.1 operates at 12 Mbps.",
        "distractor_analysis": {
            "1": "USB 2.0 HighSpeed is capped at a maximum signaling rate of 480 Mbps.",
            "2": "USB 3.0 / USB 3.1 Gen 1 SuperSpeed operates at a maximum rate of 5 Gbps.",
            "3": "USB 1.1 Full Speed operates at a maximum rate of 12 Mbps."
        },
        "tags": ["hardware", "cables", "usb", "bandwidth", "specifications"]
    },
    {
        "id": "C1-174",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which physical connector standard is utilized by Thunderbolt 3 and Thunderbolt 4 interfaces to achieve 40 Gbps bandwidth?",
        "options": [
            "USB Type-C connector",
            "Mini DisplayPort connector",
            "Standard USB Type-A connector",
            "Apple 30-pin dock connector"
        ],
        "answer": 0,
        "explanation": "Starting with Thunderbolt 3 (and continuing with Thunderbolt 4 and 5), Intel adopted the 24-pin reversible USB Type-C connector as the universal physical interface, supporting up to 40 Gbps bandwidth, PCIe tunneling, DisplayPort Alternate Mode, and USB Power Delivery. Thunderbolt 1 and 2 used Mini DisplayPort, USB-A cannot support 40 Gbps, and 30-pin is legacy Apple.",
        "distractor_analysis": {
            "1": "Mini DisplayPort was the physical connector used exclusively on legacy Thunderbolt 1 and Thunderbolt 2 ports.",
            "2": "USB Type-A is the non-reversible rectangular connector limited to legacy USB speeds and cannot support Thunderbolt 40 Gbps protocols.",
            "3": "The 30-pin dock connector is an obsolete proprietary connector used on early iPod and iPhone models."
        },
        "tags": ["hardware", "cables", "thunderbolt", "usb-c", "connectors"]
    },
    {
        "id": "C1-175",
        "objective": "3.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which display technology utilizes self-emissive organic pixels that generate their own individual light, requiring NO separate backlight panel and achieving true infinite contrast ratios?",
        "options": [
            "Organic Light-Emitting Diode (OLED / AMOLED)",
            "Twisted Nematic (TN) LCD",
            "In-Plane Switching (IPS) LCD",
            "Vertical Alignment (VA) LCD"
        ],
        "answer": 0,
        "explanation": "OLED (Organic Light-Emitting Diode) displays use self-emissive organic electroluminescent compounds where every individual pixel emits its own light and color when energized. When displaying pure black, pixels are turned completely off, achieving true 0-nit black and infinite contrast without needing a separate backlight. TN, IPS, and VA are all non-emissive LCD panel technologies that require an LED backlight.",
        "distractor_analysis": {
            "1": "TN (Twisted Nematic) is an LCD panel type that requires an external LED backlight to illuminate pixels.",
            "2": "IPS (In-Plane Switching) is an LCD panel type known for wide viewing angles and color accuracy, but strictly requires an LED backlight.",
            "3": "VA (Vertical Alignment) is an LCD panel type offering good static contrast, but still requires an LED backlight."
        },
        "tags": ["hardware", "display", "oled", "lcd", "contrast"]
    },
    {
        "id": "C1-176",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following legacy video cabling standards transmits purely analog red, green, blue, and sync video signals and is completely incapable of carrying digital audio streams?",
        "options": [
            "Video Graphics Array (15-pin DE-15 / VGA)",
            "High-Definition Multimedia Interface (HDMI)",
            "DisplayPort (DP)",
            "USB-C with DisplayPort Alternate Mode"
        ],
        "answer": 0,
        "explanation": "VGA (Video Graphics Array) uses a 15-pin DE-15 connector to transmit analog RGB video signals (pins 1, 2, 3 for Red, Green, Blue and pins 13, 14 for Horizontal and Vertical Sync) and carries zero audio pins or audio encoding capabilities. HDMI, DisplayPort, and USB-C DisplayPort Alt Mode all natively carry multi-channel digital audio alongside high-resolution digital video.",
        "distractor_analysis": {
            "1": "HDMI transmits up to 8 channels of uncompressed digital audio or 32 channels of spatial audio alongside video.",
            "2": "DisplayPort natively transmits high-definition multi-channel digital audio streams through auxiliary audio packets.",
            "3": "USB-C in DisplayPort Alternate Mode encapsulates full DisplayPort audio and video packets across high-speed lanes."
        },
        "tags": ["hardware", "cables", "vga", "audio", "video"]
    },
    {
        "id": "C1-177",
        "objective": "3.1",
        "type": "single",
        "difficulty": "medium",
        "question": "What standard display protocol feature allows a workstation to connect a single video output port to a primary monitor and 'daisy-chain' a cable from that monitor to a secondary monitor to drive independent displays?",
        "options": [
            "DisplayPort Multi-Stream Transport (MST)",
            "Standard HDMI 1.4 Consumer Electronics Control",
            "Dual-Link DVI-D Analog Pass-Through",
            "VGA Splitter Y-Cable Mirroring"
        ],
        "answer": 0,
        "explanation": "DisplayPort 1.2 and later introduced Multi-Stream Transport (MST), which enables a single DisplayPort (or USB-C) output to carry multiple independent video streams. This allows monitors equipped with DisplayPort Out ports to be connected in a daisy-chain configuration, presenting extended independent desktop displays to the OS. Standard HDMI does not support daisy-chaining, DVI lacks MST, and VGA Y-splitters only mirror identical signals.",
        "distractor_analysis": {
            "1": "HDMI CEC transmits device control commands (e.g., turning on a TV via a game console) and cannot daisy-chain independent video streams.",
            "2": "Dual-Link DVI provides extra bandwidth for a single high-resolution monitor, lacking packetized multi-stream routing.",
            "3": "A VGA Y-splitter physically duplicates identical analog voltages to two displays, resulting in mirrored screens with degraded brightness."
        },
        "tags": ["hardware", "display", "displayport", "mst", "daisy-chain"]
    },
    {
        "id": "C1-178",
        "objective": "3.6",
        "type": "single",
        "difficulty": "easy",
        "question": "In the 80 PLUS power supply energy efficiency certification hierarchy, an 80 PLUS Gold certified PSU is tested to deliver higher electrical efficiency under load than which tier?",
        "options": [
            "80 PLUS Silver / Bronze / Standard",
            "80 PLUS Platinum",
            "80 PLUS Titanium",
            "80 PLUS Diamond"
        ],
        "answer": 0,
        "explanation": "The official 80 PLUS efficiency certification tiers in ascending order of efficiency are: 80 PLUS Standard (White) -> Bronze (82-85%) -> Silver (85-88%) -> Gold (87-90%) -> Platinum (90-92%) -> Titanium (90-94%). Therefore, 80 PLUS Gold is more efficient than Silver, Bronze, and Standard, but less efficient than Platinum and Titanium. 'Diamond' is a non-existent tier.",
        "distractor_analysis": {
            "1": "80 PLUS Platinum is higher in the certification hierarchy than Gold, achieving up to 92-94% efficiency.",
            "2": "80 PLUS Titanium is the highest tier in the 80 PLUS program, achieving up to 94-96% efficiency.",
            "3": "80 PLUS Diamond is a fictitious certification tier that does not exist in the 80 PLUS program."
        },
        "tags": ["hardware", "power", "80-plus", "efficiency", "gold", "silver"]
    },
    {
        "id": "C1-179",
        "objective": "5.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A user retrieves printouts from a departmental laser printer and reports that black toner smudges easily and rubs off onto their fingers like dry powder. Which component in the printer has failed and must be replaced?",
        "options": [
            "Fuser assembly (heating lamp / pressure roller)",
            "Photosensitive imaging drum unit",
            "Primary corona / charge roller wire",
            "Toner supply hopper cartridge"
        ],
        "answer": 0,
        "explanation": "In a laser printer, the fuser assembly consists of a heated roller (halogen lamp or ceramic element reaching ~200 C) and a pressure roller that physically melt and press toner powder into the fibers of the paper. If the fuser heater fails or fails to reach fusing temperature, toner rests loosely on the page and immediately rubs off as dry powder. Drum defects cause streaks/ghosts, and charge rollers regulate drum surface charge.",
        "distractor_analysis": {
            "1": "The imaging drum holds the electrostatic latent image; drum failures cause repeating marks, streaks, or ghosting, not unfused toner.",
            "2": "The primary charge roller applies a uniform negative charge (-600V) to the drum; failure causes totally black pages.",
            "3": "The toner cartridge supplies toner particles; if it is functioning to put powder on the page, the failure is downstream at the fuser."
        },
        "tags": ["troubleshooting", "printers", "laser", "fuser", "toner-smudge"]
    },
    {
        "id": "C1-180",
        "objective": "3.8",
        "type": "single",
        "difficulty": "medium",
        "question": "In the standard 7-step electrophotographic (EP) laser printing process, which step occurs immediately AFTER the Exposing (writing) step?",
        "options": [
            "Developing (toner roller applies charged toner to the discharged areas of the drum)",
            "Charging (primary charge roller applies uniform high-voltage negative charge)",
            "Transferring (transfer corona applies positive charge to paper to pull toner off drum)",
            "Fusing (heated rollers melt toner into the paper fibers)"
        ],
        "answer": 0,
        "explanation": "The 7 steps of the electrophotographic laser printing process proceed in exact order: (1) Processing, (2) Charging, (3) Exposing, (4) Developing, (5) Transferring, (6) Fusing, and (7) Cleaning. During Developing, the developing roller attracts negatively charged toner particles to the neutralized areas of the drum written by the laser during the Exposing step.",
        "distractor_analysis": {
            "1": "Charging is Step 2, which occurs before the laser exposes the drum in Step 3.",
            "2": "Transferring is Step 5, which occurs after Developing in Step 4.",
            "3": "Fusing is Step 6, which bonds toner to paper after transferring."
        },
        "tags": ["hardware", "printers", "laser", "ep-process", "developing"]
    },
    {
        "id": "C1-181",
        "objective": "3.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which printer technology is uniquely required in accounting and logistics environments to print on multi-part carbon or carbonless continuous-feed forms?",
        "options": [
            "Impact / Dot-Matrix printer",
            "Electrophotographic Laser printer",
            "Thermal Drop-on-Demand Inkjet printer",
            "Direct Thermal receipt printer"
        ],
        "answer": 0,
        "explanation": "Impact dot-matrix printers use physical metal printhead pins that strike an inked ribbon with mechanical force, creating the physical pressure necessary to transfer duplicate impressions through multiple layers of carbon or carbonless multi-part paper (e.g., invoices, bills of lading). Laser, inkjet, and thermal printers apply non-impact heat, ink sprays, or toner to surface sheets without mechanical strike pressure.",
        "distractor_analysis": {
            "1": "Laser printers are non-impact devices that use heat and electrostatic charges; they cannot press impressions through multipart carbon sheets.",
            "2": "Inkjet printers spray microscopic liquid droplets onto top sheets without physical impact force.",
            "3": "Direct thermal printers use heat elements on specialty paper, unable to generate physical pressure across multi-part forms."
        },
        "tags": ["hardware", "printers", "impact", "dot-matrix", "multipart-forms"]
    },
    {
        "id": "C1-182",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which standard TCP port number is utilized by the Secure Shell (SSH) protocol for encrypted remote command-line management and secure file transfer (SFTP)?",
        "options": [
            "TCP port 22 (SSH)",
            "TCP port 21 (FTP Control)",
            "TCP port 23 (Telnet unencrypted)",
            "TCP port 25 (SMTP mail transfer)"
        ],
        "answer": 0,
        "explanation": "TCP port 22 is the standard port for Secure Shell (SSH), which provides cryptographic confidentiality, integrity, and authentication for remote terminal sessions and SFTP transfers, replacing insecure plaintext Telnet (port 23) and FTP (port 21). TCP port 25 is used for SMTP.",
        "distractor_analysis": {
            "1": "TCP port 21 is used for File Transfer Protocol (FTP) control sessions.",
            "2": "TCP port 23 is used for unencrypted Telnet terminal sessions.",
            "3": "TCP port 25 is used for Simple Mail Transfer Protocol (SMTP) server-to-server mail delivery."
        },
        "tags": ["networking", "ports", "ssh", "security", "protocols"]
    },
    {
        "id": "C1-183",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which default TCP port number is used by Microsoft Remote Desktop Protocol (RDP) to establish remote graphical desktop sessions into Windows systems?",
        "options": [
            "TCP port 3389 (RDP)",
            "TCP port 5900 (VNC)",
            "TCP port 443 (HTTPS)",
            "TCP port 389 (LDAP)"
        ],
        "answer": 0,
        "explanation": "Microsoft Remote Desktop Protocol (RDP) listens on TCP port 3389 (and optionally UDP port 3389) by default to deliver encrypted graphical desktop and application sessions. Port 5900 is used by Virtual Network Computing (VNC), Port 443 is HTTPS, and Port 389 is unencrypted LDAP.",
        "distractor_analysis": {
            "1": "TCP port 5900 is the standard port used by Virtual Network Computing (VNC) remote desktop servers.",
            "2": "TCP port 443 is used for secure encrypted web traffic via HTTPS.",
            "3": "TCP port 389 is used for unencrypted Lightweight Directory Access Protocol (LDAP) directory queries."
        },
        "tags": ["networking", "ports", "rdp", "remote-access"]
    },
    {
        "id": "C1-184",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which network management protocol utilizes UDP ports 161 (for queries/polling) and UDP port 162 (for asynchronous trap notifications) to monitor the health and performance of network switches, routers, and servers?",
        "options": [
            "Simple Network Management Protocol (SNMP)",
            "Syslog event logging protocol",
            "Network Time Protocol (NTP)",
            "Lightweight Directory Access Protocol (LDAP)"
        ],
        "answer": 0,
        "explanation": "Simple Network Management Protocol (SNMP) uses UDP port 161 for SNMP managers to query (GET/SET) agent Management Information Bases (MIBs) on network devices, and UDP port 162 to receive unsolicited SNMP Traps and InformRequests. Syslog uses UDP 514, NTP uses UDP 123, and LDAP uses TCP/UDP 389.",
        "distractor_analysis": {
            "1": "Syslog operates over UDP port 514 to receive system log event messages from network equipment.",
            "2": "Network Time Protocol (NTP) synchronizes clock time across network hosts using UDP port 123.",
            "3": "LDAP queries network directory services over TCP and UDP port 389."
        },
        "tags": ["networking", "ports", "snmp", "monitoring", "management"]
    },
    {
        "id": "C1-185",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which standard TCP port number is utilized by Internet Message Access Protocol over SSL/TLS (IMAPS) for secure encrypted email mailbox synchronization?",
        "options": [
            "TCP port 993 (IMAPS)",
            "TCP port 143 (Plaintext IMAP)",
            "TCP port 110 (Plaintext POP3)",
            "TCP port 995 (POP3S)"
        ],
        "answer": 0,
        "explanation": "TCP port 993 is the standard IANA-assigned port for IMAP over SSL/TLS (IMAPS), providing transport-layer encryption for email access and folder synchronization. TCP port 143 is unencrypted IMAP, TCP port 110 is unencrypted POP3, and TCP port 995 is POP3 over TLS (POP3S).",
        "distractor_analysis": {
            "1": "TCP port 143 is the standard port for unencrypted, plaintext IMAP.",
            "2": "TCP port 110 is the standard port for unencrypted, plaintext POP3 mailbox retrieval.",
            "3": "TCP port 995 is the standard secure port for POP3 over TLS (POP3S)."
        },
        "tags": ["networking", "ports", "imaps", "email", "security"]
    },
    {
        "id": "C1-186",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which pair of UDP ports is utilized by the Dynamic Host Configuration Protocol (DHCP) for server listening and client communication?",
        "options": [
            "UDP port 67 (DHCP Server) and UDP port 68 (DHCP Client)",
            "UDP port 53 (DNS)",
            "TCP port 80 (HTTP) and TCP port 443 (HTTPS)",
            "TCP port 20 and 21 (FTP)"
        ],
        "answer": 0,
        "explanation": "Dynamic Host Configuration Protocol (DHCP) operates over UDP: DHCP servers listen on UDP port 67 for incoming Discover/Request messages from clients, and DHCP clients listen on UDP port 68 to receive Offer/ACK configuration packets from servers. Port 53 is DNS, ports 80/443 are web, and ports 20/21 are FTP.",
        "distractor_analysis": {
            "1": "UDP/TCP port 53 is used by Domain Name System (DNS) servers to resolve hostnames to IP addresses.",
            "2": "TCP ports 80 and 443 are web delivery ports for HTTP and HTTPS traffic.",
            "3": "TCP ports 20 and 21 are used for File Transfer Protocol (FTP) data and control connections."
        },
        "tags": ["networking", "ports", "dhcp", "protocols"]
    },
    {
        "id": "C1-187",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which Layer 4 transport protocol operates in a connectionless, best-effort manner without establishing sessions or requiring packet acknowledgments, prioritizing low overhead and speed for streaming audio/video and DNS queries?",
        "options": [
            "User Datagram Protocol (UDP)",
            "Transmission Control Protocol (TCP)",
            "Hypertext Transfer Protocol (HTTP)",
            "Secure Shell (SSH)"
        ],
        "answer": 0,
        "explanation": "User Datagram Protocol (UDP) is a connectionless, lightweight transport-layer protocol that does not establish three-way handshakes, track sequence numbers, or require acknowledgments (ACKs), making it ideal for latency-sensitive streaming media, VoIP, DHCP, and DNS lookups. TCP is connection-oriented with guaranteed delivery, while HTTP and SSH are application-layer protocols running over TCP.",
        "distractor_analysis": {
            "1": "Transmission Control Protocol (TCP) is connection-oriented, utilizing sequence numbers, three-way handshakes, and acknowledgments to guarantee delivery.",
            "2": "HTTP is an application-layer protocol that rides on top of connection-oriented TCP.",
            "3": "SSH is an encrypted application-layer management protocol running on top of connection-oriented TCP."
        },
        "tags": ["networking", "protocols", "udp", "tcp", "transport-layer"]
    },
    {
        "id": "C1-188",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "In Transmission Control Protocol (TCP) connection establishment, what is the exact 3-step sequence of control flag packets exchanged during the three-way handshake?",
        "options": [
            "SYN (Synchronize) -> SYN/ACK (Synchronize-Acknowledge) -> ACK (Acknowledge)",
            "ACK -> SYN -> SYN/ACK",
            "SYN/ACK -> SYN -> ACK",
            "SYN -> ACK -> FIN"
        ],
        "answer": 0,
        "explanation": "The TCP three-way handshake establishes a reliable full-duplex connection in three steps: (1) The client sends a SYN packet with an initial sequence number (ISN), (2) The server responds with a SYN/ACK packet acknowledging the client's sequence number and providing its own ISN, and (3) The client sends an ACK packet confirming the server's sequence number, opening the active connection.",
        "distractor_analysis": {
            "1": "ACK cannot precede SYN; synchronization flags must initiate connection establishment before acknowledgment can occur.",
            "2": "The server cannot reply with SYN/ACK before receiving the initial SYN packet from the client.",
            "3": "FIN is a connection termination flag used during teardown, not during connection initiation."
        },
        "tags": ["networking", "tcp", "handshake", "protocols"]
    },
    {
        "id": "C1-189",
        "objective": "2.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician inspects a Windows workstation network configuration and discovers an IPv4 address of 169.254.10.5 with a subnet mask of 255.255.0.0. The workstation cannot access the local intranet servers or the Internet. What does this IP address indicate?",
        "options": [
            "The client is configured for dynamic DHCP but could not reach a DHCP server, defaulting to Automatic Private IP Addressing (APIPA)",
            "The client successfully obtained a static public IP reservation from the ISP router",
            "The client is communicating over the local loopback diagnostic interface",
            "The network interface card has been permanently disabled in device manager"
        ],
        "answer": 0,
        "explanation": "IPv4 addresses in the 169.254.0.0/16 range (from 169.254.0.1 to 169.254.255.254) are reserved for Automatic Private IP Addressing (APIPA / link-local). When a client configured for DHCP fails to receive a response from a DHCP server after sending Discover broadcasts, Windows automatically assigns an APIPA address, allowing local subnet communication but no gateway routing or Internet access.",
        "distractor_analysis": {
            "1": "169.254.0.0/16 is a private, non-routable link-local address block, not a public ISP routable address.",
            "2": "The IPv4 loopback diagnostic address range is 127.0.0.0/8 (commonly 127.0.0.1).",
            "3": "If the NIC were disabled in Device Manager, the interface would have no active IP address assigned at all."
        },
        "tags": ["networking", "apipa", "dhcp", "troubleshooting", "ip-addressing"]
    },
    {
        "id": "C1-190",
        "objective": "2.6",
        "type": "single",
        "difficulty": "medium",
        "question": "According to RFC 1918 private IPv4 address allocation standards, which of the following IP addresses belongs to the private Class B address block (172.16.0.0 to 172.31.255.255 /12)?",
        "options": [
            "172.20.5.5",
            "10.1.1.1",
            "192.168.1.1",
            "172.32.0.1"
        ],
        "answer": 0,
        "explanation": "RFC 1918 defines three private IPv4 address ranges: Class A (10.0.0.0/8: 10.0.0.0 - 10.255.255.255), Class B (172.16.0.0/12: 172.16.0.0 - 172.31.255.255), and Class C (192.168.0.0/16: 192.168.0.0 - 192.168.255.255). 172.20.5.5 falls squarely within the private Class B 172.16-172.31 range. 10.1.1.1 is Class A private, 192.168.1.1 is Class C private, and 172.32.0.1 is a public routable IP.",
        "distractor_analysis": {
            "1": "10.1.1.1 is in the 10.0.0.0/8 private address space, which is Class A, not Class B.",
            "2": "192.168.1.1 is in the 192.168.0.0/16 private address space, which is Class C, not Class B.",
            "3": "172.32.0.1 is outside the 172.16.0.0 - 172.31.255.255 private range, making it a public Internet address."
        },
        "tags": ["networking", "ipv4", "rfc1918", "private-ip", "class-b"]
    },
    {
        "id": "C1-191",
        "objective": "2.6",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the standard default subnet mask for a traditional classful Class C IPv4 network (prefix /24)?",
        "options": [
            "255.255.255.0 (/24 prefix)",
            "255.0.0.0 (/8 prefix)",
            "255.255.0.0 (/16 prefix)",
            "255.255.255.255 (/32 host mask)"
        ],
        "answer": 0,
        "explanation": "In classful IPv4 addressing, the default subnet mask for Class C networks (address ranges 192.0.0.0 to 223.255.255.255) is 255.255.255.0 (/24), allocating 24 bits for the network ID and 8 bits for host addresses (up to 254 usable hosts). 255.0.0.0 is default Class A (/8), and 255.255.0.0 is default Class B (/16).",
        "distractor_analysis": {
            "1": "255.0.0.0 is the default /8 subnet mask for Class A IPv4 networks.",
            "2": "255.255.0.0 is the default /16 subnet mask for Class B IPv4 networks.",
            "3": "255.255.255.255 (/32) is a single-host route mask, not a network subnet mask."
        },
        "tags": ["networking", "subnet-mask", "ipv4", "class-c"]
    },
    {
        "id": "C1-192",
        "objective": "2.6",
        "type": "single",
        "difficulty": "easy",
        "question": "How many total bits are contained in an Internet Protocol version 6 (IPv6) address?",
        "options": [
            "128 bits (16 bytes)",
            "32 bits (4 bytes)",
            "48 bits (6 bytes)",
            "64 bits (8 bytes)"
        ],
        "answer": 0,
        "explanation": "IPv6 addresses are exactly 128 bits (16 bytes) in length, expressed as 8 colon-separated hexadecimal 16-bit blocks (hextets), providing approximately 3.4 x 10^38 unique global addresses. 32 bits is an IPv4 address, 48 bits is an Ethernet MAC address, and 64 bits is an IPv6 interface ID.",
        "distractor_analysis": {
            "1": "32 bits is the length of an Internet Protocol version 4 (IPv4) address.",
            "2": "48 bits is the length of an IEEE 802 Media Access Control (MAC) hardware address.",
            "3": "64 bits is the size of standard IPv6 interface identifiers (the host half of a /64 subnet)."
        },
        "tags": ["networking", "ipv6", "addressing", "specifications"]
    },
    {
        "id": "C1-193",
        "objective": "2.6",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the primary operational function of Network Address Translation (NAT) and Port Address Translation (PAT) on a border gateway router?",
        "options": [
            "It translates private RFC 1918 internal IP addresses to one or more routable public IP addresses for Internet access",
            "It automatically resolves domain hostnames into numerical IP addresses",
            "It encrypts all internal LAN network traffic using AES-256 GCM",
            "It balances incoming power voltage across redundant server power supplies"
        ],
        "answer": 0,
        "explanation": "Network Address Translation (NAT / PAT / Source NAT) modifies the IP header source addresses of outgoing packets, mapping multiple private, non-routable internal IP addresses (RFC 1918) to a single public routable IP address using unique Layer 4 source port numbers. DNS resolves hostnames, IPsec encrypts network traffic, and power PDUs balance voltage.",
        "distractor_analysis": {
            "1": "Translating domain names to IP addresses is the role of Domain Name System (DNS) servers, not NAT.",
            "2": "Encrypting network traffic is handled by cryptographic protocols like IPsec, TLS, or SSH, not standard NAT.",
            "3": "Balancing electrical voltage is the role of power distribution units (PDUs) and electrical transformers."
        },
        "tags": ["networking", "nat", "pat", "gateway", "addressing"]
    },
    {
        "id": "C1-194",
        "objective": "2.4",
        "type": "single",
        "difficulty": "easy",
        "question": "Which DNS resource record type maps a domain hostname directly to a 128-bit IPv6 address?",
        "options": [
            "AAAA (Quad-A) record",
            "A (Address) record",
            "MX (Mail Exchanger) record",
            "PTR (Pointer) record"
        ],
        "answer": 0,
        "explanation": "An AAAA record (Quad-A record, named because 128 bits is four times the 32-bit size of an IPv4 address) maps a DNS hostname to an IPv6 address. An 'A' record maps a hostname to a 32-bit IPv4 address, an 'MX' record designates mail servers, and a 'PTR' record performs reverse DNS lookups (IP to hostname).",
        "distractor_analysis": {
            "1": "An 'A' record maps a hostname to a 32-bit IPv4 address, not an IPv6 address.",
            "2": "An 'MX' record specifies the mail exchange servers responsible for receiving email for a domain.",
            "3": "A 'PTR' record maps an IP address back to a hostname in reverse lookup zones."
        },
        "tags": ["networking", "dns", "records", "aaaa", "ipv6"]
    },
    {
        "id": "C1-195",
        "objective": "2.4",
        "type": "single",
        "difficulty": "easy",
        "question": "Which DNS resource record type specifies the priority and hostname of mail servers responsible for accepting incoming email for a domain?",
        "options": [
            "Mail Exchanger (MX) record",
            "Canonical Name (CNAME) alias record",
            "Service Location (SRV) record",
            "Text (TXT) verification record"
        ],
        "answer": 0,
        "explanation": "A Mail Exchanger (MX) record specifies the mail servers responsible for accepting email messages on behalf of a recipient's domain name, accompanied by a preference number (priority ranking). CNAME creates domain aliases, SRV defines specific host/port services (like Kerberos/SIP), and TXT stores text records.",
        "distractor_analysis": {
            "1": "A CNAME (Canonical Name) record aliases one domain name to another canonical hostname, not specifically for routing email.",
            "2": "An SRV record defines hostname and port locations for specific services like LDAP or Active Directory domain controllers.",
            "3": "A TXT record holds arbitrary human- or machine-readable text data used for domain verification and email authentication."
        },
        "tags": ["networking", "dns", "mx", "email", "records"]
    },
    {
        "id": "C1-196",
        "objective": "2.4",
        "type": "single",
        "difficulty": "medium",
        "question": "Which DNS resource record type is utilized by email security frameworks to publish SPF (Sender Policy Framework), DKIM public keys, and DMARC policies to prevent email spoofing?",
        "options": [
            "TXT (Text) record",
            "A (Address) record",
            "NS (Name Server) record",
            "PTR (Pointer) record"
        ],
        "answer": 0,
        "explanation": "DNS TXT (Text) records allow domain owners to store arbitrary text strings in DNS, which are utilized by email authentication standards: SPF (v=spf1 ... to define authorized sending IPs), DKIM (publishing public cryptographic keys for signature verification), and DMARC (v=DMARC1 ... defining enforcement policy). A records store IPv4 addresses, NS records identify authoritative DNS servers, and PTR records perform reverse lookups.",
        "distractor_analysis": {
            "1": "An 'A' record maps a hostname to an IPv4 address and cannot store SPF or DKIM policy text strings.",
            "2": "An 'NS' record delegates a DNS zone to authoritative name servers.",
            "3": "A 'PTR' record maps an IP address to a canonical hostname in reverse lookup zones."
        },
        "tags": ["networking", "dns", "txt", "spf", "dkim", "dmarc", "email"]
    },
    {
        "id": "C1-197",
        "objective": "2.4",
        "type": "single",
        "difficulty": "easy",
        "question": "In the standard 4-step DHCP lease negotiation process known by the acronym DORA, what does the letter 'R' represent?",
        "options": [
            "Request (DHCPREQUEST sent by the client to request the offered IP address)",
            "Reply (DHCPREPLY)",
            "Renew (DHCPRENEW)",
            "Release (DHCPRELEASE)"
        ],
        "answer": 0,
        "explanation": "The standard DHCP leasing process is known by the acronym DORA: (1) Discover (client broadcasts DHCPDISCOVER), (2) Offer (server sends DHCPOFFER with available IP), (3) Request (client broadcasts DHCPREQUEST formally requesting that IP lease), and (4) Acknowledge (server sends DHCPACK finalizing the lease). Reply, Renew, and Release are other DHCP message types or operations, but 'Request' is the third step of DORA.",
        "distractor_analysis": {
            "1": "'Reply' is not the formal step 3 message; the client sends a formal DHCPREQUEST.",
            "2": "'Renew' describes the lease renewal process initiated by a client at 50% lease time (T1), not the initial DORA negotiation step.",
            "3": "'Release' is the DHCPRELEASE message sent when a client gracefully relinquishes its IP address upon shutdown."
        },
        "tags": ["networking", "dhcp", "dora", "request", "protocols"]
    },
    {
        "id": "C1-198",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Under TIA/EIA commercial building telecommunications cabling standards, what is the maximum certified physical segment length for standard twisted-pair copper Ethernet horizontal cable runs (including patch cords)?",
        "options": [
            "100 meters (328 feet)",
            "55 meters (180 feet)",
            "185 meters (607 feet)",
            "500 meters (1,640 feet)"
        ],
        "answer": 0,
        "explanation": "Under TIA/EIA-568 standards, the maximum allowable total channel length for standard Category 5e, 6, and 6a twisted-pair copper Ethernet is exactly 100 meters (328 feet), typically structured as a 90-meter permanent solid horizontal cable run plus up to 10 meters of combined stranded patch cords. 55 meters is the limit for 10G on Cat6, 185m was legacy 10BASE2 Thinnet, and 500m was legacy 10BASE5 Thicknet.",
        "distractor_analysis": {
            "1": "55 meters is the maximum distance Cat 6 copper cable can support 10GBASE-T before signal attenuation requires Cat 6a.",
            "2": "185 meters was the maximum segment length of legacy 10BASE2 coaxial Thinnet Ethernet.",
            "3": "500 meters was the maximum segment length of legacy 10BASE5 coaxial Thicknet Ethernet."
        },
        "tags": ["hardware", "cables", "ethernet", "distance-limits", "cat6", "standards"]
    },
    {
        "id": "C1-199",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the maximum certified transmission distance for standard Category 6 (Cat 6) unshielded twisted-pair copper cabling when operating at 10 Gigabit Ethernet (10GBASE-T) speeds before alien crosstalk limits performance?",
        "options": [
            "55 meters (180 feet)",
            "100 meters (328 feet)",
            "30 meters (98 feet)",
            "15 meters (50 feet)"
        ],
        "answer": 0,
        "explanation": "Category 6 (Cat 6) cabling is rated for 250 MHz and can support 10GBASE-T up to a maximum distance of 55 meters (180 feet) under favorable alien crosstalk conditions (reduced to ~37 meters in high-density bundles). To achieve full 100-meter segment lengths at 10 Gbps, Category 6a (Augmented Cat 6 rated at 500 MHz) or Cat 7/8 must be installed.",
        "distractor_analysis": {
            "1": "100 meters is the maximum 10GBASE-T distance supported by Category 6a (Cat 6a) cabling, but standard Cat 6 cannot reliably reach 100m at 10 Gbps.",
            "2": "30 meters is the certified distance for Category 8 (Cat 8) 40GBASE-T datacenter top-of-rack links.",
            "3": "15 meters is a non-standard short distance not used as a specification boundary for Cat 6."
        },
        "tags": ["hardware", "cables", "cat6", "10gbps", "distance-limits"]
    },
    {
        "id": "C1-200",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "According to the ANSI/TIA-568-B (T568B) commercial wiring standard for RJ-45 copper Ethernet connectors, what is the color of the wire connected to Pin 1?",
        "options": [
            "White/Orange (Pin 1 in T568B)",
            "White/Green (Pin 1 in T568A)",
            "Solid Blue (Pin 4 in both standards)",
            "Solid Orange (Pin 2 in T568B)"
        ],
        "answer": 0,
        "explanation": "The TIA/EIA T568B wiring standard defines the 8-pin sequence as: Pin 1: White/Orange, Pin 2: Solid Orange, Pin 3: White/Green, Pin 4: Solid Blue, Pin 5: White/Blue, Pin 6: Solid Green, Pin 7: White/Brown, Pin 8: Solid Brown. In contrast, T568A begins with White/Green on Pin 1 and Solid Green on Pin 2.",
        "distractor_analysis": {
            "1": "White/Green is Pin 1 under the T568A wiring standard.",
            "2": "Solid Blue is Pin 4 in both T568A and T568B wiring standards.",
            "3": "Solid Orange is Pin 2 under the T568B wiring standard."
        },
        "tags": ["hardware", "cables", "t568b", "pinouts", "color-coding"]
    }
]
