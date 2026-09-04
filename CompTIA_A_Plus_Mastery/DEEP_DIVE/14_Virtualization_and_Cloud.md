# 14 · Virtualization & Cloud Concepts (Module 08)

**Exam objectives:** Core 1 · 4.1 Summarize cloud-computing concepts · 4.2 Summarize aspects of client-side virtualization.

---

# Lesson 8.1 - Client-side virtualization

## Hypervisors
| Type | Where it runs | Examples (deck) | Use |
|---|---|---|---|
| **Type 1 - bare metal** | **Directly on hardware**; the "host OS" is itself a management VM | **Hyper-V**, **VMware ESXi**, (Proxmox, XenServer, KVM) | Servers, datacentres - your capstone's Hyper-V hosts |
| **Type 2 - hosted** | **As an application on top of a host OS** | **Oracle VirtualBox**, **Parallels**, VMware Workstation/Fusion | Desktops, labs, testing |

Deck instructor note: Hyper-V *looks* like it runs on Windows but is actually installed to the hardware; the Windows host becomes a privileged VM beside it → it's **Type 1**.

Terminology: **host** (physical machine/hypervisor), **guest** (VM), **virtual disk** (VHD/VHDX/VMDK), **snapshot/checkpoint**, virtual switch.

## Uses (deck list)
- **Client-side**: **sandboxing** (run untrusted software safely), **legacy OS hosting** (old app needs XP), **cross-platform** (Linux on Windows), **training and labs**.
- **Server-side**: consolidate many server roles onto fewer physical boxes.
- **Desktop virtualization / VDI**: employees use a VM desktop rather than a physical PC (see DaaS below).
- **Application virtualization**: app streamed/isolated (App-V, Citrix).
- **Container**: OS-level virtualization - containers share the host kernel and package just the app + dependencies (Docker, Kubernetes). Lighter and faster than VMs; less isolation.

## Resource requirements
| Resource | Requirement |
|---|---|
| **CPU** | Must support **virtualization extensions (Intel VT-x / AMD-V)** and they must be **enabled in BIOS/UEFI**; enough cores for host + guests |
| **Memory** | Each VM needs at least its OS/app minimum; RAM is usually the first bottleneck; total allocated ≤ physical (dynamic memory helps) |
| **Mass storage** | Physical disk **shared**, each VM gets a **separate logical** virtual disk; SSD strongly recommended |
| **Networking** | Virtual switch modes: **VM ↔ VM**, **VM ↔ host** (host-only/internal), **VM ↔ host's network** (bridged / external, or NAT) |

## Security requirements
- **Guest OS security** - patch and protect each VM like a physical machine; **protect the host OS from issues with VMs** (isolation; malware "VM escape").
- **Host security** - the host is a **single point of failure**: host down = all VMs down; back it up, restrict access.
- **Hypervisor security** - patch the hypervisor; monitor for vulnerabilities; limit management-interface exposure.

---

# Lesson 8.2 - Cloud concepts

## Cloud characteristics (deck)
| Characteristic | Meaning |
|---|---|
| **High availability** | Minimal downtime - redundancy across hardware/sites; measured in "nines" (file 17) |
| **Scalability** | Expand/contract resources based on demand |
| **Elasticity** | Do so **automatically and quickly without affecting service** |
| **Shared resources / resource pooling** | Multi-tenant pooled hardware |
| (also) On-demand self-service, broad network access, **metered/measured service** (pay-as-you-go) | |

## Deployment models
| Model | Description |
|---|---|
| **Public** | Provider's shared infrastructure, **multitenancy** (AWS, Azure, GCP) |
| **Private** | Dedicated to one organisation - on-prem, or **hosted private** (dedicated within a public provider's datacentre) |
| **Community** | Shared by several organisations with common needs (government, healthcare) |
| **Hybrid** | Mix of public + private (burst to public, keep sensitive data private) |

## Service models - memorise who manages what
| Model | You get | You manage | Example |
|---|---|---|---|
| **IaaS** | Servers/VMs, storage, networking, load balancers | OS, middleware, apps, data | AWS EC2, Azure VMs |
| **PaaS** | IaaS + runtime, databases, dev/deploy tools | Just your app & data | Azure App Service, Heroku, Elastic Beanstalk |
| **SaaS** | Complete application in the cloud | Just your data/config | Microsoft 365, Google Workspace, Salesforce |
| **DaaS** | Desktop as a service - hosted virtual desktops | User profile/apps | Windows 365, Azure Virtual Desktop |

Mnemonic: pizza - IaaS = they give you a kitchen; PaaS = they give you dough and oven; SaaS = delivered pizza.

## Cloud file storage
- **File synchronization** - OneDrive, Google Drive, iCloud, Dropbox: tracks changes across devices, versioning, sharing/commenting.
- **Content delivery network (CDN)** - content **replicated across multiple datacentres** near users → faster, more resilient.

## Self-test
1. Type 1 vs Type 2 - definition and two examples each. Which is Hyper-V?
2. Four client-side uses of virtualization?
3. What must be enabled in firmware, and which resource is usually the first bottleneck?
4. Three VM networking modes?
5. Why is the host a single point of failure?
6. Container vs VM.
7. Scalability vs elasticity.
8. Public / private / hosted private / community / hybrid - one line each.
9. IaaS vs PaaS vs SaaS vs DaaS - what does the provider manage in each?
10. What is a CDN?
