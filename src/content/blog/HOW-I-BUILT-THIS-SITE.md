---
title: 'How I Built and Shipped This Site: Astro + GitHub Pages + Route 53'
description: 'The architecture and deployment of agyaponggyamfi.com — Astro, GitHub Pages, and Route 53 — including the decisions and the errors along the way.'
pubDate: 'Jun 28 2026'
---

Creating a runbook is one important thing i do and find need for on every problem I resolve. IT is a knowledge captrue and helps speed up the process to be done by another developer another time. 

With AI tools integration, it also enriches the institutional KB library that becomes handy to agentic AIs when deployed. 

This is the actual end-to-end build log I created for the building of `agyaponggyamfi.com` — the site you're visiting now. It documents decisions, commands, and errors I hit getting a very
simple static personal site live on a custom domain over HTTPS, behind a global CDN, at $0 hosting
cost.

Because my daily work lives within private organization repositories, this platform serves as the public stage for my engineering judgment. I write to dissect architectural trade-offs, document decision-making frameworks, and provide reproducible solutions for complex problems. 

This site itself is a live proof of capability—deliberately architected, version-controlled, and CI/CD-deployed—offering prospective teams a transparent view of the engineering standards I bring to production environments.

By documenting my execution steps, architectural choices, and lessons learned, I am following my own standards of ensuring knowledge capture for every problem solved. 
I also aim to provide it as a learning blueprint for other developers while demonstrating the strategic mindset and engineering rigor I contribute as a technical partner.

---

## The core architectural decision: managed hosting, on purpose

I run self-hosted infrastructure elsewhere — VMs, a private CA, containerized deploys, AWS and Azure Cloud resources. 
I could have self-hosted this site too. I chose not to, and that choice is the most important one in
this whole build.

This site has exactly one job, and for that job, the failure mode is asymmetric. Self-hosting trades a
benefit nobody sees for a tail risk that lands at the worst possible moment.

So the rule I followed: **the property where downtime is catastrophic gets the bulletproof
managed path; the property where downtime is a teaching moment gets the self-hosted path.**
This site is the former. GitHub Pages gives me a global CDN, auto-renewed TLS, and zero
operational drag, for free. That's the correct call regardless of whether I *can* self-host —
and knowing *when not to* self-host is itself an important engineering judgment.

---

## The stack

| Layer | Choice | Why |
|---|---|---|
| Static site generator | Astro (blog template) | Fast, content-first, MIT-licensed, Markdown/MDX posts out of the box |
| Hosting | GitHub Pages | Free, global CDN, managed TLS, zero ops |
| CI/CD | GitHub Actions (`withastro/action` → `deploy-pages`) | Push-to-deploy; build and publish fully automated |
| DNS | AWS Route 53 | Apex A records to Pages + `www` CNAME |
| TLS | Let's Encrypt (auto-provisioned by Pages) | Free, auto-renewed, no cert custody |

**Cost:** ~$15/yr domain + ~$0.50/mo Route 53 hosted zone. Everything else is $0.

---

## 1. Repository: personal account, public, named for the domain

- **Repository:** I created the repo (`agyaponggyamfi-blog`) under my **personal** GitHub account, not an org,
and made it **public.**

- **Personal, not org:** this is a personal-brand site. I want *me* to be seen as the owner, with the repo in my profile. The organizations put a layer between the public and what I have been doing. 
- **Public:** for a developer, an open commit history is a feature, not a risk. It shows the
  work.
- **Named for the domain:** `agyaponggyamfi-blog` reads as "this repo *is* that site." leaving less room for confusion. 

---

## 2. Cloning the repo

```bash
cd ~/Cloud
git clone https://github.com/jakgyamfi/agyaponggyamfi-blog.git
cd agyaponggyamfi-blog
git remote -v
```


## 3. Scaffolding Astro into the repo root

Scaffold Astro into the **current directory** with a single dot:

```bash
cd ~/Cloud/agyaponggyamfi-blog
npm create astro@latest .
```

My answers:

- **Where to create the project?** → `.` (current directory). Astro warns the directory isn't
  empty because of `.git`; continue — it merges and doesn't touch `.git`.
- **Template?** → **blog** (content collections, post index, RSS — exactly what a project blog
  needs; the "basic" option is a generic demo).
- **TypeScript?** → Strict.
- **Install deps?** → Yes.
- **Init a git repo?** → No (already have one).

Then I verified the layout was flat at the root:

```bash
ls -a
# .git  .github  astro.config.mjs  package.json  src/  public/  node_modules/  tsconfig.json
```

---

## 4. Local smoke test

```bash
npm run dev   # http://localhost:4321, confirm it renders, q + Enter to stop
```

Worth noting: `dev` runs even on older Node, but the **build** is stricter (this bit me later —
see §7). I keep local Node on 22 to match CI.

---

## 5. Pointing Astro at the real domain

The blog template ships `astro.config.mjs` with `site: 'https://example.com'`. I changed exactly that one
line:

```bash
sed -i "s|https://example.com|https://agyaponggyamfi.com|" astro.config.mjs
grep site astro.config.mjs   # -> site: 'https://agyaponggyamfi.com',
```

I deliberately did **not** set a `base` path. `base` is only for `username.github.io/repo`
hosting; because the final home is the apex domain root, adding one would break the live site.

---

## 6. The deploy workflow — self-contained by design
This is a basic workflow to get things published. 
**By the time you are viewing this page, this workflow will be different with built in security** including inclusing the use of @<SHA> for version control and using dependabot to trigger pull-request for version updates. 

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3
        with:
          node-version: 22

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 7. The build error that actually mattered

My first Actions run failed:

```
Node.js v20.20.2 is not supported by Astro!
Please upgrade Node.js to a supported version: ">=22.12.0"
```

The runner defaulted to Node 20; current Astro needs ≥ 22.12. The fix was the `node-version: 22`
line in the workflow above. Push, re-run, green.

---

## 8. Enabling Pages, then pushing

I enabled Pages **before** the first push so that push would trigger a real deploy:

- **Settings → Pages → Source → "GitHub Actions"** (not "Deploy from a branch"). I ignored the
  starter-workflow suggestions — two competing Pages workflows fight over the deploy.
- Left the custom-domain field blank until the first deploy succeeded.

Then:

```bash
git add -A
git commit -m "Scaffold Astro blog, set site URL, add Pages deploy workflow"
git push -u origin main
```

The run went green and the site was live at the temporary
`https://jakgyamfi.github.io/agyaponggyamfi-blog/` URL. (Styling looked slightly off on that
subpath — expected, because `site` points at the apex; it resolved once the domain was attached.)

---

## 9. Attaching the domain and wiring Route 53

In **Settings → Pages → Custom domain** I entered `agyaponggyamfi.com` and saved. GitHub wrote a
`CNAME` file into the repo and started a DNS check (pending until the records existed). I pulled
that file down:

```bash
git pull
```

**Then Route 53** 

**Apex A record** (record name blank, type A):
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**`www` CNAME** (record name `www`, type CNAME):
```
jakgyamfi.github.io
```

---

## 10. HTTPS, then verification

DNS propagated within the hour. Pages showed "DNS check successful" and auto-provisioned a
Let's Encrypt certificate. Once the cert existed I ticked **Enforce HTTPS** 
Final checks:

- `https://agyaponggyamfi.com` — loads with a valid padlock. ✓
- `https://www.agyaponggyamfi.com` — redirects to the apex. ✓

At that point the infrastructure was done: **write → push → build → live**, on my domain, over
HTTPS, on a CDN, for free.

---

## 11. Customizing the Build"

A fresh deploy is a live copy of Astro's demo — "Hello, Astronaut!", a placeholder footer, fake
posts, Astro's own social links. I replaced:

- **The footer name** (`src/components/Footer.astro`)
- **The entire homepage** (`src/pages/index.astro`) — the recruiter's first impression, so the
  highest-leverage edit
- **The header** (`src/components/Header.astro`) — site title and social links, repointed to mine
- **The demo posts** in `src/content/blog/` and their placeholder hero images
- **SEO metadata** in `src/consts.ts` (`SITE_TITLE`, `SITE_DESCRIPTION`)
- **The about page** with a real bio

— and then wrote the first real project write-up, which is the whole point of the site.

---

## The publishing loop now

1. Add a Markdown/MDX file under `src/content/blog/`.
2. `git add -A && git commit -m "New post: ..." && git push`
3. GitHub Actions rebuilds and redeploys in ~1–2 minutes. Live on the domain.

That's the system. Static, version-controlled, automatically deployed, reliable by design — and
built with a clear-eyed choice about where reliability matters more than tinkering.

---

### Errors I hit, in one place

| Symptom | Cause | Fix |
|---|---|---|
| Nested `.git` / repo-in-repo | `git init` before cloning | Delete the stray `.git`; never nest repos |
| `repo/repo/` after scaffold | Gave `npm create astro` a name/subdir | Re-run with `.` as the target |
| Build fails: Node 20 not supported | CI defaulted to Node 20; Astro needs ≥22.12 | Pin `node-version: 22` in the action |
| `EBADENGINE` / `punycode` warnings | Informational | Ignore |
| First push doesn't deploy | Default branch `master`, workflow watches `main` | `git branch -M main` |
| `CNAME ... not permitted at apex` | CNAME at the root domain | A records at apex; CNAME only for `www` |
| Sitemap/RSS URLs wrong | `site:` left as `example.com` | Set it to the real domain |
| "Enforce HTTPS" errors | Cert not provisioned yet | Wait for DNS check + cert, then tick it |
