---
title: 'Isolation by Construction: Designing a Multi-Account AWS Architecture Where Boundaries Can't Be Bypassed'
description: 'Why I stopped relying on naming conventions and started enforcing isolation structurally.'
pubDate: 'Jun 30 2026'
---
# Isolation by Construction: Designing a Multi-Account AWS Architecture Where Boundaries Can't Be Bypassed

**Subtitle:** Why I stopped relying on naming conventions and started enforcing isolation structurally.

---

There are two ways to keep a staging deployment from touching production. One is
discipline: name things carefully, be cautious, hope no one fat-fingers a config.
The other is construction: build the system so that staging *cannot* reach
production, no matter what anyone types.

For [CLIENT-TYPE], I designed the second kind. This is the philosophy and the
mechanics.

### The failure mode of convention

Convention-based isolation looks fine until it doesn't. A shared credential "for
convenience." A state file both environments can read. A role broad enough to
work everywhere. Each is a single point where one mistake crosses a boundary that
was only ever enforced by good intentions.

I treat every such boundary as something that must be enforced *structurally* —
by the architecture itself, not by the care of the person operating it.

### The principles

**Per-account everything.** Each environment is a separate AWS account. State
lives in that account. The execution role lives in that account. The encryption
key lives in that account. There is no shared resource for a mistake to leak
through, because the boundary *is* the account boundary — the strongest isolation
AWS offers.

**Roles by account × function, never by person or repo.** A common anti-pattern
is one role per repository or per developer, which sprawls into hundreds of
near-identical roles. Instead, the role *definition* exists once per account per
function. Identities scope *into* those fixed roles via trust policies and
permission boundaries. Adding a developer or a repo adds zero roles — only a
trust-policy entry.

**Deliberate opt-in over automatic propagation.** New accounts and repos are
brought into the system explicitly, one at a time, with verification at each
step. Nothing propagates automatically — because automatic propagation means a
mistake propagates automatically too.

**State isolation as a first-class concern.** Terraform state contains a complete
inventory of your infrastructure and often secrets in plaintext. Centralizing it
means one compromise exposes everything. I gave each account its own state
backend — separate bucket, separate lock table — so a compromise of one
environment's state cannot touch another's. The same isolation that protects the
infrastructure protects the description of it.

### The bootstrap problem, and StackSets as the answer

There's a chicken-and-egg challenge: the deployment role and state backend must
exist *before* the deployment tooling can run. You can't use Terraform to create
the thing Terraform needs to run.

I solved this with a CloudFormation StackSet that provisions exactly one bootstrap
layer per account — the execution role, the state bucket, the lock table — and
nothing more. The StackSet owns the bootstrap; the deployment pipeline owns
everything downstream. One clean seam between "what must exist first" and "what
the pipeline manages."

### Why this matters for what's next

Isolation-by-construction isn't just a cloud-architecture concern. The
multi-tenant AI systems being built today — agents serving many users, MCP
servers brokering access to many backends — face exactly this problem at a higher
stakes level. Shared compute serving multiple tenants is a single point of total
compromise. The mitigations are the same ones I applied here: per-tenant
credential scoping, least-privilege execution roles, and isolation enforced by
construction rather than convention.

The discipline of "make the boundary structural" is, I think, the single most
important principle carrying forward from cloud security into AI security. The
blast radius of a multi-tenant AI system is too large to protect with good
intentions.

---

---
---