#!/usr/bin/env python3
"""Part 5 of fixed Core 1 questions: C1-201 to C1-250."""

PART5_QUESTIONS = [
    {
        "id": "C1-201",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which specialized diagnostic tool pair is used to locate and identify a specific copper network cable hidden inside a drywall partition or congested wire bundle by emitting an audible tone?",
        "options": [
            "Tone generator and inductive probe (toner / fox and hound)",
            "Modular RJ-45 cable crimper",
            "Hardware Ethernet loopback plug",
            "Impact punch-down tool with 110 blade"
        ],
        "answer": 0,
        "explanation": "A tone generator injects an alternating electrical audio tone onto a copper cable, and the handheld inductive tone probe amplifies that tone into an audible sound when brought near the specific wire in a bundle or wall cavity. Crimpers terminate connectors, loopback plugs test NICs, and punch-down tools terminate cables into patch panels.",
        "distractor_analysis": {
            "1": "A cable crimper physically compresses RJ-45 or RJ-11 modular connectors onto cable ends, lacking audio tracing electronics.",
            "2": "A loopback plug routes transmit pins directly to receive pins on a single NIC to test transceiver health.",
            "3": "A punch-down tool pushes individual conductors into insulation-displacement terminal blocks on patch panels."
        },
        "tags": ["networking", "tools", "tone-generator", "probe", "troubleshooting"]
    },
    {
        "id": "C1-202",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which installation hand tool is used to seat individual insulated copper conductors into 110-block or Krone terminal slots on a patch panel while simultaneously trimming the excess wire?",
        "options": [
            "Punch-down tool",
            "Modular RJ-45 crimper",
            "Continuity wire map tester",
            "Coaxial cable stripper"
        ],
        "answer": 0,
        "explanation": "A punch-down tool uses an internal spring-loaded impact mechanism to push insulated copper wires into the V-shaped metal blades of an Insulation Displacement Connector (IDC / 110 block) on patch panels and keystone jacks, while the sharp side of the blade shears off excess conductor flush. Crimpers terminate modular plugs, wire map testers check continuity, and strippers score cable jackets.",
        "distractor_analysis": {
            "1": "Crimpers attach RJ-45 plugs onto the ends of patch cords, not for terminating structured wiring into patch panel punch-down blocks.",
            "2": "Continuity wire map testers verify pin-to-pin electrical continuity across an already-terminated cable.",
            "3": "Cable strippers score and remove outer PVC/CMP plastic jackets, not for seating wires into terminal slots."
        },
        "tags": ["networking", "tools", "punch-down", "patch-panel", "cabling"]
    },
    {
        "id": "C1-203",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which fiber-optic cable classification utilizes a narrow 8-10 micron glass core and single-wavelength laser diodes to transmit data across long-haul metropolitan and WAN distances with minimal modal dispersion?",
        "options": [
            "Single-Mode Fiber (SMF)",
            "Multimode Fiber (MMF)",
            "Coaxial RG-6 Cable",
            "Shielded Twisted Pair (STP)"
        ],
        "answer": 0,
        "explanation": "Single-Mode Fiber (SMF) features a tiny 8-10 micron core diameter through which light travels down a single optical path (mode) driven by high-powered laser diodes (1310 nm / 1550 nm), virtually eliminating modal dispersion and allowing signal transmission across tens of kilometers. Multimode fiber uses larger cores (50-62.5 um) for shorter LAN runs, while coax and STP are copper media.",
        "distractor_analysis": {
            "1": "Multimode Fiber (MMF) has a larger core (50/62.5 microns) where light rays bounce in multiple modes, limited to shorter distances by modal dispersion.",
            "2": "Coaxial cable is copper cabling used for cable television and broadband modems, not laser optical transmission.",
            "3": "Shielded Twisted Pair (STP) is copper Ethernet cabling shielded against EMI, limited to 100-meter segment lengths."
        },
        "tags": ["hardware", "cables", "fiber", "single-mode", "smf"]
    },
    {
        "id": "C1-204",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which threaded metallic RF connector is standardly crimped onto RG-6 coaxial cables used for cable modems, DOCSIS broadband, and satellite television receivers?",
        "options": [
            "F-type threaded connector",
            "RJ-45 modular 8P8C connector",
            "BNC bayonet connector",
            "LC optical fiber connector"
        ],
        "answer": 0,
        "explanation": "The F-type connector is a threaded radio-frequency (RF) connector universally used on RG-6 and RG-59 coaxial cables to connect cable modems, television tuners, and satellite set-top boxes. RJ-45 is for twisted-pair Ethernet, BNC is a twist-lock bayonet connector used on legacy 10BASE2 or professional SDI video, and LC is a small-form-factor fiber connector.",
        "distractor_analysis": {
            "1": "RJ-45 is an 8-position modular plastic connector used for twisted-pair copper Ethernet cabling.",
            "2": "BNC (Bayonet Neill-Concelman) uses a quarter-turn twist-lock mechanism for professional video feeds and legacy Thinnet coax.",
            "3": "LC (Lucent Connector) is a compact push-pull optical fiber connector used in high-density SFP/SFP+ transceivers."
        },
        "tags": ["hardware", "cables", "coaxial", "f-type", "connectors"]
    },
    {
        "id": "C1-205",
        "objective": "2.5",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the maximum DC electrical power delivered per switch port by the IEEE 802.3at (Power over Ethernet Plus / PoE+) standard to powered network devices?",
        "options": [
            "30.0 Watts (with ~25.5 Watts minimum available at the PD device)",
            "15.4 Watts (original 802.3af PoE standard)",
            "60.0 Watts (802.3bt Type 3 4PPoE standard)",
            "90.0 Watts (802.3bt Type 4 High-Power PoE standard)"
        ],
        "answer": 0,
        "explanation": "IEEE 802.3at (PoE+ / Type 2) specifies up to 30.0 Watts of DC power output from the power sourcing equipment (PSE) port, guaranteeing at least 25.5 Watts of usable power at the powered device (PD) after cable resistance loss over a 100m run. 15.4W is original 802.3af PoE, 60W is 802.3bt Type 3, and 90W is 802.3bt Type 4.",
        "distractor_analysis": {
            "1": "15.4 Watts is the maximum port power provided by the original IEEE 802.3af (PoE) standard.",
            "2": "60 Watts is the power delivery specification for IEEE 802.3bt Type 3 (4PPoE / PoE++).",
            "3": "90 Watts is the maximum power delivered by IEEE 802.3bt Type 4 (PoE++) high-power standard."
        },
        "tags": ["networking", "poe", "802.3at", "power", "standards"]
    },
    {
        "id": "C1-206",
        "objective": "2.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which legacy IEEE 802.11 wireless networking standard was designed to operate exclusively in the 5 GHz frequency band, delivering multi-gigabit speeds using wide 80/160 MHz channels and 256-QAM modulation?",
        "options": [
            "IEEE 802.11ac (Wi-Fi 5)",
            "IEEE 802.11n (Wi-Fi 4)",
            "IEEE 802.11ax (Wi-Fi 6)",
            "IEEE 802.11g"
        ],
        "answer": 0,
        "explanation": "IEEE 802.11ac (Wi-Fi 5) operates exclusively in the 5 GHz band (relying on backward-compatible 802.11n for 2.4 GHz communication). 802.11n operates in both 2.4 GHz and 5 GHz, 802.11ax (Wi-Fi 6) operates across 2.4 GHz, 5 GHz, and 6 GHz (6E), and 802.11g operates exclusively in the 2.4 GHz spectrum.",
        "distractor_analysis": {
            "1": "IEEE 802.11n (Wi-Fi 4) is a dual-band standard that can operate in both the 2.4 GHz and 5 GHz bands.",
            "2": "IEEE 802.11ax (Wi-Fi 6) operates across all three bands: 2.4 GHz, 5 GHz, and 6 GHz.",
            "3": "IEEE 802.11g operates exclusively in the 2.4 GHz radio band."
        },
        "tags": ["networking", "wireless", "802.11ac", "5ghz", "wifi5"]
    },
    {
        "id": "C1-207",
        "objective": "2.2",
        "type": "single",
        "difficulty": "easy",
        "question": "In North America, which three 20 MHz wireless channels are the only non-overlapping channels available in the standard 2.4 GHz Wi-Fi spectrum?",
        "options": [
            "Channels 1, 6, and 11",
            "Channels 1, 5, and 9",
            "Channels 2, 7, and 12",
            "Channels 36, 40, and 44"
        ],
        "answer": 0,
        "explanation": "The 2.4 GHz Wi-Fi band is divided into 11 channels spaced 5 MHz apart in North America, but each 802.11 transmission spans a 20-22 MHz channel width. Therefore, only channels 1 (center 2.412 GHz), 6 (center 2.437 GHz), and 11 (center 2.462 GHz) have sufficient 25 MHz separation to operate simultaneously without causing co-channel or adjacent-channel radio interference. Channels 36, 40, 44 are 5 GHz UNII-1 channels.",
        "distractor_analysis": {
            "1": "Channels 1, 5, and 9 overlap significantly, causing heavy adjacent channel interference and packet collisions.",
            "2": "Channels 2, 7, and 12 are overlapping channels in North America (where channel 12 is restricted).",
            "3": "Channels 36, 40, and 44 are non-overlapping channels in the 5 GHz band, not the 2.4 GHz band."
        },
        "tags": ["networking", "wireless", "2.4ghz", "channels", "interference"]
    },
    {
        "id": "C1-208",
        "objective": "2.5",
        "type": "single",
        "difficulty": "easy",
        "question": "At Layer 2 of the OSI model, what addressing information does a standard Ethernet switch inspect to determine which specific switch port to forward an incoming frame to?",
        "options": [
            "Destination MAC physical hardware address",
            "Destination IPv4/IPv6 logical IP address",
            "TCP/UDP application destination port number",
            "Domain Name System (DNS) Fully Qualified Domain Name"
        ],
        "answer": 0,
        "explanation": "A Layer 2 Ethernet switch reads the 48-bit Destination MAC address in the Ethernet frame header, looks up the MAC address in its Content Addressable Memory (CAM / MAC table), and forwards the frame directly out the associated physical switch port. Routers forward by IP, firewalls/load balancers inspect transport port numbers, and DNS resolves hostnames.",
        "distractor_analysis": {
            "1": "Destination IP addresses are evaluated by Layer 3 network routers, not Layer 2 Ethernet switches.",
            "2": "TCP/UDP port numbers operate at Layer 4 (Transport layer) and are evaluated by firewalls and load balancers.",
            "3": "DNS hostnames operate at Layer 7 (Application layer) and are resolved by DNS servers."
        },
        "tags": ["networking", "switch", "layer-2", "mac-address", "forwarding"]
    },
    {
        "id": "C1-209",
        "objective": "2.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which dedicated network device operates at Layer 3 of the OSI model to route IP packets between different subnets and prevent Layer 2 broadcast frames from crossing network boundaries?",
        "options": [
            "Network Router",
            "Unmanaged Ethernet Switch",
            "Passive Layer 1 Network Hub",
            "Physical Layer Repeater"
        ],
        "answer": 0,
        "explanation": "A network router connects different IP subnets and stops Layer 2 broadcast frames (such as FF:FF:FF:FF:FF:FF) from propagating across interfaces, creating distinct broadcast domains. Switches segment collision domains but forward broadcasts to all ports in a VLAN, and hubs/repeaters flood all electrical signals.",
        "distractor_analysis": {
            "1": "A switch creates separate collision domains per port, but maintains a single shared broadcast domain across all ports within the same VLAN.",
            "2": "A hub creates a single shared collision domain and a single shared broadcast domain.",
            "3": "A repeater regenerates electrical signals at Layer 1, having no capability to segment broadcast domains."
        },
        "tags": ["networking", "router", "broadcast-domain", "layer-3"]
    },
    {
        "id": "C1-210",
        "objective": "2.7",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary technical drawback and performance limitation of geostationary (GEO) satellite Internet connections for real-time interactive applications (such as VoIP calls and videoconferencing)?",
        "options": [
            "High propagation latency (typically 500-700+ ms round-trip) due to the immense physical distance to geostationary orbit (35,786 km)",
            "Complete lack of upload capability for transmitting return data",
            "Mandatory requirement for underground fiber-optic cabling to the dish",
            "Inability to transmit standard encrypted HTTPS web traffic"
        ],
        "answer": 0,
        "explanation": "Geostationary orbit (GEO) satellites orbit at 35,786 km (22,236 miles) above the equator. Radio waves traveling at the speed of light must make a four-way journey (client -> satellite -> ground station -> satellite -> client), introducing a minimum round-trip propagation latency of 500-700 ms, which creates noticeable delays in real-time interactive VoIP and video. Satellite connections do support bidirectional upload/download and standard encryption.",
        "distractor_analysis": {
            "1": "Modern satellite internet terminals are bidirectional, transmitting uploads via satellite RF transponders.",
            "2": "Satellite links communicate purely through free-space radio frequencies to satellite dishes without underground fiber drops.",
            "3": "Satellite connections carry standard TCP/IP traffic, fully supporting TLS and HTTPS encryption."
        },
        "tags": ["networking", "satellite", "latency", "internet-types", "wan"]
    },
    {
        "id": "C1-211",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following hypervisor platforms is classified as a Type 1 (bare-metal) hypervisor that runs directly on physical server hardware without an underlying host operating system?",
        "options": [
            "Microsoft Hyper-V Server / VMware ESXi",
            "Oracle VM VirtualBox",
            "VMware Workstation Pro for Windows",
            "Parallels Desktop for Mac"
        ],
        "answer": 0,
        "explanation": "Type 1 (bare-metal) hypervisors (such as VMware ESXi, Microsoft Hyper-V, KVM, and Xen) install directly onto the physical server hardware, managing hardware resources and scheduling guest virtual machines with minimal overhead. Oracle VirtualBox, VMware Workstation, and Parallels Desktop are Type 2 (hosted) hypervisors that run as applications inside a general-purpose host OS.",
        "distractor_analysis": {
            "1": "Oracle VM VirtualBox is a Type 2 hypervisor running on top of Windows, macOS, or Linux host operating systems.",
            "2": "VMware Workstation is a Type 2 hypervisor application that executes within desktop operating systems.",
            "3": "Parallels Desktop is a Type 2 hosted hypervisor designed to run virtual machines inside macOS."
        },
        "tags": ["virtualization", "hypervisor", "type-1", "bare-metal"]
    },
    {
        "id": "C1-212",
        "objective": "4.2",
        "type": "single",
        "difficulty": "easy",
        "question": "An enterprise leases virtual machines, virtual block storage, and virtual networking from a cloud service provider, while the enterprise internal IT team remains fully responsible for installing, patching, and securing the guest operating systems and application software. Which cloud service model is being utilized?",
        "options": [
            "Infrastructure as a Service (IaaS)",
            "Software as a Service (SaaS)",
            "Platform as a Service (PaaS)",
            "Desktop as a Service (DaaS)"
        ],
        "answer": 0,
        "explanation": "Infrastructure as a Service (IaaS) provides virtualized raw computing resources (virtual servers, network switches, storage volumes, IP subnets) on demand. The customer is responsible for installing, configuring, patching, and maintaining the operating systems and application middleware. SaaS delivers turnkey applications, PaaS provides developer runtime stacks, and DaaS delivers virtual desktop workspaces.",
        "distractor_analysis": {
            "1": "Software as a Service (SaaS) delivers complete applications (e.g., Microsoft 365, Salesforce) where the provider manages everything including OS and application code.",
            "2": "Platform as a Service (PaaS) provides development frameworks, databases, and runtimes where the provider manages the underlying OS and patching.",
            "3": "Desktop as a Service (DaaS) provides virtualized desktop environments streamed to thin clients."
        },
        "tags": ["cloud", "iaas", "service-models", "shared-responsibility"]
    },
    {
        "id": "C1-213",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "Which cloud computing characteristic describes the automated capability to dynamically scale compute instances and storage capacity up and down in real time based on fluctuating workload demand?",
        "options": [
            "Rapid Elasticity",
            "Measured Service",
            "Broad Network Access",
            "Resource Pooling"
        ],
        "answer": 0,
        "explanation": "Rapid Elasticity is the ability of cloud computing infrastructure to dynamically and automatically expand (scale out/up) and contract (scale in/down) resources based on workload metrics without human intervention. Measured service refers to resource metering for billing, broad network access means availability across diverse network clients, and resource pooling refers to multi-tenant resource sharing.",
        "distractor_analysis": {
            "1": "Measured service tracks and logs resource consumption (CPU hours, gigabytes transferred) for billing purposes.",
            "2": "Broad network access ensures cloud services are accessible over standard network mechanisms from any device.",
            "3": "Resource pooling describes how providers dynamically pool physical hardware across multiple tenant organizations."
        },
        "tags": ["cloud", "characteristics", "elasticity", "nist"]
    },
    {
        "id": "C1-214",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "A defense contractor requires a cloud deployment hosted in an external commercial datacenter where the physical server hardware and storage arrays are strictly isolated and dedicated exclusively to their single organization. Which deployment model is this?",
        "options": [
            "Hosted Private Cloud (Dedicated Private Cloud)",
            "Multi-Tenant Public Cloud",
            "Community Cloud",
            "Hybrid Cloud"
        ],
        "answer": 0,
        "explanation": "A Hosted Private Cloud (or Dedicated Private Cloud) is an infrastructure hosted off-premises in a third-party cloud provider's datacenter, but where physical hardware, hypervisors, and storage are dedicated exclusively to a single organization (single-tenant) rather than shared across public multi-tenant pools. Public cloud is multi-tenant, community cloud is shared by specific peer groups, and hybrid links private and public clouds.",
        "distractor_analysis": {
            "1": "Public cloud infrastructure pools multi-tenant compute and storage across multiple unrelated organizations.",
            "2": "Community cloud shares infrastructure among multiple organizations with shared compliance or regulatory mandates.",
            "3": "Hybrid cloud combines private infrastructure with public cloud services via secure VPN/Direct Connect links."
        },
        "tags": ["cloud", "deployment-models", "private-cloud", "security"]
    },
    {
        "id": "C1-215",
        "objective": "4.1",
        "type": "single",
        "difficulty": "easy",
        "question": "What processor feature and UEFI/BIOS firmware setting must be explicitly enabled on a physical computer to allow hypervisors to execute 64-bit guest virtual machines with hardware acceleration?",
        "options": [
            "Hardware-Assisted Virtualization (Intel VT-x / AMD-V)",
            "UEFI Secure Boot certificate validation",
            "Trusted Platform Module (TPM 2.0)",
            "Extreme Memory Profile (XMP / DOCP)"
        ],
        "answer": 0,
        "explanation": "Hardware-assisted virtualization (Intel VT-x for Intel CPUs and AMD-V for AMD CPUs) must be enabled in UEFI/BIOS firmware to allow the hypervisor to access CPU virtualization instruction extensions and execute guest virtual machines at near-native hardware speed. Secure Boot verifies signatures, TPM stores keys, and XMP overclocks RAM.",
        "distractor_analysis": {
            "1": "Secure Boot checks digital signatures of bootloaders during power-on, but does not provide CPU virtualization instruction extensions.",
            "2": "TPM 2.0 provides cryptographic storage for BitLocker encryption keys, unrelated to hypervisor CPU virtualization support.",
            "3": "XMP (Extreme Memory Profile) applies overclocked memory frequency and timings to RAM modules."
        },
        "tags": ["virtualization", "uefi", "vt-x", "amd-v", "hardware"]
    },
    {
        "id": "C1-216",
        "objective": "1.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which mobile device accessory allows a laptop computer to easily connect to multiple full-size desktop monitors, wired Gigabit Ethernet, multiple USB peripherals, and external power through a single integrated docking port or cable?",
        "options": [
            "Laptop Docking Station",
            "USB Flash Drive",
            "KVM Switch",
            "Bluetooth Audio Receiver"
        ],
        "answer": 0,
        "explanation": "A laptop docking station (proprietary snap-in dock or modern Thunderbolt 4 / USB-C dock) expands a laptop into a full desktop workstation by providing multiple display outputs (DisplayPort/HDMI), gigabit wired Ethernet, multiple USB-A/C ports, audio jacks, and simultaneous DC charging power over a single connection. Flash drives provide storage, KVM switches share peripherals between multiple PCs, and Bluetooth receivers handle audio.",
        "distractor_analysis": {
            "1": "A USB flash drive is portable solid-state storage, offering no port replication, video expansion, or charging capabilities.",
            "2": "A KVM switch allows one monitor, keyboard, and mouse to switch between multiple separate physical computers.",
            "3": "A Bluetooth receiver connects audio devices wirelessly, providing no docking or video capabilities."
        },
        "tags": ["mobile", "accessories", "docking-station", "laptop"]
    },
    {
        "id": "C1-217",
        "objective": "1.3",
        "type": "single",
        "difficulty": "easy",
        "question": "What term describes the practice of sharing a smartphone's cellular Internet connection directly with a single laptop computer via a physical USB cable?",
        "options": [
            "USB Tethering",
            "Wi-Fi Mobile Hotspot",
            "Near Field Communication (NFC)",
            "Cellular Tower Roaming"
        ],
        "answer": 0,
        "explanation": "USB Tethering is the configuration where a mobile device shares its cellular data connection with a connected computer over a direct physical USB cable, functioning as an external network adapter. A Wi-Fi hotspot broadcasts the connection wirelessly over 802.11, NFC communicates across a few centimeters, and roaming connects to partner cell towers.",
        "distractor_analysis": {
            "1": "A Wi-Fi mobile hotspot broadcasts an 802.11 wireless network SSID to multiple wireless devices simultaneously.",
            "2": "NFC is a short-range radio technology (up to 4 cm) used for contactless payments, not high-speed data tethering.",
            "3": "Cellular roaming occurs when a phone connects to partner cellular carrier towers outside its primary home network."
        },
        "tags": ["mobile", "connectivity", "tethering", "usb", "cellular"]
    },
    {
        "id": "C1-218",
        "objective": "1.3",
        "type": "single",
        "difficulty": "easy",
        "question": "Which modern mobile device technology allows users to activate, store, and switch between multiple cellular carrier subscription profiles digitally on a single smartphone without inserting a physical plastic SIM card?",
        "options": [
            "Embedded SIM (eSIM)",
            "International Mobile Equipment Identity (IMEI)",
            "MicroSD expandable storage card",
            "Preferred Roaming List (PRL)"
        ],
        "answer": 0,
        "explanation": "An embedded SIM (eSIM) is a programmable microchip soldered directly onto the smartphone's logic board that allows users to download and store multiple carrier subscription profiles digitally, enabling multi-carrier switching and international roaming without physical plastic SIM cards. IMEI is a hardware serial number, MicroSD is flash storage, and PRL is roaming database tables.",
        "distractor_analysis": {
            "1": "The IMEI is a globally unique 15-digit hardware serial number that identifies a physical mobile phone, not a carrier subscription profile.",
            "2": "A MicroSD card expands flash storage capacity for photos and documents, not cellular carrier credentials.",
            "3": "A PRL is a legacy carrier frequency database table used on CDMA networks."
        },
        "tags": ["mobile", "cellular", "esim", "sim"]
    },
    {
        "id": "C1-219",
        "objective": "1.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which memory form factor is utilized in modern laptop computers and compact small-form-factor devices due to its compact physical size?",
        "options": [
            "Small Outline Dual In-line Memory Module (SO-DIMM)",
            "Standard Desktop Unbuffered DIMM",
            "Rambus In-line Memory Module (RIMM)",
            "Single In-line Memory Module (SIMM)"
        ],
        "answer": 0,
        "explanation": "SO-DIMMs (Small Outline DIMMs) are specifically engineered for laptops, all-in-one PCs, and thin clients, measuring approximately half the physical length of full-size desktop DIMMs. Desktop DIMMs are too large for laptops, RIMMs are obsolete proprietary Rambus modules, and SIMMs are legacy 30/72-pin modules from the 1990s.",
        "distractor_analysis": {
            "1": "Full-size desktop DIMMs are 133mm long and cannot physically fit into compact laptop memory slots.",
            "2": "RIMMs were proprietary memory modules used with early Intel Pentium 4 processors, long obsolete.",
            "3": "SIMMs are obsolete single-sided contact memory modules from vintage 1990s PCs."
        },
        "tags": ["mobile", "laptop", "ram", "so-dimm", "form-factors"]
    },
    {
        "id": "C1-220",
        "objective": "5.4",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician observes that a laptop chassis is bulging outward, lifting the trackpad and separating the bottom casing seam due to a swollen lithium-ion battery. What is the FIRST and most critical safety action?",
        "options": [
            "Immediately power down the laptop, disconnect the AC charger, and safely remove the battery for hazardous disposal without puncturing it",
            "Connect the high-wattage fast charger to fully charge the battery to 100%",
            "Puncture the battery pouch with a small pin to vent trapped gases",
            "Place the swollen laptop inside a freezer overnight to condense the cells"
        ],
        "answer": 0,
        "explanation": "A swollen lithium-ion battery indicates severe internal chemical degradation and gas buildup that presents an immediate risk of fire and explosive thermal runaway. The technician must immediately power down the laptop, disconnect external AC power, avoid puncturing the battery pouch (which causes violent chemical ignition upon contact with air), remove it safely, and place it in a fireproof sand container for hazardous waste recycling. Puncturing, freezing, or charging a swollen battery is extremely dangerous.",
        "distractor_analysis": {
            "1": "Charging a swollen lithium-ion battery increases internal heat and voltage pressure, triggering catastrophic thermal runaway and fire.",
            "2": "Puncturing a lithium-ion cell exposes volatile lithium electrolytes to oxygen and moisture, causing an immediate explosive fire.",
            "3": "Freezing causes moisture condensation and damages internal cell separators without fixing chemical swelling."
        },
        "tags": ["troubleshooting", "mobile", "battery", "safety", "swollen-battery"]
    },
    {
        "id": "C1-221",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "According to the official CompTIA 6-step Troubleshooting Methodology, what is the FIRST step a technician must execute when diagnosing an issue?",
        "options": [
            "Identify the problem",
            "Establish a theory of probable cause",
            "Test the theory to determine cause",
            "Document findings, actions, and outcomes"
        ],
        "answer": 0,
        "explanation": "The CompTIA Troubleshooting Methodology begins with Step 1: 'Identify the problem', which involves questioning the user, identifying user changes, performing backups before making changes, inquiring about environmental/infrastructure changes, and reviewing system logs. Step 2 is establishing a theory, Step 3 is testing the theory, and Step 6 is documenting findings.",
        "distractor_analysis": {
            "1": "Establishing a theory of probable cause is Step 2, performed after gathering problem details in Step 1.",
            "2": "Testing the theory is Step 3, performed to confirm or disprove the theory established in Step 2.",
            "3": "Documenting findings is Step 6, the final step performed after verifying full system functionality."
        },
        "tags": ["troubleshooting", "methodology", "comptia", "step-1"]
    },
    {
        "id": "C1-222",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician has tested their theory of probable cause regarding a system fault and successfully confirmed the root cause. What is the NEXT step in the CompTIA Troubleshooting Methodology?",
        "options": [
            "Establish a plan of action to resolve the problem and implement the solution",
            "Document findings, actions, and outcomes and close the ticket",
            "Verify full system functionality and implement preventive measures",
            "Question the user to identify recent environmental changes"
        ],
        "answer": 0,
        "explanation": "Once Step 3 ('Test the theory to determine cause') confirms the root cause, the technician proceeds immediately to Step 4: 'Establish a plan of action to resolve the problem and implement the solution'. Step 5 (Verify functionality) follows implementation, Step 6 (Document findings) completes the process, and questioning the user is part of Step 1.",
        "distractor_analysis": {
            "1": "Documenting findings is Step 6, which is only performed after the solution is implemented and verified.",
            "2": "Verifying full system functionality is Step 5, performed after the plan of action is implemented in Step 4.",
            "3": "Questioning the user is part of Step 1 (Identify the problem), which took place at the start of troubleshooting."
        },
        "tags": ["troubleshooting", "methodology", "comptia", "plan-of-action"]
    },
    {
        "id": "C1-223",
        "objective": "5.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A laser printer outputs pages that have dense, repeating vertical black lines or a completely black page across the entire sheet. Which component is the primary cause of this fault?",
        "options": [
            "Primary charge roller (PCR) / High-voltage power supply",
            "Paper feed pickup roller",
            "Transfer corona wire assembly",
            "Duplexer reversing solenoid"
        ],
        "answer": 0,
        "explanation": "In a laser printer, the primary charge roller (or corona wire) applies a uniform high-voltage negative charge (-600V) across the photosensitive drum to repel toner. If the charge roller or high-voltage power supply fails, the drum has zero negative charge; toner is attracted to the entire drum surface, printing an entirely black page or heavy black stripes. Pickup rollers feed paper, transfer coronas pull toner to paper, and duplexers flip paper.",
        "distractor_analysis": {
            "1": "Worn paper pickup rollers cause paper feed failure, paper jams, or multi-sheet feeds, not black pages.",
            "2": "A failed transfer corona prevents toner from moving from the drum to the paper, producing completely blank white pages.",
            "3": "A duplexer solenoid controls mechanical paper reversal for two-sided printing, unrelated to drum electrostatic charging."
        },
        "tags": ["troubleshooting", "printers", "laser", "charge-roller", "black-pages"]
    },
    {
        "id": "C1-224",
        "objective": "5.6",
        "type": "single",
        "difficulty": "easy",
        "question": "Users in an office report that all print jobs sent to a network printer are stuck in the Windows print queue with status 'Printing' or 'Error - Printing', and no new jobs will process. What is the fastest administrative fix?",
        "options": [
            "Stop and restart the Windows Print Spooler service (or clear the C:\\Windows\\System32\\spool\\PRINTERS directory)",
            "Reinstall the Windows operating system on all client workstations",
            "Replace the physical fuser assembly in the laser printer",
            "Refill the cyan toner cartridge hopper"
        ],
        "answer": 0,
        "explanation": "When a corrupted print job halts the Windows print queue, restarting the Windows Print Spooler service (via services.msc or 'net stop spooler && net start spooler') and clearing out stuck .SPL and .SHD spool files from the spool directory flushes the stalled job and restores normal printing. Reinstalling Windows is unnecessary, and fusers/toner do not freeze software print queues.",
        "distractor_analysis": {
            "1": "Reinstalling the operating system on workstations is extreme, disruptive, and unnecessary for a simple software spooler hang.",
            "2": "The fuser is a mechanical heating element; a frozen software queue is a Windows spooler service issue.",
            "3": "Low toner generates an on-screen warning or faded print, but does not lock the software print spooler queue."
        },
        "tags": ["troubleshooting", "printers", "spooler", "windows", "queue"]
    },
    {
        "id": "C1-225",
        "objective": "5.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A laser printer continuously spits out dozens of pages printed with endless lines of garbled text, random ASCII symbols, and binary code. What is the root cause of this problem?",
        "options": [
            "An incorrect or corrupted printer driver / Page Description Language (PostScript vs PCL) mismatch",
            "Low toner levels inside the black toner hopper",
            "A physical paper jam in the duplex assembly",
            "A blown thermal fuse in the fuser unit"
        ],
        "answer": 0,
        "explanation": "When a printer receives data formatted in a Page Description Language (PDL) it cannot interpret (e.g., sending PostScript code to a printer expecting PCL, or using an incompatible generic driver), the printer treats the raw binary formatting code as plain ASCII text and prints endless pages of garbled characters and symbols. Installing the correct manufacturer PostScript/PCL driver resolves this. Low toner causes faded text, and jams stop paper motion.",
        "distractor_analysis": {
            "1": "Low toner produces faint, washed-out printing or streaks, not garbled binary characters.",
            "2": "A paper jam halts the physical paper path and triggers an immediate paper jam error on the printer control panel.",
            "3": "A blown fuser fuse prevents heating, resulting in loose, smudged toner rather than garbled text."
        },
        "tags": ["troubleshooting", "printers", "driver", "pdl", "pcl", "postscript", "garbled-print"]
    },
    {
        "id": "C1-226",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A user reports that every few days their desktop workstation clock falls behind by several minutes, and during power-on the computer displays a pre-boot BIOS checksum error. Which component should the technician replace?",
        "options": [
            "The CR2032 lithium coin-cell CMOS battery on the motherboard",
            "The desktop power supply unit (PSU)",
            "The primary system RAM module",
            "The active CPU heatsink fan"
        ],
        "answer": 0,
        "explanation": "A depleted CR2032 3V lithium coin-cell battery cannot maintain sufficient voltage to power the Real-Time Clock (RTC) oscillator and volatile CMOS settings memory when the system is unpowered or in standby, resulting in time drift, loss of BIOS configurations, and 'CMOS Checksum Error' messages during POST. Replacing the coin-cell battery resolves the issue permanently. PSUs, RAM, and fans do not power the pre-boot RTC chip.",
        "distractor_analysis": {
            "1": "The main power supply unit powers the PC while running, but does not provide standby RTC battery backup when AC power is disconnected.",
            "2": "System RAM is volatile memory holding runtime OS data and does not regulate motherboard hardware RTC clock timing.",
            "3": "CPU fans provide thermal cooling and have no connection to motherboard BIOS battery power."
        },
        "tags": ["hardware", "bios", "cmos", "battery", "rtc", "troubleshooting"]
    },
    {
        "id": "C1-227",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "A conference room PC must be connected to a wall-mounted commercial 4K television to deliver high-definition presentations with both multi-channel digital audio and video over a single cable. Which connection interface is the standard choice?",
        "options": [
            "High-Definition Multimedia Interface (HDMI)",
            "Legacy 15-pin analog VGA",
            "Digital Visual Interface (DVI-D)",
            "3.5mm analog stereo audio cable"
        ],
        "answer": 0,
        "explanation": "HDMI is the universal consumer and commercial audiovisual standard for televisions and displays, transmitting uncompressed ultra-high-definition digital video (up to 4K/8K) and multi-channel digital audio simultaneously across a single cable. VGA is analog video-only, DVI-D carries video without native TV audio integration, and 3.5mm cables carry audio only.",
        "distractor_analysis": {
            "1": "VGA is an obsolete analog video standard that cannot carry audio signals and lacks bandwidth for 4K resolutions.",
            "2": "DVI-D carries digital video but does not standardly transmit consumer television audio streams.",
            "3": "A 3.5mm stereo cable transmits analog sound waves only, with no video transmission capability."
        },
        "tags": ["hardware", "cables", "hdmi", "display", "audio", "video"]
    },
    {
        "id": "C1-228",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "An enterprise user notices that a shared cloud spreadsheet synced locally to their desktop does not contain edits made earlier in the day by a colleague. What is the BEST first action the technician should take to diagnose the synchronization issue?",
        "options": [
            "Open the local cloud storage sync client, check the activity log for reported file sync or conflict errors, and follow the resolution steps",
            "Immediately format the local hard drive and perform a clean OS reinstallation",
            "Submit a public utility outage ticket to the municipal power company",
            "Permanently delete the user cloud user profile account"
        ],
        "answer": 0,
        "explanation": "Cloud storage synchronization clients (such as OneDrive, Google Drive, or Dropbox) maintain real-time sync status logs and error indicators. Opening the client reveals specific error conditions (e.g., file lock conflicts, authentication expiration, exceeded quotas, or path length violations) and provides automated conflict resolution wizards. Formatting drives, reporting power outages, or deleting user accounts are destructive and irrelevant.",
        "distractor_analysis": {
            "1": "Formatting the hard drive destroys local user files without diagnosing the specific cloud synchronization conflict.",
            "2": "Municipal power outages are unrelated when the user's computer and network are fully powered on and operational.",
            "3": "Deleting the user account terminates cloud access and destroys permissions, worsening the issue."
        },
        "tags": ["cloud", "storage", "synchronization", "troubleshooting"]
    },
    {
        "id": "C1-229",
        "objective": "5.2",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician is preparing to replace a user laptop's aging mechanical hard drive (HDD) with a high-speed solid-state drive (SSD). What is the FIRST and most critical action the technician must perform before touching the hardware?",
        "options": [
            "Create a complete verified backup or disk image of the existing hard drive",
            "Upgrade the laptop DDR4 RAM to maximum capacity",
            "Flash the motherboard BIOS with uncertified beta firmware",
            "Uninstall all anti-malware software from the operating system"
        ],
        "answer": 0,
        "explanation": "According to CompTIA best practices and standard IT procedures, the mandatory first step before performing any drive replacement, storage migration, or major maintenance is to perform a full, verified backup or sector-by-sector disk image of the source drive to prevent catastrophic data loss if the drive fails during cloning. RAM upgrades, firmware flashing, and disabling antivirus are not pre-requisites.",
        "distractor_analysis": {
            "1": "Upgrading RAM may be a separate performance improvement, but does not protect existing disk data.",
            "2": "Flashing beta firmware introduces platform instability and carries no data protection function.",
            "3": "Uninstalling security software leaves the system vulnerable to malware and is unnecessary for storage upgrades."
        },
        "tags": ["troubleshooting", "storage", "backup", "ssd-upgrade", "best-practices"]
    },
    {
        "id": "C1-230",
        "objective": "5.4",
        "type": "single",
        "difficulty": "medium",
        "question": "A smartphone user notices that their phone chassis has split open along one seam, the glass screen is lifting, and the device is visibly bulging. What action should the user take FIRST?",
        "options": [
            "Immediately power off the device, stop charging it, place it in a fire-safe location, and contact the manufacturer or qualified service provider",
            "Place the smartphone into a bowl of dry white rice for 48 hours",
            "Put the smartphone into a domestic refrigerator freezer overnight",
            "Fully discharge the battery to 0% and then rapid-charge it to 100%"
        ],
        "answer": 0,
        "explanation": "A bulging or split smartphone casing is caused by a swollen lithium-ion battery. This indicates internal cell damage and gas accumulation that can lead to hazardous thermal runaway and fire. The user must immediately shut off the device, disconnect the charger, store it in a cool, fire-safe location, and seek authorized warranty replacement/hazardous disposal. Rice, freezers, and charging cycles will not fix chemical gas swelling and increase fire risk.",
        "distractor_analysis": {
            "1": "Placing a device in rice is an ineffective folk remedy for water damage, providing zero benefit for a physically swollen battery.",
            "2": "Freezing causes internal moisture condensation and does not reverse chemical lithium-ion cell swelling.",
            "3": "Deeply discharging and rapid-charging a compromised battery generates intense heat, triggering catastrophic battery ignition."
        },
        "tags": ["troubleshooting", "mobile", "battery", "safety", "swelling"]
    },
    {
        "id": "C1-231",
        "objective": "2.7",
        "type": "single",
        "difficulty": "easy",
        "question": "What network classification describes short-range wireless connectivity (typically within 10 meters) connecting personal peripheral devices like wireless mice, keyboards, headsets, and smartwatches?",
        "options": [
            "Personal Area Network (PAN)",
            "Local Area Network (LAN)",
            "Wide Area Network (WAN)",
            "Metropolitan Area Network (MAN)"
        ],
        "answer": 0,
        "explanation": "A Personal Area Network (PAN / WPAN), commonly utilizing Bluetooth (IEEE 802.15.1) or NFC, provides short-range data communication (within ~10 meters / 30 feet) centered around an individual person and their personal computing accessories. LANs cover buildings, WANs span countries/continents, and MANs span entire cities.",
        "distractor_analysis": {
            "1": "A Local Area Network (LAN) spans an entire office, building, or home using Ethernet and Wi-Fi infrastructure.",
            "2": "A Wide Area Network (WAN) connects geographically separated networks across cities, countries, or the globe (e.g., the Internet).",
            "3": "A Metropolitan Area Network (MAN) spans a municipal city or large university campus."
        },
        "tags": ["networking", "network-types", "pan", "bluetooth", "lan"]
    },
    {
        "id": "C1-232",
        "objective": "2.7",
        "type": "single",
        "difficulty": "easy",
        "question": "Among the following WAN and broadband Internet connection technologies, which provides the highest theoretical throughput speeds and lowest transmission latency?",
        "options": [
            "Fiber-optic broadband (FTTH / 10G-PON)",
            "Geostationary satellite Internet",
            "Digital Subscriber Line (DSL)",
            "DOCSIS 3.0 Coaxial Cable broadband"
        ],
        "answer": 0,
        "explanation": "Fiber-optic broadband (Fiber to the Home / FTTH / 10G-PON) transmits light pulses through glass optical fibers, offering symmetrical gigabit to multi-gigabit speeds (1 to 10 Gbps+) and ultra-low single-digit millisecond latency. Satellite suffers from high propagation delay (500+ ms), DSL is limited by copper phone line attenuation (up to 100 Mbps), and coaxial cable is shared bandwidth with asymmetric upload limits.",
        "distractor_analysis": {
            "1": "Satellite internet has high latency (500-700 ms on GEO) and lower throughput due to atmospheric and orbital distance limits.",
            "2": "DSL relies on legacy twisted-pair copper telephone lines, suffering rapid signal degradation over distance.",
            "3": "Cable broadband offers high download speeds, but is constrained by asymmetrical upload bandwidth and shared neighborhood coaxial loops."
        },
        "tags": ["networking", "internet-connections", "fiber", "broadband", "speed"]
    },
    {
        "id": "C1-233",
        "objective": "1.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which short-range high-frequency wireless radio technology (operating at 13.56 MHz over distances under 4 cm) is utilized by mobile devices to process contactless point-of-sale payments (e.g., Apple Pay, Google Wallet)?",
        "options": [
            "Near Field Communication (NFC)",
            "Bluetooth Classic",
            "Wi-Fi Direct (IEEE 802.11)",
            "Cellular 5G Ultra-Wideband"
        ],
        "answer": 0,
        "explanation": "Near Field Communication (NFC) operates at 13.56 MHz using electromagnetic induction over ultra-short distances (typically under 4 cm / 1.5 inches). This extreme proximity provides inherent physical security, making NFC the universal standard for mobile contactless payments, tap-to-pair setup, and transit card passes. Bluetooth, Wi-Fi Direct, and 5G operate over much larger distances.",
        "distractor_analysis": {
            "1": "Bluetooth operates over ~10 meters at 2.4 GHz and is not used for point-of-sale tap-to-pay transaction security.",
            "2": "Wi-Fi Direct allows peer-to-peer file sharing over 802.11 radio, lacking contactless payment terminal integration.",
            "3": "Cellular 5G provides high-speed wide-area carrier connectivity over cell towers, not short-range payment terminal induction."
        },
        "tags": ["mobile", "nfc", "contactless-payment", "wireless"]
    },
    {
        "id": "C1-234",
        "objective": "2.8",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician is troubleshooting a wired desktop computer that experiences intermittent network disconnections. To verify whether the physical Ethernet transceiver and internal circuitry of the network interface card (NIC) are functioning correctly without external cable variables, which tool should the technician plug into the RJ-45 port?",
        "options": [
            "Hardware RJ-45 Loopback plug",
            "Digital multimeter on resistance mode",
            "Tone generator and probe",
            "Optical Power Meter"
        ],
        "answer": 0,
        "explanation": "An Ethernet loopback plug connects the physical transmit pins (pins 1 and 2 in 10/100) directly to the receive pins (pins 3 and 6) inside a single RJ-45 connector. When plugged into a NIC while running diagnostic software, it tests the adapter's internal MAC/PHY transceiver chips, verifying whether the NIC hardware itself is healthy. Multimeters test continuity, toners trace cables, and optical meters test fiber power.",
        "distractor_analysis": {
            "1": "A multimeter measures static electrical resistance or voltage, but cannot emulate network data frames to test NIC transceivers.",
            "2": "A tone generator and probe injects audio tones to trace cables through walls, but does not test NIC interface hardware.",
            "3": "An optical power meter measures optical light loss on fiber-optic links, not copper Ethernet NICs."
        },
        "tags": ["networking", "tools", "loopback-plug", "nic", "troubleshooting"]
    },
    {
        "id": "C1-235",
        "objective": "3.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician is calculating the minimum power supply wattage required for a custom server containing two CPUs (100W each), five SAS hard drives (9W each), a high-end compute GPU (200W), and motherboard/RAM overhead (75W). What is the minimum standard PSU capacity required to safely power this system with recommended headroom?",
        "options": [
            "650W or 750W power supply unit (handling the ~520W total peak draw with 20-30% headroom)",
            "250W power supply unit",
            "350W power supply unit",
            "400W power supply unit"
        ],
        "answer": 0,
        "explanation": "Calculating component power consumption: 2 CPUs x 100W = 200W; 5 HDDs x 9W = 45W; GPU = 200W; Motherboard/fans/RAM = ~75W. Total continuous power draw = 520 Watts. Standard engineering best practice requires sizing the PSU with 20% to 30% headroom (520W / 0.8 = 650W) to handle transient load spikes and ensure efficiency within the 50-80% load curve. PSUs rated at 250W, 350W, or 400W would immediately trigger over-current protection (OCP) shutdowns.",
        "distractor_analysis": {
            "1": "A 250W PSU provides less than half of the required 520W peak power and would fail to boot.",
            "2": "A 350W PSU is severely underpowered for a 520W load and would trip power protection under GPU load.",
            "3": "A 400W PSU cannot supply the 520W continuous demand of dual CPUs and a 200W GPU."
        },
        "tags": ["hardware", "power", "psu", "wattage-calculation", "sizing"]
    },
    {
        "id": "C1-236",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician is troubleshooting a newly assembled desktop computer that shows no signs of life (no fan spin, no LEDs, no POST) when the front power button is pressed. The technician verifies that the AC wall outlet, power cord, and PSU master switch are functional. What is the NEXT logical physical connection to inspect?",
        "options": [
            "The front-panel power switch jumper lead connection on the motherboard front panel header",
            "The SATA data cable connected to the solid-state drive",
            "The thermal paste distribution under the CPU cooler",
            "The monitor DisplayPort cable seating"
        ],
        "answer": 0,
        "explanation": "If the PSU has power but pressing the power button produces zero response, the most common issue in custom builds is an unseated, loose, or incorrectly oriented front-panel power switch (PWR_SW) jumper lead on the motherboard's front panel header. Inspecting the header pins or momentarily bridging the power switch pins with a flathead screwdriver tests this immediately. SATA cables, thermal paste, and display cables do not prevent power spin-up.",
        "distractor_analysis": {
            "1": "A disconnected SATA cable prevents drive detection during boot, but does not prevent the PSU from turning on.",
            "2": "Thermal paste affects heat dissipation; a computer will still power on and spin fans even with missing thermal paste.",
            "3": "A loose display cable prevents video output to the monitor, but the PC chassis fans and LEDs will still power on."
        },
        "tags": ["troubleshooting", "hardware", "power", "front-panel", "motherboard"]
    },
    {
        "id": "C1-237",
        "objective": "1.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which operating system power management feature in mobile devices dynamically dims display brightness, limits CPU peak performance, stops background application refreshes, and pauses automatic email polling to maximize remaining battery runtime?",
        "options": [
            "Battery Saver / Low Power Mode",
            "Do Not Disturb mode",
            "High Performance Power Profile",
            "Airplane mode"
        ],
        "answer": 0,
        "explanation": "Battery Saver (Low Power Mode) is an automated OS power state that extends battery runtime by reducing display brightness, throttling CPU clock speeds, disabling visual effects, pausing background app sync, and suspending push email. Do Not Disturb silences notifications, High Performance consumes maximum power, and Airplane mode disables all radios.",
        "distractor_analysis": {
            "1": "Do Not Disturb silences incoming audio rings and banner notifications, but does not throttle CPU power or dim screens.",
            "2": "High Performance mode maximizes CPU frequencies and display brightness, increasing battery drain.",
            "3": "Airplane mode disables RF wireless radios (cellular, Wi-Fi, Bluetooth), but does not specifically manage background OS tasks or screen throttling."
        },
        "tags": ["mobile", "power-management", "battery", "battery-saver"]
    },
    {
        "id": "C1-238",
        "objective": "2.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following wireless security encryption protocols utilizes CCMP (Counter Mode with Cipher Block Chaining Message Authentication Code Protocol) based on AES-128 to provide strong, standardized protection for Wi-Fi networks?",
        "options": [
            "Wi-Fi Protected Access 2 (WPA2)",
            "Wired Equivalent Privacy (WEP)",
            "Wi-Fi Protected Setup (WPS)",
            "Original WPA with TKIP"
        ],
        "answer": 0,
        "explanation": "WPA2 (Wi-Fi Protected Access 2, standardized as IEEE 802.11i) mandates the use of AES (Advanced Encryption Standard) encryption via the CCMP protocol, providing robust confidentiality and integrity. WEP is completely obsolete and cryptographically broken, original WPA uses vulnerable TKIP, and WPS has severe PIN brute-force vulnerabilities.",
        "distractor_analysis": {
            "1": "Wired Equivalent Privacy (WEP) uses RC4 encryption with 24-bit initialization vectors and can be cracked in seconds.",
            "2": "Wi-Fi Protected Setup (WPS) is an easy-connection mechanism vulnerable to offline PIN brute-force attacks.",
            "3": "Original WPA uses Temporal Key Integrity Protocol (TKIP) with RC4, which is deprecated due to security weaknesses."
        },
        "tags": ["networking", "wireless", "security", "wpa2", "aes", "ccmp"]
    },
    {
        "id": "C1-239",
        "objective": "5.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A workstation experiences system crashes and driver errors immediately following a recent driver update. Which Windows recovery feature allows a technician to revert system files, installed drivers, and registry settings back to an earlier working point in time without deleting personal user documents?",
        "options": [
            "System Restore (rstrui.exe)",
            "Disk Cleanup (cleanmgr.exe)",
            "Format Drive utility",
            "Disk Defragmenter"
        ],
        "answer": 0,
        "explanation": "Windows System Restore (rstrui.exe) uses Volume Shadow Copy snapshots (Restore Points) to roll back operating system files, Windows updates, installed device drivers, and system registry hives to a previous known-good state, resolving boot errors and driver corruption without deleting personal user documents. Disk Cleanup frees space, formatting erases drives, and defragmentation optimizes spinning disk sectors.",
        "distractor_analysis": {
            "1": "Disk Cleanup deletes temporary files and cache data to free storage space, but cannot roll back system drivers.",
            "2": "Formatting a drive erases all partitions and files, destroying user data.",
            "3": "Disk Defragmenter consolidates fragmented file clusters on mechanical hard drives, having no recovery rollback function."
        },
        "tags": ["troubleshooting", "windows", "system-restore", "recovery"]
    },
    {
        "id": "C1-240",
        "objective": "5.6",
        "type": "single",
        "difficulty": "easy",
        "question": "A departmental network printer suddenly stops printing, and all submitted user documents accumulate in the queue. The printer status icon in Windows displays 'Offline'. What is the most probable cause?",
        "options": [
            "The printer is powered off, disconnected from the network cable, or has an unresolvable IP communication failure",
            "The printer requires a 220V three-phase electrical upgrade",
            "The client computer RAM memory is running in single-channel mode",
            "The printer photosensitive drum has reached its end of life"
        ],
        "answer": 0,
        "explanation": "A printer displays 'Offline' status in Windows when the operating system's print subsystem can no longer communicate with the device across its configured port (e.g., the printer was powered off, the Ethernet cable was unplugged, the Wi-Fi dropped, or its DHCP IP address changed without updating the TCP/IP port). Powering on and restoring network connectivity brings it online. Phase upgrades, single-channel RAM, and drum life do not cause network offline states.",
        "distractor_analysis": {
            "1": "Standard office printers run on standard single-phase 120V or 230V AC wall power, not industrial 220V three-phase.",
            "2": "RAM channel configurations (single vs dual channel) affect PC memory throughput, completely unrelated to printer connectivity.",
            "3": "An expired drum unit causes poor print quality or maintenance warnings, but does not take the printer's network interface offline."
        },
        "tags": ["troubleshooting", "printers", "offline", "network-printer"]
    },
    {
        "id": "C1-241",
        "objective": "4.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which foundational characteristic of cloud computing allows organizations to dynamically increase compute, storage, and networking capacity on demand to accommodate growing business workloads without purchasing new physical datacenter servers?",
        "options": [
            "Scalability (Vertical scaling up and Horizontal scaling out)",
            "Local Direct-Attached Storage (DAS)",
            "Static non-routable perimeter networking",
            "On-premises hardware maintenance requirements"
        ],
        "answer": 0,
        "explanation": "Scalability is a core cloud characteristic that enables an organization to seamlessly accommodate growing workloads by increasing capacity: either vertically (scaling up by adding more CPU cores or RAM to an existing virtual machine) or horizontally (scaling out by provisioning additional VM instances in parallel). Direct-Attached Storage, static isolation, and on-premises maintenance represent legacy traditional IT constraints.",
        "distractor_analysis": {
            "1": "Direct-Attached Storage (DAS) refers to dedicated local drives attached to a physical server, lacking cloud pooling flexibility.",
            "2": "Static non-routable networking restricts communication and contradicts cloud broad network access.",
            "3": "On-premises hardware maintenance is the responsibility of the cloud provider in public cloud models."
        },
        "tags": ["cloud", "scalability", "characteristics", "elasticity"]
    },
    {
        "id": "C1-242",
        "objective": "2.5",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the primary security function of a network firewall deployed at the boundary between an internal enterprise LAN and the public Internet?",
        "options": [
            "To inspect and filter incoming and outgoing network traffic, blocking unauthorized access based on defined security rules",
            "To convert analog dial-up telephone signals into digital Ethernet packets",
            "To automatically assign IP addresses to client workstations using DHCP",
            "To boost wireless radio signal coverage across building floors"
        ],
        "answer": 0,
        "explanation": "A firewall is a network security device that monitors and controls incoming and outgoing network traffic based on predetermined security rules (ACLs, stateful packet inspection, port/protocol filtering), acting as a barrier to block unauthorized external access while allowing legitimate business traffic. Modems convert analog signals, DHCP servers assign IPs, and wireless repeaters extend Wi-Fi coverage.",
        "distractor_analysis": {
            "1": "Converting analog telephone waveforms to digital signals is the role of an analog modem (modulator/demodulator).",
            "2": "Dynamically assigning IP configurations to network hosts is the function of a DHCP server.",
            "3": "Amplifying wireless radio signal coverage is performed by Wi-Fi repeaters, mesh nodes, and additional access points."
        },
        "tags": ["networking", "firewall", "security", "perimeter"]
    },
    {
        "id": "C1-243",
        "objective": "3.5",
        "type": "single",
        "difficulty": "medium",
        "question": "On modern OEM enterprise desktop and laptop computers (such as Dell, HP, or Lenovo), where is the factory Windows digital license product key permanently embedded and automatically validated during operating system installation?",
        "options": [
            "Embedded in the motherboard UEFI firmware (MSDM table in ACPI)",
            "Printed on a paper card inside the shipping box packing foam",
            "Stored in the Master Boot Record of the original hard drive",
            "Stored in the local router DHCP option pool"
        ],
        "answer": 0,
        "explanation": "Modern OEM computers embed the Windows Product Key (Digital License) directly inside the motherboard's UEFI firmware within the Microsoft Data Custom Marker (MSDM) table in ACPI. During Windows installation, setup automatically reads the embedded key from UEFI and activates without prompting the user. Legacy PCs used paper COA stickers on the chassis, but modern systems use firmware-embedded keys.",
        "distractor_analysis": {
            "1": "Loose paper cards are no longer used for pre-installed OEM Windows licensing on commercial hardware.",
            "2": "The MBR contains partition tables and boot code; storing license keys on drives would break licensing if the drive were replaced.",
            "3": "DHCP option pools distribute IP and DNS parameters, not Microsoft OS product activation keys."
        },
        "tags": ["hardware", "uefi", "windows", "licensing", "product-key"]
    },
    {
        "id": "C1-244",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following physical cable types is standardly used to establish a wired Category 6 Ethernet connection between a workstation and a wall jack?",
        "options": [
            "Unshielded Twisted Pair (UTP) copper cable with RJ-45 (8P8C) connectors",
            "USB 3.0 Type-A to Type-B peripheral cable",
            "HDMI 2.1 High-Speed video cable",
            "Single-pair analog RJ-11 telephone cord"
        ],
        "answer": 0,
        "explanation": "Category 6 Unshielded Twisted Pair (UTP) copper cabling terminated with 8P8C (RJ-45) connectors is the universal standard for wired 1000BASE-T and 10GBASE-T Ethernet network connections. USB connects peripherals, HDMI carries video/audio to displays, and RJ-11 connects legacy analog telephone landlines.",
        "distractor_analysis": {
            "1": "USB Type-A to Type-B cables connect peripheral devices like printers and audio interfaces, not Ethernet LANs.",
            "2": "HDMI cables transmit high-definition digital video and audio to monitors and TVs.",
            "3": "RJ-11 cables are 4-pin/6-pin telephone cords used for analog POTS telephone lines and DSL modems."
        },
        "tags": ["hardware", "cables", "ethernet", "utp", "rj45"]
    },
    {
        "id": "C1-245",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following physical components is soldered directly onto the motherboard PCB as an integrated expansion socket to receive system memory modules?",
        "options": [
            "Dual In-line Memory Module (DIMM) RAM slots",
            "External 3.5-inch mechanical hard drive",
            "Modular ATX power supply unit",
            "External USB flatbed document scanner"
        ],
        "answer": 0,
        "explanation": "DIMM (Dual In-line Memory Module) memory slots are physical multi-pin sockets soldered directly to the motherboard printed circuit board, engineered to receive and lock in DDR4 or DDR5 RAM sticks. Hard drives, power supplies, and external scanners are separate components connected via cables or mounting bays.",
        "distractor_analysis": {
            "1": "Hard disk drives are secondary storage devices mounted in chassis drive cages and connected via SATA/SAS cables.",
            "2": "Power supply units are standalone enclosures mounted in the chassis and connected to the motherboard via power harnesses.",
            "3": "Flatbed document scanners are external desktop peripherals connected via USB cables."
        },
        "tags": ["hardware", "motherboard", "ram", "dimm", "slots"]
    },
    {
        "id": "C1-246",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A datacenter technician is configuring an enterprise database server that requires real-time memory integrity checking to prevent system crashes caused by alpha particle radiation and electrical noise. Which type of memory technology must be specified?",
        "options": [
            "Error-Correcting Code (ECC) RAM",
            "Non-ECC unbuffered desktop DDR4",
            "Dual-channel consumer dynamic RAM",
            "High-frequency non-parity SODIMM"
        ],
        "answer": 0,
        "explanation": "Error-Correcting Code (ECC) RAM contains dedicated parity bits and algorithmic logic that detects and automatically corrects single-bit memory errors in real time, while detecting multi-bit errors and halting the system cleanly to prevent silent database corruption and catastrophic crashes. Non-ECC RAM lacks error correction.",
        "distractor_analysis": {
            "1": "Non-ECC RAM cannot detect or correct memory bit flips, which can cause silent data corruption and unexpected operating system kernel panics.",
            "2": "Dual-channel is a memory bus architecture that doubles memory bandwidth, not an error-correction mechanism.",
            "3": "Non-parity SODIMMs are consumer laptop modules with no error detection or correction capabilities."
        },
        "tags": ["hardware", "ram", "ecc", "data-integrity", "server"]
    },
    {
        "id": "C1-247",
        "objective": "3.4",
        "type": "single",
        "difficulty": "medium",
        "question": "A storage administrator deploys a RAID 5 array consisting of four 4 TB enterprise SAS hard disk drives. What is the total usable storage capacity of the volume, and how many concurrent disk failures can the array tolerate without data loss?",
        "options": [
            "12 TB usable capacity and tolerance for 1 drive failure",
            "16 TB usable capacity and tolerance for 0 drive failures",
            "8 TB usable capacity and tolerance for 2 drive failures",
            "4 TB usable capacity and tolerance for 3 drive failures"
        ],
        "answer": 0,
        "explanation": "In a RAID 5 array, data and distributed parity are striped across all member disks. The usable capacity formula is (N - 1) x Disk Size, where N is the total number of identical drives. For four 4 TB drives: (4 - 1) x 4 TB = 12 TB of usable capacity. The equivalent capacity of one drive is consumed by distributed parity, allowing the array to survive the failure of exactly 1 drive without data loss.",
        "distractor_analysis": {
            "1": "16 TB (N x Disk Size) is the raw capacity of RAID 0, which offers 0 drive fault tolerance.",
            "2": "8 TB is the usable capacity of RAID 6 (N - 2) or RAID 10 (N / 2) with four 4 TB drives.",
            "3": "4 TB usable represents triple-mirroring, not RAID 5."
        },
        "tags": ["hardware", "storage", "raid", "raid5", "capacity-calculation"]
    },
    {
        "id": "C1-248",
        "objective": "3.4",
        "type": "single",
        "difficulty": "medium",
        "question": "Which RAID configuration combines disk mirroring and disk striping (a stripe of mirrored pairs) across a minimum of four physical drives, delivering both high I/O performance and redundancy?",
        "options": [
            "RAID 10 (RAID 1+0)",
            "RAID 0 (Disk Striping)",
            "RAID 1 (Disk Mirroring)",
            "RAID 5 (Striping with Parity)"
        ],
        "answer": 0,
        "explanation": "RAID 10 (or RAID 1+0, Striped Mirrors) stripes data across mirrored pairs of disks. It requires a minimum of four drives and provides both the high read/write performance of RAID 0 and the redundancy of RAID 1 (capable of surviving at least one drive failure in each mirrored pair, and up to two non-paired drive failures). RAID 0 has no redundancy, RAID 1 uses 2 drives, and RAID 5 uses single parity.",
        "distractor_analysis": {
            "1": "RAID 0 is pure striping with zero redundancy; the loss of any single disk destroys all volume data.",
            "2": "RAID 1 is pure mirroring across two disks without striped array performance scaling.",
            "3": "RAID 5 uses distributed parity across three or more disks, incurring parity calculation write overhead."
        },
        "tags": ["hardware", "storage", "raid", "raid10", "striping", "mirroring"]
    },
    {
        "id": "C1-249",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "When installing an M.2 solid-state drive, which bus interface and protocol allows the drive to communicate directly with the processor across high-speed PCIe lanes with minimal latency?",
        "options": [
            "Non-Volatile Memory Express (NVMe) over PCI Express (PCIe)",
            "SATA Revision 3.0 over AHCI controller",
            "Universal Serial Bus 3.2 Gen 2 over xHCI",
            "Legacy Parallel ATA over IDE channel"
        ],
        "answer": 0,
        "explanation": "NVMe (Non-Volatile Memory Express) M.2 SSDs connect directly to CPU or chipset PCIe lanes (e.g., PCIe 4.0 x4), providing direct register access, thousands of parallel queues, and multi-gigabyte throughput. SATA M.2 drives use legacy AHCI capped at 600 MB/s, USB is an external bus, and PATA is legacy ribbon cable.",
        "distractor_analysis": {
            "1": "SATA III M.2 drives use the AHCI protocol limited to 6 Gbps (~600 MB/s) bandwidth over SATA controllers.",
            "2": "USB 3.2 Gen 2 connects external peripherals up to 10 Gbps, not internal direct PCIe storage buses.",
            "3": "Parallel ATA is an obsolete legacy storage interface limited to 133 MB/s."
        },
        "tags": ["hardware", "storage", "nvme", "m2", "pcie"]
    },
    {
        "id": "C1-250",
        "objective": "3.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A server rack power supply unit carries an 80 PLUS Titanium efficiency certification. Compared to 80 PLUS Bronze or Gold ratings, what operational benefit does this high rating provide in a datacenter environment?",
        "options": [
            "It delivers 90% to 96% electrical energy efficiency across all load levels, drastically reducing wasted heat and datacenter cooling power consumption",
            "It allows the server to operate without any internal cooling fans",
            "It generates high-voltage DC power to eliminate AC power feeds entirely",
            "It doubles the physical memory bandwidth of the CPU memory controller"
        ],
        "answer": 0,
        "explanation": "The 80 PLUS Titanium certification is the highest energy efficiency tier, requiring 90% efficiency at 10% load, 92% at 20% load, 94% at 50% load, and 90% at 100% load on 115V (and up to 96% on 230V datacenter circuits). High efficiency minimizes electrical energy wasted as heat, significantly lowering server room air conditioning load and electrical operational costs.",
        "distractor_analysis": {
            "1": "High-efficiency PSUs still require internal cooling fans to dissipate residual heat, especially in dense 1U/2U rack servers.",
            "2": "80 PLUS Titanium PSUs take standard AC mains power and rectify it to +12V DC, not generating external high-voltage DC.",
            "3": "Power supply efficiency measures electrical conversion loss; it has no effect on motherboard RAM bus bandwidth."
        },
        "tags": ["hardware", "power", "80-plus", "titanium", "datacenter", "efficiency"]
    }
]
