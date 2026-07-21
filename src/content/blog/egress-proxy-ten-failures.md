
---
title: "Ten Failures on the Way to One Door"
description: "The messy middle of shipping an enforcing egress proxy: a squid host-forgery wall, a boot race, an exec-format crash, silent secret drift. The failures taught more than the design did."
---

**Subtitle:** Between "the design is right" and "the control is live" were ten distinct failures — one of which killed an entire engine.

---

I've written about the destination: an egress proxy that allowlists outbound traffic by TLS
server name, so "only the gateway talks to the model providers" is enforced by the network
instead of promised by a diagram. This piece is about the trip — ten distinct failures between
"the design is right" and "the control is live," including one that killed an entire engine.
I'm writing them down because the failures taught me more than the design did, and because
every control has two faces: the one on the architecture slide, and the one you meet in the
journal logs at 1 a.m.

**The first engine was squid, and the first four failures were ordinary.** A config directive
used before its ACL was declared — squid names the line and refuses to start. A rule evaluated
at a stage of TLS interception where its input (the SNI) doesn't exist yet, found by re-reading
the config rather than by traffic. An init quirk. A helper crash-loop. Each fix minted a
guardrail I kept: a parse gate in the boot script so a bad config dies loudly at boot instead
of producing a half-alive box; plumbing before engine, so a dead engine can't hide missing
firewall rules; a stay-alive check after start, because "started" is not "still running."
Configuration failures are like that — annoying, cheap, and each one convertible into a
permanent defense.

**The fifth failure was different in kind, and recognizing that was the real work.** With
everything fixed, squid finally processed traffic — and returned `409 Conflict` for every
legitimate flow. Not intermittently; systematically. The cause wasn't a bug. Squid's
host-forgery protection re-resolves every intercepted server name and requires the client's
destination IP to appear in squid's own DNS answer — a sane check in a world where a name maps
to a stable set of addresses. AWS and Cloudflare endpoints don't live in that world: they
return a different random subset of a large rotating pool on nearly every query. Client
resolves, gets {A,B,C,D}, connects to A; squid re-resolves a second later, gets {E,F,G,H};
A isn't in the set; forgery verdict; 409. And the check is deliberately not disable-able — the
maintainers consider it a security invariant.

That's the moment worth naming: **configuration failures yield to iteration; architectural
failures yield only to redesign.** The mechanism's world-model — names map to verifiable,
stable addresses — no longer matched the world. No tuning fixes a false premise. The senior
skill isn't fixing four config bugs in a row; it's noticing that the fifth failure is a
different species, and not letting four hard-won fixes sunk-cost you into fighting it.

**The redesign flipped the trust model.** HAProxy in SNI-forward mode reads the ClientHello
server name, matches the allowlist, then *resolves the allowed name itself and connects to its
own answer*. The client's claimed destination is deliberately ignored — there is no routing
claim to verify because no claim is trusted. DNS rotation becomes irrelevant (only one
resolution happens, the proxy's, and it *is* the destination), and a compromised workload can
no longer steer an allowed name toward an arbitrary address. The property squid tried to bolt
on with verification, HAProxy has by construction. When you find yourself verifying something,
it's worth asking whether a different design could make the claim unnecessary instead.

Two more failures hid inside the new engine, both the same lesson wearing different clothes:
rules that evaluate before their inputs exist. Judge nothing until the TLS hello has actually
arrived, or you reject every flow at zero milliseconds; give an async DNS resolution a time
budget in the right scope, or your own found-guard rejects the answer that hasn't come back
yet. Staged evaluation is a state machine, and every rule has to live at a stage where its
facts exist.

**Then the control went live, and the interesting failures moved downstream — because that's
what an enforcing chokepoint does.** A database host booted while the proxy was mid-replacement
and came up as a plausible-looking corpse: registered with the fleet manager, volume mounted,
every check green — and no database, because the provisioning script's first network call had
died against the closed egress and cloud-init never retries. Fail-closed controls create boot
*order* requirements; the fix was a wait-gate that probes an allowlisted endpoint before
touching the network, and fails loudly on a budget rather than half-completing silently. The
verification lesson stung more than the bug: the corpse passed every check we ran and failed
the one we skipped. The steady-state check is the workload serving, not the host registering.

The remaining failures were the migration's wake. An ARM host chosen for the Graviton discount
crash-looped an amd64 image with `exec format error` — the ~20% saving was never real for a
workload whose artifacts only exist in x86; host architecture follows image architecture. A
derived secret drifted: a connection URI captured an old username while the fresh database
initialized a new one — and the drift hid in the field nobody compared, because credentials are
whole identities, not passwords. And the bootstrap tooling, updated for none of this, tried to
scale a service that no longer existed — a reminder that operational scripts encode
architectural assumptions and will cheerfully fight the new architecture until someone greps
them.

If there's one meta-lesson, it's about method. Nearly every breakthrough in this saga was the
same unglamorous move: **make the system display the actual artifact instead of reasoning about
what it probably contains.** The 409 log line. The platform-mismatch warning. The cloud-init
tail. The echoed URI. Hypotheses are cheap and the logs are the experiment; the discipline is
going to the artifact *first*, before the theory hardens.

The outcome ledger reads well — egress enforced by name instead of merely logged, the
exfiltration wildcard closed, denials that diagnose themselves, at a sixth of the old NAT's
price. But the honest ledger includes the other column: ten failures, one abandoned engine, and
a set of guardrails that exist because each one bit me. The first implementation of a control
is a hypothesis. Budget for the experiment.
