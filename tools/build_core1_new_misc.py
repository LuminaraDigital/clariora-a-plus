#!/usr/bin/env python3
"""Build the NEW-C1V shard: 25 new Core 1 datacenter-grade questions:
16 Virtualization/Cloud (4.1-4.2), 5 Mobile (1.1-1.3), 4 Networking (2.1-2.8).
Prefix: C1N-V-001..025.
Types: 20 single, 3 multi, 1 order, 1 match.

Run from ROOT:  python tools/build_core1_new_misc.py
Output:         _bank/shards/core1_new_misc.json
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

VIDEOS = {
    "1.1": {"title": "Laptop Hardware - CompTIA A+ 220-1201 - 1.1", "url": "https://www.youtube.com/watch?v=zODZ0i-Iark", "duration": "16:42", "objective": "1.1"},
    "1.2": {"title": "Mobile Device Accessories - CompTIA A+ 220-1201 - 1.2", "url": "https://www.youtube.com/watch?v=14iM8lLBS0c", "duration": "7:18", "objective": "1.2"},
    "1.3": {"title": "Mobile Device Management - CompTIA A+ 220-1201 - 1.3", "url": "https://www.youtube.com/watch?v=NhGi9M4JP7g", "duration": "8:31", "objective": "1.3"},
    "2.1": {"title": "Common Ports - CompTIA A+ 220-1201 - 2.1", "url": "https://www.youtube.com/watch?v=_qGlbfZ44hg", "duration": "12:52", "objective": "2.1"},
    "2.4": {"title": "VLANs and VPNs - CompTIA A+ 220-1201 - 2.4", "url": "https://www.youtube.com/watch?v=Z1wPgxsx4GI", "duration": "7:32", "objective": "2.4"},
    "2.5": {"title": "Network Devices - CompTIA A+ 220-1201 - 2.5", "url": "https://www.youtube.com/watch?v=0hd6_bx0ydo", "duration": "18:01", "objective": "2.5"},
    "2.6": {"title": "IPv4 and IPv6 - CompTIA A+ 220-1201 - 2.6", "url": "https://www.youtube.com/watch?v=yubEz-ZEVwY", "duration": "8:45", "objective": "2.6"},
    "4.1": {"title": "Virtualization Concepts - CompTIA A+ 220-1201 - 4.1", "url": "https://www.youtube.com/watch?v=xXOIdDWUNGU", "duration": "5:45", "objective": "4.1"},
    "4.2": {"title": "Cloud Models - CompTIA A+ 220-1201 - 4.2", "url": "https://www.youtube.com/watch?v=KZxAY5ssUxc", "duration": "9:48", "objective": "4.2"},
}

NOTES = {
    "1.1": "15_Mobile_Devices_and_Laptops.md",
    "1.2": "15_Mobile_Devices_and_Laptops.md",
    "1.3": "15_Mobile_Devices_and_Laptops.md",
    "2.1": "12_Ports_Protocols_Network_Services.md",
    "2.4": "13_DHCP_DNS_VLAN_VPN_Network_Troubleshooting.md",
    "2.5": "09_Network_Types_Hardware_Cabling.md",
    "2.6": "11_Internet_Connections_TCPIP_Addressing.md",
    "4.1": "14_Virtualization_and_Cloud.md",
    "4.2": "14_Virtualization_and_Cloud.md",
}

DOMAINS = {
    "1.1": "1.0 Mobile Devices",
    "1.2": "1.0 Mobile Devices",
    "1.3": "1.0 Mobile Devices",
    "2.1": "2.0 Networking",
    "2.4": "2.0 Networking",
    "2.5": "2.0 Networking",
    "2.6": "2.0 Networking",
    "4.1": "4.0 Virtualization and Cloud Computing",
    "4.2": "4.0 Virtualization and Cloud Computing",
}

QUESTIONS = [
    # 4.1 Virtualization Concepts (8 questions)
    {
        "id": "C1N-V-001",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A datacenter infrastructure engineer is deploying a cluster of high-density blade servers to host hundreds of production virtual machines. The design requires minimal hypervisor overhead and direct control of the underlying physical hardware without an intermediate operating system. Which virtualization architecture meets these requirements?",
        "options": [
            "Type 1 bare-metal hypervisor installed directly on the physical host hardware",
            "Type 2 hosted hypervisor running as an application on a general-purpose host OS",
            "Kernel-based application virtualization container engine with user-mode drivers",
            "Software-emulated instruction translation layer executing within a guest workspace"
        ],
        "answer": 0,
        "explanation": "A Type 1 bare-metal hypervisor (such as VMware ESXi, Microsoft Hyper-V Server, or KVM) installs directly on the host server hardware without requiring a underlying host operating system. This provides maximum I/O performance, lower latency, and reduced resource overhead for enterprise datacenter workloads. A Type 2 hypervisor relies on a host OS, introducing latency and resource contention. Container engines share the host kernel rather than provisioning full hardware-isolated VMs. Software instruction emulation incurs heavy translation overhead.",
        "distractor_analysis": {
            "1": "Type 2 hosted hypervisors execute on top of a general-purpose host OS, introducing additional latency, security surface, and memory overhead unsuitable for high-density production blades.",
            "2": "Container engines provide OS-level isolation sharing a single kernel, but do not provide direct hardware hypervisor abstraction for varied guest operating systems.",
            "3": "Software instruction translation emulates CPU architectures via software routines, causing severe performance degradation compared to bare-metal execution."
        },
        "tags": ["virtualization", "hypervisor", "type-1", "datacenter"]
    },
    {
        "id": "C1N-V-002",
        "objective": "4.1",
        "type": "single",
        "difficulty": "hard",
        "question": "A systems administrator is configuring a virtual switch on an enterprise hypervisor host that connects to dual 25GbE physical uplinks. The host must isolate management traffic, live VM migration traffic, and tenant production networks while utilizing the same physical interfaces. Which networking technology should the administrator configure on the virtual switch port groups?",
        "options": [
            "IEEE 802.1Q VLAN tagging on distinct port groups",
            "Static NAT rules for every tenant virtual machine interface",
            "Proxy ARP forwarding across the physical NIC team",
            "Port mirroring on the hypervisor uplink switch ports"
        ],
        "answer": 0,
        "explanation": "IEEE 802.1Q VLAN tagging allows multiple logical networks (management, vMotion/live migration, storage, and tenant VLANs) to share trunked physical network adapters on the hypervisor host while maintaining complete Layer 2 traffic isolation. Static NAT provides Layer 3 address translation rather than Layer 2 network segmentation. Proxy ARP allows a router to answer ARP requests for remote networks but does not segment hypervisor traffic. Port mirroring copies packets for traffic analysis and does not isolate networks.",
        "distractor_analysis": {
            "1": "Static NAT operates at Layer 3 to translate IP addresses and does not provide hypervisor-level broadcast isolation or multi-network trunking.",
            "2": "Proxy ARP resolves MAC addresses on behalf of remote subnets and does not create segregated traffic planes for management or migration.",
            "3": "Port mirroring duplicates packets to a monitoring probe or sniffer and does not logically isolate VM traffic streams."
        },
        "tags": ["virtualization", "vswitch", "vlan", "802.1q"]
    },
    {
        "id": "C1N-V-003",
        "objective": "4.1",
        "type": "single",
        "difficulty": "easy",
        "question": "A technician is setting up a new multi-socket physical server to run hardware-accelerated 64-bit guest virtual machines. When launching the hypervisor installation, the setup wizard halts with an error stating hardware virtualization extensions are unavailable. Which system firmware setting must the technician enable?",
        "options": [
            "Intel VT-x or AMD-V in the system UEFI firmware",
            "Secure Boot custom certificate revocation list",
            "PCIe Active State Power Management in power profiles",
            "TPM 2.0 platform hierarchy authentication keys"
        ],
        "answer": 0,
        "explanation": "Intel VT-x and AMD-V are hardware virtualization extensions implemented in the CPU and exposed through UEFI/BIOS firmware settings. Enabling them provides hardware support for hypervisors to run guest operating systems with near-native execution efficiency. Secure Boot validates signed bootloader binaries but does not provide CPU virtualization extensions. PCIe power management regulates bus link power states. TPM 2.0 provides cryptographic measurement and key storage.",
        "distractor_analysis": {
            "1": "Secure Boot verifies digital signatures of boot components during startup and does not enable CPU virtualization extensions.",
            "2": "PCIe power management controls link power states and has no bearing on processor virtualization features.",
            "3": "TPM 2.0 provides hardware-based security keys and measured boot capabilities, but is not responsible for CPU hypervisor instruction sets."
        },
        "tags": ["virtualization", "cpu", "uefi", "vt-x"]
    },
    {
        "id": "C1N-V-004",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A software development team wants to deploy lightweight, microservice-based applications that start in milliseconds and share the host operating system kernel without running a full guest OS for each instance. Which technology should the infrastructure team implement?",
        "options": [
            "Application containerization using cgroups and namespaces",
            "Type 1 bare-metal virtualization with thick-provisioned disks",
            "Hardware emulation via an instruction set translation engine",
            "Virtual Desktop Infrastructure with persistent user profiles"
        ],
        "answer": 0,
        "explanation": "Application containerization (such as Docker or Podman) isolates applications using host OS kernel features like control groups (cgroups) and namespaces. Containers share the underlying host operating system kernel, making them extremely lightweight, fast to instantiate, and resource-efficient compared to full virtual machines. Type 1 virtualization runs separate guest operating systems with dedicated kernels and memory spaces. Hardware emulation creates simulated hardware through software routines. VDI provides complete desktop environments to end users.",
        "distractor_analysis": {
            "1": "Type 1 hypervisors boot complete independent guest operating systems, each requiring its own kernel, memory footprint, and storage allocations.",
            "2": "Hardware emulation translates CPU instructions between architectures in software, which is significantly slower than kernel containerization.",
            "3": "Virtual Desktop Infrastructure delivers full interactive desktop operating system sessions to remote clients, which does not fit lightweight microservices."
        },
        "tags": ["virtualization", "containers", "docker", "microservices"]
    },
    {
        "id": "C1N-V-005",
        "objective": "4.1",
        "type": "single",
        "difficulty": "hard",
        "question": "A datacenter lab technician needs to configure a test environment where a virtualized Hyper-V or ESXi hypervisor runs inside a parent virtual machine to validate cluster failover scripts without purchasing additional hardware. What feature must be enabled on the parent VM's CPU configuration?",
        "options": [
            "Nested virtualization hardware extension pass-through",
            "Dynamic memory ballooning with unreserved swap space",
            "SR-IOV direct physical adapter device assignment",
            "NUMA node spanning across multiple socket domains"
        ],
        "answer": 0,
        "explanation": "Nested virtualization exposes hardware-assisted virtualization extensions (Intel VT-x / AMD-V) from the physical CPU through the parent hypervisor into the guest virtual machine. This allows the guest VM to install and run its own hypervisor layer to spawn child virtual machines. Memory ballooning reclaims idle RAM across VMs but does not expose CPU virtualization instructions. SR-IOV bypasses the virtual switch for physical NIC performance. NUMA spanning balances memory access across CPU sockets.",
        "distractor_analysis": {
            "1": "Memory ballooning allows the hypervisor to reclaim unused memory from guest OSes, but does not provide nested CPU instruction pass-through.",
            "2": "Single Root I/O Virtualization (SR-IOV) enables direct PCIe access for network adapters to reduce packet latency, not nested hypervisor execution.",
            "3": "NUMA node spanning controls how virtual memory maps across physical CPU memory controllers and does not enable hypervisors inside VMs."
        },
        "tags": ["virtualization", "nested-virtualization", "hypervisor"]
    },
    {
        "id": "C1N-V-006",
        "objective": "4.1",
        "type": "multi",
        "difficulty": "medium",
        "question": "A storage architect is designing the backend SAN connectivity for an enterprise hypervisor cluster to support high-availability VM shared storage and live migration. Which TWO block-level storage protocol options are commonly used to attach shared LUNs across the hypervisor cluster? (Select TWO.)",
        "options": [
            "iSCSI over standard Gigabit or 10GbE IP networks",
            "Fibre Channel over dedicated optical storage fabrics",
            "Server Message Block (SMB 1.0) over legacy NetBIOS",
            "Simple Network Management Protocol (SNMPv3)",
            "Network Time Protocol (NTP) over UDP port 123"
        ],
        "answers": [0, 1],
        "explanation": "iSCSI and Fibre Channel (FC) are standard enterprise block-level storage protocols used to connect hypervisor hosts to Storage Area Networks (SANs). iSCSI encapsulates SCSI commands in IP packets over standard Ethernet, while Fibre Channel uses dedicated optical switches and host bus adapters (HBAs) to present block LUNs for clustered VM datastores. SMB 1.0 is an obsolete and insecure file-level protocol. SNMPv3 is a network monitoring protocol. NTP is a network time synchronization protocol.",
        "distractor_analysis": {
            "2": "SMB 1.0 is a legacy, insecure file-sharing protocol that is deprecated and does not provide enterprise SAN block-level storage access.",
            "3": "SNMPv3 is a management protocol used to query device health, metrics, and trap alerts, not a storage protocol.",
            "4": "NTP synchronizes clock time across network nodes using UDP port 123 and does not transmit storage commands or data blocks."
        },
        "tags": ["virtualization", "san", "iscsi", "fibre-channel"]
    },
    {
        "id": "C1N-V-007",
        "objective": "4.1",
        "type": "match",
        "difficulty": "hard",
        "question": "Match each virtualization component to its correct operational description.",
        "pairs": [
            {"left": "Type 1 Hypervisor", "right": "Executes directly on bare-metal server hardware with no intermediary host OS"},
            {"left": "Type 2 Hypervisor", "right": "Runs as an application inside an existing host operating system"},
            {"left": "Virtual Switch", "right": "Provides Layer 2 packet forwarding and VLAN segmentation between VMs on a host"},
            {"left": "Container Engine", "right": "Shares the host OS kernel to run isolated user-space application processes"},
            {"left": "Virtual Disk Image", "right": "Encapsulates the guest VM file system and partitions into a VHDX or VMDK file"}
        ],
        "explanation": "A Type 1 hypervisor runs directly on the bare-metal physical host. A Type 2 hypervisor runs as an application atop a standard host operating system. A Virtual Switch provides Layer 2 forwarding and VLAN isolation inside the hypervisor. A Container Engine utilizes kernel namespaces and control groups to run lightweight isolated processes sharing one kernel. A Virtual Disk Image (such as VHDX or VMDK) encapsulates the complete guest OS storage subsystem into a portable file.",
        "tags": ["virtualization", "components", "hypervisor", "architecture"]
    },
    {
        "id": "C1N-V-008",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "An administrator notices that the total provisioned virtual RAM allocated to all active VMs on a hypervisor host exceeds the physical RAM installed in the host chassis, yet the VMs continue operating normally without paging to disk. Which hypervisor resource management technique makes this possible?",
        "options": [
            "Memory overcommitment and transparent page sharing",
            "Direct Memory Access hardware channel multiplexing",
            "Static non-volatile RAM cache write-back flushing",
            "Asymmetric multiprocessing task offloading"
        ],
        "answer": 0,
        "explanation": "Memory overcommitment (supported by techniques like transparent page sharing, memory ballooning, and deduplication) allows a hypervisor to allocate more virtual memory to guest machines than the physical RAM installed in the server. Because VMs rarely consume 100 percent of their allocated memory simultaneously, identical pages are shared and unused pages remain unbacked by physical memory. DMA multiplexing is a bus protocol. NVRAM caching accelerates storage writes. Asymmetric multiprocessing assigns specific tasks to different CPUs.",
        "distractor_analysis": {
            "1": "Direct Memory Access (DMA) allows peripherals to communicate directly with memory and does not handle virtual memory overcommit allocations.",
            "2": "Non-volatile RAM write caching preserves unwritten disk blocks during power outages and does not manage hypervisor host RAM oversubscription.",
            "3": "Asymmetric multiprocessing is an OS scheduling model distributing tasks unevenly across processors, unrelated to memory overcommitment."
        },
        "tags": ["virtualization", "memory", "resource-management"]
    },

    # 4.2 Cloud Models and Characteristics (8 questions)
    {
        "id": "C1N-V-009",
        "objective": "4.2",
        "type": "single",
        "difficulty": "easy",
        "question": "An enterprise company migrates its on-premises customer relationship management software to Salesforce. The cloud service provider manages the physical infrastructure, operating systems, database servers, and application updates, while the company only configures user accounts and business data. Which cloud service model is being utilized?",
        "options": [
            "Software as a Service (SaaS)",
            "Infrastructure as a Service (IaaS)",
            "Platform as a Service (PaaS)",
            "Desktop as a Service (DaaS)"
        ],
        "answer": 0,
        "explanation": "Software as a Service (SaaS) delivers complete end-user applications over the internet where the cloud provider manages all underlying hardware, networking, operating systems, patches, and middleware. The client is only responsible for managing their application data and user access. IaaS provides raw compute, storage, and networking where the client installs and manages the OS. PaaS provides a runtime environment and database tools for developers. DaaS delivers virtualized desktop operating systems.",
        "distractor_analysis": {
            "1": "IaaS provides bare compute instances, block storage, and virtual networking, leaving the customer responsible for installing and patching the OS and applications.",
            "2": "PaaS provides a framework and runtime engine for developers to build applications without managing OS patching, but does not provide turnkey business applications.",
            "3": "DaaS delivers full virtualized desktop workspaces to end-user client devices, not a specialized browser-accessible web application."
        },
        "tags": ["cloud", "saas", "service-models"]
    },
    {
        "id": "C1N-V-010",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "A financial institution maintains strict compliance policies requiring customer transactional records to remain in an on-premises air-gapped datacenter. However, the bank uses a public cloud provider to run resource-intensive AI analytics on anonymized data models. Which cloud deployment model describes this environment?",
        "options": [
            "Hybrid cloud",
            "Community cloud",
            "Private cloud",
            "Public cloud"
        ],
        "answer": 0,
        "explanation": "A hybrid cloud combines private (on-premises datacenter) infrastructure with public cloud resources, linked by secure networking (such as IPsec VPN or dedicated Direct Connect circuits) to enable data and application portability while meeting compliance and elasticity requirements. A private cloud is dedicated entirely to a single organization. A public cloud provides shared resources open to the public. A community cloud shares infrastructure among multiple organizations with common regulatory or mission objectives.",
        "distractor_analysis": {
            "1": "Community cloud refers to shared infrastructure pooled across distinct organizations with shared compliance or security mandates (e.g., government agencies).",
            "2": "Private cloud exists solely for a single organization behind their own firewall or dedicated facility, without public cloud resource integration.",
            "3": "Public cloud infrastructure is owned and operated entirely off-premises by a third-party multi-tenant provider."
        },
        "tags": ["cloud", "hybrid-cloud", "deployment-models"]
    },
    {
        "id": "C1N-V-011",
        "objective": "4.2",
        "type": "single",
        "difficulty": "hard",
        "question": "An e-commerce website experiences massive traffic spikes during annual holiday flash sales. The operations team configures auto-scaling groups to automatically spin up additional virtual server instances when CPU utilization exceeds 75% and terminate them when traffic subsides. Which cloud computing characteristic is demonstrated?",
        "options": [
            "Rapid elasticity",
            "Measured service",
            "Resource pooling",
            "Broad network access"
        ],
        "answer": 0,
        "explanation": "Rapid elasticity is the ability of cloud computing systems to automatically scale resources out (adding instances) and scale in (removing instances) dynamically in response to real-time workload demand. Measured service refers to tracking resource consumption for billing and metering. Resource pooling describes the provider dynamically assigning multi-tenant physical resources to multiple consumers. Broad network access means services are accessible over standard network mechanisms from diverse client devices.",
        "distractor_analysis": {
            "1": "Measured service refers to tracking metrics (bandwidth, compute hours, storage) for metering and cost accounting, not dynamic capacity scaling.",
            "2": "Resource pooling describes how the cloud provider pools physical compute and storage across multiple tenants using virtualization abstraction.",
            "3": "Broad network access ensures services are available across the network via standard protocols and thin/thick client platforms."
        },
        "tags": ["cloud", "elasticity", "auto-scaling", "characteristics"]
    },
    {
        "id": "C1N-V-012",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "In the cloud shared responsibility model for an Infrastructure as a Service (IaaS) deployment, which task remains the sole responsibility of the customer rather than the cloud service provider?",
        "options": [
            "Applying security patches to the guest operating system",
            "Replacing failed physical hard drives in storage arrays",
            "Upgrading the firmware on the physical datacenter core routers",
            "Maintaining physical access security and biometric controls at the facility"
        ],
        "answer": 0,
        "explanation": "In an IaaS deployment, the cloud service provider is responsible for the security 'of' the cloud (physical datacenter security, power, environmental controls, physical servers, hypervisors, and core networking). The customer is responsible for security 'in' the cloud, including the guest operating system installation, OS security patches, network firewall rules, middleware, and application data. Physical drive replacement, router firmware, and facility security are all provider responsibilities.",
        "distractor_analysis": {
            "1": "The cloud provider owns and maintains all physical hardware, including replacing failed storage drives in SAN arrays.",
            "2": "Physical network infrastructure, switches, and edge router firmware are managed exclusively by the cloud provider.",
            "3": "Physical datacenter perimeter security, guards, and biometric controls are solely the responsibility of the cloud facility operator."
        },
        "tags": ["cloud", "iaas", "shared-responsibility", "security"]
    },
    {
        "id": "C1N-V-013",
        "objective": "4.2",
        "type": "multi",
        "difficulty": "hard",
        "question": "An enterprise is planning a migration to public cloud infrastructure and wants to ensure their financial governance model aligns with cloud economics. Which TWO essential cloud characteristics define how resource consumption is tracked and automatically billed? (Select TWO.)",
        "options": [
            "Measured service where resource usage is monitored and billed on actual consumption",
            "On-demand self-service allowing users to provision resources without human provider interaction",
            "Fixed-rate capital expenditure licensing requiring five-year hardware amortization",
            "Static perimeter network air-gapping preventing internet connectivity",
            "Manual ticketing provisioning with mandatory multi-week lead times"
        ],
        "answers": [0, 1],
        "explanation": "Measured service and On-demand self-service are two NIST-defined essential characteristics of cloud computing. Measured service allows cloud systems to automatically control, monitor, and optimize resource usage through metering (compute hours, storage gigabytes, bandwidth) providing transparent pay-as-you-go billing. On-demand self-service empowers consumers to unilaterally provision computing capabilities as needed without human interaction from the service provider. Fixed Capex, static air-gapping, and multi-week manual ticketing contradict cloud elasticity and operational agility.",
        "distractor_analysis": {
            "2": "Cloud shifts IT spending from Capital Expenditure (CapEx) to Operational Expenditure (OpEx), avoiding long-term physical hardware amortization.",
            "3": "Air-gapping isolates networks completely, whereas cloud relies on broad network access and defined security boundary controls.",
            "4": "Manual multi-week provisioning queues represent legacy IT operational bottlenecks that cloud on-demand automation eliminates."
        },
        "tags": ["cloud", "characteristics", "nist", "measured-service"]
    },
    {
        "id": "C1N-V-014",
        "objective": "4.2",
        "type": "single",
        "difficulty": "easy",
        "question": "A medical clinic deploys low-power thin client terminals at examination rooms. The terminals do not run local operating systems or store patient files locally; instead, each terminal connects to a virtual desktop running Windows 11 in a centralized datacenter. Which cloud solution is implemented?",
        "options": [
            "Virtual Desktop Infrastructure (VDI) / Desktop as a Service (DaaS)",
            "Storage as a Service (STaaS) object bucket repository",
            "Platform as a Service (PaaS) web application container",
            "Function as a Service (FaaS) serverless event trigger"
        ],
        "answer": 0,
        "explanation": "Virtual Desktop Infrastructure (VDI) or Desktop as a Service (DaaS) hosts desktop operating system environments inside virtual machines on centralized datacenter servers. End users interact with their desktops via thin clients or remote display protocols (such as RDP, Citrix HDX, or VMware Blast). Storage as a Service provides object or file storage. PaaS provides application runtimes for developers. FaaS executes serverless code in response to events.",
        "distractor_analysis": {
            "1": "Storage as a Service provides raw file or object repositories (e.g., S3 buckets) and does not host interactive user desktop operating systems.",
            "2": "PaaS provides development stacks, database runtimes, and APIs for building software, not end-user desktop interfaces.",
            "3": "Function as a Service runs ephemeral code blocks upon specific triggers (serverless compute) without persistent user interface sessions."
        },
        "tags": ["cloud", "vdi", "daas", "thin-client"]
    },
    {
        "id": "C1N-V-015",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "A datacenter administrator is establishing an off-site cloud backup repository for historical database snapshots that must be retained for seven years for regulatory audits. The files will rarely be accessed, but low storage cost per terabyte is critical. Which cloud storage tier should the administrator select?",
        "options": [
            "Archive / Glacier cold storage tier",
            "Hot / standard low-latency block storage tier",
            "High-IOPS solid-state drive instance store",
            "In-memory caching cluster repository"
        ],
        "answer": 0,
        "explanation": "Archive (or Glacier/Cold) storage tiers offer the lowest storage cost per terabyte for rarely accessed data, making them ideal for long-term compliance and historical backup retention. In exchange for low storage pricing, data retrieval takes minutes to hours and carries egress/retrieval fees. Hot storage is designed for frequently accessed data with higher per-gigabyte costs. High-IOPS instance store is volatile, high-performance local storage. In-memory caching uses RAM for ultra-fast transient queries.",
        "distractor_analysis": {
            "1": "Hot standard storage is optimized for frequent read/write access with low retrieval latency, carrying significantly higher monthly storage costs.",
            "2": "High-IOPS SSD instance storage is high-cost, high-speed local ephemeral storage attached directly to a compute node, not suitable for long-term archiving.",
            "3": "In-memory caching stores active data in volatile RAM for sub-millisecond application responses and is cost-prohibitive for 7-year retention."
        },
        "tags": ["cloud", "storage-tiers", "archive", "backup"]
    },
    {
        "id": "C1N-V-016",
        "objective": "4.2",
        "type": "order",
        "difficulty": "medium",
        "question": "Order the standard phases for migrating an on-premises enterprise application to a public cloud infrastructure.",
        "sequence": [
            "Perform asset discovery and map on-premises application dependencies and resource requirements",
            "Design cloud network topology, VPC subnets, routing tables, and security groups",
            "Replicate database data and server images to cloud storage endpoints",
            "Execute pilot test validation and perform non-disruptive failover drills in the cloud environment",
            "Perform final delta synchronization, update public DNS records, and cut over production traffic"
        ],
        "explanation": "A structured cloud migration follows a phased lifecycle: (1) Discovery and dependency mapping to understand application requirements, (2) Architectural network and security design (VPCs, subnets, firewall rules), (3) Initial data and VM replication to cloud storage, (4) Pilot testing and validation drills to ensure operational stability, and (5) Final delta synchronization followed by DNS cutover to redirect live users to the cloud environment.",
        "tags": ["cloud", "migration", "lifecycle", "planning"]
    },

    # 1.0 Mobile Devices (5 questions: 1.1-1.3)
    {
        "id": "C1N-V-017",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A mobile field engineer reports that their enterprise laptop trackpad has lifted above the palmrest, the lower chassis is bulging, and the device clicks inconsistently. What is the root cause and immediate safety procedure?",
        "options": [
            "The lithium-ion battery has swollen; immediately power down the laptop, disconnect AC power, and replace the battery safely",
            "The trackpad mounting screws have backed out; tighten the Phillips screws from underneath the motherboard",
            "The cooling fan has seized; clean the exhaust fins with compressed air to relieve thermal pressure",
            "The NVMe SSD is overheating; install a thermal pad between the drive and the bottom casing"
        ],
        "answer": 0,
        "explanation": "A swollen lithium-ion battery is a hazardous condition caused by gas buildup from internal cell degradation or thermal runaway. The expanding battery pushes upward against the trackpad and palmrest. The immediate action is to safely shut down the laptop, disconnect external AC power, avoid puncturing the battery, and replace it following hazardous materials disposal procedures. Tightening screws on a swollen battery risks puncturing cells and causing fire. Fan or SSD issues do not create physical chassis bulging.",
        "distractor_analysis": {
            "1": "Tightening screws or pressing down on a bulging chassis can puncture the lithium pouch, triggering a violent thermal fire.",
            "2": "A seized cooling fan causes thermal throttling and system shutdowns, but does not physically deform the trackpad or chassis.",
            "3": "An overheating NVMe SSD causes read/write throttling or storage errors, not mechanical chassis swelling."
        },
        "tags": ["mobile", "laptop", "battery", "safety"]
    },
    {
        "id": "C1N-V-018",
        "objective": "1.1",
        "type": "single",
        "difficulty": "hard",
        "question": "A technician is replacing a broken 15.6-inch IPS display panel on a modern corporate laptop. After securing the new panel to the display hinges, the technician must reconnect the delicate cable running from the motherboard into the LCD panel. What standard internal connector type is used for this display connection?",
        "options": [
            "Embedded DisplayPort (eDP) micro-coaxial connector",
            "Mini-DVI ribbon connector with analog RGB pins",
            "Serial ATA 7-pin data latching header",
            "Molex 4-pin peripheral power harness"
        ],
        "answer": 0,
        "explanation": "Modern laptop display panels connect to the system motherboard using an embedded DisplayPort (eDP) or LVDS micro-coaxial cable connector. eDP is the industry standard for internal laptop displays, supporting high refresh rates, high color depth, and integrated backlight power in a compact latching connector. Mini-DVI is a legacy external video port. SATA connects storage drives. Molex 4-pin is a desktop power connector.",
        "distractor_analysis": {
            "1": "Mini-DVI is an obsolete external video connector from older Apple laptops and is never used internally between a laptop motherboard and LCD panel.",
            "2": "SATA 7-pin data cables connect storage drives and lack the pins and signaling required for raw digital video panels.",
            "3": "Molex 4-pin connectors are large legacy desktop PSU power cables, completely absent in compact laptop display assemblies."
        },
        "tags": ["mobile", "laptop", "display", "edp"]
    },
    {
        "id": "C1N-V-019",
        "objective": "1.2",
        "type": "single",
        "difficulty": "easy",
        "question": "An enterprise workstation deployment requires a single-cable docking solution for laptops that can deliver 100W USB Power Delivery (USB PD), drive two external 4K monitors at 60Hz, carry Gigabit Ethernet, and connect high-speed NVMe external storage up to 40 Gbps. Which connection standard meets these requirements?",
        "options": [
            "Thunderbolt 4 / USB4 over a Type-C connector",
            "USB 2.0 HighSpeed over a Type-A connector",
            "eSATA with external DC power transformer",
            "Micro-USB 3.0 Type-B SuperSpeed connector"
        ],
        "answer": 0,
        "explanation": "Thunderbolt 4 (and USB4) utilizes the reversible USB Type-C connector to deliver up to 40 Gbps bidirectional bandwidth, support dual 4K/60Hz video streams (DisplayPort Alternate Mode), tunnel PCIe data for high-speed NVMe storage, provide Gigabit Ethernet connectivity, and deliver up to 100W (or 240W in Extended Power Range) USB Power Delivery over a single cable. USB 2.0 maxes out at 480 Mbps without native video. eSATA only carries storage data. Micro-USB 3.0 maxes at 5 Gbps without power delivery or display alt-modes.",
        "distractor_analysis": {
            "1": "USB 2.0 Type-A provides a maximum bandwidth of 480 Mbps and 2.5W power, lacking the bandwidth or alternate modes for dual 4K monitors or docking.",
            "2": "eSATA is an external SATA storage interface that does not carry native video signals, Ethernet, or laptop charging power.",
            "3": "Micro-USB 3.0 is a legacy mobile device connector limited to 5 Gbps data and basic 5V charging without display tunneling."
        },
        "tags": ["mobile", "accessories", "usb-c", "thunderbolt"]
    },
    {
        "id": "C1N-V-020",
        "objective": "1.3",
        "type": "single",
        "difficulty": "medium",
        "question": "An IT security department implements a Bring Your Own Device (BYOD) policy for mobile phones. The policy requires enforcing PIN complexity, encrypting corporate email, and permitting IT to wipe corporate data upon employee termination without deleting personal family photos or personal applications. Which solution must be deployed?",
        "options": [
            "Mobile Application Management (MAM) with containerized work profiles",
            "Full device firmware flashing using an OEM recovery tool",
            "Factory reset wipe command sent via GSM SMS command code",
            "MAC address filtering on the corporate guest wireless SSID"
        ],
        "answer": 0,
        "explanation": "Mobile Application Management (MAM) and enterprise containerization (such as Android Enterprise Work Profile or Apple User Enrollment) isolate corporate applications and encrypted data in a secure container separate from the personal space. This enables IT to selectively wipe corporate data, enforce passcodes, and control email sync without affecting personal photos, texts, or personal apps. Full firmware flashing or full factory wipes delete all personal data. MAC filtering only restricts Wi-Fi network association.",
        "distractor_analysis": {
            "1": "Full firmware flashing wipes the entire device storage partition, destroying personal data and violating BYOD privacy standards.",
            "2": "A full factory reset via SMS completely erases all personal user data, photos, and personal accounts on the mobile device.",
            "3": "MAC address filtering controls local wireless network access and provides zero management over mobile device data encryption or selective wiping."
        },
        "tags": ["mobile", "mdm", "mam", "byod", "security"]
    },
    {
        "id": "C1N-V-021",
        "objective": "1.3",
        "type": "multi",
        "difficulty": "hard",
        "question": "A mobile device administrator is configuring enterprise profile policies for corporate iOS and Android smartphones. To ensure maximum transport security and seamless calendar/contact integration with Microsoft 365, which TWO protocols and authentication standards should the administrator configure? (Select TWO.)",
        "options": [
            "Exchange ActiveSync (EAS) over TLS encryption",
            "WPA3-Enterprise using 802.1X EAP-TLS certificate authentication",
            "Unencrypted POP3 over TCP port 110",
            "Wired Equivalent Privacy (WEP) with 64-bit static keys",
            "Trivial File Transfer Protocol (TFTP) over UDP port 69"
        ],
        "answers": [0, 1],
        "explanation": "Exchange ActiveSync (EAS) over TLS is the standard mobile protocol for synchronizing corporate email, calendar events, contacts, and tasks with Microsoft 365 / Exchange servers while supporting remote security policy enforcement. WPA3-Enterprise with 802.1X EAP-TLS utilizes digital certificates installed on mobile devices to authenticate to enterprise Wi-Fi networks securely without transmitting cleartext credentials. POP3 port 110 is unencrypted and does not sync contacts/calendars. WEP is completely broken. TFTP is an unauthenticated, unencrypted file transfer protocol.",
        "distractor_analysis": {
            "2": "POP3 on port 110 transmits credentials in cleartext and only downloads emails without synchronizing calendars, contacts, or server folders.",
            "3": "WEP is an obsolete, highly insecure wireless encryption standard that is vulnerable to key recovery attacks within seconds.",
            "4": "TFTP on UDP port 69 lacks authentication and encryption, used primarily for network bootloaders rather than mobile device sync."
        },
        "tags": ["mobile", "synchronization", "activesync", "eap-tls"]
    },

    # 2.0 Networking (4 questions: 2.1, 2.4, 2.5, 2.6)
    {
        "id": "C1N-V-022",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A network security engineer is auditing firewall access control lists between a server VLAN and an Active Directory domain controller. An application needs to perform encrypted directory queries and user authentication over LDAP over SSL. Which port must be permitted through the firewall?",
        "options": [
            "TCP port 636 (LDAPS)",
            "TCP port 389 (LDAP cleartext)",
            "UDP port 53 (DNS query)",
            "TCP port 445 (SMB over IP)"
        ],
        "answer": 0,
        "explanation": "TCP port 636 is the standard port for LDAP over SSL/TLS (LDAPS), which encrypts directory queries and credential validations between clients and directory servers. TCP port 389 is unencrypted LDAP. UDP port 53 is used for DNS name resolution. TCP port 445 is used for Server Message Block (SMB) file sharing.",
        "distractor_analysis": {
            "1": "TCP port 389 is the default port for unencrypted LDAP communication, which transmits directory queries and potential credentials in cleartext.",
            "2": "UDP port 53 handles Domain Name System (DNS) address resolution queries, not directory services.",
            "3": "TCP port 445 is used for Microsoft SMB file sharing and Named Pipes, not secure directory queries."
        },
        "tags": ["networking", "ports", "ldaps", "security"]
    },
    {
        "id": "C1N-V-023",
        "objective": "2.4",
        "type": "single",
        "difficulty": "hard",
        "question": "A network engineer creates a new client VLAN 50 on a core datacenter switch. Endpoints in VLAN 50 cannot obtain IP addresses from the central enterprise DHCP server located in management VLAN 10. The engineer verifies that trunk links and VLAN tags are functional. What configuration must be applied to the VLAN 50 default gateway interface on the switch?",
        "options": [
            "Configure a DHCP relay agent (ip helper-address) pointing to the DHCP server IP",
            "Enable dynamic DNS forwarding on the VLAN 50 switch access ports",
            "Change the switch port encapsulation mode from 802.1Q to ISL",
            "Configure a static ARP mapping between the client broadcast MAC and the DHCP server"
        ],
        "answer": 0,
        "explanation": "DHCP discover messages are sent as Layer 2 local broadcasts (255.255.255.255), which routers and Layer 3 switches drop by default at VLAN boundaries. To allow clients in VLAN 50 to receive IP leases from a DHCP server in VLAN 10, the Layer 3 switch interface for VLAN 50 must be configured with a DHCP Relay agent (configured in Cisco IOS as 'ip helper-address <DHCP_Server_IP>'). This converts the client's broadcast into a unicast packet forwarded to the DHCP server. DDNS updates records after obtaining an IP. ISL is a legacy proprietary trunking protocol. Static broadcast ARP is invalid.",
        "distractor_analysis": {
            "1": "Dynamic DNS registers hostnames to IP addresses after leases are granted, but does not forward broadcast DHCP discovery frames across subnets.",
            "2": "Inter-Switch Link (ISL) is an obsolete Cisco-proprietary trunking protocol that does not solve Layer 3 broadcast routing for DHCP.",
            "3": "Static ARP mappings bind IP addresses to unicast MACs and cannot route Layer 2 discovery broadcasts across router interfaces."
        },
        "tags": ["networking", "dhcp", "relay", "vlan", "helper-address"]
    },
    {
        "id": "C1N-V-024",
        "objective": "2.5",
        "type": "single",
        "difficulty": "medium",
        "question": "A datacenter administrator needs to deploy a dedicated hardware appliance in front of a web server farm that distributes incoming HTTPS client requests across multiple backend application nodes, performs SSL/TLS offloading, and conducts active health checks. Which network device should be installed?",
        "options": [
            "Hardware Load Balancer / Application Delivery Controller",
            "Layer 2 Managed Ethernet Switch with 802.3ad LACP",
            "Time-Domain Reflectometer with optical splitters",
            "Hardware Security Module (HSM) key storage blade"
        ],
        "answer": 0,
        "explanation": "A hardware Load Balancer (or Application Delivery Controller) terminates client SSL/TLS connections, balances traffic across multiple backend servers using algorithms like round-robin or least connections, and continuously monitors server health to reroute traffic away from failed nodes. A Layer 2 switch forwards frames based on MAC addresses and does not perform application-layer SSL offloading or HTTP health checks. A TDR tests cable physical continuity. An HSM securely generates and stores cryptographic keys.",
        "distractor_analysis": {
            "1": "Layer 2 managed switches forward Ethernet frames based on MAC addresses and cannot parse HTTP payloads or perform TLS offloading.",
            "2": "A Time-Domain Reflectometer (TDR) is a diagnostic test instrument used to detect physical copper/fiber cable faults.",
            "3": "A Hardware Security Module (HSM) is a dedicated crypto processor for safeguarding digital keys, not a traffic distribution appliance."
        },
        "tags": ["networking", "load-balancer", "devices", "datacenter"]
    },
    {
        "id": "C1N-V-025",
        "objective": "2.6",
        "type": "single",
        "difficulty": "hard",
        "question": "An administrator is deploying IPv6 on an enterprise subnet with prefix 2001:db8:acad:10::/64. Client workstations automatically configure their own 128-bit IPv6 global unicast addresses by combining the /64 prefix received in Router Advertisement (RA) packets with an interface identifier derived from their 48-bit MAC address. Which IPv6 address autoconfiguration mechanism is being used?",
        "options": [
            "Stateless Address Autoconfiguration (SLAAC) using modified EUI-64",
            "Stateful DHCPv6 address reservation pool assignment",
            "Static APIPA address generation within the fe80::/10 link-local space",
            "Dual-stack NAT64 address translation mapping"
        ],
        "answer": 0,
        "explanation": "Stateless Address Autoconfiguration (SLAAC) allows an IPv6 host to configure its own global unicast address without a DHCPv6 server. The host learns the network prefix from ICMPv6 Router Advertisement messages and generates the 64-bit host identifier using modified EUI-64 (inserting 0xFFFE into the middle of the 48-bit MAC address and flipping the universal/local bit) or randomized privacy extensions. Stateful DHCPv6 tracks leases from a central server. APIPA is IPv4 link-local (169.254.x.x). NAT64 translates between IPv6 and IPv4 protocols.",
        "distractor_analysis": {
            "1": "Stateful DHCPv6 relies on a dedicated DHCPv6 server maintaining a database of assigned IPv6 addresses and options, rather than autonomous client generation.",
            "2": "APIPA (169.254.0.0/16) is strictly an IPv4 fallback mechanism; IPv6 uses native link-local addresses (fe80::/10).",
            "3": "NAT64 is an address translation transition mechanism that converts IPv6 packets to IPv4 packets at a border router."
        },
        "tags": ["networking", "ipv6", "slaac", "eui-64", "addressing"]
    }
]


def main():
    questions = []
    for qdata in QUESTIONS:
        obj_code = qdata["objective"]
        q_obj = {
            "id": qdata["id"],
            "exam": "core1",
            "domain": DOMAINS[obj_code],
            "objective": obj_code,
            "type": qdata["type"],
            "difficulty": qdata["difficulty"],
            "question": qdata["question"],
            "explanation": qdata["explanation"],
            "video_reference": dict(VIDEOS[obj_code]),
            "notes_reference": NOTES[obj_code],
            "tags": qdata.get("tags", ["datacenter"]),
        }
        if qdata["type"] == "single":
            q_obj["options"] = qdata["options"]
            q_obj["answer"] = qdata["answer"]
            q_obj["distractor_analysis"] = qdata["distractor_analysis"]
        elif qdata["type"] == "multi":
            q_obj["options"] = qdata["options"]
            q_obj["answers"] = qdata["answers"]
            q_obj["distractor_analysis"] = qdata["distractor_analysis"]
        elif qdata["type"] == "order":
            q_obj["sequence"] = qdata["sequence"]
        elif qdata["type"] == "match":
            q_obj["pairs"] = qdata["pairs"]
        questions.append(q_obj)

    out_path = os.path.join(ROOT, "_bank", "shards", "core1_new_misc.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"questions": questions}, f, indent=2)

    print(f"Generated {len(questions)} questions into {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
