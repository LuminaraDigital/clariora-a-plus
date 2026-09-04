# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 3.1.x | Yes |
| Older | No |

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's advisory form:

https://github.com/LuminaraDigital/comptia-a-plus-master/security/advisories/new

If you cannot use that form, email luminaradigitalagency@gmail.com with the subject line "CompTIA A+ Master security".

Include the version, the platform, steps to reproduce and any proof of concept. You will get an acknowledgement within five working days and a fix or a mitigation plan within thirty days for confirmed issues.

Please do not open a public issue for a security problem and please do not test against other people's deployments.

## Scope

In scope:

- The web app, the Electron desktop app and the preload bridge
- The offline licence and entitlement checks
- The optional Supabase sync layer and its schema
- The build, release and deploy tooling in `tools/`

Out of scope:

- Third-party services the app can talk to (Groq, Supabase, Cloudflare) unless the issue is in how this project uses them
- Denial of service against a self-hosted instance

## Design notes for reviewers

- The Electron renderer runs with context isolation on and node integration off. All privileged operations go through the allow-list in `preload.js`.
- Licence keys are verified with an ECDSA P-256 public key that ships in `js/entitlements-config.js`. The private key never leaves the build machine and is gitignored under `build/certs/`.
- The AI tutor key is supplied by the user at runtime and held in local storage. It is never written to the repository or sent anywhere except the configured Groq endpoint.
- Learner progress is stored locally. Cloud sync is opt-in and off by default.
