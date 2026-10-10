/**
 * Which version of the 3D scenes this device gets. Runs at idle, after the
 * page has painted, because creating a test WebGL context costs a few ms.
 *
 *   full    desktop-class device with WebGL2
 *   lite    phones and tablets: fewer objects, lower resolution
 *   static  reduced motion: one still 3D frame per scene, no scrubbing
 *   poster  no WebGL, low memory, data saver, or 3D failed earlier: SVG only
 *
 * Imports nothing from three.js, so the decision is made before downloading it.
 */
export type Tier = 'full' | 'lite' | 'static' | 'poster';

const TIERS: Tier[] = ['full', 'lite', 'static', 'poster'];
const FAILED_KEY = '3d-failed';

export function markFailed(): void {
  try {
    window.sessionStorage.setItem(FAILED_KEY, '1');
  } catch {
    // Storage blocked: the fallback lasts for this page only.
  }
}

function failedBefore(): boolean {
  try {
    return window.sessionStorage.getItem(FAILED_KEY) === '1';
  } catch {
    return false;
  }
}

/** The WebGL context created by the capability check, handed to the engine
 *  so it does not have to create a second one (context creation is one of
 *  the most expensive single steps on slower machines). */
export interface Probe {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
}
let probe: Probe | null = null;

function webgl2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    // Same attributes the engine would ask for, so the context can be reused.
    const gl = canvas.getContext('webgl2', {
      failIfMajorPerformanceCaveat: true,
      alpha: true,
      antialias: !window.matchMedia('(pointer: coarse)').matches,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    if (!gl) return false;
    probe = { canvas, gl };
    return true;
  } catch {
    return false;
  }
}

/** Take the probe context (once). */
export function takeProbe(): Probe | null {
  const p = probe;
  probe = null;
  return p;
}

/** Tier forced with ?tier= in preview builds (never in production). */
export function forcedTier(): Tier | null {
  if (!__TIER_OVERRIDE__) return null;
  const forced = new URLSearchParams(window.location.search).get('tier');
  return forced && (TIERS as string[]).includes(forced) ? (forced as Tier) : null;
}

/**
 * Cheap checks, safe at first paint (no WebGL context): data saver, a slow
 * connection, few cores, little memory (where the browser reports it; Safari
 * does not, which is why the engine also watches its first frames and falls
 * back to the flat figure if they are slow), or a 3D failure earlier in this
 * session.
 */
export function weakDevice(): boolean {
  const forced = forcedTier();
  if (forced) return forced === 'poster';
  if (failedBefore()) return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  if (nav.connection?.saveData) return true;
  if (/2g|3g/.test(nav.connection?.effectiveType ?? '')) return true;
  if ((nav.hardwareConcurrency ?? 4) < 4) return true;
  return nav.deviceMemory !== undefined && nav.deviceMemory < 4;
}

export function detectTier(): Tier {
  const forced = forcedTier();
  if (forced) return forced;
  if (weakDevice()) return 'poster';
  if (!webgl2()) return 'poster';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  const small = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
  return small ? 'lite' : 'full';
}
