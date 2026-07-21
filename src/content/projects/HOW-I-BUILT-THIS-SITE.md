---
title: 'How I Shipped a Reliable Public Engineering Site with Astro, GitHub Pages, and Route 53'
description: 'The delivery architecture behind agyaponggyamfi.com: a low-operations, source-controlled publishing platform for public engineering work.'
pubDate: 'Mar 28 2026'
---

My personal site has a deliberately narrow job: make my engineering work accessible, credible, and dependable without turning a public portfolio into another production system to operate.

That sounds simple. It is also an architectural decision.

Much of my day-to-day work belongs in private repositories and client environments. This site is where I can publish the transferable thinking: security trade-offs, delivery patterns, cloud architecture, AI-agent controls, and the lessons that generalize without exposing a client. It is not a substitute for the work itself. It is the public engineering surface that makes the work inspectable.

The result is `agyaponggyamfi.com`: a source-controlled static site built with Astro, deployed through GitHub Actions to GitHub Pages, with Route 53 managing the custom domain.

The implementation is intentionally small. The reasoning behind it is not.

## The primary decision: managed delivery over self-hosting

I could host this site on infrastructure I operate myself. I work with cloud resources, containers, networking, identity, and deployment pipelines every day.

That is exactly why I chose not to.

A public professional site has asymmetric risk. It is most valuable when someone is evaluating my work, sharing a project, or deciding whether to contact me. A self-hosted deployment would add patching, certificate operations, monitoring, public attack surface, recovery work, and availability concerns—without creating meaningful value for the reader.

The right engineering question was not, *“Can I self-host this?”* It was, *“What level of operational ownership does this workload actually deserve?”*

For this workload, the answer is a managed static delivery path:

- GitHub Pages provides the hosting and managed HTTPS endpoint.
- GitHub Actions provides repeatable builds and deployments.
- Route 53 provides authoritative DNS for the custom domain.
- Astro turns content and components into static assets with a minimal runtime surface.

That choice is not a shortcut. It is risk alignment.

The site does not need a server, a database, a container scheduler, or a custom certificate lifecycle. Adding them would increase the chance of failure while making the experience no better for the person reading a case study or reviewing my work.

## The architecture

| Layer | Decision | Why it fits the workload |
|---|---|---|
| Site framework | Astro | Content-first static site generation with Markdown/MDX support and a small runtime footprint |
| Source control | Public GitHub repository | Reviewable history, reproducible changes, and a visible record of how the site evolves |
| Build and deployment | GitHub Actions | Every release follows the same build-and-publish path |
| Hosting | GitHub Pages | Managed static hosting and HTTPS without operating web infrastructure |
| DNS | AWS Route 53 | Authoritative DNS for the apex domain and `www` routing |
| TLS | Managed by GitHub Pages | No certificate private-key custody or renewal process for a static public site |

The architecture is intentionally boring in the best sense: each component has a clear responsibility, and none exists merely to demonstrate that I know how to operate it.

```text
Markdown / Astro source
        ↓
Git commit and push
        ↓
GitHub Actions build
        ↓
GitHub Pages deployment
        ↓
agyaponggyamfi.com via Route 53 and HTTPS

## The delivery standard matters as much as the site
A website deployment is still a delivery pipeline. It should be treated accordingly.
The repository is public because the site is part of my professional body of work. The commit history, build configuration, content structure, and publishing workflow should be understandable to someone reviewing how I work. Public does not mean careless: credentials, customer data, environment values, and deployment secrets do not belong in the repository.
The delivery path is deliberately repeatable:
Write or revise content in the repository.
Commit the change with a meaningful message.
Push to the protected publishing branch.
Let the workflow build the site and publish the deployment.
Verify the resulting page, canonical URL, and HTTPS behavior.
That gives the site the same properties I expect from any well-run delivery system: changes are traceable, deployment is reproducible, and the published result comes from source rather than a manual file upload.
The workflow itself deserves the same discipline as application code: scoped permissions, pinned dependencies, protected deployment environments, and dependency updates delivered through reviewable pull requests. A public publishing site is low risk compared with client infrastructure, but low risk is not no risk.

## Why Route 53 remains part of the design
GitHub Pages hosts the content. Route 53 owns the public identity.
That separation is useful. The domain remains under my control, while the hosting layer can remain deliberately managed and low-operations. The apex domain uses the GitHub Pages IP records, and www routes through the expected CNAME. GitHub Pages then verifies the domain relationship and manages the certificate.
There are a few details worth getting right because they are easy to overlook:
The canonical site URL belongs in Astro configuration so generated links, RSS, and sitemap entries are correct.
The apex domain and www need different DNS treatment; a CNAME cannot be used at the zone apex.
Pages should have one intentional deployment workflow, not multiple competing deployment paths.
HTTPS enforcement should be verified only after DNS validation and certificate provisioning complete.
A successful build is not enough; the custom domain, redirect behavior, and certificate must be checked from the public edge.
Those are small implementation details. They are also the difference between “the site deployed” and “the publishing platform is complete.”

## The errors were useful because they exposed assumptions
The build surfaced a few ordinary but important delivery lessons.
A local development server can work while CI fails because the build environment has a different runtime version. In my case, Astro’s supported Node version mattered at build time, not merely at development time. The fix was not to make the workflow more permissive; it was to align the toolchain deliberately.
The domain configuration also reinforced a familiar principle: public routing is part of the system design, not an afterthought. Leaving the canonical site value as a placeholder produces incorrect generated URLs. Treating an apex record like a subdomain produces invalid DNS. Enabling multiple deployment mechanisms creates ambiguity about which workflow owns the release.
None of these are dramatic failures. That is precisely why they are worth documenting. Most operational friction comes from assumptions that sound too small to write down until they fail in the only environment that matters.


## A runbook captures the mechanics; the article captures the judgment
For every problem I solve, I create some form of implementation record. The runbook preserves exact commands, paths, verification steps, and recovery notes. That is what lets another engineer—or future me—repeat the work safely.
This article serves a different purpose.
It records the decision framework:
Use managed services when they reduce risk without reducing value.
Keep the public surface small and the delivery path reproducible.
Treat DNS, TLS, source control, and deployment automation as one system.
Put the operational detail in a runbook, but preserve the reason a choice was made.
That distinction matters more as AI-assisted engineering becomes normal. A knowledge base with clear decisions, constraints, and verification steps helps humans work consistently today and gives future automation a more reliable context than a collection of disconnected commands.
Why this small project belongs in my portfolio
Building and shipping a personal site is not comparable to securing a multi-account cloud platform. It should not be presented that way.
What it does demonstrate is the same engineering posture I apply to larger work:
choose the right amount of infrastructure for the risk;
avoid complexity that does not create value;
make delivery repeatable;
document the decision and the verification path;
keep public systems reliable without making them operationally expensive.
This site is the front door to my work on cloud security, AI agents, MCP servers, Terraform, identity, egress control, and secure delivery. It should be dependable, easy to evolve, and intentionally low-maintenance so my operational attention stays where it creates the most value.
That is the architecture: not more infrastructure, but the right infrastructure.
View the source: github.com/jakgyamfi/agyaponggyamfi-blog