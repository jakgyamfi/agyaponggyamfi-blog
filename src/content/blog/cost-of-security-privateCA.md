---
title: "The Cost of Security: A Hardware-Bound Private CA for Workstation-to-Cloud Authentication"
description: "Why I put the root CA itself inside a TPM — so no private key is ever stored as a file, anywhere — and wired it to AWS IAM Roles Anywhere for short-lived, hardware-rooted machine identity."
pubDate: 'Jul 02 2026'
---

**Subtitle:** TPM-bound X.509 certificates, AWS IAM Roles Anywhere, and an identity root that lives in silicon instead of on disk.

---

Not every system that needs AWS access runs in the cloud. Developer workstations, build VMs, and on-premise machines still need to authenticate — and the lazy answer is the exact thing a good security model exists to eliminate: a long-lived access key sitting in a file on a laptop.

I built an authentication plane that removes that liability for `<CLIENT-TYPE>`. The design has one property I want to lead with, because it's the part most write-ups get wrong: **there is no private key stored as a file anywhere in this system — not for the machines, and not even for the certificate authority that signs them.** This article is the architecture and, more importantly, the reasoning behind it.

### The problem

A workstation needs to run infrastructure tooling against AWS. The default is an access key in `~/.aws/credentials`: a standing secret, copyable, exfiltratable, and valid until someone remembers to rotate it. Everything else in the security model is designed to avoid precisely this kind of durable, portable credential — so leaning on one here would undercut the whole thing.

I wanted machine identity that is:

- **bound to specific hardware** — it cannot be copied to another machine,
- **short-lived** — credentials expire in minutes, with nothing standing,
- **centrally governed** — I can revoke one machine without touching any other.

### The decision that shapes everything: a TPM-bound root CA

Most private-CA guides generate the root CA key with a tool like OpenSSL. That produces a file — `rootCA.key` — and from that moment your entire trust hierarchy has a single, copyable point of failure. You can encrypt that file and store it in a password manager, but every time the CA signs a certificate, the key is decrypted into memory, where malware or a memory-scraper can capture it. And anyone who copies the file can clone your CA and forge trusted identities from anywhere in the world.

I rejected that model. Instead, I generated the root CA **directly inside the host's Trusted Platform Module**, using the platform's hardware crypto provider with the key marked non-exportable. The consequences are the whole point:

- The CA's private key is **born inside the TPM chip and can never leave it** — not as a file, not as a text block, not by an administrator, not by root-level malware.
- Signing happens **inside** the cryptoprocessor. A certificate request goes in; a finished signature comes out. The key material is never exposed to the operating system at any point.
- Certificates can therefore only ever be issued from **this one physical machine**. That's cryptographic non-repudiation of the issuer, enforced by hardware rather than by policy.

In the illustrative snippet below, the provider selection and the non-exportable policy are the load-bearing lines — they are what bind the root of trust to silicon:

```powershell
# Root CA generated inside the TPM; key is non-exportable by construction
New-SelfSignedCertificate `
  -Provider "<TPM_CRYPTO_PROVIDER>" `   # targets the physical TPM chip
  -KeyExportPolicy None `               # the key can never be exported, ever
  -Subject "CN=<ROOT_CA_NAME>" `
  -CertStoreLocation "Cert:\LocalMachine\My" `
  -NotAfter (Get-Date).AddYears(5)
# (Basic Constraints CA:TRUE and Key Usage keyCertSign are set as critical extensions)
```

This is the correction to how I'd described the system before, and it matters: the strong claim isn't "each machine has a TPM key." It's that **the root of the entire hierarchy has no exportable key at all.**

### TPM-bound keys on the machines, too

Each authorized machine gets its own X.509 certificate, and its private key is likewise generated and sealed inside that machine's own TPM. The key never leaves the hardware. Stealing the certificate file gets an attacker nothing, because the certificate is useless without the TPM that physically holds its key.

So the design has hardware-bound identity at both ends: the machines that authenticate, and the authority that vouches for them. No link in the chain is a file on a disk.

### How signing works without ever exposing a key

Because the CA key can't be exported, signing can't be a simple "point OpenSSL at the key file" operation — there is no key file. Instead, a machine generates its certificate request locally (its own key staying in its own TPM), and that request is signed on the CA host by driving the TPM-held key through the operating system's cryptography layer. The request goes into the hardware; the signed certificate comes back out. At no point does either private key — the machine's or the CA's — exist as extractable bytes.

The issued certificates are deliberately shaped as end-entity client certificates (constrained so they cannot themselves act as authorities), which is exactly what the cloud trust layer requires to accept them.

### AWS IAM Roles Anywhere: the cloud half

AWS IAM Roles Anywhere lets AWS trust an external certificate authority. I registered the private root CA as a **trust anchor**. From that point, any machine presenting a valid certificate signed by that CA can exchange it — at runtime — for short-lived AWS credentials.

This is the same zero-standing-credential model as an OIDC pipeline, but for hardware identities instead of workflow identities. The machine proves who it is with its certificate, receives temporary credentials that expire on their own, and stores nothing durable.

### The trust model: issuer-gated allow with targeted deny

The governance design is worth detailing, because it's where this scales.

Rather than maintaining an allow-list of every permitted machine — which sprawls as the fleet grows — I used an **issuer-gated allow**: any certificate signed by the trusted CA is permitted, because the CA's signature *is* the authorization. Machine-specific control happens through **targeted denies**: for sensitive environments, individual machine certificate identities are explicitly excluded, sourced from a single central definition.

This inverts the usual maintenance burden. The common case — a trusted machine gets access — requires no per-machine configuration at all. The exception — block one machine from production — is a single edit in one place. The trust policy scales by exception, not by enumeration.

### The honest limitation: hardware-bound means hardware-fated

The property that makes this design strong is also its sharpest constraint, and I'd be selling it dishonestly if I skipped it. **A key that can never leave the hardware cannot be backed up.** If the TPM-bearing host fails — motherboard death, disk failure that takes the certificate store with it, a wiped machine — the key is gone. There is no recovery file, because the entire point was that no recovery file exists.

For the **machine certificates**, this is a non-event: you provision a new machine, generate a fresh TPM key, issue a new certificate, and revoke the old identity. Machines are cattle; re-issuing is cheap and already part of the workflow.

For the **root CA**, it's a real design decision. Losing the CA host means standing up a new CA and re-establishing the trust anchor — every machine certificate must then be re-issued under the new root. You mitigate this deliberately rather than by backing up the unbackuppable:

- **Plan for re-issuance, not recovery.** Keep certificate provisioning fully scripted and idempotent, so rebuilding the entire fleet's trust under a new CA is a run-the-runbook operation, not an archaeology project.
- **Keep the CA validity long and the fleet certs short.** The root rarely needs to change; the leaf certificates rotate frequently and cheaply.
- **Consider a short-lived intermediate CA** for issuance, so the hardware root is used rarely and the blast radius of any single host is bounded.

This is the actual cost in "the cost of security": you trade recoverability for non-exfiltratability. For a root of trust, that's usually the right trade — a CA key you can restore from backup is a CA key an attacker can steal from backup.

### A more portable variant: the same model on a YubiKey

The architecture doesn't require a motherboard TPM. The same non-exportable-key principle works on a **hardware security key such as a YubiKey**, and for some situations it's the better choice.

A YubiKey's PIV applet can generate and hold the private key in its secure element with the key marked non-exportable — the identical guarantee the TPM gives, in a device you can move between machines. That portability changes the failure story in useful ways:

- **The identity isn't fated to one motherboard.** If a workstation dies, you move the key to another machine and keep working. The root of trust travels with the token, not the chassis.
- **Physical custody becomes explicit.** The CA can be locked in a safe and only present when it needs to sign, which is a clean operational story for a root that should be used rarely.
- **It generalizes past Windows.** A PIV token authenticates the same way across operating systems, which suits a mixed fleet better than a platform-specific TPM store.

The tradeoffs are the mirror image: a token can be lost or physically stolen (so it needs a PIN and careful custody), and it's one more piece of hardware to manage. TPM versus YubiKey is really a question of *where you want the identity to live* — welded to a specific machine, or held in a portable token you physically control. Both honor the same non-negotiable: **the private key is never a file.**

### Two planes, one principle

This workstation-authentication plane sits alongside the CI/CD pipeline's OIDC-federation plane. They look different — hardware certificates versus workflow tokens — but they share the core principle:

> **Identity is proven at runtime and exchanged for short-lived credentials. Nothing long-lived is stored anywhere.**

Whether the identity is a CI workflow or a developer's TPM-bound laptop, the model is the same. That consistency is what makes a security architecture comprehensible — and a comprehensible architecture is a defensible one.

### Why hardware-rooted identity matters going forward

As AI agents and autonomous tooling proliferate, "what is this thing, and is it allowed to act?" becomes a central question. Hardware-rooted identity — keys sealed in a TPM or a secure element, certificates chained to a known, non-exportable authority — is one of the strongest answers we have to machine identity. The principles here for workstation authentication are, I believe, part of the foundation that trustworthy autonomous systems will be built on.

The dollar cost of this setup was effectively zero: a TPM the hardware already had, a free credential helper, and no per-certificate fees. The engineering cost was thinking clearly about where a key is allowed to exist. That's usually where the real security is bought — not in what you spend, but in what you refuse to store.
