/**
 * One renderer, one fixed full-viewport canvas, many scenes.
 *
 * Each scene draws only inside its "view" element's on-screen rectangle
 * (viewport + scissor), so page text never sits under 3D and the canvas is
 * transparent everywhere else. Frames are drawn only while something moves:
 * the eased scroll value is still settling, or the ambient loop is on. Nothing
 * is drawn while the views are off screen or the tab is hidden.
 *
 * Scroll smoothing: `current` follows the chapter's scroll `target` with a
 * frame-rate independent lerp (about 80 ms to settle), so reversing feels fluid
 * while native scrolling stays untouched.
 */
import { type Material, Mesh, type Object3D, type PerspectiveCamera, type Scene, Vector2, WebGLRenderer } from 'three';
import { type Chapter, setMode, subscribe } from '../scripts/chapters';
import type { Probe, Tier } from './capability';

export interface View {
  id: string;
  /** Element whose on-screen box this scene renders into. */
  el: HTMLElement;
  chapter: Chapter;
  scene: Scene;
  camera: PerspectiveCamera;
  /**
   * Pose the scene for eased progress p (0-1) at ambient time t (seconds).
   * presence (0-1) is the role fly-in: 0 = pulled back, 1 = in place.
   */
  update(p: number, t: number, presence: number): void;
  /** Called after the camera aspect changes. */
  resize?(width: number, height: number): void;
  current: number;
  ready: boolean;
  /** True while the opening move from the poster's pose is playing. */
  intro?: boolean;
  /** Open at the visitor's scroll position (no intro move): its 2D picture already shows that pose. */
  startAtTarget?: boolean;
  /** Role views: eased towards presenceTarget (fly-in on arrival, pull-back on leave). */
  presence?: number;
  presenceTarget?: number;
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export class Engine {
  readonly renderer: WebGLRenderer;
  readonly tier: Tier;
  private readonly canvas: HTMLCanvasElement;
  private readonly views: View[] = [];
  private readonly toggle = document.querySelector<HTMLInputElement>('[data-motion-toggle]');
  private frame = 0;
  private last = 0;
  private time = 0;
  private slowFrames = 0;
  private readonly size = new Vector2();
  private readonly sizes = new WeakMap<View, [number, number]>();
  private failed = false;
  private dirty = true;
  private lastRender = 0;
  /** Early frame times (ms) for the slow-device check. */
  private readonly samples: number[] = [];
  private frameCheckDone = false;
  /** Preview builds only: ?slowframes adds 60 ms to every sample, to test the fallback. */
  private readonly slowBias = __TIER_OVERRIDE__ && new URLSearchParams(window.location.search).has('slowframes') ? 60 : 0;
  /** Called once if the first frames are too slow for this device. */
  onSlow: (() => void) | null = null;
  onFail: (() => void) | null = null;

  constructor(tier: Tier, probe: Probe | null = null) {
    this.tier = tier;
    this.canvas = probe?.canvas ?? document.createElement('canvas');
    this.canvas.className = 'three-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(this.canvas);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      ...(probe ? { context: probe.gl } : {}),
      antialias: tier === 'full' || tier === 'static',
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    // Shaders are fixed and covered by tests; skipping the per-program error
    // check avoids a synchronous GPU round trip for every shader compiled.
    this.renderer.debug.checkShaderErrors = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'lite' ? 1.25 : 1.75));
    this.resize();

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.fail();
    });
    const invalidate = () => {
      this.dirty = true;
      this.wake();
    };
    window.addEventListener('resize', () => {
      this.resize();
      invalidate();
    });
    document.addEventListener('visibilitychange', invalidate);
    reduceMotion.addEventListener('change', invalidate);
    this.toggle?.addEventListener('change', invalidate);
    subscribe(invalidate);
  }

  /** Motion is on unless the tier is static, the user prefers reduced motion, or the switch is off. */
  get motion(): boolean {
    return this.tier !== 'static' && !reduceMotion.matches && (this.toggle?.checked ?? true);
  }

  add(view: View): void {
    this.views.push(view);
    this.wake();
  }

  /** Stop drawing a view and free its geometry and materials. Shared textures (glyph atlas, matcaps) stay. */
  remove(view: View): void {
    const i = this.views.indexOf(view);
    if (i >= 0) this.views.splice(i, 1);
    this.sizes.delete(view);
    delete view.el.dataset.driver;
    view.chapter.el.classList.remove('is-3d');
    view.scene.traverse((obj: Object3D) => {
      const o = obj as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) m.dispose();
      if (obj instanceof Mesh && 'dispose' in obj && typeof obj.dispose === 'function') obj.dispose();
    });
    this.dirty = true;
    this.wake();
  }

  get(id: string): View | undefined {
    return this.views.find((v) => v.id === id);
  }

  wake(): void {
    if (this.failed || this.frame || document.hidden) return;
    this.frame = requestAnimationFrame(this.tick);
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    this.renderer.getSize(this.size);
    if (this.size.x !== w || this.size.y !== h) this.renderer.setSize(w, h, false);
  }

  private inView(v: View, width: number, height: number): DOMRect | null {
    const box = v.el.getBoundingClientRect();
    const off = box.bottom <= 0 || box.top >= height || box.width === 0 || box.right <= 0 || box.left >= width;
    return off ? null : box;
  }

  private tick = (now: number): void => {
    this.frame = 0;
    const dt = this.last ? Math.min(now - this.last, 100) / 1000 : 1 / 60;
    this.last = now;
    const motion = this.motion;
    setMode(motion ? 'scrub' : 'static');
    if (motion) this.time += dt;

    const height = this.canvas.clientHeight;
    const width = this.canvas.clientWidth;
    const boxes = this.views.map((v) => this.inView(v, width, height));
    const visible = boxes.some(Boolean);
    const target = (v: View) => (motion ? v.chapter.target : 1);
    // Slow-device check: frames 6-35 after the first 3D frame. Covers devices
    // that pass the cheap checks (for example Safari, which hides its memory).
    if (!this.frameCheckDone && motion && visible && this.views.some((v) => v.ready)) {
      this.samples.push(dt * 1000 + this.slowBias);
      if (this.samples.length >= 35) {
        this.frameCheckDone = true;
        const sorted = this.samples.slice(5).sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        if (median > 50) {
          this.onSlow?.();
          return;
        }
      }
    }

    const away = (v: View) => Math.abs((v.presenceTarget ?? 1) - (v.presence ?? 1)) > 0.002;
    const moving = this.views.some((v, i) => boxes[i] && (!v.ready || away(v) || Math.abs(target(v) - v.current) > 0.0004));

    // Ambient-only frames (nothing scrolling) are drawn at 30 fps to save power.
    if (!moving && !this.dirty && (!motion || now - this.lastRender < 33)) {
      if (motion && visible) this.wake();
      else this.last = 0;
      return;
    }
    this.dirty = false;
    this.lastRender = now;

    const r = this.renderer;
    r.setScissorTest(false);
    r.clear();
    r.setScissorTest(true);

    let settling = false;
    const ease = 1 - Math.exp(-dt * 12);
    const introEase = 1 - Math.exp(-dt * 2.6);
    const presenceEase = 1 - Math.exp(-dt * 5);
    this.views.forEach((v, i) => {
      const box = boxes[i];
      if (!box) return;
      const goal = target(v);
      if (!v.ready) {
        // Open from the poster's pose (the finished, locked state), then
        // ease to wherever the visitor has scrolled.
        v.current = v.startAtTarget || !motion ? goal : 1;
        v.intro = motion && !v.startAtTarget && goal < 1;
      } else if (!motion) v.current = goal;
      else {
        v.current += (goal - v.current) * (v.intro ? introEase : ease);
        if (Math.abs(goal - v.current) < 0.0004) {
          v.current = goal;
          v.intro = false;
        } else settling = true;
      }
      // Where the scene came to rest (read by tests: it must always settle on
      // the scroll position, never stay part-way).
      if (v.current === goal) {
        const rest = goal.toFixed(3);
        if (v.el.dataset.p !== rest) v.el.dataset.p = rest;
      }

      const last = this.sizes.get(v);
      if (!last || last[0] !== box.width || last[1] !== box.height) {
        this.sizes.set(v, [box.width, box.height]);
        v.camera.aspect = box.width / box.height;
        v.camera.updateProjectionMatrix();
        v.resize?.(box.width, box.height);
      }
      if (v.presence !== undefined) {
        const goalPresence = v.presenceTarget ?? 1;
        if (!motion) v.presence = goalPresence;
        else {
          v.presence += (goalPresence - v.presence) * presenceEase;
          if (Math.abs(goalPresence - v.presence) < 0.002) v.presence = goalPresence;
          else settling = true;
        }
      }
      v.update(v.current, this.time, v.presence ?? 1);

      const y = height - box.bottom;
      r.setViewport(box.left, y, box.width, box.height);
      r.setScissor(box.left, y, box.width, box.height);
      r.render(v.scene, v.camera);

      if (!v.ready) {
        v.ready = true;
        settling = true;
        v.el.dataset.driver = '3d';
        v.chapter.el.classList.add('is-3d');
        performance.mark(`scene-ready:${v.id}`);
      }
    });

    // Too slow for this device: drop resolution once.
    if (motion && visible && dt > 0.045) {
      if (++this.slowFrames > 90 && r.getPixelRatio() > 1) r.setPixelRatio(1);
    } else this.slowFrames = Math.max(0, this.slowFrames - 1);

    if (settling || (motion && visible)) this.wake();
    else this.last = 0;
  };

  /** WebGL lost or broken: remove the canvas and show the SVG posters again. */
  fail(): void {
    if (this.failed) return;
    this.failed = true;
    cancelAnimationFrame(this.frame);
    for (const v of this.views) {
      delete v.el.dataset.driver;
      v.chapter.el.classList.remove('is-3d');
    }
    this.canvas.remove();
    setMode('static');
    this.onFail?.();
  }
}
