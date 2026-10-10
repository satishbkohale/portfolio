/**
 * Role switcher (home pages only): SOC / IAM / GRC in the bar below the header.
 *
 *  - Hover (120 ms intent) or keyboard focus: a thin band of the target role
 *    is uncovered just below the switcher bar (src/components/RevealLayer.astro)
 *    and its 3D code is prefetched. Moving between options swaps the band
 *    without closing it, and the band stays open while the pointer moves into
 *    it (clicking the band switches).
 *  - Click, Enter or Space: one transition for every switch order:
 *      cover   the clip grows down from the switcher bar until the target
 *              role fills the screen (it is revealed, never slid in),
 *      swap    while fully covered: panes, URL, title, meta, scroll position,
 *              focus on the role heading, live-region announcement,
 *      fade    the real role page is now underneath, aligned with the layer,
 *              which fades away.
 *    Interruptible: a new click mid-way just changes the target. Nothing is
 *    queued.
 *  - Reduced motion or the Animation switch off: a quick cross-fade.
 *  - History: real URLs (/soc/, /iam/, /grc/) with pushState; Back and Forward
 *    restore the role and the scroll position it was left at.
 *
 * Without JavaScript the switcher is three ordinary links to prerendered pages.
 */
import { getMode, refreshChapters } from './chapters';

type Role = 'soc' | 'iam' | 'grc';
interface RoleState {
  role: Role;
  y: number | null;
}

const roots = document.querySelector<HTMLElement>('[data-roles]');
const layer = document.querySelector<HTMLElement>('[data-reveal-layer]');
const clip = document.querySelector<HTMLElement>('[data-reveal-clip]');
const bar = document.querySelector<HTMLElement>('.switcher-bar');
const live = document.querySelector<HTMLElement>('[data-role-announce]');
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-role-link]')];
const switcher = document.querySelector<HTMLElement>('[data-switcher]');
const toggle = document.querySelector<HTMLInputElement>('[data-motion-toggle]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

const panes = new Map<Role, HTMLElement>();
for (const el of document.querySelectorAll<HTMLElement>('[data-role-pane]')) panes.set(el.dataset.rolePane as Role, el);

const isRole = (v: unknown): v is Role => v === 'soc' || v === 'iam' || v === 'grc';
const roleOf = (el: Element | null): Role | null => {
  const r = (el as HTMLElement | null)?.dataset.roleLink;
  return isRole(r) ? r : null;
};

let current: Role = isRole(roots?.dataset.active) ? (roots?.dataset.active as Role) : 'soc';
let token = 0;
let busy = false;

/* Motion preference ---------------------------------------------------------- */

const instant = () => reduceMotion.matches || !(toggle?.checked ?? true);

/* Reveal layer ----------------------------------------------------------------- */

type LayerState = 'closed' | 'band' | 'cover' | 'fade';

let bandRole: Role | null = null;

function setLayerRole(role: Role): void {
  bandRole = role;
  for (const el of layer?.querySelectorAll<HTMLElement>('[data-reveal-role]') ?? []) {
    const on = el.dataset.revealRole === role;
    el.toggleAttribute('data-active', on);
    if (!on) continue;
    // Highlight the step the real page will show at the top of the role: the
    // first while scroll-driven, the last (finished) one when still.
    const steps = [...el.querySelectorAll<HTMLElement>('.role__step')];
    const current = getMode() === 'static' ? steps.length - 1 : 0;
    steps.forEach((step, i) => {
      if (i === current) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }
}

function setLayer(state: LayerState, jump = false): void {
  if (!layer || !clip) return;
  if (jump) {
    clip.style.transition = 'none';
    layer.dataset.state = state;
    void clip.offsetHeight; // apply without animating
    clip.style.transition = '';
  } else layer.dataset.state = state;
}

/** Resolve when the mask's transition for `prop` ends (or after a timeout). */
function settled(prop: 'transform' | 'opacity', ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (!clip) return resolve();
    const done = () => {
      clip.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
      resolve();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === clip && e.propertyName === prop) done();
    };
    const timer = window.setTimeout(done, ms + 80);
    clip.addEventListener('transitionend', onEnd);
  });
}

/* Band (hover intent / focus) ------------------------------------------------- */

let intent = 0;
let closeTimer = 0;

function openBand(role: Role): void {
  window.clearTimeout(closeTimer);
  if (busy || instant()) return;
  prefetchRole(role);
  if (role === current) {
    closeBand(0);
    return;
  }
  setLayerRole(role);
  setLayer('band');
}

function closeBand(delay = 150): void {
  window.clearTimeout(intent);
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    if (!busy && layer?.dataset.state === 'band') setLayer('closed');
  }, delay);
}

/* Prefetch (download and compile only) ----------------------------------------- */

/** Filled in at build time by the three-prefetch plugin in astro.config.ts. */
const ROLE_CHUNKS = '__ROLE_CHUNKS__';
const prefetched = new Set<string>();

function prefetchRole(role: Role): void {
  if (ROLE_CHUNKS.startsWith('__')) return;
  for (const entry of ROLE_CHUNKS.split(';')) {
    const [name, urls = ''] = entry.split('=');
    if (name !== role && name !== 'engine') continue;
    for (const href of urls.split(',')) {
      if (!href || prefetched.has(href)) continue;
      prefetched.add(href);
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = href;
      document.head.append(link);
    }
  }
}

/* Swap ------------------------------------------------------------------------- */

/** Scroll position that puts the role's top just under the sticky header,
 *  which is exactly where the reveal layer starts. */
function roleTop(): number {
  const header = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().height ?? 0;
  const top = (roots?.getBoundingClientRect().top ?? 0) + window.scrollY;
  return Math.max(0, Math.round(top - header));
}

function setMeta(selector: string, attr: string, value: string): void {
  document.querySelector(selector)?.setAttribute(attr, value);
}

function swap(role: Role, y: number | null, focus: boolean): void {
  const from = current;
  const pane = panes.get(role);
  if (!pane) return;
  for (const [r, el] of panes) el.hidden = r !== role;
  current = role;
  if (roots) {
    roots.dataset.active = role;
    delete roots.dataset.target;
  }
  for (const l of links) {
    const on = roleOf(l) === role;
    if (on) l.setAttribute('aria-current', 'page');
    else l.removeAttribute('aria-current');
    l.tabIndex = on ? 0 : -1;
  }

  const { title = document.title, description = '', url = `/${role}/`, announce = '' } = pane.dataset;
  document.title = title;
  const abs = new URL(url, window.location.origin).href;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', abs);
  setMeta('link[rel="canonical"]', 'href', abs);

  window.scrollTo({ top: y ?? roleTop(), behavior: 'instant' });
  refreshChapters();
  // Scroll positions are whole pixels but layout is not: nudge the layer's copy
  // by the leftover fraction (while it fully covers the page) so the fade-out
  // reveals text in exactly the same place.
  if (layer && y === null) {
    const header = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().height ?? 0;
    layer.style.setProperty('--reveal-align', `${(pane.getBoundingClientRect().top - header).toFixed(2)}px`);
  }
  if (focus) pane.querySelector<HTMLElement>('.role__title')?.focus({ preventScroll: true });
  if (live) live.textContent = announce;
  window.dispatchEvent(new CustomEvent('roles:change', { detail: { from, to: role } }));
}

/* Transition ------------------------------------------------------------------- */

async function switchTo(role: Role, opts: { push: boolean; y?: number | null; focus?: boolean }): Promise<void> {
  const id = ++token;
  if (role === current && !busy) {
    if (opts.push) window.scrollTo({ top: roleTop(), behavior: 'instant' });
    return;
  }
  performance.mark('role-click');
  // Let the 3D side start loading the new scene now, in parallel with the cover.
  // dataset.target covers the case where the 3D code is still starting up.
  if (roots) roots.dataset.target = role;
  window.dispatchEvent(new CustomEvent('roles:target', { detail: { to: role } }));
  if (opts.push) {
    history.replaceState({ role: current, y: window.scrollY } satisfies RoleState, '');
    history.pushState({ role, y: null }, '', `/${role}/`);
  }

  if (instant()) {
    setLayer('closed', true);
    busy = false;
    swap(role, opts.y ?? null, opts.focus ?? true);
    panes.get(role)?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: reduceMotion.matches ? 0 : 140 });
    return;
  }

  busy = true;
  window.clearTimeout(intent);
  window.clearTimeout(closeTimer);
  window.dispatchEvent(new CustomEvent('roles:leave', { detail: { role: current } }));
  setLayerRole(role);
  setLayer('cover');
  await settled('transform', 380);
  if (id !== token) return; // a newer switch took over

  swap(role, opts.y ?? null, opts.focus ?? true);
  // Let the swapped page lay out under the layer before uncovering it.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (id !== token) return;
  setLayer('fade');
  await settled('opacity', 220);
  if (id !== token) return;
  setLayer('closed', true);
  layer?.style.removeProperty('--reveal-align');
  busy = false;
  // Late layout (fonts, posters) must not move a restored position.
  if (typeof opts.y === 'number') window.scrollTo({ top: opts.y, behavior: 'instant' });
}

/* Events ----------------------------------------------------------------------- */

function init(): void {
  if (!roots || panes.size === 0 || links.length === 0) return;

  history.scrollRestoration = 'manual';
  // Remember where this entry was left, for Back/Forward and reloads.
  const saveY = () => history.replaceState({ ...(history.state as object), role: current, y: window.scrollY }, '');
  window.addEventListener('pagehide', saveY);
  let scrollSave = 0;
  window.addEventListener(
    'scroll',
    () => {
      window.clearTimeout(scrollSave);
      scrollSave = window.setTimeout(() => {
        if (!busy) saveY();
      }, 300);
    },
    { passive: true },
  );
  if (!history.state) history.replaceState({ role: current, y: null } satisfies RoleState, '');
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const restoreY = (history.state as RoleState | null)?.y;
  if (nav && nav.type !== 'navigate' && typeof restoreY === 'number') window.scrollTo({ top: restoreY, behavior: 'instant' });

  // Roving tabindex: one tab stop for the group, arrows move between roles.
  for (const l of links) l.tabIndex = roleOf(l) === current ? 0 : -1;

  for (const link of links) {
    const role = roleOf(link);
    if (!role) continue;

    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // new tab etc.
      e.preventDefault();
      void switchTo(role, { push: true });
    });

    link.addEventListener('keydown', (e) => {
      const i = links.indexOf(link);
      let next: HTMLAnchorElement | undefined;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = links[(i + 1) % links.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = links[(i - 1 + links.length) % links.length];
      else if (e.key === 'Home') next = links[0];
      else if (e.key === 'End') next = links.at(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        void switchTo(role, { push: true });
        return;
      }
      if (next) {
        e.preventDefault();
        for (const l of links) l.tabIndex = l === next ? 0 : -1;
        next.focus({ preventScroll: true });
      }
    });

    link.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !canHover.matches) return;
      window.clearTimeout(closeTimer);
      window.clearTimeout(intent);
      // While the band is already open, swap at once so moving across
      // options never closes and reopens it.
      if (layer?.dataset.state === 'band') openBand(role);
      else intent = window.setTimeout(() => openBand(role), 120);
    });

    link.addEventListener('focus', () => {
      if (link.matches(':focus-visible')) openBand(role);
    });
  }

  // Hover bridge: the band sits right under the switcher bar, so the pointer
  // can move from one into the other without the band closing.
  bar?.addEventListener('pointerleave', () => closeBand());
  clip?.addEventListener('pointerenter', () => window.clearTimeout(closeTimer));
  clip?.addEventListener('pointerleave', () => closeBand());
  clip?.addEventListener('click', () => {
    if (bandRole && layer?.dataset.state === 'band') void switchTo(bandRole, { push: true });
  });
  switcher?.addEventListener('focusout', (e) => {
    if (!switcher.contains(e.relatedTarget as Node | null)) closeBand(0);
  });

  window.addEventListener('popstate', (e) => {
    const state = e.state as RoleState | null;
    const fromPath = window.location.pathname.split('/').filter(Boolean)[0];
    const role = state?.role ?? (isRole(fromPath) ? fromPath : 'soc');
    if (role === current) {
      if (typeof state?.y === 'number') window.scrollTo({ top: state.y, behavior: 'instant' });
      return;
    }
    void switchTo(role, { push: false, y: state?.y ?? null, focus: true });
  });
}

init();
