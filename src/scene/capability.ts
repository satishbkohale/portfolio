/**
 * Decides whether this device gets the 3D figure. Conservative on purpose:
 * everyone else gets the static SVG, which shows the same diagram.
 * Never logs to the console (console errors would cost Lighthouse points).
 */

const PREF_KEY = 'fig-motion';

/** Visitor's saved choice from the Motion toggle ('on' | 'off'), if any. */
export function getMotionPref(): string | null {
  try {
    return window.localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

export function setMotionPref(value: 'on' | 'off'): void {
  try {
    window.localStorage.setItem(PREF_KEY, value);
  } catch {
    // Storage blocked (private mode etc.): the choice lasts for this page only.
  }
}

/** Device and preference checks that do not need a GPU context. */
export function deviceAllows3D(): boolean {
  if (!window.matchMedia('(min-width: 64rem)').matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 4) < 4) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;

  try {
    if (window.sessionStorage.getItem('fig-3d-failed') === '1') return false;
  } catch {
    // ignore
  }
  return true;
}

/** True if a WebGL2 context can be created without a major performance caveat. */
export function webgl2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Remember for this session that 3D was too slow or failed. */
export function mark3DFailed(): void {
  try {
    window.sessionStorage.setItem('fig-3d-failed', '1');
  } catch {
    // ignore
  }
}
