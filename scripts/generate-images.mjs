// Generates the social preview image (public/og/default.png, 1200x630) and the
// Apple touch icon (public/apple-touch-icon.png, 180x180) from SVG with sharp.
// Run after changing the name or role line: node scripts/generate-images.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const C = {
  bg: '#0d1114',
  surface: '#141a1e',
  hairline: '#2a333a',
  boundary: '#6b7882',
  text: '#e8e4dc',
  text2: '#b4babe',
  text3: '#919aa1',
  grc: '#b5d6ae',
  iam: '#7ba4db',
  soc: '#e6ae5e',
};

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${C.bg}"/>
  <rect x="64" y="64" width="1072" height="502" fill="none" stroke="${C.hairline}"/>
  <text x="112" y="150" fill="${C.text3}" font-family="Consolas, 'Courier New', monospace" font-size="22" letter-spacing="3">PORTFOLIO</text>
  <text x="112" y="250" fill="${C.text}" font-family="Georgia, 'Times New Roman', serif" font-size="88">Satish Kohale</text>
  <text x="112" y="318" fill="${C.text2}" font-family="Arial, Helvetica, sans-serif" font-size="34">Entry-level security analyst: GRC, IAM, SOC</text>
  <g font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${C.text2}">
    <rect x="112" y="400" width="18" height="18" fill="${C.grc}"/><text x="144" y="417">Policy</text>
    <circle cx="281" cy="409" r="9" fill="${C.iam}"/><text x="302" y="417">Identity</text>
    <path d="M448 399 L458 418 L438 418 Z" fill="${C.soc}"/><text x="470" y="417">Activity</text>
  </g>
  <g stroke="${C.hairline}" stroke-width="2" fill="none">
    <path d="M900 197 L940 213 M900 247 L940 223 M900 297 L940 233"/>
  </g>
  <g stroke-width="2">
    <rect x="840" y="180" width="60" height="34" rx="4" fill="${C.bg}" stroke="${C.boundary}"/>
    <rect x="840" y="230" width="60" height="34" rx="4" fill="${C.bg}" stroke="${C.boundary}"/>
    <rect x="840" y="280" width="60" height="34" rx="4" fill="${C.bg}" stroke="${C.boundary}"/>
    <rect x="940" y="190" width="160" height="66" rx="6" fill="${C.surface}" stroke="${C.boundary}"/>
    <rect x="940" y="390" width="160" height="78" rx="6" fill="${C.bg}" stroke="${C.text2}"/>
    <path d="M1020 256 V390" stroke="${C.boundary}" stroke-dasharray="6 8" fill="none"/>
  </g>
  <rect x="863" y="190" width="14" height="14" fill="${C.grc}"/>
  <circle cx="870" cy="247" r="7" fill="${C.iam}"/>
  <path d="M870 288 L878 304 L862 304 Z" fill="${C.soc}"/>
  <g fill="${C.text}" font-family="Arial, Helvetica, sans-serif" font-size="20" text-anchor="middle">
    <text x="1020" y="216">Policy</text><text x="1020" y="240">engine</text>
    <text x="1020" y="423">Enforcement</text><text x="1020" y="447">point</text>
  </g>
  <text x="112" y="520" fill="${C.text3}" font-family="Arial, Helvetica, sans-serif" font-size="22">Pune, India</text>
</svg>`;

mkdirSync('public/og', { recursive: true });
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og/default.png');

const favicon = readFileSync('public/favicon.svg');
await sharp(favicon, { density: 600 }).resize(180, 180).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');

console.log('Wrote public/og/default.png and public/apple-touch-icon.png');
