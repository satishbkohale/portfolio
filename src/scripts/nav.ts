/**
 * Header behaviour on every page.
 *
 * 1. Mobile menu. The menu itself is a native popover and works without this
 *    script; this only closes it after a link is chosen, so same-page anchors
 *    (/#work) do not leave the menu open over the content.
 * 2. Header fade. data-scrolled on <html> once the page has scrolled, which
 *    shows the soft fade under the header (layout.css).
 * 3. Sweeps on blue fills (components.css). data-sweep marks the elements
 *    whose idle sweep may run: only while on screen and while the tab is
 *    visible. data-motion="off" on <html> mirrors the Animation switch (saved
 *    by scripts/home.ts), so the sweeps stop on every page.
 */
const root = document.documentElement;
const menu = document.getElementById('mobile-menu');

if (menu && 'hidePopover' in menu) {
  menu.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a')) {
      menu.hidePopover();
    }
  });
}

let scrolled = false;
const onScroll = () => {
  const now = window.scrollY > 2;
  if (now !== scrolled) {
    scrolled = now;
    root.toggleAttribute('data-scrolled', now);
  }
};
window.addEventListener('scroll', onScroll, { passive: true });
// First check on the next frame: reading scrollY forces style and layout, and
// doing that now would let the scroll-reveal setup (scripts/home.ts) start
// as a visible fade-out instead of a hidden first state.
requestAnimationFrame(onScroll);

const readMotion = (): string | null => {
  try {
    return window.localStorage.getItem('motion');
  } catch {
    return null;
  }
};
const setMotion = (on: boolean) => {
  if (on) root.removeAttribute('data-motion');
  else root.setAttribute('data-motion', 'off');
};
setMotion(readMotion() !== 'off');
document.addEventListener('change', (event) => {
  const t = event.target;
  if (t instanceof HTMLInputElement && t.matches('[data-motion-toggle]')) setMotion(t.checked);
});

const fills = [...document.querySelectorAll<HTMLElement>('.button--primary, .switcher__link')];
const onScreen = new Set<HTMLElement>();
const applySweeps = () => {
  for (const el of fills) el.toggleAttribute('data-sweep', !document.hidden && onScreen.has(el));
};
if (fills.length > 0 && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      if (e.isIntersecting) onScreen.add(el);
      else onScreen.delete(el);
    }
    applySweeps();
  });
  for (const el of fills) io.observe(el);
  document.addEventListener('visibilitychange', applySweeps);
}
