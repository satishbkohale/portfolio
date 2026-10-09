/**
 * Figure behaviour (static tier). The 3D tier, when available, is loaded
 * from here too (see loadScene at the end).
 *
 * - Story beats: the About paragraph nearest the middle of the viewport sets
 *   data-beat / data-active on the story figure, and CSS highlights the
 *   matching part of the diagram. Colour and opacity changes only; no motion.
 * - Legend: items are upgraded into toggle buttons (aria-pressed) that pin a
 *   channel highlight. Hover and focus preview the highlight.
 */
import { deviceAllows3D, getMotionPref, mark3DFailed, setMotionPref, webgl2Available } from '../scene/capability';
import type { SceneApi } from '../scene/scene';
import { type FigureState, onFigureState, subscribe } from './figure-state';

type Channel = 'policy' | 'identity' | 'activity' | 'none';

const BEAT_CHANNEL: Record<number, Channel> = { 2: 'policy', 3: 'identity', 4: 'activity' };

const story = document.querySelector<HTMLElement>('figure[data-figure="story"]');
const steps = Array.from(document.querySelectorAll<HTMLElement>('.story__step[data-beat]'));

const state: FigureState = {
  beat: 0,
  pinned: null,
  preview: null,
};

function defaultActive(fig: HTMLElement): Channel {
  return (fig.dataset.defaultActive as Channel | undefined) ?? 'none';
}

function render(): void {
  if (!story) return;
  const beatChannel = BEAT_CHANNEL[state.beat];
  const active = (state.preview ?? state.pinned ?? beatChannel ?? defaultActive(story)) as Channel;
  story.dataset.beat = String(state.beat);
  story.dataset.active = active;
  for (const step of steps) {
    step.toggleAttribute('data-current', Number(step.dataset.beat) === state.beat);
  }
  onFigureState(state, active);
}

/* Story beats ------------------------------------------------------------ */

if (story && steps.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Set<HTMLElement>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(el);
        else visible.delete(el);
      }
      // The latest step in the band wins; above the first step, beat 0.
      let beat = 0;
      for (const el of visible) beat = Math.max(beat, Number(el.dataset.beat));
      if (visible.size === 0) {
        const first = steps[0];
        const last = steps[steps.length - 1];
        if (first && last) {
          const mid = window.innerHeight / 2;
          if (last.getBoundingClientRect().bottom < mid) beat = Number(last.dataset.beat);
        }
      }
      if (beat !== state.beat) {
        state.beat = beat;
        render();
      }
    },
    // A thin band across the middle of the viewport.
    { rootMargin: '-40% 0px -55% 0px' },
  );
  for (const step of steps) observer.observe(step);
}

/* Legend buttons --------------------------------------------------------- */

const legendItems = story ? Array.from(story.querySelectorAll<HTMLElement>('[data-legend-content]')) : [];

for (const content of legendItems) {
  const channel = content.dataset.channel as Channel;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'fig-legend__button';
  button.dataset.channel = channel;
  button.setAttribute('aria-pressed', 'false');
  // Move the existing nodes into the button (no HTML strings involved).
  while (content.firstChild) button.appendChild(content.firstChild);
  content.replaceWith(button);

  button.addEventListener('click', () => {
    state.pinned = state.pinned === channel ? null : channel;
    for (const b of story?.querySelectorAll<HTMLButtonElement>('.fig-legend__button') ?? []) {
      b.setAttribute('aria-pressed', String(b.dataset.channel === state.pinned));
    }
    render();
  });
  const preview = (on: boolean) => {
    state.preview = on ? channel : null;
    render();
  };
  button.addEventListener('pointerenter', () => preview(true));
  button.addEventListener('pointerleave', () => preview(false));
  button.addEventListener('focus', () => preview(true));
  button.addEventListener('blur', () => preview(false));
}

render();

/* 3D tier ---------------------------------------------------------------- */
/*
 * Loaded only after the page has loaded and the browser is idle, and only on
 * capable desktops (src/scene/capability.ts). A short warm-up is rendered
 * while the canvas is still invisible; slow devices stay on the SVG.
 * One canvas is moved between the hero figure and Fig. 2, whichever is on screen.
 */

declare const __TIER_OVERRIDE__: boolean;

const figures = Array.from(document.querySelectorAll<HTMLElement>('figure[data-figure]'));
const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]'));

let api: SceneApi | null = null;
let host: HTMLElement | null = null; // figure currently showing the canvas
let motionOn = true;
let storyState = { beat: 0, active: 'none' };
const visibility = new Map<HTMLElement, number>();

function tierOverride(): 'static' | '3d' | null {
  if (!__TIER_OVERRIDE__) return null;
  const t = new URLSearchParams(window.location.search).get('tier');
  return t === 'static' || t === '3d' ? t : null;
}

function stateFor(fig: HTMLElement) {
  return fig.dataset.figure === 'story' ? storyState : { beat: 0, active: fig.dataset.active ?? 'none' };
}

function setToggles(on: boolean): void {
  for (const t of toggles) {
    t.hidden = false;
    t.setAttribute('aria-pressed', String(on));
    const label = t.querySelector('[data-motion-state]');
    if (label) label.textContent = on ? 'on' : 'off';
  }
}

function showStatic(): void {
  for (const f of figures) f.dataset.tier = 'static';
  api?.stop();
}

/** Put the canvas into the most visible figure and render its state. */
function place(): void {
  if (!api || !motionOn) return;
  let best: HTMLElement | null = null;
  let bestRatio = 0;
  for (const [fig, ratio] of visibility) {
    if (ratio > bestRatio) {
      best = fig;
      bestRatio = ratio;
    }
  }
  if (!best) {
    api.stop();
    return;
  }
  if (best !== host) {
    const stage = best.querySelector<HTMLElement>('.fig__stage');
    if (!stage) return;
    stage.append(api.canvas, api.labels);
    for (const f of figures) f.dataset.tier = f === best ? '3d' : 'static';
    host = best;
    api.resize();
  }
  api.setState(stateFor(best));
}

function teardown(): void {
  mark3DFailed();
  showStatic();
  api?.dispose();
  api = null;
  host = null;
  for (const t of toggles) t.hidden = true;
}

async function start3D(): Promise<void> {
  let createScene: typeof import('../scene/scene').createScene;
  try {
    ({ createScene } = await import('../scene/scene'));
  } catch {
    return; // network failure: stay on the SVG
  }
  try {
    api = createScene();
  } catch {
    teardown();
    return;
  }
  api.canvas.addEventListener('webglcontextlost', teardown);

  // Warm up inside the first figure while still invisible (opacity 0).
  const first = figures[0]?.querySelector<HTMLElement>('.fig__stage');
  if (!first) return;
  first.append(api.canvas, api.labels);
  const median = await api.warmUp();
  if (median > 24 && tierOverride() !== '3d') {
    teardown();
    return;
  }
  if (median > 20) api.setLowQuality();

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) visibility.set(e.target as HTMLElement, e.isIntersecting ? e.intersectionRatio : 0);
      place();
    },
    { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
  );
  for (const f of figures) io.observe(f);

  subscribe((s, active) => {
    storyState = { beat: s.beat, active };
    if (host?.dataset.figure === 'story' && motionOn) api?.setState(storyState);
  });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !motionOn) return;
      api?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) api?.stop();
    else place();
  });
  new ResizeObserver(() => api?.resize()).observe(document.documentElement);
}

function init3D(): void {
  const override = tierOverride();
  if (override === 'static' || figures.length === 0) return;
  if (override !== '3d' && !deviceAllows3D()) return;
  if (!webgl2Available()) return;

  motionOn = getMotionPref() !== 'off';
  setToggles(motionOn);
  for (const t of toggles) {
    t.addEventListener('click', async () => {
      motionOn = !motionOn;
      setMotionPref(motionOn ? 'on' : 'off');
      setToggles(motionOn);
      if (!motionOn) {
        showStatic();
        host = null;
      } else if (!api) {
        await start3D();
      } else {
        place();
      }
    });
  }
  if (motionOn) void start3D();
}

function whenIdle(fn: () => void): void {
  const run = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 2000 });
    else setTimeout(fn, 1200);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

whenIdle(init3D);
