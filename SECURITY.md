# Security

## Reporting a problem

Email the address published at `/.well-known/security.txt` on the live site (RFC 9116). Please include the page, what you saw, and how to reproduce it. I will acknowledge reports as soon as I can.

## How this site is protected

- **Static site, no inline code.** Every page is built ahead of time. A build check (`scripts/check-dist.mjs`) fails if any inline `<script>`, `<style>`, `style=""` attribute or `on*=` handler appears.
- **Strict Content Security Policy** (`public/_headers`):
  - `default-src 'none'`, with scripts, styles, fonts and images allowed only from this site;
  - no `unsafe-inline` or `unsafe-eval`;
  - framing blocked;
  - Trusted Types enforced.
- **Other headers:** HSTS, `nosniff`, Referrer-Policy, a restrictive Permissions-Policy, COOP, CORP and `X-Frame-Options`.
- **Privacy:**
  - no cookies, analytics or third-party scripts;
  - no phone number or street address published.
- **Supply chain** (`pnpm-workspace.yaml`):
  - new package versions wait 7 days;
  - install scripts are blocked unless allow-listed;
  - trust downgrades fail the install;
  - every exception is pinned to one version and explained.
- **Verification:** `pnpm test:e2e` loads every page under the production headers. It fails on any console error, CSP or Trusted Types violation, or accessibility (axe) violation.
