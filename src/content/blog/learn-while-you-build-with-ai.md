---
title: "Learn while you build: the compound interest of asking why"
description: "There's a quiet cost to letting an AI agent/tool do your thinking that nobody puts on the invoice: you come
out of the project having *shipped* something and *learned* nothing. The code exists; your
understanding doesn't."
pubDate: 'Aug 10 2026'
---

**Treat every AI output as a prompt to ask "why," and treat every correction you make as a thing
to actually understand.** 

---

There's a quiet cost to letting an AI agent/tool do your thinking that nobody puts on the invoice: you come
out of the project having *shipped* something and *learned* nothing. The code exists; your
understanding doesn't. Do that a few times and you've hollowed out — dependent on a tool you can
no longer supervise.

I went the other way on a recent build, deliberately, and it's the reason the week felt less
like delegating and more like a very intense apprenticeship. The trick is embarrassingly simple:
**treat every AI output as a prompt to ask "why," and treat every correction you make as a thing
to actually understand.** Do that and the same hours that produce the deliverable also compound
your skill. Here's what that looked like in practice.

## When I made the design better

At one point the AI had me locking an admin surface to a hardcoded home IP address. Functional,
but brittle — home IPs rotate. I pushed back with my own approach: *"instead of an IP address,
can I use a domain? I have a domain that points to my home IP."*

That turned into a cleaner design — the allow-list resolves my dynamic-DNS hostname to its
current address at deploy time, so an ISP IP change just needs a re-apply, no manual edits. My
idea was better than the AI's first answer. But the value wasn't just the better design; it was
that working through *why* it was better — how load balancers match static addresses, why the
resolution has to happen at apply time — left me understanding a piece of infrastructure I'll
reuse for years. The AI didn't teach me by lecturing. It taught me by being a sparring partner I
could test an idea against.

## When I challenged the AI and was right

The AI was walking me through user management on the gateway, quietly assuming I'd want to
mirror every chat user into the gateway's own user system. I stopped it: *"I'll have many users
in the front end, but I don't see why I need any user in the gateway — educate me."* And then,
following my own logic: *"the front end already has rate and usage limits per user, so I don't
need to set that at the gateway, right?"*

I was largely right, and pushing on it produced a much sharper mental model than passive
acceptance would have — where identity actually belongs, where budget enforcement belongs, when
the gateway's own user system earns its keep and when it's ceremony. That clarity is *mine* now.
I didn't rent it from the AI; I built it by arguing with the AI.

## When I made it defend the economics

When I was weighing two front ends, the AI leaned toward a recommendation. I came back with a
cost counter-argument: *"without the search add-on, the cost of the second option drops to about
the same as the first — what do you say to that?"* Forcing it to defend its position against my
numbers is what turned a hand-wave into a decision I could stand behind. The AI is a confident
recommender; making it *argue* is how you find out whether the recommendation survives contact
with your constraints.

## When I made it be precise

Even in the writing, I refused to let fuzzy language slide. Reviewing an explanation of the tool
layer, I stopped on a term: *"when you say 'the tool,' what do you mean? I thought the MCP server
is the tool."* The AI had been using "server" and "tool" loosely, and my question forced the
precise distinction — a server is the program; a tool is one named capability it exposes; one
server can offer many. That's not pedantry. In a security context, conflating the two is how you
misjudge a blast radius. Demanding precision *is* the security work.

## The compounding

Notice the pattern. The DDNS design, the user-management model, the cost decision, the MCP
vocabulary — none of those were handed to me. Each came from a moment where I could have nodded
and moved on, and instead spent thirty seconds interrogating the output. Thirty seconds, dozens
of times, across a week. That's the compound interest. I finished the build knowing *more* than
when I started, not less — which is the exact opposite of what happens when you let the agent run
off on its own while you watch.

There's a version of AI-assisted work that deskills you: accept, accept, accept, ship, forget.
And there's a version that upskills you: interrogate, understand, correct, absorb. Same tool.
The difference is entirely in the human's posture. The AI is learning from oceans of data every
day. The least you can do is learn too — because the day your understanding stops growing is the
day you can no longer tell when the tool is wrong. And it *will* be wrong. Your job is to still
be sharp enough to catch it.

---

*I'm a Cloud Security Engineer focused on securing AI agents, MCP servers, and the cloud
infrastructure they depend on. I use AI heavily, and I get sharper doing it — on purpose.*
