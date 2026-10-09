/**
 * 3D tier of the zero-trust figure (three.js, WebGL 2).
 *
 * Built from src/data/topology.ts (the same data as the SVG), laid out on two
 * planes: the control plane (policy engine and administrator) raised above
 * the data plane (subject, system, enforcement point, resource), with the
 * eight inputs on either side.
 *
 * Budget: ~9 draw calls, no textures, render on demand only. Labels are HTML
 * placed over the canvas (accessible text lives in the page, not here).
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  SphereGeometry,
  setConsoleFunction,
  Vector3,
  WebGLRenderer,
} from 'three';
import { center, nodes, planes, type TopoNode, edges as topoEdges } from '../data/topology';

// three.js's own warnings and errors stay out of the console (Lighthouse
// counts console errors); failures are handled by the caller instead.
setConsoleFunction(() => {});

export interface SceneState {
  beat: number;
  active: string; // 'policy' | 'identity' | 'activity' | 'none'
}

export interface SceneApi {
  readonly canvas: HTMLCanvasElement;
  readonly labels: HTMLElement;
  setState(state: SceneState, autoStart?: boolean): void;
  setPointer(x: number, y: number): void;
  resize(): void;
  /** Median frame interval in ms over a short warm-up run. */
  warmUp(frames?: number): Promise<number>;
  setLowQuality(): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

const VIEW_W = 820;
const VIEW_H = 540;
const UNIT = 80; // SVG units per world unit
const SLAB = 0.16; // box thickness

const C = {
  bg: new Color('#0d1114'),
  surface: new Color('#141a1e'),
  raised: new Color('#1c2429'),
  hairline: new Color('#2a333a'),
  dim: new Color('#3a444c'),
  boundary: new Color('#6b7882'),
  text: new Color('#e8e4dc'),
  text2: new Color('#b4babe'),
  grc: new Color('#b5d6ae'),
  iam: new Color('#7ba4db'),
  soc: new Color('#e6ae5e'),
  deny: new Color('#f2a193'),
};

const channelColor: Record<string, Color> = { policy: C.grc, identity: C.iam, activity: C.soc };

function heightOf(n: TopoNode): number {
  if (n.kind === 'engine' || n.kind === 'administrator') return 1.0 + SLAB / 2 + 0.02;
  if (n.kind === 'input') return 0.5;
  return SLAB / 2;
}

function worldOf(n: TopoNode): Vector3 {
  const c = center(n.wide);
  return new Vector3((c.x - VIEW_W / 2) / UNIT, heightOf(n), (c.y - VIEW_H / 2) / UNIT);
}

/** Camera keyframes per story beat: [position, look-at target]. */
const KEYFRAMES: Record<number, [Vector3, Vector3]> = {
  0: [new Vector3(0, 8.8, 9.2), new Vector3(0, 0.35, 0.3)],
  1: [new Vector3(-1.0, 7.6, 9.8), new Vector3(0, 0.25, 0.3)],
  2: [new Vector3(0, 10.8, 6.0), new Vector3(0, 0.5, -0.1)],
  3: [new Vector3(0, 10.8, 6.0), new Vector3(0, 0.5, -0.1)],
  4: [new Vector3(0, 10.8, 6.0), new Vector3(0, 0.5, -0.1)],
  5: [new Vector3(1.4, 7.6, 9.8), new Vector3(0.3, 0.3, 0.4)],
  6: [new Vector3(2.2, 7.4, 9.8), new Vector3(0.6, 0.3, 0.4)],
};

const damp = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

export function createScene(): SceneApi {
  const canvas = document.createElement('canvas');
  canvas.className = 'fig__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const labels = document.createElement('div');
  labels.className = 'fig__labels';
  labels.setAttribute('aria-hidden', 'true');

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1.5, 0.1, 100);

  /* Planes ---------------------------------------------------------------- */
  const wp = planes.wide;
  const planeMat = new MeshBasicMaterial({ color: C.surface, transparent: true, opacity: 0.6, depthWrite: false });
  const rect = (x: number, y: number, w: number, h: number, height: number) => {
    const m = new Mesh(new PlaneGeometry(w / UNIT, h / UNIT), planeMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x + w / 2 - VIEW_W / 2) / UNIT, height, (y + h / 2 - VIEW_H / 2) / UNIT);
    scene.add(m);
  };
  const ctrlH = wp.divider - wp.frame.y;
  rect(wp.frame.x, wp.frame.y, wp.frame.w, ctrlH, 1.0);
  rect(wp.frame.x, wp.divider, wp.frame.w, wp.frame.y + wp.frame.h - wp.divider, 0);

  // Plane and PDP outlines in one draw call.
  const outlinePts: number[] = [];
  const addRect = (x: number, y: number, w: number, h: number, height: number) => {
    const xs = [(x - VIEW_W / 2) / UNIT, (x + w - VIEW_W / 2) / UNIT];
    const zs = [(y - VIEW_H / 2) / UNIT, (y + h - VIEW_H / 2) / UNIT];
    const [x0, x1] = xs as [number, number];
    const [z0, z1] = zs as [number, number];
    outlinePts.push(x0, height, z0, x1, height, z0, x1, height, z0, x1, height, z1);
    outlinePts.push(x1, height, z1, x0, height, z1, x0, height, z1, x0, height, z0);
  };
  addRect(wp.frame.x, wp.frame.y, wp.frame.w, ctrlH, 1.0);
  addRect(wp.frame.x, wp.divider, wp.frame.w, wp.frame.y + wp.frame.h - wp.divider, 0);
  addRect(wp.pdp.x, wp.pdp.y, wp.pdp.w, wp.pdp.h, 1.005);
  const outlineGeo = new BufferGeometry();
  outlineGeo.setAttribute('position', new Float32BufferAttribute(outlinePts, 3));
  scene.add(new LineSegments(outlineGeo, new LineBasicMaterial({ color: C.hairline })));

  /* Node boxes: one instanced fill + one merged outline ------------------ */
  const fill = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xffffff }), nodes.length);
  const m4 = new Matrix4();
  const q = new Quaternion();
  const outlinePositions: number[] = [];
  const nodeVertexRange: [number, number][] = [];
  nodes.forEach((n, i) => {
    const p = worldOf(n);
    const size = new Vector3(n.wide.w / UNIT, SLAB, n.wide.h / UNIT);
    fill.setMatrixAt(i, m4.compose(p, q, size));
    fill.setColorAt(i, n.kind === 'engine' || n.kind === 'administrator' ? C.raised : C.bg);
    const edgesGeo = new EdgesGeometry(new BoxGeometry(size.x, size.y, size.z));
    const arr = edgesGeo.getAttribute('position').array;
    const start = outlinePositions.length / 3;
    for (let k = 0; k < arr.length; k += 3) {
      outlinePositions.push((arr[k] ?? 0) + p.x, (arr[k + 1] ?? 0) + p.y, (arr[k + 2] ?? 0) + p.z);
    }
    nodeVertexRange.push([start, outlinePositions.length / 3]);
  });
  scene.add(fill);
  const nodeOutlineGeo = new BufferGeometry();
  nodeOutlineGeo.setAttribute('position', new Float32BufferAttribute(outlinePositions, 3));
  const nodeColors = new Float32Array(outlinePositions.length);
  nodeOutlineGeo.setAttribute('color', new Float32BufferAttribute(nodeColors, 3));
  scene.add(new LineSegments(nodeOutlineGeo, new LineBasicMaterial({ vertexColors: true })));

  /* Edges: one merged line set ------------------------------------------- */
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edgeList = topoEdges.map((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) throw new Error('bad edge');
    return { ...e, a, b, pa: worldOf(a), pb: worldOf(b) };
  });
  const edgePositions: number[] = [];
  for (const e of edgeList) edgePositions.push(e.pa.x, e.pa.y, e.pa.z, e.pb.x, e.pb.y, e.pb.z);
  const edgeGeo = new BufferGeometry();
  edgeGeo.setAttribute('position', new Float32BufferAttribute(edgePositions, 3));
  const edgeColors = new Float32Array(edgePositions.length);
  edgeGeo.setAttribute('color', new Float32BufferAttribute(edgeColors, 3));
  scene.add(new LineSegments(edgeGeo, new LineBasicMaterial({ vertexColors: true })));

  /* Signal pulses (one instance per input edge) and the request marker ---- */
  const signalEdges = edgeList.filter((e) => e.kind === 'signal');
  const pulses = new InstancedMesh(new SphereGeometry(0.07, 12, 8), new MeshBasicMaterial({ color: 0xffffff }), signalEdges.length);
  signalEdges.forEach((e, i) => {
    pulses.setColorAt(i, channelColor[e.a.channel] ?? C.text);
  });
  scene.add(pulses);

  const marker = new Mesh(new BoxGeometry(0.16, 0.16, 0.16), new MeshBasicMaterial({ color: C.text }));
  const markerStops = {
    subject: worldOf(byId.get('subject') as TopoNode).setY(0.55),
    pep: worldOf(byId.get('pep') as TopoNode).setY(0.55),
    resource: worldOf(byId.get('resource') as TopoNode).setY(0.55),
  };
  marker.position.copy(markerStops.subject);
  scene.add(marker);

  /* HTML labels ------------------------------------------------------------ */
  const labelEls = nodes.map((n) => {
    const el = document.createElement('span');
    el.className = 'fig__label';
    el.dataset.channel = n.channel;
    if (n.kind === 'input') {
      const g = document.createElement('span');
      g.className = 'fig__label-glyph';
      el.appendChild(g);
    }
    el.appendChild(document.createTextNode((n.tallLabel ?? n.label).join(' ')));
    labels.appendChild(el);
    return el;
  });

  /* State ----------------------------------------------------------------- */
  const camPos = KEYFRAMES[0]?.[0].clone() ?? new Vector3();
  const camTarget = KEYFRAMES[0]?.[1].clone() ?? new Vector3();
  let goalPos = camPos.clone();
  let goalTarget = camTarget.clone();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const nodeGoal = nodes.map(() => C.boundary.clone());
  const baseFill = nodes.map((n) => (n.kind === 'engine' || n.kind === 'administrator' ? C.raised.clone() : C.bg.clone()));
  const fillGoal = baseFill.map((c) => c.clone());
  const fillNow = baseFill.map((c) => c.clone());
  const nodeNow = nodes.map(() => C.boundary.clone());
  const edgeGoal = edgeList.map(() => C.dim.clone());
  const edgeNow = edgeList.map(() => C.dim.clone());
  let markerGoal = markerStops.subject.clone();
  let pulseChannel: string | null = null;
  let pulseStart = 0;
  const PULSE_MS = 4000; // pulses stop on their own (WCAG 2.2.2: under 5 s)

  function setState(s: SceneState, autoStart = true): void {
    const kf = KEYFRAMES[s.beat] ?? KEYFRAMES[0];
    if (kf) {
      goalPos = kf[0].clone();
      goalTarget = kf[1].clone();
    }
    const active = s.active;
    nodes.forEach((n, i) => {
      let c = n.kind === 'pep' ? C.text2 : C.boundary;
      if (n.kind === 'input' && active !== 'none') c = n.channel === active ? (channelColor[active] ?? c) : C.dim;
      if (s.beat === 1 && (n.id === 'subject' || n.id === 'pep')) c = C.text;
      if (s.beat === 5 && ['engine', 'administrator', 'pep', 'resource'].includes(n.id)) c = C.text;
      if (s.beat === 6 && n.id === 'pep') c = C.deny;
      if (s.beat === 6 && n.id === 'siem') c = C.soc;
      if (active !== 'none' && n.id === 'engine') c = C.text;
      nodeGoal[i]?.copy(c);
      // Highlighted boxes get a faint tint of their outline colour.
      const tinted = (n.kind === 'input' && active !== 'none' && n.channel === active) || c.equals(C.deny);
      fillGoal[i]?.copy(baseFill[i] ?? C.bg).lerp(c, tinted ? 0.12 : 0);
    });
    edgeList.forEach((e, i) => {
      let c = e.kind === 'request' ? C.boundary : C.dim;
      if (e.kind === 'signal' && active !== 'none' && e.a.channel === active) c = channelColor[active] ?? c;
      if (s.beat === 1 && (e.from === 'subject' || e.from === 'system')) c = C.text;
      if (s.beat === 5 && (e.kind === 'control' || e.kind === 'request')) c = C.text;
      if (s.beat === 6 && e.from === 'pep') c = C.deny;
      edgeGoal[i]?.copy(c);
    });
    markerGoal = (s.beat === 0 ? markerStops.subject : s.beat === 5 ? markerStops.resource : markerStops.pep).clone();
    const newPulse = active !== 'none' ? active : null;
    if (newPulse !== pulseChannel) {
      pulseChannel = newPulse;
      pulseStart = performance.now();
    }
    if (autoStart) start();
  }

  /* Loop ------------------------------------------------------------------ */
  let raf = 0;
  let last = 0;
  let running = false;
  const v = new Vector3();
  const tmpPos = new Vector3();
  const right = new Vector3();
  const up = new Vector3(0, 1, 0);

  function colorStep(now: Color[], goal: Color[], k: number, attr: Float32Array, perItem: (i: number) => [number, number]): boolean {
    let moving = false;
    now.forEach((c, i) => {
      const g = goal[i];
      if (!g) return;
      c.lerp(g, k);
      if (Math.abs(c.r - g.r) + Math.abs(c.g - g.g) + Math.abs(c.b - g.b) > 0.003) moving = true;
      else c.copy(g);
      // A few hundred vertices: cheap enough to write every frame.
      const [a, b] = perItem(i);
      for (let vtx = a; vtx < b; vtx++) {
        attr[vtx * 3] = c.r;
        attr[vtx * 3 + 1] = c.g;
        attr[vtx * 3 + 2] = c.b;
      }
    });
    return moving;
  }

  function frame(time: number): void {
    const dt = Math.min(0.05, last ? (time - last) / 1000 : 0.016);
    last = time;
    let moving = false;

    // Camera, with a small pointer parallax around the look-at target.
    camPos.lerp(goalPos, damp(dt, 4));
    camTarget.lerp(goalTarget, damp(dt, 4));
    pointer.x += (pointer.tx - pointer.x) * damp(dt, 6);
    pointer.y += (pointer.ty - pointer.y) * damp(dt, 6);
    if (camPos.distanceTo(goalPos) > 0.002 || camTarget.distanceTo(goalTarget) > 0.002) moving = true;
    if (Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.001) moving = true;
    right.subVectors(camTarget, camPos).cross(up).normalize();
    tmpPos
      .copy(camPos)
      .addScaledVector(right, pointer.x * 0.35)
      .addScaledVector(up, -pointer.y * 0.2);
    camera.position.copy(tmpPos);
    camera.lookAt(camTarget);

    // Colours.
    const k = damp(dt, 6);
    if (colorStep(nodeNow, nodeGoal, k, nodeColors, (i) => nodeVertexRange[i] ?? [0, 0])) moving = true;
    if (colorStep(edgeNow, edgeGoal, k, edgeColors, (i) => [i * 2, i * 2 + 2])) moving = true;
    (nodeOutlineGeo.getAttribute('color') as Float32BufferAttribute).needsUpdate = true;
    fillNow.forEach((c, i) => {
      const g = fillGoal[i];
      if (!g) return;
      c.lerp(g, k);
      if (Math.abs(c.r - g.r) + Math.abs(c.g - g.g) + Math.abs(c.b - g.b) > 0.003) moving = true;
      fill.setColorAt(i, c);
    });
    if (fill.instanceColor) fill.instanceColor.needsUpdate = true;
    (edgeGeo.getAttribute('color') as Float32BufferAttribute).needsUpdate = true;

    // Request marker.
    marker.position.lerp(markerGoal, damp(dt, 3));
    if (marker.position.distanceTo(markerGoal) > 0.002) moving = true;

    // Pulses travel from each input of the active channel to the engine.
    const elapsed = performance.now() - pulseStart;
    const pulsing = pulseChannel !== null && elapsed < PULSE_MS;
    signalEdges.forEach((e, i) => {
      const on = pulsing && e.a.channel === pulseChannel;
      const t = (((elapsed / 1100 + i * 0.13) % 1) + 1) % 1;
      v.lerpVectors(e.pa, e.pb, t);
      pulses.setMatrixAt(i, m4.compose(v, q, on ? new Vector3(1, 1, 1) : new Vector3(0, 0, 0)));
    });
    pulses.instanceMatrix.needsUpdate = true;
    if (pulsing) moving = true;

    renderer.render(scene, camera);
    placeLabels();

    if (moving && running) raf = requestAnimationFrame(frame);
    else {
      running = false;
      last = 0;
    }
  }

  function placeLabels(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    nodes.forEach((n, i) => {
      const el = labelEls[i];
      if (!el) return;
      v.copy(worldOf(n));
      v.y += SLAB / 2;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    });
  }

  function start(): void {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(raf);
    last = 0;
  }

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    start();
  }

  function setPointer(x: number, y: number): void {
    pointer.tx = Math.max(-1, Math.min(1, x));
    pointer.ty = Math.max(-1, Math.min(1, y));
    start();
  }

  async function warmUp(frames = 24): Promise<number> {
    resize();
    await renderer.compileAsync(scene, camera);
    const times: number[] = [];
    let prev = performance.now();
    for (let i = 0; i < frames; i++) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      renderer.render(scene, camera);
      const now = performance.now();
      times.push(now - prev);
      prev = now;
    }
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)] ?? 0;
  }

  function setLowQuality(): void {
    renderer.setPixelRatio(1);
    resize();
  }

  function dispose(): void {
    stop();
    renderer.dispose();
    scene.traverse((o) => {
      const mesh = o as Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) for (const mm of mat) mm.dispose();
      else mat?.dispose();
    });
    canvas.remove();
    labels.remove();
  }

  // Initial targets; rendering starts once the canvas is mounted.
  setState({ beat: 0, active: 'none' }, false);

  return { canvas, labels, setState, setPointer, resize, warmUp, setLowQuality, start, stop, dispose };
}
