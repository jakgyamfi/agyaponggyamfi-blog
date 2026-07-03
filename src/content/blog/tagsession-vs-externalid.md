---
title: "The tagsession-vs-externalid gotcha - The Authorization Failure That Every Policy Said Was Impossible"
description: "A deep dive into a subtle IAM trust-policy bug, and the debugging discipline that found it."
pubDate: 'June 05 2026'
featured: true
---

**Subtitle:** A deep dive into a subtle IAM trust-policy bug, and the debugging discipline that found it.

---

Some bugs are valuable precisely because they're hard. This one took a structured
elimination process to root-cause, and it taught a lesson about IAM that isn't in
most documentation. I'm writing it up because the debugging method matters as much
as the answer.

### The setup

While hardening a client's multi-account deployment pipeline, I built a
cross-account role-chaining flow: a CI identity in a central account assumes a
Terraform execution role in each workload account. Standard, secure pattern.

To make every deployment auditable, the tooling attaches **session tags** —
metadata like the actor, commit SHA, and run ID — to each assumed session. Those
tags flow into CloudTrail, giving per-deployment attribution.

The session-tagging step failed. Every time.

```
User: arn:aws:sts::<acct>:assumed-role/CIRole/... is not authorized to
perform: sts:TagSession on resource: arn:aws:iam::<acct>:role/ExecutionRole
```

### Why it was hard

The error named `sts:TagSession` as the denied action. So the obvious fix: ensure
the trust policy allows `sts:TagSession`. I did. **It still failed.**

From there, every layer I inspected said the action should be allowed:

- The target role's **trust policy** explicitly listed `sts:TagSession`. ✓
- The calling identity had **broad permissions** covering it. ✓
- The **Service Control Policies** on the account didn't touch STS. ✓
- The **Resource Control Policies** were allow-all. ✓
- The principal in the error matched the trust policy's principal. ✓

Every documented authorization layer permitted the action. Yet it was denied.
When every policy says "allowed" and the result is "denied," you're not looking
at a permission problem — you're looking at something more subtle.

### The discipline that found it

Two observations broke it open:

**1. The error message *format*.** AWS produces different denial messages for
different causes. An explicit deny from an org policy says so:
`"...with an explicit deny in a resource control policy."` This message was the
*plain* "not authorized" form — which means not an explicit deny, but a **failure
to satisfy an Allow.** Something was making the Allow not apply.

**2. CloudTrail's `recipientAccountId`.** This told me *which account* evaluated
the denial, which told me which policies were actually in the decision path. It
pointed at the caller's side, not an org guardrail — narrowing the search
dramatically.

With every deny-source eliminated and the evidence pointing at an unsatisfied
condition, attention fell on the only condition in the trust policy: an
`sts:ExternalId` check.

### The root cause

The trust policy bundled two actions under one condition:

```json
{
  "Action": ["sts:AssumeRole", "sts:TagSession"],
  "Condition": { "StringEquals": { "sts:ExternalId": "..." } }
}
```

Here's the trap: **`sts:ExternalId` is a parameter of `AssumeRole` only.** The
`TagSession` portion of the request carries no ExternalId. And in IAM, a
`StringEquals` condition on a key that's *absent* from the request evaluates to
**false** — not "skipped," false.

So for the `TagSession` action, the condition failed, the statement didn't
authorize it, and with no other Allow present, the entire tagged assume was
denied. The policy *looked* correct — it listed `TagSession` as allowed — but a
shared condition silently denied the action that couldn't satisfy it.

### The fix

Split the statement. AssumeRole keeps the ExternalId condition (it's a real
security gate). TagSession gets its own statement with no condition:

```json
[
  {
    "Action": "sts:AssumeRole",
    "Condition": { "StringEquals": { "sts:ExternalId": "..." } }
  },
  {
    "Action": "sts:TagSession"
  }
]
```

Deployed, retried, passed — with full session-tag attribution flowing into
CloudTrail.

### The transferable lessons

- **A denied action named in an error isn't necessarily a missing permission.**
  It can be an allowed action that can't satisfy a shared condition.
- **IAM conditions apply per-statement, not per-action.** Bundle actions that
  take different request parameters and you create silent denials. Separate them.
- **Read the *format* of AWS denial messages, not just the text.** "Not
  authorized" vs "explicit deny in a [type] policy" are different root causes.
- **`recipientAccountId` in CloudTrail tells you where a cross-account denial was
  evaluated** — invaluable for narrowing the search.

The fix was three lines. Finding it was a process of disciplined elimination —
which is what security engineering actually is most of the time.

---

---
---