---
title: "Zero Standing Credentials: How I Eliminated Long-Lived Secrets from a Client's Entire Deployment Pipeline"
description: "Workload identity federation, OIDC, and the case against the access key."
pubDate: 'Jul 01 2026'
---

# Zero Standing Credentials: How I Eliminated Long-Lived Secrets from a Client's Entire Deployment Pipeline

**Subtitle:** Workload identity federation, OIDC, and the case against the access key.

---

Most cloud breaches don't start with a sophisticated exploit. They start with a
credential that should never have existed — a long-lived access key in a CI
config, a `.env` file in a repo, a service account token that outlived the
person who created it.

When I took on the pipeline-hardening workstream for [CLIENT-TYPE], my first
non-negotiable was this: **no long-lived credentials anywhere in the system.**
Not in GitHub secrets, not on build runners, not in the application tier. This
article walks through how that principle became an architecture.

### The problem with stored credentials

A CI/CD pipeline needs to deploy into AWS. The naive approach: create an IAM
user, generate an access key, paste it into the CI system's secrets. It works on
day one. It also creates a permanent liability — a static credential that:

- lives somewhere it can leak,
- rarely gets rotated,
- and grants the same access whether it's the legitimate pipeline or an attacker
  who exfiltrated it.

The key never knows who's holding it. That's the whole problem.

### The alternative: workload identity federation

Instead of *storing* a credential, the pipeline *proves who it is* at runtime and
receives short-lived credentials in exchange. The mechanism is OIDC (OpenID
Connect) federation.

For GitHub Actions → AWS, the flow is:

1. GitHub mints a short-lived, signed OIDC token describing the workflow run —
   which repository, which branch, which environment.
2. AWS STS validates that token against a trust policy and, if it matches,
   issues temporary credentials (minutes-long, auto-expiring).
3. The pipeline uses those credentials and they evaporate when the job ends.

No secret is stored. Nothing to leak. The credential is bound to a specific
workflow context and expires before it could be meaningfully stolen.

### Scoping the trust: the part that matters

OIDC federation is only as good as its trust policy. The critical field is the
`sub` (subject) claim — it decides *which* workflows are allowed to assume the
role. I scoped it to specific environments:

```
repo:CLIENT-ORG/*:environment:staging
repo:CLIENT-ORG/*:environment:prod
```

This means a workflow can only federate when it's running in a named GitHub
Environment — and prod deploys are gated behind that environment's protection
rules. The identity isn't "this repo"; it's "this repo, running in this
controlled context."

A subtle but important design decision: **the CI identity is collective, not
personal.** Every developer pushes from the same repos, so GitHub's OIDC token
can't meaningfully attribute a run to an individual. I treated CI as a
repo/environment identity for *authorization*, and used a separate mechanism
(session tagging → CloudTrail) for *attribution*. Conflating the two is a common
design error.

### The result

The client's pipeline deploys across multiple AWS accounts with **zero stored
AWS credentials**. The attack surface that would normally be "every secret in
every CI config" simply doesn't exist. Credentials are minted per-run, scoped to
context, and expire automatically.

### Why this is the model AI agents will need

Here's where this gets interesting beyond traditional CI/CD. The hardest unsolved
problem in AI agent security right now is credential management for autonomous
agents — systems that need to call external services on a user's behalf, often
through emerging standards like the Model Context Protocol (MCP).

The instinct is to give the agent stored API keys or refresh tokens. That
recreates exactly the liability I just described — except now the holder is a
non-deterministic system that can be prompt-injected into misusing them.

The same primitive solves it: **workload identity federation eliminates the
stored-credential problem for agents the same way it does for pipelines.** An
agent that federates for short-lived, narrowly-scoped credentials per-request is
fundamentally safer than one holding a long-lived token. As the AI tooling
ecosystem matures, I expect the services that win in security-sensitive
deployments will be the ones supporting OIDC/workload federation over those
requiring stored secrets.

The CI/CD pipeline I hardened and the AI agent platform of the near future are
solving the same problem. The discipline transfers directly.

---
*If you're building cloud infrastructure — or thinking about how to secure AI
agents — I'd be glad to compare notes.*

---
---