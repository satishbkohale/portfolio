/**
 * Homepage motion. Small, dependency-free, and safe under the site's strict
 * CSP and Trusted Types: it only toggles classes, sets textContent, and
 * writes styles through CSSOM (never innerHTML or style attributes in markup).
 *
 * 1. Scroll reveal: content below the fold fades up as it enters the viewport.
 * 2. Decrypt: short scramble-to-text on the hero status label.
 * 3. Orbit (2D poster): security terms travel round the SVG lock. The 3D
 *    scene takes the labels over once it draws its first frame.
 * 4. Rail: a line down the left edge fills as you scroll through the story.
 * 5. Chapters and 3D: scroll progress per chapter (scripts/chapters.ts), then
 *    at idle the device check and the lazily loaded three.js scenes. If 3D is
 *    unavailable or fails, the SVG posters simply stay.
 *
 * With prefers-reduced-motion everything is shown in its final state.
 */
import { detectTier, markFailed, takeProbe, weakDevice } from '../three/capability';
import { initChapters, setMode } from './chapters';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const PREF_KEY = 'motion';

function readPref(): string | null {
  try {
    return window.localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

function writePref(value: 'on' | 'off'): void {
  try {
    window.localStorage.setItem(PREF_KEY, value);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

/* 1. Scroll reveal --------------------------------------------------------- */

function initReveal(): void {
  for (const group of document.querySelectorAll<HTMLElement>('[data-reveal-group]')) {
    const items = group.querySelectorAll<HTMLElement>(':scope > [data-reveal]');
    items.forEach((el, i) => {
      el.style.setProperty('--i', String(Math.min(i, 8)));
    });
  }

  const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const reveal = (el: HTMLElement) => {
    el.classList.remove('is-pending');
    el.classList.add('is-in');
  };

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    for (const el of items) reveal(el);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  // Only hide what the visitor cannot see yet, so nothing on screen flickers.
  const fold = window.innerHeight * 0.95;
  for (const el of items) {
    if (el.getBoundingClientRect().top > fold) el.classList.add('is-pending');
    observer.observe(el);
  }
}

/* 2. Decrypt --------------------------------------------------------------- */

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+<>/';

function decrypt(el: HTMLElement, duration = 700): Promise<void> {
  const target = el.textContent ?? '';
  return new Promise((resolve) => {
    if (reduceMotion.matches) {
      resolve();
      return;
    }
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * target.length);
      let out = '';
      for (let i = 0; i < target.length; i++) {
        const ch = target[i] ?? '';
        out += i < settled || ch === ' ' || ch === '·' ? ch : (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ch);
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else {
        el.textContent = target;
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

function initDecrypt(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-decrypt]')) {
    void decrypt(el, 650);
  }
}

/* 3. Orbit ----------------------------------------------------------------- */

interface Ring {
  rx: number;
  ry: number;
  tilt: number;
  /** Seconds per lap; negative runs the other way. */
  period: number;
}

function initOrbit(): void {
  const stage = document.querySelector<HTMLElement>('[data-orbit]');
  const toggle = document.querySelector<HTMLInputElement>('[data-motion-toggle]');
  if (!stage) return;

  let rings: Ring[];
  try {
    rings = JSON.parse(stage.dataset.rings ?? '[]') as Ring[];
  } catch {
    return;
  }

  const tags = [...stage.querySelectorAll<HTMLElement>('.orbit__tag')].map((el) => ({
    el,
    ring: rings[Number(el.dataset.ring)] ?? rings[0],
    phase: Number(el.dataset.phase) || 0,
    front: false,
    hidden: false,
    /** Half size in viewBox units (measured on resize). */
    hw: 0,
    hh: 0,
    x: 0,
    y: 0,
    depth: 0,
  }));
  if (tags.length === 0 || !rings[0]) return;

  let size = stage.clientWidth;
  const measure = () => {
    const unit = size / 100 || 1;
    for (const t of tags) {
      t.hw = t.el.offsetWidth / unit / 2;
      t.hh = t.el.offsetHeight / unit / 2;
    }
  };
  // The padlock (shackle and body) in viewBox units: labels behind it are hidden by it.
  const LOCK = { x0: 38, x1: 62, y0: 34, y1: 66 };
  const overlaps = (ax: number, ay: number, aw: number, ah: number, b: { x0: number; x1: number; y0: number; y1: number }) =>
    ax + aw > b.x0 && ax - aw < b.x1 && ay + ah > b.y0 && ay - ah < b.y1;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let hovered = false;
  let visible = true;

  // Once the 3D scene draws, it places the labels itself.
  const handedOver = () => stage.dataset.driver === '3d';

  const place = () => {
    if (handedOver()) return;
    const unit = size / 100;
    for (const t of tags) {
      const ring = t.ring as Ring;
      const angle = 2 * Math.PI * (t.phase + elapsed / ring.period);
      const ex = ring.rx * Math.cos(angle);
      const ey = ring.ry * Math.sin(angle);
      const tilt = (ring.tilt * Math.PI) / 180;
      const x = 50 + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      const y = 50 + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      // Lower half of the ellipse is nearer the viewer.
      const depth = (Math.sin(angle) + 1) / 2;
      const scale = 0.86 + 0.14 * depth;
      t.el.style.transform = `translate(${(x * unit).toFixed(1)}px, ${(y * unit).toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      t.el.style.setProperty('--depth', depth.toFixed(3));
      const front = depth > 0.5;
      if (front !== t.front) {
        t.front = front;
        t.el.toggleAttribute('data-front', front);
      }
      t.x = x;
      t.y = y;
      t.depth = depth;
    }
    // Occlusion, as in 3D: a label behind the lock, or behind a nearer label
    // it touches, is hidden (it fades out and back in as the orbit turns).
    for (const t of tags) {
      const s = 0.86 + 0.14 * t.depth;
      let hidden = !t.front && overlaps(t.x, t.y, t.hw * s, t.hh * s, LOCK);
      for (const o of tags) {
        if (hidden || o === t || o.depth <= t.depth) continue;
        const so = 0.86 + 0.14 * o.depth;
        hidden = overlaps(t.x, t.y, t.hw * s, t.hh * s, {
          x0: o.x - o.hw * so,
          x1: o.x + o.hw * so,
          y0: o.y - o.hh * so,
          y1: o.y + o.hh * so,
        });
      }
      if (hidden !== t.hidden) {
        t.hidden = hidden;
        t.el.toggleAttribute('data-hidden', hidden);
      }
    }
  };

  // The 2D labels only move with the flat lock (not under the packets picture).
  const flat = () => stage.dataset.mode === 'flat' || reduceMotion.matches;
  const running = () =>
    flat() && !handedOver() && visible && !hovered && !document.hidden && !reduceMotion.matches && (toggle?.checked ?? true);

  const tick = (now: number) => {
    if (!running()) {
      frame = 0;
      return;
    }
    if (last) elapsed += Math.min(now - last, 100) / 1000;
    last = now;
    place();
    frame = requestAnimationFrame(tick);
  };

  const sync = () => {
    if (running() && !frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  measure();
  place();
  stage.classList.add('is-live');

  new ResizeObserver(() => {
    size = stage.clientWidth;
    measure();
    place();
  }).observe(stage);

  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  }).observe(stage);

  stage.addEventListener('pointerenter', () => {
    hovered = true;
  });
  stage.addEventListener('pointerleave', () => {
    hovered = false;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', sync);
  window.addEventListener('hero:mode', () => {
    place();
    sync();
  });

  if (toggle) {
    if (readPref() === 'off') toggle.checked = false;
    toggle.addEventListener('change', () => {
      writePref(toggle.checked ? 'on' : 'off');
      sync();
    });
  }

  sync();
}

/* 5. Rail ------------------------------------------------------------------ */

function initRail(): void {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-rail]')];
  if (sections.length === 0) return;

  let queued = false;
  const update = () => {
    queued = false;
    const line = window.innerHeight * 0.55;
    // At the very bottom the last section can never reach the line: fill it.
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      const p = atEnd && box.top < line ? 1 : Math.min(1, Math.max(0, (line - box.top) / box.height));
      section.style.setProperty('--p', p.toFixed(3));
      section.toggleAttribute('data-active', box.top < line);
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  update();
}

/* 5. Chapters and 3D -------------------------------------------------------- */

/**
 * 3D starts on the visitor's first interaction (pointer, touch, wheel, key or
 * scroll), not at page load: the scroll story only moves once they scroll,
 * and the page stays fast for everyone who just reads it. The SVG poster is
 * shown until then, and the 3D scene opens from the same locked pose.
 */
/** Filled in at build time by the three-prefetch plugin in astro.config.ts. */
const THREE_CHUNKS = '__THREE_CHUNKS__';

/**
 * When the browser is idle after load, download and compile the 3D code
 * without running it, so starting 3D on first interaction is quicker.
 * Skipped on data saver and low-end devices, which never get 3D anyway.
 */
function prefetch3D(): void {
  if (THREE_CHUNKS.startsWith('__')) return; // development server
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  if (nav.connection?.saveData || /2g/.test(nav.connection?.effectiveType ?? '')) return;
  if ((nav.hardwareConcurrency ?? 4) < 4 || (nav.deviceMemory ?? 4) < 4) return;
  const run = () => {
    for (const href of THREE_CHUNKS.split(',')) {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = href;
      document.head.append(link);
    }
  };
  // Start well after first paint, so the download never competes with the
  // page's own content (or counts towards its loading time).
  const idle = () => {
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 4000 });
      else run();
    }, 2500);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

/**
 * Prepare the 3D engine in the background when the browser is idle after
 * load (import, build the hero, compile shaders, first frame), so the hero
 * opens in 3D without waiting for an interaction. Measured trade-offs are in
 * docs/03-3d-chapters-plan.md. Preview builds accept ?prep=0 or ?prep=1.
 */
const PREP_ON_MOBILE = false;
const PREP_DELAY_MS = 1500;

function prepAtIdle(): boolean {
  // Only the home hero is prepared at idle. On the role URLs the scene waits
  // for the first interaction anyway, so an idle start would only build an
  // empty engine (blocking time for nothing); the code is prefetched instead.
  if (!document.querySelector('[data-view="hero"]')) return false;
  if (__TIER_OVERRIDE__) {
    const q = new URLSearchParams(window.location.search).get('prep');
    if (q === '0') return false;
    if (q === '1') return true;
  }
  return PREP_ON_MOBILE || !window.matchMedia('(pointer: coarse)').matches;
}

/** Show the flat lock in the hero figure (weak device, no WebGL, 3D fallback). */
function setHeroFlat(): void {
  // The flat lock is the finished (locked) picture: captions show that state.
  setMode('static');
  const figure = document.querySelector<HTMLElement>('[data-view="hero"]');
  if (!figure || figure.dataset.mode === 'flat') return;
  figure.dataset.mode = 'flat';
  window.dispatchEvent(new Event('hero:mode'));
}

/**
 * Before 3D draws, the hero shows the packets picture (the opening pose), so
 * the captions follow scrolling. Reduced motion and the Animation switch keep
 * the still, final state. Once 3D runs, the engine sets this every frame.
 */
function initCaptionMode(): void {
  const toggle = document.querySelector<HTMLInputElement>('[data-motion-toggle]');
  const sync = () => {
    const packets = document.querySelector<HTMLElement>('[data-view="hero"]')?.dataset.mode === 'packets';
    setMode(packets && !reduceMotion.matches && (toggle?.checked ?? true) ? 'scrub' : 'static');
  };
  sync();
  toggle?.addEventListener('change', sync);
  reduceMotion.addEventListener('change', sync);
}

function init3D(): void {
  window.addEventListener('three:fallback', setHeroFlat);
  initCaptionMode();
  // Known weak devices get the flat lock straight away and no 3D at all.
  if (weakDevice()) {
    document.documentElement.dataset.tier = 'poster';
    setHeroFlat();
    return;
  }

  let started = false;
  const events = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'] as const;
  /** idle: started by idle preparation (desktop), not by the visitor. */
  const start = (idle = false) => {
    if (started) return;
    started = true;
    for (const e of events) window.removeEventListener(e, onInteract);
    const tier = detectTier();
    document.documentElement.dataset.tier = tier;
    if (tier === 'poster') {
      setHeroFlat();
      return;
    }
    import('../three/main')
      .then((m) => m.start(tier, takeProbe(), idle))
      .catch(() => {
        markFailed();
        document.documentElement.dataset.tier = 'poster';
        setHeroFlat();
      });
  };

  if (prepAtIdle()) {
    // A short delay after load keeps the start-up work clear of the page's own
    // loading; then the next idle moment.
    const idle = () => {
      window.setTimeout(() => {
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => start(true), { timeout: 1000 });
        else start(true);
      }, PREP_DELAY_MS);
    };
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  } else prefetch3D();

  // An interaction before the idle callback starts it at once.
  const onInteract = () => start(false);
  for (const e of events) window.addEventListener(e, onInteract, { passive: true, once: true });
  // Arriving mid-page (reload, back button, #anchor): start straight away.
  if (window.scrollY > 0) start(false);
}

initChapters();
initReveal();
initDecrypt();
initOrbit();
initRail();
init3D();
