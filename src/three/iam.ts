/**
 * IAM scene: "Control". Motion language: smooth and gate-like.
 *
 *   p 0.00  request    an identity badge appears with its attributes
 *   p 0.12  evaluate   it glides down the pass lane, pausing at four gates
 *                      (MFA, device posture, least privilege, conditional
 *                      access); each scans it and turns mint
 *   p 0.45  granted    the door slides open; a time-limited session appears
 *                      with a countdown ring
 *   p 0.60  vaulted    privileged session: the credential (masked, never
 *                      shown) drops into the vault, which closes; the session
 *                      is marked as recorded
 *   p 0.78  denied     second beat, lower lane: the same user on an unmanaged
 *                      device passes MFA, is stopped amber at the posture
 *                      gate; the door stays shut: "ACCESS DENIED"
 *
 * Pure function of p (plus ambient time t), so scrolling up reverses it and
 * resets the request. Mint for pass, amber for fail only. Sample data only.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
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
  Scene,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Chapter } from '../scripts/chapters';
import type { Engine, View } from './engine';
import { GlyphLayer, lineLocals } from './glyphs';
import { matcaps } from './materials';
import { ACCENT, ACCENT_RGB, AMBER, AMBER_RGB, EDGE, type RGB, tinted } from './palette';

/* Lit solids (gate and door frames): matcap shading darkens the colour, so
   they take the blue lifted halfway to the tint. */
const LIT = ACCENT.clone().lerp(EDGE, 0.5);
/* Badges: silver with a hint of the accent. */
const BADGE = tinted('#d6dde5', 0.2);
const NEUTRAL = new Color('#8a96a3');
const TEXT_RGB: RGB = [0.91, 0.918, 0.93];
const DIM_RGB: RGB = [0.55, 0.58, 0.63];

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

/* Layout (scene units). Lanes run along x; gates are frames across them. */
const LANE_A = 0.55; // floor of the pass lane
const LANE_B = -1.85; // floor of the fail lane
const START_X = -2.95;
const GATE_X = [-2.3, -1.0, 0.3, 1.6];
const GATE_LABELS = ['MFA', 'DEVICE', 'PRIVILEGE', 'CONDITIONAL'];
const DOOR_X = 2.95;
const GATE_W = 1.1; // across the lane (z)
const GATE_H = 1.35;
const TOKEN_UP = 0.55; // badge height above the lane floor
const FRAME_CENTER = new Vector3(0.3, -0.15, 0);
const FRAME_HALF = { w: 4.35, h: 2.6 };
const VIEW_DIR = new Vector3(-0.42, 0.4, 1).normalize();

/** Token path along the pass lane: travel, then a short scan pause at each gate. */
const PASS_KEYS: [number, number][] = [
  [0, START_X],
  [0.16, GATE_X[0] ?? 0],
  [0.22, GATE_X[0] ?? 0],
  [0.38, GATE_X[1] ?? 0],
  [0.44, GATE_X[1] ?? 0],
  [0.6, GATE_X[2] ?? 0],
  [0.66, GATE_X[2] ?? 0],
  [0.82, GATE_X[3] ?? 0],
  [0.88, GATE_X[3] ?? 0],
  [1, DOOR_X - 0.8],
];
/** Fail lane: passes MFA, then stops just short of the posture gate. */
const FAIL_KEYS: [number, number][] = [
  [0, START_X],
  [0.35, GATE_X[0] ?? 0],
  [0.45, GATE_X[0] ?? 0],
  [0.85, (GATE_X[1] ?? 0) - 0.55],
  [1, (GATE_X[1] ?? 0) - 0.55],
];
function along(keys: [number, number][], e: number): number {
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1] = keys[i] ?? [1, 0];
    const [t0, x0] = keys[i - 1] ?? [0, 0];
    if (e <= t1) return lerp(x0, x1, smooth(range(t0, t1, e)));
  }
  return keys.at(-1)?.[1] ?? 0;
}

/** Card text, sample data only. */
const PASS_CARD = [
  { text: 'user    demo.user', rgb: TEXT_RGB },
  { text: 'role    analyst', rgb: TEXT_RGB },
  { text: 'device  managed', rgb: ACCENT_RGB },
  { text: 'risk    low', rgb: ACCENT_RGB },
];
const FAIL_CARD = [
  { text: 'user    demo.user', rgb: TEXT_RGB },
  { text: 'role    analyst', rgb: TEXT_RGB },
  { text: 'device  unmanaged', rgb: AMBER_RGB },
  { text: 'risk    medium', rgb: AMBER_RGB },
];

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

/** A frame (rounded rectangle with a hole), standing across the lane. */
function frameGeometry(w: number, h: number, bar: number): ExtrudeGeometry {
  const outer = roundedRect(w, h, 0.12);
  outer.holes.push(roundedRect(w - 2 * bar, h - 2 * bar, 0.06));
  const g = new ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.035);
  g.rotateY(Math.PI / 2);
  return g;
}

function circlePoints(r: number, n: number): Vector3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI / 2 - (i / n) * Math.PI * 2;
    return new Vector3(Math.cos(a) * r, Math.sin(a) * r, 0);
  });
}

export async function createIam(engine: Engine, el: HTMLElement, chapter: Chapter): Promise<View> {
  const lite = engine.tier === 'lite';
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const { silver, graphite, accent } = matcaps();

  /* Lanes: two rails each, plus a faint centre guide */
  const rails = (y: number) => {
    const pts: number[] = [];
    for (const z of [-0.55, 0.55]) pts.push(START_X - 0.4, y, z, DOOR_X, y, z);
    for (let x = START_X - 0.3; x < DOOR_X - 0.2; x += 0.5) pts.push(x, y, 0, x + 0.22, y, 0);
    return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pts, 3));
  };
  const railA = new LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.3 });
  const railB = new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 });
  scene.add(new LineSegments(rails(LANE_A), railA));
  scene.add(new LineSegments(rails(LANE_B), railB));

  /* Dust */
  const dustN = lite ? 70 : 140;
  const dust = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dust[i * 3] = lerp(-5, 5.5, hash(i, 21));
    dust[i * 3 + 1] = lerp(-2.6, 3.4, hash(i, 22));
    dust[i * 3 + 2] = lerp(-3, 1.5, hash(i, 23));
  }
  const dustPts = new Points(
    new BufferGeometry().setAttribute('position', new Float32BufferAttribute(dust, 3)),
    new PointsMaterial({ color: ACCENT, size: 0.025, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  scene.add(dustPts);

  /* Gates: one frame and one scan plane per gate, on both lanes */
  const gateGeo = frameGeometry(GATE_W, GATE_H, 0.08);
  const scanGeo = new PlaneGeometry(GATE_W - 0.2, GATE_H - 0.2).rotateY(Math.PI / 2);
  const makeGate = (x: number, floor: number) => {
    const mat = new MeshMatcapMaterial({ matcap: silver, color: NEUTRAL.clone(), transparent: true });
    const frame = new Mesh(gateGeo, mat);
    frame.position.set(x, floor + GATE_H / 2, 0);
    const scanMat = new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const scan = new Mesh(scanGeo, scanMat);
    scan.position.copy(frame.position);
    scene.add(frame, scan);
    return { mat, scanMat };
  };
  const gatesA = GATE_X.map((x) => makeGate(x, LANE_A));
  const gatesB = GATE_X.map((x) => makeGate(x, LANE_B));

  /* Doors: a frame with two panels that slide apart across the lane */
  const doorGeo = frameGeometry(1.3, 1.75, 0.1);
  const panelGeo = new RoundedBoxGeometry(0.1, 1.55, 0.56, 2, 0.04);
  const makeDoor = (floor: number) => {
    const frameMat = new MeshMatcapMaterial({ matcap: silver, color: NEUTRAL.clone(), transparent: true });
    const frame = new Mesh(doorGeo, frameMat);
    frame.position.set(DOOR_X, floor + 0.875, 0);
    const panelMat = new MeshMatcapMaterial({ matcap: graphite, transparent: true });
    const left = new Mesh(panelGeo, panelMat);
    const right = new Mesh(panelGeo, panelMat);
    scene.add(frame, left, right);
    const place = (open: number) => {
      left.position.set(DOOR_X, floor + 0.875, -0.29 - open * 0.55);
      right.position.set(DOOR_X, floor + 0.875, 0.29 + open * 0.55);
    };
    place(0);
    return { frameMat, panelMat, place };
  };
  const doorA = makeDoor(LANE_A);
  const doorB = makeDoor(LANE_B);

  /* Resource behind door A: a server stack, with the vault on top */
  const serverMat = new MeshMatcapMaterial({ matcap: accent });
  const serverGeo = new RoundedBoxGeometry(0.8, 0.24, 0.85, 2, 0.04);
  for (let i = 0; i < 3; i++) {
    const s = new Mesh(serverGeo, serverMat);
    s.position.set(DOOR_X + 1.25, LANE_A + 0.16 + i * 0.3, 0);
    scene.add(s);
  }
  const vaultMat = new MeshMatcapMaterial({ matcap: graphite });
  const vault = new Mesh(new RoundedBoxGeometry(0.7, 0.4, 0.7, 2, 0.05), vaultMat);
  vault.position.set(DOOR_X + 1.25, LANE_A + 1.3, 0);
  scene.add(vault);
  const lidPivot = new Group();
  lidPivot.position.set(DOOR_X + 1.25, LANE_A + 1.5, -0.35);
  const lid = new Mesh(new RoundedBoxGeometry(0.74, 0.07, 0.74, 2, 0.03), vaultMat);
  lid.position.set(0, 0.035, 0.37);
  lidPivot.add(lid);
  scene.add(lidPivot);
  const vaultLight = new MeshBasicMaterial({ color: EDGE, transparent: true, opacity: 0 });
  const vaultLed = new Mesh(new SphereGeometry(0.045, 12, 8), vaultLight);
  vaultLed.position.set(DOOR_X + 1.25 - 0.36, LANE_A + 1.3, 0.2);
  scene.add(vaultLed);

  /* Billboards (face the camera): tokens, cards, labels */
  const billboards: Group[] = [];
  const billboard = () => {
    const g = new Group();
    billboards.push(g);
    scene.add(g);
    return g;
  };

  const badgeGeo = new RoundedBoxGeometry(0.5, 0.5, 0.14, 3, 0.1);
  const makeToken = (borderColor: Color) => {
    const g = billboard();
    const mat = new MeshMatcapMaterial({ matcap: silver, color: BADGE.clone(), transparent: true });
    g.add(new Mesh(badgeGeo, mat));
    const ringMat = new LineBasicMaterial({ color: borderColor, transparent: true });
    g.add(new LineLoop(new BufferGeometry().setFromPoints(circlePoints(0.42, 48)), ringMat));
    return { g, mat, ringMat };
  };
  const tokenA = makeToken(EDGE);
  const tokenB = makeToken(AMBER);

  const cardGeo = new RoundedBoxGeometry(1.75, 0.92, 0.04, 2, 0.04);
  const cardOutline = (w: number, h: number, mat: LineBasicMaterial) =>
    new LineLoop(
      new BufferGeometry().setFromPoints([
        new Vector3(-w / 2, -h / 2, 0.022),
        new Vector3(w / 2, -h / 2, 0.022),
        new Vector3(w / 2, h / 2, 0.022),
        new Vector3(-w / 2, h / 2, 0.022),
      ]),
      mat,
    );
  const makeCard = (color: Color) => {
    const g = billboard();
    const mat = new MeshMatcapMaterial({ matcap: graphite, transparent: true });
    const border = new LineBasicMaterial({ color, transparent: true });
    g.add(new Mesh(cardGeo, mat), cardOutline(1.75, 0.92, border));
    return { g, mat, border };
  };
  const cardA = makeCard(EDGE);
  const cardB = makeCard(AMBER);
  const cardLines = (lines: { text: string }[]) => lines.map((l, i) => lineLocals(l.text, -0.76, 0.3 - i * 0.2, 0.024, 0.085));
  const cardALocals = cardLines(PASS_CARD);
  const cardBLocals = cardLines(FAIL_CARD);

  /* Session card with countdown ring, REC indicator */
  const session = billboard();
  const sessionMat = new MeshMatcapMaterial({ matcap: graphite, transparent: true });
  const sessionBorder = new LineBasicMaterial({ color: EDGE, transparent: true });
  session.add(new Mesh(new RoundedBoxGeometry(2.7, 0.95, 0.04, 2, 0.04), sessionMat), cardOutline(2.7, 0.95, sessionBorder));
  const trackMat = new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.15 });
  const track = new Line(new BufferGeometry().setFromPoints(circlePoints(0.27, 64)), trackMat);
  track.position.set(-1.0, 0, 0.03);
  const ringMat = new LineBasicMaterial({ color: EDGE, transparent: true });
  const ringGeo = new BufferGeometry().setFromPoints(circlePoints(0.27, 64));
  const ring = new Line(ringGeo, ringMat);
  ring.position.set(-1.0, 0, 0.032);
  session.add(track, ring);
  const recMat = new MeshBasicMaterial({ color: EDGE, transparent: true, opacity: 0 });
  const rec = new Mesh(new SphereGeometry(0.05, 12, 8), recMat);
  rec.position.set(0.98, 0.21, 0.04);
  session.add(rec);
  const sessionLines = [
    { text: 'SESSION 15:00', gw: 0.105, y: 0.21, rgb: TEXT_RGB },
    { text: 'read-only / sample', gw: 0.075, y: -0.05, rgb: DIM_RGB },
    { text: 'vaulted / recorded', gw: 0.075, y: -0.27, rgb: ACCENT_RGB },
  ].map((l) => ({ ...l, locals: lineLocals(l.text, -0.6, l.y, 0.034, l.gw) }));
  const recLocals = lineLocals('REC', 1.06, 0.21, 0.034, 0.07);

  /* Credential chip: masked, travels into the vault */
  const chip = billboard();
  const chipMat = new MeshMatcapMaterial({ matcap: graphite, transparent: true });
  const chipBorder = new LineBasicMaterial({ color: EDGE, transparent: true });
  chip.add(new Mesh(new RoundedBoxGeometry(1.5, 0.32, 0.04, 2, 0.04), chipMat), cardOutline(1.5, 0.32, chipBorder));
  const chipLocals = lineLocals('secret ********', -0.66, 0, 0.024, 0.085);

  /* Gate labels and the denied message */
  const labels = GATE_X.map((x, i) => {
    const g = billboard();
    // Labels sit under the lane, so the identity card never covers them.
    g.position.set(x, LANE_A - 0.3, 0.75);
    const text = GATE_LABELS[i] ?? '';
    return { g, text, locals: lineLocals(text, -(text.length * 0.085) / 2, 0, 0, 0.085) };
  });
  const denied = billboard();
  denied.position.set(DOOR_X + 1.3, LANE_B + 0.9, 0);
  const deniedLocals = lineLocals('ACCESS DENIED', -0.66, 0, 0, 0.1);

  const glyphs = await GlyphLayer.create(360);
  scene.add(glyphs.mesh);

  /* Camera */
  const fitDistance = () => {
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    return Math.max(FRAME_HALF.h / tan, FRAME_HALF.w / (tan * camera.aspect));
  };
  let baseDist = fitDistance();

  const tmp = new Matrix4();
  const put = (g: Group, local: Matrix4, text: string, j: number, rgb: RGB, a: number) => {
    tmp.multiplyMatrices(g.matrixWorld, local);
    glyphs.set(tmp, text[j] ?? ' ', rgb[0], rgb[1], rgb[2], a);
  };
  const writeLine = (g: Group, locals: Matrix4[], text: string, rgb: RGB, a: number, typed = 1) => {
    const n = Math.floor(typed * text.length + 0.0001);
    for (let j = 0; j < text.length && j < n; j++) {
      const local = locals[j];
      if (local && text[j] !== ' ') put(g, local, text, j, rgb, a);
    }
  };

  const update = (p: number, t: number, presence = 1) => {
    const arrive = smooth(presence);
    const appear = easeOutBack(range(0, 0.08, p));
    const e = range(0.12, 0.45, p);
    const grant = smooth(range(0.45, 0.56, p));
    const sessionIn = easeOutBack(range(0.5, 0.6, p));
    const chipIn = smooth(range(0.6, 0.64, p));
    const chipMove = smooth(range(0.64, 0.72, p));
    const lidShut = smooth(range(0.7, 0.76, p));
    const vaultText = range(0.72, 0.78, p);
    const laneB = smooth(range(0.74, 0.8, p));
    const eB = range(0.8, 0.93, p);
    const deny = smooth(range(0.88, 0.95, p));

    /* Camera with fly-in */
    const dist = baseDist * lerp(1.65, 1, arrive);
    camera.position.copy(FRAME_CENTER).addScaledVector(VIEW_DIR, dist);
    camera.position.x += Math.sin(t * 0.05) * 0.25 + (1 - arrive) * 2.2;
    camera.position.y += (1 - arrive) * 1.2;
    camera.lookAt(FRAME_CENTER);
    camera.updateMatrixWorld();
    for (const b of billboards) b.quaternion.copy(camera.quaternion);
    dustPts.rotation.y = t * 0.01;

    /* Pass lane: token travels and gates light up in sequence */
    const xA = along(PASS_KEYS, e);
    const intoDoor = smooth(range(0.47, 0.56, p));
    tokenA.g.position.set(lerp(xA, DOOR_X + 0.3, intoDoor), LANE_A + TOKEN_UP + Math.sin(t * 1.2) * 0.02, 0);
    tokenA.g.scale.setScalar(Math.max(0.001, appear * lerp(1, 0.3, intoDoor)));
    tokenA.mat.opacity = 1 - intoDoor;
    tokenA.ringMat.opacity = 0.9 * (1 - intoDoor);
    // Cards float just in front of the gates, so no frame bar crosses their text.
    cardA.g.position.set(tokenA.g.position.x, LANE_A + TOKEN_UP + 0.95, 0.75);
    cardA.g.scale.setScalar(Math.max(0.001, appear * (1 - intoDoor)));
    cardA.mat.opacity = 0.95;
    cardA.border.opacity = 0.65;

    GATE_X.forEach((_, i) => {
      const a = PASS_KEYS[1 + i * 2]?.[0] ?? 0;
      const l = PASS_KEYS[2 + i * 2]?.[0] ?? 0;
      const lit = smooth(range(l - 0.03, l + 0.02, e));
      const scan = Math.sin(Math.PI * range(a - 0.04, l + 0.04, e));
      const gate = gatesA[i];
      if (!gate) return;
      gate.mat.color
        .copy(NEUTRAL)
        .lerp(LIT, lit)
        .multiplyScalar(lerp(1, 1.35, lit));
      gate.scanMat.color.copy(ACCENT);
      gate.scanMat.opacity = 0.6 * scan + 0.08 * lit;
    });
    railA.opacity = lerp(0.18, 0.4, smooth(e));

    /* Granted: door opens, resource lights, session with countdown ring */
    doorA.place(grant);
    doorA.frameMat.color.copy(NEUTRAL).lerp(LIT, grant);
    serverMat.color.setScalar(lerp(0.7, 1.35, grant));
    session.position.set(DOOR_X + 0.35, LANE_A + 2.45, 0);
    session.scale.setScalar(Math.max(0.001, sessionIn));
    sessionMat.opacity = 0.95 * clamp01(sessionIn);
    sessionBorder.opacity = 0.7 * clamp01(sessionIn);
    // The countdown ring drains on a slow loop (ambient time).
    const left = 1 - ((t / 24) % 1);
    ringGeo.setDrawRange(0, Math.max(2, Math.round(65 * left)));
    ringMat.opacity = clamp01(sessionIn);
    trackMat.opacity = 0.15 * clamp01(sessionIn);

    /* Vaulted: masked credential drops into the vault, lid closes, REC */
    const from = new Vector3(DOOR_X + 0.35, LANE_A + 1.85, 0.1);
    const to = new Vector3(DOOR_X + 1.25, LANE_A + 1.45, 0);
    chip.position.lerpVectors(from, to, chipMove);
    chip.scale.setScalar(Math.max(0.001, chipIn * lerp(1, 0.15, chipMove)));
    chip.visible = chipIn > 0.001 && chipMove < 0.999;
    chipMat.opacity = 0.95;
    chipBorder.opacity = 0.7;
    lidPivot.rotation.x = lerp(-1.1, 0, lidShut);
    vaultLight.opacity = lidShut;
    recMat.opacity = range(0.62, 0.66, p) * (0.55 + 0.45 * Math.sin(t * 3));

    /* Fail lane: second beat */
    railB.color.copy(AMBER);
    railB.opacity = 0.2 * laneB;
    const xB = along(FAIL_KEYS, eB);
    const recoil = deny * 0.12;
    tokenB.g.position.set(xB - recoil, LANE_B + TOKEN_UP + Math.sin(t * 1.2 + 1) * 0.02, 0);
    const tokenBIn = smooth(range(0.79, 0.82, p));
    tokenB.g.scale.setScalar(Math.max(0.001, tokenBIn));
    tokenB.mat.color.copy(BADGE).lerp(AMBER, deny);
    tokenB.mat.opacity = 1;
    tokenB.ringMat.opacity = 0.9 * tokenBIn;
    cardB.g.position.set(tokenB.g.position.x, LANE_B + TOKEN_UP + 0.62, 0.75);
    cardB.g.scale.setScalar(Math.max(0.001, tokenBIn));
    cardB.mat.opacity = 0.95;
    cardB.border.opacity = 0.65;
    gatesB.forEach((gate, i) => {
      gate.mat.opacity = laneB;
      if (i === 0) {
        const lit = smooth(range(0.42, 0.5, eB));
        gate.mat.color
          .copy(NEUTRAL)
          .lerp(LIT, lit)
          .multiplyScalar(lerp(1, 1.35, lit));
        gate.scanMat.color.copy(ACCENT);
        gate.scanMat.opacity = 0.45 * Math.sin(Math.PI * range(0.3, 0.5, eB)) + 0.06 * lit;
      } else if (i === 1) {
        gate.mat.color
          .copy(NEUTRAL)
          .lerp(AMBER, deny)
          .multiplyScalar(lerp(1, 1.3, deny));
        gate.scanMat.color.copy(AMBER);
        gate.scanMat.opacity = 0.5 * deny * (0.8 + 0.2 * Math.sin(t * 4));
      } else {
        gate.mat.color.copy(NEUTRAL);
        gate.scanMat.opacity = 0;
      }
    });
    doorB.place(0);
    doorB.frameMat.color.copy(NEUTRAL).lerp(AMBER, deny);
    doorB.frameMat.opacity = laneB;
    doorB.panelMat.opacity = laneB;
    doorA.frameMat.opacity = 1;
    doorA.panelMat.opacity = 1;
    for (const g of gatesA) g.mat.opacity = 1;

    scene.updateMatrixWorld();

    /* Text */
    glyphs.begin();
    labels.forEach((l, i) => {
      const lAt = PASS_KEYS[2 + i * 2]?.[0] ?? 0;
      const lit = e > lAt - 0.01;
      writeLine(l.g, l.locals, l.text, lit ? ACCENT_RGB : DIM_RGB, clamp01(appear));
    });
    if (cardA.g.scale.x > 0.01) {
      PASS_CARD.forEach((line, i) => {
        writeLine(cardA.g, cardALocals[i] ?? [], line.text, line.rgb, 1 - intoDoor, range(0.02 + i * 0.02, 0.1 + i * 0.02, p));
      });
    }
    if (sessionIn > 0.01) {
      sessionLines.forEach((line, i) => {
        const typed = i < 2 ? range(0.52, 0.6, p) : vaultText;
        writeLine(session, line.locals, line.text, line.rgb, clamp01(sessionIn), typed);
      });
      writeLine(session, recLocals, 'REC', ACCENT_RGB, recMat.opacity > 0 ? 1 : 0);
    }
    if (chip.visible) writeLine(chip, chipLocals, 'secret ********', TEXT_RGB, chipIn);
    if (tokenBIn > 0.01) {
      FAIL_CARD.forEach((line, i) => {
        writeLine(cardB.g, cardBLocals[i] ?? [], line.text, line.rgb, tokenBIn, range(0.8 + i * 0.01, 0.84 + i * 0.01, p));
      });
    }
    if (deny > 0.01) writeLine(denied, deniedLocals, 'ACCESS DENIED', AMBER_RGB, deny);
    glyphs.commit();
  };

  return {
    id: 'iam',
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
