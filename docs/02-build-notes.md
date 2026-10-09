# Build notes (v1, 2026-10-10)

Satish asked to go live on 11/10/2026, read as 11 October 2026 (DD/MM). To make that date, the Phase 2 design decisions were folded into the build instead of being approved separately. This file records what was decided, what was verified, and what is left.

## Built

- **Pages:** home, role pages (`/grc/`, `/iam/`, `/soc/`), project index, case studies, resume (HTML, printable), contact, "how this site is secured", custom 404, sitemap, robots.txt, security.txt.
- **Content:** taken from the IAM resume. The phone number is excluded on purpose.
  - Unknown facts are hidden rather than invented: profile links, graduation month, certificate dates and links, project metrics.
  - Each gap is listed in a `todo:` field. Those notes show only in development builds.
- **Placeholder content:** three placeholder projects (IAM lab, GRC, SOC L1), one placeholder certification and one placeholder experience entry, all marked `draft: true`. They appear in `pnpm dev` and `pnpm build`. They are removed from `pnpm build:prod`, which also fails if any placeholder text remains.
- **Fig. 1 and Fig. 2:** the zero-trust figure from NIST SP 800-207, as an SVG for everyone and three.js 3D on capable desktops.
  - The story beats follow the About paragraphs.
  - The legend buttons pin a channel.
  - A Motion toggle switches the 3D off.
  - Pulses stop after 4 seconds, which satisfies WCAG 2.2.2.

## Design decisions made during the build

- **Layout:** the hero has the text on the left and Fig. 1 on the right. Selected work comes before About, as the review recommended. About pins Fig. 2 beside the story on desktop.
- **Figure layouts:** the wide layout uses an 820 × 540 viewBox (labels about 12–13 px at hero size). The tall layout for phones uses 360 × 500.
- **Figure inputs:** input lines join the side of the policy engine, so they never cross the administrator.
- **Channel cues:** each channel has its own glyph shape (square for policy/GRC, circle for identity/IAM, triangle for activity/SOC) as well as its colour, used everywhere: figure, tags, coverage table and legend.
- **3D tier:** about 9 draw calls; labels are HTML over the canvas; the camera moves to keyframes per beat; three.js is lazy-loaded (130 KB gzip).
- **Section headings:** serif clause numbers (1–6) with a rule above each, rather than mono "01 /" labels.

## Verified on 2026-10-10

| Check | Result |
|---|---|
| Lighthouse, homepage, mobile | Performance 97, Accessibility 100, Best Practices 100, SEO 100 (LCP 2.4 s, TBT 30 ms, CLS 0) |
| Lighthouse, homepage, desktop | 100 / 100 / 100 / 100 |
| Playwright + axe (WCAG 2.2 AA), 9 pages × desktop and mobile | 48 tests passed: no console errors, no CSP or Trusted Types violations, no axe violations, no horizontal scroll down to 320 px |
| Dist checks | No inline script, style or event handler. Home 9.5 KB gzip, CSS 6.2 KB, initial JS 3.2 KB. |
| `astro check` + Biome | 0 errors |
| `pnpm audit` | No known vulnerabilities, after two pinned overrides (see `pnpm-workspace.yaml`) |

Lighthouse ran against the local preview server with the production headers. Lighthouse cannot exercise the 3D tier, because it has no GPU (see plan section 7.5).

## Before going live (Satish)

1. Add your LinkedIn, GitHub and HackerRank URLs in `src/data/site.ts`. Links stay hidden until set.
2. Check every skill label in `src/data/skills.ts`. Change "studied" to "practised" only where you have done it hands-on.
3. Optional: add a scrubbed resume PDF with no phone number (see README).
4. Create a free Cloudflare account, then run `pnpm exec wrangler login` and `pnpm release` with `SITE_URL` set (see README, Deployment).
5. Run the Mozilla HTTP Observatory against the live URL and add the grade to `/security/`.

## Next (v1.1)

- Replace the placeholders with the GRC and SOC L1 resume content when it arrives.
- Add real numbers to the two case studies (see their `todo:` lists).
- Contact form: a Worker plus Turnstile, rate limiting and Email Routing. It needs a custom domain.
- GitHub repository with CI: build, checks, e2e, OSV-Scanner, CodeQL, Dependabot cooldown.
- Rewrite `/security/` in your own words.
- Remove the `minimumReleaseAgeExclude` entry after 2026-10-11.
