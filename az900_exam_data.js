window.AZ900_EXAM_DATA = {
  "version": "1.1.0",
  "title": "Microsoft Azure Fundamentals (AZ-900) Master Question Bank",
  "description": "Blueprint-aligned question bank for Microsoft AZ-900 certification with scaled 100-1000 scoring.",
  "passing_score": 700,
  "max_score": 1000,
  "min_score": 100,
  "max_time_minutes": 50,
  "max_questions_per_exam": 45,
  "blueprint": {
    "1.0 Describe cloud concepts": 28,
    "2.0 Describe Azure architecture and services": 37,
    "3.0 Describe Azure management and governance": 35
  },
  "az900": [
    {
      "id": "AZ-001",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "medium",
      "question": "An enterprise is planning to migrate an on-premises database to an Azure Virtual Machine (IaaS). Under the Microsoft Shared Responsibility Model, which security layer remains the sole responsibility of the customer?",
      "options": [
        "Physical datacenter security and perimeter access control",
        "Virtual machine guest operating system patching and updates",
        "Physical blade server hardware replacement and cooling",
        "Host virtualization hypervisor clustering and maintenance"
      ],
      "answer": 1,
      "explanation": "In Infrastructure as a Service (IaaS), the cloud provider manages the physical infrastructure, virtualization, and datacenter hardware. The customer is responsible for configuring, securing, and patching the guest operating system, applications, network firewall rules, and data.",
      "distractor_analysis": {
        "0": "Physical datacenter perimeter security and biometric controls are always managed by Microsoft.",
        "2": "Server hardware maintenance, cooling, and power delivery are managed entirely by Microsoft.",
        "3": "Hypervisor fabric and physical cluster orchestration are the cloud provider's core responsibility."
      },
      "tags": [
        "cloud-concepts",
        "shared-responsibility",
        "iaas"
      ]
    },
    {
      "id": "AZ-002",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "easy",
      "question": "Which cloud computing model enables an organization to run critical proprietary workloads on an on-premises private cloud while bursting seasonal customer traffic into the Microsoft Azure public cloud?",
      "options": [
        "Hybrid cloud",
        "Public cloud only",
        "Community cloud",
        "SaaS-only deployment"
      ],
      "answer": 0,
      "explanation": "A hybrid cloud combines on-premises private cloud infrastructure or local datacenters with public cloud services like Microsoft Azure, facilitating secure data transfer and workload mobility (such as cloud bursting).",
      "distractor_analysis": {
        "1": "A public cloud only model means no on-premises infrastructure is utilized.",
        "2": "A community cloud is shared by several organizations with shared compliance or industry needs.",
        "3": "SaaS provides hosted end-user applications, not interconnected infrastructure models."
      },
      "tags": [
        "cloud-models",
        "hybrid-cloud",
        "bursting"
      ]
    },
    {
      "id": "AZ-003",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.2",
      "type": "single",
      "difficulty": "easy",
      "question": "A retail application experiences sudden demand spikes during holiday flash sales. Which cloud architecture benefit allows the platform to automatically scale computational capacity up or down based on dynamic resource demand?",
      "options": [
        "Elasticity",
        "High availability",
        "Geographic redundancy",
        "Predictability"
      ],
      "answer": 0,
      "explanation": "Elasticity is the ability to automatically dynamically allocate and deallocate computing resources (like CPU, RAM, and VM instances) in response to fluctuating demand.",
      "distractor_analysis": {
        "1": "High availability ensures systems remain accessible with minimal downtime, but does not describe automatic scaling.",
        "2": "Geographic redundancy duplicates data across regions to withstand catastrophic regional disasters.",
        "3": "Predictability refers to knowing upfront how a workload will perform and cost over time."
      },
      "tags": [
        "cloud-benefits",
        "elasticity",
        "autoscaling"
      ]
    },
    {
      "id": "AZ-004",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "medium",
      "question": "What is the primary financial distinction between Capital Expenditure (CapEx) and Operational Expenditure (OpEx) when transitioning to Azure?",
      "options": [
        "CapEx involves ongoing monthly billing based on consumption, while OpEx requires purchasing physical server racks upfront.",
        "CapEx involves upfront financial investment in physical equipment with depreciation over time, whereas OpEx represents ongoing pay-as-you-go operational costs without upfront capital.",
        "CapEx eliminates maintenance costs, whereas OpEx guarantees fixed hardware ownership.",
        "CapEx applies solely to Software as a Service, while OpEx applies solely to private datacenters."
      ],
      "answer": 1,
      "explanation": "CapEx is the upfront spending on physical assets (servers, storage arrays, facility construction) that is depreciated over years. OpEx is spending on services and operational costs on a pay-as-you-go consumption basis with no upfront infrastructure cost.",
      "distractor_analysis": {
        "0": "This description inverts the definitions of CapEx and OpEx.",
        "2": "CapEx involves significant maintenance and depreciation overhead.",
        "3": "SaaS is billed as OpEx; private datacenters require massive CapEx."
      },
      "tags": [
        "capex-opex",
        "consumption-model",
        "cloud-economics"
      ]
    },
    {
      "id": "AZ-005",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.3",
      "type": "multi",
      "difficulty": "medium",
      "question": "Which TWO of the following services are prime examples of Platform as a Service (PaaS)? (Choose TWO)",
      "options": [
        "Azure App Service",
        "Azure Virtual Machines",
        "Azure SQL Database",
        "Microsoft 365",
        "Azure Dedicated Host"
      ],
      "answers": [
        0,
        2
      ],
      "explanation": "Azure App Service and Azure SQL Database are managed Platform as a Service (PaaS) offerings where developers deploy code or schemas without managing the underlying operating system, runtime, or hardware. Azure Virtual Machines and Dedicated Hosts are IaaS, while Microsoft 365 is SaaS.",
      "distractor_analysis": {
        "1": "Azure Virtual Machines are IaaS; you manage the OS, updates, and configuration.",
        "3": "Microsoft 365 is a turnkey Software as a Service (SaaS) solution.",
        "4": "Azure Dedicated Host is physical IaaS dedicated to a single tenant."
      },
      "tags": [
        "paas",
        "iaas",
        "saas",
        "cloud-service-types"
      ]
    },
    {
      "id": "AZ-006",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "medium",
      "question": "Which serverless computing characteristic allows code execution in Azure Functions without provisioning, managing, or scaling underlying virtual machines?",
      "options": [
        "Event-driven architecture with automatic scaling and zero idle billing",
        "Dedicated bare-metal hardware reservation with annual contracts",
        "Static hypervisor allocation requiring manual load balancer rules",
        "Permanent OS registry configuration through Group Policy"
      ],
      "answer": 0,
      "explanation": "Serverless architectures (like Azure Functions) execute code in response to events or HTTP triggers, automatically scaling compute resources dynamically and billing exclusively for the milliseconds the code executes.",
      "distractor_analysis": {
        "1": "Dedicated bare-metal instances are IaaS, the polar opposite of serverless.",
        "2": "Serverless completely abstracts hypervisors and load balancers from developers.",
        "3": "Serverless applications run statelessly and do not involve OS registry or Group Policy management."
      },
      "tags": [
        "serverless",
        "azure-functions",
        "event-driven"
      ]
    },
    {
      "id": "AZ-007",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.2",
      "type": "single",
      "difficulty": "easy",
      "question": "How does High Availability (HA) differ from Disaster Recovery (DR) in cloud architecture design?",
      "options": [
        "High availability keeps systems operational during component disruptions; disaster recovery focuses on restoring business services after a catastrophic catastrophic regional failure.",
        "High availability is only possible in private datacenters; disaster recovery is cloud-only.",
        "High availability requires rebuilding servers from tape; disaster recovery runs in parallel constantly.",
        "High availability guarantees zero monthly cloud billing during outages."
      ],
      "answer": 0,
      "explanation": "High Availability guarantees uptime and minimal service interruption through redundant hardware and fault domains. Disaster Recovery focuses on business continuity, recovering systems, and restoring data following major natural disasters or regional blackouts.",
      "distractor_analysis": {
        "1": "Both HA and DR are standard native cloud architecture patterns.",
        "2": "Tape restores are legacy methods, not the definition of HA.",
        "3": "Cloud billing is independent of uptime guarantees; SLAs govern credits."
      },
      "tags": [
        "high-availability",
        "disaster-recovery",
        "resilience"
      ]
    },
    {
      "id": "AZ-008",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.3",
      "type": "single",
      "difficulty": "easy",
      "question": "When an enterprise subscribes to Microsoft 365, which cloud service delivery model is being consumed?",
      "options": [
        "Software as a Service (SaaS)",
        "Platform as a Service (PaaS)",
        "Infrastructure as a Service (IaaS)",
        "Hardware as a Service (HaaS)"
      ],
      "answer": 0,
      "explanation": "Microsoft 365 is a premier example of Software as a Service (SaaS). Microsoft hosts, manages, and patches the complete application stack, while the client simply manages user identities and data.",
      "distractor_analysis": {
        "1": "PaaS provides development runtimes and databases, not complete end-user office applications.",
        "2": "IaaS provides bare compute, storage, and networking.",
        "3": "HaaS is not a standard cloud service category in the official AZ-900 syllabus."
      },
      "tags": [
        "saas",
        "microsoft-365",
        "service-models"
      ]
    },
    {
      "id": "AZ-009",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.2",
      "type": "single",
      "difficulty": "medium",
      "question": "A DevOps development team can spin up and tear down testing environments in Microsoft Azure within minutes using templates. Which cloud benefit does this illustrate?",
      "options": [
        "Agility",
        "Geographic isolation",
        "Physical segregation",
        "Depreciation"
      ],
      "answer": 0,
      "explanation": "Cloud agility describes the rapid ability to develop, test, launch, and adapt applications and infrastructure quickly without waiting for physical hardware procurement and deployment.",
      "distractor_analysis": {
        "1": "Geographic isolation refers to data sovereignty and regional constraints.",
        "2": "Physical segregation is a security property of isolated hosts.",
        "3": "Depreciation is an accounting practice tied to CapEx assets."
      },
      "tags": [
        "agility",
        "cloud-benefits",
        "devops"
      ]
    },
    {
      "id": "AZ-010",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "easy",
      "question": "Which statement correctly describes a Private Cloud deployment?",
      "options": [
        "Cloud resources are used exclusively by a single business or organization, hosted either on-premises or by a third-party host.",
        "Hardware resources are pooled and shared across thousands of unrelated public tenants.",
        "Services are delivered without any security or access controls.",
        "Infrastructure is accessible only via dial-up modem lines."
      ],
      "answer": 0,
      "explanation": "A private cloud consists of cloud computing resources dedicated exclusively to one business or organization. It can be physically located in the company's on-site datacenter or hosted by a third-party service provider.",
      "distractor_analysis": {
        "1": "Sharing resources across unrelated multi-tenant businesses defines a public cloud.",
        "2": "Private clouds emphasize stringent internal security and governance.",
        "3": "Dial-up connectivity has nothing to do with modern private cloud virtualization."
      },
      "tags": [
        "private-cloud",
        "cloud-models"
      ]
    },
    {
      "id": "AZ-011",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "easy",
      "question": "In the consumption-based pricing model used by Microsoft Azure, how are customers charged for compute resources?",
      "options": [
        "Customers pay only for the actual cloud resources they provision and consume over time.",
        "Customers must pay a fixed flat fee of $10,000 upfront regardless of usage.",
        "Customers are charged solely based on the number of employees in their organization.",
        "Customers are billed once per decade during hardware refreshes."
      ],
      "answer": 0,
      "explanation": "In a consumption-based pricing model, there are no upfront costs, no termination fees, and users pay only for the exact resources and minutes consumed.",
      "distractor_analysis": {
        "1": "There are no mandatory upfront minimums in pay-as-you-go Azure tiers.",
        "2": "Billing is based on infrastructure and API consumption, not employee headcount (which applies to user licensing like M365).",
        "3": "Cloud billing occurs monthly on a pay-as-you-go basis."
      },
      "tags": [
        "consumption-model",
        "pay-as-you-go",
        "cloud-economics"
      ]
    },
    {
      "id": "AZ-012",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.2",
      "type": "single",
      "difficulty": "medium",
      "question": "Which cloud architecture attribute ensures an application remains fully functional and accessible even if a power supply or network interface card fails inside a server rack?",
      "options": [
        "Fault tolerance",
        "Latency",
        "Multi-tenancy",
        "Vendor lock-in"
      ],
      "answer": 0,
      "explanation": "Fault tolerance is the capability of a cloud system to continue operating without interruption even in the event of component, hardware, or server failures.",
      "distractor_analysis": {
        "1": "Latency measures the round-trip network delay in milliseconds.",
        "2": "Multi-tenancy is the architectural sharing of infrastructure among multiple clients.",
        "3": "Vendor lock-in is the dependency on a single cloud vendor's proprietary APIs."
      },
      "tags": [
        "fault-tolerance",
        "reliability",
        "cloud-concepts"
      ]
    },
    {
      "id": "AZ-013",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "easy",
      "question": "How do Economies of Scale benefit enterprise cloud customers adopting Microsoft Azure?",
      "options": [
        "Microsoft's massive purchasing power allows it to procure hardware and power at lower unit costs, passing cost efficiencies to customers.",
        "Customers can monopolize physical datacenters in their home countries.",
        "Hardware depreciation is shifted directly to local municipalities.",
        "Organizations are exempt from standard data privacy regulations."
      ],
      "answer": 0,
      "explanation": "Economies of scale describe the cost advantages that enterprises obtain due to their scale of operation. Microsoft purchases massive volumes of servers, storage, and electricity at lower rates than individual enterprises could ever obtain.",
      "distractor_analysis": {
        "1": "Datacenters remain shared multi-tenant facilities.",
        "2": "Municipalities do not absorb private depreciation.",
        "3": "All cloud deployments remain strictly subject to GDPR, HIPAA, and privacy laws."
      },
      "tags": [
        "economies-of-scale",
        "cloud-economics"
      ]
    },
    {
      "id": "AZ-014",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.1",
      "type": "single",
      "difficulty": "medium",
      "question": "An organization runs critical data processing across both Microsoft Azure and Amazon Web Services (AWS) simultaneously. What type of cloud deployment strategy is this?",
      "options": [
        "Multi-cloud",
        "Private cloud",
        "Monolithic deployment",
        "Local intranet"
      ],
      "answer": 0,
      "explanation": "A multi-cloud deployment uses services from multiple public cloud providers (such as Microsoft Azure, AWS, and GCP) to mitigate risk and prevent vendor lock-in.",
      "distractor_analysis": {
        "1": "Private clouds are owned and operated exclusively on private infrastructure.",
        "2": "Monolithic refers to tightly coupled legacy application codebases.",
        "3": "Local intranet is a private internal enterprise network."
      },
      "tags": [
        "multi-cloud",
        "cloud-strategy"
      ]
    },
    {
      "id": "AZ-015",
      "exam": "az900",
      "domain": "1.0 Describe cloud concepts",
      "objective": "1.2",
      "type": "single",
      "difficulty": "medium",
      "question": "What is the technical difference between Vertical Scaling (scaling up) and Horizontal Scaling (scaling out) in Azure?",
      "options": [
        "Scaling up increases the CPU, RAM, or disk speed of an existing virtual machine; scaling out adds more virtual machine instances to distribute the workload.",
        "Scaling up adds more physical servers; scaling out replaces virtual machines with containers.",
        "Scaling up is automated; scaling out requires replacing hardware in the datacenter.",
        "Scaling up is free; scaling out incurs exponential licensing penalties."
      ],
      "answer": 0,
      "explanation": "Vertical scaling (scaling up) upgrades an existing server with more memory or processing power. Horizontal scaling (scaling out) adds additional server instances (like Azure Virtual Machine Scale Sets) to share the incoming traffic.",
      "distractor_analysis": {
        "1": "Scaling out does not require switching to containers; both VMs and containers can scale out.",
        "2": "Both scaling models can be automated via Azure Autoscale policies.",
        "3": "Scaling up requires a higher tier VM SKU which costs more money."
      },
      "tags": [
        "scaling",
        "scale-up",
        "scale-out"
      ]
    },
    {
      "id": "AZ-101",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "single",
      "difficulty": "medium",
      "question": "What is the primary benefit of deploying virtual machine instances across Azure Availability Zones within a single region?",
      "options": [
        "Protection against a complete catastrophic failure of the entire geopolitical region",
        "Protection from datacenter-level hardware, power, and cooling failures with low-latency network interconnects",
        "Automatic synchronization with an international paired region across continents",
        "Zero compute billing when the primary virtual machine goes offline"
      ],
      "answer": 1,
      "explanation": "Availability Zones are physically separate datacenters within an Azure region, each equipped with independent power, cooling, and networking. Deploying across zones protects workloads against datacenter-level outages while maintaining single-digit millisecond latency.",
      "distractor_analysis": {
        "0": "Cross-region disaster recovery (region pairs) protects against regional-scale catastrophes, not single-region availability zones.",
        "2": "Region pairs handle cross-region replication, not availability zones within one region.",
        "3": "Virtual machine allocation incurs standard compute billing based on provisioning and reservation."
      },
      "tags": [
        "availability-zones",
        "high-availability",
        "datacenter-resilience"
      ]
    },
    {
      "id": "AZ-102",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "easy",
      "question": "Which Azure Storage redundancy option replicates your data synchronously three times within a single datacenter in the primary region?",
      "options": [
        "Locally Redundant Storage (LRS)",
        "Zone-Redundant Storage (ZRS)",
        "Geo-Redundant Storage (GRS)",
        "Geo-Zone-Redundant Storage (GZRS)"
      ],
      "answer": 0,
      "explanation": "Locally Redundant Storage (LRS) replicates data synchronously three times within a single physical datacenter in the primary region. It provides 11 nines (99.999999999%) of durability against local disk or rack failures.",
      "distractor_analysis": {
        "1": "ZRS replicates synchronously across three availability zones in the region.",
        "2": "GRS copies data to a secondary paired region hundreds of miles away.",
        "3": "GZRS combines cross-zone replication in the primary region with secondary region replication."
      },
      "tags": [
        "storage-redundancy",
        "lrs",
        "zrs",
        "grs"
      ]
    },
    {
      "id": "AZ-103",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "medium",
      "question": "A legal firm requires compliance data stored in Azure Blob Storage to remain accessible for auditing but expects retrieval only once every few years. Which access tier provides the lowest storage cost?",
      "options": [
        "Archive tier",
        "Cold tier",
        "Cool tier",
        "Hot tier"
      ],
      "answer": 0,
      "explanation": "The Archive tier offers the lowest storage pricing per gigabyte, but incurs the highest data access and retrieval costs and requires several hours for rehydration back to Cool or Hot before reading.",
      "distractor_analysis": {
        "1": "Cold tier is intended for data accessed infrequently (stored at least 90 days), but costs more to store than Archive.",
        "2": "Cool tier is for data stored at least 30 days with moderate access.",
        "3": "Hot tier has highest storage costs and lowest access fees, ideal for active day-to-day data."
      },
      "tags": [
        "blob-storage",
        "archive-tier",
        "cost-optimization"
      ]
    },
    {
      "id": "AZ-104",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.3",
      "type": "single",
      "difficulty": "medium",
      "question": "Which dedicated high-speed network service provides private, encrypted connectivity between an enterprise on-premises datacenter and Azure without traversing the public internet?",
      "options": [
        "Azure ExpressRoute",
        "Azure Virtual Network NAT Gateway",
        "Azure Point-to-Site VPN",
        "Azure Front Door"
      ],
      "answer": 0,
      "explanation": "Azure ExpressRoute creates direct, private physical connections between an enterprise on-premises network and Microsoft Cloud services through a connectivity provider, bypassing the public internet completely for high reliability and lower latency.",
      "distractor_analysis": {
        "1": "NAT Gateway provides outbound-only internet connectivity for private subnets.",
        "2": "Point-to-Site VPN establishes an encrypted tunnel over the public internet from an individual client computer.",
        "3": "Azure Front Door is a global web application accelerator and layer 7 load balancer."
      },
      "tags": [
        "networking",
        "expressroute",
        "hybrid-connectivity"
      ]
    },
    {
      "id": "AZ-105",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "single",
      "difficulty": "easy",
      "question": "What is the top-level container in the Azure resource hierarchy used to manage access, policies, and compliance across multiple Azure Subscriptions?",
      "options": [
        "Management Groups",
        "Resource Groups",
        "Azure Subscriptions",
        "Virtual Networks"
      ],
      "answer": 0,
      "explanation": "Management Groups are containers that help you manage access, policy, and compliance across multiple subscriptions. The hierarchy is: Management Groups -> Subscriptions -> Resource Groups -> Resources.",
      "distractor_analysis": {
        "1": "Resource Groups are containers for individual Azure resources within a single subscription.",
        "2": "Azure Subscriptions are billing and access boundaries grouped under Management Groups.",
        "3": "Virtual Networks are networking primitives located inside a Resource Group."
      },
      "tags": [
        "management-groups",
        "resource-hierarchy",
        "azure-governance"
      ]
    },
    {
      "id": "AZ-106",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "single",
      "difficulty": "easy",
      "question": "What is an Azure Region?",
      "options": [
        "A geographical area containing one or more physical datacenters networked together through a dedicated low-latency perimeter",
        "A single computer server rack running in an office building",
        "An entire sovereign continent governed by a single tax authority",
        "A software firewall installed on a client workstation"
      ],
      "answer": 0,
      "explanation": "An Azure Region is a geographical perimeter containing at least one, but often multiple, physical datacenters that are linked by an exclusive, low-latency fiber network.",
      "distractor_analysis": {
        "1": "A single server rack is not a region.",
        "2": "Continents contain multiple distinct Azure regions (e.g., North Europe and West Europe).",
        "3": "A firewall is a security service, not geographic infrastructure."
      },
      "tags": [
        "regions",
        "azure-infrastructure"
      ]
    },
    {
      "id": "AZ-107",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "single",
      "difficulty": "medium",
      "question": "Why are Azure Region Pairs separated by at least 300 miles (approx. 480 km)?",
      "options": [
        "To reduce the likelihood that a natural disaster, regional civil unrest, or widespread power grid outage affects both regions simultaneously",
        "To comply with international postal union regulations",
        "To prevent light from traveling between datacenters too fast",
        "To force customers to pay international roaming charges"
      ],
      "answer": 0,
      "explanation": "Region Pairs are spaced at least 300 miles apart to minimize the probability that severe weather, earthquakes, power grid failures, or regional catastrophes knock out both paired locations at the same time.",
      "distractor_analysis": {
        "1": "Postal union rules do not dictate datacenter distances.",
        "2": "Low latency is desirable, not something to artificially slow down.",
        "3": "Azure does not charge cellular roaming fees."
      },
      "tags": [
        "region-pairs",
        "disaster-recovery"
      ]
    },
    {
      "id": "AZ-108",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "single",
      "difficulty": "medium",
      "question": "Which specialized sovereign Azure cloud instances are physically isolated and operated under strict national compliance for US government agencies and their cleared contractors?",
      "options": [
        "Azure Government",
        "Azure Public Commercial",
        "Azure Global Dev/Test",
        "Azure Consumer Preview"
      ],
      "answer": 0,
      "explanation": "Azure Government is a mission-critical cloud dedicated to US federal, state, and local governments and their partners, physically isolated with screened US personnel.",
      "distractor_analysis": {
        "1": "Azure Public Commercial is the standard multi-tenant global cloud.",
        "2": "Dev/Test is a subscription pricing discount model, not a physical sovereign cloud.",
        "3": "Consumer Preview is not a sovereign government cloud."
      },
      "tags": [
        "sovereign-cloud",
        "azure-government"
      ]
    },
    {
      "id": "AZ-109",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "easy",
      "question": "Which Azure compute service allows you to deploy and manage identical groups of load-balanced virtual machines that automatically scale based on CPU demand or schedules?",
      "options": [
        "Azure Virtual Machine Scale Sets (VMSS)",
        "Azure Functions",
        "Azure Logic Apps",
        "Azure Container Instances"
      ],
      "answer": 0,
      "explanation": "Azure Virtual Machine Scale Sets (VMSS) allow you to create and manage a group of load-balanced VMs. The number of VM instances can automatically increase or decrease in response to demand or a defined schedule.",
      "distractor_analysis": {
        "1": "Azure Functions is a serverless code compute service.",
        "2": "Azure Logic Apps is an automated workflow integration orchestrator.",
        "3": "Azure Container Instances run individual containers without managing VMs."
      },
      "tags": [
        "vmss",
        "compute",
        "autoscaling"
      ]
    },
    {
      "id": "AZ-110",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "medium",
      "question": "Which Azure service provides a comprehensive cloud-hosted desktop and app virtualization experience accessible from any web browser or mobile client?",
      "options": [
        "Azure Virtual Desktop (AVD)",
        "Azure DevTest Labs",
        "Azure Front Door",
        "Azure Arc"
      ],
      "answer": 0,
      "explanation": "Azure Virtual Desktop (AVD) is a desktop and app virtualization service that runs on the cloud, delivering multi-session Windows 10/11 environments to remote employees securely.",
      "distractor_analysis": {
        "1": "DevTest Labs creates fast development VM sandboxes.",
        "2": "Front Door is a global CDN and layer-7 load balancer.",
        "3": "Azure Arc manages hybrid servers and Kubernetes clusters."
      },
      "tags": [
        "azure-virtual-desktop",
        "vdi",
        "compute"
      ]
    },
    {
      "id": "AZ-111",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "medium",
      "question": "What is the primary architectural difference between Docker containers and standard Virtual Machines?",
      "options": [
        "Containers share the host operating system kernel and are much lighter, whereas VMs run a complete guest OS with their own dedicated virtual hardware.",
        "Containers require physical tape storage; VMs run on solid state drives.",
        "Containers cannot run web servers; VMs can only run databases.",
        "Containers do not support network communication."
      ],
      "answer": 0,
      "explanation": "Containers virtualize at the operating system level, sharing the host OS kernel and spinning up in seconds with minimal overhead. Virtual machines virtualize hardware, requiring a separate guest operating system for each instance.",
      "distractor_analysis": {
        "1": "Storage media is completely independent of containerization.",
        "2": "Containers frequently host web applications, microservices, and APIs.",
        "3": "Containers have sophisticated virtual networking interfaces."
      },
      "tags": [
        "containers",
        "virtual-machines",
        "docker"
      ]
    },
    {
      "id": "AZ-112",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "medium",
      "question": "Which managed Azure service provides enterprise-grade container orchestration for automated deployment, scaling, and management of containerized clusters?",
      "options": [
        "Azure Kubernetes Service (AKS)",
        "Azure Container Registry",
        "Azure Batch",
        "Azure Service Bus"
      ],
      "answer": 0,
      "explanation": "Azure Kubernetes Service (AKS) simplifies deploying a managed Kubernetes cluster in Azure, offloading operational overhead like health monitoring and master node maintenance to Microsoft.",
      "distractor_analysis": {
        "1": "Azure Container Registry stores and manages private container images.",
        "2": "Azure Batch runs large-scale parallel and high-performance computing batch jobs.",
        "3": "Azure Service Bus is an enterprise cloud message broker."
      },
      "tags": [
        "kubernetes",
        "aks",
        "containers"
      ]
    },
    {
      "id": "AZ-113",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "medium",
      "question": "Which globally distributed, multi-model NoSQL database service provides single-digit millisecond response times and guaranteed 99.999% high availability worldwide?",
      "options": [
        "Azure Cosmos DB",
        "Azure SQL Database",
        "Azure Database for MySQL",
        "Azure Synapse Analytics"
      ],
      "answer": 0,
      "explanation": "Azure Cosmos DB is Microsoft's globally distributed, multi-model NoSQL database service designed for mission-critical web and mobile applications with turnkey global replication.",
      "distractor_analysis": {
        "1": "Azure SQL Database is a relational SQL engine.",
        "2": "Azure Database for MySQL is a managed relational MySQL service.",
        "3": "Azure Synapse Analytics is an enterprise data warehouse and big data analytics system."
      },
      "tags": [
        "cosmos-db",
        "nosql",
        "databases"
      ]
    },
    {
      "id": "AZ-114",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "single",
      "difficulty": "easy",
      "question": "Which Azure Storage service enables legacy on-premises servers to mount cloud file shares using standard SMB and NFS networking protocols?",
      "options": [
        "Azure Files",
        "Azure Blob Storage",
        "Azure Data Lake",
        "Azure Queue Storage"
      ],
      "answer": 0,
      "explanation": "Azure Files offers fully managed cloud file shares that are accessible via industry-standard Server Message Block (SMB) or Network File System (NFS) protocols.",
      "distractor_analysis": {
        "1": "Azure Blob Storage is an object store accessed over HTTP/REST APIs.",
        "2": "Azure Data Lake is optimized for big data analytics processing.",
        "3": "Azure Queue Storage stores messages for asynchronous microservice communication."
      },
      "tags": [
        "azure-files",
        "smb",
        "nfs",
        "storage"
      ]
    },
    {
      "id": "AZ-115",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.3",
      "type": "single",
      "difficulty": "medium",
      "question": "What is the primary function of Virtual Network (VNet) Peering in Azure?",
      "options": [
        "Connecting two separate Azure Virtual Networks seamlessly so resources communicate directly using private IP addresses over the Microsoft backbone",
        "Exposing virtual machines directly to the public internet without a firewall",
        "Translating IPv4 addresses to MAC addresses on local laptops",
        "Purchasing internet domain names through Azure DNS"
      ],
      "answer": 0,
      "explanation": "VNet Peering enables you to seamlessly connect two or more Virtual Networks in Azure. The virtual networks appear as one for connectivity purposes, with traffic routed through the private Microsoft backbone network.",
      "distractor_analysis": {
        "1": "Peering keeps traffic private within Azure rather than exposing it publicly.",
        "2": "ARP handles IP-to-MAC resolution on local Ethernet segments.",
        "3": "Azure DNS hosts DNS zones, but peering is a network routing mechanism."
      },
      "tags": [
        "vnet-peering",
        "networking",
        "virtual-networks"
      ]
    },
    {
      "id": "AZ-116",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "single",
      "difficulty": "easy",
      "question": "Which Azure deployment and management service provides a consistent management layer that handles all incoming requests from the Azure Portal, CLI, PowerShell, and REST APIs?",
      "options": [
        "Azure Resource Manager (ARM)",
        "Azure Monitor",
        "Azure Traffic Manager",
        "Azure Arc"
      ],
      "answer": 0,
      "explanation": "Azure Resource Manager (ARM) is the deployment and management service for Azure. It provides a management layer that enables you to create, update, and delete resources in your Azure account.",
      "distractor_analysis": {
        "1": "Azure Monitor collects telemetry and performance logs.",
        "2": "Traffic Manager is a DNS-based traffic load balancer.",
        "3": "Azure Arc extends ARM management to external clouds and on-prem hardware."
      },
      "tags": [
        "arm",
        "resource-manager",
        "infrastructure"
      ]
    },
    {
      "id": "AZ-117",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "single",
      "difficulty": "medium",
      "question": "What language syntax is natively used by modern Azure Bicep files to deploy cloud infrastructure as code (IaC)?",
      "options": [
        "Declarative domain-specific syntax that compiles into standard ARM JSON templates",
        "Imperative Python scripting with procedural loop counters",
        "Binary machine code compiled directly for x86 microprocessors",
        "Raw HTML markup with embedded JavaScript tags"
      ],
      "answer": 0,
      "explanation": "Azure Bicep is a domain-specific language (DSL) that uses declarative syntax to deploy Azure resources, offering cleaner syntax and modularity while compiling into native ARM JSON templates.",
      "distractor_analysis": {
        "1": "Bicep is declarative (stating the desired state), not imperative procedural scripting.",
        "2": "Bicep is human-readable text, not binary machine code.",
        "3": "Bicep has nothing to do with web frontend HTML/JS markup."
      },
      "tags": [
        "bicep",
        "arm-templates",
        "iac"
      ]
    },
    {
      "id": "AZ-118",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.3",
      "type": "single",
      "difficulty": "medium",
      "question": "Which Azure networking feature filters inbound and outbound network traffic to Azure resources based on 5-tuple security rules (Source IP, Source Port, Destination IP, Destination Port, Protocol)?",
      "options": [
        "Network Security Group (NSG)",
        "Azure Route Table",
        "Azure DNS Zone",
        "Virtual Network Gateway"
      ],
      "answer": 0,
      "explanation": "A Network Security Group (NSG) contains security rules that allow or deny inbound and outbound network traffic to several types of Azure resources based on 5-tuple rules.",
      "distractor_analysis": {
        "1": "Route Tables dictate packet routing next-hop paths.",
        "2": "Azure DNS provides domain name resolution.",
        "3": "Virtual Network Gateway establishes cross-premises site-to-site VPN tunnels."
      },
      "tags": [
        "nsg",
        "security-rules",
        "networking"
      ]
    },
    {
      "id": "AZ-M-01",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "match",
      "difficulty": "medium",
      "question": "Match each compute architectural requirement or business scenario to its optimal Azure service solution.",
      "explanation": "Azure Functions executes code in response to events (serverless). Azure App Service deploys managed web apps and REST APIs without OS configuration. Azure Container Instances (ACI) runs simple isolated containers without VM provisioning. Azure Kubernetes Service (AKS) orchestrates complex microservices clusters. Azure VMs provide full OS control for custom software stacks.",
      "tags": [
        "compute",
        "scenarios",
        "match"
      ],
      "pairs": [
        {
          "left": "Run serverless code solely in response to events with zero idle billing",
          "right": "Azure Functions"
        },
        {
          "left": "Deploy a managed Python web application with built-in auto scaling",
          "right": "Azure App Service"
        },
        {
          "left": "Quickly deploy a single container in seconds without VM management",
          "right": "Azure Container Instances (ACI)"
        },
        {
          "left": "Orchestrate a complex multi-container microservices architecture",
          "right": "Azure Kubernetes Service (AKS)"
        },
        {
          "left": "Workload requires customized OS kernel and legacy software installation",
          "right": "Azure Virtual Machines"
        }
      ]
    },
    {
      "id": "AZ-M-02",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "match",
      "difficulty": "medium",
      "question": "Match each data storage scenario to the appropriate Azure Storage service.",
      "explanation": "Azure Disks provide block storage attached to VMs. Azure File Sync synchronizes on-premises Windows file shares with cloud shares. Azure Data Lake Storage Gen2 stores and processes big data analytics. Premium Storage Accounts deliver sub-millisecond SSD latency. Archive Blob Storage provides lowest-cost storage for rarely accessed long-term data.",
      "tags": [
        "storage",
        "scenarios",
        "match"
      ],
      "pairs": [
        {
          "left": "Persistent block storage attached to virtual machine operating system disks",
          "right": "Azure Disks"
        },
        {
          "left": "Synchronize on-premises enterprise file shares with Azure SMB shares",
          "right": "Azure File Sync"
        },
        {
          "left": "Petabyte-scale hierarchical data storage optimized for big data analytics",
          "right": "Azure Data Lake Storage Gen2"
        },
        {
          "left": "Very rarely accessed data stored for years with lowest per-GB storage cost",
          "right": "Archive Blob Storage"
        },
        {
          "left": "High-performance storage requiring highest IOPS and lowest latency SSDs",
          "right": "Premium Storage Account"
        }
      ]
    },
    {
      "id": "AZ-M-03",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "match",
      "difficulty": "medium",
      "question": "Match each database scenario to the recommended Azure Database service.",
      "explanation": "Azure Cosmos DB offers schemaless global distribution with single-digit millisecond latency. Azure SQL Database provides fully managed relational OLTP. Azure Cache for Redis provides in-memory microsecond caching. Azure Synapse Analytics provides petabyte-scale columnar OLAP data warehousing.",
      "tags": [
        "databases",
        "scenarios",
        "match"
      ],
      "pairs": [
        {
          "left": "Fast-moving startup needing schemaless JSON document model with global replication",
          "right": "Azure Cosmos DB"
        },
        {
          "left": "Traditional enterprise banking application processing thousands of relational OLTP transactions",
          "right": "Azure SQL Database"
        },
        {
          "left": "Web application requires sub-millisecond response caching in front of database",
          "right": "Azure Cache for Redis"
        },
        {
          "left": "Business intelligence system running complex SQL analytics across petabytes of historical data",
          "right": "Azure Synapse Analytics"
        }
      ]
    },
    {
      "id": "AZ-M-04",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.3",
      "type": "match",
      "difficulty": "medium",
      "question": "Match each Azure network security requirement to the correct networking service or feature.",
      "explanation": "Virtual Network provides isolated private cloud perimeter. VNet Peering links VNets privately across Azure. Azure Firewall is stateful managed perimeter firewall. Network Security Groups filter traffic at the subnet/NIC level with 5-tuple rules. Azure Private Link provides private access to PaaS services.",
      "tags": [
        "networking",
        "security",
        "match"
      ],
      "pairs": [
        {
          "left": "Create an isolated private network for cloud resources",
          "right": "Azure Virtual Network (VNet)"
        },
        {
          "left": "Connect resources in different VNets across regions over Microsoft backbone",
          "right": "Virtual Network Peering"
        },
        {
          "left": "Stateful managed network firewall controlling ingress/egress across subscriptions",
          "right": "Azure Firewall"
        },
        {
          "left": "Internal subnet packet filtering based on 5-tuple IP/port rules",
          "right": "Network Security Group (NSG)"
        },
        {
          "left": "Access Azure PaaS services privately over dedicated IP within your VNet",
          "right": "Azure Private Link & Endpoint"
        }
      ]
    },
    {
      "id": "AZ-O-01",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.1",
      "type": "order",
      "difficulty": "medium",
      "question": "Order the containers in the official Azure Resource Hierarchy from the highest organizational level (top) to the individual resource level (bottom).",
      "explanation": "The official Azure Resource Hierarchy flows from Management Groups at the top, down to Subscriptions, then Resource Groups, and finally individual Azure Resources.",
      "tags": [
        "hierarchy",
        "governance",
        "order"
      ],
      "sequence": [
        "Management Groups (govern multiple subscriptions and policy inheritance)",
        "Subscriptions (billing and quota boundaries)",
        "Resource Groups (logical lifecycle containers for related services)",
        "Resources (individual instances of VMs, databases, and storage accounts)"
      ]
    },
    {
      "id": "AZ-O-02",
      "exam": "az900",
      "domain": "2.0 Describe Azure architecture and services",
      "objective": "2.2",
      "type": "order",
      "difficulty": "medium",
      "question": "Order the lifecycle steps required to access and read an archived blob in Azure Blob Storage.",
      "explanation": "Archive tier data is offline and cannot be read directly. First initiate a rehydration request to change the tier to Hot or Cool, wait for the background rehydration to complete (taking up to several hours), and then perform standard HTTP/REST read operations.",
      "tags": [
        "storage",
        "archive-tier",
        "order"
      ],
      "sequence": [
        "Locate the archived blob in the storage container (currently in offline Archive tier)",
        "Initiate a Rehydrate request to change the access tier to Hot or Cool",
        "Wait for the rehydration process to complete (can take several hours depending on priority)",
        "Verify blob status has changed to active Hot/Cool and begin reading data via API/download"
      ]
    },
    {
      "id": "AZ-201",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.1",
      "type": "single",
      "difficulty": "easy",
      "question": "An administrator wants to prevent accidental deletion or modification of a production database resource group. Which Azure mechanism should be applied?",
      "options": [
        "Azure Resource Lock (CanNotDelete / ReadOnly)",
        "Azure Cost Management Alert",
        "Azure Network Security Group",
        "Azure Monitor Metric Rule"
      ],
      "answer": 0,
      "explanation": "Azure Resource Locks (CanNotDelete and ReadOnly) prevent authorized users from accidentally deleting or altering critical Azure resources, independent of their Role-Based Access Control (RBAC) permissions.",
      "distractor_analysis": {
        "1": "Cost Management Alerts notify teams about spending thresholds; they do not block deletions.",
        "2": "Network Security Groups (NSGs) filter IP traffic at the network subnet/NIC level.",
        "3": "Azure Monitor Metric Rules trigger alerts or webhooks when metrics exceed thresholds."
      },
      "tags": [
        "resource-locks",
        "governance",
        "accidental-deletion"
      ]
    },
    {
      "id": "AZ-202",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.2",
      "type": "single",
      "difficulty": "medium",
      "question": "Which Azure governance service continuously evaluates your cloud resources against organizational standards and automatically enforces compliance rules (such as restricting VM deployment to specific geographic regions)?",
      "options": [
        "Azure Policy",
        "Microsoft Defender for Cloud",
        "Azure Service Health",
        "Azure Arc"
      ],
      "answer": 0,
      "explanation": "Azure Policy enforces organizational standards and assesses compliance at scale. Common use cases include enforcing resource tags, restricting allowed VM sizes, and mandating specific geographic deployment locations.",
      "distractor_analysis": {
        "1": "Microsoft Defender for Cloud is a Cloud Security Posture Management (CSPM) and workload protection tool.",
        "2": "Azure Service Health provides customized notifications about Azure cloud service incidents and planned maintenance.",
        "3": "Azure Arc extends Azure management and services to hybrid and multi-cloud environments."
      },
      "tags": [
        "azure-policy",
        "governance",
        "compliance"
      ]
    },
    {
      "id": "AZ-203",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.1",
      "type": "single",
      "difficulty": "easy",
      "question": "Which tool provides free recommendations on Reliability, Security, Performance, Operational Excellence, and Cost Optimization aligned with the Microsoft Azure Well-Architected Framework?",
      "options": [
        "Azure Advisor",
        "Azure Cloud Shell",
        "Azure Marketplace",
        "Azure Bastion"
      ],
      "answer": 0,
      "explanation": "Azure Advisor analyzes your configurations and telemetry, providing personalized, actionable recommendations across the five pillars of the Azure Well-Architected Framework: Reliability, Security, Performance, Cost, and Operational Excellence.",
      "distractor_analysis": {
        "1": "Azure Cloud Shell is an interactive, browser-accessible terminal for managing Azure resources.",
        "2": "Azure Marketplace is an online catalog of certified third-party software and solutions.",
        "3": "Azure Bastion is a managed PaaS service for secure browser-based RDP/SSH access to VMs without public IPs."
      },
      "tags": [
        "azure-advisor",
        "well-architected",
        "optimization"
      ]
    },
    {
      "id": "AZ-204",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.3",
      "type": "single",
      "difficulty": "medium",
      "question": "Under Microsoft Azure Role-Based Access Control (RBAC), which built-in role allows a user to manage all resources inside a resource group, including granting access permissions to other users?",
      "options": [
        "Owner",
        "Contributor",
        "Reader",
        "User Access Administrator"
      ],
      "answer": 0,
      "explanation": "The Owner role grants full management access to all resources, including the ability to assign roles and delegate permissions to other users. The Contributor role can manage all resources but cannot delegate access.",
      "distractor_analysis": {
        "1": "Contributor can create and manage resources, but CANNOT grant or delegate RBAC roles to others.",
        "2": "Reader can only view existing resources without making any changes.",
        "3": "User Access Administrator manages user access to Azure resources, but does not manage the resources themselves."
      },
      "tags": [
        "rbac",
        "identity-access",
        "azure-roles"
      ]
    },
    {
      "id": "AZ-205",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.2",
      "type": "single",
      "difficulty": "easy",
      "question": "What is the primary identity and access management service that provides Single Sign-On (SSO), Multi-Factor Authentication (MFA), and conditional access across Azure and Microsoft 365?",
      "options": [
        "Microsoft Entra ID (formerly Azure Active Directory)",
        "Azure Key Vault",
        "Azure Dedicated HSM",
        "Azure Information Protection"
      ],
      "answer": 0,
      "explanation": "Microsoft Entra ID (formerly Azure Active Directory) is Microsoft's cloud-based identity and access management service providing SSO, MFA, identity governance, and Conditional Access.",
      "distractor_analysis": {
        "1": "Azure Key Vault securely stores cryptographic keys, secrets, and TLS certificates.",
        "2": "Azure Dedicated HSM provides dedicated hardware security modules for FIPS 140-2 Level 3 compliance.",
        "3": "Azure Information Protection classifies and protects documents and emails using labels."
      },
      "tags": [
        "entra-id",
        "identity",
        "authentication"
      ]
    },
    {
      "id": "AZ-206",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.2",
      "type": "single",
      "difficulty": "medium",
      "question": "What are the three guiding principles of the Microsoft Zero Trust cybersecurity model?",
      "options": [
        "Verify explicitly, use least privilege access, and assume breach",
        "Trust internal network, grant domain admin, and ignore alerts",
        "Disable firewalls, allow guest users, and bypass MFA",
        "Enforce passwords only, avoid encryption, and disable audits"
      ],
      "answer": 0,
      "explanation": "The three core principles of Zero Trust are: 1) Verify explicitly, 2) Use least privileged access, and 3) Assume breach.",
      "distractor_analysis": {
        "1": "Zero Trust assumes threats exist both inside and outside the perimeter.",
        "2": "Firewalls and MFA are fundamental controls of Zero Trust.",
        "3": "Encryption in transit and at rest is mandatory under Zero Trust."
      },
      "tags": [
        "zero-trust",
        "cybersecurity",
        "principles"
      ]
    },
    {
      "id": "AZ-207",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.2",
      "type": "single",
      "difficulty": "medium",
      "question": "What is the goal of a Defense in Depth security strategy?",
      "options": [
        "Employing a multi-layered series of defensive mechanisms to slow the advance of an attack that aims at unauthorized data access",
        "Relying entirely on a single perimeter hardware firewall",
        "Hiding server IP addresses behind secret DNS records",
        "Storing user passwords in clear text in database comments"
      ],
      "answer": 0,
      "explanation": "Defense in depth employs a layered approach to security across physical security, identity & access, perimeter, network, compute, application, and data layers.",
      "distractor_analysis": {
        "1": "Single perimeter models fail catastrophically if breached.",
        "2": "Obscurity is not a recognized defensive security standard.",
        "3": "Clear text passwords violate all cryptographic standards."
      },
      "tags": [
        "defense-in-depth",
        "layered-security"
      ]
    },
    {
      "id": "AZ-208",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.2",
      "type": "single",
      "difficulty": "medium",
      "question": "Which Azure security management platform continuously monitors cloud resources, provides a unified Secure Score, and protects hybrid multi-cloud workloads from threats?",
      "options": [
        "Microsoft Defender for Cloud",
        "Azure Bastion",
        "Azure Key Vault",
        "Azure Dedicated Host"
      ],
      "answer": 0,
      "explanation": "Microsoft Defender for Cloud is a Cloud Security Posture Management (CSPM) and Cloud Workload Protection Platform (CWPP) that tracks your overall Secure Score and protects resources against vulnerabilities.",
      "distractor_analysis": {
        "1": "Azure Bastion is a secure browser-based remote desktop connection proxy.",
        "2": "Azure Key Vault is a secret management store.",
        "3": "Azure Dedicated Host provides single-tenant physical servers."
      },
      "tags": [
        "defender-for-cloud",
        "cspm",
        "secure-score"
      ]
    },
    {
      "id": "AZ-209",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.2",
      "type": "single",
      "difficulty": "medium",
      "question": "Which cloud-native service acts as Microsoft's scalable Security Information and Event Management (SIEM) and Security Orchestration, Automation, and Response (SOAR) solution?",
      "options": [
        "Microsoft Sentinel",
        "Azure Service Health",
        "Azure Front Door",
        "Azure Traffic Manager"
      ],
      "answer": 0,
      "explanation": "Microsoft Sentinel delivers intelligent security analytics and threat intelligence across the entire enterprise, providing a single solution for alert detection, threat visibility, proactive hunting, and threat response.",
      "distractor_analysis": {
        "1": "Service Health informs customers of cloud outages and maintenance.",
        "2": "Front Door is a global web load balancer.",
        "3": "Traffic Manager is a DNS load balancer."
      },
      "tags": [
        "sentinel",
        "siem",
        "soar",
        "security-analytics"
      ]
    },
    {
      "id": "AZ-210",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.2",
      "type": "single",
      "difficulty": "easy",
      "question": "Where should developers securely store database connection strings, API tokens, and cryptographic keys rather than embedding them directly in source code?",
      "options": [
        "Azure Key Vault",
        "Public Git repositories",
        "Unencrypted text files on a shared desktop",
        "Virtual Machine host hosts file"
      ],
      "answer": 0,
      "explanation": "Azure Key Vault is a centralized cloud service for securely storing application secrets, encryption keys, and SSL/TLS certificates with strict hardware security module (HSM) backing and access auditing.",
      "distractor_analysis": {
        "1": "Hardcoding secrets into public Git repos leads to immediate credential compromise.",
        "2": "Unencrypted desktop text files provide zero security or access auditing.",
        "3": "The hosts file resolves hostnames to IPs; it cannot store secrets."
      },
      "tags": [
        "key-vault",
        "secrets-management",
        "credentials"
      ]
    },
    {
      "id": "AZ-211",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.1",
      "type": "single",
      "difficulty": "medium",
      "question": "What is the key difference between the Azure Pricing Calculator and the Total Cost of Ownership (TCO) Calculator?",
      "options": [
        "The Pricing Calculator estimates upfront monthly Azure deployment costs; the TCO Calculator compares on-premises datacenter operational costs against migrating to Azure over time.",
        "The Pricing Calculator calculates employee salaries; the TCO Calculator calculates electricity bills.",
        "The Pricing Calculator is only for educational users; the TCO Calculator is for government agencies.",
        "The Pricing Calculator generates legal invoices; the TCO Calculator orders physical servers."
      ],
      "answer": 0,
      "explanation": "The Azure Pricing Calculator estimates estimated monthly costs for provisioned Azure services. The TCO Calculator helps you compare the cost of running on-premises infrastructure versus equivalent services in Azure.",
      "distractor_analysis": {
        "1": "Neither calculator calculates corporate staff salaries directly.",
        "2": "Both calculators are free and public for all commercial and individual users.",
        "3": "Neither calculator issues invoices or purchases hardware."
      },
      "tags": [
        "pricing-calculator",
        "tco-calculator",
        "cost-management"
      ]
    },
    {
      "id": "AZ-212",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.1",
      "type": "single",
      "difficulty": "easy",
      "question": "Which Azure suite allows finance teams to analyze cloud spending, configure budget alerts, and generate automated cost allocation reports?",
      "options": [
        "Microsoft Cost Management + Billing",
        "Azure Marketplace",
        "Azure DevTest Labs",
        "Azure Service Bus"
      ],
      "answer": 0,
      "explanation": "Microsoft Cost Management + Billing helps you monitor, allocate, and optimize cloud costs, enabling the configuration of budget thresholds with email notifications before spending limits are exceeded.",
      "distractor_analysis": {
        "1": "Marketplace is an application store for 3rd-party software.",
        "2": "DevTest Labs manages rapid developer VM provisioning.",
        "3": "Service Bus is a messaging broker."
      },
      "tags": [
        "cost-management",
        "budgets",
        "billing"
      ]
    },
    {
      "id": "AZ-213",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.1",
      "type": "single",
      "difficulty": "easy",
      "question": "How do Resource Tags help enterprises organize and manage cloud resources across multiple resource groups?",
      "options": [
        "Tags provide metadata key-value pairs (e.g., Environment: Production, CostCenter: 104) to categorize resources for cost tracking and billing aggregation.",
        "Tags encrypt virtual hard disks using AES-256.",
        "Tags accelerate network speed across express lanes.",
        "Tags grant administrative access without passwords."
      ],
      "answer": 0,
      "explanation": "Tags are name/value pairs that enable you to categorize resources and view consolidated billing by applying the same tag to multiple resources and resource groups.",
      "distractor_analysis": {
        "1": "BitLocker and Azure Storage Encryption encrypt disks, not tags.",
        "2": "Tags are metadata; they have no impact on network bandwidth.",
        "3": "Tags do not grant access permissions; RBAC governs authorization."
      },
      "tags": [
        "resource-tags",
        "metadata",
        "governance"
      ]
    },
    {
      "id": "AZ-214",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.3",
      "type": "single",
      "difficulty": "medium",
      "question": "Which Azure Monitor feature specifically monitors live web application performance, detects anomalies, and diagnoses performance bottlenecks using telemetry hooks?",
      "options": [
        "Application Insights",
        "Azure Service Health",
        "Azure Event Grid",
        "Azure Logic Apps"
      ],
      "answer": 0,
      "explanation": "Application Insights is an extension of Azure Monitor that provides Application Performance Monitoring (APM) features, tracking live web app requests, exception rates, and response times.",
      "distractor_analysis": {
        "1": "Service Health monitors global Azure datacenter outages and incidents.",
        "2": "Event Grid manages event routing across services.",
        "3": "Logic Apps automates workflow integrations."
      },
      "tags": [
        "application-insights",
        "azure-monitor",
        "telemetry"
      ]
    },
    {
      "id": "AZ-215",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.3",
      "type": "single",
      "difficulty": "easy",
      "question": "Where should an administrator check to see if an unexpected virtual machine outage was caused by an active Microsoft Azure datacenter incident or planned host maintenance?",
      "options": [
        "Azure Service Health",
        "Azure Pricing Calculator",
        "Azure Marketplace",
        "Azure Key Vault"
      ],
      "answer": 0,
      "explanation": "Azure Service Health provides a personalized view of the health of Azure services and regions you are using, informing you about ongoing outages, planned maintenance, and health advisories.",
      "distractor_analysis": {
        "1": "The Pricing Calculator estimates prospective costs.",
        "2": "The Marketplace is a software catalog.",
        "3": "Key Vault stores cryptographic keys and secrets."
      },
      "tags": [
        "service-health",
        "outages",
        "maintenance"
      ]
    },
    {
      "id": "AZ-M-05",
      "exam": "az900",
      "domain": "3.0 Describe Azure management and governance",
      "objective": "3.1",
      "type": "match",
      "difficulty": "medium",
      "question": "Match each management or governance goal to the corresponding Azure governance tool.",
      "explanation": "Service Health alerts on regional outages and planned maintenance. Azure Advisor provides automated best practices across 5 pillars. Azure Monitor collects telemetry, logs, and triggers autoscale. Azure Policy enforces organizational compliance rules. Resource Locks prevent accidental deletion.",
      "tags": [
        "governance",
        "management",
        "match"
      ],
      "pairs": [
        {
          "left": "View upcoming planned datacenter maintenance and ongoing regional outages",
          "right": "Azure Service Health"
        },
        {
          "left": "Personalized best-practice recommendations on cost, security, and reliability",
          "right": "Azure Advisor"
        },
        {
          "left": "Collect operational telemetry, application performance logs, and smart metric alerts",
          "right": "Azure Monitor"
        },
        {
          "left": "Automatically enforce organizational compliance (e.g. restrict VM locations)",
          "right": "Azure Policy"
        },
        {
          "left": "Prevent accidental modification or deletion of critical production resources",
          "right": "Azure Resource Locks"
        }
      ]
    }
  ]
};
