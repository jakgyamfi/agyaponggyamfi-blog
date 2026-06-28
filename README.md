# agyaponggyamfi.com

The source for my personal site and blog — **Pick my thoughts: the hows and the whys.**

I'm a Cloud Engineer and Cybersecurity professional with extensive experience supporting
mission-critical applications and infrastructure. I'm building toward senior-level roles in
cloud security, DevSecOps, cloud infrastructure, MCP server security, and AI/agent integration
security. This site documents the thinking behind the technical work I do.

🔗 **Live site:** [agyaponggyamfi.com](https://agyaponggyamfi.com)

---

## What this site is

A place where I share practical lessons from real work across cloud infrastructure, security,
automation, and emerging AI systems. The posts explore the reasoning behind technical decisions:
why certain risks matter, how problems get identified, and what goes into hardening, mitigating,
monitoring, and logging modern environments.

For confidentiality and security reasons, I don't publish sensitive implementation details.
Instead, I focus on the **transferable process** — the reasoning, the architecture choices, the
lessons learned, and the security practices that help protect cloud infrastructure, CI/CD
pipelines, MCP servers, and AI agents.

The goal is to document how I think, how I solve problems, and how I keep growing as a cloud and
security professional.

---

## How this site was built

This site is itself a piece of engineering work, and I've documented the full build — including
the architectural decisions and the errors I worked through along the way:

📄 **[How I Built This Site](./HOW-I-BUILT-THIS-SITE.md)**

The short version: it's a static site that's deliberately built for reliability rather than for
showing off infrastructure. I chose managed hosting over self-hosting on purpose. The write-up explains
that reasoning in full.

---

## Stack

| Layer | Choice |
|---|---|
| Site generator | [Astro](https://astro.build) (static, content-first) |
| Hosting | GitHub Pages (global CDN, managed TLS) |
| CI/CD | GitHub Actions — push to `main` builds and deploys automatically |
| DNS | AWS Route 53 |
| TLS | Let's Encrypt (auto-provisioned and renewed) |

---

## Repository layout

```
.
├── .github/workflows/   # GitHub Actions deploy pipeline
├── public/              # static assets served as-is (favicon, etc.)
├── src/
│   ├── assets/          # images processed and optimized by Astro
│   ├── components/      # layout pieces (Header, Footer, ...)
│   ├── content/blog/    # the blog posts (Markdown / MDX)
│   ├── layouts/         # page and post layouts
│   └── pages/           # routes (home, about, blog index)
├── astro.config.mjs     # Astro config (site URL, integrations)
└── HOW-I-BUILT-THIS-SITE.md
```

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:4321
```

| Command | Action |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:4321` |
| `npm run build` | Build the production site to `./dist/` |
| `npm run preview` | Preview the production build locally |

> Requires Node.js ≥ 22.12 (Astro's minimum).

---

## Publishing a post

1. Add a Markdown/MDX file under `src/content/blog/`.
2. Commit and push to `main`.
3. GitHub Actions rebuilds and redeploys automatically — live on the site in a minute or two.

---

## Contact

The site links out to my professional profiles. For anything else, reach me through
[agyaponggyamfi.com](https://agyaponggyamfi.com).
