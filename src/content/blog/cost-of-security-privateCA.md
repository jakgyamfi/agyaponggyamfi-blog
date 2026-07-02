---
title: "Cost of Security -  Building a Private Certificate Authority for Workstation-to-Cloud Authentication"
description: "Save dollars without compromising Security - TPM-bound X.509 certificates, AWS IAM Roles Anywhere, and identity that lives in hardware."
pubDate: 'Jul 02 2026'
---

**Subtitle:** TPM-bound X.509 certificates, AWS IAM Roles Anywhere, and identity that lives in hardware.

---

Not every system that needs AWS access runs in the cloud. Developer workstations,
build VMs, and on-premise machines need a way to authenticate that doesn't fall
back to the thing we're trying to eliminate — long-lived access keys on disk.

For [CLIENT-TYPE], I built this authentication plane using a private certificate
authority and AWS IAM Roles Anywhere. Here's the architecture and the reasoning.

### The problem

A workstation needs to run infrastructure tooling against AWS. The lazy answer is
an access key in `~/.aws/credentials`. That's a long-lived secret sitting on a
laptop — precisely the liability the whole security model exists to prevent.

I wanted machine identity that:
- is bound to the specific hardware (can't be copied to another machine),
- uses short-lived credentials (no standing secret),
- and is governed centrally (revoke a machine without touching others).

### The architecture

**A private root CA.** I stood up a private certificate authority as the root of
trust. Every authorized machine gets an X.509 certificate signed by this CA. The
CA's identity becomes the thing AWS trusts.

**TPM-bound keys.** The private key for each machine's certificate is generated
and stored in the machine's Trusted Platform Module — dedicated security
hardware. The key never leaves the TPM. This is the crucial property: the
certificate can't be exfiltrated and used elsewhere, because the private key is
physically bound to that machine's hardware. Stealing the cert file gets you
nothing without the TPM that holds its key.

**AWS IAM Roles Anywhere.** Roles Anywhere lets AWS trust an external CA. I
registered the private root CA as a trust anchor. Now any machine presenting a
valid certificate signed by that CA can exchange it for short-lived AWS
credentials — the same zero-standing-credential model as the OIDC pipeline, but
for hardware identities instead of workflow identities.

### The trust model: issuer-gated allow with targeted deny

The governance design is worth detailing. Rather than maintaining an allow-list of
every permitted machine (which sprawls), I used an **issuer-gated allow**: any
certificate signed by the trusted CA is permitted, because the CA signature *is*
the authorization. Machine-specific control happens through **targeted denies** —
for sensitive environments, specific machine certificate identities are explicitly
denied, sourced from a single central definition.

This inverts the usual maintenance burden. The common case (a trusted machine
gets access) requires no per-machine configuration. The exception (block a
specific machine from production) is a single edit in one place. The trust policy
scales by exception, not by enumeration.

### Two planes, one principle

This workstation-authentication plane sits alongside the CI/CD pipeline's
OIDC-federation plane. They look different — hardware certificates vs workflow
tokens — but they share the core principle: **identity is proven at runtime and
exchanged for short-lived credentials. Nothing long-lived is stored anywhere.**

Whether the identity is a GitHub Actions workflow or a developer's TPM-bound
laptop, the model is the same. That consistency is what makes a security
architecture comprehensible — and a comprehensible architecture is a defensible
one.

### Why hardware-bound identity matters going forward

As AI agents and autonomous tooling proliferate, the question of "what is this
thing and is it allowed to act" becomes central. Hardware-rooted identity — keys
bound to a TPM, certificates chained to a known CA — is one of the strongest
answers we have to machine identity. The principles I applied here for workstation
authentication are, I believe, part of the foundation that trustworthy autonomous
systems will need to be built on.

---

---