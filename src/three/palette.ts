/**
 * Scene colours, read once from the CSS tokens (src/styles/tokens.css), so the
 * 3D scenes and the page share one definition.
 *
 *   ACCENT   the brand blue: fills, lines, glows, points
 *   EDGE     the lighter tint of it (--accent-text): thin edges and rings, so
 *            the blue never looks dim on the near-black background
 *   AMBER    the only warning colour (--pending)
 *
 * The *_RGB triples are sRGB 0-1 for the glyph text, which is written straight
 * to the screen: accent text uses the tint, as it does on the page.
 */
import { Color, SRGBColorSpace } from 'three';

export type RGB = readonly [number, number, number];

const css = getComputedStyle(document.documentElement);
/** A token's colour; neutral grey if the stylesheet is somehow missing. */
const token = (name: string) => new Color(css.getPropertyValue(name).trim() || '#808080');
const srgb = (c: Color): RGB => {
  const o = { r: 0, g: 0, b: 0 };
  c.getRGB(o, SRGBColorSpace);
  return [o.r, o.g, o.b];
};

export const ACCENT = token('--accent');
export const EDGE = token('--accent-text');
export const AMBER = token('--pending');

export const ACCENT_RGB = srgb(EDGE);
export const AMBER_RGB = srgb(AMBER);
/** Brightest accent text (newly lit labels): the tint lifted toward white. */
export const BRIGHT_RGB = srgb(EDGE.clone().lerp(new Color('#ffffff'), 0.45));

/** "r,g,b" 0-255 for 2D canvas gradients (the matcap rim lights). */
export const rimOf = (c: Color): string =>
  srgb(c)
    .map((v) => Math.round(v * 255))
    .join(',');

/** A colour mixed toward the accent, e.g. silver with a hint of blue. */
export const tinted = (base: string, amount: number): Color => new Color(base).lerp(EDGE, amount);
