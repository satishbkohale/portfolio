import { defineConfig } from 'astro/config';

/**
 * Writes the URLs of the lazily loaded 3D chunks into the page scripts, which
 * prefetch them (download and compile, no execution): the engine when the
 * browser is idle ('__THREE_CHUNKS__' in src/scripts/home.ts), and a role's
 * scene on switcher hover ('__ROLE_CHUNKS__' in src/scripts/roles.ts).
 */
interface Chunk {
  type: 'chunk';
  fileName: string;
  facadeModuleId: string | null;
  imports: string[];
  code: string;
}

function threePrefetch() {
  return {
    name: 'three-prefetch',
    apply: 'build' as const,
    generateBundle(_options: unknown, bundle: Record<string, Chunk | { type: 'asset' }>) {
      const chunks = Object.values(bundle).filter((c): c is Chunk => c.type === 'chunk');
      const byModule = (name: string) => chunks.find((c) => c.facadeModuleId?.replaceAll('\\', '/').endsWith(`/src/three/${name}.ts`));
      const main = byModule('main');
      if (!main) return;
      const pages = chunks.filter((c) => c.code.includes('__THREE_CHUNKS__') || c.code.includes('__ROLE_CHUNKS__'));
      const already = new Set(pages.map((c) => c.fileName));
      const engine = [main.fileName, ...main.imports.filter((f) => !already.has(f))];
      const url = (f: string) => `/${f}`;
      // Per scene: its own chunk plus any imports the engine does not already cover.
      const roles = ['hero', 'soc', 'iam', 'grc'].flatMap((name) => {
        const chunk = byModule(name);
        if (!chunk) return [];
        const files = [chunk.fileName, ...chunk.imports.filter((f) => !already.has(f) && !engine.includes(f))];
        return [`${name}=${files.map(url).join(',')}`];
      });
      const engineList = engine.map(url).join(',');
      const roleMap = [`engine=${engineList}`, ...roles].join(';');
      for (const c of pages) c.code = c.code.replaceAll('__THREE_CHUNKS__', engineList).replaceAll('__ROLE_CHUNKS__', roleMap);
    },
  };
}

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
// Set SITE_URL for production builds (for example your domain). On Vercel it
// falls back to the project's production domain, which Vercel provides.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const SITE_URL = process.env.SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:4321');

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
    plugins: [threePrefetch()],
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
