/**
 * GRC scene: "Govern". Motion language: structured and grid-like; things
 * move along the board's axes and snap into place.
 *
 *   p 0.00  framework   ISO/IEC 27001 themes (A.5 to A.8) and NIST CSF 2.0
 *                       functions snap into a grid at the top
 *   p 0.15  risks       five risk cards slide into the register, one per row
 *   p 0.30  mapped      row by row, each risk gets a control, a policy and
 *                       evidence; the control attaches to its framework tile
 *                       by a line, and the coverage meter climbs 20% a row
 *   p 0.62  gap         the supplier risk has no control: its slot stays
 *                       amber, an audit scan stops on it, the meter holds at 80%
 *   p 0.72  remediated  the control drops into the slot, amber turns blue,
 *                       policy and evidence follow, the meter reaches 100%
 *
 * The coverage meter and the gap are the focus. Pure function of p (plus
 * ambient time t), so scrolling up reverses everything and restores the gap.
 * Blue for covered, amber only for the gap. IDs are sample data; framework
 * references are theme and function level only (no clause text).
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
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
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Chapter } from '../scripts/chapters';
import type { Engine, View } from './engine';
import { GlyphLayer, lineLocals } from './glyphs';
import { glowTexture, matcaps } from './materials';
import { ACCENT, ACCENT_RGB, AMBER, AMBER_RGB, EDGE, type RGB } from './palette';

const NEUTRAL = new Color('#8a96a3');
/** An empty meter segment: dark glass. */
const SEG_OFF = new Color('#0e151d');
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

/* Layout (scene units). The board stands in the xy plane, facing +z. */
const COL_X = [-2.55, -1.05, 0.45, 1.95];
const COL_HEAD = ['RISK', 'CONTROL', 'POLICY', 'EVIDENCE'];
const ROW_Y = [0.75, 0.2, -0.35, -0.9, -1.45];
const CELL_W = 1.35;
const CELL_H = 0.4;
const HEAD_Y = 1.13;
const ISO_Y = 2.3;
const CSF_Y = 1.72;
const ISO = ['A.5', 'A.6', 'A.7', 'A.8'];
const ISO_X = ISO.map((_, i) => -1.95 + i * 1.1);
const CSF = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];
const CSF_X = CSF.map((_, i) => -2.1 + i * 0.72);
const METER_X = 3.45;
const SEGMENTS = 10;
const SEG_W = 0.8;
const SEG_H = 0.22;
const SEG_STEP = 0.29;
const SEG_Y0 = -1.6; // centre of the bottom segment
const FRAME_CENTER = new Vector3(0.2, 0.32, 0);
const FRAME_HALF = { w: 4.2, h: 2.65 };
const VIEW_DIR = new Vector3(-0.22, 0.2, 1).normalize();
const GAP_ROW = 4;

/** The register. Sample IDs; ISO theme and CSF function per control. */
const ROWS = [
  { risk: 'R-01 PHISHING', control: 'C-01 A.6  PR', policy: 'P-01 AWARENESS', evidence: 'E-01 TRAINING', iso: 1, csf: 2 },
  { risk: 'R-02 ACCESS', control: 'C-02 A.5  PR', policy: 'P-02 ACCESS', evidence: 'E-02 REVIEW', iso: 0, csf: 2 },
  { risk: 'R-03 MALWARE', control: 'C-03 A.8  DE', policy: 'P-03 MALWARE', evidence: 'E-03 EDR LOG', iso: 3, csf: 3 },
  { risk: 'R-04 PATCHING', control: 'C-04 A.8  ID', policy: 'P-04 PATCHING', evidence: 'E-04 SCAN', iso: 3, csf: 1 },
  { risk: 'R-05 SUPPLIER', control: 'C-05 A.5  GV', policy: 'P-05 SUPPLIER', evidence: 'E-05 ASSESSMENT', iso: 0, csf: 0 },
];

/** Mapping window of a row (rows 0-3 in sequence; the gap row is remediated later). */
const rowWindow = (i: number): [number, number] => (i < GAP_ROW ? [0.31 + i * 0.07, 0.38 + i * 0.07] : [0.72, 0.84]);

function rectPoints(w: number, h: number, z: number): Vector3[] {
  return [new Vector3(-w / 2, -h / 2, z), new Vector3(w / 2, -h / 2, z), new Vector3(w / 2, h / 2, z), new Vector3(-w / 2, h / 2, z)];
}

/** A dashed rectangle outline (the empty control slot). */
function dashedRect(w: number, h: number, z: number, dash: number): BufferGeometry {
  const pts: number[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.floor(len / (dash * 2)));
    for (let k = 0; k < n; k++) {
      const a = (k * 2 * dash) / len;
      const b = Math.min(1, (k * 2 * dash + dash) / len);
      pts.push(lerp(x0, x1, a), lerp(y0, y1, a), z, lerp(x0, x1, b), lerp(y0, y1, b), z);
    }
  };
  edge(-w / 2, -h / 2, w / 2, -h / 2);
  edge(w / 2, -h / 2, w / 2, h / 2);
  edge(w / 2, h / 2, -w / 2, h / 2);
  edge(-w / 2, h / 2, -w / 2, -h / 2);
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pts, 3));
}

export async function createGrc(engine: Engine, el: HTMLElement, chapter: Chapter): Promise<View> {
  const lite = engine.tier === 'lite';
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const { graphite } = matcaps();

  /* Board grid: faint lines behind everything */
  const grid: number[] = [];
  for (let x = -3.6; x <= 4.05; x += 0.55) grid.push(x, -2.05, -0.3, x, 2.75, -0.3);
  for (let y = -2.05; y <= 2.8; y += 0.55) grid.push(-3.6, y, -0.3, 4.05, y, -0.3);
  const gridMat = new LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
  scene.add(new LineSegments(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(grid, 3)), gridMat));

  /* Dust */
  const dustN = lite ? 60 : 130;
  const dust = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dust[i * 3] = lerp(-4.5, 5, hash(i, 31));
    dust[i * 3 + 1] = lerp(-2.4, 3.2, hash(i, 32));
    dust[i * 3 + 2] = lerp(-2.5, 1.5, hash(i, 33));
  }
  const dustPts = new Points(
    new BufferGeometry().setAttribute('position', new Float32BufferAttribute(dust, 3)),
    new PointsMaterial({ color: ACCENT, size: 0.025, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  scene.add(dustPts);

  /* Cards: a thin slab with an outline; text is written on the front face */
  const cardGeo = new RoundedBoxGeometry(CELL_W, CELL_H, 0.06, 2, 0.04);
  const cardLoop = new BufferGeometry().setFromPoints(rectPoints(CELL_W, CELL_H, 0.032));
  const makeCard = (x: number, y: number, outline: Color) => {
    const g = new Group();
    g.position.set(x, y, 0);
    const mat = new MeshMatcapMaterial({ matcap: graphite, transparent: true, opacity: 0 });
    const line = new LineBasicMaterial({ color: outline.clone(), transparent: true, opacity: 0 });
    g.add(new Mesh(cardGeo, mat), new LineLoop(cardLoop, line));
    scene.add(g);
    return { g, mat, line, x, y };
  };

  /* Framework tiles */
  const tileGeoIso = new RoundedBoxGeometry(0.95, 0.4, 0.08, 2, 0.04);
  const tileGeoCsf = new RoundedBoxGeometry(0.6, 0.38, 0.08, 2, 0.04);
  const makeTile = (x: number, y: number, label: string, iso: boolean) => {
    const g = new Group();
    g.position.set(x, y, 0);
    const w = iso ? 0.95 : 0.6;
    const h = iso ? 0.4 : 0.38;
    const mat = new MeshMatcapMaterial({ matcap: graphite, transparent: true, opacity: 0 });
    const line = new LineBasicMaterial({ color: NEUTRAL.clone(), transparent: true, opacity: 0 });
    g.add(new Mesh(iso ? tileGeoIso : tileGeoCsf, mat), new LineLoop(new BufferGeometry().setFromPoints(rectPoints(w, h, 0.042)), line));
    scene.add(g);
    const gw = 0.085;
    return { g, mat, line, label, x, y, locals: lineLocals(label, -(label.length * gw) / 2, 0, 0.045, gw) };
  };
  const isoTiles = ISO.map((l, i) => makeTile(ISO_X[i] ?? 0, ISO_Y, l, true));
  const csfTiles = CSF.map((l, i) => makeTile(CSF_X[i] ?? 0, CSF_Y, l, false));
  const tiles = [...isoTiles, ...csfTiles];

  /* Register: 5 rows x 4 columns */
  const rows = ROWS.map((r, i) => {
    const y = ROW_Y[i] ?? 0;
    const texts = [r.risk, r.control, r.policy, r.evidence];
    const cells = COL_X.map((x, c) => ({
      ...makeCard(x, y, c === 0 ? NEUTRAL : EDGE),
      text: texts[c] ?? '',
      locals: lineLocals(texts[c] ?? '', -CELL_W / 2 + 0.1, 0, 0.034, 0.072),
    }));
    // Links between neighbouring cells: a unit line scaled along x.
    const links = [0, 1, 2].map((c) => {
      const g = new Group();
      g.position.set((COL_X[c] ?? 0) + CELL_W / 2, y, 0);
      const mat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.85 });
      g.add(new Line(new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(1, 0, 0)]), mat));
      scene.add(g);
      const len = (COL_X[c + 1] ?? 0) - (COL_X[c] ?? 0) - CELL_W;
      return { g, mat, len };
    });
    // The control attaches to its framework function tile.
    const tile = csfTiles[r.csf];
    const from = new Vector3((COL_X[1] ?? 0) + 0.3, y + CELL_H / 2, -0.06);
    const to = new Vector3(tile?.x ?? 0, CSF_Y - 0.19, -0.06);
    const connMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0 });
    scene.add(new Line(new BufferGeometry().setFromPoints([from, to]), connMat));
    return { cells, links, connMat, ...r };
  });

  /* The empty control slot of the gap row */
  const slotMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
  const slot = new LineSegments(dashedRect(CELL_W, CELL_H, 0.035, 0.07), slotMat);
  slot.position.set(COL_X[1] ?? 0, ROW_Y[GAP_ROW] ?? 0, 0);
  scene.add(slot);
  const slotFillMat = new MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, depthWrite: false });
  const slotFill = new Mesh(new PlaneGeometry(CELL_W - 0.06, CELL_H - 0.06), slotFillMat);
  slotFill.position.set(COL_X[1] ?? 0, ROW_Y[GAP_ROW] ?? 0, 0.03);
  scene.add(slotFill);

  /* Audit scan: a bar that sweeps down the register and stops on the gap */
  const scanMat = new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
  const scan = new Mesh(new PlaneGeometry(6.0, 0.5), scanMat);
  scan.position.set(-0.3, 0, 0.08);
  scene.add(scan);

  /* Coverage meter: ten segments, the number above, the gap count below */
  // Lit segments are solid blue (flat colour, so they read as filled at any
  // angle); empty ones are dark glass with a faint outline.
  const segGeo = new RoundedBoxGeometry(SEG_W, SEG_H, 0.14, 2, 0.04);
  const segLoop = new BufferGeometry().setFromPoints(rectPoints(SEG_W, SEG_H, 0.072));
  const segs = Array.from({ length: SEGMENTS }, (_, k) => {
    const mat = new MeshBasicMaterial({ color: SEG_OFF.clone(), transparent: true });
    const line = new LineBasicMaterial({ color: EDGE.clone(), transparent: true });
    const g = new Group();
    g.position.set(METER_X, SEG_Y0 + k * SEG_STEP, 0);
    g.add(new Mesh(segGeo, mat), new LineLoop(segLoop, line));
    scene.add(g);
    return { g, mat, line };
  });
  const railMat = new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0 });
  const railTop = SEG_Y0 + (SEGMENTS - 1) * SEG_STEP + SEG_H;
  scene.add(
    new LineSegments(
      new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute(
          [METER_X - 0.55, SEG_Y0 - SEG_H, 0, METER_X - 0.55, railTop, 0, METER_X + 0.55, SEG_Y0 - SEG_H, 0, METER_X + 0.55, railTop, 0],
          3,
        ),
      ),
      railMat,
    ),
  );
  const glow = new Sprite(
    new SpriteMaterial({ map: glowTexture(), color: ACCENT, blending: AdditiveBlending, transparent: true, depthWrite: false }),
  );
  glow.scale.set(2.8, 1.8, 1);
  scene.add(glow);
  const gapGlow = new Sprite(
    new SpriteMaterial({ map: glowTexture(), color: AMBER, blending: AdditiveBlending, transparent: true, depthWrite: false }),
  );
  gapGlow.scale.set(2.6, 1.2, 1);
  gapGlow.position.set(COL_X[1] ?? 0, ROW_Y[GAP_ROW] ?? 0, 0.1);
  scene.add(gapGlow);

  const text = new Group();
  scene.add(text);
  const BIG = 0.24;
  const pctLocals = lineLocals('100%', METER_X - (4 * BIG) / 2, railTop + 0.5, 0, BIG);
  const covLocals = lineLocals('COVERAGE', METER_X - (8 * 0.075) / 2, railTop + 0.2, 0, 0.075);
  const gapLocals = lineLocals('1 GAP', METER_X - (5 * 0.11) / 2, SEG_Y0 - 0.5, 0, 0.11);
  const okLocals = lineLocals('0 GAPS', METER_X - (6 * 0.11) / 2, SEG_Y0 - 0.5, 0, 0.11);
  const headLocals = COL_HEAD.map((h, c) => lineLocals(h, (COL_X[c] ?? 0) - CELL_W / 2 + 0.1, HEAD_Y, 0, 0.068));
  const isoLabel = lineLocals('ISO 27001', -3.5, ISO_Y, 0, 0.062);
  const csfLabel = lineLocals('NIST CSF', -3.5, CSF_Y, 0, 0.062);

  const glyphs = await GlyphLayer.create(440);
  scene.add(glyphs.mesh);

  /* Camera */
  const fitDistance = () => {
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    return Math.max(FRAME_HALF.h / tan, FRAME_HALF.w / (tan * camera.aspect));
  };
  let baseDist = fitDistance();

  const tmp = new Matrix4();
  const writeLine = (g: Group, locals: Matrix4[], str: string, rgb: RGB, a: number) => {
    if (a <= 0.01) return;
    for (let j = 0; j < str.length; j++) {
      const local = locals[j];
      const ch = str[j] ?? ' ';
      if (!local || ch === ' ') continue;
      tmp.multiplyMatrices(g.matrixWorld, local);
      glyphs.set(tmp, ch, rgb[0], rgb[1], rgb[2], a);
    }
  };
  const mix = (a: RGB, b: RGB, k: number): RGB => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const tileLit = new Array<number>(tiles.length).fill(0);

  const update = (p: number, t: number, presence = 1) => {
    const arrive = smooth(presence);

    /* Camera with fly-in */
    const dist = baseDist * lerp(1.65, 1, arrive);
    camera.position.copy(FRAME_CENTER).addScaledVector(VIEW_DIR, dist);
    camera.position.x += Math.sin(t * 0.05) * 0.2 + (1 - arrive) * 2.2;
    camera.position.y += (1 - arrive) * 1.2;
    camera.lookAt(FRAME_CENTER);
    camera.updateMatrixWorld();
    dustPts.rotation.y = t * 0.01;
    gridMat.opacity = 0.09 * smooth(range(0, 0.06, p)) + 0.03;

    /* Framework: tiles snap up into the grid, one after another */
    tileLit.fill(0);
    tiles.forEach((tile, k) => {
      const a = easeOutBack(range(0.01 + k * 0.009, 0.06 + k * 0.009, p));
      tile.g.position.y = tile.y - (1 - Math.min(1, a)) * 0.35;
      tile.g.scale.setScalar(Math.max(0.001, a));
      tile.mat.opacity = 0.95 * clamp01(a);
    });

    /* Gap and remediation timing */
    const gapIn = smooth(range(0.6, 0.63, p));
    const fix = smooth(range(0.72, 0.76, p));
    const gapOpen = gapIn * (1 - fix);
    const pulse = 0.75 + 0.25 * Math.sin(t * 4);

    /* Register rows */
    let coverage = 0;
    rows.forEach((row, i) => {
      const [w0, w1] = rowWindow(i);
      const local = range(w0, w1, p);
      const gap = i === GAP_ROW;
      // Risk card slides in along its row.
      const riskIn = smooth(range(0.15 + i * 0.025, 0.21 + i * 0.025, p));
      const risk = row.cells[0];
      if (risk) {
        risk.g.position.x = risk.x - (1 - riskIn) * 0.9;
        risk.mat.opacity = 0.95 * riskIn;
        risk.line.color.copy(NEUTRAL).lerp(AMBER, gapOpen * (gap ? 1 : 0));
        risk.line.opacity = (gap ? lerp(0.6, 0.95, gapOpen) : 0.6) * riskIn;
      }
      // Gap row: its first link reaches the empty slot before remediation.
      const reach = gap ? smooth(range(0.59, 0.61, p)) : 0;
      // Control, policy, evidence drop into place (straight down, then snap).
      const at = gap ? [0, 0.15, 0.45, 0.7] : [0, 0.15, 0.5, 0.75];
      for (let c = 1; c < 4; c++) {
        const cell = row.cells[c];
        if (!cell) continue;
        const s = range(at[c] ?? 0, (at[c] ?? 0) + 0.25, local);
        const drop = easeOutBack(s);
        cell.g.position.y = cell.y + (1 - Math.min(1, drop)) * 0.4;
        cell.mat.opacity = 0.95 * smooth(s);
        cell.line.opacity = 0.75 * smooth(s);
        if (gap && c === 1) cell.line.color.copy(AMBER).lerp(EDGE, smooth(range(0.3, 0.6, local)));
      }
      // Links draw left to right.
      row.links.forEach((link, c) => {
        const s = c === 0 ? Math.max(reach, range(0, 0.18, local)) : range((at[c] ?? 0) + 0.15, (at[c] ?? 0) + 0.3, local);
        link.g.scale.x = Math.max(0.001, link.len * smooth(s));
        link.g.visible = s > 0.001;
        link.mat.color.copy(EDGE).lerp(AMBER, gap && c === 0 ? gapOpen : 0);
      });
      // The control attaches to its framework tile: a bright line, then a faint one.
      const attach = range(0.15, 0.55, local);
      row.connMat.opacity = attach > 0 ? lerp(0.85, 0.16, smooth(range(0.55, 1, local))) * smooth(range(0, 0.3, attach)) : 0;
      const lit = smooth(range(0.35, 0.5, local));
      tileLit[row.iso] = Math.max(tileLit[row.iso] ?? 0, lit);
      tileLit[ISO.length + row.csf] = Math.max(tileLit[ISO.length + row.csf] ?? 0, lit);
      // Each covered risk is 20% of the meter.
      coverage += 0.2 * smooth(range(0.75, 1, local));
    });
    tiles.forEach((tile, k) => {
      const lit = tileLit[k] ?? 0;
      tile.line.color.copy(NEUTRAL).lerp(EDGE, lit);
      tile.line.opacity = clamp01(tile.mat.opacity) * lerp(0.35, 0.95, lit);
    });

    /* Empty slot, its amber glow, and the audit scan */
    slotMat.opacity = gapOpen * pulse;
    slotFillMat.opacity = 0.1 * gapOpen * pulse;
    (gapGlow.material as SpriteMaterial).opacity = 0.32 * gapOpen * pulse;
    const sweep = range(0.62, 0.68, p);
    const scanOn = smooth(range(0.62, 0.63, p)) * (1 - smooth(range(0.7, 0.73, p)));
    scan.position.y = lerp(ROW_Y[0] ?? 0, ROW_Y[GAP_ROW] ?? 0, smooth(sweep));
    scanMat.color.copy(ACCENT).lerp(AMBER, smooth(range(0.66, 0.68, p)));
    scanMat.opacity = 0.22 * scanOn * (sweep >= 1 ? pulse : 1);

    /* Coverage meter */
    railMat.opacity = 0.25 * smooth(range(0.08, 0.14, p));
    const filled = coverage * SEGMENTS;
    segs.forEach((seg, k) => {
      const on = clamp01(filled - k);
      const appear = smooth(range(0.08 + k * 0.004, 0.13 + k * 0.004, p));
      seg.g.scale.setScalar(Math.max(0.001, appear));
      seg.mat.color.copy(SEG_OFF).lerp(ACCENT, on);
      // The newest lit segment shimmers a little.
      if (on > 0 && filled - k < 1.5) seg.mat.color.lerp(EDGE, 0.25 + 0.15 * Math.sin(t * 2.2));
      seg.mat.opacity = appear;
      // The two segments the gap holds back are outlined amber.
      const held = k >= 8 ? gapOpen : 0;
      seg.line.color.copy(EDGE).lerp(AMBER, held);
      seg.line.opacity = appear * (held > 0 ? lerp(0.35, 0.95 * pulse, held) : lerp(0.3, 0.9, on));
    });
    const topY = SEG_Y0 + Math.max(0, filled - 0.5) * SEG_STEP;
    glow.position.set(METER_X, topY, -0.2);
    (glow.material as SpriteMaterial).opacity = 0.7 * clamp01(filled) * (0.85 + 0.15 * Math.sin(t * 1.4));

    scene.updateMatrixWorld();

    /* Text */
    glyphs.begin();
    const fw = smooth(range(0.04, 0.12, p));
    writeLine(text, isoLabel, 'ISO 27001', DIM_RGB, fw);
    writeLine(text, csfLabel, 'NIST CSF', DIM_RGB, fw);
    tiles.forEach((tile, k) => {
      writeLine(tile.g, tile.locals, tile.label, mix(DIM_RGB, ACCENT_RGB, tileLit[k] ?? 0), clamp01(tile.mat.opacity));
    });
    const heads = smooth(range(0.1, 0.15, p));
    COL_HEAD.forEach((h, c) => {
      writeLine(text, headLocals[c] ?? [], h, DIM_RGB, heads);
    });
    rows.forEach((row, i) => {
      row.cells.forEach((cell, c) => {
        const rgb = c === 0 ? (i === GAP_ROW ? mix(TEXT_RGB, AMBER_RGB, gapOpen) : TEXT_RGB) : c === 1 ? ACCENT_RGB : TEXT_RGB;
        writeLine(cell.g, cell.locals, cell.text, rgb, clamp01(cell.mat.opacity));
      });
    });
    const meterOn = smooth(range(0.1, 0.15, p));
    const pct = `${Math.round(coverage * 100)}%`;
    // Right-aligned in the four-character field.
    writeLine(text, pctLocals.slice(4 - pct.length), pct, ACCENT_RGB, meterOn);
    writeLine(text, covLocals, 'COVERAGE', DIM_RGB, meterOn);
    writeLine(text, gapLocals, '1 GAP', AMBER_RGB, gapOpen);
    writeLine(text, okLocals, '0 GAPS', ACCENT_RGB, smooth(range(0.8, 0.84, p)));
    glyphs.commit();
  };

  return {
    id: 'grc',
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
