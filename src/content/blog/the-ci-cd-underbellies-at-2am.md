---
title: "CI/CD pipeline underbellies - Security tightened, Vigilance become the tax"
description: "A field note on hardening a multi-account AWS deployment pipeline: why pinning every dependency to an immutable commit is the right call, the maintenance trade it forces, and how to automate the vigilance instead of enduring it."
pubDate: 'Jul 12 2026'
---

Every security control has two faces. The lock that keeps an intruder out is the same lock you're standing in front of, at 2 a.m., when production is down and you need in. Mature security engineering isn't about collecting controls — it's about understanding the second face of each one, and deciding, deliberately, that the trade is worth it.

I was reminded of this on a recent engagement: building a deployment pipeline for a client consolidating their infrastructure across a multi-account AWS environment. The mandate was easy to state and hard to satisfy — deploy infrastructure-as-code to production safely, across account boundaries, with no long-lived credentials and no path for a single mistake to cascade. What follows is one decision from that build, the trade it forced, and how we kept the trade from quietly becoming a liability.

## The shape of the pipeline

The environment was organized the way a security-conscious AWS estate should be: each product line in its own account, production separated from non-production, and a dedicated account acting as the single controlled entry point for all deployments. The CI/CD pipeline authenticated to that gateway account using GitHub's OIDC federation — short-lived, token-based identity, with no static access keys anywhere in the system. From there it assumed a tightly scoped role in each target account, using a distinct external ID per account as the boundary that keeps one account's deployment from ever reaching into another's. A single reusable workflow, fanned out across every account by a build matrix, did the real work: plan, gate, apply.

That design already reflects a posture most teams never reach. But it has a soft underbelly — one almost everyone overlooks: the pipeline's own dependencies.

## The supply chain nobody watches

A CI/CD workflow is not self-contained. It pulls in third-party building blocks — checkout actions, cloud-credential actions, scanning tools — and, in a multi-repository setup, it calls shared workflows that live in other repositories. Each of those is referenced by a version. And here is the part that should make any security engineer uneasy: those version references are usually mutable.

When a workflow asks for `some-action@v4`, `v4` is a tag — and a tag is just a label a maintainer can move. If that maintainer's account is compromised, or the upstream repository is taken over, `v4` can be repointed to entirely different code. That code then executes inside your pipeline — the pipeline that holds credentials to your production accounts. This is not hypothetical. Popular, widely trusted GitHub Actions have been compromised in exactly this way, turning a convenience into a supply-chain attack vector overnight.

The mitigation is to stop trusting labels and start trusting content. Every third-party action and every cross-repository workflow in the pipeline was pinned to a full commit SHA — an immutable reference to an exact snapshot of code that cannot be moved out from under you. If upstream is compromised tomorrow, the pipeline keeps running the exact code that was reviewed and approved. The 2 a.m. scenario, where a dependency silently updates and breaks — or backdoors — production, simply cannot happen.

## The second face

Immutability buys safety and stability. It also takes something away, and this is where a checklist ends and an engineering decision begins.

A pinned dependency never updates. Not for security patches, not for bug fixes, not for compatibility. Every update becomes a manual, deliberate act. Left alone, pins rot: they drift out of date, they accumulate unpatched vulnerabilities, and — because nothing ever forces the issue — that staleness is invisible. The same immutability that protects you at 2 a.m. is also what hides the fact that half your pipeline is running on year-old code.

And it changes how failures feel. On this engagement, a change to one of the shared workflows didn't take effect, and the pipeline failed in a way that looked, at first, like a bug in the code. It wasn't. The consuming repository was still pinned to a previous snapshot of that workflow; the fix existed, but the pin pointed at the version from *before* the fix. The discipline that prevents accidental breakage had shifted a new burden onto us: when you change a pinned target, you must remember to advance the pin — and when you troubleshoot a pinned pipeline, the failure may not be in what the code says, but in which version you're pointed at. Security tightened. Vigilance became the tax.

## Paying the tax with automation, not attention

The two obvious resolutions are both wrong. Float the versions again — convenient, insecure, back to square one. Or pin everything and simply absorb the maintenance forever — secure, but a slow accumulation of stale, unpatched dependencies that no human will reliably keep current. Neither holds both of the properties you actually want: immutable at runtime, fresh over time.

The answer was to move the cost off the engineer's attention and onto automation. Dependabot was configured to watch the pinned dependencies and open pull requests that advance each commit SHA as new versions ship — keeping the immutable pin and its human-readable version label in lockstep. A second automation layer handled what Dependabot doesn't: propagating version bumps across repository boundaries when a shared workflow changes, and opening tracking issues so nothing slips.

The result keeps both faces of the control turned the right way. At runtime, every dependency is frozen to reviewed code — the supply chain is locked. Over time, updates surface automatically, as reviewable changes a human approves. The engineer stays in the *decision* loop — should we take this update? — and out of the *toil* loop — did anyone remember to check? Vigilance became a property of the system instead of a property of the person.

## The real lesson

The specific tools matter less than the shape of the thinking. Every meaningful security control is a trade, and the engineering is in the management of the trade, not the elimination of it. Pinning to a commit is the right call — *and* it creates a maintenance problem, *and* that problem has to be engineered away rather than endured. The mature pattern, over and over, is the same: automate the vigilance, and keep the human in the loop for the decisions that carry judgment.

That is the difference between securing a system and making it both secure and operable. Anyone can turn every control to maximum and hand the operational cost to whoever is on call. Building infrastructure that is locked down *and* livable — that holds its security posture without quietly rotting, or waking someone at 2 a.m. — is the actual job.
