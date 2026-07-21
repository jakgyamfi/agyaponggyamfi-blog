
---
title: "A Chatbot Answers. An Agent Acts. -  Securing the Agentic Surface"
description: "Agents orchestrate sub-agents, call tools, and run code on a user's behalf — their capability is their risk. How to contain an agentic frontend before it can reach beyond its lane."
---

**Subtitle:** The moment a surface can take actions in your environment, it stops being a content problem and becomes a blast-radius problem.

---

A chatbot answers. An agent *acts*. That one-word difference is the entire security story, and
it's why I refuse to treat an agentic frontend as "just another chat app with extra features."
An agent orchestrates sub-agents, calls tools, executes code, and reaches into systems on a
user's behalf. Its capability is its risk. The moment a surface can take actions in your
environment, it stops being a content problem and becomes a blast-radius problem — and blast
radius is something you contain with architecture, not with a better prompt.

So when I added an agentic frontend alongside a plain chat frontend on the same platform, I did
not give them the same treatment. They share a gateway and a load balancer, but almost nothing
else, and the differences are all deliberate.

**The agentic surface gets its own identity and its own budget.** It authenticates to the
gateway with its own scoped virtual key — separate from the chat frontend's — with its own,
tighter budget and its own model allowlist. This matters more for agents than for chat because
agents are *token-hungry* in a way chat isn't: a single agent task fans out into many model
calls through tool loops and sub-agent delegation. That's exactly the workload most likely to
run away, so it's exactly the workload whose budget you want as a hard ceiling. A runaway agent
should exhaust *its* budget and stop — not the account's, and not the chat frontend's. The
budget on that key is the circuit breaker, and I set it deliberately tight.

**It gets its own datastore and its own secrets.** The agentic frontend runs against its own
database, with its own credentials, so a compromise of it doesn't touch the chat frontend's data
or anyone else's. Separate identities, separate state — the same least-privilege discipline
applied at the service level, because the more powerful surface deserves the tighter boundary.

**It gets a narrower front door.** The public chat frontend is internet-facing, gated by a
register-then-approve flow. The agentic frontend is not open to the world at all — it's locked to
a known source-IP range, so only trusted networks can even reach the login page, and each user is
expected to enable multi-factor auth on top. This is the deliberate inversion people miss: you
put your *least*-powerful surface (plain chat) on the internet, and keep your *most*-powerful one
(the agent that can act) behind a tight network boundary. Exposing the powerful thing broadly
because it's the exciting thing is exactly the wrong instinct.

The design principle underneath all of this is worth stating on its own, because it generalizes
past AI: **separate surfaces by capability, not by convenience.** It would have been easier to run
one frontend, flip on the agentic features, and let everyone in. It would also have merged two
very different risk profiles into one identity and one blast radius, so that a problem in the
action-taking half would sit in the same trust boundary as the harmless chat half. Splitting them
costs a little more infrastructure and buys a clean containment line. That's a trade I take every
time.

None of this makes the agent *safe* on its own, and I want to be honest about the limits. Network
locks, scoped keys, and budgets contain the damage an agent can do; they don't stop it from being
manipulated into doing something wrong within its granted powers. The prompt-injection and
tool-abuse problem — an agent talked into misusing a tool it's legitimately allowed to call — is a
separate discipline that lives at the tool boundary, not the network boundary. The architecture
here is the *containment* layer: it decides how bad a bad day can get. Keeping the agent's granted
powers small and its budget capped is what makes the containment meaningful, because the less an
agent is allowed to do, the less a successful manipulation achieves.

The way I'd summarize the whole posture: give the agentic surface its own identity, its own
budget, its own data, and its own tighter door, and keep the powers you grant it deliberately
small. You're not trying to make an autonomous, tool-wielding system risk-free — that's not on
offer. You're deciding, in advance and on purpose, exactly how much it can touch and exactly how
much a compromise of it can cost. On an agentic platform, that decision is the security work.
Everything else is prompts.
