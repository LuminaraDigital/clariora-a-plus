# 22 · Windows Security - Logical Security, Accounts, Domains, Shares & Permissions (Module 15)

**Exam objectives:** Core 2 · 2.1 Summarize various security measures and their purposes · 2.2 Configure and apply basic Microsoft Windows OS security settings · 1.7 (networking: workgroup/domain, shares, mapped drives, printer sharing) · 1.5 (net user, net use, gpupdate/gpresult).

---

# Lesson 15.1 - Logical security concepts

## IAM - Identity and Access Management
The course spells it as four steps: **Identification** (claim who you are - username), **Authentication** (prove it - password/MFA), **Authorization** (what you may do), **Access control / Accounting** (enforce & log). Instructor note: distinguish this **IAAA** from network **AAA** (Authentication, Authorization, Accounting - RADIUS/TACACS+).

## Core control principles
- **ACL** - list of rules/permissions on an object.
- **Implicit deny** - **deny everything unless a rule explicitly allows it** (firewalls, ACLs).
- **Least privilege** - give each user/system **exactly** the access needed - nothing more, nothing less.
- Also: separation of duties, need-to-know, **zero trust** (never trust, always verify - no automatic trust of user *or* device, even inside the network).

## Risk vocabulary - memorise the trio
| Term | Definition |
|---|---|
| **Vulnerability** | Any **weakness** that, if exploited, could cause damage/breach |
| **Threat** | The **potential** (actor/event) to exploit a vulnerability |
| **Risk** | **Likelihood × impact** of a threat actor exercising a vulnerability |
Also **CIA triad**: **Confidentiality, Integrity, Availability**.

## Cryptography basics
| Concept | Meaning |
|---|---|
| **Symmetric** encryption | **Single shared key** encrypts & decrypts (AES) - fast; key distribution problem |
| **Asymmetric** encryption | **Key pair** - public encrypts / private decrypts (RSA, ECC) - slower; enables key exchange & signatures |
| **Hash** | Function that takes any data → **fixed-length digest**; **one-way, does NOT contain the data**; used for **integrity** checks and password storage (SHA-256) |
| **Digital signature** | Hash of a message **encrypted with the sender's private key** → proves **not altered** and **not spoofed** (authenticity/non-repudiation); used on certificates, code, email |
| **Key exchange** | Two systems agree a symmetric session key; **asymmetric keys are used to encrypt/exchange the symmetric key** (TLS handshake, Diffie-Hellman) |

## User and group accounts
- **Local account** - one system only. **Microsoft account** - profile syncs via online portal. **Domain account** - AD.
- **Security groups** - collections of accounts given the same permissions (assign permissions to groups, not users).
- Built-in local groups: **Administrators** (everything), **Users** (standard), **Guest** (legacy, ~User rights, disable it), **Power Users** (legacy, between Users and Admin), Remote Desktop Users, Backup Operators.
- Manage: `lusrmgr.msc`, Settings → Accounts, or **`net user` / `net localgroup`** at the CLI.

## UAC - User Account Control
- Implements **Just-in-Time (JIT)** access / **Privileged Access Management (PAM)** ideas in Windows: even admins run as standard users until a task needs elevation → **UAC prompt must be confirmed** (consent) or **credentials entered** (standard user).
- Slider levels: always notify → default → don't dim → never (don't). Secure desktop dims the screen. Don't disable UAC.

## Authentication methods
- **Multifactor authentication (MFA)** - two+ *different* factors:
  - **Something you know** (password/PIN)
  - **Something you have** (phone, smart card, **hard token**/security key)
  - **Something you are** (biometrics)
  - **Something you do** (behaviour/typing)
  - **Somewhere you are / aren't** (location)
- **2-step verification**, **one-time passwords (OTP/TOTP)**, **authenticator apps** (push or code), SMS codes (weakest), **hardware tokens** (YubiKey), certificates.
- **Zero-trust** framework ties auth to every request.

---

# Lesson 15.2 - Windows security settings

## Login options
- **Local, Windows network (domain), remote** logins.
- **Username + password**; **Windows Hello** - **PIN** (device-bound), **fingerprint**, **facial recognition**; **security key** (FIDO2); picture password.
- **Single sign-on (SSO)** - one authentication, many resources; **SAML** (Security Assertion Markup Language) for federated web SSO; Kerberos inside a domain.

## Domains and Active Directory
| Term | Meaning |
|---|---|
| **Domain** | Central security database & management boundary; requires **Pro/Enterprise/Education** clients |
| **Domain controller (DC)** | Server holding a **copy of the AD database**; authenticates logins; have ≥2 for redundancy (capstone item 8) |
| **Member server** | Joined to the domain, **does not hold AD** (file server, Hyper-V host - capstone item 9) |
| **Security groups** | Domain-wide permission assignment |
| **Organizational units (OUs)** | Containers to organise users/computers and **link Group Policy** |
| Also: forest, tree, trust, global catalog, sites | |

## Group Policy & scripts
- **Group Policy Management Console** (domain) / `gpedit.msc` (local): **GPOs** enforce settings (password policy, software deployment - capstone item 15, drive maps, restrictions, security).
- **`gpupdate`** (`/force`) - pull policy now. **`gpresult`** (`/r`, `/h`) - what applied and from where.
- **Login scripts** - run at logon (map drives, printers) - assigned via GPO/user profile.

---

# Lesson 15.3 - Windows shares

## Workgroup setup
- Peer-to-peer; each PC has its own accounts. **Join a workgroup**: **System Properties (`sysdm.cpl`) → Computer Name → Change**. Enable **network discovery**, **file sharing**, **printer sharing** in advanced sharing settings (private profile).

## Sharing a folder
- Quick: **right-click → Give access to → Specific people** → pick account → Read / Read-Write.
- Advanced: **Properties → Sharing tab → Advanced Sharing** → share name, user limit, **Permissions** (Full Control / Change / Read), caching. Hidden share = `name$` (admin shares `C$`, `ADMIN$`, `IPC$`).
- CLI: `net share name=C:\path /grant:user,full`.

## Browsing & mapping drives
- **Network** node in File Explorer shows discoverable devices; UNC path `\\server\share`.
- **Mapped drive** - assign a letter to a share, **reconnect at sign-in**: Explorer → This PC → Map network drive; CLI **`net use Z: \\server\share /persistent:yes`**; `net use` lists; `net view \\server` shows shares.

## Printer sharing
- **Printer Properties → Sharing tab** → share; provide **additional drivers** for other OS/architectures so clients auto-install.

## NTFS vs Share permissions - the exam classic
| | **Share permissions** | **NTFS permissions** |
|---|---|---|
| Apply when | **Only over the network** | **Local AND network** |
| Set on | Sharing tab → Permissions | **Security tab** |
| Levels | Full Control, Change, Read | Full Control, Modify, Read & Execute, List Folder Contents, Read, Write (+ special) |
| Only on | any FS | NTFS volumes |

Rules:
1. **Combine within** a type: user's **cumulative** allows (union) - but **explicit Deny overrides Allow**.
2. **Combine across** types (network access): **effective permission = the MOST RESTRICTIVE** of (share result) vs (NTFS result). "If one permission is not allowed and the other allows, then not-allowed wins."
3. **Local access** ignores share permissions entirely - NTFS only.
4. Best practice: Share = Everyone/Authenticated Users **Full Control** or **Change**, then control finely with **NTFS**.

## Inheritance
- **Parent folder permissions trickle down** to child folders/files (inheritance).
- Can **disable inheritance** (convert to explicit / remove) and set unique permissions.
- **Copy** within/between volumes → **inherits destination**; **move within same NTFS volume → keeps original**; move to another volume → inherits destination.
- **Explicit** permission beats **inherited**; explicit deny beats explicit allow.

## Domain setup
- Join: **Settings → Accounts → Access work or school → Connect → Join this device to a local AD domain**, or **System Properties → Computer Name → Change → Domain**. Needs domain admin/creds and DNS pointing at the DC. Control then comes via **Group Policy and domain security policy**.

## Home folders, roaming profiles, folder redirection
- **Home folder** - user's files stored on a **server** (mapped e.g. H:); **centralised storage** = monitoring + regular backup; set on the user account profile tab.
- **Roaming profile** - profile copied server↔client at logon/logoff → **log in anywhere, same files/apps/settings**; slow with big profiles.
- **Folder redirection** - GPO redirects Documents/Desktop to server storage → **resilient**, backed up, less profile bloat. Modern alternative: OneDrive Known Folder Move.

## Self-test
1. IAAA vs AAA.
2. Implicit deny; least privilege; zero trust - one line each.
3. Vulnerability / threat / risk definitions.
4. Symmetric vs asymmetric; what a hash is *not*; what a digital signature proves; how key exchange uses asymmetric crypto.
5. Built-in local groups (four). CLI to add a user and put them in Administrators.
6. What UAC implements and what happens when a standard user triggers it.
7. Five MFA factor categories.
8. DC vs member server; what an OU is for; two commands for Group Policy.
9. Share vs NTFS - where set, when applied, and the combining rule. Local access uses which?
10. Copy vs move and inheritance; home folder vs roaming profile vs folder redirection.
