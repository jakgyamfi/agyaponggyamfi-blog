---
title: "Secure Multi-Account AWS Deployment Pipeline"
description: "A reference architecture for deploying Terraform across an isolated multi-account AWS organization: zero long-lived credentials, per-account isolation, and a supply-chain-hardened CI/CD pipeline."
pubDate: 2026-07-12
tags: ["AWS", "Cloud Security", "Terraform", "CI/CD", "DevSecOps", "IAM", "GitHub Actions"]
---

A production-grade reference architecture for deploying infrastructure-as-code across a multi-account AWS organization — built around one hard constraint: maximum security without sacrificing day-two operability.

## What it does

Deploys Terraform to many isolated AWS accounts through a single reusable, fanned-out CI/CD pipeline — with no static AWS credentials anywhere in the system, and strict isolation so no single mistake or compromise can cascade across the estate.

## Engineering highlights

- **Keyless, federated access.** GitHub Actions authenticates via OIDC into a single gateway account, then chains into each workload account. Nothing stores an AWS access key.
- **Isolation as a trust-policy property.** Each workload account is reachable only with a distinct external ID held in its own environment — so a deployment scoped to one workload structurally cannot assume another's role.
- **Supply-chain hardening.** Every third-party action and cross-repo workflow is pinned to an immutable commit SHA; Dependabot automates the update cadence, keeping dependencies both locked at runtime and fresh over time.
- **Least-privilege, gated deploys.** Scoped OIDC trust with no cross-boundary wildcards, static IaC scanning that blocks on high-severity findings, and a manual approval gate that surfaces the plan before any production apply.
- **Decisions on the record.** Seven Architecture Decision Records document the trade-off — and, where it matters, the silent failure mode — behind each choice.

## The story behind it
Eliminating credentials eliminates credential infrastructure. Workload identity federation (OIDC) doesn't just remove the *risk* of stored credentials — it removes the *infrastructure* around them: rotation systems,
secret-management overhead, the operational cost of auditing who has which key. I have written a few blogs about this on my blog page [*https://agyaponggyamfi.com/blog/*]

## Some gotcha's worth mentioning
To make every deployment auditable, the tooling attaches session tags — metadata like the actor, commit SHA, and run ID — to each assumed session. Those tags flow into CloudTrail, giving per-deployment attribution. The session-tagging step failed. Every time. I wrote about this, published at [https://agyaponggyamfi.com/blog/tagsession-vs-externalid/]

The supply-chain work came with a lesson worth writing up: the same immutability that protects production at 2 a.m. also creates a maintenance burden that has to be engineered away rather than endured. I wrote about that trade-off in [*CI/CD pipeline underbellies - Security tightened, Vigilance become the tax*](https://agyaponggyamfi.com/blog/the-ci-cd-underbellies-at-2am/).

**View the code:** [github.com/jakgyamfi/aws-multi-account-secure-pipeline](https://github.com/jakgyamfi/aws-multi-account-secure-pipeline)
