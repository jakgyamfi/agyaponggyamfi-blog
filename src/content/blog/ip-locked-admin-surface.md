
---
title: "Reaching a Private Admin UI Without Opening a Door"
description: "Your gateway's admin console is correctly private, but a human still needs to reach it. An IP-locked, DDNS-tracked route that stays shut to everyone else — no public endpoint, no bastion dance."
---

**Subtitle:**The two lazy answers — public with a password, or a bastion every time — are both wrong. 

---

Every platform reaches the moment where you need to reach a management interface that lives on a
private service. On an AI platform it's the gateway's admin UI — the place you configure models,
mint keys, and set budgets. The service itself is correctly private, with no public endpoint. But
now a human needs to get to its admin console, and the lazy answers are both bad: expose it to the
internet with a password, or thread a bastion and a port-forward every time you need to change a
setting. One is insecure; the other is so annoying you'll eventually cut a corner. Here's the path
I took instead, and the two mistakes I deliberately avoided.

The approach: build the full public edge for the admin hostname — real TLS, a real load-balancer
route — and then **gate it at the load balancer by source IP**, so only my home network can
actually reach it. Everyone else, hitting the same URL, falls through to a default 404 and never
learns there's anything there. The admin surface is, in effect, invisible and unreachable to the
entire internet except the addresses I allow, while remaining a normal HTTPS URL for me.

The reason to do it at the load balancer rather than the application is that it fails *closed at
the edge*. An IP that isn't allowed never reaches the app, never hits the login, never gets a
chance to probe. The application's own auth is still there as a second layer, but the first layer
turns unauthorized traffic away before it touches anything that runs code. Defense in depth means
the outer layer should be dumb, fast, and closed by default; a source-IP match at the load
balancer is exactly that.

**The first mistake I avoided: hardcoding my IP.** Home IP addresses rotate when the ISP feels
like it, and a hardcoded address means locking yourself out on the provider's schedule. So instead
of an address, the allow-list is derived from a dynamic-DNS hostname that always points at my
current home IP, resolved *at deploy time*. When my IP changes, the DNS record updates itself, and
the next apply re-resolves to the new address. It isn't instant — the rule updates on apply, not
the moment the IP changes — and I was honest with myself that a load balancer matches static
addresses, not hostnames, so the resolution has to happen in the deploy, not in the request path.
But it removes the manual lookup-and-edit that would otherwise be a recurring annoyance, and the
security is identical: the same single address ends up in the rule either way.

**The second mistake I avoided: reaching for obscurity as a control.** The tempting move is to
hide the admin surface behind an unguessable hostname — call it something nobody would try instead
of `admin`. I didn't, and the reason is worth internalizing because it trips up a lot of people:
**every hostname you put on a TLS certificate is published, publicly and permanently, in
Certificate Transparency logs.** The moment you issue a cert covering your secret admin hostname,
anyone can read it in a public log with a five-second search. The obscure name buys you nothing
against anyone actually looking. It only "works" if you hide it behind a wildcard certificate so
the specific name never appears in the logs — and a wildcard carries its own broader blast radius
and client-compatibility issues that cost more than the obscurity is worth. So I named the
surface plainly, put it in the cert like everything else, and relied on the control that actually
holds: the source-IP lock plus the application's own authentication. Obscurity isn't a security
control; treating it as one just means you've stopped looking for a real one.

The property I like most about this design is that opening it up later is a *policy* change, not a
rebuild. The entire public edge already exists — the cert, the route, the load-balancer rule — and
the only thing standing between "my home network only" and "the whole internet" is the value of
one allow-list. If I ever decide to open the surface, I widen that list to allow everything and
re-apply; nothing structural changes. That's the mark of a control designed well: the secure
default and the open state differ by a single, reversible line, so tightening or loosening is a
decision you make on purpose, cheaply, whenever the requirement changes — not a migration you
avoid because it's painful.

That's the whole pattern: build the real edge, close it at the load balancer by source IP, derive
the IP from DDNS so you don't lock yourself out, and refuse to lean on hostname obscurity because
Certificate Transparency already gave your names away. A private admin surface should be a normal
URL that's simply unreachable to everyone you didn't invite — and reachable, and easy, for you.
