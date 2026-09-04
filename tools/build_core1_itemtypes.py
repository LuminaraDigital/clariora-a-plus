#!/usr/bin/env python3
"""Build Core 1 item-type shard: multi / match / order only.

Prefix: C1N-I-001..024
Mix: 12 multi, 6 order, 6 match
Output: _bank/shards/core1_itemtypes.json

Run from ROOT: python tools/build_core1_itemtypes.py
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

with open(os.path.join(HERE, "objective_notes_map.json"), encoding="utf-8") as f:
    NOTES = json.load(f)["core1"]

with open(os.path.join(HERE, "objectives_220_1201.json"), encoding="utf-8") as f:
    OBJECTIVES = json.load(f)["objectives"]

# video_reference left null unless a perfect objective match is intentional.
QUESTIONS = [
    # ---- MULTI (12) ----
    {
        "id": "C1N-I-001",
        "objective": "1.1",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A field technician is diagnosing a docking-station laptop that charges slowly over USB-C "
            "and loses the external 4K display whenever the user unplugs AC power. Which TWO hardware "
            "checks best isolate a USB-C / Thunderbolt path problem before replacing the motherboard? "
            "(Select TWO.)"
        ),
        "options": [
            "Verify the dock and laptop both negotiate USB Power Delivery at the expected wattage",
            "Confirm the cable and dock port support DisplayPort Alternate Mode for the attached monitor",
            "Flash the laptop EC firmware with a random older vendor package from an unverified mirror",
            "Disable Secure Boot so the dock can inject unsigned display EDID overrides",
            "Replace the CMOS coin cell to restore USB-C video handshakes after every suspend",
        ],
        "answers": [0, 1],
        "explanation": (
            "USB-C docking issues usually split into power negotiation and DisplayPort Alt Mode. Confirming PD wattage "
            "explains slow charging when the laptop falls back to a low-watt profile, while Alt Mode support explains a "
            "4K display that only stays up when AC keeps the dock fully powered. Random EC flashes, Secure Boot changes, "
            "and CMOS swaps do not fix Alt Mode or PD negotiation on a working port."
        ),
        "distractor_analysis": {
            "2": "Unverified older EC packages risk bricking the embedded controller and do not prove a cable or dock capability gap.",
            "3": "Secure Boot does not control USB-C DisplayPort Alternate Mode link training for an external monitor.",
            "4": "The CMOS battery preserves UEFI settings clocks; it does not restore USB-C video handshakes after suspend.",
        },
        "tags": ["mobile", "usb-c", "dock", "displayport-alt-mode"],
    },
    {
        "id": "C1N-I-002",
        "objective": "1.3",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A datacenter NOC is onboarding rugged Android handhelds that must stay inventory-tracked, "
            "enforce work-profile isolation, and wipe automatically if lost off-site. Which TWO MDM "
            "capabilities should the technician enable in the enrollment profile? (Select TWO.)"
        ),
        "options": [
            "Remote wipe and selective corporate-container wipe policies",
            "GPS / location reporting tied to the device asset tag",
            "Sideloading of unsigned APKs from a public file share to speed imaging",
            "Disabling certificate pinning so captive portals inject TLS interception freely",
            "Factory-resetting Secure Boot keys on every overnight sync",
        ],
        "answers": [0, 1],
        "explanation": (
            "Enterprise handheld fleets rely on MDM remote wipe (and container wipe) for lost-device data protection, "
            "plus location reporting for asset accountability. Sideloading unsigned APKs and weakening TLS controls "
            "expand the attack surface. Resetting Secure Boot keys nightly is unrelated to MDM enrollment and can brick "
            "devices."
        ),
        "distractor_analysis": {
            "2": "Sideloading unsigned APKs bypasses store and enterprise signing controls and is not an MDM hardening control.",
            "3": "Disabling certificate pinning to allow arbitrary TLS interception weakens app integrity rather than securing the fleet.",
            "4": "Secure Boot key resets are a platform trust operation, not a standard overnight MDM sync action.",
        },
        "tags": ["mdm", "mobile", "wipe", "asset-tracking"],
    },
    {
        "id": "C1N-I-003",
        "objective": "2.1",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "During a pre-cutover firewall review, a technician must allow secure remote shell access to "
            "Linux jump hosts and encrypted web management to a SAN array GUI. Which TWO destination "
            "ports should remain permitted on the management ACL? (Select TWO.)"
        ),
        "options": [
            "TCP 22 for SSH administrative sessions",
            "TCP 443 for HTTPS management interfaces",
            "TCP 23 for Telnet console access across the WAN",
            "UDP 69 for TFTP firmware pushes from untrusted VLANs",
            "TCP 21 for cleartext FTP of configuration backups",
        ],
        "answers": [0, 1],
        "explanation": (
            "SSH on TCP 22 and HTTPS on TCP 443 are the standard encrypted management channels for jump hosts and "
            "storage GUIs. Telnet, TFTP, and FTP send credentials or payloads in cleartext and should stay blocked on "
            "production management edges unless a tightly controlled exception exists."
        ),
        "distractor_analysis": {
            "2": "Telnet (TCP 23) transmits credentials in cleartext and is inappropriate for WAN management access.",
            "3": "TFTP (UDP 69) is unauthenticated and unencrypted, making it unsafe for firmware from untrusted VLANs.",
            "4": "FTP (TCP 21) moves configuration data without encryption and should not be left open on management ACLs.",
        },
        "tags": ["ports", "ssh", "https", "firewall"],
    },
    {
        "id": "C1N-I-004",
        "objective": "2.2",
        "type": "multi",
        "difficulty": "hard",
        "question": (
            "A warehouse AP survey shows sticky clients and frequent roaming drops between two 5 GHz "
            "SSIDs on adjacent channels. Which TWO wireless design changes most directly improve "
            "roaming stability without abandoning WPA3-Enterprise? (Select TWO.)"
        ),
        "options": [
            "Enable 802.11r / 802.11k assisted roaming features on the controller and SSIDs",
            "Tune AP power and channel plans so overlapping cells hand off cleanly at intended boundaries",
            "Force all clients onto 2.4 GHz only to increase co-channel reuse density",
            "Disable AES-CCMP so older TKIP stations can roam faster",
            "Bridge every AP into the same unmanaged Layer-2 loop with STP disabled",
        ],
        "answers": [0, 1],
        "explanation": (
            "Fast BSS transition (802.11r) and neighbor reports (802.11k), combined with disciplined RF power and channel "
            "planning, reduce sticky-client behavior while keeping WPA3-Enterprise intact. Collapsing to 2.4 GHz worsens "
            "interference. TKIP is obsolete and weaker. Disabling STP on a bridged AP mesh invites broadcast storms."
        ),
        "distractor_analysis": {
            "2": "Forcing 2.4 GHz concentrates traffic onto a crowded band with only three non-overlapping channels.",
            "3": "TKIP is deprecated and incompatible with modern WPA3-Enterprise security requirements.",
            "4": "Disabling STP on a large L2 wireless bridge fabric risks loops and outages, not cleaner roaming.",
        },
        "tags": ["wireless", "roaming", "802.11r", "rf-design"],
    },
    {
        "id": "C1N-I-005",
        "objective": "2.4",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A colocation customer needs east-west isolation between production and backup server VLANs "
            "plus encrypted remote access for contractors. Which TWO technologies satisfy both "
            "requirements on the existing Layer-3 core? (Select TWO.)"
        ),
        "options": [
            "802.1Q VLANs with ACLs or VRFs separating production and backup segments",
            "Site-to-site or client VPN tunnels for contractor remote access",
            "A single flat /16 with proxy ARP enabled for every host",
            "Disabling Spanning Tree so VLAN trunks converge faster after loops",
            "NAT overload of every server into one public IP on the access switch",
        ],
        "answers": [0, 1],
        "explanation": (
            "VLAN (or VRF) segmentation provides east-west isolation between production and backup, while VPN tunnels "
            "give contractors encrypted remote reachability. A flat network with proxy ARP removes isolation. Disabling "
            "STP invites loops. Hairpinning every server through one public IP on an access switch is not a sound "
            "segmentation design."
        ),
        "distractor_analysis": {
            "2": "A flat /16 with proxy ARP collapses broadcast domains and removes the isolation the customer requested.",
            "3": "Disabling Spanning Tree increases loop risk on switched VLAN fabrics instead of improving isolation.",
            "4": "NAT overload on an access switch does not separate production from backup or replace VPN encryption.",
        },
        "tags": ["vlan", "vpn", "segmentation", "datacenter"],
    },
    {
        "id": "C1N-I-006",
        "objective": "2.5",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A rack build needs a device that terminates multiple ISP handoffs and performs dynamic "
            "routing, plus a separate device that learns MAC addresses and forwards frames inside the "
            "top-of-rack fabric. Which TWO device roles match that design? (Select TWO.)"
        ),
        "options": [
            "Router / Layer-3 gateway for ISP handoff and routing between networks",
            "Ethernet switch for Layer-2 forwarding within the rack VLAN fabric",
            "Analog modem bank for dial-up console multiplexing of every blade",
            "Unmanaged media converter that also runs BGP and OSPF adjacencies",
            "USB print server appliance terminating ISP BGP sessions",
        ],
        "answers": [0, 1],
        "explanation": (
            "Routers (or L3 gateways) terminate WAN/ISP links and route between networks. Switches forward Ethernet "
            "frames using MAC tables inside the rack. Modems, simple media converters, and print servers are not "
            "substitutes for those core roles."
        ),
        "distractor_analysis": {
            "2": "Analog modem banks are obsolete console/WAN tools and do not replace rack switching or ISP routing.",
            "3": "A basic media converter changes media types; it does not establish BGP/OSPF as a primary function.",
            "4": "USB print servers share printers; they do not terminate ISP BGP sessions.",
        },
        "tags": ["network-devices", "router", "switch"],
    },
    {
        "id": "C1N-I-007",
        "objective": "3.4",
        "type": "multi",
        "difficulty": "hard",
        "question": (
            "A storage tech is commissioning a four-disk array that must survive a single drive failure "
            "with usable capacity better than mirroring, while a second array needs maximum write "
            "performance for scratch VMs and can tolerate total data loss. Which TWO RAID choices fit? "
            "(Select TWO.)"
        ),
        "options": [
            "RAID 5 for single-drive fault tolerance with parity striping on four disks",
            "RAID 0 for maximum striped performance with no redundancy on the scratch array",
            "RAID 1 across all four disks with no striping for the scratch workload",
            "JBOD concatenation claiming RAID 10 dual-parity protection",
            "RAID 2 Hamming-code arrays as the only modern SSD default",
        ],
        "answers": [0, 1],
        "explanation": (
            "RAID 5 provides single-disk fault tolerance with better usable capacity than full mirroring on four disks. "
            "RAID 0 maximizes striped performance with zero redundancy, matching disposable scratch storage. RAID 1 on "
            "four disks is not the performance-first scratch choice described. JBOD is not RAID 10. RAID 2 is obsolete."
        ),
        "distractor_analysis": {
            "2": "Four-disk RAID 1 (or multi-mirror) prioritizes redundancy over the maximum-write scratch use case.",
            "3": "JBOD merely concatenates disks; it does not deliver RAID 10 dual-mirror or dual-parity protection.",
            "4": "RAID 2 Hamming arrays are historical and not a modern SSD default for either requirement.",
        },
        "tags": ["raid", "storage", "fault-tolerance"],
    },
    {
        "id": "C1N-I-008",
        "objective": "3.5",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A technician upgrading a dual-socket server must add a 100 GbE NIC and a hardware RAID "
            "HBA. Which TWO motherboard / expansion considerations must be verified before ordering "
            "cards? (Select TWO.)"
        ),
        "options": [
            "Available PCIe slot generation, lane width, and physical form factor clearance",
            "BIOS/UEFI support for the HBA boot path and NIC Option ROM / UEFI drivers",
            "Whether the CMOS jumper color matches the NIC bracket color",
            "Installing both cards in legacy ISA slots for lower latency",
            "Disabling all ECC DIMMs so PCIe bifurcation automatically enables",
        ],
        "answers": [0, 1],
        "explanation": (
            "High-speed NICs and RAID HBAs need matching PCIe electrical/mechanical slots plus firmware that can boot "
            "from the HBA and load NIC Option ROM/UEFI drivers. Cosmetic jumper colors, ISA slots, and disabling ECC "
            "are irrelevant or harmful."
        ),
        "distractor_analysis": {
            "2": "Jumper or bracket color has no bearing on PCIe signaling or boot compatibility.",
            "3": "Modern servers do not use ISA slots for 100 GbE or hardware RAID HBAs.",
            "4": "ECC memory is independent of PCIe bifurcation; disabling ECC reduces reliability without enabling slots.",
        },
        "tags": ["motherboard", "pcie", "hba", "nic"],
    },
    {
        "id": "C1N-I-009",
        "objective": "3.6",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "After a PDU brownout, several 2U servers reboot into continuous POST loops with "
            "intermittent fan-fault LEDs. Which TWO power-subsystem checks should the tech perform "
            "first on each chassis? (Select TWO.)"
        ),
        "options": [
            "Confirm redundant PSU modules seat fully and share load within rated wattage",
            "Validate PSU input voltage/current and that the PDU circuit is not overloaded",
            "Replace every DIMM with non-ECC sticks to reduce power draw during POST",
            "Short the CMOS clear jumper while both PSUs remain under full load",
            "Disable all chassis fans so PSUs run cooler with less airflow demand",
        ],
        "answers": [0, 1],
        "explanation": (
            "Brownout-driven POST loops and fan-fault LEDs often trace to poorly seated redundant PSUs or overloaded PDU "
            "branches delivering unstable voltage. Swapping to non-ECC, clearing CMOS under load, or stopping fans "
            "worsens reliability and thermal risk."
        ),
        "distractor_analysis": {
            "2": "Non-ECC memory does not fix PSU seating or PDU overload and removes ECC protection.",
            "3": "Clearing CMOS under load is unsafe and unrelated to verifying redundant power delivery.",
            "4": "Disabling chassis fans invites thermal shutdown; it does not stabilize PSU input power.",
        },
        "tags": ["psu", "pdu", "power", "cooling"],
    },
    {
        "id": "C1N-I-010",
        "objective": "4.1",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "A hypervisor cluster must run mixed Windows and Linux guests with strong isolation, while "
            "a second platform will host many identical microservices sharing one kernel. Which TWO "
            "compute approaches match those goals? (Select TWO.)"
        ),
        "options": [
            "Type 1 hypervisor VMs for mixed OS guests with hardware-level isolation",
            "Containers for dense identical microservices sharing the host kernel",
            "MS-DOS real-mode multitasking for both platforms",
            "Client-side Java applets instead of server virtualization",
            "Disabling CPU virtualization extensions to force binary translation only",
        ],
        "answers": [0, 1],
        "explanation": (
            "Type 1 hypervisors isolate full guest OS instances, which fits mixed Windows/Linux workloads. Containers "
            "pack dense identical services that share a kernel. DOS multitasking, browser applets, and disabling CPU "
            "virtualization extensions are not appropriate enterprise answers for these requirements."
        ),
        "distractor_analysis": {
            "2": "MS-DOS real-mode multitasking cannot host modern mixed enterprise OS guests or microservice fleets.",
            "3": "Client-side applets do not provide server-side isolation or orchestration for these workloads.",
            "4": "Disabling hardware virtualization extensions degrades performance and is opposite of best practice.",
        },
        "tags": ["virtualization", "containers", "hypervisor"],
    },
    {
        "id": "C1N-I-011",
        "objective": "5.2",
        "type": "multi",
        "difficulty": "hard",
        "question": (
            "A file server intermittently drops offline. SMART shows rising reallocated sectors on one "
            "HDD, and Windows Event Viewer logs delayed write failures. Which TWO actions are the "
            "correct next steps before data loss escalates? (Select TWO.)"
        ),
        "options": [
            "Back up critical volumes immediately to known-good storage",
            "Replace the failing drive and rebuild or restore per the array/backup plan",
            "Run a continuous full-surface format overnight while users keep writing production data",
            "Disable write caching globally and ignore SMART until capacity hits 100 percent",
            "Defragment the failing HDD repeatedly to remap bad sectors in place of replacement",
        ],
        "answers": [0, 1],
        "explanation": (
            "Rising reallocations plus delayed writes indicate a dying disk. Capture data first, then replace and "
            "rebuild/restore. Formatting while live, ignoring SMART, or endless defrag does not restore redundancy and "
            "risks further corruption."
        ),
        "distractor_analysis": {
            "2": "Formatting a degrading production volume while users write risks catastrophic data loss.",
            "3": "Ignoring SMART until the disk is full postpones inevitable failure without protecting data.",
            "4": "Defragmentation cannot substitute for replacing a drive with escalating reallocated sectors.",
        },
        "tags": ["storage", "smart", "troubleshooting"],
    },
    {
        "id": "C1N-I-012",
        "objective": "5.5",
        "type": "multi",
        "difficulty": "medium",
        "question": (
            "Users on one VLAN can ping their gateway but cannot resolve internal hostnames, while "
            "IP-literal HTTPS to servers still works. Which TWO checks should the network tech run "
            "first? (Select TWO.)"
        ),
        "options": [
            "Verify client DNS server addresses and that the DNS service is reachable",
            "Test name resolution with nslookup/dig against the intended DNS servers",
            "Replace every Cat6 patch with coaxial RG-6 to improve DNS latency",
            "Disable IPv4 entirely so only APIPA link-locals remain",
            "Lower the switch MTU to 64 bytes to force DNS through ICMP only",
        ],
        "answers": [0, 1],
        "explanation": (
            "Gateway reachability with working IP-literal access points to DNS configuration or DNS service failure. "
            "Confirming assigned DNS servers and testing with nslookup/dig isolates the fault. Coax swaps, killing IPv4, "
            "or tiny MTUs are unrelated distractions."
        ),
        "distractor_analysis": {
            "2": "DNS does not require coaxial cabling; Ethernet patch quality is unrelated to this symptom pattern.",
            "3": "Disabling IPv4 would break the working IP connectivity the users already have.",
            "4": "An MTU of 64 bytes would break most traffic and is not a DNS troubleshooting step.",
        },
        "tags": ["dns", "troubleshooting", "vlan"],
    },
    # ---- ORDER (6) ----
    {
        "id": "C1N-I-013",
        "objective": "3.7",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the correct steps to safely clear a paper jam on a networked laser printer in a "
            "shared office without causing a fuser burn injury or a second jam."
        ),
        "sequence": [
            "Power down the printer and allow the fuser area to cool before opening covers",
            "Open the indicated access doors and remove loose sheets in the path of the paper sensors",
            "Check trays and rollers for scraps, then reseat paper stacks within the guide marks",
            "Close all covers, power on, clear residual error messages, and print a test page",
        ],
        "explanation": (
            "Laser printers store heat in the fuser; powering down and cooling prevents burns. Clearing the path and "
            "trays removes the physical obstruction, then a controlled power-on and test page confirms the sensors and "
            "path are clear. Skipping cooldown or test verification invites injury or repeat jams."
        ),
        "tags": ["printers", "safety", "laser"],
    },
    {
        "id": "C1N-I-014",
        "objective": "5.1",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "A new CPU and cooler were installed in a tower workstation that now fails to POST with "
            "no video. Order the technician's hardware isolation sequence."
        ),
        "sequence": [
            "Disconnect power, ground yourself, and reseat the CPU cooler and power connectors",
            "Reseat RAM in known-good slots and remove nonessential PCIe cards",
            "Attempt POST with minimal hardware and listen for beep codes or check diagnostic LEDs",
            "If still dead, test with a known-good PSU rail set or alternate power supply",
            "Document findings and escalate to motherboard/CPU RMA only after isolation fails",
        ],
        "explanation": (
            "POST failures after CPU work usually come from seating, power, or memory issues. Minimal configuration and "
            "beep/LED codes narrow the fault before swapping the PSU, and RMA is last after isolation. Jumping straight "
            "to motherboard replacement wastes time and parts."
        ),
        "tags": ["post", "cpu", "troubleshooting"],
    },
    {
        "id": "C1N-I-015",
        "objective": "2.8",
        "type": "order",
        "difficulty": "hard",
        "question": (
            "Order the steps to troubleshoot intermittent packet loss between two datacenter racks "
            "that share an LACP uplink pair."
        ),
        "sequence": [
            "Confirm the symptom window and capture interface error counters on both ends of the LACP bundle",
            "Inspect optics/DAC seating, TX/RX light levels, and physical damage on each member link",
            "Failover or shut one member at a time to determine whether loss tracks a single link",
            "Correct the bad member (reseating, replacement, or config mismatch) and re-enable the bundle",
            "Validate with sustained iperf/RFC2544 style traffic and clear monitoring alerts",
        ],
        "explanation": (
            "Start with counters to prove which interfaces err, then inspect physical media, isolate members under "
            "controlled failover, repair the bad link, and validate. Skipping isolation can leave a flapping member "
            "poisoning the aggregate."
        ),
        "tags": ["lacp", "optics", "network-troubleshooting"],
    },
    {
        "id": "C1N-I-016",
        "objective": "3.3",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the correct procedure to upgrade RAM in a dual-channel desktop that must remain "
            "on matched kits after the upgrade."
        ),
        "sequence": [
            "Shut down, unplug AC, and discharge residual power by holding the power button",
            "Open the case, release DIMM latches, and remove the old modules if replacing them",
            "Install the matched kit in the motherboard's documented dual-channel slot pairs",
            "Reassemble, boot into UEFI/OS, and verify capacity, speed, and dual-channel status",
        ],
        "explanation": (
            "Safe power removal prevents shorts. Correct slot pairing preserves dual-channel bandwidth. Verification in "
            "UEFI/OS confirms the kit trained at the expected speed and capacity. Installing mismatched singles in wrong "
            "slots often falls back to single-channel or fails to train."
        ),
        "tags": ["ram", "dual-channel", "upgrade"],
    },
    {
        "id": "C1N-I-017",
        "objective": "4.2",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "Order the high-level steps to stand up a new IaaS workload in a public cloud account "
            "for a three-tier web application."
        ),
        "sequence": [
            "Define regions, networking (VPC/VNet), subnets, and security groups/NSGs",
            "Provision compute, managed database, and load-balanced web tiers",
            "Configure identity roles, secrets, and encrypted storage for each tier",
            "Deploy application artifacts and run connectivity health checks",
            "Enable monitoring/alerts and document the runbook for on-call staff",
        ],
        "explanation": (
            "Cloud IaaS builds from network and security boundaries outward, then compute/data, then identity and "
            "encryption, then application deploy and observability. Provisioning VMs before network controls often "
            "creates overly open defaults that must be reworked."
        ),
        "tags": ["cloud", "iaas", "deployment"],
    },
    {
        "id": "C1N-I-018",
        "objective": "5.4",
        "type": "order",
        "difficulty": "medium",
        "question": (
            "A company phone overheats, randomly reboots, and will not join the corporate WLAN after "
            "a failed OS update. Order the mobile troubleshooting steps."
        ),
        "sequence": [
            "Remove the case, inspect for swelling, and let the device cool away from direct sun",
            "Boot to safe/diagnostic mode if available and note whether reboots continue",
            "Forget/rejoin WLAN and verify date/time, certificates, and VPN profiles",
            "Install the deferred OS/security update over a known-good network path",
            "If unstable, back up business data and factory-reset or replace under MDM policy",
        ],
        "explanation": (
            "Thermal and battery safety come first. Isolating software vs hardware with safe mode, then repairing WLAN "
            "identity, then completing the update, and finally reset/replace follows least-destructive order for managed "
            "phones."
        ),
        "tags": ["mobile", "troubleshooting", "wlan"],
    },
    # ---- MATCH (6) ----
    {
        "id": "C1N-I-019",
        "objective": "2.1",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each common service to the transport port it typically uses.",
        "pairs": [
            {"left": "HTTPS web management", "right": "TCP 443"},
            {"left": "SSH remote shell", "right": "TCP 22"},
            {"left": "DNS queries", "right": "UDP/TCP 53"},
            {"left": "RDP sessions", "right": "TCP 3389"},
            {"left": "SMTP mail submission (legacy cleartext)", "right": "TCP 25"},
        ],
        "explanation": (
            "These well-known ports appear constantly on A+ networking items: 443 HTTPS, 22 SSH, 53 DNS, 3389 RDP, and "
            "25 SMTP. Memorizing the service-to-port map speeds firewall ACL reviews and packet captures."
        ),
        "tags": ["ports", "protocols", "match"],
    },
    {
        "id": "C1N-I-020",
        "objective": "2.7",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each copper cable type to its common datacenter or office use case.",
        "pairs": [
            {"left": "Cat6A UTP", "right": "10 GbE up to 100 m in structured cabling"},
            {"left": "Direct-attach copper (DAC)", "right": "Short twinax links between ToR switch and server NIC"},
            {"left": "Plenum-rated jacket", "right": "Cable runs through air-handling spaces meeting fire code"},
            {"left": "Shielded twisted pair (STP)", "right": "High-EMI areas near industrial motors or RF sources"},
        ],
        "explanation": (
            "Cat6A supports 10 GbE at standard horizontal distances, DAC covers short rack interconnects, plenum jackets "
            "meet fire codes in air spaces, and STP helps in noisy EMI environments. Matching media to environment "
            "prevents intermittent CRC errors and failed inspections."
        ),
        "tags": ["cabling", "cat6a", "dac"],
    },
    {
        "id": "C1N-I-021",
        "objective": "3.1",
        "type": "match",
        "difficulty": "easy",
        "question": "Match each connector or interface to the device class it most often serves.",
        "pairs": [
            {"left": "RJ45", "right": "Twisted-pair Ethernet network drop"},
            {"left": "USB-C with PD", "right": "Laptop charging and docking data/video"},
            {"left": "SATA data connector", "right": "Internal HDD/SSD attachment to motherboard"},
            {"left": "LC duplex", "right": "Fiber patch to switch or transceiver"},
            {"left": "Molex / SATA power", "right": "Drive and peripheral DC power from PSU"},
        ],
        "explanation": (
            "Technicians must map physical connectors quickly: RJ45 for copper Ethernet, USB-C PD for modern laptops, "
            "SATA for internal drives, LC for fiber, and Molex/SATA power for DC feeds. Mis-identifying these slows "
            "rack work and causes bent pins."
        ),
        "tags": ["connectors", "peripherals"],
    },
    {
        "id": "C1N-I-022",
        "objective": "3.8",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each printer technology to the maintenance item a technician most often services.",
        "pairs": [
            {"left": "Laser printer", "right": "Toner cartridge and fuser kit replacement"},
            {"left": "Inkjet printer", "right": "Ink cartridges and printhead cleaning cycles"},
            {"left": "Thermal receipt printer", "right": "Heat-sensitive paper rolls and printhead care"},
            {"left": "Impact / dot-matrix", "right": "Ribbon cartridge and tractor-feed alignment"},
        ],
        "explanation": (
            "Laser systems center on toner and fusers, inkjets on ink and head cleaning, thermal printers on special "
            "paper and head care, and impact printers on ribbons and tractor feeds. Knowing the consumable map avoids "
            "wrong-part truck rolls."
        ),
        "tags": ["printers", "maintenance"],
    },
    {
        "id": "C1N-I-023",
        "objective": "4.2",
        "type": "match",
        "difficulty": "medium",
        "question": "Match each cloud service model to what the customer typically manages.",
        "pairs": [
            {"left": "IaaS", "right": "Customer manages OS, middleware, and applications on rented VMs"},
            {"left": "PaaS", "right": "Customer deploys apps/code while provider manages runtime platform"},
            {"left": "SaaS", "right": "Customer uses the application; provider runs the full stack"},
            {"left": "Shared responsibility (general)", "right": "Provider secures cloud; customer secures data and access in cloud"},
        ],
        "explanation": (
            "IaaS still leaves OS and apps to the customer, PaaS shifts the runtime to the provider, SaaS delivers the "
            "app itself, and shared responsibility always leaves identity and data controls with the customer. These "
            "distinctions drive who patches what."
        ),
        "tags": ["cloud", "iaas", "paas", "saas"],
    },
    {
        "id": "C1N-I-024",
        "objective": "5.3",
        "type": "match",
        "difficulty": "hard",
        "question": "Match each motherboard symptom to the most likely hardware cause.",
        "pairs": [
            {"left": "No POST, CPU fan spins, no beep codes on speaker-equipped board", "right": "CPU/power delivery or fatal early initialization fault"},
            {"left": "POST completes but no local video on a discrete GPU system", "right": "GPU seating, GPU power cables, or display cable path"},
            {"left": "Continuous memory beep pattern after a RAM upgrade", "right": "Incompatible or improperly seated DIMMs"},
            {"left": "Boots then thermal shutdown under load within minutes", "right": "Cooler mount failure, dried thermal paste, or blocked airflow"},
            {"left": "Clock / boot order resets every cold start", "right": "Dead CMOS battery or corrupted UEFI NVRAM settings"},
        ],
        "explanation": (
            "Symptom-to-cause matching is core hardware troubleshooting: silent no-POST points early CPU/power issues, "
            "video-only failures implicate the GPU path, memory beeps implicate DIMMs, rapid thermal trips implicate "
            "cooling, and settings loss implicates CMOS/NVRAM."
        ),
        "tags": ["motherboard", "post", "troubleshooting"],
    },
]


def _assert_quality(q):
    assert "—" not in json.dumps(q) and "–" not in json.dumps(q)
    assert len(q["explanation"]) >= 120
    if q["type"] == "multi":
        assert len(q["options"]) == 5
        assert len(q["answers"]) == 2
        assert q["answers"] == sorted(q["answers"])
        assert q["question"].rstrip().endswith("(Select TWO.)")
        wrong = [str(i) for i in range(5) if i not in q["answers"]]
        assert set(q["distractor_analysis"].keys()) == set(wrong)
    elif q["type"] == "order":
        assert 4 <= len(q["sequence"]) <= 6
    elif q["type"] == "match":
        assert 4 <= len(q["pairs"]) <= 5


def main():
    questions = []
    for raw in QUESTIONS:
        obj = raw["objective"]
        if obj not in OBJECTIVES:
            raise SystemExit(f"Unknown objective {obj}")
        _assert_quality(raw)
        item = {
            "id": raw["id"],
            "exam": "core1",
            "domain": OBJECTIVES[obj]["domain"],
            "objective": obj,
            "type": raw["type"],
            "difficulty": raw["difficulty"],
            "question": raw["question"],
            "explanation": raw["explanation"],
            "video_reference": None,
            "notes_reference": NOTES[obj],
            "tags": raw.get("tags", []),
        }
        if raw["type"] == "multi":
            item["options"] = raw["options"]
            item["answers"] = raw["answers"]
            item["distractor_analysis"] = raw["distractor_analysis"]
        elif raw["type"] == "order":
            item["sequence"] = raw["sequence"]
        elif raw["type"] == "match":
            item["pairs"] = raw["pairs"]
        questions.append(item)

    # collapse whitespace in stems for consistency
    for q in questions:
        q["question"] = re.sub(r"\s+", " ", q["question"]).strip()

    out = os.path.join(ROOT, "_bank", "shards", "core1_itemtypes.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"questions": questions}, f, indent=2, ensure_ascii=False)

    from collections import Counter
    types = Counter(q["type"] for q in questions)
    print(f"Generated {len(questions)} questions -> {out}")
    print(f"  types={dict(types)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
