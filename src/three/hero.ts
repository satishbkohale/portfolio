/**
 * Hero scene: "Encrypt and lock".
 *
 *   p 0.00  plaintext    readable data packets float in space
 *   p 0.12  encrypting   characters flip to ciphertext, packet by packet
 *   p 0.45  compress     packets converge into one encrypted block
 *   p 0.64  lock         the block slides into the padlock, the shackle shuts
 *   p 0.86  locked       one mint pulse, the keyhole glows
 *
 * Everything is a pure function of p (plus a slow ambient time t), so scrolling
 * back plays it in reverse. All geometry is procedural: no model files.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  Scene,
  Shape,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Chapter } from '../scripts/chapters';
import type { Engine, View } from './engine';
import { CIPHER, GLYPH_ASPECT, GlyphLayer } from './glyphs';
import { glowTexture, matcaps } from './materials';
import { ACCENT, ACCENT_RGB, BRIGHT_RGB, EDGE } from './palette';

const TEXT_RGB = [0.91, 0.918, 0.93] as const;

/* Easing and ranges -------------------------------------------------------- */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const range = (a: number, b: number, p: number) => clamp01((p - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeOutBack = (x: number) => (x <= 0 ? 0 : 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic 0-1 hash, so a scrubbed shuffle replays identically. */
function hash(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const cipherChar = (a: number, b: number, c: number) => CIPHER[Math.floor(hash(a, b, c) * CIPHER.length)] ?? 'A';

/* Shapes ------------------------------------------------------------------- */
function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function outline(shape: Shape, z: number, material: LineBasicMaterial): LineLoop {
  const pts = shape.getPoints(10).map((p) => new Vector3(p.x, p.y, z));
  return new LineLoop(new BufferGeometry().setFromPoints(pts), material);
}

/* Layout ------------------------------------------------------------------- */
const LOCK = new Vector3(1.25, -0.7, 0);
const BODY_W = 2.0;
const BODY_H = 1.6;
const BODY_D = 0.5;
const BEVEL = 0.08;
const FRONT_Z = BODY_D / 2 + BEVEL;
const SHACKLE_R = 0.6;
const LEG = 0.85;
const OPEN_ANGLE = 1.35;
const CONVERGE = new Vector3(-1.35, 0.25, 0.3);
const FRAME_CENTER = new Vector3(-0.6, 0.25, 0);
const FRAME_HALF = { w: 3.75, h: 3.4 };

/** Clearly fake sample data: no real names, numbers or paths. */
const PACKETS = [
  { text: 'user=demo_user', pos: [-2.2, 2.0, 0.4], rot: 0.28 },
  { text: 'role=sample', pos: [-0.5, 2.9, -1.4], rot: 0.18 },
  { text: 'GET /example', pos: [-2.9, 0.65, -0.9], rot: 0.35 },
  { text: 'pin=0000', pos: [-1.7, -0.75, 1.0], rot: 0.22 },
  { text: 'card 0000-0000', pos: [-2.7, -2.15, -0.2], rot: 0.3 },
] as const;

const PANEL_W = 2.7;
const PANEL_H = 0.56;
const GW = 0.15;
const GH = GW / GLYPH_ASPECT;
const CUBE = 0.95;
const CUBE_LABEL = 'AES-256';

export async function createHero(engine: Engine, el: HTMLElement, chapter: Chapter): Promise<View> {
  const lite = engine.tier === 'lite';
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);

  const { silver, graphite, accent } = matcaps();

  /* Dust: faint particles for depth */
  const dustCount = lite ? 110 : 260;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = lerp(-5.2, 3.8, hash(i, 1, 7));
    dustPos[i * 3 + 1] = lerp(-3.2, 3.9, hash(i, 2, 7));
    dustPos[i * 3 + 2] = lerp(-3.5, 1.8, hash(i, 3, 7));
  }
  const dust = new Points(
    new BufferGeometry().setAttribute('position', new Float32BufferAttribute(dustPos, 3)),
    new PointsMaterial({ color: ACCENT, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  scene.add(dust);

  /* Floor dial under the lock */
  const dial = new Group();
  dial.position.set(LOCK.x, LOCK.y - 1.3, 0);
  dial.rotation.x = -Math.PI / 2;
  const circlePts = Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    return new Vector3(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0);
  });
  dial.add(
    new Line(new BufferGeometry().setFromPoints(circlePts), new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16 })),
  );
  const ticks: number[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = i % 6 === 0 ? 2.0 : 2.05;
    ticks.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * 2.18, Math.sin(a) * 2.18, 0);
  }
  dial.add(
    new LineSegments(
      new BufferGeometry().setAttribute('position', new Float32BufferAttribute(ticks, 3)),
      new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22 }),
    ),
  );
  const arcPts = Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI * 0.5;
    return new Vector3(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0.001);
  });
  const arcMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.85 });
  dial.add(new Line(new BufferGeometry().setFromPoints(arcPts), arcMat));
  scene.add(dial);

  /* Padlock */
  const lock = new Group();
  lock.position.copy(LOCK);
  scene.add(lock);

  const bodyShape = roundedRect(BODY_W, BODY_H, 0.24);
  const bodyGeo = new ExtrudeGeometry(bodyShape, {
    depth: BODY_D,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
    curveSegments: 10,
  });
  bodyGeo.translate(0, 0, -BODY_D / 2);
  const bodyMat = new MeshMatcapMaterial({ matcap: graphite });
  lock.add(new Mesh(bodyGeo, bodyMat));
  const edgeMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.4 });
  lock.add(outline(bodyShape, FRONT_Z + 0.002, edgeMat));
  const seamMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.25 });
  const seam = new Line(
    new BufferGeometry().setFromPoints([
      new Vector3(-BODY_W / 2 + 0.1, 0.38, FRONT_Z + 0.003),
      new Vector3(BODY_W / 2 - 0.1, 0.38, FRONT_Z + 0.003),
    ]),
    seamMat,
  );
  lock.add(seam);

  const keyGeo = mergeGeometries([
    new CircleGeometry(0.14, 28).translate(0, -0.02, 0),
    new PlaneGeometry(0.09, 0.32).translate(0, -0.2, 0),
  ]);
  const keyMat = new MeshBasicMaterial({ color: EDGE });
  const keyhole = new Mesh(keyGeo, keyMat);
  keyhole.position.z = FRONT_Z + 0.004;
  lock.add(keyhole);

  const shackleGeo = mergeGeometries([
    new TorusGeometry(SHACKLE_R, 0.1, 16, 40, Math.PI).translate(-SHACKLE_R, 0, 0),
    new CylinderGeometry(0.1, 0.1, LEG, 16).translate(0, -LEG / 2, 0),
    new CylinderGeometry(0.1, 0.1, LEG, 16).translate(-2 * SHACKLE_R, -LEG / 2, 0),
  ]);
  const shackleMat = new MeshMatcapMaterial({ matcap: silver });
  const shackle = new Mesh(shackleGeo, shackleMat);
  const pivot = new Group();
  pivot.add(shackle);
  lock.add(pivot);
  const pivotX = SHACKLE_R;
  const bodyTop = BODY_H / 2 + BEVEL;
  const pivotClosedY = bodyTop - 0.4 + LEG;

  /* Glow and pulse */
  const glow = new Sprite(
    new SpriteMaterial({ map: glowTexture(), color: ACCENT, blending: AdditiveBlending, transparent: true, depthWrite: false }),
  );
  glow.scale.setScalar(5.5);
  glow.position.set(LOCK.x, LOCK.y + 0.2, -0.8);
  scene.add(glow);

  const pulseMat = new MeshBasicMaterial({ color: EDGE, transparent: true, blending: AdditiveBlending, depthWrite: false });
  const pulse = new Mesh(new RingGeometry(1, 1.04, 96), pulseMat);
  pulse.position.set(0, 0, FRONT_Z + 0.05);
  lock.add(pulse);

  /* Packets */
  // All five packets on every tier, so the 2D packets picture matches.
  const order = [0, 1, 2, 3, 4];
  const panelGeo = new RoundedBoxGeometry(PANEL_W, PANEL_H, 0.06, 2, 0.06);
  const panelShape = roundedRect(PANEL_W, PANEL_H, 0.08);
  const packets = order.map((i, k) => {
    const def = PACKETS[i] ?? PACKETS[0];
    const mat = new MeshMatcapMaterial({ matcap: graphite, color: '#9fb0bf', transparent: true, opacity: 0.92 });
    const lineMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.45 });
    const g = new Group();
    g.add(new Mesh(panelGeo, mat));
    g.add(outline(panelShape, 0.032, lineMat));
    scene.add(g);
    const text = def.text;
    const cipher = [...text].map((_, j) => cipherChar(i, j, 99));
    const x0 = -PANEL_W / 2 + 0.2 + GW / 2;
    const locals = [...text].map((_, j) =>
      new Matrix4().compose(new Vector3(x0 + j * GW, 0, 0.034), new Quaternion(), new Vector3(GW, GH, 1)),
    );
    return { g, mat, lineMat, text, cipher, locals, start: new Vector3(...def.pos), rot: def.rot, seed: i, k };
  });

  /* Encrypted block */
  const cubeMat = new MeshMatcapMaterial({ matcap: accent });
  const cube = new Group();
  cube.add(new Mesh(new RoundedBoxGeometry(CUBE, CUBE, CUBE, 3, 0.1), cubeMat));
  const cubeEdgeMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.85 });
  const half = CUBE / 2;
  const corners = [-half, half];
  const cubeEdges: number[] = [];
  for (const a of corners)
    for (const b of corners) {
      cubeEdges.push(-half, a, b, half, a, b, a, -half, b, a, half, b, a, b, -half, a, b, half);
    }
  cube.add(new LineSegments(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(cubeEdges, 3)), cubeEdgeMat));
  scene.add(cube);
  const cubeGW = 0.1;
  const cubeLocals = [...CUBE_LABEL].map((_, j) =>
    new Matrix4().compose(
      new Vector3((j - (CUBE_LABEL.length - 1) / 2) * cubeGW, 0, half + 0.003),
      new Quaternion(),
      new Vector3(cubeGW, cubeGW / GLYPH_ASPECT, 1),
    ),
  );

  const glyphs = await GlyphLayer.create(96);
  scene.add(glyphs.mesh);

  /* Orbit labels (DOM), placed by projecting 3D orbit points */
  const rings = [
    { r: 2.35, tiltZ: -0.16, period: 70, spin: 1.4 },
    { r: 3.25, tiltZ: 0.12, period: -95, spin: -1.1 },
  ];
  const labels = [...el.querySelectorAll<HTMLElement>('.orbit__tag')].map((node) => ({
    node,
    ring: rings[Number(node.dataset.ring)] ?? rings[0],
    phase: Number(node.dataset.phase) || 0,
    front: false,
  }));
  // The 3D scene places the labels from here on; clear the 2D loop's occlusion.
  for (const l of labels) l.node.removeAttribute('data-hidden');
  const ORBIT_CENTER = new Vector3(LOCK.x, LOCK.y + 0.15, 0);
  const INCLINE = 0.36;

  /* Camera fit */
  let viewW = 1;
  let viewH = 1;
  const fitDistance = () => {
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    return Math.max(FRAME_HALF.h / tan, FRAME_HALF.w / (tan * camera.aspect));
  };
  let baseDist = fitDistance();

  const tmp = new Matrix4();
  const v = new Vector3();
  const lookFrom = new Vector3();
  const lookAt = new Vector3();
  const lockFocus = new Vector3(LOCK.x - 0.2, LOCK.y + 0.2, 0);
  const cubeTarget = new Vector3();

  const update = (p: number, t: number) => {
    /* Camera: wide on the packets, easing in on the lock at the end */
    const dolly = smooth(range(0.6, 1, p));
    lookAt.lerpVectors(FRAME_CENTER, lockFocus, dolly * 0.55);
    const dist = baseDist * lerp(1.04, 0.86, dolly);
    lookFrom.set(lookAt.x + Math.sin(t * 0.07) * 0.25, lookAt.y + 1.1, lookAt.z + dist);
    camera.position.copy(lookFrom);
    camera.lookAt(lookAt);

    const comp = smooth(range(0.45, 0.62, p));
    const appear = easeOutBack(range(0.52, 0.66, p));
    const move = smooth(range(0.66, 0.79, p));
    const insert = smooth(range(0.77, 0.84, p));
    const close = smooth(range(0.76, 0.88, p));
    const locked = range(0.88, 1, p);

    /* Lock */
    lock.rotation.y = lerp(-0.55, -0.1, smooth(range(0.4, 0.95, p))) + Math.sin(t * 0.5) * 0.05;
    lock.position.y = LOCK.y + Math.sin(t * 0.8) * 0.03;
    const swing = 1 - clamp01(close / 0.6);
    const lift = 1 - clamp01((close - 0.6) / 0.4);
    pivot.position.set(pivotX, pivotClosedY + 0.7 * lift, 0);
    pivot.rotation.y = OPEN_ANGLE * smooth(swing);
    const shine = Math.max(insert, locked);
    keyMat.color.copy(EDGE).multiplyScalar(lerp(0.28, 1, shine));
    edgeMat.opacity = lerp(0.35, 0.9, shine);
    seamMat.opacity = lerp(0.2, 0.5, shine);
    pulse.scale.setScalar(1 + 1.5 * locked);
    pulseMat.opacity = locked > 0 && locked < 1 ? 0.85 * (1 - locked) : 0;
    // The blue is darker than a light accent, so the glow runs stronger.
    (glow.material as SpriteMaterial).opacity = 0.26 + 0.5 * shine + Math.sin(t * 1.1) * 0.03;

    dial.rotation.z = t * 0.08 + p * 1.6;
    arcMat.opacity = lerp(0.4, 0.95, shine);
    dust.rotation.y = t * 0.012;

    /* Packets: float, then converge into the block */
    for (const pk of packets) {
      const bob = Math.sin(t * 0.6 + pk.seed * 1.7) * 0.09;
      pk.g.position.set(lerp(pk.start.x, CONVERGE.x, comp), lerp(pk.start.y + bob, CONVERGE.y, comp), lerp(pk.start.z, CONVERGE.z, comp));
      pk.g.rotation.set(Math.sin(t * 0.4 + pk.seed) * 0.05 * (1 - comp), pk.rot * (1 - comp), 0);
      pk.g.scale.setScalar(lerp(1, 0.18, comp));
      const fade = 1 - comp * comp;
      pk.g.visible = fade > 0.01;
      pk.mat.opacity = 0.92 * fade;
      pk.lineMat.opacity = lerp(0.4, 0.8, smooth(range(0.12, 0.45, p))) * fade;
    }

    /* Block: appears, travels into the lock, disappears inside it */
    cube.visible = appear > 0.001 && insert < 0.999;
    lock.localToWorld(cubeTarget.set(0, -0.05, FRONT_Z + 0.7));
    cube.position.lerpVectors(CONVERGE, cubeTarget, move);
    cube.position.z -= insert * (FRONT_Z + 0.7);
    cube.scale.setScalar(Math.max(0.001, appear * lerp(1, 0.55, move) * (1 - insert * 0.4)));
    cube.rotation.set(0.35 * (1 - move), (1 - move) * 1.3 + t * 0.25 * (1 - move), 0);
    cubeMat.color.setScalar(lerp(1, 1.6, move));

    scene.updateMatrixWorld();

    /* Glyphs */
    glyphs.begin();
    for (const pk of packets) {
      if (!pk.g.visible) continue;
      const fade = 1 - comp * comp;
      const n = pk.text.length;
      for (let j = 0; j < n; j++) {
        const u = (pk.k / Math.max(1, packets.length - 1)) * 0.35 + (j / Math.max(1, n - 1)) * 0.65;
        const s0 = 0.12 + u * 0.27;
        const s1 = s0 + 0.045;
        let ch: string;
        let rgb: readonly [number, number, number];
        if (p < s0) {
          ch = pk.text[j] ?? ' ';
          rgb = TEXT_RGB;
        } else if (p < s1) {
          ch = cipherChar(pk.seed, j, Math.floor(p * 600));
          rgb = BRIGHT_RGB;
        } else {
          ch = pk.cipher[j] ?? 'A';
          // Living ciphertext: a few characters reshuffle now and then.
          if (t > 0 && hash(pk.seed, j, Math.floor(t * 3)) < 0.05) ch = cipherChar(pk.seed, j, Math.floor(t * 9));
          rgb = ACCENT_RGB;
        }
        if (ch === ' ') continue;
        const local = pk.locals[j];
        if (!local) continue;
        tmp.multiplyMatrices(pk.g.matrixWorld, local);
        glyphs.set(tmp, ch, rgb[0], rgb[1], rgb[2], fade);
      }
    }
    if (cube.visible) {
      const a = clamp01(appear) * (1 - insert);
      cubeLocals.forEach((local, j) => {
        tmp.multiplyMatrices(cube.matrixWorld, local);
        glyphs.set(tmp, CUBE_LABEL[j] ?? ' ', ACCENT_RGB[0], ACCENT_RGB[1], ACCENT_RGB[2], a);
      });
    }
    glyphs.commit();

    /* Orbit labels */
    for (const l of labels) {
      const ring = l.ring ?? rings[0];
      if (!ring) continue;
      const angle = Math.PI * 2 * (l.phase + t / ring.period) + p * ring.spin;
      const r = ring.r * (viewW < 420 ? 0.8 : 1);
      v.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      v.applyAxisAngle(X_AXIS, INCLINE).applyAxisAngle(Z_AXIS, ring.tiltZ).add(ORBIT_CENTER);
      const depth = clamp01((v.z - ORBIT_CENTER.z) / r / 2 + 0.5);
      v.project(camera);
      const x = ((v.x + 1) / 2) * viewW;
      const y = ((1 - v.y) / 2) * viewH;
      l.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(0.86 + 0.14 * depth).toFixed(3)})`;
      l.node.style.setProperty('--depth', (depth * depth).toFixed(3));
      const front = depth > 0.5;
      if (front !== l.front) {
        l.front = front;
        l.node.toggleAttribute('data-front', front);
      }
    }
  };

  return {
    id: 'hero',
    el,
    chapter,
    scene,
    camera,
    update,
    resize(width, height) {
      viewW = width;
      viewH = height;
      baseDist = fitDistance();
      // Very narrow figures: only the inner ring's labels, so none crowd or clip.
      for (const l of labels) l.node.hidden = width < 360 && l.node.dataset.ring === '1';
    },
    current: 0,
    startAtTarget: true,
    ready: false,
  };
}

const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);
