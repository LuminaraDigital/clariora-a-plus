"""
tools/build_az500_suite.py
Ingests Azure Mentor Study Guide, Rick Kotlarz Technical Guide, KodeKloud Labs,
and compiles high-yield blueprint-aligned AZ-500 question bank shards,
study library modules, hands-on lab walk-throughs, and scaled scoring metadata.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

ROOT = Path(".")
AZ500_SOURCES = ROOT / "vendor_sources" / "az500"
GUIDE_DIR = AZ500_SOURCES / "azure_mentor_guide"
KODEKLOUD_DIR = AZ500_SOURCES / "kodekloud_az500"
RICKKOTLARZ_FILE = AZ500_SOURCES / "rickkotlarz_az500" / "README.md"
SEEKDAVIDLEE_FILE = AZ500_SOURCES / "seekdavidlee_az500" / "README.md"
SHARDS_DIR = ROOT / "shards" / "az500"

SHARDS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Parse Azure Mentor Guide for Objectives & Study Content
# ---------------------------------------------------------------------------

def extract_objectives_from_guide() -> list[dict]:
    objectives = []
    domains_map = [
        ("1-Secure Identity and Access", "1.0 Manage identity and access", "1.0"),
        ("2-Secure Networking", "2.0 Secure networking", "2.0"),
        ("3-Secure Compute, Storage, and Databases", "3.0 Secure compute, storage, and databases", "3.0"),
        ("4-Secure Azure using Microsoft Defender for Cloud and Microsoft Sentinel", "4.0 Manage security operations", "4.0")
    ]
    
    obj_counter = 1
    
    for file_prefix, domain_name, dom_code in domains_map:
        target_file = None
        if GUIDE_DIR.exists():
            for f in GUIDE_DIR.glob("*.md"):
                if f.name.startswith(file_prefix):
                    target_file = f
                    break
        
        if not target_file or not target_file.exists():
            continue
            
        content = target_file.read_text(encoding="utf-8", errors="replace")
        current_section = ""
        sub_idx = 1
        
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("## "):
                current_section = line.replace("## ", "").strip()
                code_str = f"{dom_code[0]}.{sub_idx}"
                objectives.append({
                    "id": f"az500-{dom_code[0]}-{sub_idx}",
                    "exam": "az500",
                    "exam_code": "AZ-500",
                    "domain": domain_name,
                    "code": code_str,
                    "title": current_section,
                    "checked": False
                })
                sub_idx += 1
            elif (line.startswith("* [") or line.startswith("- [")) and current_section:
                match = re.search(r"[\*\-]\s*\[(.*?)\]\((.*?)\)", line)
                if match:
                    title, url = match.group(1), match.group(2)
                    objectives.append({
                        "id": f"az500-{dom_code[0]}-{sub_idx}-{obj_counter}",
                        "exam": "az500",
                        "exam_code": "AZ-500",
                        "domain": domain_name,
                        "code": f"{dom_code[0]}.{sub_idx - 1}",
                        "title": title,
                        "reference_url": url,
                        "checked": False
                    })
                    obj_counter += 1

    return objectives

# ---------------------------------------------------------------------------
# 2. Extract Hands-On Labs from KodeKloud and Community Sources
# ---------------------------------------------------------------------------

def extract_labs() -> list[dict]:
    labs = []
    if not KODEKLOUD_DIR.exists():
        return labs

    # Map directories to lab details
    lab_configs = [
        ("080-Network Security", "nsg-prep-infra.ps1", "Lab 01: Network Security Groups & ASG Rules Automation", "2.0 Secure networking"),
        ("070-Perimeter Security", "firewall-prep-infra.ps1", "Lab 02: Azure Firewall & Hub-Spoke Route Table Deployment", "2.0 Secure networking"),
        ("080-Network Security", "appgw-prep-infra.ps1", "Lab 03: Application Gateway Web Application Firewall (WAF) Setup", "2.0 Secure networking"),
        ("090-Host Security", "bastion-prep-infra.ps1", "Lab 04: Zero-Trust Host Bastion Architecture Implementation", "2.0 Secure networking"),
        ("110-Key Vault", "akv-fnapp-prep.ps1", "Lab 05: Azure Key Vault & System-Assigned Managed Identity Integration", "4.0 Manage security operations"),
        ("120-App Security", "msi-prep-infra.ps1", "Lab 06: Managed Service Identity (MSI) & RBAC Access Enforcement", "1.0 Manage identity and access"),
        ("140-Database Security", "db-prep-infra.ps1", "Lab 07: Azure SQL Transparent Data Encryption (TDE) & Auditing", "3.0 Secure compute, storage, and databases"),
        ("150-Security Operations", "sentinel-prep-infra.ps1", "Lab 08: Microsoft Sentinel Workspace & Data Connector Provisioning", "4.0 Manage security operations"),
        ("150-Security Operations", "brute-force.ps1", "Lab 09: SecOps Incident Response & Brute-Force Attack Simulation", "4.0 Manage security operations"),
        ("100-Container Security", "dockerfile-prep.ps1", "Lab 10: Container Hardening & Azure Container Registry Security", "3.0 Secure compute, storage, and databases")
    ]

    for dir_name, script_name, title, domain in lab_configs:
        script_path = KODEKLOUD_DIR / dir_name / script_name
        code_content = ""
        if script_path.exists():
            code_content = script_path.read_text(encoding="utf-8", errors="replace")

        labs.append({
            "id": f"lab-az500-{script_name.replace('.ps1', '')}",
            "filename": script_name,
            "title": title,
            "domain": domain,
            "category": "Azure Security Hands-On Lab",
            "exam": "az500",
            "content": f"### {title}\n\n**Domain**: {domain}\n**Script**: `{script_name}`\n\n```powershell\n{code_content}\n```"
        })

    return labs

# ---------------------------------------------------------------------------
# 3. Question Bank Shards (18 D1, 15 D2, 16 D3, 16 D4 = 65 Master Questions)
# ---------------------------------------------------------------------------

DOMAIN_1_QUESTIONS = [
    {
        "id": "AZ500-001",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "An enterprise requires system administrators to have elevated Privileged Identity Management (PIM) permissions to manage Virtual Networks only when needed. What configuration ensures administrators receive JIT access without permanent standing privileges?",
        "options": [
            "Assign the Network Contributor role as an Eligible assignment with required approval and max duration",
            "Assign the Network Contributor role as an Active permanent assignment scoped to the management group",
            "Create an Access Review scheduled for quarterly review without role expiration",
            "Configure a Conditional Access policy requiring MFA for all Azure Virtual Machine sign-ins"
        ],
        "answer": 0,
        "explanation": "In Microsoft Entra Privileged Identity Management (PIM), assigning a role as 'Eligible' means the principal does not have permanent standing access. Instead, they must activate the role just-in-time (JIT), supply ticket justification, satisfy MFA, and await approval if configured.",
        "distractor_analysis": {
            "1": "Active permanent assignments provide standing privileges, which violates zero-standing-privilege security principles.",
            "2": "Access reviews evaluate existing permissions periodically but do not eliminate standing privileges.",
            "3": "Conditional Access policies enforce authentication requirements at sign-in but do not manage JIT RBAC role elevation."
        },
        "tags": ["pim", "identity", "rbac", "zero-trust"]
    },
    {
        "id": "AZ500-002",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.2",
        "type": "single",
        "difficulty": "hard",
        "question": "A software engineering team is building an Azure Function app that needs to read secrets from an Azure Key Vault. What authentication architecture eliminates credential exposure in application configuration settings and supports automatic rotation?",
        "options": [
            "Enable a System-Assigned Managed Identity on the Function App and grant it Key Vault Secrets User RBAC",
            "Create an App Registration with a 2-year client secret and store the secret in local.settings.json",
            "Use Key Vault access policies linked to a service principal certificate stored in Azure Storage",
            "Configure Shared Access Signatures (SAS) with stored access policies on the Key Vault secret URI"
        ],
        "answer": 0,
        "explanation": "Managed identities provide an automatically managed identity in Microsoft Entra ID for Azure resources. Applications use managed identities to obtain Microsoft Entra tokens without needing to manage credentials. Granting the Function App's system-assigned identity the 'Key Vault Secrets User' role adheres to the principle of least privilege.",
        "distractor_analysis": {
            "1": "Hardcoding client secrets in configuration files introduces credential leakage risks and requires manual rotation.",
            "2": "Service principal certificates require maintenance and credential storage overhead compared to managed identities.",
            "3": "Shared Access Signatures (SAS) apply to Azure Storage accounts, not Azure Key Vault secret endpoints."
        },
        "tags": ["managed-identity", "key-vault", "authentication", "rbac"]
    },
    {
        "id": "AZ500-003",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A security engineer must enforce that any user sign-in flagged as 'High Risk' by Microsoft Entra ID Protection is automatically forced to change their password securely. Which Conditional Access control should be configured?",
        "options": [
            "Configure a Conditional Access policy with Condition 'User risk = High' and Grant control 'Require password change'",
            "Configure a Conditional Access policy with Condition 'Sign-in risk = High' and Grant control 'Block access'",
            "Enable Self-Service Password Reset (SSPR) without Conditional Access binding",
            "Deploy Microsoft Sentinel playbook to revoke active session tokens upon sign-in failure"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra ID Protection calculates User Risk (probability of identity compromise) and Sign-In Risk (probability of rogue sign-in attempt). A Conditional Access policy evaluating 'User Risk = High' with the grant control 'Require password change' (which requires SSPR registration) autonomously forces secure credential remediation.",
        "distractor_analysis": {
            "1": "Blocking access prevents remediation and locks out legitimate users indefinitely without self-service recovery.",
            "2": "SSPR alone enables password resets but does not trigger automatically based on risk evaluations.",
            "3": "Sentinel playbooks can revoke sessions reactively, but cannot enforce in-band password changes during auth flow."
        },
        "tags": ["conditional-access", "identity-protection", "user-risk", "sspr"]
    },
    {
        "id": "AZ500-004",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.3",
        "type": "single",
        "difficulty": "hard",
        "question": "An organization wants to create an Azure Custom Role that allows administrators to restart Virtual Machines and view metrics, but strictly prevents them from modifying virtual machine disk configurations or IP allocations. Which JSON action block represents this permission model?",
        "options": [
            "\"Actions\": [\"Microsoft.Compute/virtualMachines/restart/action\", \"Microsoft.Compute/virtualMachines/read\"], \"NotActions\": []",
            "\"Actions\": [\"Microsoft.Compute/*\"], \"NotActions\": [\"Microsoft.Compute/virtualMachines/write\"]",
            "\"Actions\": [\"Microsoft.Compute/virtualMachines/*\"], \"DataActions\": [\"Microsoft.Compute/virtualMachines/restart/action\"]",
            "\"Actions\": [\"*\"], \"NotActions\": [\"Microsoft.Network/*\", \"Microsoft.Storage/*\"]"
        ],
        "answer": 0,
        "explanation": "Azure RBAC best practices dictate defining explicit, least-privilege 'Actions' rather than broad wildcards with NotActions. Specifying 'Microsoft.Compute/virtualMachines/restart/action' and 'Microsoft.Compute/virtualMachines/read' grants restart and read rights while automatically denying writes to disks or network interfaces.",
        "distractor_analysis": {
            "1": "Using 'Microsoft.Compute/*' with a NotAction on write still allows creation/deletion of other compute entities.",
            "2": "Restart is a control-plane action ('Actions'), not a data-plane action ('DataActions').",
            "3": "Wildcard '*' grants high administrative power across subscriptions, violating least privilege principles."
        },
        "tags": ["rbac", "custom-roles", "least-privilege", "control-plane"]
    },
    {
        "id": "AZ500-005",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "To secure external collaboration, an administrator needs to ensure that guest accounts inactive for more than 90 days are automatically removed from Microsoft Entra tenant security groups. What feature provides this automated governance?",
        "options": [
            "Microsoft Entra Access Reviews with auto-apply results based on user inactivity",
            "Privileged Identity Management alert for dormant accounts",
            "Dynamic User Membership rules using user.accountEnabled -eq true",
            "Conditional Access session controls configured with 90-day sign-in frequency"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra Access Reviews allow organizations to review group memberships and application assignments. By scoping an access review to guest users, setting recurrence, evaluating inactivity (e.g., inactive for 90 days), and enabling 'Auto apply results to resource', dormant guest access is automatically revoked.",
        "distractor_analysis": {
            "1": "PIM alerts notify administrators of privileged role health but do not automatically purge guest members from security groups.",
            "2": "Dynamic membership rules evaluate user attributes, but standard directory attributes do not calculate 90-day inactivity purges.",
            "3": "Sign-in frequency controls require re-authentication but do not remove accounts from security groups upon prolonged inactivity."
        },
        "tags": ["access-reviews", "governance", "entra-id", "guest-access"]
    },
    {
        "id": "AZ500-006",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.2",
        "type": "single",
        "difficulty": "medium",
        "question": "A developer registers an application in Microsoft Entra ID that accesses Microsoft Graph to read directory data on behalf of a signed-in user. Which permission type and consent mechanism are required?",
        "options": [
            "Delegated permissions with admin consent granted if accessing tenant-wide directory details",
            "Application permissions with self-service user consent",
            "Direct Azure RBAC Reader assignment on the Microsoft Entra tenant root",
            "Managed Identity assignment with Directory Readers role assigned in Key Vault"
        ],
        "answer": 0,
        "explanation": "Delegated permissions run in the security context of a signed-in user. When accessing sensitive tenant data such as directory details across the tenant, Microsoft Entra ID requires an administrator to grant tenant-wide admin consent for the requested delegated scopes.",
        "distractor_analysis": {
            "1": "Application permissions run without a signed-in user (as a daemon) and can NEVER be consented to by regular users; they strictly require admin consent.",
            "2": "Azure RBAC does not grant Microsoft Graph API permissions; Microsoft Entra OAuth permissions are distinct from Azure resource RBAC.",
            "3": "Key Vault cannot assign Microsoft Entra directory roles to managed identities."
        },
        "tags": ["app-registration", "oauth", "delegated-permissions", "consent"]
    },
    {
        "id": "AZ500-007",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "An enterprise wants to protect on-premises Active Directory accounts from using easily guessable corporate terms or localized profanities in their passwords. Which hybrid security solution synchronizes custom banned password lists to on-premises domain controllers?",
        "options": [
            "Microsoft Entra Password Protection with the on-premises DC agent and proxy service",
            "Azure AD Connect Cloud Sync password hash synchronization only",
            "Active Directory Federation Services (AD FS) claim rules",
            "Microsoft Defender for Identity sensor running on Domain Controllers"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra Password Protection detects and blocks known weak and banned passwords. By installing the Microsoft Entra Password Protection DC agent and proxy service on on-premises domain controllers, custom banned password lists and global banned lists are enforced on-premises during password change events.",
        "distractor_analysis": {
            "1": "Password hash sync replicates password hashes to Entra ID but does not enforce custom banned dictionary checks on on-premises DCs during resets.",
            "2": "AD FS handles authentication federation, not password dictionary validation at the local DC level.",
            "3": "Defender for Identity monitors network traffic and logs for attack reconnaissance (e.g. Pass-the-Hash) but does not validate password complexity policies."
        },
        "tags": ["password-protection", "hybrid-identity", "entra-id", "active-directory"]
    },
    {
        "id": "AZ500-008",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.3",
        "type": "single",
        "difficulty": "hard",
        "question": "A global company has regional IT departments in EMEA, APAC, and Americas. Regional helpdesk staff must be allowed to reset passwords only for users residing in their specific geographic region. How should the users and administrative rights be partitioned in Microsoft Entra ID?",
        "options": [
            "Create Administrative Units (AUs) for each region, add regional users, and assign the Password Administrator role scoped to each AU",
            "Create separate Microsoft Entra tenants for EMEA, APAC, and Americas linked via B2B collaboration",
            "Assign the Helpdesk Administrator role at the Root Management Group level with an Azure Policy deny rule",
            "Create regional Security Groups and assign the User Administrator role scoped to the group object"
        ],
        "answer": 0,
        "explanation": "Administrative Units (AUs) allow an organization to subdivide a Microsoft Entra directory into smaller administrative boundaries. Roles like User Administrator or Password Administrator can be assigned with an Administrative Unit as the scope, restricting the helpdesk staff's authority strictly to users within that AU.",
        "distractor_analysis": {
            "1": "Deploying multiple tenants creates massive overhead, breaks unified SSO, and introduces B2B collaboration complexity.",
            "2": "Azure Policy governs Azure Resource Manager resources, not Microsoft Entra directory objects or role permissions.",
            "3": "Scoping a role to a security group in Entra ID delegates management of the group itself, not management of the individual user objects inside it."
        },
        "tags": ["administrative-units", "delegation", "entra-id", "least-privilege"]
    },
    {
        "id": "AZ500-009",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which Microsoft Entra feature continuously monitors and remediates permission creep, identifying identities with excessive unused permissions across multi-cloud environments (Azure, AWS, GCP)?",
        "options": [
            "Microsoft Entra Permissions Management (Cloud Infrastructure Entitlement Management - CIEM)",
            "Microsoft Defender for Cloud Security Posture Management (CSPM)",
            "Microsoft Entra Privileged Identity Management (PIM)",
            "Microsoft Entra ID Protection"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra Permissions Management is a comprehensive CIEM solution that provides granular visibility into permissions assigned to all identities across Azure, AWS, and GCP. It calculates the Permission Creep Index (PCI) and allows automated right-sizing of unused permissions.",
        "distractor_analysis": {
            "1": "CSPM assesses workload configuration baselines and compliance, but does not provide deep cross-cloud CIEM identity permission right-sizing.",
            "2": "PIM manages just-in-time role activation within Azure/Entra ID, but does not scan and right-size AWS IAM or GCP identities.",
            "3": "Entra ID Protection calculates user and sign-in risk scores based on leaked credentials and anomalous telemetry."
        },
        "tags": ["ciem", "permissions-management", "multi-cloud", "least-privilege"]
    },
    {
        "id": "AZ500-010",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.2",
        "type": "single",
        "difficulty": "medium",
        "question": "What is a key architectural difference between a System-Assigned Managed Identity and a User-Assigned Managed Identity in Azure?",
        "options": [
            "System-assigned lifecycle is tied directly to the Azure resource instance; user-assigned is an independent standalone resource that can be shared across multiple resources",
            "System-assigned supports Microsoft Entra ID; user-assigned requires local active directory domain joining",
            "System-assigned supports Azure RBAC, while user-assigned only supports Key Vault access policies",
            "User-assigned identities do not generate client IDs or service principals in the Microsoft Entra tenant"
        ],
        "answer": 0,
        "explanation": "A System-Assigned Managed Identity is enabled directly on an Azure service instance and shares its lifecycle (when the VM/App is deleted, the identity is automatically deleted). A User-Assigned Managed Identity is created as a standalone Azure resource and can be assigned to one or more Azure resource instances.",
        "distractor_analysis": {
            "1": "Both identity types are native cloud Microsoft Entra ID service principals and do not require on-premises AD.",
            "2": "Both system-assigned and user-assigned identities fully support Azure RBAC and Key Vault access policies.",
            "3": "Both types create corresponding service principals in Microsoft Entra ID."
        },
        "tags": ["managed-identity", "cloud-architecture", "lifecycle", "entra-id"]
    },
    {
        "id": "AZ500-011",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A security auditor discovers that developers are bypassing MFA when logging in from home networks. Which Conditional Access policy architecture guarantees MFA enforcement regardless of trusted location status?",
        "options": [
            "A policy targeting 'All cloud apps' with Grant control 'Require multifactor authentication' without excluding trusted IP ranges",
            "A policy targeting 'Azure Management' and excluding all Named Locations",
            "An Azure Policy denying VM start actions unless tagged with MFA=Enabled",
            "A PIM setting requiring ticket numbers but disabling MFA verification"
        ],
        "answer": 0,
        "explanation": "Conditional Access policies enforce requirements based on defined conditions and grant controls. If an enterprise wants unconditional MFA, the policy must target all users and all cloud apps, require MFA as the grant control, and explicitly avoid excluding any location or IP range.",
        "distractor_analysis": {
            "1": "Excluding Named Locations bypasses MFA when traffic matches those IPs, allowing home networks if misconfigured.",
            "2": "Azure Policy operates on Resource Manager templates and resource metadata, not user authentication handshakes.",
            "3": "Disabling MFA in PIM removes multifactor protection entirely during role elevation."
        },
        "tags": ["conditional-access", "mfa", "audit", "compliance"]
    },
    {
        "id": "AZ500-012",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.3",
        "type": "single",
        "difficulty": "hard",
        "question": "When defining an Azure custom role in JSON, what is the purpose of the 'NotActions' property?",
        "options": [
            "It subtracts specific operations from the set of operations granted by the 'Actions' property",
            "It serves as a permanent deny that overrides any other role assignments granting that permission",
            "It specifies data-plane permissions that are denied across storage blobs and tables",
            "It defines the management groups where the role cannot be assigned"
        ],
        "answer": 0,
        "explanation": "In Azure RBAC, 'NotActions' is NOT a deny rule. It simply subtracts operations from the 'Actions' list of that specific role definition. If a user is assigned another role (such as Contributor) that grants that permission, the user will still have that permission.",
        "distractor_analysis": {
            "1": "Azure RBAC NotActions is not an explicit deny; it does not block permissions granted by other roles (Azure Deny Assignments do).",
            "2": "Data-plane exclusions are managed under 'NotDataActions', not 'NotActions'.",
            "3": "Scopes where the role can be assigned are defined in 'AssignableScopes'."
        },
        "tags": ["rbac", "custom-roles", "notactions", "authorization"]
    },
    {
        "id": "AZ500-013",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which authentication protocol should an engineer configure when federating Microsoft Entra ID with an enterprise SaaS application that supports modern web single sign-on (SSO)?",
        "options": [
            "SAML 2.0 or OpenID Connect (OIDC)",
            "Kerberos Constrained Delegation (KCD)",
            "NTLMv2 over SMB",
            "RADIUS / MS-CHAPv2"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra ID supports SAML 2.0, OpenID Connect (OIDC), and WS-Federation for web-based single sign-on with enterprise SaaS applications. SAML 2.0 and OIDC are the industry standards for cloud identity federation.",
        "distractor_analysis": {
            "1": "Kerberos Constrained Delegation is an on-premises Windows protocol used primarily with Application Proxy, not cloud SaaS SSO.",
            "2": "NTLMv2 is a legacy Windows LAN authentication protocol unsuited for modern web SaaS federation.",
            "3": "RADIUS is commonly used for VPN and 802.1X network access, not web enterprise application SSO."
        },
        "tags": ["sso", "saml", "oidc", "federation"]
    },
    {
        "id": "AZ500-014",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.2",
        "type": "single",
        "difficulty": "medium",
        "question": "An administrator needs to publish an on-premises web application to remote employees without opening inbound firewall ports on the corporate network perimeter. Which Microsoft Entra component enables this?",
        "options": [
            "Microsoft Entra Application Proxy with outbound-only connector agents",
            "Azure ExpressRoute with Microsoft Peering",
            "Site-to-Site IPsec VPN Gateway with BGP routing",
            "Azure Front Door with custom domain DNS routing"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra Application Proxy enables remote users to access on-premises web applications through a secure cloud reverse proxy. The on-premises Application Proxy connector requires only outbound HTTPS connections to Microsoft Entra ID, eliminating the need to open inbound ports.",
        "distractor_analysis": {
            "1": "ExpressRoute requires dedicated private telecommunication circuits and significant provisioning overhead.",
            "2": "Site-to-Site VPN creates network-level tunneling rather than application-layer zero-trust publishing.",
            "3": "Azure Front Door requires public internet endpoints to route traffic, which would expose the on-premises server."
        },
        "tags": ["app-proxy", "zero-trust", "remote-access", "perimeter"]
    },
    {
        "id": "AZ500-015",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the security advantage of using FIDO2 WebAuthn security keys over SMS-based verification for Microsoft Entra MFA?",
        "options": [
            "FIDO2 keys provide phishing-resistant authentication bound cryptographically to the relying party domain",
            "FIDO2 keys do not require internet access on the user client machine",
            "FIDO2 keys eliminate the need for Microsoft Entra ID tenant directory lookups",
            "FIDO2 keys automatically grant Global Administrator privileges upon insertion"
        ],
        "answer": 0,
        "explanation": "FIDO2 security keys use public-key cryptography and origin binding, making them immune to adversary-in-the-middle (AiTM) phishing attacks. SMS verification codes can be intercepted via SIM swapping, SS7 attacks, or forwarded through phishing proxies.",
        "distractor_analysis": {
            "1": "Client machines still require internet connectivity to communicate with the identity provider during authentication.",
            "2": "Directory lookups and token issuance still take place in Microsoft Entra ID.",
            "3": "Security keys are an authentication credential, not an authorization elevation mechanism."
        },
        "tags": ["fido2", "phishing-resistant", "mfa", "webauthn"]
    },
    {
        "id": "AZ500-016",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A company must prevent unauthorized users from deploying resources outside of the 'Australia East' region across all production subscriptions. Which governance tool enforces this at the control plane?",
        "options": [
            "Azure Policy with an 'Allowed locations' policy definition assigned to the Management Group",
            "A Network Security Group inbound rule blocking non-Australian IP ranges",
            "Microsoft Entra Conditional Access location condition set to Australia",
            "Resource Locks applied with the 'ReadOnly' setting on all resource groups"
        ],
        "answer": 0,
        "explanation": "Azure Policy enforces organizational standards and assesses compliance at scale across Azure Resource Manager. Assigning the built-in 'Allowed locations' policy definition with 'Australia East' at the Management Group level prevents deployment of resources into any other region.",
        "distractor_analysis": {
            "1": "NSGs filter network packet traffic at the subnet/NIC level; they cannot inspect or block ARM resource deployment regions.",
            "2": "Conditional Access validates user sign-in context, not the datacenter location where a VM or database is instantiated.",
            "3": "ReadOnly resource locks prevent all creation, updates, and deletions, which would stop legitimate deployments in Australia East."
        },
        "tags": ["azure-policy", "governance", "compliance", "management-groups"]
    },
    {
        "id": "AZ500-017",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.1",
        "type": "single",
        "difficulty": "hard",
        "question": "In Microsoft Entra Privileged Identity Management (PIM) for Azure Resources, what happens when an Eligible role assignment's expiration date arrives?",
        "options": [
            "The user can no longer activate the role until an administrator extends or renews the eligible assignment",
            "The role automatically converts to an Active permanent assignment",
            "The user's Microsoft Entra account is disabled in the directory",
            "The role elevation is immediately triggered and locked active"
        ],
        "answer": 0,
        "explanation": "When an eligible assignment expires in PIM, the user loses the ability to activate the role. If the user still requires the role, a privileged administrator must approve an extension (before expiration) or renewal (after expiration).",
        "distractor_analysis": {
            "1": "PIM never promotes an expired eligible role to active permanent status; that would invert zero-trust security.",
            "2": "PIM manages role assignments, not user account lifecycle; the directory account remains active.",
            "3": "Expiration revokes activation eligibility rather than forcing permanent activation."
        },
        "tags": ["pim", "lifecycle", "role-assignment", "zero-trust"]
    },
    {
        "id": "AZ500-018",
        "exam": "az500",
        "domain": "1.0 Manage identity and access",
        "objective": "1.2",
        "type": "single",
        "difficulty": "medium",
        "question": "An enterprise is configuring Microsoft Entra Connect Cloud Sync. Which lightweight agent is installed on on-premises Windows servers to facilitate cloud-based identity synchronization?",
        "options": [
            "Microsoft Entra provisioning agent",
            "Azure Log Analytics MMA agent",
            "Microsoft Defender for Identity sensor",
            "Azure Arc Connected Machine agent"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra Connect Cloud Sync utilizes the Microsoft Entra provisioning agent installed on-premises. The synchronization engine runs in the Microsoft cloud, reducing on-premises server footprint compared to classic Azure AD Connect.",
        "distractor_analysis": {
            "1": "Log Analytics agents collect event logs and performance metrics, not directory synchronization data.",
            "2": "Defender for Identity sensors monitor domain controller network traffic to detect lateral movement.",
            "3": "Azure Arc Connected Machine agents onboard non-Azure servers for Azure Resource Manager governance."
        },
        "tags": ["cloud-sync", "hybrid-identity", "provisioning-agent", "entra-id"]
    }
]

DOMAIN_2_QUESTIONS = [
    {
        "id": "AZ500-019",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "An organization has a Virtual Network containing three subnets: WebSubnet, AppSubnet, and DbSubnet. How should Network Security Groups (NSGs) be configured to allow AppSubnet to receive traffic only from WebSubnet, while blocking all direct Internet access to AppSubnet?",
        "options": [
            "Attach an NSG to AppSubnet with an Inbound Allow rule from WebSubnet prefix and an Inbound Deny rule from 'Internet' service tag with lower priority number than default rules",
            "Attach an NSG to WebSubnet with an Outbound Deny rule to all 0.0.0.0/0 IP addresses",
            "Deploy an Azure Load Balancer with basic SKU in front of AppSubnet",
            "Configure a User-Defined Route on AppSubnet with next hop set to 'VirtualNetworkGateway'"
        ],
        "answer": 0,
        "explanation": "NSGs process rules by priority (lowest number evaluated first). Placing an NSG on AppSubnet with an Inbound Allow rule specifying WebSubnet as the source, combined with an Inbound Deny rule from the 'Internet' service tag (priority e.g., 200), ensures web traffic is accepted while direct internet access is explicitly rejected.",
        "distractor_analysis": {
            "1": "Filtering on WebSubnet outbound does not protect AppSubnet from rogue traffic originating from other subnets or external sources.",
            "2": "Basic load balancers do not provide stateful firewall filtering and are retired in favor of Standard load balancers with NSGs.",
            "3": "Routing traffic to a VPN gateway does not isolate subnets from direct ingress without NSG filtering."
        },
        "tags": ["nsg", "network-security", "service-tags", "subnets"]
    },
    {
        "id": "AZ500-020",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A company wants to manage security rules for 50 web servers across multiple subnets without having to update individual IP addresses in NSG rules whenever new VMs are deployed. What feature satisfies this requirement?",
        "options": [
            "Application Security Groups (ASGs)",
            "Virtual Network NAT Gateways",
            "Azure Route Server",
            "Virtual Network Peering with gateway transit"
        ],
        "answer": 0,
        "explanation": "Application Security Groups (ASGs) allow administrators to group virtual machine network interfaces (NICs) into logical application tiers (e.g. 'ASG-Web'). NSG rules can then reference 'ASG-Web' as source or destination, dynamically applying rules as new VMs join the ASG without updating IP lists.",
        "distractor_analysis": {
            "1": "NAT Gateways provide outbound internet connectivity for subnets, not dynamic security rule grouping.",
            "2": "Azure Route Server facilitates BGP route exchange between network virtual appliances and VNets.",
            "3": "VNet Peering connects distinct virtual networks together but does not abstract IP management in NSGs."
        },
        "tags": ["asg", "nsg", "microsegmentation", "networking"]
    },
    {
        "id": "AZ500-021",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.2",
        "type": "single",
        "difficulty": "hard",
        "question": "A financial application hosted on Azure VMs must connect to an Azure SQL Database. The compliance standard mandates that traffic MUST NOT traverse the public internet and must connect via a private IP within the VNet. Which network technology should be implemented?",
        "options": [
            "Azure Private Endpoint (Azure Private Link)",
            "Virtual Network Service Endpoints",
            "Azure Bastion host with IP forwarding",
            "Point-to-Site VPN connected to Azure SQL public IP"
        ],
        "answer": 0,
        "explanation": "Azure Private Endpoint brings Azure PaaS services (like Azure SQL or Storage) directly into the customer's Virtual Network by assigning it a private IP address from a VNet subnet. Traffic flows entirely over the Microsoft private backbone, and the public endpoint can be completely disabled.",
        "distractor_analysis": {
            "1": "Service Endpoints route traffic privately over the Azure backbone, but the PaaS resource retains a public IP address.",
            "2": "Azure Bastion provides secure RDP/SSH access to VMs, not data-plane connectivity between VMs and databases.",
            "3": "P2S VPN is for client-to-VNet remote worker access, not inter-service private communication."
        },
        "tags": ["private-link", "private-endpoint", "database-security", "zero-trust"]
    },
    {
        "id": "AZ500-022",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "To satisfy security compliance, an administrator needs to inspect and filter all outbound HTTP/HTTPS internet traffic originating from production VMs using Fully Qualified Domain Name (FQDN) filtering. Which service should be deployed in a dedicated subnet named AzureFirewallSubnet?",
        "options": [
            "Azure Firewall",
            "Network Security Group with Service Tags",
            "Azure Web Application Firewall on Application Gateway",
            "Azure Virtual Network Gateway with BGP"
        ],
        "answer": 0,
        "explanation": "Azure Firewall is a cloud-native, stateful firewall service that supports Application Rules with FQDN filtering (e.g. allowing outbound access only to '*.microsoft.com' or 'windowsupdate.com'). It must be deployed into a dedicated subnet named exactly 'AzureFirewallSubnet'.",
        "distractor_analysis": {
            "1": "NSGs operate at layers 3 and 4 (IP/port) and do not support layer 7 application-layer FQDN string filtering.",
            "2": "WAF on Application Gateway is primarily designed to inspect inbound HTTP/HTTPS traffic for web exploits, not outbound egress from VMs.",
            "3": "VNet Gateways handle VPN/ExpressRoute tunnels, not stateful outbound application filtering."
        },
        "tags": ["azure-firewall", "fqdn-filtering", "egress-filtering", "networking"]
    },
    {
        "id": "AZ500-023",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.2",
        "type": "single",
        "difficulty": "medium",
        "question": "A systems engineer must allow operations staff to administer Azure Windows and Linux virtual machines via RDP and SSH without assigning public IP addresses to the VMs or exposing management ports (3389/22) to the internet. Which solution meets these criteria?",
        "options": [
            "Deploy Azure Bastion in a dedicated 'AzureBastionSubnet'",
            "Create an NSG rule allowing ports 22 and 3389 from 'Internet'",
            "Configure a DNAT rule on Azure Firewall mapping public port 443 to port 3389",
            "Deploy an open source SSH proxy on an unprotected public VM"
        ],
        "answer": 0,
        "explanation": "Azure Bastion is a fully managed PaaS service deployed into 'AzureBastionSubnet'. It provides seamless, secure RDP and SSH connectivity directly through the Azure portal over TLS (port 443) using modern HTML5 browsers, eliminating public IPs on target VMs.",
        "distractor_analysis": {
            "1": "Exposing ports 3389 and 22 to the Internet creates severe brute-force and vulnerability exploit surfaces.",
            "2": "DNAT mapping still exposes management access to public IPs and requires opening firewall ports.",
            "3": "An unprotected jump host creates a single point of compromise without PaaS security isolation."
        },
        "tags": ["bastion", "rdp", "ssh", "zero-trust"]
    },
    {
        "id": "AZ500-024",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.1",
        "type": "single",
        "difficulty": "hard",
        "question": "A network security architect must force all virtual machine outbound internet traffic through an Azure Firewall NVA located at IP 10.0.1.4. Which User-Defined Route (UDR) table configuration implements this forced tunneling?",
        "options": [
            "Address prefix: 0.0.0.0/0, Next hop type: Virtual appliance, Next hop IP address: 10.0.1.4",
            "Address prefix: 10.0.0.0/16, Next hop type: Internet, Next hop IP address: None",
            "Address prefix: 0.0.0.0/0, Next hop type: Virtual network gateway",
            "Address prefix: 10.0.1.4/32, Next hop type: None"
        ],
        "answer": 0,
        "explanation": "In Azure routing, adding a route for prefix 0.0.0.0/0 with Next Hop Type 'Virtual appliance' and pointing to the private IP of the Azure Firewall (10.0.1.4) overrides the default system route for internet traffic, forcing all outbound egress through the firewall for inspection.",
        "distractor_analysis": {
            "1": "Routing RFC 1918 private range to 'Internet' drops or misroutes internal network traffic.",
            "2": "Next hop 'Virtual network gateway' directs traffic across an ExpressRoute or S2S VPN to on-premises, not the local Azure Firewall.",
            "3": "A /32 route to the firewall IP itself creates an invalid route loop without routing outbound internet traffic."
        },
        "tags": ["udr", "routing", "forced-tunneling", "azure-firewall"]
    },
    {
        "id": "AZ500-025",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A public web application hosted on Azure App Services is under targeted SQL Injection and Cross-Site Scripting (XSS) attacks. What layer 7 security service with OWASP Core Rule Set (CRS) should be placed in front of the application?",
        "options": [
            "Azure Web Application Firewall (WAF) on Azure Application Gateway or Azure Front Door",
            "Azure DDoS Network Protection",
            "Network Security Group with stateful TCP packet inspection",
            "Azure NAT Gateway"
        ],
        "answer": 0,
        "explanation": "Azure Web Application Firewall (WAF) operates at Layer 7 and provides centralized protection against common web exploits based on OWASP Core Rule Sets (such as SQL injection, XSS, and command injection) when deployed on Application Gateway or Front Door.",
        "distractor_analysis": {
            "1": "Azure DDoS Network Protection mitigates Layer 3 and Layer 4 volumetric attacks (SYN floods, UDP amplification), not Layer 7 payload exploits.",
            "2": "NSGs operate at Layers 3/4 and cannot parse HTTP payload bodies to detect SQLi or XSS.",
            "3": "NAT Gateways provide outbound SNAT translation for private subnets and provide no inbound protection."
        },
        "tags": ["waf", "owasp", "sql-injection", "application-gateway"]
    },
    {
        "id": "AZ500-026",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.3",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the difference between Azure WAF 'Detection mode' and 'Prevention mode'?",
        "options": [
            "Detection mode monitors and logs matched requests without blocking; Prevention mode actively blocks requests matching rule criteria",
            "Detection mode operates at Layer 3; Prevention mode operates at Layer 7",
            "Detection mode is free; Prevention mode requires a dedicated ExpressRoute circuit",
            "Detection mode applies only to HTTPS; Prevention mode applies only to HTTP"
        ],
        "answer": 0,
        "explanation": "In Azure WAF, 'Detection mode' observes and logs request attributes and threats to diagnostic storage or Log Analytics without taking action. 'Prevention mode' actively blocks requests that match configured rules (returning HTTP 403 Forbidden).",
        "distractor_analysis": {
            "1": "WAF operates at Layer 7 in both modes.",
            "2": "WAF mode selection is a software policy setting and does not require ExpressRoute circuits.",
            "3": "Both modes support both HTTP and HTTPS protocols."
        },
        "tags": ["waf", "detection-mode", "prevention-mode", "secops"]
    },
    {
        "id": "AZ500-027",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the default priority order for Network Security Group rules in Azure?",
        "options": [
            "Rules with lower numbers have higher priority and are processed first (e.g., 100 before 200)",
            "Rules with higher numbers have higher priority and are processed first (e.g., 4000 before 100)",
            "Rules are processed alphabetically by rule name",
            "Deny rules always execute before Allow rules regardless of priority numbers"
        ],
        "answer": 0,
        "explanation": "Azure NSG rules are evaluated in order of priority: numbers range from 100 to 4096, and rules with LOWER numbers are evaluated first. Once traffic matches a rule, processing stops and that action is taken.",
        "distractor_analysis": {
            "1": "Higher numbers have lower priority, not higher priority.",
            "2": "Rule names are labels for documentation; rule order is determined strictly by integer priority values.",
            "3": "A lower-number Allow rule (e.g., priority 100) will execute before a higher-number Deny rule (e.g., priority 200)."
        },
        "tags": ["nsg", "rule-evaluation", "priority", "firewall"]
    },
    {
        "id": "AZ500-028",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.2",
        "type": "single",
        "difficulty": "hard",
        "question": "Two Virtual Networks, VNet1 and VNet2, are connected via Global Virtual Network Peering. A network engineer notices that VM1 in VNet1 cannot ping VM2 in VNet2. What default NSG behavior or network characteristic explains this?",
        "options": [
            "Virtual Network Peering includes both VNets under the default 'VirtualNetwork' service tag, so an explicit NSG Deny rule must be blocking the traffic",
            "Virtual Network Peering automatically blocks ICMP traffic across regions",
            "Traffic across peered VNets must traverse the public internet and requires public IPs",
            "Peered virtual networks require a VPN Gateway to establish private routing"
        ],
        "answer": 0,
        "explanation": "When VNets are peered, the default NSG Inbound rule 'AllowVNetInBound' expands to include the peered VNet's address space. Therefore, if communication fails, an administrator has likely configured a custom NSG rule that blocks traffic, or OS firewalls inside the VMs are blocking ICMP.",
        "distractor_analysis": {
            "1": "Peering does not natively block ICMP; ICMP is allowed unless dropped by NSGs or host OS firewalls.",
            "2": "VNet Peering traffic stays entirely on the private Microsoft backbone network and never traverses the public internet.",
            "3": "VNet Peering establishes direct private connectivity without requiring any VPN Gateways."
        },
        "tags": ["vnet-peering", "service-tags", "nsg", "troubleshooting"]
    },
    {
        "id": "AZ500-029",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.3",
        "type": "single",
        "difficulty": "medium",
        "question": "Which Azure DDoS Protection tier is specifically optimized for small-to-medium businesses wanting cost-effective protection scoped to an individual public IP address without paying for tenant-wide protection plans?",
        "options": [
            "Azure DDoS IP Protection",
            "Azure DDoS Network Protection",
            "Azure DDoS Infrastructure Protection (Basic)",
            "Azure Front Door Standard"
        ],
        "answer": 0,
        "explanation": "Azure DDoS IP Protection is designed for small-to-medium businesses, providing enterprise-grade DDoS mitigation features on a per-public-IP basis without requiring a monthly tenant-level commitment.",
        "distractor_analysis": {
            "1": "DDoS Network Protection protects all public IPs across an entire virtual network and carries a substantial monthly base cost.",
            "2": "DDoS Basic/Infrastructure protection is automatic and protects Microsoft's overall infrastructure, but does not provide customer-level telemetry or tuning.",
            "3": "Azure Front Door is a global CDN/load balancer, not a dedicated per-IP DDoS tier."
        },
        "tags": ["ddos", "ip-protection", "network-security", "perimeter"]
    },
    {
        "id": "AZ500-030",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.1",
        "type": "single",
        "difficulty": "hard",
        "question": "An administrator configures an NSG associated with a Subnet and another NSG associated with a Network Interface (NIC) on a VM in that subnet. What is the order of evaluation for INBOUND and OUTBOUND traffic?",
        "options": [
            "Inbound: Subnet NSG first, then NIC NSG; Outbound: NIC NSG first, then Subnet NSG",
            "Inbound: NIC NSG first, then Subnet NSG; Outbound: Subnet NSG first, then NIC NSG",
            "Both Inbound and Outbound evaluate Subnet NSG first, then NIC NSG",
            "Both Inbound and Outbound evaluate NIC NSG first, then Subnet NSG"
        ],
        "answer": 0,
        "explanation": "For Inbound traffic entering a VM, packet flow hits the Subnet NSG first; if allowed, it then hits the NIC NSG. For Outbound traffic leaving a VM, packet flow hits the NIC NSG first; if allowed, it then hits the Subnet NSG. Traffic must pass BOTH filters to succeed.",
        "distractor_analysis": {
            "1": "Inverts the physical network topology flow.",
            "2": "Outbound originates from the VM/NIC, so NIC NSG must evaluate before the packet reaches the subnet boundary.",
            "3": "Inbound arrives at the subnet router before reaching the VM NIC."
        },
        "tags": ["nsg", "packet-flow", "evaluation-order", "networking"]
    },
    {
        "id": "AZ500-031",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.2",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary risk of using 'Service Endpoints' compared to 'Private Endpoints' when securing access to multi-tenant Azure services like Azure Storage?",
        "options": [
            "Service Endpoints still allow data exfiltration to unauthorized storage accounts in the same Azure region unless Service Endpoint Policies are applied",
            "Service Endpoints require public internet bandwidth fees",
            "Service Endpoints do not support Azure Storage encryption at rest",
            "Service Endpoints require on-premises VPN tunnels to function"
        ],
        "answer": 0,
        "explanation": "With Service Endpoints, any VM in the subnet can access ANY storage account in the region over the backbone unless restricted by Service Endpoint Policies. In contrast, Private Endpoints link strictly to ONE specific resource instance via a private IP, preventing data exfiltration to unapproved accounts.",
        "distractor_analysis": {
            "1": "Service endpoint traffic stays on the Microsoft backbone and does not incur public internet transit fees.",
            "2": "Storage encryption at rest is an underlying storage service feature independent of network endpoints.",
            "3": "Service endpoints work inside Azure VNets and do not require on-premises VPN tunnels."
        },
        "tags": ["service-endpoints", "private-endpoints", "data-exfiltration", "storage"]
    },
    {
        "id": "AZ500-032",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A security team needs to log and analyze all IP network traffic flowing into and out of network interfaces across a virtual network, including permitted and denied flows. Which Azure Network Watcher feature provides this?",
        "options": [
            "VNet Flow Logs (or NSG Flow Logs) with Traffic Analytics enabled",
            "Azure Monitor Metric Alerts",
            "Connection Monitor ICMP probes",
            "Packet Capture saved to local VM temp drive"
        ],
        "answer": 0,
        "explanation": "NSG / VNet Flow Logs capture source/dest IP, port, protocol, and allow/deny decision for all traffic. When combined with Traffic Analytics, flow logs are ingested into Log Analytics to visualize traffic hotspots, malicious IP sources, and compliance topology.",
        "distractor_analysis": {
            "1": "Metric alerts monitor threshold spikes (e.g. CPU > 80%) but do not capture 5-tuple network packet flows.",
            "2": "Connection Monitor tests synthetic reachability between endpoints rather than capturing all flow records.",
            "3": "Packet Capture captures raw PCAP packet dumps during active troubleshooting, not continuous flow telemetry."
        },
        "tags": ["flow-logs", "traffic-analytics", "network-watcher", "secops"]
    },
    {
        "id": "AZ500-033",
        "exam": "az500",
        "domain": "2.0 Secure networking",
        "objective": "2.3",
        "type": "single",
        "difficulty": "medium",
        "question": "An enterprise wants to centralize management of firewall rules, IP groups, and security policies across dozens of Azure Firewalls deployed in multiple hub-and-spoke virtual networks. Which management tool provides this?",
        "options": [
            "Azure Firewall Manager",
            "Azure Network Security Group Manager",
            "Microsoft Sentinel Workbook",
            "Azure Advisor Security Dashboard"
        ],
        "answer": 0,
        "explanation": "Azure Firewall Manager provides centralized security policy and route management for cloud-based security perimeters across Virtual WAN hubs and standard hub-spoke virtual networks.",
        "distractor_analysis": {
            "1": "There is no service called 'NSG Manager'; NSGs are managed via ARM or Azure Policy.",
            "2": "Sentinel Workbooks visualize incident data but do not centrally deploy firewall rule collections.",
            "3": "Azure Advisor provides posture suggestions, not firewall policy orchestration."
        },
        "tags": ["firewall-manager", "hub-and-spoke", "centralized-governance"]
    }
]

DOMAIN_3_QUESTIONS = [
    {
        "id": "AZ500-034",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.1",
        "type": "single",
        "difficulty": "hard",
        "question": "A healthcare provider must store patient records in Azure Blob Storage under strict regulatory WORM (Write Once, Read Many) compliance. The policy mandates that records cannot be modified or deleted by anyone—including Global Administrators—for 7 years. What storage feature should be configured?",
        "options": [
            "Immutable Blob Storage with a Time-Based Retention Policy configured in 'Locked' compliance mode",
            "Azure Storage Account CanNotDelete Resource Lock",
            "Soft Delete for blobs with a 2,555-day retention window",
            "Azure Key Vault Customer-Managed Key (CMK) encryption"
        ],
        "answer": 0,
        "explanation": "Immutable Blob Storage with a Time-Based Retention Policy locked in regulatory compliance mode meets strict WORM requirements (SEC Rule 17a-4, CFTC). Once locked, the policy cannot be deleted or shortened by any user, including root administrators and Microsoft support, until the retention period expires.",
        "distractor_analysis": {
            "1": "Resource locks can be deleted at any time by administrators with User Access Administrator or Owner privileges.",
            "2": "Soft delete allows authorized users to permanently purge or undelete blobs and does not enforce immutable WORM compliance.",
            "3": "Customer-managed keys protect data confidentiality at rest, but do not prevent authorized users from deleting or altering blobs."
        },
        "tags": ["worm", "immutable-storage", "compliance", "blob-storage"]
    },
    {
        "id": "AZ500-035",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A third-party vendor requires temporary read-only access to a specific Azure Blob Storage container for 4 hours. Which mechanism provides this access with the ability to immediately revoke access if necessary?",
        "options": [
            "A Service SAS token associated with a Stored Access Policy on the container",
            "Sharing the Storage Account Secondary Access Key",
            "A User Delegation SAS token without time limits",
            "Adding the vendor as a Contributor on the resource group"
        ],
        "answer": 0,
        "explanation": "A Stored Access Policy provides server-side control over Shared Access Signatures (SAS). If an administrator needs to revoke access immediately, they can modify or delete the Stored Access Policy, which instantly invalidates all SAS tokens generated from it without regenerating storage account keys.",
        "distractor_analysis": {
            "1": "Sharing account access keys grants full root control over all data in the storage account and cannot be easily scoped or revoked.",
            "2": "A SAS token without a stored policy cannot be revoked without regenerating the underlying signing keys.",
            "3": "Contributor rights grant broad control plane management access across all resources in the resource group."
        },
        "tags": ["sas", "stored-access-policy", "storage-security", "least-privilege"]
    },
    {
        "id": "AZ500-036",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "A financial database in Azure SQL contains Credit Card Numbers. The requirement states that call center staff should only see the last four digits (e.g., 'XXXX-XXXX-XXXX-1234') without altering the underlying raw data on disk. Which security feature satisfies this requirement?",
        "options": [
            "Dynamic Data Masking (DDM) with a Credit Card mask function",
            "Always Encrypted with randomized encryption",
            "Transparent Data Encryption (TDE)",
            "Row-Level Security (RLS) predicate function"
        ],
        "answer": 0,
        "explanation": "Dynamic Data Masking (DDM) limits sensitive data exposure by masking it to non-privileged users at query runtime. The data in the database remains unchanged, and full data remains visible to users granted the 'UNMASK' permission.",
        "distractor_analysis": {
            "1": "Always Encrypted encrypts data at the client side using drivers, preventing DBAs from reading cleartext, but does not provide partial display masks to non-privileged users.",
            "2": "TDE encrypts database files at rest on the storage medium to protect against stolen media; it does not mask data in SQL query results.",
            "3": "Row-Level Security controls which rows a user can view, not which column characters are masked."
        },
        "tags": ["dynamic-data-masking", "azure-sql", "database-security", "data-protection"]
    },
    {
        "id": "AZ500-037",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.2",
        "type": "single",
        "difficulty": "hard",
        "question": "An enterprise must ensure that Azure Database Administrators (DBAs) and cloud operators can never view plaintext Social Security Numbers (SSNs), even when running direct administrative queries on Azure SQL Database. The data must be decrypted only within client applications holding the encryption key. What technology must be used?",
        "options": [
            "Azure SQL Always Encrypted",
            "Transparent Data Encryption (TDE) with customer-managed keys",
            "Azure SQL Auditing to Log Analytics",
            "SQL Server BitLocker disk encryption"
        ],
        "answer": 0,
        "explanation": "Always Encrypted ensures sensitive data is encrypted inside client applications before being sent to Azure SQL. The database engine never sees plaintext data, and encryption keys (Column Master Key and Column Encryption Key) are kept in a trusted client key store like Azure Key Vault.",
        "distractor_analysis": {
            "1": "TDE protects data at rest on disk, but DBAs with SELECT permissions still query and read cleartext in memory and over connections.",
            "2": "SQL Auditing logs query activity, but does not prevent DBAs from seeing plaintext data.",
            "3": "BitLocker protects host operating system disks, not database column-level encryption separated from DBA access."
        },
        "tags": ["always-encrypted", "azure-sql", "dba-separation", "encryption"]
    },
    {
        "id": "AZ500-038",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A company is deploying Azure Virtual Machines to run sensitive proprietary algorithms. They need to protect data currently in use (in CPU registers and RAM) against hypervisor memory-dump inspection and malicious cloud fabric operators. What Azure compute tier should they deploy?",
        "options": [
            "Azure Confidential VMs with AMD SEV-SNP or Intel TDX hardware-based memory encryption",
            "Standard Azure D-series VMs with Azure Disk Encryption",
            "Burstable B-series VMs with Host Encryption enabled",
            "Spot VMs with Microsoft Antimalware extension"
        ],
        "answer": 0,
        "explanation": "Azure Confidential Computing encrypts data in memory (data in use) using hardware-level technologies like AMD SEV-SNP (Secure Encrypted Virtualization-Secure Nested Paging) and Intel TDX. The hypervisor cannot read VM memory contents, protecting against host compromises.",
        "distractor_analysis": {
            "1": "Azure Disk Encryption protects data at rest on virtual hard disks, not memory in use in RAM.",
            "2": "Host encryption encrypts temporary disk data at the compute host, but does not encrypt active execution state in system RAM.",
            "3": "Spot VMs are low-cost interruptible instances that offer no confidential computing memory isolation."
        },
        "tags": ["confidential-computing", "memory-encryption", "sev-snp", "compute-security"]
    },
    {
        "id": "AZ500-039",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "To minimize the attack surface of virtual machines, an administrator wants management ports (3389 and 22) locked down by default and only opened dynamically upon authorized request for a maximum window of 3 hours. Which Defender for Cloud feature implements this?",
        "options": [
            "Just-In-Time (JIT) VM Access",
            "Adaptive Network Hardening",
            "File Integrity Monitoring (FIM)",
            "Regulatory Compliance Dashboard"
        ],
        "answer": 0,
        "explanation": "Just-In-Time (JIT) VM Access locks down inbound traffic to management ports by modifying NSG rules to Deny by default. When an authorized user requests access, Defender for Cloud temporarily modifies the NSG to allow inbound traffic only from the user's IP for a specified time window.",
        "distractor_analysis": {
            "1": "Adaptive Network Hardening analyzes machine learning traffic patterns to recommend permanent NSG tightening.",
            "2": "File Integrity Monitoring tracks changes to critical OS files, registries, and application files.",
            "3": "Regulatory Compliance dashboard scores environments against frameworks like NIST or PCI-DSS."
        },
        "tags": ["jit", "defender-for-cloud", "nsg", "compute-security"]
    },
    {
        "id": "AZ500-040",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.3",
        "type": "single",
        "difficulty": "hard",
        "question": "A DevOps team manages an Azure Kubernetes Service (AKS) cluster. Which combination of controls ensures that containers cannot access the underlying Azure host metadata endpoint (169.254.169.254) or assume rogue Azure identities?",
        "options": [
            "Enable Microsoft Entra Workload ID and deploy Azure Network Policies to block egress to 169.254.169.254",
            "Deploy Pods with root privileged containers in a hostNetwork configuration",
            "Assign the Owner role to the AKS node pool managed identity",
            "Store service principal credentials in plain text ConfigMaps mounted as volumes"
        ],
        "answer": 0,
        "explanation": "Microsoft Entra Workload ID uses Kubernetes service account token federation to access Azure resources securely without storing secrets. Pairing this with Azure Network Policies (or Calico) to block egress to the Instance Metadata Service (IMDS: 169.254.169.254) prevents container pods from stealing VM-level node tokens.",
        "distractor_analysis": {
            "1": "Privileged containers and hostNetwork share the host networking namespace, giving attackers direct access to host metadata.",
            "2": "Granting Owner privileges to node pools violates least privilege and escalates compromise impact.",
            "3": "Plaintext ConfigMaps expose sensitive credentials to any container with read permissions."
        },
        "tags": ["aks", "kubernetes", "workload-id", "network-policy"]
    },
    {
        "id": "AZ500-041",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "Which vulnerability assessment tool integrated into Microsoft Defender for Containers scans images stored in Azure Container Registry (ACR) for known Common Vulnerabilities and Exposures (CVEs)?",
        "options": [
            "Defender vulnerability management (powered by Qualys or Microsoft Defender engine) for container images",
            "Azure Bastion container scanner",
            "Azure App Service diagnostic logs",
            "Azure Monitor Network Insights"
        ],
        "answer": 0,
        "explanation": "Microsoft Defender for Containers scans container images pushed to Azure Container Registry (ACR) for known vulnerabilities, software bugs, and CVEs, providing remediation guidance and security scoring in Defender for Cloud.",
        "distractor_analysis": {
            "1": "Azure Bastion is an RDP/SSH jump proxy and has no image scanning capability.",
            "2": "App Service diagnostic logs track HTTP web requests, not container binary vulnerabilities.",
            "3": "Network Insights visualizes network topologies and latency, not container packages."
        },
        "tags": ["acr", "container-security", "cve", "vulnerability-assessment"]
    },
    {
        "id": "AZ500-042",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.1",
        "type": "single",
        "difficulty": "medium",
        "question": "An enterprise wants to enforce that all data uploaded to an Azure Storage account must be encrypted at rest using keys generated and managed in the company's Azure Key Vault. What configuration must be enabled on the storage account?",
        "options": [
            "Customer-Managed Keys (CMK) encryption with Key Vault integration",
            "Microsoft-managed Storage Service Encryption (SSE)",
            "Client-side encryption using zip passwords",
            "Azure Disk Encryption with BitLocker"
        ],
        "answer": 0,
        "explanation": "Customer-Managed Keys (CMK) allow organizations to use their own RSA encryption keys stored in Azure Key Vault for storage encryption at rest. This enables full control over key rotation, revocation, and audit logging of cryptographic operations.",
        "distractor_analysis": {
            "1": "Microsoft-managed keys are the default, but Microsoft generates and manages the lifecycle rather than the customer.",
            "2": "Client-side password hashing is not a native cloud governance mechanism.",
            "3": "Azure Disk Encryption applies to virtual machine OS and data disks, not Azure Blob Storage accounts."
        },
        "tags": ["cmk", "storage-security", "key-vault", "byok"]
    },
    {
        "id": "AZ500-043",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.1",
        "type": "single",
        "difficulty": "medium",
        "question": "How can an administrator permanently disable the use of account access keys (shared keys) on an Azure Storage account to mandate that all access occurs via Microsoft Entra ID?",
        "options": [
            "Set 'Allow storage account key access' (allowSharedKeyAccess) to Disabled (false) in the storage account configuration",
            "Delete the Primary and Secondary access keys from the Azure portal",
            "Apply a ReadOnly lock on the storage account",
            "Enable CORS rules blocking PUT and GET verbs"
        ],
        "answer": 0,
        "explanation": "Disabling 'Shared Key access' (`allowSharedKeyAccess = false`) enforces that all requests to the storage account must authenticate using Microsoft Entra ID (via OAuth 2.0 / RBAC). Any request signed with shared keys or account SAS tokens will be rejected.",
        "distractor_analysis": {
            "1": "Account keys cannot be deleted; they can only be regenerated. Disabling shared key access is the Microsoft recommended control.",
            "2": "A ReadOnly lock stops ARM control plane modifications but does not block data plane reading with shared keys.",
            "3": "CORS governs cross-origin browser requests, not shared key authentication."
        },
        "tags": ["storage-security", "shared-key", "entra-id", "zero-trust"]
    },
    {
        "id": "AZ500-044",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary function of Transparent Data Encryption (TDE) in Azure SQL Database?",
        "options": [
            "It encrypts database files, log files, and backup files at rest in real time using a symmetric database encryption key (DEK)",
            "It masks column outputs during SELECT queries in SQL Server Management Studio",
            "It encrypts communication channels across the public internet using TLS 1.3",
            "It prevents SQL injection vulnerabilities in web applications"
        ],
        "answer": 0,
        "explanation": "Transparent Data Encryption (TDE) protects Azure SQL Database, Azure SQL Managed Instance, and Azure Synapse Analytics against malicious offline activity by encrypting data at rest (database files, transaction logs, and backups) without requiring application changes.",
        "distractor_analysis": {
            "1": "Column masking is the role of Dynamic Data Masking (DDM).",
            "2": "Network transport encryption is handled by TLS/SSL.",
            "3": "SQL injection prevention requires parameterized queries and WAF inspection, not storage encryption."
        },
        "tags": ["tde", "azure-sql", "encryption-at-rest", "database-security"]
    },
    {
        "id": "AZ500-045",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.2",
        "type": "single",
        "difficulty": "hard",
        "question": "An auditor requests proof of all administrative actions and security events executed against an Azure SQL Database over the last 12 months. Which feature should be enabled and where should the logs be sent?",
        "options": [
            "Enable Azure SQL Auditing and stream audit logs to an Azure Log Analytics workspace or Storage Account",
            "Enable SQL Server Profiler trace on local client workstation",
            "Configure SQL Agent job to export sys.tables every 24 hours",
            "Download Azure Activity Log records manually every 90 days"
        ],
        "answer": 0,
        "explanation": "Azure SQL Auditing tracks database events (logins, failed queries, schema changes, DML execution) and writes them to an audit log stored in an Azure Storage Account, Log Analytics workspace, or Event Hub with retention periods configured to meet audit compliance requirements.",
        "distractor_analysis": {
            "1": "SQL Server Profiler is a legacy debugging utility not suited for continuous, tamper-evident regulatory compliance auditing.",
            "2": "Exporting table schemas does not log user access or DDL/DML query activity.",
            "3": "The default Azure Activity Log retention is only 90 days, failing the 12-month audit standard unless explicitly archived."
        },
        "tags": ["auditing", "azure-sql", "compliance", "log-analytics"]
    },
    {
        "id": "AZ500-046",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.3",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the key security benefit of configuring 'Trusted Launch' when deploying Azure Virtual Machines?",
        "options": [
            "It provides Secure Boot and virtual Trusted Platform Module (vTPM) to protect against bootkits, rootkits, and firmware compromises",
            "It guarantees 99.999% uptime across three availability zones",
            "It encrypts database network traffic without requiring certificates",
            "It automatically assigns Global Administrator roles to VM local users"
        ],
        "answer": 0,
        "explanation": "Trusted Launch hardens Gen2 Azure VMs with Secure Boot (validating OS bootloaders against trusted signatures) and vTPM (attestation of boot integrity and secure storage of keys), protecting against persistent rootkits and kernel-level tampering.",
        "distractor_analysis": {
            "1": "High availability SLAs are governed by Availability Zones and regional replication, not Trusted Launch.",
            "2": "Database traffic encryption requires TLS certificates and database connection strings.",
            "3": "Trusted Launch has no connection to Entra ID directory role assignments."
        },
        "tags": ["trusted-launch", "vtpm", "secure-boot", "compute-security"]
    },
    {
        "id": "AZ500-047",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.3",
        "type": "single",
        "difficulty": "hard",
        "question": "When configuring Azure Disk Encryption (ADE) on a Linux Virtual Machine, which Azure Key Vault requirements must be configured?",
        "options": [
            "The Key Vault must be in the same Azure region and subscription as the VM, and have 'Azure Disk Encryption for volume encryption' enabled",
            "The Key Vault must be deployed with a public IP in a different region",
            "The Key Vault must have Purge Protection disabled and Soft Delete disabled",
            "The Key Vault must use only Access Policies with Key Vault Secrets Officer role"
        ],
        "answer": 0,
        "explanation": "Azure Disk Encryption requires the Key Vault to reside in the same Azure subscription and region as the virtual machine being encrypted, and the Key Vault must have the 'Azure Disk Encryption for volume encryption' deployment flag enabled.",
        "distractor_analysis": {
            "1": "ADE cannot access a Key Vault in a different region; co-location in the same region is mandatory.",
            "2": "Soft Delete is mandatory and cannot be disabled in modern Key Vaults; disabling purge protection would weaken key safety.",
            "3": "Key Vault Secrets Officer is an RBAC role; ADE requires specific Key Vault access configuration flags for ARM integration."
        },
        "tags": ["ade", "disk-encryption", "key-vault", "compute-security"]
    },
    {
        "id": "AZ500-048",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.1",
        "type": "single",
        "difficulty": "medium",
        "question": "An engineer wants to protect an Azure Storage account so that only connections using TLS version 1.2 or higher are accepted. What setting should be configured?",
        "options": [
            "Set the 'Minimum TLS version' property on the storage account to TLS 1.2",
            "Configure an NSG inbound rule denying port 80",
            "Enable Secure Transfer Required while leaving TLS version at default",
            "Deploy an Application Gateway with TLS termination in front of the storage account"
        ],
        "answer": 0,
        "explanation": "Setting 'Minimum TLS version' to TLS 1.2 on the storage account enforces that all incoming client requests negotiate TLS 1.2 or greater; requests attempting to use older TLS 1.0 or 1.1 handshakes are immediately dropped.",
        "distractor_analysis": {
            "1": "Port 80 is unencrypted HTTP, while TLS version negotiation occurs on HTTPS port 443.",
            "2": "Secure Transfer Required enforces HTTPS over HTTP, but if minimum TLS is not set to 1.2, clients could still negotiate legacy TLS 1.0/1.1.",
            "3": "Application Gateway is not needed when Azure Storage natively provides the minimum TLS version enforcement setting."
        },
        "tags": ["tls", "storage-security", "encryption-in-transit", "compliance"]
    },
    {
        "id": "AZ500-049",
        "exam": "az500",
        "domain": "3.0 Secure compute, storage, and databases",
        "objective": "3.2",
        "type": "single",
        "difficulty": "medium",
        "question": "A developer needs to configure an Azure SQL Database firewall. Which firewall setting allows connections from the developer's workstation while adhering to security best practices?",
        "options": [
            "Add a specific IP firewall rule specifying the developer's individual public IP address, and set 'Allow Azure services and resources to access this server' to OFF (No)",
            "Set 'Allow Azure services and resources to access this server' to ON (Yes)",
            "Add an IP range from 0.0.0.0 to 255.255.255.255",
            "Disable the SQL firewall entirely"
        ],
        "answer": 0,
        "explanation": "Best practices dictate adding a specific client IP rule for the authorized workstation and setting 'Allow Azure services and resources to access this server' to No (OFF). Enabling that setting allows ANY tenant in Azure to reach the SQL gateway port.",
        "distractor_analysis": {
            "1": "Allowing all Azure services opens the database gateway to any Azure customer VM across the entire cloud.",
            "2": "Adding 0.0.0.0/0 creates an open proxy vulnerability exposing database ports to the entire internet.",
            "3": "The Azure SQL firewall cannot be disabled; removing all rules denies all access."
        },
        "tags": ["azure-sql", "firewall", "least-privilege", "zero-trust"]
    }
]

DOMAIN_4_QUESTIONS = [
    {
        "id": "AZ500-050",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A security operations team uses Microsoft Sentinel. They need to automatically trigger an incident remediation workflow that blocks a compromised IP address on the enterprise Azure Firewall whenever a high-severity alert is detected. What Sentinel component executes this automation?",
        "options": [
            "Automation rules linked to a Sentinel Playbook (Azure Logic App)",
            "Data Connectors using CEF streams",
            "Watchlists with static CSV files",
            "Kusto Query Language (KQL) summarize operator"
        ],
        "answer": 0,
        "explanation": "Microsoft Sentinel uses Automation Rules to trigger SOAR (Security Orchestration, Automation, and Response) workflows known as Playbooks. Playbooks are built on Azure Logic Apps and can automate remediation steps such as blocking IP addresses or disabling user accounts.",
        "distractor_analysis": {
            "1": "Data connectors ingest log telemetry into Sentinel; they do not execute active remediation tasks.",
            "2": "Watchlists store reference data (e.g. terminated employee IDs or VIP IP lists) for query correlation.",
            "3": "KQL is the query language used to analyze logs, not the execution runtime for SOAR workflows."
        },
        "tags": ["sentinel", "soar", "playbooks", "logic-apps", "secops"]
    },
    {
        "id": "AZ500-051",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary architectural difference between Azure Key Vault 'Access Policies' and 'Azure Role-Based Access Control (Azure RBAC)' permission models?",
        "options": [
            "Access Policies grant vault-wide permissions across all keys/secrets; Azure RBAC allows granular, object-level role assignments and unified management via Microsoft Entra ID",
            "Access Policies support hardware HSM keys; Azure RBAC only supports software keys",
            "Access Policies are evaluated at the network layer; Azure RBAC is evaluated in DNS",
            "Azure RBAC requires disabling Soft Delete on the Key Vault"
        ],
        "answer": 0,
        "explanation": "Key Vault Access Policies are legacy, coarse-grained policies that apply to all objects of a type across the entire vault. Azure RBAC for Key Vault provides unified, granular authorization at individual key, secret, and certificate levels (e.g. 'Key Vault Secrets User' scoped to a single secret).",
        "distractor_analysis": {
            "1": "Both permission models fully support both software and hardware HSM keys.",
            "2": "Both access policies and Azure RBAC are application and control plane authorization mechanisms, not network/DNS filters.",
            "3": "Soft Delete is mandatory on Key Vaults and is completely independent of the authorization permission model."
        },
        "tags": ["key-vault", "rbac", "access-policies", "authorization"]
    },
    {
        "id": "AZ500-052",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.2",
        "type": "single",
        "difficulty": "hard",
        "question": "An attacker gains unauthorized Contributor access to a subscription and attempts to delete an Azure Key Vault containing master database encryption keys. Which Key Vault features prevent accidental or malicious irreversible loss of these cryptographic keys?",
        "options": [
            "Soft Delete and Purge Protection enabled together",
            "ReadOnly Resource Lock and Storage Service Encryption",
            "Microsoft Defender for Key Vault alerts only",
            "Azure Backup with 30-day snapshot vault"
        ],
        "answer": 0,
        "explanation": "Soft Delete ensures that deleted vaults or vault objects are retained for a configurable period (7 to 90 days). Purge Protection enforces that even a subscription Owner or Contributor cannot permanently destroy or purge the vault until the retention period has completely elapsed.",
        "distractor_analysis": {
            "1": "A user with Contributor/Owner rights on the resource group can delete a resource lock before deleting the vault.",
            "2": "Defender alerts generate notifications of suspicious activity but do not physically block deletion without purge protection.",
            "3": "Key Vaults do not rely on standard Azure Backup snapshots for cryptographic material recovery."
        },
        "tags": ["key-vault", "soft-delete", "purge-protection", "data-loss-prevention"]
    },
    {
        "id": "AZ500-053",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A Chief Information Security Officer (CISO) wants to evaluate the organization's cloud environment against the CIS Microsoft Azure Foundations Benchmark and identify gaps. Which Microsoft Defender for Cloud dashboard provides this evaluation?",
        "options": [
            "Regulatory Compliance dashboard",
            "Security Alerts dashboard",
            "Workload Protections overview",
            "Azure Monitor Workbooks"
        ],
        "answer": 0,
        "explanation": "The Regulatory Compliance dashboard in Microsoft Defender for Cloud maps security assessments directly against industry standards (including CIS Azure Foundations, NIST SP 800-53, PCI DSS, and ISO 27001), showing passed controls, failed controls, and automated remediation steps.",
        "distractor_analysis": {
            "1": "Security Alerts display active threat detections and anomalous incidents, not baseline regulatory compliance scoring.",
            "2": "Workload Protections monitor runtime CWPP telemetry across servers, containers, and databases.",
            "3": "Azure Monitor Workbooks are customizable reporting canvases, not the native compliance assessment engine."
        },
        "tags": ["defender-for-cloud", "regulatory-compliance", "cis-benchmark", "cspm"]
    },
    {
        "id": "AZ500-054",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "A security analyst is writing a Kusto Query Language (KQL) query in Microsoft Sentinel to detect brute-force login attempts. The query needs to identify user accounts that generated more than 10 failed login events within a 1-hour window. Which KQL query structure achieves this?",
        "options": [
            "SigninLogs | where ResultType != \"0\" | summarize FailedCount = count() by UserPrincipalName, bin(TimeGenerated, 1h) | where FailedCount > 10",
            "SigninLogs | where ResultType == \"0\" | project UserPrincipalName, TimeGenerated | take 10",
            "SecurityAlert | where Severity == \"High\" | summarize by AlertName",
            "AuditLogs | extend Result = tostring(ResultType) | top 10 by TimeGenerated desc"
        ],
        "answer": 0,
        "explanation": "In Microsoft Entra `SigninLogs`, a `ResultType` of '0' indicates success, whereas non-zero values denote failure. Grouping with `summarize count() by UserPrincipalName, bin(TimeGenerated, 1h)` aggregates counts across 1-hour time slices, and `where FailedCount > 10` filters for brute-force thresholds.",
        "distractor_analysis": {
            "1": "ResultType == 0 filters for successful logins, not failed attempts.",
            "2": "SecurityAlert does not count raw sign-in attempts by user.",
            "3": "AuditLogs tracks directory administrative changes (e.g. user creation), not interactive user authentication attempts."
        },
        "tags": ["kql", "sentinel", "brute-force", "hunting"]
    },
    {
        "id": "AZ500-055",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.3",
        "type": "single",
        "difficulty": "medium",
        "question": "In Microsoft Defender for Cloud, what metric quantifies an organization's overall security posture across subscriptions and helps prioritize recommendations based on risk impact?",
        "options": [
            "Secure Score",
            "Exposure Index",
            "Severity Coefficient",
            "Compliance Parity"
        ],
        "answer": 0,
        "explanation": "Secure Score is a core CSPM metric in Defender for Cloud that aggregates security findings into a numerical percentage score. Completing prioritized security recommendations increases the Secure Score and strengthens posture.",
        "distractor_analysis": {
            "1": "Exposure Index is not the primary scoring metric in Defender for Cloud.",
            "2": "Severity Coefficient is a fictional term.",
            "3": "Compliance Parity is not an Azure metric."
        },
        "tags": ["secure-score", "defender-for-cloud", "cspm", "posture"]
    },
    {
        "id": "AZ500-056",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "To ingest security events from on-premises Linux firewalls and appliances into Microsoft Sentinel, which protocol and agent configuration is standard?",
        "options": [
            "Syslog or Common Event Format (CEF) forwarded to a dedicated Linux Log Analytics forwarder gateway",
            "Direct HTTPS REST calls from firewall firmware without an agent",
            "SNMP v1 traps forwarded directly to Azure Active Directory",
            "Azure Arc Connected Machine agent running in Docker on Windows"
        ],
        "answer": 0,
        "explanation": "Microsoft Sentinel ingests Linux and appliance security events via Syslog or CEF (Common Event Format). An on-premises or cloud Linux machine hosts the Azure Monitor Agent (AMA) / forwarder daemon that receives Syslog on UDP/TCP port 514 and streams events securely to the Log Analytics workspace.",
        "distractor_analysis": {
            "1": "Most legacy firewalls cannot execute custom Azure REST API client calls.",
            "2": "Entra ID does not ingest or process SNMP traps.",
            "3": "Azure Arc on Windows does not serve as a standard Syslog daemon listener for Linux appliances."
        },
        "tags": ["syslog", "cef", "sentinel", "log-analytics"]
    },
    {
        "id": "AZ500-057",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "An application uses an TLS certificate stored in Azure Key Vault. What Key Vault capability ensures the certificate is automatically reissued and rotated before expiration without human intervention?",
        "options": [
            "Key Vault Certificate Auto-Renewal through an integrated Certificate Authority (DigiCert or GlobalSign)",
            "Creating a Logic App that generates self-signed certificates daily",
            "Manual export of PFX files into Azure Blob Storage",
            "Enabling Azure Bastion certificate forwarder"
        ],
        "answer": 0,
        "explanation": "Azure Key Vault supports direct integration with partner Certificate Authorities (such as DigiCert and GlobalSign). Key Vault automatically contacts the CA, requests a renewed certificate before the lifetime expiration percentage is reached, and updates the certificate object seamlessly.",
        "distractor_analysis": {
            "1": "Daily self-signed certificates break trust chains in enterprise web browsers.",
            "2": "Manual export violates automation requirements and introduces credential exposure.",
            "3": "Azure Bastion does not manage or rotate web application certificates."
        },
        "tags": ["key-vault", "certificates", "auto-renewal", "pki"]
    },
    {
        "id": "AZ500-058",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.3",
        "type": "single",
        "difficulty": "hard",
        "question": "How can an enterprise automatically remediate non-compliant Azure resources—such as automatically installing the Microsoft Defender for Endpoint extension whenever a new Virtual Machine is provisioned?",
        "options": [
            "Assign an Azure Policy with the 'DeployIfNotExists' effect and configure a Managed Identity for the policy remediation task",
            "Deploy an Azure Monitor Metric Alert that calls an email webhook",
            "Configure an NSG rule with priority 100",
            "Schedule a manual PowerShell script in Windows Task Scheduler"
        ],
        "answer": 0,
        "explanation": "Azure Policy with the 'DeployIfNotExists' effect automatically triggers an ARM template deployment when a newly created or evaluated resource lacks a required component (like an endpoint protection extension). The policy uses a system-assigned managed identity to perform the deployment remediation.",
        "distractor_analysis": {
            "1": "Metric alerts notify operators but do not automatically provision VM extensions into ARM resources.",
            "2": "NSG rules filter network traffic and cannot install software extensions on VMs.",
            "3": "Manual scheduled scripts lack cloud-native governance, scale, and immediate provisioning hooks."
        },
        "tags": ["azure-policy", "deployifnotexists", "automated-remediation", "governance"]
    },
    {
        "id": "AZ500-059",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "In Microsoft Sentinel, what is the purpose of 'Entity Mapping' in scheduled analytics rules?",
        "options": [
            "It maps query output fields (e.g. Account, IP, Host) to standardized Sentinel entities so analysts can investigate incidents with graph correlation",
            "It translates KQL into Transact-SQL for relational databases",
            "It assigns an Azure subscription to a geographical physical datacenter",
            "It creates DNS reverse lookup pointer records for all virtual machines"
        ],
        "answer": 0,
        "explanation": "Entity mapping maps columns from KQL query results to standard Sentinel entities (User, Host, IP, URL, FileHash). This allows Sentinel to correlate alerts across multiple data sources into unified incidents and construct interactive investigation graphs.",
        "distractor_analysis": {
            "1": "Sentinel uses KQL natively and does not translate queries to T-SQL.",
            "2": "Entity mapping does not manage Azure physical geography or subscriptions.",
            "3": "DNS pointer records are managed in Azure DNS zones, not Sentinel analytics rules."
        },
        "tags": ["sentinel", "entity-mapping", "incident-investigation", "secops"]
    },
    {
        "id": "AZ500-060",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.2",
        "type": "single",
        "difficulty": "medium",
        "question": "Which Azure Key Vault pricing tier is required if an organization's compliance standard mandates that encryption keys must be protected by Hardware Security Modules (HSM) validated to FIPS 140-2 Level 2 or Level 3?",
        "options": [
            "Azure Key Vault Premium (or Managed HSM)",
            "Azure Key Vault Standard",
            "Azure Storage Standard LRS",
            "Azure App Configuration Standard"
        ],
        "answer": 0,
        "explanation": "Azure Key Vault Standard protects keys using software in multi-tenant cloud hardware. Azure Key Vault Premium and Managed HSM protect keys within dedicated, FIPS 140-2 Level 2 and Level 3 validated Hardware Security Modules (HSM).",
        "distractor_analysis": {
            "1": "Standard tier provides software-protected keys and secrets only, not HSM validation.",
            "2": "Storage Standard is a data storage service, not a cryptographic key vault.",
            "3": "App Configuration manages feature flags and app settings, not FIPS-validated HSM cryptographic keys."
        },
        "tags": ["key-vault", "hsm", "fips-140", "cryptography"]
    },
    {
        "id": "AZ500-061",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.1",
        "type": "single",
        "difficulty": "hard",
        "question": "A SOC team wants to implement continuous threat hunting in Microsoft Sentinel without generating active incidents until anomalous behavior is verified. Which feature allows analysts to run and bookmark queries during active investigations?",
        "options": [
            "Sentinel Hunting queries and Bookmarks",
            "Sentinel Automation Rules",
            "Azure Policy Compliance scan",
            "Defender for Cloud Secure Score recalculation"
        ],
        "answer": 0,
        "explanation": "Microsoft Sentinel provides built-in and custom Hunting queries that allow proactive threat hunting across ingested tables. Analysts can tag and bookmark notable findings to investigate later or promote to full incidents.",
        "distractor_analysis": {
            "1": "Automation rules run automatically upon incident generation, rather than supporting exploratory manual hunting.",
            "2": "Azure Policy audits resource definitions, not threat actor behavior in telemetry logs.",
            "3": "Secure score calculates configuration posture, not threat hunting queries."
        },
        "tags": ["sentinel", "threat-hunting", "hunting-queries", "bookmarks"]
    },
    {
        "id": "AZ500-062",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.3",
        "type": "single",
        "difficulty": "medium",
        "question": "What is the primary difference between Microsoft Defender for Cloud's CSPM and CWPP capabilities?",
        "options": [
            "CSPM assesses security posture, configurations, and compliance; CWPP delivers runtime threat protection and workload defense for servers, containers, and databases",
            "CSPM is for on-premises servers only; CWPP is for cloud only",
            "CSPM replaces firewalls; CWPP replaces identity providers",
            "CSPM requires hardware HSMs; CWPP does not"
        ],
        "answer": 0,
        "explanation": "Cloud Security Posture Management (CSPM) evaluates cloud hygiene, configuration drift, and regulatory compliance. Cloud Workload Protection Platform (CWPP - Defender plans) provides real-time threat detection, antimalware, and behavioral analytics across servers, containers, and data services.",
        "distractor_analysis": {
            "1": "Both CSPM and CWPP support multi-cloud and hybrid on-premises environments via Azure Arc.",
            "2": "Neither replaces firewalls or identity providers.",
            "3": "HSM requirements are independent of CSPM or CWPP capabilities."
        },
        "tags": ["cspm", "cwpp", "defender-for-cloud", "secops"]
    },
    {
        "id": "AZ500-063",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.1",
        "type": "single",
        "difficulty": "medium",
        "question": "Which service acts as the underlying centralized log repository where Microsoft Sentinel, Azure Monitor, and Defender for Cloud store and query security event telemetry?",
        "options": [
            "Azure Log Analytics Workspace",
            "Azure Data Factory Pipeline",
            "Azure Cosmos DB Mongo API",
            "Azure Blob Storage Cool Tier"
        ],
        "answer": 0,
        "explanation": "Azure Log Analytics Workspace is the fundamental telemetry store. It provides fast indexing, large-scale KQL query capabilities, retention management, and serves as the data foundation for Microsoft Sentinel and Defender for Cloud.",
        "distractor_analysis": {
            "1": "Azure Data Factory is an ETL orchestration tool, not a real-time security log analytics engine.",
            "2": "Cosmos DB is a NoSQL application database, not the native store for Azure Monitor and Sentinel.",
            "3": "Blob storage can be used for long-term archive, but does not provide real-time interactive KQL querying required by Sentinel."
        },
        "tags": ["log-analytics", "sentinel", "kql", "telemetry"]
    },
    {
        "id": "AZ500-064",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.2",
        "type": "single",
        "difficulty": "hard",
        "question": "An enterprise requires all changes to Azure Key Vault secrets to trigger an automated notification to a Microsoft Teams channel immediately. What event-driven architecture fulfills this with lowest latency and minimal code?",
        "options": [
            "Azure Event Grid subscription on Key Vault events (e.g., SecretNewVersionCreated) triggering an Azure Logic App",
            "A scheduled PowerShell script running every 5 minutes querying Key Vault logs in Azure Storage",
            "Azure Monitor metric alert configured on CPU utilization of the Key Vault",
            "Manual review of Key Vault diagnostic logs once a week"
        ],
        "answer": 0,
        "explanation": "Azure Key Vault integrates natively with Azure Event Grid. When an event occurs (such as `Microsoft.KeyVault.SecretNewVersionCreated` or `SecretNearExpiry`), Event Grid instantly pushes the event to an Azure Logic App or webhook, posting an alert to Teams with near-zero latency.",
        "distractor_analysis": {
            "1": "Polling scripts introduce latency, consume compute cycles, and risk hitting Key Vault API throttling limits.",
            "2": "Key Vault is a PaaS service with no CPU utilization metric exposed.",
            "3": "Weekly manual reviews fail to provide real-time security operational alerts."
        },
        "tags": ["event-grid", "key-vault", "automation", "secops"]
    },
    {
        "id": "AZ500-065",
        "exam": "az500",
        "domain": "4.0 Manage security operations",
        "objective": "4.3",
        "type": "single",
        "difficulty": "medium",
        "question": "A security auditor notices that critical production Virtual Machines are missing required security baseline configurations. Which Microsoft Defender for Cloud feature continuously audits operating system security baselines against recommendations?",
        "options": [
            "Azure Machine Configuration (formerly Azure Policy Guest Configuration)",
            "Network Security Group flow analytics",
            "Azure Bastion session recording",
            "Azure DNS private resolver"
        ],
        "answer": 0,
        "explanation": "Azure Machine Configuration (part of Azure Policy and Defender for Cloud) audits inside virtual machines to ensure OS settings, password policies, audit settings, and software baselines match organizational compliance benchmarks.",
        "distractor_analysis": {
            "1": "NSG flow analytics tracks network connection flows, not in-guest operating system settings.",
            "2": "Azure Bastion connects administrators to VMs over TLS but does not evaluate OS baseline compliance.",
            "3": "DNS Private Resolver routes private DNS queries across VNets."
        },
        "tags": ["guest-configuration", "machine-configuration", "defender-for-cloud", "baseline"]
    }
]

# ---------------------------------------------------------------------------
# 4. Scenario Matrices & Technical Guides (Derived from Rick Kotlarz & SeekDavidLee)
# ---------------------------------------------------------------------------

SCENARIOS_AND_CHEAT_SHEETS = [
    {
        "topic": "Azure Key Vault Security Models: Access Policies vs. Azure RBAC",
        "category": "Identity & Security Operations",
        "summary": "Key Vault supports two distinct authorization architectures. Choosing the wrong model is one of the most common security misconfigurations on the AZ-500 exam.",
        "comparison": [
            {"Dimension": "Granularity", "Access Policies": "Coarse-grained (Vault-level only). If you grant secret read, user can read ALL secrets in vault.", "Azure RBAC": "Granular (Subscription, RG, Vault, or individual secret/key/cert level)."},
            {"Dimension": "Identity Integration", "Access Policies": "Configured inside Key Vault blade.", "Azure RBAC": "Unified Entra ID Access Control (IAM) blade."},
            {"Dimension": "Privileged Roles", "Access Policies": "None; custom permissions assigned per principal.", "Azure RBAC": "Key Vault Administrator, Secrets Officer, Secrets User, Crypto Officer."},
            {"Dimension": "PIM Support", "Access Policies": "Not supported natively.", "Azure RBAC": "Fully supported for JIT role activation via Entra PIM."}
        ]
    },
    {
        "topic": "Perimeter & Network Security: NSG vs ASG vs Azure Firewall",
        "category": "Secure Networking",
        "summary": "Comprehensive architectural decision matrix for isolating virtual network traffic across layers 3, 4, and 7.",
        "comparison": [
            {"Dimension": "Operating Layer", "NSG": "Layer 3 & 4 (5-tuple: IP, Port, Protocol).", "ASG": "Layer 3 & 4 abstraction grouping NICs.", "Azure Firewall": "Layer 3 to 7 (Stateful network, FQDN application rules, Threat Intelligence)."},
            {"Dimension": "FQDN Filtering", "NSG": "Not supported (IP / Service Tags only).", "ASG": "Not supported.", "Azure Firewall": "Supported (e.g. *.microsoft.com, HTTP/HTTPS inspection)."},
            {"Dimension": "Deployment Scope", "NSG": "Associated to Subnet or VM NIC.", "ASG": "Associated to VM NICs within a single VNet.", "Azure Firewall": "Deployed in dedicated AzureFirewallSubnet in Hub VNet."}
        ]
    },
    {
        "topic": "Azure Storage Security Architecture",
        "category": "Secure Compute & Storage",
        "summary": "Securing data at rest and in transit across Azure Blob and File services.",
        "comparison": [
            {"Dimension": "Authentication", "Shared Keys": "Account keys grant root access; recommend disabling allowSharedKeyAccess.", "Entra ID RBAC": "Storage Blob Data Contributor/Reader with OAuth tokens."},
            {"Dimension": "Delegated Access", "Account SAS": "Signed by account key; risk of privilege escalation.", "User Delegation SAS": "Signed by Entra ID user token; respects user RBAC limitations."},
            {"Dimension": "Revocation", "Direct SAS": "Cannot revoke without rotating master key.", "Stored Access Policy": "Immediate revocation by modifying or deleting policy."}
        ]
    },
    {
        "topic": "Microsoft Sentinel Architecture & Incident Workflow",
        "category": "Security Operations",
        "summary": "End-to-end data ingestion, detection, triage, and automated SOAR remediation.",
        "comparison": [
            {"Step": "1. Ingestion", "Component": "Data Connectors (CEF, Syslog, Entra ID, Microsoft Defender XDR).", "Function": "Streams security events into Log Analytics workspace tables."},
            {"Step": "2. Detection", "Component": "Analytics Rules (Scheduled KQL, NRT, Machine Learning).", "Function": "Executes KQL queries; matches trigger alerts and maps entities."},
            {"Step": "3. Triage", "Component": "Incidents & Investigation Graph.", "Function": "Correlates alerts into incidents, visualizes entity blast radius."},
            {"Step": "4. Remediation", "Component": "Automation Rules & Playbooks (Logic Apps).", "Function": "Executes automated zero-touch containment actions (block IP, revoke tokens)."}
        ]
    }
]

# ---------------------------------------------------------------------------
# 5. Main Execution: Compile Shards & Bundles
# ---------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("COMPILING AZ-500 PRODUCTION MASTER CERTIFICATION SUITE")
    print("=" * 70)

    # 1. Parse syllabus objectives
    objectives = extract_objectives_from_guide()
    print(f"Extracted {len(objectives)} objectives from Azure Mentor Guide.")

    # 2. Extract hands-on labs
    labs = extract_labs()
    print(f"Extracted {len(labs)} hands-on labs from KodeKloud repository.")

    # 3. Objectives Data
    obj_data = {
        "title": "AZ-500: Microsoft Azure Security Technologies - Objectives Tracker",
        "version": "1.0.0",
        "exam": "az500",
        "code": "AZ-500",
        "storage_key": "az500_objectives_progress_v1",
        "objectives": objectives
    }
    (ROOT / "az500_objectives_data.json").write_text(json.dumps(obj_data, indent=2), encoding="utf-8")
    (ROOT / "az500_objectives_data.js").write_text(f"window.AZ500_OBJECTIVES_DATA = {json.dumps(obj_data, indent=2)};\n", encoding="utf-8")
    print("Wrote az500_objectives_data.json and az500_objectives_data.js")

    # 4. Write Individual Shards
    s1_path = SHARDS_DIR / "az500_1_0_manage_identity_and_access.json"
    s2_path = SHARDS_DIR / "az500_2_0_secure_networking.json"
    s3_path = SHARDS_DIR / "az500_3_0_secure_compute_storage_and_databases.json"
    s4_path = SHARDS_DIR / "az500_4_0_manage_security_operations.json"

    s1_path.write_text(json.dumps(DOMAIN_1_QUESTIONS, indent=2), encoding="utf-8")
    s2_path.write_text(json.dumps(DOMAIN_2_QUESTIONS, indent=2), encoding="utf-8")
    s3_path.write_text(json.dumps(DOMAIN_3_QUESTIONS, indent=2), encoding="utf-8")
    s4_path.write_text(json.dumps(DOMAIN_4_QUESTIONS, indent=2), encoding="utf-8")
    print("Wrote AZ-500 domain shards to shards/az500/:")
    print(f"   - Domain 1: {len(DOMAIN_1_QUESTIONS)} questions")
    print(f"   - Domain 2: {len(DOMAIN_2_QUESTIONS)} questions")
    print(f"   - Domain 3: {len(DOMAIN_3_QUESTIONS)} questions")
    print(f"   - Domain 4: {len(DOMAIN_4_QUESTIONS)} questions")

    # 5. Master Exam Bank
    all_az500_questions = DOMAIN_1_QUESTIONS + DOMAIN_2_QUESTIONS + DOMAIN_3_QUESTIONS + DOMAIN_4_QUESTIONS
    master_bank = {
        "version": "1.0.0",
        "exam": "az500",
        "total_questions": len(all_az500_questions),
        "az500": all_az500_questions
    }
    (ROOT / "az500_exam_data.json").write_text(json.dumps(master_bank, indent=2), encoding="utf-8")
    (ROOT / "az500_exam_data.js").write_text(f"window.AZ500_EXAM_DATA = {json.dumps(master_bank, indent=2)};\n", encoding="utf-8")
    print(f"Wrote {len(all_az500_questions)} master questions to az500_exam_data.json and az500_exam_data.js")

    # 6. Study Library
    # Read technical guide from Rick Kotlarz
    rick_content = ""
    if RICKKOTLARZ_FILE.exists():
        rick_content = RICKKOTLARZ_FILE.read_text(encoding="utf-8", errors="replace")[:25000]

    study_lib = {
        "version": "1.0.0",
        "track": "az500",
        "title": "Microsoft Azure Security Technologies (AZ-500) Study Library & Lab Walkthroughs",
        "modules": [
            {
                "id": "mod-az500-01",
                "title": "Domain 1: Manage Identity and Access",
                "summary": "Covers Microsoft Entra ID, PIM, Conditional Access, Managed Identities, and RBAC.",
                "objectives": [o for o in objectives if o.get("domain", "").startswith("1.0")]
            },
            {
                "id": "mod-az500-02",
                "title": "Domain 2: Secure Networking",
                "summary": "Covers NSGs, ASGs, Azure Firewall, Bastion, Private Endpoints, WAF, and DDoS.",
                "objectives": [o for o in objectives if o.get("domain", "").startswith("2.0")]
            },
            {
                "id": "mod-az500-03",
                "title": "Domain 3: Secure Compute, Storage, and Databases",
                "summary": "Covers Blob/Disk Encryption, TDE, Always Encrypted, AKS Security, and JIT VM Access.",
                "objectives": [o for o in objectives if o.get("domain", "").startswith("3.0")]
            },
            {
                "id": "mod-az500-04",
                "title": "Domain 4: Manage Security Operations",
                "summary": "Covers Microsoft Sentinel, KQL Threat Hunting, Defender for Cloud, and Azure Key Vault.",
                "objectives": [o for o in objectives if o.get("domain", "").startswith("4.0")]
            }
        ],
        "scenario_matrices": SCENARIOS_AND_CHEAT_SHEETS,
        "rickkotlarz_technical_guide": rick_content,
        "labs": labs
    }
    (ROOT / "az500_study_library.json").write_text(json.dumps(study_lib, indent=2), encoding="utf-8")
    (ROOT / "az500_study_library.js").write_text(f"window.AZ500_STUDY_LIBRARY = {json.dumps(study_lib, indent=2)};\n", encoding="utf-8")
    print("Wrote az500_study_library.json and az500_study_library.js")
    print("AZ-500 suite compilation complete!")

if __name__ == "__main__":
    main()
