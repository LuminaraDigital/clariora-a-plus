#!/usr/bin/env python3
"""Part 2 of fixed Core 1 questions: C1-051 to C1-100."""

PART2_QUESTIONS = [
    {
        "id": "C1-051",
        "objective": "3.4",
        "type": "single",
        "difficulty": "medium",
        "question": "In a software RAID implementation, which system components handle array management, stripe calculations, and parity operations?",
        "options": [
            "A dedicated PCIe hardware RAID controller card",
            "The motherboard chipset hardware RAID controller",
            "The host operating system kernel and system CPU",
            "The onboard microcontrollers inside the individual drives"
        ],
        "answer": 2,
        "explanation": "Software RAID relies directly on the host operating system kernel (such as Windows Storage Spaces or Linux mdadm) and the system CPU to process drive striping, mirroring, and parity calculations without requiring a specialized hardware controller. Dedicated expansion cards and motherboard chipset RAID are forms of hardware/firmware RAID, and storage drives lack built-in array management.",
        "distractor_analysis": {
            "0": "Dedicated PCIe RAID expansion cards perform hardware RAID using onboard cache and dedicated ASIC processors, offloading the CPU.",
            "1": "Motherboard chipset RAID is firmware-based hardware RAID managed at the BIOS/UEFI level before OS boot.",
            "3": "Individual hard drives have internal disk controllers for motor and head timing, not multi-drive array management engines."
        },
        "tags": ["hardware", "storage", "raid", "software-raid"]
    },
    {
        "id": "C1-052",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which dedicated physical security microchip on a motherboard securely stores encryption keys for full-disk encryption technologies such as Microsoft BitLocker?",
        "options": [
            "Trusted Platform Module (TPM)",
            "Master Boot Record (MBR)",
            "System Management Controller (SMC)",
            "Real-Time Clock (RTC)"
        ],
        "answer": 0,
        "explanation": "A Trusted Platform Module (TPM) is a dedicated cryptographic hardware chip on the motherboard that securely stores BitLocker volume encryption keys, platform integrity measurements, and certificates. MBR is a legacy partition table format, SMC is an Apple power/thermal controller, and RTC is the system clock.",
        "distractor_analysis": {
            "1": "The Master Boot Record (MBR) is the first sector of a partitioned storage drive that contains partition tables and boot code, not a crypto chip.",
            "2": "The System Management Controller (SMC) is a microcontroller on older Mac hardware that manages power and fans, not a TPM cryptographic chip.",
            "3": "The Real-Time Clock (RTC) maintains current date and time on the motherboard, lacking cryptographic storage capabilities."
        },
        "tags": ["hardware", "tpm", "security", "bitlocker"]
    },
    {
        "id": "C1-053",
        "objective": "5.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following symptoms is most commonly caused by corrupt operating system boot files or a damaged system registry during startup?",
        "options": [
            "Continuous system reboot loop (boot loop) or kernel panic before reaching the desktop",
            "Loud physical metallic clicking and grinding sounds coming from the drive chassis",
            "The system BIOS automatically changing its hardware boot device order priority",
            "A sudden decrease in physical cooling fan rotational speed"
        ],
        "answer": 0,
        "explanation": "When critical operating system kernel files, driver binaries, or system registry hives become corrupted, the OS fails to initialize and triggers a blue screen / kernel panic, causing the computer to enter a continuous reboot loop. Loud clicking indicates physical mechanical hard drive head failure. BIOS boot order is stored in NVRAM/CMOS. Fan speed is managed by motherboard thermal sensors.",
        "distractor_analysis": {
            "1": "Loud clicking (the 'click of death') indicates a severe mechanical actuator arm or spindle motor failure inside a physical hard drive.",
            "2": "UEFI/BIOS boot order is controlled by motherboard firmware settings, which do not spontaneously change due to corrupted OS files.",
            "3": "Cooling fan RPM is regulated by hardware PWM controllers based on thermal sensor readings, not OS file corruption."
        },
        "tags": ["troubleshooting", "os", "boot-loop", "hardware"]
    },
    {
        "id": "C1-054",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is NOT a standard USB transfer speed defined in official USB specifications?",
        "options": [
            "12 Mbps (USB 1.1 Full Speed)",
            "480 Mbps (USB 2.0 HighSpeed)",
            "5 Gbps (USB 3.2 Gen 1 SuperSpeed)",
            "1.1 Gbps transfer speed"
        ],
        "answer": 3,
        "explanation": "1.1 Gbps is a non-existent, fictitious specification. Standard USB specification speeds include 1.5 Mbps (Low Speed), 12 Mbps (Full Speed USB 1.1), 480 Mbps (HighSpeed USB 2.0), 5 Gbps (SuperSpeed USB 3.0 / 3.2 Gen 1), 10 Gbps (SuperSpeed+ USB 3.2 Gen 2), 20 Gbps (USB 3.2 Gen 2x2), and 40/80 Gbps (USB4).",
        "distractor_analysis": {
            "0": "12 Mbps is the official transfer rate for USB 1.1 Full Speed devices.",
            "1": "480 Mbps is the maximum theoretical signaling rate for USB 2.0 HighSpeed connections.",
            "2": "5 Gbps is the official transfer rate for USB 3.0 / USB 3.2 Gen 1 SuperSpeed."
        },
        "tags": ["hardware", "cables", "usb", "bandwidth"]
    },
    {
        "id": "C1-055",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "In a PC architecture, what dedicated motherboard hardware component manages communication between the CPU and all connected USB devices and root hubs?",
        "options": [
            "USB Host Controller (e.g., xHCI or EHCI)",
            "USB downstream peripheral Type-B port",
            "Dedicated hardware GPU frame buffer",
            "Analog audio Digital-to-Analog Converter (DAC)"
        ],
        "answer": 0,
        "explanation": "The USB Host Controller (such as xHCI for USB 3.x/4 or EHCI for USB 2.0) is the hardware engine inside the chipset or CPU that interfaces between the system bus and USB root hubs, managing packet scheduling, bandwidth allocation, and device communication. A Type-B port is a physical socket on peripherals, a GPU frame buffer holds display frames, and a DAC processes audio.",
        "distractor_analysis": {
            "1": "A USB Type-B port is a physical connector located on downstream peripheral devices like printers, not a motherboard controller.",
            "2": "A GPU frame buffer is specialized video memory holding raster images for display output.",
            "3": "An audio DAC converts digital sound streams to analog signals for speakers and headphones."
        },
        "tags": ["hardware", "usb", "controllers", "architecture"]
    },
    {
        "id": "C1-056",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "When connecting standard modern USB peripherals (such as USB mice, keyboards, and flash drives) to a Windows 11 PC, why do they function immediately without manual installation media?",
        "options": [
            "Windows includes pre-installed generic inbox class drivers (HID, Mass Storage)",
            "Every USB device contains a hardware TPM security processor",
            "USB cables use fiber-optic laser signaling to bypass device drivers",
            "The system motherboard flashes its BIOS firmware automatically"
        ],
        "answer": 0,
        "explanation": "Modern operating systems like Windows include extensive libraries of native 'inbox' class drivers (e.g., USB Human Interface Device/HID, USB Mass Storage, and USB Audio) that automatically recognize standard compliant USB devices and bind drivers without requiring external vendor media. USB devices do not require TPMs, use standard copper wiring, and do not trigger BIOS flashes.",
        "distractor_analysis": {
            "1": "TPM microchips are security processors on motherboards, not hardware required inside basic USB mice and keyboards.",
            "2": "Standard USB peripherals use copper wires for electrical signaling and DC power, requiring OS software drivers.",
            "3": "Connecting a USB peripheral does not re-flash motherboard BIOS firmware."
        },
        "tags": ["hardware", "usb", "drivers", "plug-and-play"]
    },
    {
        "id": "C1-057",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is NOT a standard maximum bandwidth specification for any generation of the Thunderbolt interface?",
        "options": [
            "10 Gbps (Thunderbolt 1)",
            "20 Gbps (Thunderbolt 2)",
            "40 Gbps (Thunderbolt 3 and Thunderbolt 4)",
            "30 Gbps transfer speed"
        ],
        "answer": 3,
        "explanation": "30 Gbps is not a valid Thunderbolt specification speed. Thunderbolt 1 supports 10 Gbps per channel (20 Gbps total), Thunderbolt 2 aggregates channels to 20 Gbps, Thunderbolt 3 and Thunderbolt 4 support 40 Gbps bidirectional bandwidth, and Thunderbolt 5 supports up to 80/120 Gbps.",
        "distractor_analysis": {
            "0": "10 Gbps is the native per-channel data rate of Thunderbolt 1.",
            "1": "20 Gbps is the aggregated bidirectional bandwidth of Thunderbolt 2.",
            "2": "40 Gbps is the standard certified bandwidth of Thunderbolt 3 and Thunderbolt 4."
        },
        "tags": ["hardware", "cables", "thunderbolt", "bandwidth"]
    },
    {
        "id": "C1-058",
        "objective": "3.4",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the standard audio and data capacity of a standard 700 MB Compact Disc (CD-ROM)?",
        "options": [
            "80 minutes of uncompressed audio (or 700 MB data)",
            "4.7 gigabytes of uncompressed audio",
            "25 gigabytes of high-definition video",
            "120 minutes of dual-layer DVD video"
        ],
        "answer": 0,
        "explanation": "Standard Compact Discs (CD-ROM/CD-R) have a standard capacity of 700 MB of data or 80 minutes of uncompressed Red Book audio (early CDs were 650 MB / 74 minutes). 4.7 GB is the capacity of a single-layer DVD, 25 GB is a single-layer Blu-ray Disc, and 120 minutes / 8.5 GB is a dual-layer DVD.",
        "distractor_analysis": {
            "1": "4.7 GB is the storage capacity of a standard single-layer DVD-ROM, not a CD.",
            "2": "25 GB is the storage capacity of a standard single-layer Blu-ray disc (BD-ROM).",
            "3": "8.5 GB / dual-layer storage is characteristic of DVD-9 (DVD-R DL) media."
        },
        "tags": ["hardware", "storage", "optical", "cd-rom"]
    },
    {
        "id": "C1-059",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "In personal computing and workstation terminology, peripheral devices are categorized based on their functional data flow into which two primary classifications?",
        "options": [
            "Input devices and output devices",
            "Static devices and dynamic devices",
            "Analog modulators and digital demodulators",
            "Primary storage and secondary cache"
        ],
        "answer": 0,
        "explanation": "Peripheral devices are broadly categorized by data direction: Input devices (keyboards, mice, scanners, microphones, cameras) send data into the computer, while Output devices (monitors, printers, speakers) present data from the computer to the external environment. Some peripherals (touchscreens, multi-function printers) are hybrid input/output devices.",
        "distractor_analysis": {
            "1": "'Static and dynamic' are electronic circuit classifications (such as SRAM vs DRAM), not peripheral categories.",
            "2": "Modulators and demodulators are signal conversion components inside modems.",
            "3": "Primary storage and secondary cache refer to RAM and CPU cache memory hierarchies."
        },
        "tags": ["hardware", "peripherals", "input-output"]
    },
    {
        "id": "C1-060",
        "objective": "3.1",
        "type": "single",
        "difficulty": "easy",
        "question": "During a remote collaboration conference, a presenter broadcasts their active desktop workspace in real time to all remote participants. What technology enables this feature?",
        "options": [
            "Real-time screen sharing / desktop presentation",
            "DisplayPort Multi-Stream Transport daisy-chaining",
            "Dynamic Domain Name System record registration",
            "Hardware Overclocking Voltage Stepping"
        ],
        "answer": 0,
        "explanation": "Screen sharing (remote desktop broadcasting) captures the graphical frame buffer of the presenter's operating system, compresses the video stream, and transmits it across the network to videoconferencing clients in real time. DisplayPort MST is a physical monitor cable standard, DDNS is a DNS record mapping tool, and voltage stepping regulates CPU power.",
        "distractor_analysis": {
            "1": "DisplayPort MST is a hardware standard for chaining multiple physical monitors to a single DisplayPort output, not software remote streaming.",
            "2": "DDNS automatically updates DNS hostname records when an IP address changes.",
            "3": "Voltage stepping alters CPU core voltage to regulate clock speed and power consumption."
        },
        "tags": ["hardware", "display", "collaboration", "software"]
    },
    {
        "id": "C1-061",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Modern high-performance discrete graphics processing units (GPUs) are installed into which type of motherboard expansion slot to provide maximum bandwidth to the CPU and RAM?",
        "options": [
            "PCIe x16 slot",
            "Legacy 32-bit PCI slot",
            "ATX 24-pin power socket",
            "SATA Revision 3.0 header"
        ],
        "answer": 0,
        "explanation": "Modern discrete graphics cards require high bandwidth and low latency, connecting to the primary PCIe x16 slot, which connects directly to the CPU's dedicated PCIe controller lanes. Legacy PCI slots provide inadequate bandwidth (133 MB/s), ATX sockets supply power to motherboards, and SATA headers connect storage drives.",
        "distractor_analysis": {
            "1": "Legacy 32-bit PCI is an obsolete parallel bus limited to 133 MB/s, completely unable to support modern 3D graphics bandwidth.",
            "2": "The ATX 24-pin power socket delivers electrical power from the PSU to the motherboard, not a data expansion slot.",
            "3": "SATA headers connect storage drives (HDDs/SSDs) and cannot accept graphics expansion cards."
        },
        "tags": ["hardware", "gpu", "pcie", "expansion-cards"]
    },
    {
        "id": "C1-062",
        "objective": "3.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following display illumination technologies is used as a backlight source for standard modern Liquid Crystal Display (LCD) computer monitors?",
        "options": [
            "Light-Emitting Diode (LED) arrays",
            "Organic Light-Emitting Diode (OLED) self-emissive pixels",
            "Incandescent halogen reflector bulbs",
            "Cathode Ray Tube (CRT) electron guns"
        ],
        "answer": 0,
        "explanation": "Modern LCD monitors use Light-Emitting Diodes (LEDs) arranged either along the edges (edge-lit) or in a grid behind the panel (direct/full-array LED) as their backlight light source. In contrast, OLED displays are self-emissive (each pixel produces its own light without any separate backlight), halogen bulbs are for projectors, and CRTs use electron guns.",
        "distractor_analysis": {
            "1": "OLED panels are self-emissive displays where individual organic diodes emit light directly; they do not use a separate backlight panel.",
            "2": "Incandescent halogen bulbs are high-heat lamps used in commercial stage lighting and overhead projectors.",
            "3": "CRT electron guns fire electron beams at a phosphorescent glass screen, an obsolete pre-flat-panel display technology."
        },
        "tags": ["hardware", "display", "led", "lcd", "backlight"]
    },
    {
        "id": "C1-063",
        "objective": "3.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which video projection technology utilizes a semiconductor Digital Micromirror Device (DMD) containing millions of microscopic tilting aluminum mirrors to project images?",
        "options": [
            "Digital Light Processing (DLP)",
            "Liquid Crystal on Silicon (LCoS)",
            "Cold Cathode Fluorescent Lamp (CCFL)",
            "Active Matrix Organic LED (AMOLED)"
        ],
        "answer": 0,
        "explanation": "Digital Light Processing (DLP), originally developed by Texas Instruments, uses a Digital Micromirror Device (DMD) optical semiconductor chip containing millions of microscopic hinged mirrors that tilt rapidly toward or away from a light source through a spinning color wheel to project crisp images. CCFL is a fluorescent backlight tube, and AMOLED is a flat-panel display.",
        "distractor_analysis": {
            "1": "LCoS uses liquid crystals applied on a reflective silicon backplane without mechanical tilting micromirrors.",
            "2": "CCFL is a legacy glass fluorescent tube used to backlight older LCD monitors.",
            "3": "AMOLED is a solid-state active-matrix organic LED display panel used in smartphones and premium televisions."
        },
        "tags": ["hardware", "display", "projectors", "dlp"]
    },
    {
        "id": "C1-064",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "What term describes a microprocessor package that integrates both the Central Processing Unit (CPU) cores and a Graphics Processing Unit (GPU) onto a single silicon die?",
        "options": [
            "Accelerated Processing Unit (APU) / Integrated Graphics Processor",
            "Video Graphics Array (VGA) analog transceiver",
            "High-Definition Multimedia Interface (HDMI) decoder",
            "Digital Visual Interface (DVI) multiplexer"
        ],
        "answer": 0,
        "explanation": "An Accelerated Processing Unit (APU, AMD's branding) or CPU with Integrated Graphics (Intel HD/UHD/Iris Graphics) integrates both the central processor cores and graphics execution units onto the same physical silicon die. VGA, HDMI, and DVI are external video connector and cabling standards.",
        "distractor_analysis": {
            "1": "VGA is an analog 15-pin video connector standard dating back to 1987, not a combined CPU/GPU processor.",
            "2": "HDMI is a proprietary digital audio/video interface standard for connecting displays and audiovisual equipment.",
            "3": "DVI is a digital display interface standard, not an integrated processor architecture."
        },
        "tags": ["hardware", "cpu", "gpu", "apu", "integrated-graphics"]
    },
    {
        "id": "C1-065",
        "objective": "3.1",
        "type": "single",
        "difficulty": "medium",
        "question": "After physically installing a new discrete PCIe graphics card and connecting the monitor, which of the following is NOT a valid operating system configuration step performed in Windows?",
        "options": [
            "Manually adjusting PCIe motherboard electrical wattage in Windows Display Settings",
            "Installing the latest OEM manufacturer graphics device drivers",
            "Setting the desktop display resolution to the monitor native resolution",
            "Configuring multi-monitor layout and display refresh rate in Windows"
        ],
        "answer": 0,
        "explanation": "PCIe slot electrical wattage delivery (+12V and +3.3V up to 75W from the slot) is governed by physical hardware electrical design and ATX power specifications; it cannot be manually adjusted through Windows Display Settings. Installing vendor graphics drivers, configuring native resolution, and setting refresh rates are standard post-installation procedures.",
        "distractor_analysis": {
            "1": "Installing manufacturer drivers is essential to enable hardware 3D acceleration, CUDA/OpenCL support, and control panel features.",
            "2": "Configuring the display to its native resolution ensures the sharpest possible image without scaling artifacts.",
            "3": "Adjusting monitor arrangement, scaling, and refresh rate in Windows Display Settings is standard for optimal viewing."
        },
        "tags": ["hardware", "gpu", "display", "windows", "troubleshooting"]
    },
    {
        "id": "C1-066",
        "objective": "5.3",
        "type": "single",
        "difficulty": "easy",
        "question": "When configuring a ceiling-mounted optical projector that displays a distorted, trapezoidal image because the projector is angled relative to the screen, which setting adjusts the image geometry back to a rectangle?",
        "options": [
            "Keystone correction",
            "Optical threading",
            "CRT degaussing coil",
            "Color temperature Kelvin calibration"
        ],
        "answer": 0,
        "explanation": "Keystone correction digitally or optically adjusts the trapezoidal distortion that occurs when a projector lens is tilted at an angle relative to the flat projection surface, squaring the projected image into a true rectangle. Optical threading is a fictitious term, degaussing is for CRT monitors, and color temperature adjusts white balance.",
        "distractor_analysis": {
            "1": "Optical threading is a made-up term that has no meaning in video projector configuration.",
            "2": "Degaussing eliminates stray magnetic fields from cathode ray tube (CRT) glass monitors, not used in digital projectors.",
            "3": "Color temperature adjusts the warmth or coolness of white tones on screen, but does not alter geometric image trapezoid distortion."
        },
        "tags": ["troubleshooting", "display", "projectors", "keystone"]
    },
    {
        "id": "C1-067",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "In a standard IEEE 802.3 Ethernet frame, which trailing field contains a 32-bit cyclic redundancy check (CRC) checksum used by the receiver to detect bit errors during transmission?",
        "options": [
            "Frame Check Sequence (FCS)",
            "Destination MAC address",
            "EtherType / Length field",
            "Preamble and Start Frame Delimiter (SFD)"
        ],
        "answer": 0,
        "explanation": "The Frame Check Sequence (FCS) is the 4-byte (32-bit) field located at the very end of an Ethernet frame. It contains a Cyclic Redundancy Check (CRC) value calculated by the transmitting station; the receiver calculates its own CRC on the received frame and drops the frame if the values do not match. Destination MAC is at the start of the header, EtherType identifies the Layer 3 protocol, and the Preamble synchronizes clock timing.",
        "distractor_analysis": {
            "1": "The Destination MAC address is the first 6-byte addressing field located at the start of the Ethernet header.",
            "2": "The EtherType field indicates the encapsulated Layer 3 protocol (e.g., 0x0800 for IPv4) within the payload.",
            "3": "The Preamble is a 7-byte pattern of alternating 1s and 0s at the start of the frame used for physical layer clock synchronization."
        },
        "tags": ["networking", "ethernet", "frames", "fcs", "crc"]
    },
    {
        "id": "C1-068",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "How many total bits make up a standard IEEE 802 Layer 2 Media Access Control (MAC) physical address?",
        "options": [
            "48 bits (6 bytes, typically written as 12 hexadecimal digits)",
            "32 bits (4 bytes, formatted in dotted decimal)",
            "64 bits (8 bytes, formatted in binary chunks)",
            "128 bits (16 bytes, formatted in hexadecimal hextets)"
        ],
        "answer": 0,
        "explanation": "A MAC address is a 48-bit (6-byte) physical hardware address burned into the network interface card (NIC). The first 24 bits represent the Organizationally Unique Identifier (OUI) assigned to the manufacturer, and the remaining 24 bits represent the unique device serial number. 32 bits is an IPv4 address, and 128 bits is an IPv6 address.",
        "distractor_analysis": {
            "1": "32 bits is the length of an Internet Protocol version 4 (IPv4) logical address.",
            "2": "64 bits is the length of an IPv6 interface identifier (EUI-64) or 64-bit CPU register.",
            "3": "128 bits is the total length of an Internet Protocol version 6 (IPv6) address."
        },
        "tags": ["networking", "mac-address", "layer-2", "addressing"]
    },
    {
        "id": "C1-069",
        "objective": "2.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which legacy Layer 1 network device operates as a multiport repeater, blindly repeating electrical signals received on one port out to all other connected ports and creating a single shared collision domain?",
        "options": [
            "Legacy Network Hub",
            "Managed Layer 2 Switch",
            "Layer 3 Network Router",
            "Hardware Load Balancer"
        ],
        "answer": 0,
        "explanation": "A legacy network hub operates at Layer 1 (Physical layer) without inspecting MAC addresses or frame contents. Any electrical signal received on one port is broadcast out to every other port, creating a single shared collision domain and causing frequent packet collisions under load. Switches isolate collision domains using MAC tables, routers segment broadcast domains, and load balancers distribute application traffic.",
        "distractor_analysis": {
            "1": "A switch operates at Layer 2, maintaining a MAC address table to forward frames only to the specific port connected to the destination device.",
            "2": "A router operates at Layer 3, forwarding packets between different subnets based on IP routing tables.",
            "3": "A load balancer distributes incoming network traffic across multiple backend servers based on application health and performance metrics."
        },
        "tags": ["networking", "devices", "hub", "switch", "collision-domain"]
    },
    {
        "id": "C1-070",
        "objective": "2.5",
        "type": "single",
        "difficulty": "medium",
        "question": "How does a Layer 2 Ethernet switch dynamically build and maintain its MAC address forwarding table (CAM table)?",
        "options": [
            "It inspects the source MAC address of incoming frames on each port and maps them to that port",
            "It broadcasts continuous ARP queries to every connected host every five seconds",
            "An administrator must manually enter every workstation MAC address via the CLI console",
            "It queries the local DNS server database to resolve IP addresses to physical ports"
        ],
        "answer": 0,
        "explanation": "A Layer 2 switch dynamically builds its Content Addressable Memory (CAM / MAC address) table by examining the source MAC address of every incoming frame received on each physical switch port. It records the MAC address and associating port with a timestamp, allowing future frames destined for that MAC to be forwarded directly out that specific port rather than flooded. Manual entry is for static MACs, and DNS resolves hostnames, not switch ports.",
        "distractor_analysis": {
            "1": "Switches do not broadcast ARP queries to build MAC tables; host computers send ARP requests to resolve IP-to-MAC mappings.",
            "2": "While static MAC entries can be configured, switches learn MAC addresses automatically and dynamically without manual configuration.",
            "3": "DNS servers translate domain names into IP addresses and have no communication with Layer 2 switch CAM tables."
        },
        "tags": ["networking", "switch", "mac-table", "cam-table", "layer-2"]
    },
    {
        "id": "C1-071",
        "objective": "2.6",
        "type": "single",
        "difficulty": "easy",
        "question": "At Layer 3 of the OSI model, how are individual network interfaces and subnets uniquely identified across a Wide Area Network (WAN)?",
        "options": [
            "Logical IP addresses (IPv4 / IPv6)",
            "Physical Layer 2 MAC hardware addresses",
            "Motherboard BIOS UUID identifiers",
            "Storage volume Serial Attached SCSI LUNs"
        ],
        "answer": 0,
        "explanation": "At Layer 3 (Network layer), devices and networks are identified by logical IP addresses (IPv4 and IPv6), which allow routers to forward packets across Wide Area Networks (WANs) and the Internet. MAC addresses operate at Layer 2 within local broadcast domains, BIOS UUIDs identify computer motherboards, and SCSI LUNs identify SAN storage volumes.",
        "distractor_analysis": {
            "1": "MAC addresses are physical Layer 2 hardware identifiers that do not traverse routers or route across WAN boundaries.",
            "2": "BIOS UUIDs are unique hardware identifiers used by system management tools, not routable network addresses.",
            "3": "SCSI LUNs are logical unit numbers identifying block storage partitions in a SAN array."
        },
        "tags": ["networking", "ip-addressing", "layer-3", "wan"]
    },
    {
        "id": "C1-072",
        "objective": "2.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which dedicated network device operates at Layer 3 to route data packets between different IP subnets and separate broadcast domains?",
        "options": [
            "Network Router",
            "Unmanaged Ethernet Switch",
            "Layer 1 Repeater / Hub",
            "Patch Panel"
        ],
        "answer": 0,
        "explanation": "A router is a Layer 3 network device that maintains routing tables to forward IP packets between distinct logical networks (subnets) and separate broadcast domains. Layer 2 switches forward traffic within a local broadcast domain, repeaters/hubs amplify electrical signals at Layer 1, and patch panels are passive cable termination fixtures.",
        "distractor_analysis": {
            "1": "An unmanaged switch forwards frames within a single local broadcast domain based on MAC addresses, unable to route across IP subnets.",
            "2": "A repeater/hub operates at Layer 1 to regenerate physical electrical signals without understanding IP addresses or routing.",
            "3": "A patch panel is a passive hardware assembly containing RJ-45 jacks used for structured cable termination."
        },
        "tags": ["networking", "devices", "router", "layer-3"]
    },
    {
        "id": "C1-073",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "Which term describes a fire-safety rating for network cable jackets that produce low smoke and non-toxic fumes when burning, allowing installation in building air-handling spaces?",
        "options": [
            "Plenum-rated (CMP) cabling",
            "Unshielded Twisted Pair (UTP)",
            "Shielded Twisted Pair (STP)",
            "Coaxial RG-6 cabling"
        ],
        "answer": 0,
        "explanation": "Plenum-rated (CMP) cabling is coated with a specialized fire-retardant jacket (such as FEP or low-smoke PVC) designed to resist fire and emit minimal smoke and non-toxic fumes when exposed to flame, making it mandatory by building fire codes for use in plenum air-handling spaces (dropped ceilings and raised floors). UTP, STP, and coax are physical cable constructions, not fire safety ratings.",
        "distractor_analysis": {
            "1": "UTP describes the internal twisted copper pair construction lacking foil shielding, which can be jacketed in either PVC or plenum materials.",
            "2": "STP describes twisted pair cable with braided or foil shielding against electromagnetic interference, regardless of its jacket fire rating.",
            "3": "Coaxial RG-6 describes a cylindrical copper cable with a center conductor, dielectric insulator, and braided shield."
        },
        "tags": ["hardware", "cabling", "plenum", "safety", "fire-rating"]
    },
    {
        "id": "C1-074",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary light source commonly used in short-to-medium distance Multimode Fiber (MMF) optical network transceivers (such as 1000BASE-SX)?",
        "options": [
            "Light-Emitting Diodes (LEDs) or Vertical-Cavity Surface-Emitting Lasers (VCSELs)",
            "High-power long-wavelength infrared laser diodes",
            "Incandescent tungsten-halogen filaments",
            "Ultraviolet gas discharge quartz tubes"
        ],
        "answer": 0,
        "explanation": "Multimode Fiber (MMF) optic cables feature a larger core diameter (50 or 62.5 microns) and typically utilize cost-effective LEDs or Vertical-Cavity Surface-Emitting Lasers (VCSELs) operating at 850 nm wavelengths for short-to-medium distance campus/datacenter runs. Long-wavelength single-mode lasers are used for long-haul Single-Mode Fiber (SMF), while incandescent bulbs and UV tubes cannot generate high-frequency optical network signals.",
        "distractor_analysis": {
            "1": "High-power long-wavelength (1310 nm / 1550 nm) lasers are used for Single-Mode Fiber (SMF) for long-haul telecommunication links.",
            "2": "Incandescent filaments produce diffuse, incoherent thermal light incapable of rapid modulation for digital optical networks.",
            "3": "Ultraviolet discharge tubes are used in sterilization and blacklights, completely unsuitable for fiber-optic communications."
        },
        "tags": ["hardware", "fiber", "multimode", "optics", "cabling"]
    },
    {
        "id": "C1-075",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "How many total individual insulated copper conductors (organized into color-coded twisted pairs) are present inside a standard Category 5e or Category 6 UTP Ethernet cable?",
        "options": [
            "8 individual conductors (4 twisted pairs)",
            "4 individual conductors (2 twisted pairs)",
            "6 individual conductors (3 twisted pairs)",
            "2 individual conductors (1 twisted pair)"
        ],
        "answer": 0,
        "explanation": "Standard Category 5e, 6, and 6a Unshielded Twisted Pair (UTP) Ethernet cables contain exactly 8 individual insulated copper wires arranged into 4 color-coded twisted pairs (Blue, Orange, Green, Brown and their striped white counterparts), terminating into an 8-position 8-contact (8P8C / RJ-45) connector.",
        "distractor_analysis": {
            "1": "4 conductors (2 pairs) was used in legacy 10BASE-T/100BASE-TX wiring or standard telephone lines, but modern Cat5e/6 cables physically contain all 8 conductors.",
            "2": "6 conductors is used in 3-pair telephone wiring (RJ-12/RJ-25), not standard Ethernet cables.",
            "3": "2 conductors (1 pair) is used in basic single-line POTS analog telephone circuits (RJ-11)."
        },
        "tags": ["hardware", "cabling", "utp", "twisted-pair", "cat6"]
    },
    {
        "id": "C1-076",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "A datacenter technician needs to locate and trace a specific unlabeled network drop from an office wall jack to the correct termination port on a high-density patch panel in the server room. Which tool should the technician use?",
        "options": [
            "Tone generator and probe (toner / fox and hound)",
            "Time-Domain Reflectometer (TDR)",
            "Cable crimper and wire stripper",
            "Punch-down tool with 110 blade"
        ],
        "answer": 0,
        "explanation": "A tone generator and probe (commonly known as a toner or 'fox and hound') is the standard tool for tracing and locating specific cables within a bundle: the generator injects an audible RF tone into the wire at the jack, and the inductive amplifier probe emits sound when placed near the corresponding cable end at the patch panel. A TDR measures distance to cable faults, crimpers attach connectors, and punch-down tools seat wires into terminal blocks.",
        "distractor_analysis": {
            "1": "A Time-Domain Reflectometer (TDR) measures cable impedance and pinpoints the exact distance to physical breaks or shorts, not tracing unlabeled runs.",
            "2": "A cable crimper physically crimps RJ-45 connector plugs onto copper cable ends, providing no diagnostic tracing function.",
            "3": "A punch-down tool pushes insulated wires into 110 or Krone punch-down blocks and cuts excess wire, used for installation rather than tracing."
        },
        "tags": ["networking", "tools", "toner", "probe", "troubleshooting"]
    },
    {
        "id": "C1-077",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "In structured cabling installations, where is solid-core twisted-pair copper cable primarily deployed rather than stranded-core cable?",
        "options": [
            "Permanent horizontal cable runs inside walls, conduits, and ceiling plenums",
            "Short flexible patch cables connecting workstations to wall outlets",
            "Patch cords connecting switches to patch panels inside rack cabinets",
            "Mobile laptop Ethernet adapter dongle leads"
        ],
        "answer": 0,
        "explanation": "Solid-core UTP cabling features a single solid copper wire per conductor, providing lower electrical attenuation and superior transmission over long distances (up to 90 meters for horizontal runs), but is rigid and vulnerable to breaking if repeatedly flexed. Therefore, solid-core cable is installed permanently inside walls and ceilings. Stranded-core cabling uses multiple tiny copper strands, offering extreme flexibility for patch cables that are moved and handled frequently.",
        "distractor_analysis": {
            "1": "Workstation patch cords use stranded-core copper because it withstands repeated bending, twisting, and physical movement without snapping.",
            "2": "Rack patch cords use flexible stranded-core cable to facilitate tight bends and easy cable management between patch panels and switches.",
            "3": "Mobile dongle leads require high mechanical flexibility, necessitating stranded-conductor wiring."
        },
        "tags": ["hardware", "cabling", "solid-core", "stranded", "structured-cabling"]
    },
    {
        "id": "C1-078",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "When inspecting the LED diagnostic link status indicator lights on a Gigabit Ethernet network adapter, which of the following is NOT typically indicated by the LEDs?",
        "options": [
            "Ethernet port duplex mode (Half-duplex vs Full-duplex)",
            "Physical Layer 1 link presence and carrier detection",
            "Negotiated link speed (e.g., 100 Mbps green vs 1000 Mbps amber)",
            "Real-time packet transmission and reception activity (flashing LED)"
        ],
        "answer": 0,
        "explanation": "Standard Ethernet NIC and switch port LEDs indicate Physical Link (solid LED), negotiated Link Speed (color variations such as amber for 100 Mbps or green for 1 Gbps), and Network Activity (flashing/blinking LED). Standard physical LEDs do not display duplex negotiation status (half vs full duplex), which must be checked via software diagnostic tools or switch CLI management consoles.",
        "distractor_analysis": {
            "1": "Link LEDs illuminate solid when an active electrical or optical carrier signal is detected between the NIC and the switch.",
            "2": "Speed LEDs use distinct colors (e.g., green for 1000 Mbps, amber for 100 Mbps) to visually display the negotiated link speed.",
            "3": "Activity LEDs flicker or pulse whenever data packets are transmitted or received across the physical interface."
        },
        "tags": ["networking", "hardware", "nic", "led", "diagnostics"]
    },
    {
        "id": "C1-079",
        "objective": "3.5",
        "type": "single",
        "difficulty": "easy",
        "question": "What type of specially formatted Layer 2 network broadcast frame triggers a network interface card to power on a sleeping or shut-down computer via Wake-on-LAN (WoL)?",
        "options": [
            "Magic packet (containing 6 bytes of 0xFF followed by 16 repetitions of the target MAC address)",
            "Encrypted IPsec tunnel key exchange handshake frame",
            "SNMP trap notification message over UDP port 162",
            "Spanning Tree Protocol (STP) Bridge Protocol Data Unit"
        ],
        "answer": 0,
        "explanation": "Wake-on-LAN (WoL) is triggered when the computer's network interface card (which remains in low-power standby listening mode) detects a 'magic packet'. A magic packet is a broadcast frame containing a synchronization stream of 6 bytes of 0xFF (FF:FF:FF:FF:FF:FF) followed immediately by 16 seamless repetitions of the target workstation's 48-bit MAC address. IPsec handshakes, SNMP traps, and STP BPDUs do not trigger WoL power circuits.",
        "distractor_analysis": {
            "1": "IPsec IKE handshakes establish encrypted VPN tunnels and do not contain the magic packet signature needed for hardware WoL.",
            "2": "SNMP traps are alert notifications sent by managed network devices to a management station, unrelated to hardware power-on.",
            "3": "STP BPDUs are frames exchanged between switches to prevent Layer 2 bridging loops."
        },
        "tags": ["hardware", "networking", "wake-on-lan", "bios", "mac"]
    },
    {
        "id": "C1-080",
        "objective": "2.6",
        "type": "single",
        "difficulty": "medium",
        "question": "In traditional IPv4 classful addressing, how many octets are dedicated to the network ID in a default Class A network (default subnet mask 255.0.0.0 /8)?",
        "options": [
            "1 octet for Network ID and 3 octets for Host IDs",
            "2 octets for Network ID and 2 octets for Host IDs",
            "3 octets for Network ID and 1 octet for Host IDs",
            "4 octets for Network ID and 0 octets for Host IDs"
        ],
        "answer": 0,
        "explanation": "In classful IPv4 addressing, a Class A network uses a default /8 mask (255.0.0.0), meaning the first 1 octet (8 bits) identifies the network ID, while the remaining 3 octets (24 bits) are allocated for host addresses (allowing over 16 million hosts per network). Class B allocates 2 octets for network and 2 for host (255.255.0.0 /16), and Class C allocates 3 octets for network and 1 for host (255.255.255.0 /24).",
        "distractor_analysis": {
            "1": "2 octets for network and 2 octets for hosts is the definition of a Class B IPv4 network (default mask 255.255.0.0 /16).",
            "2": "3 octets for network and 1 octet for hosts is the definition of a Class C IPv4 network (default mask 255.255.255.0 /24).",
            "3": "4 octets for network (255.255.255.255 /32) represents a single host route, not a routable Class A network block."
        },
        "tags": ["networking", "ipv4", "addressing", "subnetting", "classful"]
    },
    {
        "id": "C1-081",
        "objective": "2.6",
        "type": "single",
        "difficulty": "easy",
        "question": "What is the total bit length and address space size of an Internet Protocol version 6 (IPv6) address?",
        "options": [
            "128 bits (16 bytes, formatted as 8 groups of 4 hexadecimal characters)",
            "32 bits (4 bytes, formatted as 4 decimal octets)",
            "64 bits (8 bytes, formatted as 2 long words)",
            "256 bits (32 bytes, formatted as cryptographic hash strings)"
        ],
        "answer": 0,
        "explanation": "An IPv6 address is 128 bits in length, providing approximately 3.4 x 10^38 unique addresses to overcome the exhaustion of 32-bit IPv4 addresses (which provide ~4.3 billion addresses). IPv6 addresses are written in hexadecimal notation separated into eight 16-bit blocks (hextets) by colons.",
        "distractor_analysis": {
            "1": "32 bits is the length of an Internet Protocol version 4 (IPv4) address.",
            "2": "64 bits is the size of standard IPv6 interface identifiers (the host portion of a /64 subnet), not the full address.",
            "3": "256 bits is the hash digest size of SHA-256 cryptographic algorithms, not an IP address standard."
        },
        "tags": ["networking", "ipv6", "addressing", "specifications"]
    },
    {
        "id": "C1-082",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which standard transport protocol and TCP port number is utilized by Microsoft Server Message Block (SMB) for native network file sharing over IP?",
        "options": [
            "TCP port 445 (SMB over IP)",
            "TCP port 443 (HTTPS secure web)",
            "TCP port 143 (IMAP email)",
            "UDP port 67 (DHCP server)"
        ],
        "answer": 0,
        "explanation": "Microsoft Server Message Block (SMB) operates natively over TCP port 445 (SMB direct over IP) for file and printer sharing, named pipes, and RPC services in Windows and Samba environments. TCP port 443 is used for secure HTTPS web traffic, TCP port 143 is used for unencrypted IMAP email access, and UDP port 67 is used by DHCP servers.",
        "distractor_analysis": {
            "1": "TCP port 443 is the standard port for Hypertext Transfer Protocol Secure (HTTPS), which delivers encrypted web sessions.",
            "2": "TCP port 143 is used by the Internet Message Access Protocol (IMAP) for unencrypted email retrieval.",
            "3": "UDP port 67 is used by Dynamic Host Configuration Protocol (DHCP) servers to listen for client IP requests."
        },
        "tags": ["networking", "ports", "smb", "protocols"]
    },
    {
        "id": "C1-083",
        "objective": "2.4",
        "type": "single",
        "difficulty": "medium",
        "question": "According to Internet Engineering Task Force (IETF) standards (RFC 1035), what is the maximum total length of a Fully Qualified Domain Name (FQDN), including all domain labels and separating dots?",
        "options": [
            "255 characters (with a maximum of 63 characters per individual label)",
            "128 characters total",
            "512 characters total",
            "1024 characters total"
        ],
        "answer": 0,
        "explanation": "RFC 1035 specifies that a Fully Qualified Domain Name (FQDN) can have a maximum total length of 255 octets/characters (including all subdomains and separating dots), and each individual label between dots cannot exceed 63 characters. 128, 512, and 1024 characters are non-standard limits.",
        "distractor_analysis": {
            "1": "128 characters is less than the standard maximum limit defined by DNS specifications.",
            "2": "512 characters exceeds the standard maximum length permitted by DNS name server resolvers.",
            "3": "1024 characters is invalid; DNS binary packet wire formats allocate a maximum 1-byte length field (up to 255) for domain names."
        },
        "tags": ["networking", "dns", "fqdn", "standards"]
    },
    {
        "id": "C1-084",
        "objective": "2.5",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following network devices functions strictly as a wired Layer 2 packet-forwarding hardware appliance and does NOT contain integrated wireless radio transceivers?",
        "options": [
            "Dedicated 48-port rackmount Ethernet Switch",
            "Wireless Access Point (WAP)",
            "Enterprise smartphone",
            "Wi-Fi connected tablet"
        ],
        "answer": 0,
        "explanation": "A standard dedicated rackmount Ethernet switch is a hard-wired Layer 2 network device that connects client workstations, servers, and access points using copper twisted-pair or fiber-optic patch cables, lacking internal Wi-Fi radio antennas. WAPs, smartphones, and tablets all integrate 802.11 wireless radio transceivers.",
        "distractor_analysis": {
            "1": "A Wireless Access Point (WAP) is explicitly designed with Wi-Fi transceivers to bridge wireless client devices to the wired Ethernet LAN.",
            "2": "Smartphones contain integrated Wi-Fi, cellular, and Bluetooth radio chips.",
            "3": "Tablets integrate Wi-Fi and Bluetooth antennas to communicate over wireless networks."
        },
        "tags": ["networking", "devices", "switch", "wireless"]
    },
    {
        "id": "C1-085",
        "objective": "2.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which legacy IEEE 802.11 wireless networking standard was designed to operate exclusively in the 5 GHz radio frequency band, achieving maximum data rates up to 54 Mbps?",
        "options": [
            "IEEE 802.11a",
            "IEEE 802.11b",
            "IEEE 802.11g",
            "IEEE 802.11ax (Wi-Fi 6)"
        ],
        "answer": 0,
        "explanation": "IEEE 802.11a was released in 1999 and operates exclusively in the 5 GHz radio frequency spectrum using OFDM modulation, providing maximum theoretical bandwidth of 54 Mbps. IEEE 802.11b (11 Mbps) and 802.11g (54 Mbps) operate in the crowded 2.4 GHz band, while 802.11ax operates across 2.4 GHz, 5 GHz, and 6 GHz (Wi-Fi 6E).",
        "distractor_analysis": {
            "1": "IEEE 802.11b operates exclusively in the 2.4 GHz band with a maximum speed of 11 Mbps using DSSS modulation.",
            "2": "IEEE 802.11g operates in the 2.4 GHz band providing up to 54 Mbps, but is not a 5 GHz standard.",
            "3": "IEEE 802.11ax (Wi-Fi 6) is a modern multi-gigabit standard operating across 2.4 GHz, 5 GHz, and 6 GHz bands."
        },
        "tags": ["networking", "wireless", "802.11a", "5ghz"]
    },
    {
        "id": "C1-086",
        "objective": "2.2",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following statements is NOT true regarding consumer Wireless Mesh Networks (WMN) deployed in residential or small office environments?",
        "options": [
            "Wireless mesh networks are designed to replace complex multi-switch enterprise controllers in large enterprise datacenters",
            "Mesh networks consist of a primary gateway base station connected to the modem and one or more wireless satellite nodes",
            "Mesh satellite nodes automatically form dynamic self-healing wireless backhauls to relay client traffic",
            "Mesh systems provide seamless single-SSID wireless coverage across large homes and small offices"
        ],
        "answer": 0,
        "explanation": "Wireless mesh networks are designed for consumer residential and SOHO environments to eliminate Wi-Fi dead zones easily without running Ethernet cables. They lack the advanced VLAN trunking, multi-SSID RADIUS integration, and granular RF management required for large-scale enterprise campus/datacenter deployments. All other statements accurately describe mesh topology and self-healing backhaul capabilities.",
        "distractor_analysis": {
            "1": "Mesh networks indeed use a primary router node plugged into the WAN modem plus multiple satellite access points distributed throughout the premises.",
            "2": "Mesh nodes dynamically calculate optimal routing paths and self-heal by redirecting traffic if an intermediate node goes offline.",
            "3": "Mesh systems broadcast a single unified SSID across all nodes and support seamless client roaming protocols (802.11k/v/r)."
        },
        "tags": ["networking", "wireless", "mesh", "soho"]
    },
    {
        "id": "C1-087",
        "objective": "2.5",
        "type": "single",
        "difficulty": "easy",
        "question": "A network technician installs a commercial Wireless Access Point (WAP) mounted high on a hallway ceiling where no electrical AC power outlets exist. How is electrical power most commonly supplied to the access point?",
        "options": [
            "Power over Ethernet (PoE / 802.3af/at/bt) supplied through the Cat 6 network cable",
            "Replaceable 9V alkaline dry-cell batteries inside the mounting bracket",
            "A rooftop solar collector wired directly to the ceiling drop tile",
            "A high-frequency wireless microwave induction power beam"
        ],
        "answer": 0,
        "explanation": "Power over Ethernet (PoE, standardized as IEEE 802.3af, 802.3at PoE+, and 802.3bt PoE++) delivers low-voltage direct current (DC) electrical power alongside data packets over standard Cat 5e/6 twisted-pair cabling from a PoE-capable network switch or PoE power injector. Alkaline batteries require constant maintenance, solar panels cannot operate indoors, and microwave power beams are not commercial IT technologies.",
        "distractor_analysis": {
            "1": "Commercial enterprise access points draw continuous electrical power (15W to 30W+) and cannot operate on consumer alkaline dry-cell batteries.",
            "2": "Indoor ceiling mounts have no access to sunlight, making solar panels non-viable for powering commercial access points.",
            "3": "Microwave induction power beaming is experimental physics technology not deployed for standard networking equipment."
        },
        "tags": ["networking", "poe", "power", "cabling", "wap"]
    },
    {
        "id": "C1-088",
        "objective": "1.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following wireless technologies utilizes optical light waves rather than radio frequency (RF) electromagnetic waves to communicate between devices, requiring direct line-of-sight?",
        "options": [
            "Infrared (IR)",
            "Bluetooth (IEEE 802.15.1)",
            "Near Field Communication (NFC)",
            "Radio Frequency Identification (RFID)"
        ],
        "answer": 0,
        "explanation": "Infrared (IR) communication uses invisible optical light waves (in the 850 nm to 940 nm range) transmitted by an LED to an optical photodiode sensor, requiring direct line-of-sight and unable to penetrate walls or opaque objects. Bluetooth, NFC, and RFID are all radio-frequency (RF) technologies that use electromagnetic radio waves.",
        "distractor_analysis": {
            "1": "Bluetooth operates on 2.4 GHz ultra-high-frequency radio waves, which can penetrate walls and do not require optical line-of-sight.",
            "2": "Near Field Communication (NFC) uses high-frequency radio electromagnetic induction (13.56 MHz) over very short distances (a few centimeters).",
            "3": "RFID uses electromagnetic radio frequency fields to automatically identify and track tags attached to objects."
        },
        "tags": ["mobile", "wireless", "infrared", "rf"]
    },
    {
        "id": "C1-089",
        "objective": "5.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A user brings a laptop to a branch office and reports that the device cannot connect to the corporate Wi-Fi network, which was working yesterday. Other branch employees are connected and working normally. What is the most likely cause of this specific failure?",
        "options": [
            "The wireless network pre-shared key or SSID security profile on the WAP was updated, causing a profile mismatch on the laptop",
            "The building main internet fiber-optic gateway connection has completely failed",
            "The WAP internal antenna orientation shifted by two degrees",
            "The DHCP server ran out of IP addresses across the entire worldwide enterprise"
        ],
        "answer": 0,
        "explanation": "When an individual device suddenly fails to connect to a known wireless network while all other devices continue working normally, the most probable cause is a cached wireless profile mismatch (e.g., the network SSID passphrase, security type WPA2/WPA3, or certificate was changed, while the client is attempting to authenticate with old credentials). Deleting the saved wireless profile and reconnecting prompts for the new credentials. If the fiber gateway or global DHCP failed, all users would be impacted.",
        "distractor_analysis": {
            "1": "If the building internet fiber failed, all users in the branch office would experience internet loss, not just a single laptop.",
            "2": "A slight shift in antenna orientation might cause minor signal variance, but would not completely prevent network authentication.",
            "3": "A global DHCP failure would cause widespread IP configuration failures across all clients in the enterprise."
        },
        "tags": ["troubleshooting", "wireless", "ssid", "profiles"]
    },
    {
        "id": "C1-090",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "To allow client web browsers inside an enterprise LAN to access external public HTTP web servers, what traffic rule must the perimeter stateful firewall permit?",
        "options": [
            "Outbound traffic to destination TCP port 80 (HTTP) and TCP port 443 (HTTPS)",
            "Inbound traffic from external sources to destination TCP port 80 on local workstations",
            "Outbound traffic to destination TCP port 143 (IMAP)",
            "Inbound broadcast traffic on UDP port 67 (DHCP)"
        ],
        "answer": 0,
        "explanation": "Web clients initiate outgoing connections to remote web servers by sending packets to standard web ports: TCP port 80 (unencrypted HTTP) and TCP port 443 (encrypted HTTPS). Stateful firewalls inspect outbound requests and automatically allow returning response traffic. Allowing unsolicited inbound traffic to port 80 on internal workstations would create severe security vulnerabilities. Port 143 is for IMAP mail, and UDP 67 is for DHCP.",
        "distractor_analysis": {
            "1": "Inbound port 80 connections should only be permitted on public web servers, not on internal desktop client workstations.",
            "2": "TCP port 143 is used to retrieve email from IMAP mail servers, having no role in web browsing.",
            "3": "UDP port 67 handles local DHCP broadcast discovery within LANs and should never be routed across WAN firewall perimeters."
        },
        "tags": ["networking", "firewall", "security", "http", "https"]
    },
    {
        "id": "C1-091",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following port numbers is NOT associated with standard Internet email transmission or mailbox retrieval protocols?",
        "options": [
            "TCP port 443 (HTTPS secure web delivery)",
            "TCP port 25 (Simple Mail Transfer Protocol - SMTP)",
            "TCP port 110 (Post Office Protocol version 3 - POP3)",
            "TCP port 143 (Internet Message Access Protocol - IMAP)"
        ],
        "answer": 0,
        "explanation": "TCP port 443 is the standard port for Hypertext Transfer Protocol Secure (HTTPS), which provides encrypted web traffic, not a dedicated email protocol. Port 25 is used for SMTP (sending email between servers), Port 110 is for POP3 (retrieving email), and Port 143 is for IMAP (accessing/synchronizing email mailboxes).",
        "distractor_analysis": {
            "1": "TCP port 25 is the standard listening port for Simple Mail Transfer Protocol (SMTP) mail servers.",
            "2": "TCP port 110 is the default port for unencrypted Post Office Protocol (POP3) client mailbox retrieval.",
            "3": "TCP port 143 is the default port for unencrypted Internet Message Access Protocol (IMAP) mailbox synchronization."
        },
        "tags": ["networking", "ports", "email", "protocols"]
    },
    {
        "id": "C1-092",
        "objective": "2.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is a physical wired Ethernet standard rather than a low-power wireless communication protocol commonly used in Internet of Things (IoT) home and building automation?",
        "options": [
            "IEEE 802.3 1000BASE-T wired copper Ethernet",
            "Zigbee (IEEE 802.15.4 wireless mesh)",
            "Z-Wave (sub-1 GHz proprietary wireless mesh)",
            "Bluetooth Low Energy (BLE)"
        ],
        "answer": 0,
        "explanation": "IEEE 802.3 1000BASE-T is a wired Gigabit Ethernet standard utilizing 4-pair twisted copper cabling. In contrast, Zigbee, Z-Wave, and Bluetooth Low Energy (BLE) are wireless, low-power RF protocols specifically designed for battery-powered IoT smart home devices (sensors, smart locks, thermostats, lighting controls).",
        "distractor_analysis": {
            "1": "Zigbee is a low-power, low-data-rate wireless mesh network standard operating primarily at 2.4 GHz for smart home sensors.",
            "2": "Z-Wave is a proprietary wireless mesh technology operating in the 900 MHz ISM band designed for home automation.",
            "3": "Bluetooth Low Energy (BLE) is a power-conserving wireless protocol used extensively in portable IoT and wearable devices."
        },
        "tags": ["networking", "wireless", "iot", "zigbee", "zwave"]
    },
    {
        "id": "C1-093",
        "objective": "4.1",
        "type": "single",
        "difficulty": "easy",
        "question": "In hardware virtualization terminology, a virtual machine executing inside a hypervisor is called the _______ operating system, running on top of the underlying physical server known as the _______ system.",
        "options": [
            "Guest OS; Host system",
            "Host OS; Guest system",
            "Kernel space; User space",
            "Master node; Worker pod"
        ],
        "answer": 0,
        "explanation": "In virtualization, the virtualized instance running inside the VM environment is designated the 'Guest' operating system, while the physical server, hardware layer, and hypervisor providing physical resources is designated the 'Host' system. Kernel and user spaces are OS memory protection rings, and master/worker are container orchestration terms.",
        "distractor_analysis": {
            "1": "The terms are inverted; the host is the physical provider of hardware resources and the guest is the virtualized instance.",
            "2": "Kernel space and user space are memory isolation domains within an operating system kernel, not virtualization host/guest relationships.",
            "3": "Master nodes and worker pods are terminology from Kubernetes container cluster orchestration."
        },
        "tags": ["virtualization", "terminology", "guest", "host"]
    },
    {
        "id": "C1-094",
        "objective": "4.1",
        "type": "single",
        "difficulty": "easy",
        "question": "When provisioning a new virtual machine on a Type 2 hypervisor workstation, which physical component is NOT strictly required because it can be emulated using an ISO image file?",
        "options": [
            "Physical optical DVD/CD-ROM disc drive",
            "Hypervisor software layer",
            "Allocated virtual disk storage space",
            "Allocated virtual RAM from host physical memory"
        ],
        "answer": 0,
        "explanation": "Hypervisors support virtual optical drives that mount standard ISO image files directly from local storage, eliminating any requirement for a physical optical DVD/CD drive. However, a hypervisor, allocated virtual storage (VHD/VMDK), and physical host RAM are mandatory prerequisites to instantiate and run a virtual machine.",
        "distractor_analysis": {
            "1": "A hypervisor is the essential virtualization management layer required to allocate CPU and memory to guest VMs.",
            "2": "A virtual disk file (VHDX or VMDK) is required to provide block storage for the guest operating system file system.",
            "3": "Allocating virtual RAM backed by physical host memory is mandatory for the guest OS kernel and programs to execute."
        },
        "tags": ["virtualization", "vm", "iso", "hypervisor"]
    },
    {
        "id": "C1-095",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which of the following workloads is least suitable for deployment inside a standard virtual machine due to virtualization overhead and lack of direct bare-metal graphics hardware acceleration?",
        "options": [
            "High-end competitive 3D gaming requiring low-latency native GPU rendering",
            "Testing software updates and patches in an isolated sandbox",
            "Emulating multiple network topologies with virtual switches",
            "Hosting a legacy Windows XP application for accounting audits"
        ],
        "answer": 0,
        "explanation": "Virtual machines run through an abstraction layer where virtualized display adapters lack full native direct GPU pipeline throughput, making latency-sensitive high-performance 3D gaming poorly suited for standard VMs. Sandboxing, virtual networking labs, and running legacy OS environments are ideal, classic use cases for virtualization.",
        "distractor_analysis": {
            "1": "Sandboxing test environments is a primary benefit of virtualization, allowing non-destructive snapshot rollbacks if a patch fails.",
            "2": "Virtual networking allows complex multi-router and multi-switch topologies to be simulated without buying physical hardware.",
            "3": "Running legacy operating systems (like Windows XP or older Linux distros) allows critical legacy apps to run on modern hardware."
        },
        "tags": ["virtualization", "use-cases", "limitations", "performance"]
    },
    {
        "id": "C1-096",
        "objective": "4.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which of the following is NOT an official NIST-defined cloud deployment model?",
        "options": [
            "Corporate cloud",
            "Private cloud",
            "Public cloud",
            "Hybrid cloud"
        ],
        "answer": 0,
        "explanation": "The official NIST (National Institute of Standards and Technology) cloud computing standard defines exactly four cloud deployment models: Public cloud, Private cloud, Hybrid cloud, and Community cloud. 'Corporate cloud' is not a recognized NIST deployment model.",
        "distractor_analysis": {
            "1": "Private cloud is an official model provisioned for exclusive use by a single organization.",
            "2": "Public cloud is an official model provisioned for open use by the general public across multi-tenant infrastructure.",
            "3": "Hybrid cloud is an official model combining two or more distinct cloud infrastructures (private, community, or public) bound by standardized technology."
        },
        "tags": ["cloud", "nist", "deployment-models"]
    },
    {
        "id": "C1-097",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "When performing an internal hardware repair or component replacement on an enterprise laptop, what is the first safety and preparatory step a technician should perform?",
        "options": [
            "Disconnect external AC power, remove or disconnect the battery, and review the manufacturer service manual",
            "Place all removed screws of different lengths together into a single magnetic dish",
            "Use a metal flathead screwdriver to pry apart plastic chassis clips with maximum force",
            "Leave the laptop powered on in sleep mode so hardware changes can be detected instantly"
        ],
        "answer": 0,
        "explanation": "Safety procedures for laptop disassembly require disconnecting external AC power, removing or disconnecting the internal battery to prevent short circuits, and consulting the manufacturer service manual for proper teardown sequences. Mixing different length screws risks puncturing PCB traces (screw damage), prying with metal tools damages plastics, and working on an energized system risks electric shock and board destruction.",
        "distractor_analysis": {
            "1": "Laptops use screws of varying thread pitches and lengths; mixing them risks driving a long screw through the motherboard or palmrest during reassembly.",
            "2": "Metal screwdrivers gouge plastic chassis seams and scratch motherboard traces; specialized non-marring plastic spudgers should be used.",
            "3": "Working inside an energized laptop with the battery connected risks catastrophic short circuits from dropped screws or metallic tools."
        },
        "tags": ["mobile", "laptop", "safety", "disassembly"]
    },
    {
        "id": "C1-098",
        "objective": "1.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which best-practice documentation technique is most effective for ensuring an accurate and error-free reassembly of a complex laptop teardown?",
        "options": [
            "Take high-resolution digital photos and organize removed screws into labeled organizers at each disassembly step",
            "Replace all original screws with longer generic sheet-metal screws for tighter clamping",
            "Force plastic chassis seams together with mechanical clamps before inserting screws",
            "Discard internal EMI copper shielding tape to save weight and improve airflow"
        ],
        "answer": 0,
        "explanation": "Taking detailed digital photos at each step of disassembly and utilizing a partitioned, labeled screw organizer or magnetic grid mat ensures that cables are routed correctly, connectors are seated properly, and the exact screws are returned to their original threaded holes. Using longer screws destroys motherboards, forcing clips breaks tabs, and removing shielding invites electromagnetic interference.",
        "distractor_analysis": {
            "1": "Using longer replacement screws will penetrate through the motherboard or puncture the cosmetic top casing.",
            "2": "Forcing chassis halves with clamps will snap internal plastic alignment tabs and crack fragile mounting bosses.",
            "3": "Discarding internal metal shielding compromises electromagnetic interference (EMI) containment and thermal dissipation paths."
        },
        "tags": ["mobile", "laptop", "reassembly", "best-practices"]
    },
    {
        "id": "C1-099",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "On most modern thin-and-light corporate laptops, which internal component typically requires the most extensive disassembly, or may be permanently soldered directly to the motherboard?",
        "options": [
            "Central Processing Unit (CPU) / System-on-Chip (SoC)",
            "Removable battery pack",
            "M.2 NVMe solid-state drive",
            "Standard SO-DIMM RAM module"
        ],
        "answer": 0,
        "explanation": "In modern thin-and-light laptops, the CPU/SoC is permanently soldered to the motherboard using a Ball Grid Array (BGA) package, requiring a complete motherboard replacement (or deep teardown removing cooling pipes, fans, and display assemblies on older socketed units). In contrast, modular batteries, M.2 SSDs, and SO-DIMMs are easily accessible beneath the bottom cover.",
        "distractor_analysis": {
            "1": "Removable batteries can be released via external latches or accessed immediately upon removing the bottom chassis cover.",
            "2": "M.2 SSDs are typically held by a single retaining screw directly beneath the bottom maintenance hatch.",
            "3": "SO-DIMM RAM slots are usually accessible under the bottom access panel or immediately beneath the keyboard on older designs."
        },
        "tags": ["mobile", "laptop", "cpu", "bga", "motherboard"]
    },
    {
        "id": "C1-100",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Why is replacing or servicing an internal laptop LCD display assembly often more labor-intensive and challenging than servicing desktop monitors?",
        "options": [
            "The display panel, Wi-Fi/Bluetooth antenna wires, webcam, microphone, and delicate eDP video cables are tightly routed through hinge mechanisms inside a glued or clipped bezel",
            "Laptop displays operate on 480V three-phase alternating current power requiring an electrician license",
            "Laptop displays contain radioactive phosphors requiring hazardous waste permits to disassemble",
            "Laptop displays must be calibrated inside an industrial cleanroom using cryogenic lasers"
        ],
        "answer": 0,
        "explanation": "Laptop display assemblies pack the LCD panel, LED backlight circuits, embedded DisplayPort (eDP) micro-coaxial cable, integrated webcam, microphones, and wireless antenna leads through narrow physical hinges and tightly glued/snapped plastic bezels, making disassembly delicate and labor-intensive. Laptop displays operate on low DC voltage (typically 3.3V-19V), use safe solid-state LEDs, and require no cryogenic equipment.",
        "distractor_analysis": {
            "1": "Laptop displays operate on low-voltage DC power supplied through the motherboard (typically 3.3V logic and 12V-19V backlight power), not three-phase AC mains.",
            "2": "Modern flat-panel LCDs use safe non-toxic LEDs and liquid crystal polymers, containing no radioactive phosphors.",
            "3": "Laptop display panels are modular components that can be serviced at a standard ESD-safe electronics workbench without cleanrooms or lasers."
        },
        "tags": ["mobile", "laptop", "display", "antennas", "repair"]
    }
]
