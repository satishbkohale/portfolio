/**
 * Shared textures for every scene, generated on a 2D canvas (no image files,
 * nothing fetched). Created once and reused, so each scene adds no texture
 * memory of its own.
 *
 * Matcaps bake lighting into a small texture: metal and glass looks without
 * lights, environment maps or heavy shaders, which keeps startup cheap.
 */
import { CanvasTexture, Color, SRGBColorSpace } from 'three';
import { ACCENT, AMBER, EDGE, rimOf } from './palette';

/** CSS colour string for a stop: c mixed toward white (+) or scaled darker (-). */
const shade = (c: Color, k: number) => (k >= 0 ? c.clone().lerp(new Color('#ffffff'), k) : c.clone().multiplyScalar(1 + k)).getStyle();

/**
 * A matcap: a sphere shaded with a light from the upper left plus a thin rim
 * light from the lower right. Stops run from the highlight (0) to the shadow (1).
 */
function matcap(stops: [number, string][], rimColor = rimOf(EDGE)): CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = stops.at(-1)?.[1] ?? '#000';
    ctx.fillRect(0, 0, size, size);
    const g = ctx.createRadialGradient(size * 0.36, size * 0.3, 0, size * 0.42, size * 0.38, size * 0.62);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    const rim = ctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size / 2);
    rim.addColorStop(0, `rgba(${rimColor},0)`);
    rim.addColorStop(1, `rgba(${rimColor},0.55)`);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(size * 0.62, size * 0.66, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

interface Matcaps {
  silver: CanvasTexture;
  graphite: CanvasTexture;
  /** Brand blue, for the encrypted block and the servers. */
  accent: CanvasTexture;
  amber: CanvasTexture;
}

let cache: Matcaps | null = null;

export function matcaps(): Matcaps {
  cache ??= {
    silver: matcap([
      [0, '#ffffff'],
      [0.25, '#dfe6ee'],
      [0.6, '#7d8894'],
      [1, '#151a20'],
    ]),
    graphite: matcap([
      [0, '#46525e'],
      [0.35, '#1c252e'],
      [0.8, '#0a0e13'],
      [1, '#0a0e13'],
    ]),
    accent: matcap([
      [0, shade(ACCENT, 0.15)],
      [0.4, shade(ACCENT, -0.86)],
      [0.85, shade(ACCENT, -0.97)],
      [1, shade(ACCENT, -0.97)],
    ]),
    amber: matcap(
      [
        [0, shade(AMBER, 0.55)],
        [0.35, shade(AMBER, 0)],
        [0.8, shade(AMBER, -0.9)],
        [1, shade(AMBER, -0.98)],
      ],
      rimOf(AMBER),
    ),
  };
  return cache;
}

let glow: CanvasTexture | null = null;

/** Soft round light for additive sprites (white, tinted by the material colour). */
export function glowTexture(): CanvasTexture {
  if (glow) return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  glow = new CanvasTexture(c);
  return glow;
}
