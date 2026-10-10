/**
 * SOC scene: "Detect".
 *
 *   p 0.00  stream      grey log events flow through a conduit; a sweep scans it
 *   p 0.22  flagged     one event lifts out, turns amber and is ringed
 *   p 0.47  correlated  three related events lift out; edges link them
 *   p 0.72  escalated   the graph folds into an incident card (sample data)
 *
 * Pure function of p (plus ambient time t), so scrolling up reverses it.
 * `presence` (0 to 1) is the fly-in used when the role is switched to.
 * Two colours only: mint for the system, amber for the alert.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Chapter } from '../scripts/chapters';
import type { Engine, View } from './engine';
import { GlyphLayer, lineLocals } from './glyphs';
import { glowTexture, matcaps } from './materials';
import { ACCENT, ACCENT_RGB, AMBER, AMBER_RGB, EDGE } from './palette';

const GREY = new Color('#7f8a97');
const TEXT_RGB = [0.91, 0.918, 0.93] as const;
const DIM_RGB = [0.55, 0.58, 0.63] as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const range = (a: number, b: number, p: number) => clamp01((p - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutBack = (x: number) => (x <= 0 ? 0 : 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2);
function hash(a: number, b: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* Layout (scene units) */
const STREAM_Y = 1.5;
const X0 = -4.6;
const LEN = 9.2;
const R = 0.42;
const ALERT = new Vector3(0, 0.25, 0.7);
const RELATED = [
  { from: new Vector3(-2.6, STREAM_Y, 0), to: new Vector3(-2.0, -0.45, 0.3) },
  { from: new Vector3(2.3, STREAM_Y, 0), to: new Vector3(1.95, -0.3, 0.4) },
  { from: new Vector3(1.0, STREAM_Y, 0), to: new Vector3(0.25, -1.3, 0.2) },
];
/** Graph edges by node index: 0 = alert, 1-3 = related. */
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 3],
  [2, 3],
];
const CARD_POS = new Vector3(0.1, -0.75, 0.9);
const CARD_W = 3.7;
const CARD_H = 2.0;
/** Mini graph inside the card (card-local). */
const MINI = [
  new Vector3(-1.2, 0.3, 0.07),
  new Vector3(-1.55, -0.1, 0.07),
  new Vector3(-0.85, -0.15, 0.07),
  new Vector3(-1.2, -0.55, 0.07),
];
/** Incident card text, sample data only. */
const LINES = [
  { text: 'INC-0427  SAMPLE', y: 0.62, gw: 0.1, rgb: TEXT_RGB },
  { text: 'SEV HIGH', y: 0.3, gw: 0.12, rgb: AMBER_RGB },
  { text: 'T1566.002', y: -0.02, gw: 0.11, rgb: ACCENT_RGB },
  { text: 'Spearphishing link', y: -0.3, gw: 0.085, rgb: DIM_RGB },
  { text: '3 events / 1 host', y: -0.55, gw: 0.085, rgb: DIM_RGB },
];
const TEXT_X = -0.3;
const FRAME_CENTER = new Vector3(0, 0.25, 0);
const FRAME_HALF = { w: 4.0, h: 2.6 };

export async function createSoc(engine: Engine, el: HTMLElement, chapter: Chapter): Promise<View> {
  const lite = engine.tier === 'lite';
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const { silver, graphite, amber } = matcaps();

  /* Conduit: rings along the stream, four faint rails */
  const ring: number[] = [];
  for (let x = -4.5; x <= 4.51; x += 0.75) {
    for (let i = 0; i < 32; i++) {
      const a0 = (i / 32) * Math.PI * 2;
      const a1 = ((i + 1) / 32) * Math.PI * 2;
      ring.push(x, STREAM_Y + Math.cos(a0) * R, Math.sin(a0) * R, x, STREAM_Y + Math.cos(a1) * R, Math.sin(a1) * R);
    }
  }
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    ring.push(X0, STREAM_Y + Math.cos(a) * R, Math.sin(a) * R, X0 + LEN, STREAM_Y + Math.cos(a) * R, Math.sin(a) * R);
  }
  const conduitMat = new LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.26 });
  scene.add(new LineSegments(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(ring, 3)), conduitMat));

  /* Detection sweep: a brighter ring that scans along the conduit */
  const sweepPts = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return new Vector3(0, Math.cos(a) * (R + 0.02), Math.sin(a) * (R + 0.02));
  });
  const sweepMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.8 });
  const sweep = new LineLoop(new BufferGeometry().setFromPoints(sweepPts), sweepMat);
  sweep.position.y = STREAM_Y;
  scene.add(sweep);

  /* Log events: one instanced draw call */
  const count = lite ? 26 : 52;
  const capsule = new CapsuleGeometry(0.06, 0.2, 4, 8).rotateZ(Math.PI / 2);
  const eventMat = new MeshMatcapMaterial({ matcap: silver, color: GREY });
  const events = new InstancedMesh(capsule, eventMat, count);
  events.instanceMatrix.setUsage(DynamicDrawUsage);
  events.frustumCulled = false;
  scene.add(events);
  const seeds = Array.from({ length: count }, (_, i) => ({
    x: hash(i, 1) * LEN,
    y: (hash(i, 2) - 0.5) * 0.5,
    z: (hash(i, 3) - 0.5) * 0.5,
    speed: 0.75 + hash(i, 4) * 0.4,
    shade: 0.55 + hash(i, 5) * 0.45,
  }));
  const shade = new Color();
  seeds.forEach((s, i) => {
    events.setColorAt(i, shade.copy(GREY).multiplyScalar(s.shade));
  });

  /* Dust */
  const dustN = lite ? 80 : 160;
  const dust = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dust[i * 3] = lerp(-5, 5, hash(i, 11));
    dust[i * 3 + 1] = lerp(-2.6, 3.2, hash(i, 12));
    dust[i * 3 + 2] = lerp(-3, 1.5, hash(i, 13));
  }
  const dustPts = new Points(
    new BufferGeometry().setAttribute('position', new Float32BufferAttribute(dust, 3)),
    new PointsMaterial({ color: ACCENT, size: 0.025, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  scene.add(dustPts);

  /* The anomaly and its related events */
  const nodeGeo = new CapsuleGeometry(0.085, 0.26, 4, 10).rotateZ(Math.PI / 2);
  const alertMat = new MeshMatcapMaterial({ matcap: silver, color: GREY.clone() });
  const alert = new Mesh(nodeGeo, alertMat);
  scene.add(alert);
  const relatedMat = new MeshMatcapMaterial({ matcap: amber, color: new Color('#c99a55') });
  const related = RELATED.map(() => {
    const m = new Mesh(nodeGeo, relatedMat);
    scene.add(m);
    return m;
  });

  const ringMat = new MeshBasicMaterial({ color: AMBER, transparent: true, blending: AdditiveBlending, depthWrite: false });
  const alertRing = new Mesh(new RingGeometry(0.34, 0.37, 64), ringMat);
  scene.add(alertRing);
  const glowMat = new SpriteMaterial({
    map: glowTexture(),
    color: AMBER,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const glow = new Sprite(glowMat);
  glow.scale.setScalar(2.2);
  scene.add(glow);

  const tetherMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
  const tetherGeo = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3));
  scene.add(new LineSegments(tetherGeo, tetherMat));

  const edgeMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.75 });
  const edgePos = new Float32BufferAttribute(new Float32Array(EDGES.length * 6), 3);
  edgePos.setUsage(DynamicDrawUsage);
  const edgeGeo = new BufferGeometry().setAttribute('position', edgePos);
  const edgeLines = new LineSegments(edgeGeo, edgeMat);
  edgeLines.frustumCulled = false;
  scene.add(edgeLines);

  /* Incident card */
  const card = new Group();
  card.position.copy(CARD_POS);
  const cardMat = new MeshMatcapMaterial({ matcap: graphite, transparent: true });
  card.add(new Mesh(new RoundedBoxGeometry(CARD_W, CARD_H, 0.08, 2, 0.08), cardMat));
  const borderMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.6 });
  const hw = CARD_W / 2;
  const hh = CARD_H / 2;
  card.add(
    new LineLoop(
      new BufferGeometry().setFromPoints([
        new Vector3(-hw, -hh, 0.042),
        new Vector3(hw, -hh, 0.042),
        new Vector3(hw, hh, 0.042),
        new Vector3(-hw, hh, 0.042),
      ]),
      borderMat,
    ),
  );
  const barMat = new MeshBasicMaterial({ color: AMBER, transparent: true });
  const bar = new Mesh(new PlaneGeometry(0.05, CARD_H - 0.3), barMat);
  bar.position.set(-hw + 0.12, 0, 0.045);
  card.add(bar);
  scene.add(card);
  const textLocals = LINES.map((l) => lineLocals(l.text, TEXT_X, l.y, 0.046, l.gw));
  const totalChars = LINES.reduce((n, l) => n + l.text.length, 0);

  const glyphs = await GlyphLayer.create(96);
  scene.add(glyphs.mesh);

  /* Camera */
  const fitDistance = () => {
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    return Math.max(FRAME_HALF.h / tan, FRAME_HALF.w / (tan * camera.aspect));
  };
  let baseDist = fitDistance();
  const lookAt = new Vector3();
  const cardFocus = new Vector3(0.05, -0.35, 0.4);

  const dummy = new Object3D();
  const tmp = new Matrix4();
  const nodes = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const mini = new Vector3();

  const update = (p: number, t: number, presence = 1) => {
    const flag = smooth(range(0.22, 0.4, p));
    const corr = smooth(range(0.47, 0.62, p));
    const esc = smooth(range(0.72, 0.88, p));
    const cardIn = easeOutBack(range(0.72, 0.86, p));
    const typed = range(0.76, 0.92, p);
    const arrive = smooth(presence);

    /* Camera: slight dolly towards the card at the end; fly-in on presence */
    lookAt.lerpVectors(FRAME_CENTER, cardFocus, esc * 0.6);
    const dist = baseDist * lerp(1.02, 0.9, esc) * lerp(1.7, 1, arrive);
    camera.position.set(lookAt.x + Math.sin(t * 0.06) * 0.3 + (1 - arrive) * 2.5, lookAt.y + 1.0 + (1 - arrive) * 1.5, lookAt.z + dist);
    camera.lookAt(lookAt);

    /* Stream and sweep */
    const dimStream = lerp(1, 0.6, esc);
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      if (!s) continue;
      const u = (s.x + t * s.speed) % LEN;
      const edge = Math.min(u, LEN - u);
      const scale = clamp01(edge / 0.6) * dimStream;
      dummy.position.set(X0 + u, STREAM_Y + s.y, s.z);
      dummy.scale.setScalar(Math.max(0.001, scale));
      dummy.updateMatrix();
      events.setMatrixAt(i, dummy.matrix);
    }
    events.instanceMatrix.needsUpdate = true;
    sweep.position.x = X0 + ((t * 1.4) % LEN);
    sweepMat.opacity = 0.75 * (1 - esc * 0.6);
    conduitMat.opacity = 0.16 * dimStream;
    dustPts.rotation.y = t * 0.01;

    /* Anomaly: rides the stream (scroll-driven), then lifts out and turns amber */
    const ride = smooth(range(0, 0.22, p));
    const inStream = new Vector3(lerp(-3.9, -0.2, ride), STREAM_Y, 0);
    nodes[0]?.lerpVectors(inStream, ALERT, flag);
    for (let k = 0; k < 3; k++) {
      const rel = RELATED[k];
      if (rel) nodes[k + 1]?.lerpVectors(rel.from, rel.to, corr);
    }
    // Escalation: every node folds into the card's mini graph.
    nodes.forEach((n, k) => {
      const m = MINI[k];
      if (!m) return;
      card.localToWorld(mini.copy(m));
      n.lerp(mini, esc);
    });

    const n0 = nodes[0] ?? ALERT;
    alert.position.copy(n0);
    alert.scale.setScalar(lerp(1, 1.8, flag) * lerp(1, 0.55, esc));
    alert.rotation.set(0, t * 0.6 * flag, 0);
    alertMat.color
      .copy(GREY)
      .lerp(AMBER, flag)
      .multiplyScalar(lerp(1, 1.25, flag));
    alertRing.position.copy(n0);
    alertRing.quaternion.copy(camera.quaternion);
    alertRing.scale.setScalar((1 + Math.sin(t * 3) * 0.08) * lerp(1, 0.6, esc));
    ringMat.opacity = flag * 0.9 * (1 - esc);
    glow.position.copy(n0);
    glowMat.opacity = flag * 0.55 * (1 - esc * 0.6);

    const tp = tetherGeo.getAttribute('position');
    tp.setXYZ(0, inStream.x, STREAM_Y - R, 0);
    tp.setXYZ(1, n0.x, n0.y, n0.z);
    tp.needsUpdate = true;
    tetherMat.opacity = 0.5 * flag * (1 - corr);

    related.forEach((m, k) => {
      const n = nodes[k + 1];
      if (!n) return;
      m.position.copy(n);
      const show = corr > 0.001;
      m.visible = show;
      m.scale.setScalar(Math.max(0.001, lerp(0.6, 1.3, corr) * lerp(1, 0.5, esc)));
      m.rotation.set(0, t * 0.4 + k, 0);
    });

    /* Edges draw in one after another */
    EDGES.forEach(([a, b], k) => {
      const na = nodes[a];
      const nb = nodes[b];
      if (!na || !nb) return;
      const grow = smooth(range(0.53 + k * 0.035, 0.66 + k * 0.035, p));
      edgePos.setXYZ(k * 2, na.x, na.y, na.z);
      edgePos.setXYZ(k * 2 + 1, lerp(na.x, nb.x, grow), lerp(na.y, nb.y, grow), lerp(na.z, nb.z, grow));
    });
    edgePos.needsUpdate = true;
    edgeMat.opacity = 0.8;

    /* Card */
    card.visible = cardIn > 0.001;
    card.scale.setScalar(Math.max(0.001, cardIn));
    card.rotation.set(-0.06 * (1 - esc), 0.12 * (1 - esc), 0);
    cardMat.opacity = 0.95 * clamp01(cardIn);
    borderMat.opacity = 0.65 * clamp01(cardIn);
    barMat.opacity = clamp01(cardIn);

    scene.updateMatrixWorld();

    /* Card text types in with scroll */
    glyphs.begin();
    if (card.visible) {
      let shown = typed * totalChars;
      LINES.forEach((line, li) => {
        const locals = textLocals[li] ?? [];
        for (let j = 0; j < line.text.length; j++) {
          const ch = line.text[j] ?? ' ';
          const a = clamp01(shown);
          shown -= 1;
          const local = locals[j];
          if (ch === ' ' || a <= 0 || !local) continue;
          tmp.multiplyMatrices(card.matrixWorld, local);
          glyphs.set(tmp, ch, line.rgb[0], line.rgb[1], line.rgb[2], a);
        }
      });
    }
    glyphs.commit();
  };

  return {
    id: 'soc',
    el,
    chapter,
    scene,
    camera,
    update,
    resize() {
      baseDist = fitDistance();
    },
    current: 0,
    ready: false,
    presence: 0,
    presenceTarget: 1,
  };
}
