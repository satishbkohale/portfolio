import { defineConfig } from 'astro/config';

/**
 * Build configuration.
 *
 * The security model depends on one property of the build output: it contains
 * NO inline code (no inline <script>, <style> or style="" attributes). That lets
 * the Content Security Policy in public/_headers be a fixed header with
 * `script-src 'self'; style-src 'self'` and no hashes or nonces.
 * scripts/check-dist.mjs verifies this after every build.
 */

// Absolute site URL, used for canonical links, Open Graph and the sitemap.
// Set SITE_URL for production builds (for example the workers.dev URL or your domain).
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'ignore',
  // Keep whitespace handling lossless (Astro 7 defaults to JSX-style collapsing).
  compressHTML: true,
  devToolbar: { enabled: false },
  build: {
    format: 'directory',
    // Never inline CSS into <style> tags.
    inlineStylesheets: 'never',
  },
  markdown: {
    // Shiki (the default) colours code with inline styles, which the CSP blocks.
    // No highlighting for now; a class-based highlighter can be added later.
    syntaxHighlight: false,
  },
  vite: {
    define: {
      // ?tier=static|3d query override for tests; compiled out of production builds.
      __TIER_OVERRIDE__: JSON.stringify(process.env.SITE_ENV !== 'production'),
    },
    build: {
      // 0 = never inline assets or small scripts as data: URIs / inline code.
      assetsInlineLimit: 0,
    },
    worker: {
      format: 'es',
    },
  },
});
