#!/usr/bin/env python3
"""Part 6 of fixed Core 1 questions: C1-251 to C1-271."""

PART6_QUESTIONS = [
    {
        "id": "C1-251",
        "objective": "3.8",
        "type": "single",
        "difficulty": "medium",
        "question": "In a laser printer electrophotographic process, what is the correct chronological sequence of the primary printing steps?",
        "options": [
            "Cleaning -> Charging -> Exposing -> Developing -> Transferring -> Fusing",
            "Exposing -> Charging -> Developing -> Transferring -> Fusing -> Cleaning",
            "Developing -> Exposing -> Cleaning -> Charging -> Fusing -> Transferring",
            "Charging -> Exposing -> Fusing -> Developing -> Transferring -> Cleaning"
        ],
        "answer": 0,
        "explanation": "The standard 6-step electrophotographic laser printing cycle occurs in this exact sequence: (1) Cleaning (cleaning blade scrapes residual toner and discharge lamp neutralizes remaining charges), (2) Charging (primary charge roller applies uniform -600V charge to the drum), (3) Exposing (laser writes electrostatic latent image by discharging specific areas to ~-100V), (4) Developing (toner particles are electrostatically attracted to exposed areas), (5) Transferring (transfer roller applies positive charge to paper, pulling toner from drum), and (6) Fusing (heat and pressure permanently bond toner into paper fibers).",
        "distractor_analysis": {
            "1": "Exposing cannot happen before Charging; the drum must have a uniform negative charge before the laser can write the latent image.",
            "2": "Developing cannot happen before Exposing; the latent electrostatic image must be written by the laser first.",
            "3": "Fusing occurs after Transferring toner to paper, not before Developing."
        },
        "tags": ["hardware", "printers", "laser", "ep-process", "sequence"]
    },
    {
        "id": "C1-252",
        "objective": "5.6",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician notices that printed pages from a departmental laser printer have black toner that smudges and wipes off easily when touched by hand. Which printer assembly has failed?",
        "options": [
            "Fuser assembly (heating element / pressure roller)",
            "Photosensitive imaging drum",
            "Primary corona / charge roller wire",
            "Paper pickup roller"
        ],
        "answer": 0,
        "explanation": "The fuser assembly uses high heat (~200 C / 392 F) and mechanical pressure rollers to permanently melt and bond plastic toner particles into the fibers of the paper. If the fuser heating lamp fails, the thermal fuse blows, or the pressure roller is defective, toner remains as loose dry powder on top of the paper that wipes off effortlessly. Drum defects cause streaks or repeating marks, and charge rollers regulate drum voltage.",
        "distractor_analysis": {
            "1": "The imaging drum transfers the toner image to paper; if toner is already on the page, the drum functioned properly.",
            "2": "The primary corona wire applies the initial uniform negative charge to the drum; failure results in black or blank pages, not unfused toner.",
            "3": "The pickup roller feeds paper from the paper tray; failure causes paper feed jams."
        },
        "tags": ["troubleshooting", "printers", "laser", "fuser", "toner-smudge"]
    },
    {
        "id": "C1-253",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A network technician needs to securely manage remote datacenter switches and Linux servers over an encrypted terminal connection. Which port and protocol must be open on the management firewall?",
        "options": [
            "Secure Shell (SSH) over TCP port 22",
            "Unencrypted Telnet over TCP port 23",
            "Remote Desktop Protocol (RDP) over TCP port 3389",
            "Hypertext Transfer Protocol (HTTP) over TCP port 80"
        ],
        "answer": 0,
        "explanation": "Secure Shell (SSH) operates over TCP port 22 to provide strong cryptographic confidentiality, data integrity, and authentication for remote command-line terminal management. It completely replaces insecure legacy Telnet (TCP port 23), which sends passwords and commands in cleartext. RDP provides graphical Windows desktop access over port 3389, and HTTP is unencrypted web traffic over port 80.",
        "distractor_analysis": {
            "1": "Telnet operates over TCP port 23 in cleartext without encryption, presenting severe credential-sniffing security risks.",
            "2": "RDP (TCP 3389) is a proprietary Microsoft protocol for remote graphical desktop access, not lightweight command-line switch management.",
            "3": "HTTP (TCP 80) is an unencrypted web transport protocol that does not provide secure CLI terminal management."
        },
        "tags": ["networking", "ports", "ssh", "security", "remote-management"]
    },
    {
        "id": "C1-254",
        "objective": "2.1",
        "type": "single",
        "difficulty": "easy",
        "question": "Which standard transport protocol and destination port does secure HTTPS web communication operate on by default?",
        "options": [
            "TCP port 443 (HTTPS)",
            "TCP port 80 (HTTP plaintext)",
            "TCP port 8080 (HTTP Alternate Proxy)",
            "UDP port 53 (DNS name resolution)"
        ],
        "answer": 0,
        "explanation": "Hypertext Transfer Protocol Secure (HTTPS) operates over TCP port 443 by default, encrypting HTTP web traffic using Transport Layer Security (TLS) to ensure privacy, integrity, and server authentication. TCP port 80 is unencrypted HTTP, TCP port 8080 is an alternate web caching/proxy port, and UDP port 53 is used for DNS queries.",
        "distractor_analysis": {
            "1": "TCP port 80 is the default port for standard unencrypted HTTP web traffic.",
            "2": "TCP port 8080 is an alternate development and proxy port, typically unencrypted unless configured explicitly.",
            "3": "UDP port 53 is the primary port for Domain Name System (DNS) queries."
        },
        "tags": ["networking", "ports", "https", "tls", "web"]
    },
    {
        "id": "C1-255",
        "objective": "2.6",
        "type": "single",
        "difficulty": "medium",
        "question": "A technician checks a workstation's IP configuration using ipconfig and sees an address of 169.254.42.100 with a subnet mask of 255.255.0.0. What does this indicate?",
        "options": [
            "The DHCP server was unreachable, so the client operating system automatically self-assigned an APIPA (Automatic Private IP Addressing) link-local address",
            "The workstation successfully leased a public routable IP address from the ISP",
            "The local DNS server is offline and unreachable",
            "The computer was configured manually with a static IP address"
        ],
        "answer": 0,
        "explanation": "The IPv4 address block 169.254.0.0/16 is reserved for Automatic Private IP Addressing (APIPA). When a network client configured for dynamic IP addressing sends DHCPDISCOVER broadcasts but receives no DHCPOFFER from a DHCP server, Windows automatically assigns an APIPA link-local address. This allows local peer-to-peer subnet communication but prevents routing across default gateways or accessing the Internet.",
        "distractor_analysis": {
            "1": "169.254.0.0/16 is an unroutable link-local private address, not a public ISP routable IP.",
            "2": "DNS servers resolve hostnames to IPs; an APIPA address is assigned during the DHCP IP acquisition phase before DNS lookups occur.",
            "3": "If configured with a manual static IP, ipconfig would display the user-specified network IP, not an automatic 169.254.x.x address."
        },
        "tags": ["networking", "apipa", "dhcp", "ip-addressing", "troubleshooting"]
    },
    {
        "id": "C1-256",
        "objective": "3.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which standard Ethernet cable wiring pinout arranges the 8 color-coded conductors in this exact sequence from Pin 1 to Pin 8: White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown?",
        "options": [
            "ANSI/TIA-568-B (T568B)",
            "ANSI/TIA-568-A (T568A)",
            "Cisco Rollover console pinout",
            "USOC telephone pinout"
        ],
        "answer": 0,
        "explanation": "The T568B commercial wiring standard specifies the pinout order: Pin 1: White/Orange, Pin 2: Orange, Pin 3: White/Green, Pin 4: Blue, Pin 5: White/Blue, Pin 6: Green, Pin 7: White/Brown, Pin 8: Brown. In contrast, T568A begins with Pin 1: White/Green, Pin 2: Green, Pin 3: White/Orange, Pin 6: Orange. Rollover reverses all pins for serial consoles.",
        "distractor_analysis": {
            "1": "T568A swaps the orange and green pairs, starting with Pin 1: White/Green and Pin 2: Green.",
            "2": "A Rollover cable inverts all 8 pins (Pin 1 connects to Pin 8) for Cisco RJ-45 serial console management.",
            "3": "USOC is an older telecommunications pinout for multi-line analog telephone wiring."
        },
        "tags": ["hardware", "cables", "t568b", "pinouts", "color-coding"]
    },
    {
        "id": "C1-257",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the maximum standard certified segment distance for 10 Gigabit Ethernet (10GBASE-T) transmission over standard Category 6 (Cat 6) unshielded twisted pair copper cable?",
        "options": [
            "55 meters (180 feet)",
            "100 meters (328 feet)",
            "30 meters (98 feet)",
            "10 meters (33 feet)"
        ],
        "answer": 0,
        "explanation": "Standard Category 6 (Cat 6) cabling is rated up to 250 MHz and can reliably support 10GBASE-T (10 Gbps) up to 55 meters (180 feet) under standard installation conditions (reduced to ~37m in high-crosstalk bundles). To achieve 10 Gbps up to the full 100-meter limit, Category 6a (Augmented Cat 6 rated at 500 MHz) is required.",
        "distractor_analysis": {
            "1": "100 meters is the maximum distance for 10GBASE-T on Category 6a (Cat 6a) cabling, but standard Cat 6 cannot reliably reach 100m at 10 Gbps.",
            "2": "30 meters is the distance limit for Category 8 (Cat 8) 40GBASE-T datacenter top-of-rack links.",
            "3": "10 meters is a very short length well within Cat 6 capabilities, not the maximum certified distance boundary."
        },
        "tags": ["hardware", "cables", "cat6", "10gbps", "distance-limits"]
    },
    {
        "id": "C1-258",
        "objective": "2.8",
        "type": "single",
        "difficulty": "easy",
        "question": "Which specialized tool pair should a network technician use to trace and identify a specific unlabeled network cable buried deep inside a large datacenter server rack cable bundle?",
        "options": [
            "Tone generator and inductive probe (toner / fox and hound)",
            "Modular RJ-45 cable crimper",
            "Hardware Ethernet loopback plug",
            "Impact punch-down tool"
        ],
        "answer": 0,
        "explanation": "A tone generator connects to the target cable and injects a continuous audio-frequency RF tone onto the copper wire. The technician sweeps the handheld inductive probe along the bundle or patch panel; the probe's speaker amplifies the signal when brought near the specific wire, allowing quick identification. Crimpers terminate plugs, loopback plugs test NICs, and punch-down tools terminate wires into patch panels.",
        "distractor_analysis": {
            "1": "A cable crimper is a mechanical tool for attaching RJ-45 modular plugs to cable ends, offering no tracing function.",
            "2": "A loopback plug tests internal NIC transceiver circuitry by routing transmit signals back to receive pins.",
            "3": "A punch-down tool terminates wires into 110/Krone punch blocks, but cannot locate or trace unlabeled cables."
        },
        "tags": ["networking", "tools", "tone-generator", "probe", "troubleshooting"]
    },
    {
        "id": "C1-259",
        "objective": "2.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which legacy IEEE 802.11 wireless networking standard operates exclusively in the 5 GHz radio frequency band, providing high-throughput multi-gigabit wireless using wide channels and MU-MIMO?",
        "options": [
            "IEEE 802.11ac (Wi-Fi 5)",
            "IEEE 802.11b",
            "IEEE 802.11g",
            "IEEE 802.11n (Wi-Fi 4)"
        ],
        "answer": 0,
        "explanation": "IEEE 802.11ac (Wi-Fi 5) was standardized to operate exclusively in the 5 GHz band, utilizing 80/160 MHz channel bonding, 256-QAM modulation, and Multi-User Multiple Input Multiple Output (MU-MIMO) downlinks to achieve multi-gigabit throughput. 802.11b/g operate in 2.4 GHz, and 802.11n operates in both 2.4 GHz and 5 GHz.",
        "distractor_analysis": {
            "1": "IEEE 802.11b operates exclusively in the 2.4 GHz band with a maximum speed of 11 Mbps.",
            "2": "IEEE 802.11g operates exclusively in the 2.4 GHz band with a maximum speed of 54 Mbps.",
            "3": "IEEE 802.11n (Wi-Fi 4) operates in both 2.4 GHz and 5 GHz bands, not exclusively in 5 GHz."
        },
        "tags": ["networking", "wireless", "802.11ac", "5ghz", "mu-mimo"]
    },
    {
        "id": "C1-260",
        "objective": "2.2",
        "type": "single",
        "difficulty": "easy",
        "question": "Which three 20 MHz wireless channels in the 2.4 GHz frequency spectrum do not overlap with each other in North America, allowing interference-free concurrent Wi-Fi deployments?",
        "options": [
            "Channels 1, 6, and 11",
            "Channels 1, 2, and 3",
            "Channels 2, 4, and 8",
            "Channels 36, 40, and 44"
        ],
        "answer": 0,
        "explanation": "In the 2.4 GHz band, each standard 20 MHz Wi-Fi channel requires 25 MHz of total channel spacing to prevent sideband interference. Across the 11 channels available in North America, only channels 1 (2.412 GHz), 6 (2.437 GHz), and 11 (2.462 GHz) have sufficient frequency separation to operate concurrently without spectral overlap. Channels 36, 40, 44 are 5 GHz channels.",
        "distractor_analysis": {
            "1": "Channels 1, 2, and 3 overlap almost entirely, causing extreme packet collisions and co-channel interference.",
            "2": "Channels 2, 4, and 8 overlap each other heavily and cannot operate concurrently in the same physical area.",
            "3": "Channels 36, 40, and 44 are non-overlapping channels in the 5 GHz UNII-1 band, not the 2.4 GHz band."
        },
        "tags": ["networking", "wireless", "2.4ghz", "channels", "interference"]
    },
    {
        "id": "C1-261",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A datacenter infrastructure administrator installs VMware ESXi or Microsoft Hyper-V Server directly onto bare-metal physical servers with no underlying general-purpose host OS. Which hypervisor category is deployed?",
        "options": [
            "Type 1 (Bare-Metal) Hypervisor",
            "Type 2 (Hosted) Hypervisor",
            "Application containerization runtime engine",
            "Software instruction emulation layer"
        ],
        "answer": 0,
        "explanation": "A Type 1 (bare-metal) hypervisor runs directly on the physical server hardware, acting as its own lean kernel/operating system to manage CPU, memory, and storage virtualization with maximum I/O performance and low latency. Type 2 hosted hypervisors (like VirtualBox or VMware Workstation) run as applications inside a desktop OS, container runtimes share a host kernel, and emulation layers translate instructions in software.",
        "distractor_analysis": {
            "1": "Type 2 hosted hypervisors run on top of an existing host operating system (such as Windows 11 or Linux), introducing host OS latency.",
            "2": "Application container runtimes (such as Docker) share the underlying host OS kernel rather than virtualizing full bare-metal hardware.",
            "3": "Emulation engines translate foreign CPU instructions in software, which is significantly slower than bare-metal hypervisor execution."
        },
        "tags": ["virtualization", "hypervisor", "type-1", "bare-metal", "datacenter"]
    },
    {
        "id": "C1-262",
        "objective": "4.2",
        "type": "single",
        "difficulty": "easy",
        "question": "An enterprise development company rents virtual compute instances, virtual private clouds (VPCs), and Elastic Block Storage from a public cloud provider, but manages the installation, security patching, and configuration of its own operating systems and applications. Which cloud service model is this?",
        "options": [
            "Infrastructure as a Service (IaaS)",
            "Software as a Service (SaaS)",
            "Platform as a Service (PaaS)",
            "Desktop as a Service (DaaS)"
        ],
        "answer": 0,
        "explanation": "Infrastructure as a Service (IaaS) delivers raw virtualized computing infrastructure (VMs, storage, firewalls, subnets) on demand. The cloud provider manages the physical datacenters and hypervisors, while the customer maintains full administrative control and responsibility over the guest operating systems, middleware, and application code. SaaS delivers complete software, PaaS provides managed development stacks, and DaaS delivers virtual desktop workspaces.",
        "distractor_analysis": {
            "1": "Software as a Service (SaaS) delivers complete turnkey software applications (e.g., Salesforce, Microsoft 365) where the provider manages all infrastructure and OS.",
            "2": "Platform as a Service (PaaS) provides development frameworks and managed database runtimes where the provider manages the underlying OS and patching.",
            "3": "Desktop as a Service (DaaS) provides virtualized desktop operating system sessions to remote client endpoints."
        },
        "tags": ["cloud", "iaas", "service-models", "shared-responsibility"]
    },
    {
        "id": "C1-263",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "Which cloud computing characteristic describes the automated capability of cloud infrastructure to dynamically provision additional compute instances during sudden traffic surges and deprovision them when demand drops?",
        "options": [
            "Rapid Elasticity",
            "Measured Service",
            "Broad Network Access",
            "Resource Pooling"
        ],
        "answer": 0,
        "explanation": "Rapid Elasticity allows cloud computing infrastructure to scale resources out (adding instances) and scale in (releasing instances) dynamically and automatically in response to real-time workload demand. Measured service tracks usage metrics for cost billing, broad network access ensures availability across varied clients, and resource pooling shares multi-tenant physical hardware.",
        "distractor_analysis": {
            "1": "Measured service refers to resource monitoring and metering for automated usage-based billing.",
            "2": "Broad network access ensures cloud capabilities are accessible over standard network mechanisms across diverse client platforms.",
            "3": "Resource pooling describes the provider pooling physical hardware dynamically across multiple client tenants."
        },
        "tags": ["cloud", "elasticity", "auto-scaling", "characteristics"]
    },
    {
        "id": "C1-264",
        "objective": "4.1",
        "type": "single",
        "difficulty": "easy",
        "question": "What hardware processor feature must be enabled in the system's UEFI/BIOS configuration before a hypervisor can execute 64-bit guest virtual machines with direct hardware virtualization acceleration?",
        "options": [
            "Intel VT-x or AMD-V CPU virtualization extensions",
            "UEFI Secure Boot certificate validation",
            "Preboot eXecution Environment (PXE) network boot",
            "Simultaneous Multi-Threading (SMT / Hyper-Threading)"
        ],
        "answer": 0,
        "explanation": "Intel VT-x (for Intel processors) and AMD-V (for AMD processors) are hardware virtualization instruction set extensions that allow hypervisors to execute privileged CPU instructions directly on the physical processor, achieving near-native performance for guest VMs. Secure Boot verifies digital signatures, PXE enables network booting, and SMT/Hyper-Threading creates logical CPU execution threads.",
        "distractor_analysis": {
            "1": "Secure Boot verifies the authenticity of bootloaders during power-on, but does not provide CPU virtualization instructions.",
            "2": "PXE network boot allows a computer to boot an OS image across a local Ethernet network from a TFTP server.",
            "3": "Simultaneous Multi-Threading (SMT) divides physical CPU cores into logical threads, but does not enable hardware hypervisor extensions."
        },
        "tags": ["virtualization", "uefi", "vt-x", "amd-v", "hardware"]
    },
    {
        "id": "C1-265",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "How does application containerization (such as Docker or Podman) fundamentally differ from traditional Type 1 or Type 2 virtual machines?",
        "options": [
            "Containers share the underlying host operating system kernel and isolate user-space application processes, starting in milliseconds with minimal resource overhead",
            "Containers require dedicated physical network switches for every deployed container image",
            "Containers emulate complete x86 PC motherboards and BIOS firmware inside each container",
            "Containers cannot execute on Linux or Windows server operating systems"
        ],
        "answer": 0,
        "explanation": "Containers utilize host operating system kernel features (such as namespaces and cgroups in Linux) to provide lightweight, isolated user spaces for application binaries and dependencies. Because containers share a single underlying host kernel, they start in milliseconds and consume drastically less RAM and CPU overhead than traditional virtual machines (which must boot complete independent guest operating systems with emulated hardware).",
        "distractor_analysis": {
            "1": "Containers use software virtual bridge networks and do not require separate physical hardware switches.",
            "2": "Containers do not emulate motherboard BIOS or virtual hardware; they run as isolated processes on the host kernel.",
            "3": "Containers run natively on modern Linux and Windows server operating systems."
        },
        "tags": ["virtualization", "containers", "docker", "microservices"]
    },
    {
        "id": "C1-266",
        "objective": "4.2",
        "type": "single",
        "difficulty": "easy",
        "question": "A corporate enterprise deploys low-cost, low-power endpoint terminals with no local mass storage. The terminals connect over the network to full Windows 11 desktop sessions hosted on virtual machines in a centralized datacenter. Which deployment model is this?",
        "options": [
            "Virtual Desktop Infrastructure (VDI) with Thin Clients / DaaS",
            "Software as a Service (SaaS) with Thick Clients",
            "Peer-to-peer Workgroup file sharing",
            "Local Direct-Attached Storage clustering"
        ],
        "answer": 0,
        "explanation": "Virtual Desktop Infrastructure (VDI) or Desktop as a Service (DaaS) hosts complete virtualized desktop environments inside datacenter virtual machines. Users access these central desktops across the network using lightweight 'Thin Client' or 'Zero Client' terminals that handle display rendering and USB input redirection without needing local storage drives. SaaS delivers web apps, peer-to-peer shares files between local PCs, and DAS is direct local storage.",
        "distractor_analysis": {
            "1": "SaaS delivers web applications (e.g., Salesforce), whereas VDI delivers complete virtualized desktop operating system sessions.",
            "2": "Peer-to-peer workgroups connect standalone independent PCs without centralized datacenter virtualization.",
            "3": "Direct-Attached Storage (DAS) refers to dedicated local drives attached to physical servers, unrelated to thin-client virtual desktop streaming."
        },
        "tags": ["cloud", "vdi", "daas", "thin-client", "virtualization"]
    },
    {
        "id": "C1-267",
        "objective": "5.4",
        "type": "single",
        "difficulty": "medium",
        "question": "A smartphone user reports that their mobile screen displays a crisp, clear, and bright image with no visual artifacts, but touching, tapping, or swiping anywhere on the glass produces zero response. Which internal display component has failed?",
        "options": [
            "The capacitive glass digitizer layer",
            "The LCD/OLED display matrix panel",
            "The LED backlight array",
            "The graphics processing unit (GPU)"
        ],
        "answer": 0,
        "explanation": "A smartphone screen assembly is made of two primary fused layers: the display panel (OLED/LCD) that generates visual pixels and the digitizer (a transparent capacitive touch grid bonded to the glass) that detects finger contact and translates touches into digital coordinates. If the image is clear but touch does not register, the digitizer (or its ribbon cable) has failed. Display matrix failure causes visual artifacts/black screen, backlight failure causes dimness, and GPU failure stops rendering.",
        "distractor_analysis": {
            "1": "The LCD/OLED panel renders the visual image; because the image is crisp and clear, the display matrix is functioning properly.",
            "2": "The LED backlight provides screen brightness; if it failed, the screen would be black, but touch input would still register.",
            "3": "The GPU renders graphics frames; if it failed, the screen would display corrupted visual artifacts or no video."
        },
        "tags": ["troubleshooting", "mobile", "digitizer", "touchscreen", "display"]
    },
    {
        "id": "C1-268",
        "objective": "5.4",
        "type": "single",
        "difficulty": "medium",
        "question": "A user reports that their corporate laptop trackpad has popped up above the palmrest, the lower casing seam is splitting, and the bottom is bulging outward. What is the root cause and immediate safety procedure?",
        "options": [
            "The internal lithium-ion battery has swollen; immediately power off the laptop, disconnect the AC adapter, avoid puncturing the battery, and replace it following hazardous disposal procedures",
            "The keyboard ribbon cable is pinched under the chassis; push it back in firmly with a metal screwdriver",
            "The CPU copper heat pipe has expanded due to heat; run diagnostic stress tests to vent thermal pressure",
            "The trackpad mounting screws became loose; retighten them firmly from underneath the motherboard"
        ],
        "answer": 0,
        "explanation": "A swollen lithium-ion battery is a hazardous condition caused by gas buildup from internal cell degradation or thermal runaway. The expanding battery pushes upward against the trackpad and palmrest. The immediate action is to safely shut down the laptop, disconnect external AC power, avoid puncturing the battery, and replace it following hazardous materials disposal procedures. Tightening screws on a swollen battery risks puncturing cells and causing fire. Fan or SSD issues do not create physical chassis bulging.",
        "distractor_analysis": {
            "1": "Pushing metal screwdrivers into a bulging chassis risks puncturing the battery pouch, triggering an immediate explosive fire.",
            "2": "Copper heat pipes do not expand to distort laptop chassis; running stress tests on a computer with a failing battery accelerates fire risk.",
            "3": "Retightening screws or pressing down on a bulging chassis can puncture the lithium pouch, triggering a violent thermal fire."
        },
        "tags": ["troubleshooting", "mobile", "battery", "safety", "swollen-battery"]
    },
    {
        "id": "C1-269",
        "objective": "5.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A newly assembled desktop powers on, fans spin, but the screen stays completely black and the motherboard emits a repeating series of short beeps without displaying POST. What is the MOST likely cause?",
        "options": [
            "Unseated, defective, or incompatible system RAM modules",
            "A defective external HDMI monitor cable",
            "Corrupted Windows Boot Configuration Data (BCD)",
            "A failed secondary SATA mechanical hard drive"
        ],
        "answer": 0,
        "explanation": "POST (Power-On Self-Test) beeps occur before the video display subsystem is initialized. A continuous or repeating short beep code on standard BIOS firmware universally signifies missing, unseated, or defective system RAM. Reseating the RAM in the recommended slots or testing one module at a time isolates the issue. Display cable defects do not generate POST beeps, and BCD/secondary drive errors occur after POST passes.",
        "distractor_analysis": {
            "1": "A defective HDMI cable causes a 'No Signal' monitor message, but POST will complete normally with a single short success beep.",
            "2": "Corrupted BCD files cause operating system bootloader crashes after POST completes and hands off control.",
            "3": "A failed secondary data drive does not halt motherboard POST or trigger fatal pre-boot memory beep codes."
        },
        "tags": ["troubleshooting", "hardware", "post", "beep-codes", "ram"]
    },
    {
        "id": "C1-270",
        "objective": "5.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A workstation boots normally, but every time the power cord is unplugged from the wall, the system clock resets to 12:00 AM January 1, 2015 and BIOS settings revert to default. How should this be resolved?",
        "options": [
            "Replace the CR2032 lithium coin-cell CMOS battery on the motherboard",
            "Run Windows Update to install the latest operating system patches",
            "Replace the primary 750W ATX power supply unit",
            "Format the system drive and reinstall Windows from scratch"
        ],
        "answer": 0,
        "explanation": "The CR2032 3V coin-cell battery on the motherboard powers the volatile CMOS RAM and Real-Time Clock (RTC) oscillator when the system is unpowered. When this battery dies, disconnecting mains AC power cuts all electrical current to the RTC, resetting the clock to its firmware epoch date and clearing custom BIOS settings. Replacing the battery permanently fixes the problem. Windows Update, PSUs, and formatting do not restore motherboard coin-cell battery voltage.",
        "distractor_analysis": {
            "1": "Windows Update updates operating system software, having no impact on motherboard pre-boot RTC battery power.",
            "2": "The ATX power supply provides main system power when plugged in, but does not maintain RTC memory when unplugged.",
            "3": "Formatting the storage drive deletes files without fixing depleted motherboard battery cells."
        },
        "tags": ["troubleshooting", "hardware", "cmos", "battery", "rtc", "bios"]
    },
    {
        "id": "C1-271",
        "objective": "5.6",
        "type": "single",
        "difficulty": "easy",
        "question": "Users in an office report that a shared network laser printer has completely stopped printing documents, and multiple print jobs are stuck with the status 'Error - Printing'. What service should the technician restart on the print server?",
        "options": [
            "Windows Print Spooler service (spoolsv.exe)",
            "DNS Client service (dnscache)",
            "Remote Registry service",
            "Windows Workstation service (lanmanworkstation)"
        ],
        "answer": 0,
        "explanation": "The Windows Print Spooler service (spoolsv.exe) manages the spooling, queuing, and transmission of print jobs to local and network printers. When a corrupted job halts the spool queue, stopping the Print Spooler, clearing out stuck spool files from C:\\Windows\\System32\\spool\\PRINTERS, and restarting the service clears the jam and restores printing. DNS Client, Remote Registry, and Workstation services do not manage print queues.",
        "distractor_analysis": {
            "1": "The DNS Client service caches DNS domain name resolutions and does not manage local or network printer spool queues.",
            "2": "The Remote Registry service allows remote users to modify registry settings, having no role in print job processing.",
            "3": "The Workstation service creates and maintains client network connections to remote servers, not local print queue spooling."
        },
        "tags": ["troubleshooting", "printers", "spooler", "windows", "services"]
    }
]
