
---
title: "Keep Secrets Out of State — and Out of Your Apps"
description: "An AI gateway multiplies secret relationships — provider keys, DB creds, signing material. Three rules that keep values out of Terraform state, out of consumer services, and out of reach of a compromised database."
pubDate: 'Jul 09 2026'
---

**Subtitle:** The hard part isn't picking a vault; it's designing every place a secret is allowed to appear.

---

# Secrets for an AI Gateway: Keep Them Out of State—and Out of Consumers

An AI gateway creates more secret relationships than a typical application. There are database credentials, session-signing material, a gateway administrator key, and provider keys for one or more model vendors. The number grows quickly as environments, providers, and key rotations are added.

The hard part is not finding a vault. The hard part is designing the entire route a secret takes: who creates it, where its value may appear, which runtime identity can read it, how it is rotated, and what happens if the application database or a running workload is compromised.

For `ai-gateway-secured-aws`, three rules make that route explicit.

## 1. Terraform declares secret containers, never secret values

Terraform state is a high-value operational record. It is copied between workstations and remote backends, retained for recovery, and read by people and automation that need to understand infrastructure. It is the wrong place for provider keys, passwords, or private key material.

Terraform therefore creates the Secrets Manager **containers** and exposes only their ARNs. The values are populated out of band by a bootstrap process that uses hidden input and does not write a `.env` file, variable sheet, or local secret file. The infrastructure definition can remain reviewable and reproducible while the credential value stays out of state.

That distinction matters more than it sounds:

```text
Terraform → creates secret container and IAM reference
Bootstrap  → writes secret value directly to the vault
Runtime    → reads only the secret ARN it is allowed to consume
```

If a value appears in a Terraform variable, a task-definition environment block, a plan output, or a CI log, it has already escaped the intended boundary. “Encrypted remote state” is not a reason to relax this rule; encryption protects a stored copy, not every person or system that is allowed to retrieve it.

## 2. Applications receive virtual keys, not provider keys

The most consequential separation is between an application consumer and the model-provider credential. Open WebUI, LibreChat, and future tool clients should not hold an OpenAI, Anthropic, or other provider key. They receive a scoped LiteLLM virtual key instead.

That virtual key can be restricted to models, assigned a budget and rate limit, and revoked without changing the provider account. A compromised frontend credential is still an incident, but it is a bounded and replaceable incident. A compromised provider key is a billing and data-exposure incident across every place it was reused.

The gateway is the policy point that holds provider credentials. That keeps provider access, spend controls, and audit decisions in one service rather than spreading them through every frontend and agent.

## 3. An encrypted application datastore is a trade-off, not a vault replacement

There are several defensible places for provider configuration. A vault-native integration keeps provider values in the secret manager and is attractive when its licensing, audit model, and operational behavior fit the platform. A startup retrieval pattern also keeps values in the vault, but introduces custom initialization code and normally makes a key change a deployment event.

The reference design uses LiteLLM's database-backed provider configuration, protected with a separately stored `LITELLM_SALT_KEY`. The key material is held in Secrets Manager and supplied to the gateway at runtime; the database stays private and encrypted at rest. Provider configuration is then managed through the gateway's administrative workflow rather than Terraform.

That gives an important at-rest separation: a database backup alone is not enough to interpret the encrypted provider configuration, and access to the separately protected key material alone does not expose the database contents. It also keeps provider values out of Terraform state and makes normal provider changes an application operation rather than an infrastructure change.

It is not magic. A compromise of the running gateway is more serious because the gateway is the component designed to use both the database and the key material. The pattern reduces the number of places where a provider key is stored; it does not eliminate the need to secure the gateway, its runtime identity, its database access, and its administrator surface. Calling this a two-control at-rest design is accurate. Calling it immunity from application compromise is not.

## The salt key is load-bearing

The `LITELLM_SALT_KEY` is not an ordinary disposable setting. Existing encrypted configuration depends on it. Replacing it without a recovery and re-encryption procedure can make stored provider configuration unreadable.

The operating rule is simple: generate it once, store it in the vault, back up the recovery process, and treat any change as a planned cryptographic migration—not as a casual environment variable rotation. Rotation is good hygiene only when the system can safely decrypt, re-encrypt, and verify the data it protects.

## Runtime identity is the second half of secret management

A vault is useful only if the caller is constrained. Each workload receives a distinct runtime identity and can read only the secret ARNs it needs. The ECS execution role obtains the values needed to start a task; the task role is separately scoped for the application's runtime AWS work. Those roles should not become a convenient shared identity for unrelated services.

The test is concrete: choose one service and list every secret it can retrieve. If it can name a provider credential, database password, or administrative secret belonging to another service, the design has already lost its least-privilege property.

This matters even more for MCP tools. A narrow read-only fetch server in the reference platform has an empty task role because it needs no AWS permissions at runtime. That makes a credential theft path materially less useful, and it prevents a tool service from inheriting the gateway's authority simply because both participate in the same AI workflow.

## Make the secure path the easy path

Security controls fail when routine work encourages people to bypass them. Provider additions, rotations, and retirements should have a documented, low-friction workflow that does not involve editing Terraform, copying a key into a ticket, or leaving a local file behind.

The correct workflow also records who may perform the change, how the old key is revoked, where provider-side usage is reviewed, and how a failed rotation is recovered. The gateway UI can make the application change easier; it does not replace those operating controls.

The durable lesson is that secret management is a system boundary, not a single service choice. Keep values out of state and disk, keep provider keys inside the gateway, give every runtime only the ARNs it needs, and be honest about the residual risk of the component that must ultimately use the secret. That is how an AI platform can add its twentieth key without making the twentieth key the one that escapes.
