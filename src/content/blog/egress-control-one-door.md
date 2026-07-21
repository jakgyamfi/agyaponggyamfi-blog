
---
title: "One Door to the Models - egress control in an AI platform:"
description: "On a platform full of language models, the real data-loss path is outbound, and it's usually left wide open. How egress became a named, enforced, deny-by-default allowlist — and the security-review confession that got it there."
pubDate: 'Jul 14 2026'
featured: true
---

**Subtitle:** A NAT gateway is not an egress control — it's an egress enabler with a logbook.

---

We spend enormous effort on what gets *in* to our systems — WAFs, security groups, authentication,
rate limits at the edge. We spend far less on what gets *out*, and on an AI platform that's
backwards. The interesting data-loss path in a system full of language models isn't inbound; it's
a workload with a prompt full of sensitive context and an open route to the public internet.
Egress is where data leaves. On an AI platform, controlling it is one of the highest-leverage
things you can do, and it's routinely left wide open because "the app needs to call the provider."

The app does need to call the provider. The mistake is letting *every* app do it directly. My
rule is that exactly one service — the gateway — may reach the model providers, and everything
else runs with no route to a provider at all.

Concretely, the network is three tiers. A public tier holds only the load balancer. A private-app
tier holds the workloads. A private-database tier holds the data stores and has **no default
route to the internet whatsoever** — the database cannot be exfiltrated *to* the internet because
it has no path there. That last sentence is the one I'd frame on a wall: the strongest control is
often not a rule that denies a path, but an architecture where the path doesn't exist.

For the private-app tier, the first version of this platform did what almost everyone does: a NAT
gateway. And here is the confession that makes this article worth writing — **a NAT gateway is
not an egress control. It's an egress *enabler* with a logbook.** It forwards whatever the route
table sends it, to any destination, and the flow logs tell you afterwards where your data went.
For a while I told the "one door" story while the door stood open to every address on the
internet, distinguishable from an open wall only by the audit trail. A security review said so,
in fewer words. The review was right.

So the NAT is gone. In its place runs a small hardened instance carrying HAProxy in SNI-forward
mode — a design that deserves spelling out, because each piece closes a specific hole. All
outbound TLS from the private subnets is transparently redirected into the proxy. The proxy
reads the server name from the TLS ClientHello — no decryption, no certificate games, nothing
installed on the clients. If the name isn't on an explicit allowlist, the connection is rejected
and the denial is logged *by name*. If it is allowed, the proxy **resolves the name itself and
connects to its own answer** — the client's claimed destination IP is ignored entirely, so a
compromised workload can't smuggle traffic to an arbitrary address under an allowed name. And
the kernel's forwarding policy is DROP: nothing is NAT'd at all. Traffic doesn't pass through
the door; the door decides whether to re-originate it.

The allowlist itself is where the discipline lives. It is deliberately **explicit** — a handful
of named AWS service endpoints the platform genuinely calls, plus the three model-provider APIs
— rather than a comfortable wildcard. The wildcard was the trap: `.amazonaws.com` looks
reasonable and quietly includes S3, and S3 includes *an attacker's bucket*, whose hostname ends
in `.amazonaws.com` just like yours. Enumerating the real dependencies closed that exfiltration
path outright, and nothing broke, because the only legitimate S3 traffic — container image
layers — rides a free in-VPC gateway endpoint that never touches the proxy. S3 being *absent*
from the egress list is now a security property I can point at.

The objection I braced for was operational: won't every new dependency mean hours of mystery
debugging? It hasn't, because a blocked destination is **self-diagnosing** — the proxy journal
names it (`sni=api.newprovider.com state=PR`), staging surfaces it before prod, and the fix is a
one-line pull request. The allowlist is Terraform, so the egress policy has a git history and a
reviewer. That's the quiet upgrade: egress stopped being a network fact and became a
change-controlled document.

And the part that still makes me smile: enforcement came in at a *sixth* of the price. The NAT
gateway cost roughly $33 a month to forward anything anywhere; the proxy instance costs about $6
to refuse almost everything. There's a lesson in that pairing — managed convenience and security
enforcement are different products, and the market prices them independently.

The trade-off — because there's always one — is that the proxy is a single instance, a
chokepoint the NAT never was. That's engineered, not ignored: it fails **closed** (an egress
outage stops new outbound calls and leaks nothing), systemd restarts the process, EC2
auto-recovery replaces the hardware, patching is automated, and a one-variable lever relocates
it out of a failed availability zone. Concentrating egress to govern it is the same bargain as
concentrating credentials in the gateway — a good bargain only if you then treat the
concentrated thing as critical.

I'll write separately about the ten failures it took to get this proxy live — including an
entire first engine, squid, abandoned at an architectural wall. The short version belongs here:
the first implementation of a control is a hypothesis, and the logs are the experiment.

The reflex I want people to take from this is simple: when you design an AI system, draw the
outbound arrows first — and then ask the harder question: is each arrow *enforced*, or merely
*observed*? A logged-but-open door is visibility. A named, reviewed, deny-by-default allowlist
is control. On an AI platform, you want both, and they are not the same thing.
