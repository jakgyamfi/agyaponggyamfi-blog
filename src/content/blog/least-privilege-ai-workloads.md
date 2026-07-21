---
title: "The Shared IAM Role That Only Looks Like Least-Privilege"
description: "Plenty of 'secure' AI deployments give every container one role scoped to 'what the platform needs.' That's least-privilege in a diagram and nothing of the sort in practice. Per-service task roles, and why blast radius sets the boundary"
pubDate: 'Jul 19 2026'
---

**Subtitle:** The moment two AI workloads share an identity, each can read the other's secrets.

---

Least-privilege is easy to say and easy to fake. Plenty of "secure" AI deployments have a single
role that every container shares, scoped to "the secrets the platform needs." That reads as
least-privilege in a diagram and is nothing of the sort in practice: the moment two workloads
share an identity, each one can read the other's secrets, and your blast radius is the union of
everything on the box. On an AI platform — where the secrets in question are provider keys, a
gateway master key, and database credentials — that union is exactly what you cannot afford to
hand to a compromised chat frontend.

So the first design rule I hold is boring and non-negotiable: **every service gets its own
identity, and each identity can read only its own secrets.** On ECS this is concrete. Each
service has *two* roles, and the separation is the whole point.

The **execution role** is used by the orchestrator to *start* the task — pull the image, write
logs, and fetch the task's secrets to inject them. The **task role** is the identity the
*running container* uses for any AWS API calls it makes at runtime. They're separate because the
right to *fetch secrets at startup* is a different thing from whatever the application does once
it's running, and collapsing them hands the app a capability it never needs.

In this platform the gateway and the frontends make no AWS API calls at runtime — they talk to
each other and to their databases, not to AWS — so their **task roles are deliberately empty**.
An empty role is a feature, not an oversight: it's a distinct identity with zero permissions
until a specific feature demands one, at which point you add exactly that one permission. The
execution roles, meanwhile, are scoped to a hard list: this service's secret ARNs, and decrypt
on this one key. Not "the platform's secrets." *This service's.* When I say the chat frontend
cannot read the gateway's master key, I mean its execution role literally lacks the ARN.

This is also why I rejected a tempting cost optimization. Running the containers on a shared EC2
VM instead of Fargate would have shaved a few dollars a month. I turned it down — not on price,
on identity. A bare Docker host means one shared instance role; you cannot give each container
only its own secrets when they all inherit the same host credentials. (Running a full
orchestrator on the VM would restore per-task roles — but then I'm operating hosts *and* an
orchestrator to save the orchestration fee, which is the saving eating itself.) The saving was
real and the regression it required was disqualifying. **That's the shape of a good security decision: it's
made on the axis of the control at stake, not the axis of the invoice.**

The same discipline extends past secrets. The Terraform execution role that builds the platform
is broad on infrastructure but tightly conditioned on IAM writes — tag-gated so it can only
create resources it owns — and carries an explicit **deny** on tampering with the audit and
identity controls: CloudTrail, GuardDuty, Config, Organizations, IAM users and keys. The
reasoning is that automation should be able to build the platform but must never be able to
disable the mechanisms that would catch it misbehaving. Deny-on-audit-tampering is the single
most important statement in the delivery model, and it costs nothing to add.

There's a subtlety worth naming, because it's where IAM least-privilege quietly fails: **the
difference between a tag on the request and a tag on the resource.** A guardrail that gates IAM
*creates* on "the request must carry tag X" is correct — creates carry tags. Apply that same
condition to a *modify* call that carries no tags, and you've written a policy that can never be
satisfied, so the call is always denied, and you spend an afternoon confused. Create-style calls
gate on request tags; modify-style calls gate on the tags already on the target. Getting that
distinction wrong is one of the most common ways a "least-privilege" IAM policy turns out to be
either broken or, worse, quietly permissive.

None of this is exotic. Per-task roles, empty-until-needed task identities, tag-conditioned IAM,
deny-on-audit-tampering — these are ordinary controls. What's easy to get wrong is *conviction*:
holding the line when a shared role would be simpler, or when the diagram already says
"least-privilege" and nobody will check whether the ARNs actually match. On an AI platform the
secrets are valuable enough that the check matters. The test I apply is simple and I recommend
it: **pick any service, read its role, and confirm it cannot name a secret that isn't its own.**
If it can, you don't have least-privilege — you have a diagram.
