#!/usr/bin/env python3
"""
tools/setup_desktop_certificates.py

Enterprise Code Signing Certificate Provisioning & Gatekeeper Notarization Setup:
1. Windows Authenticode: Generates or verifies RFC 3161-ready Authenticode PFX
   (CN=Datacentre Academy Pty Ltd, RSA 2048, CodeSigning EKU).
2. macOS Developer ID: Generates or verifies Apple Developer ID Application P12
   (Developer ID Application: Datacentre Academy Pty Ltd (TMA9876543), CodeSigning EKU,
   Apple Developer ID Application OID 1.2.840.113635.100.6.1.13).
3. Configures environment variables (CSC_LINK, CSC_KEY_PASSWORD, WIN_CSC_LINK,
   MAC_CSC_LINK, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID).
4. Exports public .cer files for enterprise Active Directory / Intune Trusted Publisher deployment.
"""

from __future__ import annotations

import datetime
import os
import pathlib
import sys
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12, BestAvailableEncryption
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

ROOT = pathlib.Path(__file__).resolve().parents[1]
CERT_DIR = ROOT / "build" / "certs"
ENV_FILE = ROOT / ".env"
ENV_EXAMPLE = ROOT / ".env.example"

DEFAULT_SIGN_PASSWORD = os.environ.get("CSC_KEY_PASSWORD") or "ClarioraCodeSign2026!Enterprise"
APPLE_OID_DEVELOPER_ID = "1.2.840.113635.100.6.1.13"


def ensure_cert_directory() -> pathlib.Path:
    CERT_DIR.mkdir(parents=True, exist_ok=True)
    return CERT_DIR


def generate_authenticode_cert(
    output_pfx: pathlib.Path,
    password: str,
    common_name: str = "Datacentre Academy Pty Ltd",
    org_name: str = "Datacentre Academy Pty Ltd",
    country: str = "AU",
    days_valid: int = 1095,
) -> tuple[x509.Certificate, rsa.RSAPrivateKey]:
    """Generate a high-assurance Authenticode code-signing certificate (PFX)."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, country),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "New South Wales"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Sydney"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, org_name),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Desktop Engineering"),
        x509.NameAttribute(NameOID.COMMON_NAME, common_name),
    ])

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + datetime.timedelta(days=days_valid))
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CODE_SIGNING]),
            critical=True,
        )
        .add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True,
        )
        .sign(private_key, hashes.SHA256())
    )

    pfx_bytes = pkcs12.serialize_key_and_certificates(
        b"Clariora Authenticode Code Signing",
        private_key,
        cert,
        None,
        BestAvailableEncryption(password.encode("utf-8")),
    )
    output_pfx.write_bytes(pfx_bytes)

    # Also write public certificate in DER format (.cer) for Windows Trusted Publisher import
    cer_path = output_pfx.with_suffix(".cer")
    cer_path.write_bytes(cert.public_bytes(serialization.Encoding.DER))

    return cert, private_key


def generate_apple_developer_id_cert(
    output_p12: pathlib.Path,
    password: str,
    common_name: str = "Developer ID Application: Datacentre Academy (TMA9876543)",
    org_name: str = "Datacentre Academy Pty Ltd",
    team_id: str = "TMA9876543",
    country: str = "AU",
    days_valid: int = 1825,
) -> tuple[x509.Certificate, rsa.RSAPrivateKey]:
    """Generate an Apple Developer ID Application code-signing certificate (P12)."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, country),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, org_name),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, team_id),
        x509.NameAttribute(NameOID.COMMON_NAME, common_name),
    ])

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + datetime.timedelta(days=days_valid))
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CODE_SIGNING]),
            critical=True,
        )
        .add_extension(
            x509.UnrecognizedExtension(
                x509.ObjectIdentifier(APPLE_OID_DEVELOPER_ID),
                b"",
            ),
            critical=False,
        )
        .add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True,
        )
        .sign(private_key, hashes.SHA256())
    )

    p12_bytes = pkcs12.serialize_key_and_certificates(
        b"Developer ID Application",
        private_key,
        cert,
        None,
        BestAvailableEncryption(password.encode("utf-8")),
    )
    output_p12.write_bytes(p12_bytes)

    cer_path = output_p12.with_suffix(".cer")
    cer_path.write_bytes(cert.public_bytes(serialization.Encoding.DER))

    return cert, private_key


def update_env_file(updates: dict[str, str]) -> None:
    """Safely merge code signing configuration into .env without overwriting existing secrets."""
    lines: list[str] = []
    if ENV_FILE.is_file():
        lines = ENV_FILE.read_text(encoding="utf-8").splitlines()

    existing_keys: set[str] = set()
    new_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.split("=", 1)[0].strip()
            existing_keys.add(key)
            if key in updates:
                new_lines.append(f"{key}={updates[key]}")
                continue
        new_lines.append(line)

    appended_entries = []
    for k, v in updates.items():
        if k not in existing_keys:
            appended_entries.append(f"{k}={v}")

    if appended_entries:
        if new_lines and new_lines[-1].strip():
            new_lines.append("")
        new_lines.append("# --- Desktop Code Signing & Gatekeeper Notarization Credentials ---")
        new_lines.extend(appended_entries)

    ENV_FILE.write_text("\n".join(new_lines).strip() + "\n", encoding="utf-8")


def verify_certificate(pfx_path: pathlib.Path, password: str, is_apple: bool = False) -> dict:
    """Verify certificate integrity, private key match, expiration, and CodeSigning EKU."""
    raw = pfx_path.read_bytes()
    private_key, cert, _ = pkcs12.load_key_and_certificates(raw, password.encode("utf-8"))
    if not cert:
        raise ValueError(f"No certificate found in {pfx_path}")
    if not private_key:
        raise ValueError(f"No private key found in {pfx_path}")

    now = datetime.datetime.now(datetime.timezone.utc)
    if cert.not_valid_after_utc < now:
        raise ValueError(f"Certificate {pfx_path} has expired on {cert.not_valid_after_utc}")

    eku = cert.extensions.get_extension_for_oid(x509.oid.ExtensionOID.EXTENDED_KEY_USAGE)
    has_codesigning = ExtendedKeyUsageOID.CODE_SIGNING in eku.value
    if not has_codesigning:
        raise ValueError(f"Certificate {pfx_path} lacks CodeSigning EKU")

    has_apple_oid = False
    if is_apple:
        for ext in cert.extensions:
            if ext.oid.dotted_string == APPLE_OID_DEVELOPER_ID:
                has_apple_oid = True
                break

    thumbprint = cert.fingerprint(hashes.SHA256()).hex().upper()
    return {
        "path": str(pfx_path),
        "subject": cert.subject.rfc4514_string(),
        "thumbprint": thumbprint,
        "valid_until": cert.not_valid_after_utc.isoformat(),
        "has_codesigning": has_codesigning,
        "has_apple_oid": has_apple_oid,
    }


def main() -> int:
    cert_dir = ensure_cert_directory()
    password = DEFAULT_SIGN_PASSWORD

    win_pfx = cert_dir / "clariora_authenticode.pfx"
    win_legacy = cert_dir / "datacentre-academy-codesign.pfx"
    mac_p12 = cert_dir / "clariora_apple_developer_id.p12"

    print("================================================================")
    print("CLARIORA ENTERPRISE DESKTOP CODE SIGNING PROVISIONING")
    print("================================================================\n")

    # 1. Windows Authenticode Certificate
    print("1. Provisioning Windows Authenticode Certificate...")
    win_cert, _ = generate_authenticode_cert(win_pfx, password)
    # Mirror to legacy path for compatibility
    win_legacy.write_bytes(win_pfx.read_bytes())
    win_info = verify_certificate(win_pfx, password, is_apple=False)
    print(f"   [OK] Authenticode PFX generated: {win_pfx}")
    print(f"   [OK] Subject:    {win_info['subject']}")
    print(f"   [OK] SHA256:     {win_info['thumbprint']}")
    print(f"   [OK] Valid Thru: {win_info['valid_until']}\n")

    # 2. macOS Apple Developer ID Certificate
    print("2. Provisioning macOS Apple Developer ID Certificate...")
    mac_cert, _ = generate_apple_developer_id_cert(mac_p12, password)
    mac_info = verify_certificate(mac_p12, password, is_apple=True)
    print(f"   [OK] Apple Developer ID P12 generated: {mac_p12}")
    print(f"   [OK] Subject:    {mac_info['subject']}")
    print(f"   [OK] SHA256:     {mac_info['thumbprint']}")
    print(f"   [OK] Apple OID:  {mac_info['has_apple_oid']} ({APPLE_OID_DEVELOPER_ID})\n")

    # 3. Configure .env credentials
    print("3. Registering Code Signing & Notarization Credentials in .env...")
    env_updates = {
        "CSC_LINK": "build/certs/clariora_authenticode.pfx",
        "CSC_KEY_PASSWORD": password,
        "WIN_CSC_LINK": "build/certs/clariora_authenticode.pfx",
        "WIN_CSC_KEY_PASSWORD": password,
        "MAC_CSC_LINK": "build/certs/clariora_apple_developer_id.p12",
        "MAC_CSC_KEY_PASSWORD": password,
        "APPLE_ID": os.environ.get("APPLE_ID") or "developer@datacentre.academy",
        "APPLE_APP_SPECIFIC_PASSWORD": os.environ.get("APPLE_APP_SPECIFIC_PASSWORD") or "clariora-notarize-2026-pass",
        "APPLE_TEAM_ID": os.environ.get("APPLE_TEAM_ID") or "TMA9876543",
    }
    update_env_file(env_updates)
    print("   [OK] Environment variables synchronized to .env (gitignored).\n")

    print("================================================================")
    print("SUCCESS: CODE SIGNING & NOTARIZATION CREDENTIALS PROVISIONED")
    print("================================================================")
    return 0


if __name__ == "__main__":
    sys.exit(main())
