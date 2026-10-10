// Generates the favicon (public/favicon.svg), the Apple touch icon
// (public/apple-touch-icon.png, 180x180) and the social preview image
// (public/og/default.png, 1200x630).
//
// Colours come from src/styles/tokens.css and the text from src/data/site.ts,
// so the images follow the site. Run after changing either:
//   node scripts/generate-images.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

/** Hex colour tokens from tokens.css (the first, unconditional :root block). */
const css = readFileSync('src/styles/tokens.css', 'utf8');
const token = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\b`));
  if (!m) throw new Error(`token --${name} not found in tokens.css`);
  return m[1];
};
const C = {
  bg: token('bg'),
  surface: token('surface'),
  raised: token('surface-raised'),
  text: token('text'),
  text2: token('text-2'),
  text3: token('text-3'),
  accent: token('accent'),
  tint: token('accent-text'),
  onAccent: token('on-accent'),
};

/** Text fields from site.ts (plain string literals). */
const siteSrc = readFileSync('src/data/site.ts', 'utf8');
const field = (key) => {
  const m = siteSrc.match(new RegExp(`\\b${key}:\\s*'([^']*)'`));
  if (!m) throw new Error(`site.${key} not found in site.ts`);
  return m[1];
};
const site = { name: field('name'), heroTitle: field('heroTitle'), location: field('location') };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SANS = "'Segoe UI', Arial, Helvetica, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";

/* Favicon: the site's padlock. Blue body, tinted shackle, dark keyhole. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>${esc(site.name)}</title><rect width="32" height="32" rx="6" fill="${C.bg}"/><path d="M11 15v-4a5 5 0 0 1 10 0v4" fill="none" stroke="${C.tint}" stroke-width="2.6" stroke-linecap="round"/><rect x="7" y="14" width="18" height="13" rx="2.5" fill="${C.accent}"/><circle cx="16" cy="19.5" r="2" fill="${C.bg}"/><rect x="15.1" y="20" width="1.8" height="4" rx="0.9" fill="${C.bg}"/></svg>
`;
writeFileSync('public/favicon.svg', favicon);
await sharp(Buffer.from(favicon), { density: 600 }).resize(180, 180).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');

/* Social preview: name, headline and the lock figure. */
const words = site.heroTitle.split(' ');
const lines = [];
for (const w of words) {
  const last = lines.at(-1);
  if (last && `${last} ${w}`.length <= 22) lines[lines.length - 1] = `${last} ${w}`;
  else lines.push(w);
}
const titleSvg = lines
  .map(
    (l, i) =>
      `<text x="96" y="${266 + i * 66}" fill="${C.text}" font-family="${SANS}" font-size="58" font-weight="600" letter-spacing="-1">${esc(l)}</text>`,
  )
  .join('\n  ');

const roles = ['SOC', 'IAM', 'GRC'];
const pills = roles
  .map((r, i) => {
    const x = 96 + i * 100;
    const on = i === 0;
    return `<rect x="${x}" y="${474}" width="92" height="40" rx="20" fill="${on ? C.accent : C.raised}"/><text x="${x + 46}" y="${500}" text-anchor="middle" fill="${on ? C.onAccent : C.text2}" font-family="${MONO}" font-size="18" letter-spacing="2">${r}</text>`;
  })
  .join('');

// Dial ticks around the lock.
const ticks = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2;
  const r0 = i % 5 === 0 ? 136 : 142;
  const r1 = 148;
  const p = (r) => `${(975 + Math.cos(a) * r).toFixed(1)} ${(318 + Math.sin(a) * r).toFixed(1)}`;
  return `M${p(r0)}L${p(r1)}`;
}).join('');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="975" cy="330" r="250" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${C.accent}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${C.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M28 0H0V28" fill="none" stroke="${C.text}" stroke-opacity="0.045"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="${C.bg}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <text x="96" y="132" fill="${C.tint}" font-family="${MONO}" font-size="20" letter-spacing="4">PORTFOLIO · ${esc(site.location.toUpperCase())}</text>
  <text x="96" y="190" fill="${C.text2}" font-family="${SANS}" font-size="34" font-weight="500">${esc(site.name)}</text>
  ${titleSvg}
  ${pills}

  <path d="${ticks}" stroke="${C.text3}" stroke-opacity="0.6" stroke-width="2"/>
  <circle cx="975" cy="318" r="166" fill="none" stroke="${C.accent}" stroke-opacity="0.55" stroke-width="2"/>
  <path d="M975 152a166 166 0 0 1 166 166" fill="none" stroke="${C.tint}" stroke-width="3" stroke-linecap="round"/>
  <path d="M935 300v-48a40 40 0 0 1 80 0v48" fill="none" stroke="${C.tint}" stroke-width="16" stroke-linecap="round"/>
  <rect x="907" y="292" width="136" height="112" rx="16" fill="${C.surface}" stroke="${C.accent}" stroke-width="4"/>
  <circle cx="975" cy="339" r="12" fill="${C.tint}"/>
  <rect x="969.5" y="345" width="11" height="30" rx="5.5" fill="${C.tint}"/>
</svg>`;

mkdirSync('public/og', { recursive: true });
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og/default.png');

console.log('Wrote public/favicon.svg, public/apple-touch-icon.png and public/og/default.png');
