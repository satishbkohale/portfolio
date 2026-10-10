/**
 * Text on 3D objects, in one draw call.
 *
 * A glyph atlas is drawn from Geist Mono into a 2D canvas (CSP-safe: no
 * network, no eval) and every visible character is one instance of a small
 * quad that picks its cell from the atlas. The text is decorative; the page
 * says the same things in real DOM text.
 */
import {
  CanvasTexture,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearMipmapLinearFilter,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';

export const CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=/:.+-_#%&*<>?@[]';
export const CIPHER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const COLS = 16;
const ROWS = Math.ceil(CHARS.length / COLS);
const CELL_W = 32;
const CELL_H = 64;
/** Width / height of one glyph cell, for sizing quads. */
export const GLYPH_ASPECT = CELL_W / CELL_H;

const INDEX = new Map<string, number>([...CHARS].map((c, i) => [c, i]));
export const glyphIndex = (c: string): number => INDEX.get(c) ?? INDEX.get('?') ?? 0;

async function atlas(): Promise<CanvasTexture> {
  const family = '"Geist Mono Variable", "Geist Mono Fallback", monospace';
  try {
    await document.fonts.load(`500 48px ${family}`);
  } catch {
    // Font not ready: the fallback monospace face is used.
  }
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL_W;
  canvas.height = ROWS * CELL_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.font = `500 48px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  [...CHARS].forEach((c, i) => {
    ctx.fillText(c, (i % COLS) * CELL_W + CELL_W / 2, Math.floor(i / COLS) * CELL_H + CELL_H / 2 + 2);
  });
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

/** One atlas for every scene. */
let atlasPromise: Promise<CanvasTexture> | null = null;

/**
 * Local matrices for a left-aligned line of text: glyph width gw, starting at
 * (x, y) on a surface at depth z. Multiply by an object's matrixWorld to place.
 */
export function lineLocals(text: string, x: number, y: number, z: number, gw: number): Matrix4[] {
  const gh = gw / GLYPH_ASPECT;
  return [...text].map((_, j) => new Matrix4().compose(new Vector3(x + gw / 2 + j * gw, y, z), new Quaternion(), new Vector3(gw, gh, 1)));
}

const vertexShader = /* glsl */ `
  attribute float aGlyph;
  attribute vec4 aColor;
  uniform vec2 uGrid;
  varying vec2 vUv;
  varying vec4 vColor;
  void main() {
    float col = mod(aGlyph, uGrid.x);
    float row = floor(aGlyph / uGrid.x);
    vUv = (vec2(col, uGrid.y - 1.0 - row) + uv) / uGrid;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  varying vec2 vUv;
  varying vec4 vColor;
  void main() {
    float a = texture2D(uAtlas, vUv).a * vColor.a;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor.rgb, a);
  }
`;

/** A pool of glyph instances. Call set() for each visible glyph, then commit(). */
export class GlyphLayer {
  readonly mesh: InstancedMesh;
  private readonly glyph: InstancedBufferAttribute;
  private readonly color: InstancedBufferAttribute;
  private used = 0;

  private constructor(texture: CanvasTexture, capacity: number) {
    const geometry = new PlaneGeometry(1, 1);
    this.glyph = new InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(DynamicDrawUsage);
    this.color = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(DynamicDrawUsage);
    geometry.setAttribute('aGlyph', this.glyph);
    geometry.setAttribute('aColor', this.color);
    const material = new ShaderMaterial({
      uniforms: { uAtlas: { value: texture }, uGrid: { value: [COLS, ROWS] } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.mesh.count = 0;
  }

  static async create(capacity: number): Promise<GlyphLayer> {
    atlasPromise ??= atlas();
    return new GlyphLayer(await atlasPromise, capacity);
  }

  begin(): void {
    this.used = 0;
  }

  /** Colour is sRGB 0-1, written straight to the screen. */
  set(matrix: Matrix4, char: string, r: number, g: number, b: number, a: number): void {
    if (a <= 0.01 || this.used >= this.glyph.count) return;
    const i = this.used++;
    this.mesh.setMatrixAt(i, matrix);
    this.glyph.setX(i, glyphIndex(char));
    this.color.setXYZW(i, r, g, b, a);
  }

  commit(): void {
    this.mesh.count = this.used;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.glyph.needsUpdate = true;
    this.color.needsUpdate = true;
  }
}
