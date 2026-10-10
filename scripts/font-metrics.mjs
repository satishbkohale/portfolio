// One-off helper: computes metric overrides for fallback fonts so the swap from
// the system fallback to the web font causes (almost) no layout shift.
// Usage: node scripts/font-metrics.mjs <path-to-@capsizecss/unpack>
// Output is pasted into src/styles/fonts.css. Re-run only if the fonts change.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const unpackDir = process.argv[2];
const { fromBuffer } = await import(pathToFileURL(join(unpackDir, 'dist/index.mjs')).href);

// Metrics of common local fallbacks (from capsize's metrics database).
const FALLBACKS = {
  Georgia: { ascent: 1878, descent: -449, lineGap: 0, unitsPerEm: 2048, xWidthAvg: 913 },
  Arial: { ascent: 1854, descent: -434, lineGap: 67, unitsPerEm: 2048, xWidthAvg: 904 },
  'Courier New': { ascent: 1705, descent: -615, lineGap: 0, unitsPerEm: 2048, xWidthAvg: 1229 },
};

const FONTS = [
  ['Geist', 'node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'Arial'],
  ['Geist Mono', 'node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', 'Courier New'],
];

const pct = (v) => `${(v * 100).toFixed(2)}%`;
for (const [name, file, fallbackName] of FONTS) {
  const m = await fromBuffer(readFileSync(file));
  const f = FALLBACKS[fallbackName];
  // Same approach as Capsize/fontaine: match average character width, then
  // express the web font's vertical metrics relative to the adjusted em square.
  const sizeAdjust = m.xWidthAvg / m.unitsPerEm / (f.xWidthAvg / f.unitsPerEm);
  const em = m.unitsPerEm * sizeAdjust;
  console.log(`/* ${name} -> ${fallbackName} */`);
  console.log(
    `size-adjust: ${pct(sizeAdjust)}; ascent-override: ${pct(m.ascent / em)}; descent-override: ${pct(Math.abs(m.descent) / em)}; line-gap-override: ${pct(m.lineGap / em)};`,
  );
}
