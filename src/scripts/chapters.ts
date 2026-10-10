/**
 * Scroll chapters: turns native scrolling into a progress value (0 to 1) per
 * chapter. No scroll-jacking: pinning is CSS `position: sticky`, and this file
 * only reads positions.
 *
 * Markup
 *   [data-chapter="id"]  the scroll track; data-stages="name:0,name:0.3,..."
 *   [data-pin]           the sticky element inside it (one per breakpoint may
 *                        be sticky; whichever is sticky right now is used).
 *                        It must be the first item in its container, so its
 *                        unstuck offset is just the container's top padding.
 *   [data-step="name"]   optional captions; get aria-current="step" / data-done
 *
 * Output on each chapter element: data-stage, and --p for CSS.
 * In "static" mode (no 3D, reduced motion, Animation switch off) every
 * chapter reports its final stage, which matches the static picture shown.
 * The 3D engine subscribes and eases towards `target` itself.
 */

export interface Chapter {
  id: string;
  el: HTMLElement;
  stages: { name: string; at: number }[];
  /** Raw scroll progress, 0 to 1. */
  target: number;
  stage: string;
  pin: HTMLElement | null;
  /** Distance from the top of the pin's container to the pin, unstuck. */
  offset: number;
  /** The pin's CSS `top`, in px. */
  stickyTop: number;
}

export type Mode = 'static' | 'scrub';

export const chapters: Chapter[] = [];
const listeners = new Set<() => void>();
let mode: Mode = 'static';
let queued = false;

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getMode(): Mode {
  return mode;
}

export function setMode(next: Mode): void {
  if (next === mode) return;
  mode = next;
  update();
}

export function getChapter(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}

function parseStages(raw: string | undefined): { name: string; at: number }[] {
  const stages = (raw ?? '')
    .split(',')
    .map((part) => {
      const [name = '', at = '0'] = part.split(':');
      return { name: name.trim(), at: Number(at) };
    })
    .filter((s) => s.name);
  return stages.sort((a, b) => a.at - b.at);
}

/** Pick the sticky pin and read its offsets (styles only, no forced layout). */
function measure(): void {
  for (const ch of chapters) {
    const pins = [...ch.el.querySelectorAll<HTMLElement>('[data-pin]')];
    const styles = pins.map((p) => getComputedStyle(p));
    const i = styles.findIndex((st) => st.position === 'sticky');
    ch.pin = pins[i] ?? null;
    ch.stickyTop = Number.parseFloat(styles[i]?.top ?? '0') || 0;
    const box = ch.pin?.parentElement;
    ch.offset = box ? Number.parseFloat(getComputedStyle(box).paddingTop) || 0 : 0;
  }
}

function progress(ch: Chapter): number {
  const pin = ch.pin;
  const box = pin?.parentElement;
  if (!pin || !box) {
    const r = ch.el.getBoundingClientRect();
    return (window.innerHeight * 0.5 - r.top) / Math.max(1, r.height);
  }
  const c = box.getBoundingClientRect();
  const travel = c.height - ch.offset - pin.offsetHeight;
  return travel <= 0 ? 1 : (ch.stickyTop - c.top - ch.offset) / travel;
}

function update(): void {
  queued = false;
  for (const ch of chapters) {
    const p = Math.min(1, Math.max(0, progress(ch)));
    ch.target = p;
    const shown = mode === 'scrub' ? p : 1;
    let stage = ch.stages[0]?.name ?? '';
    for (const s of ch.stages) if (shown >= s.at) stage = s.name;

    ch.el.style.setProperty('--p', shown.toFixed(4));
    if (stage !== ch.stage) {
      ch.stage = stage;
      ch.el.dataset.stage = stage;
      const order = ch.stages.map((s) => s.name);
      const index = order.indexOf(stage);
      for (const step of ch.el.querySelectorAll<HTMLElement>('[data-step]')) {
        const i = order.indexOf(step.dataset.step ?? '');
        step.toggleAttribute('data-done', i >= 0 && i < index);
        if (i === index) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      }
    }
  }
  for (const fn of listeners) fn();
}

function queue(): void {
  if (queued) return;
  queued = true;
  requestAnimationFrame(update);
}

/** Re-read pins and positions, e.g. after the role panes are swapped. */
export function refreshChapters(): void {
  measure();
  update();
}

export function initChapters(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-chapter]')) {
    chapters.push({
      id: el.dataset.chapter ?? '',
      el,
      stages: parseStages(el.dataset.stages),
      target: 0,
      stage: '',
      pin: null,
      offset: 0,
      stickyTop: 0,
    });
  }
  if (chapters.length === 0) return;
  measure();
  update();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    queue();
  });
}
