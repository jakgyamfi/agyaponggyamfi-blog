---
title: 'Security-first AWS AI gateway: LiteLLM, Open WebUI, LibreChat & MCP—Terraform, ECS, OIDC.'
description: 'A production-informed, security-first AWS reference for running LiteLLM behind Open WebUI and LibreChat, with a narrowly scoped MCP tool layer. Terraform, ECS Fargate, least-privilege IAM, governed egress, and secrets kept out of state.'
pubDate: 'Jun 28 2026'
---

> I built **ai-gateway-secured-aws**, a scrubbed public version of production-informed AI platform work. It shows how to make an LLM gateway a security control plane rather than a shared provider-key store: LiteLLM runs privately, consumer applications use scoped virtual keys, provider keys stay at the gateway, and the infrastructure treats egress, runtime identity, and secret handling as first-class boundaries.
>
> The repository includes Terraform for LiteLLM, Open WebUI, LibreChat, and a deliberately narrow read-only MCP fetch service. The security story is concrete: per-service IAM roles, private networking, an SNI-allowlist egress proxy, runtime secrets that never enter Terraform state, and a resolved-IP SSRF guard for the tool service. It also documents operational trade-offs—single-instance egress recovery, encrypted database-backed provider configuration, protected two-hop OIDC deployment, and cost controls for idle environments.
>
> The public repository contains no client identifiers, live credentials, account IDs, or deployment targets. It is a fork-and-deploy reference; claims about a particular deployment should always be supported by its reviewed plan and operating evidence.
>
## Why this exists
Most "AI on AWS" examples stop at "call the model." The real problem starts after that: once several apps and agents need model access, how do you stop provider API keys from scattering, control and audit egress, budget usage, and do it without enterprise pricing?

The answer here is a gateway. LiteLLM runs privately and becomes the single service that holds provider keys and the single service allowed to reach provider APIs. Every consumer — Open WebUI, LibreChat, agents/MCP — gets a scoped virtual key, never a provider key and never the master key. The gateway is a policy enforcement point: egress control, secret containment, per-app credentials, budgets, and audit collapse onto one guarded service.

And because "only LiteLLM egresses to providers" is a claim worth nothing until the network enforces it, the platform's default route runs through an egress proxy that allowlists destinations by TLS server name. A workload asking for anything off the list is refused — and the refusal is logged by name.

> **[View ai-gateway-secured-aws →](https://github.com/jakgyamfi/ai-gateway-secured-aws)**