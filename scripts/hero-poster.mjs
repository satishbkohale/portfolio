// Generates the 2D "plaintext packets" picture for the hero (first paint),
// by projecting the 3D hero's opening pose (p = 0, t = 0) through the same
// camera into the same square box. The 3D canvas then fades in over it with
// the objects in the same places.
//
// Usage: node scripts/hero-poster.mjs   (writes src/data/hero-poster.json)
// Re-run whenever the layout constants in src/three/hero.ts change; the
// constants below must match that file.
import { writeFileSync } from 'node:fs';
import { Euler, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';

const LOCK = new Vector3(1.25, -0.7, 0);
const BODY_W = 2.0;
const BODY_H = 1.6;
const BODY_D = 0.5;
const BEVEL = 0.08;
const FRONT_Z = BODY_D / 2 + BEVEL;
const SHACKLE_R = 0.6;
const LEG = 0.85;
const OPEN_ANGLE = 1.35;
const FRAME_CENTER = new Vector3(-0.6, 0.25, 0);
const FRAME_HALF = { w: 3.75, h: 3.4 };
const PANEL_W = 2.7;
const PANEL_H = 0.56;
const GW = 0.15;
const GLYPH_ASPECT = 32 / 64;
const GH = GW / GLYPH_ASPECT;
const PACKETS = [
  { text: 'user=demo_user', pos: [-2.2, 2.0, 0.4], rot: 0.28 },
  { text: 'role=sample', pos: [-0.5, 2.9, -1.4], rot: 0.18 },
  { text: 'GET /example', pos: [-2.9, 0.65, -0.9], rot: 0.35 },
  { text: 'pin=0000', pos: [-1.7, -0.75, 1.0], rot: 0.22 },
  { text: 'card 0000-0000', pos: [-2.7, -2.15, -0.2], rot: 0.3 },
];

// Camera exactly as in hero.ts update() at p = 0, t = 0, for a square view.
const camera = new PerspectiveCamera(30, 1, 0.1, 100);
const tan = Math.tan((camera.fov * Math.PI) / 360);
const baseDist = Math.max(FRAME_HALF.h / tan, FRAME_HALF.w / (tan * camera.aspect));
camera.position.set(FRAME_CENTER.x, FRAME_CENTER.y + 1.1, FRAME_CENTER.z + baseDist * 1.04);
camera.lookAt(FRAME_CENTER);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();

const r2 = (n) => Math.round(n * 100) / 100;
/** World point -> SVG viewBox units (0-100). */
const project = (v) => {
  const p = v.clone().project(camera);
  return [r2((p.x + 1) * 50), r2((1 - p.y) * 50)];
};
const compose = (pos, euler) => new Matrix4().compose(pos, new Quaternion().setFromEuler(euler), new Vector3(1, 1, 1));

const packets = PACKETS.map((def, seed) => {
  const pos = new Vector3(def.pos[0], def.pos[1] + Math.sin(seed * 1.7) * 0.09, def.pos[2]);
  const m = compose(pos, new Euler(Math.sin(seed) * 0.05, def.rot, 0));
  const at = (x, y, z) => project(new Vector3(x, y, z).applyMatrix4(m));
  const hw = PANEL_W / 2;
  const hh = PANEL_H / 2;
  const corners = [at(-hw, -hh, 0.03), at(hw, -hh, 0.03), at(hw, hh, 0.03), at(-hw, hh, 0.03)];
  const x0 = -hw + 0.2;
  const n = def.text.length;
  const start = at(x0, 0, 0.034);
  const end = at(x0 + n * GW, 0, 0.034);
  const top = at(x0, GH / 2, 0.034);
  const bottom = at(x0, -GH / 2, 0.034);
  const cell = Math.hypot(top[0] - bottom[0], top[1] - bottom[1]);
  return {
    text: def.text,
    points: corners.map((c) => c.join(',')).join(' '),
    x: start[0],
    y: start[1],
    length: r2(Math.hypot(end[0] - start[0], end[1] - start[1])),
    size: r2(cell * 0.75), // glyphs fill 48px of a 64px atlas cell
    angle: r2((Math.atan2(end[1] - start[1], end[0] - start[0]) * 180) / Math.PI),
  };
});

// Lock body front outline and the open shackle.
const lockM = compose(LOCK, new Euler(0, -0.55, 0));
const bodyPts = [];
const rr = 0.24;
const hwB = BODY_W / 2;
const hhB = BODY_H / 2;
for (const [cx, cy, a0] of [
  [hwB - rr, hhB - rr, 0],
  [-hwB + rr, hhB - rr, 90],
  [-hwB + rr, -hhB + rr, 180],
  [hwB - rr, -hhB + rr, 270],
]) {
  for (let i = 0; i <= 6; i++) {
    const a = ((a0 + i * 15) * Math.PI) / 180;
    bodyPts.push(project(new Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, FRONT_Z).applyMatrix4(lockM)));
  }
}
const bodyBack = bodyPts
  .map((_, i) => i)
  .map((i) => {
    const k = Math.floor(i / 7);
    const [cx, cy, a0] = [
      [hwB - rr, hhB - rr, 0],
      [-hwB + rr, hhB - rr, 90],
      [-hwB + rr, -hhB + rr, 180],
      [hwB - rr, -hhB + rr, 270],
    ][k];
    const a = ((a0 + (i % 7) * 15) * Math.PI) / 180;
    return project(new Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, -FRONT_Z).applyMatrix4(lockM));
  });

const bodyTop = BODY_H / 2 + BEVEL;
const pivotM = lockM.clone().multiply(compose(new Vector3(SHACKLE_R, bodyTop - 0.4 + LEG + 0.7, 0), new Euler(0, OPEN_ANGLE, 0)));
const shackle = [];
shackle.push(project(new Vector3(0, -LEG, 0).applyMatrix4(pivotM)));
for (let i = 0; i <= 24; i++) {
  const a = (i / 24) * Math.PI;
  shackle.push(project(new Vector3(-SHACKLE_R + Math.cos(a) * SHACKLE_R, Math.sin(a) * SHACKLE_R, 0).applyMatrix4(pivotM)));
}
shackle.push(project(new Vector3(-2 * SHACKLE_R, -LEG, 0).applyMatrix4(pivotM)));
const keyhole = project(new Vector3(0, -0.02, FRONT_Z).applyMatrix4(lockM));
const keyEdge = project(new Vector3(0.14, -0.02, FRONT_Z).applyMatrix4(lockM));

// Floor dial under the lock (a flat circle, seen in perspective).
const dial = [];
for (let i = 0; i <= 48; i++) {
  const a = (i / 48) * Math.PI * 2;
  dial.push(project(new Vector3(LOCK.x + Math.cos(a) * 1.9, LOCK.y - 1.3, Math.sin(a) * 1.9)));
}

const out = {
  note: 'Generated by scripts/hero-poster.mjs from the 3D hero opening pose. Do not edit by hand.',
  packets,
  body: bodyPts.map((p) => p.join(',')).join(' '),
  bodyBack: bodyBack.map((p) => p.join(',')).join(' '),
  shackle: shackle.map((p) => p.join(',')).join(' '),
  keyhole: { x: keyhole[0], y: keyhole[1], r: r2(Math.hypot(keyEdge[0] - keyhole[0], keyEdge[1] - keyhole[1])) },
  dial: dial.map((p) => p.join(',')).join(' '),
};
writeFileSync('src/data/hero-poster.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`hero-poster: ${packets.length} packets, camera distance ${r2(baseDist * 1.04)}`);
