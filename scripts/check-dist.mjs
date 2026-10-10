// Post-build checks on dist/. Fails (exit 1) on anything that would weaken the
// security model or ship an obvious defect. Run automatically by `pnpm build`.
//   node scripts/check-dist.mjs             (preview: placeholders only warn)
//   node scripts/check-dist.mjs --production (placeholders and localhost URLs fail)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const production = process.argv.includes('--production');
const errors = [];
const warnings = [];

const BUDGET = {
  homeHtmlGzip: 35 * 1024,
  cssGzip: 20 * 1024,
  initialJsGzip: 15 * 1024,
  /** All JS including the lazily loaded 3D scenes (three.js is most of it). */
  totalJsGzip: 175 * 1024,
  imageBytes: 200 * 1024,
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const rel = (f) => relative(DIST, f).replaceAll('\\', '/');
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const titles = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const name = rel(file);

  // 1. No inline code (the CSP has no 'unsafe-inline', hashes or nonces).
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = m[1];
    const isData = /type=["']application\/ld\+json["']/i.test(attrs);
    if (!/\bsrc=/i.test(attrs) && !isData) errors.push(`${name}: inline <script> found`);
  }
  if (/<style\b/i.test(html)) errors.push(`${name}: inline <style> found`);
  if (/\sstyle\s*=\s*["']/i.test(html)) errors.push(`${name}: style="" attribute found`);
  if (/\son[a-z]+\s*=\s*["']/i.test(html)) errors.push(`${name}: inline event handler (on*=) found`);

  // 2. Release criteria from the "vibe-coded website" checklist.
  if (/href=["']#["']/i.test(html)) errors.push(`${name}: href="#" (dead link) found`);
  if (/href=["']tel:/i.test(html)) errors.push(`${name}: tel: link found (no phone number is published)`);
  if (/(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/.test(html.replace(/<[^>]+>/g, ' '))) {
    errors.push(`${name}: looks like a phone number in the page text`);
  }
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1];
  if (!title) errors.push(`${name}: missing <title>`);
  else if (titles.has(title)) errors.push(`${name}: duplicate <title> "${title}" (also ${titles.get(title)})`);
  else titles.set(title, name);
  if (!/<meta name="description" content="[^"]{50,}"/i.test(html)) errors.push(`${name}: missing or short meta description`);
  if (!/<html lang="[a-z-]+"/i.test(html)) errors.push(`${name}: missing <html lang>`);

  // 3. Placeholder text.
  const visible = html.replace(/<[^>]+>/g, ' ');
  const placeholder = visible.match(/lorem ipsum|\[your |\bTODO\b|\bTBD\b|example\.com|\(placeholder\)/i);
  if (placeholder) (production ? errors : warnings).push(`${name}: placeholder text "${placeholder[0]}"`);

  if (production && /class="(?:draft-badge|dev-note)/.test(html)) {
    errors.push(`${name}: draft badge or development note in a production build`);
  }
  // ALLOW_LOCALHOST_SITE=1: a local-only production build (e.g. the Docker image run on localhost).
  if (production && process.env.ALLOW_LOCALHOST_SITE !== '1' && /http:\/\/localhost/.test(html)) {
    errors.push(`${name}: localhost URL in production build (set SITE_URL)`);
  }
}

// 4. Images.
for (const f of files.filter((x) => ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'].includes(extname(x)))) {
  const size = statSync(f).size;
  if (size > BUDGET.imageBytes) errors.push(`${rel(f)}: image is ${kb(size)} (budget ${kb(BUDGET.imageBytes)})`);
}

// 5. Budgets for the homepage.
const home = readFileSync(join(DIST, 'index.html'));
const homeGz = gz(home);
if (homeGz > BUDGET.homeHtmlGzip) errors.push(`index.html is ${kb(homeGz)} gzip (budget ${kb(BUDGET.homeHtmlGzip)})`);

const cssGz = files.filter((f) => f.endsWith('.css')).reduce((n, f) => n + gz(readFileSync(f)), 0);
if (cssGz > BUDGET.cssGzip) errors.push(`CSS is ${kb(cssGz)} gzip (budget ${kb(BUDGET.cssGzip)})`);

// Initial JS = scripts referenced directly by the homepage (lazy chunks excluded).
const homeScripts = [...home.toString().matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => join(DIST, m[1]));
const jsGz = homeScripts.reduce((n, f) => n + gz(readFileSync(f)), 0);
if (jsGz > BUDGET.initialJsGzip) errors.push(`Initial JS is ${kb(jsGz)} gzip (budget ${kb(BUDGET.initialJsGzip)})`);

// All JS, lazy chunks included. Also refuse code that the CSP would block
// anyway (no 'unsafe-eval'), so it fails here instead of in a visitor's browser.
const jsFiles = files.filter((f) => f.endsWith('.js'));
const totalJsGz = jsFiles.reduce((n, f) => n + gz(readFileSync(f)), 0);
if (totalJsGz > BUDGET.totalJsGzip) errors.push(`All JS is ${kb(totalJsGz)} gzip (budget ${kb(BUDGET.totalJsGzip)})`);
for (const f of jsFiles) {
  const src = readFileSync(f, 'utf8');
  if (/(?<![\w.$])eval\s*\(|new\s+Function\s*\(/.test(src)) errors.push(`${rel(f)}: uses eval or new Function (blocked by the CSP)`);
}

// 6. security.txt must not be close to expiry.
const sec = readFileSync(join(DIST, '.well-known/security.txt'), 'utf8');
const expires = sec.match(/^Expires: (.+)$/m)?.[1];
if (!expires) errors.push('security.txt has no Expires field');
else if (new Date(expires).getTime() - Date.now() < 30 * 864e5) errors.push(`security.txt expires soon (${expires})`);
if (!/^Contact: /m.test(sec)) errors.push('security.txt has no Contact field');

// 7. Security headers file present.
if (!files.some((f) => rel(f) === '_headers')) errors.push('dist/_headers missing');

console.log(
  `check-dist: ${htmlFiles.length} pages | home ${kb(homeGz)} gz | CSS ${kb(cssGz)} gz | initial JS ${kb(jsGz)} gz | all JS ${kb(totalJsGz)} gz${production ? ' | production' : ''}`,
);
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);
if (errors.length > 0) {
  console.error(`check-dist: ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`check-dist: OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}`);
