/**
 * 3D entry point, loaded lazily on the visitor's first interaction.
 *
 * Holds one engine (one canvas, one renderer) for the whole visit. Each scene
 * is its own small chunk, loaded when needed:
 *   hero  the full home-page hero ("Encrypt and lock"), if present
 *   soc   the active role's scene, mounted when its pane nears the viewport
 * On a role switch (scripts/roles.ts) the new role's scene starts loading at
 * the click, the old one pulls back and is disposed at the swap, and the new
 * one flies in.
 */
import type { Camera, Object3D, Scene } from 'three';
import { getChapter } from '../scripts/chapters';
import { markFailed, type Probe, type Tier } from './capability';
import { Engine, type View } from './engine';
import { createHero } from './hero';

type Factory = (engine: Engine, el: HTMLElement, chapter: NonNullable<ReturnType<typeof getChapter>>) => Promise<View>;

const scenes: Record<string, () => Promise<Factory>> = {
  // The hero is always needed first on "/", so it ships with the engine.
  hero: () => Promise.resolve(createHero),
  soc: () => import('./soc').then((m) => m.createSoc),
  iam: () => import('./iam').then((m) => m.createIam),
  grc: () => import('./grc').then((m) => m.createGrc),
};

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Warm up a scene before its first visible frame in small time slices, so no
 * single task blocks input for long:
 *   - shaders compile (in parallel where the browser supports it),
 *   - each object is then drawn into a single pixel of the real canvas, which
 *     finishes linking its shader and uploads its geometry and textures now,
 *     in small pieces, instead of all at once inside the first visible frame.
 * The real canvas is used (not an off-screen target) because three.js builds
 * different shader variants for off-screen targets.
 */
async function precompile(engine: Engine, scene: Scene, camera: Camera, budgetMs: number): Promise<void> {
  const r = engine.renderer;
  if (r.extensions.has('KHR_parallel_shader_compile')) await r.compileAsync(scene, camera);

  const leaves: Object3D[] = [];
  scene.traverse((o) => {
    const k = o as Object3D & { isMesh?: boolean; isLine?: boolean; isPoints?: boolean; isSprite?: boolean };
    if (k.isMesh || k.isLine || k.isPoints || k.isSprite) leaves.push(o);
  });
  const shown = leaves.map((o) => o.visible);
  for (const o of leaves) o.visible = false;
  const pixel = () => {
    r.setRenderTarget(null);
    r.setScissorTest(true);
    r.setViewport(0, 0, 1, 1);
    r.setScissor(0, 0, 1, 1);
  };
  // budgetMs 0: yield after every object (background work: smallest tasks).
  // budgetMs 25: warm objects until about 25 ms have passed, then yield
  // (right after a click: fewer round trips, so the first frame comes sooner).
  let sliceStart = performance.now();
  for (const o of leaves) {
    o.visible = true;
    pixel();
    r.render(scene, camera);
    o.visible = false;
    if (performance.now() - sliceStart >= budgetMs) {
      await yieldToBrowser();
      sliceStart = performance.now();
    }
  }
  pixel();
  r.clear();
  leaves.forEach((o, i) => {
    o.visible = shown[i] ?? true;
  });
}

/**
 * @param idle  started by idle preparation (desktop): only the engine and the
 *              hero are built; a role scene waits for the visitor's first
 *              interaction (or a role switch), keeping start-up work small.
 *              (Preparing the role scene at idle on the role URLs was tried:
 *              it cost about 600 ms of blocking time, desktop Lighthouse 100
 *              to 76, for a stage that is below the fold at load anyway.)
 */
export async function start(tier: Tier, probe: Probe | null = null, idle = false): Promise<void> {
  performance.mark('engine-start');
  await yieldToBrowser(); // module evaluation and engine creation in separate tasks
  const engine = new Engine(tier, probe);
  performance.mark('engine-created');
  await yieldToBrowser();
  // Any failure, or slow first frames: back to the 2D pictures for this session.
  engine.onFail = () => {
    markFailed();
    window.dispatchEvent(new Event('three:fallback'));
  };
  engine.onSlow = () => engine.fail();
  const mounting = new Map<string, Promise<View | null>>();
  const roots = document.querySelector<HTMLElement>('[data-roles]');
  // A switch may already be under way (the first tap often starts 3D).
  let activeRole = roots?.dataset.target ?? roots?.dataset.active ?? '';

  /** urgent: the visitor just asked for this scene (a role switch). */
  const mount = (id: string, urgent = false): Promise<View | null> => {
    const existing = mounting.get(id);
    if (existing) return existing;
    const job = (async () => {
      const load = scenes[id];
      const el = document.querySelector<HTMLElement>(`[data-view="${id}"]`);
      const chapter = getChapter(id);
      if (!load || !el || !chapter) return null;
      const create = await load();
      performance.mark(`scene-loaded:${id}`);
      const view = await create(engine, el, chapter);
      performance.mark(`scene-built:${id}`);
      await precompile(engine, view.scene, view.camera, urgent ? 25 : 0);
      performance.mark(`scene-compiled:${id}`);
      // The role may have changed while this scene was loading.
      if (id !== 'hero' && id !== activeRole) {
        engine.remove(view);
        return null;
      }
      engine.add(view);
      return view;
    })().catch((error: unknown) => {
      engine.fail();
      throw error;
    });
    mounting.set(id, job);
    return job;
  };

  const unmount = (id: string) => {
    const view = engine.get(id);
    mounting.delete(id);
    if (view) engine.remove(view);
  };

  /** Mount a role's scene once its pane is within a screen of the viewport. */
  let rolesAllowed = !idle;
  /** Mount the active role's scene if its pane is within a screen or so. */
  const mountActiveIfNear = () => {
    if (!rolesAllowed || !activeRole || !scenes[activeRole]) return;
    const box = document.querySelector<HTMLElement>(`[data-role-pane="${activeRole}"]`)?.getBoundingClientRect();
    if (box && box.top < window.innerHeight * 2 && box.bottom > -window.innerHeight) void mount(activeRole);
  };
  if (idle) {
    const events = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'] as const;
    const allow = () => {
      for (const e of events) window.removeEventListener(e, allow);
      rolesAllowed = true;
      mountActiveIfNear();
    };
    for (const e of events) window.addEventListener(e, allow, { passive: true });
  }

  const near = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.rolePane ?? '';
        if (e.isIntersecting && id === activeRole && rolesAllowed) void mount(id);
      }
    },
    { rootMargin: '100% 0px' },
  );
  for (const pane of document.querySelectorAll<HTMLElement>('[data-role-pane]')) near.observe(pane);

  window.addEventListener('roles:leave', (e) => {
    const view = engine.get((e as CustomEvent<{ role: string }>).detail.role);
    if (view) {
      view.presenceTarget = 0;
      engine.wake();
    }
  });

  // Clicked: start loading and compiling the new scene while the sheet covers.
  // It draws as soon as its pane is shown (hidden panes have no size).
  window.addEventListener('roles:target', (e) => {
    const { to } = (e as CustomEvent<{ to: string }>).detail;
    activeRole = to;
    rolesAllowed = true;
    if (scenes[to]) void mount(to, true);
  });

  window.addEventListener('roles:change', (e) => {
    const { from, to } = (e as CustomEvent<{ from: string; to: string }>).detail;
    activeRole = to;
    if (from !== to) unmount(from);
    if (scenes[to]) void mount(to, true);
  });

  try {
    if (roots?.dataset.target && scenes[activeRole]) {
      rolesAllowed = true;
      void mount(activeRole, true);
    }
    await mount('hero');
    mountActiveIfNear();
  } catch (error) {
    engine.fail();
    throw error;
  }
}
