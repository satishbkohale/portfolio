# Satish Kohale: security portfolio

Personal portfolio for entry-level GRC, IAM and SOC L1 roles. It is a static site built with Astro, with an optional 3D figure in three.js, and it is hosted on Cloudflare.

The site is meant to be evidence in its own right:
- a strict Content Security Policy with no inline code;
- no tracking;
- supply-chain controls;
- automated accessibility and security checks.

Planning documents are in [`docs/`](docs/). Start with [`docs/01-phase-1-plan.md`](docs/01-phase-1-plan.md).

## Quick start

Requirements: Node.js 22.12 or later (24 LTS recommended) and pnpm 12 (`npm i -g pnpm`).

```sh
pnpm install          # install dependencies (supply-chain rules in pnpm-workspace.yaml)
pnpm dev              # local dev server at http://localhost:4321 (no CSP in dev)
pnpm build            # build to dist/ and run the dist checks
pnpm preview          # serve dist/ WITH the production security headers
pnpm test             # unit tests (Vitest)
pnpm test:e2e         # end-to-end tests in your installed Chrome (run `pnpm build` first)
pnpm check            # type check (astro check) + lint and format check (Biome)
```

`pnpm build` includes placeholder ("draft") content so the layout is complete. `pnpm build:prod` removes it. Always deploy with `build:prod`.

## Updating content

Everything a visitor reads lives in a few data files. You don't need to touch the components.

| What | Where |
|---|---|
| Name, role line, value statement, proof facts, email, profile links, resume PDFs | `src/data/site.ts` |
| Role page copy (GRC, IAM, SOC) | `src/data/roles.ts` |
| Projects (one Markdown file each) | `src/content/projects/*.md` |
| Certifications | `src/content/certifications.json` |
| Education and experience | `src/content/education.json`, `src/content/experience.json` |
| Skills matrix (proficiency labels and evidence links) | `src/data/skills.ts` |
| About text and section order | `src/components/HomePage.astro` |

How to edit content:
- **Placeholders:** set `draft: true` on any placeholder entry. Drafts show in `pnpm dev` and `pnpm build`, never in `pnpm build:prod`.
- **Missing facts:** list them in a project's `todo:` field. They appear as a yellow development note on the page, and production builds hide them.
- **Evidence references:** use P1, P2 for projects and C1, C2 for certificates. The build fails if a skill cites evidence that doesn't exist.
- **Never publish** a phone number or street address. The build fails if it finds a phone-number pattern.

### Adding resume PDFs

1. Export a PDF **without your phone number or street address**.
2. Remove the metadata: `exiftool -all= resume.pdf`, then `qpdf --linearize resume.pdf out.pdf`.
3. Put it in `public/resume/`.
4. Set its path in `site.resumePdf` in `src/data/site.ts`. The download buttons appear automatically.

## Project structure

```
public/           _headers (security headers), favicon, manifest, og image
src/
  components/     page sections; figure/ holds the zero-trust figure (SVG)
  content/        projects, certifications, education, experience
  data/           site facts, roles, skills, topology (figure data)
  layouts/        BaseLayout (meta tags, fonts, header and footer)
  lib/            content helpers (drafts, evidence validation)
  pages/          routes, including /[role]/, /projects/[slug]/, sitemap, security.txt
  scene/          3D tier: capability checks and the three.js scene (lazy loaded)
  scripts/        small browser scripts (menu, figure, copy button)
  styles/         design tokens and CSS (all external, no inline styles)
scripts/          check-dist (post-build checks), serve-dist (preview with headers), image generation
tests/            unit (Vitest) and e2e (Playwright + axe)
docs/             phase 1 plan and technical notes
```

## How the 3D figure works

The figure is a simplified version of the zero-trust components in NIST SP 800-207, Fig. 2.
- **Static tier (default):** an SVG built from `src/data/topology.ts`. Everyone gets it, and the page is complete with it alone.
- **3D tier:** on desktops at least 1024 px wide with WebGL2, no reduced-motion preference and enough CPU and memory, three.js is lazy-loaded (130 KB gzip) after the page has loaded and gone idle.
  - A short warm-up runs invisibly first. Slow devices stay on the SVG.
  - A visible "Motion" toggle in the caption switches the 3D off.
  - The choice is saved in the browser only.
- **Tests:** in non-production builds, `?tier=static` or `?tier=3d` forces a tier.

## Deployment (Cloudflare Workers, free plan)

```sh
pnpm exec wrangler login                         # once, opens the browser
SITE_URL=https://<your-url> pnpm release         # production build + checks + deploy
```

- **First deploy:** the URL is shown at the end, for example `https://satish-kohale-portfolio.<account>.workers.dev`. Set `SITE_URL` to it so canonical links, the sitemap and security.txt are correct, then deploy again.
- **On Windows PowerShell:** run `$env:SITE_URL="https://..."; pnpm release`.
- **Custom domain:** add it in the Cloudflare dashboard (Workers, then your worker, then Domains). Set `SITE_URL` to the domain and redeploy.
- **Headers:** `public/_headers` is applied by Cloudflare to every response. After deploying, check the result with the Mozilla HTTP Observatory.

## Docker

The image runs the production build (drafts removed, dist checks enforced). It then serves `dist/` with the same security headers as Cloudflare, using `scripts/serve-dist.mjs` in a small non-root Alpine container.

```sh
docker compose up --build                 # http://localhost:8080
# or
docker build -t satish-kohale-portfolio .
docker run --rm -p 8080:8080 --read-only --cap-drop ALL satish-kohale-portfolio
```

| Setting | Where | Default | Purpose |
|---|---|---|---|
| `SITE_URL` | build arg | `http://localhost:8080` | Public URL for canonical links, the sitemap and security.txt. Set it to the real URL for a hosted image: `docker build --build-arg SITE_URL=https://example.org .` |
| `HTTPS_HEADERS` | env | `0` | Set to `1` when a TLS-terminating proxy is in front of the container. HSTS and `upgrade-insecure-requests` are then sent as well. |
| `PORT` | env | `8080` | Listening port. |

Hardening in the image and the compose file:
- runs as the `node` user, with the files owned by root, so the app can only read them;
- npm, npx, yarn and corepack are removed from the runtime image;
- read-only filesystem, all Linux capabilities dropped, `no-new-privileges`;
- a health check;
- only GET and HEAD are allowed (everything else gets 405).

The image is about 62 MB.

## Windows note

On this machine, Windows Smart App Control blocks Astro's native compiler (`.node` file). `pnpm-workspace.yaml` therefore also installs the WebAssembly build, which Astro uses automatically when the native one is blocked. Nothing else needs changing.
