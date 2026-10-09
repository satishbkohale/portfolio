/**
 * Fig. 1 data: the core zero-trust logical components from NIST SP 800-207
 * (Zero Trust Architecture, 2020), Figure 2, simplified.
 *
 * The same data drives the static SVG (wide and tall layouts) and the 3D
 * scene, so the two tiers always show the same diagram.
 *
 * `wide` positions use an 820 x 540 viewBox (desktop); `tall` a 360 x 500
 * viewBox (phones). The grouping of inputs into three channels is the
 * author's, not NIST's, and the figure caption says so.
 */
import type { ChannelId } from './roles';

export type NodeKind = 'input' | 'engine' | 'administrator' | 'pep' | 'subject' | 'system' | 'resource';
export type NodeChannel = ChannelId | 'core';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TopoNode {
  id: string;
  /** Label lines for the wide layout (SVG has no automatic wrapping). */
  label: string[];
  /** Label lines for the tall layout, if different. */
  tallLabel?: string[];
  kind: NodeKind;
  channel: NodeChannel;
  wide: Rect;
  tall: Rect;
}

export type EdgeKind = 'signal' | 'request' | 'control';

export interface TopoEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

export const viewBox = {
  wide: { w: 820, h: 540 },
  tall: { w: 360, h: 500 },
} as const;

const IN_W = { w: 150, h: 56 };
const IN_T = { w: 165, h: 40 };

export const nodes: TopoNode[] = [
  // Inputs, left column (positions follow NIST Fig. 2)
  {
    id: 'cdm',
    label: ['CDM system'],
    kind: 'input',
    channel: 'activity',
    wide: { x: 10, y: 40, ...IN_W },
    tall: { x: 185, y: 160, ...IN_T },
  },
  {
    id: 'compliance',
    label: ['Industry', 'compliance'],
    tallLabel: ['Industry compliance'],
    kind: 'input',
    channel: 'policy',
    wide: { x: 10, y: 130, ...IN_W },
    tall: { x: 10, y: 10, ...IN_T },
  },
  {
    id: 'threat-intel',
    label: ['Threat', 'intelligence'],
    tallLabel: ['Threat intelligence'],
    kind: 'input',
    channel: 'activity',
    wide: { x: 10, y: 220, ...IN_W },
    tall: { x: 10, y: 110, ...IN_T },
  },
  {
    id: 'activity-logs',
    label: ['Activity logs'],
    kind: 'input',
    channel: 'activity',
    wide: { x: 10, y: 310, ...IN_W },
    tall: { x: 185, y: 110, ...IN_T },
  },
  // Inputs, right column
  {
    id: 'data-access-policy',
    label: ['Data access', 'policy'],
    tallLabel: ['Data access policy'],
    kind: 'input',
    channel: 'policy',
    wide: { x: 660, y: 40, ...IN_W },
    tall: { x: 185, y: 10, ...IN_T },
  },
  { id: 'pki', label: ['PKI'], kind: 'input', channel: 'identity', wide: { x: 660, y: 130, ...IN_W }, tall: { x: 185, y: 60, ...IN_T } },
  {
    id: 'id-management',
    label: ['ID management'],
    kind: 'input',
    channel: 'identity',
    wide: { x: 660, y: 220, ...IN_W },
    tall: { x: 10, y: 60, ...IN_T },
  },
  {
    id: 'siem',
    label: ['SIEM system'],
    kind: 'input',
    channel: 'activity',
    wide: { x: 660, y: 310, ...IN_W },
    tall: { x: 10, y: 160, ...IN_T },
  },

  // Control plane: the policy decision point
  {
    id: 'engine',
    label: ['Policy engine'],
    kind: 'engine',
    channel: 'core',
    wide: { x: 320, y: 60, w: 180, h: 56 },
    tall: { x: 20, y: 236, w: 150, h: 44 },
  },
  {
    id: 'administrator',
    label: ['Policy', 'administrator'],
    tallLabel: ['Policy administrator'],
    kind: 'administrator',
    channel: 'core',
    wide: { x: 320, y: 148, w: 180, h: 64 },
    tall: { x: 190, y: 236, w: 150, h: 44 },
  },

  // Data plane: the request path
  {
    id: 'subject',
    label: ['Subject'],
    kind: 'subject',
    channel: 'core',
    wide: { x: 190, y: 380, w: 74, h: 48 },
    tall: { x: 10, y: 350, w: 72, h: 40 },
  },
  {
    id: 'system',
    label: ['System'],
    kind: 'system',
    channel: 'core',
    wide: { x: 278, y: 380, w: 74, h: 48 },
    tall: { x: 96, y: 350, w: 74, h: 40 },
  },
  {
    id: 'pep',
    label: ['Policy', 'enforcement', 'point'],
    tallLabel: ['Enforcement', 'point'],
    kind: 'pep',
    channel: 'core',
    wide: { x: 370, y: 362, w: 124, h: 84 },
    tall: { x: 185, y: 342, w: 165, h: 56 },
  },
  {
    id: 'resource',
    label: ['Enterprise', 'resource'],
    tallLabel: ['Enterprise resource'],
    kind: 'resource',
    channel: 'core',
    wide: { x: 512, y: 374, w: 118, h: 60 },
    tall: { x: 185, y: 440, w: 165, h: 44 },
  },
];

export const edges: TopoEdge[] = [
  // Every input feeds the policy engine.
  ...nodes.filter((n) => n.kind === 'input').map((n) => ({ from: n.id, to: 'engine', kind: 'signal' as const })),
  // Control plane: the engine decides, the administrator instructs the PEP.
  { from: 'engine', to: 'administrator', kind: 'control' },
  { from: 'administrator', to: 'pep', kind: 'control' },
  // Data plane: the request path.
  { from: 'subject', to: 'system', kind: 'request' },
  { from: 'system', to: 'pep', kind: 'request' },
  { from: 'pep', to: 'resource', kind: 'request' },
];

/** Areas drawn behind the nodes. */
export const planes = {
  wide: {
    frame: { x: 180, y: 14, w: 460, h: 512 },
    divider: 290,
    pdp: { x: 300, y: 40, w: 220, h: 200 },
  },
  tall: {
    frame: { x: 4, y: 222, w: 352, h: 274 },
    divider: 326,
    pdp: { x: 10, y: 226, w: 340, h: 84 },
  },
} as const;

export const nodeById = new Map(nodes.map((n) => [n.id, n]));

export function center(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/**
 * Point where the segment from the rect centre towards (tx, ty) leaves the
 * rect, so edges start and end on box borders instead of box centres.
 */
export function borderPoint(r: Rect, tx: number, ty: number): { x: number; y: number } {
  const c = center(r);
  const dx = tx - c.x;
  const dy = ty - c.y;
  if (dx === 0 && dy === 0) return c;
  const sx = dx === 0 ? Number.POSITIVE_INFINITY : r.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Number.POSITIVE_INFINITY : r.h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** Accessible text equivalent of the figure (the SVGs and canvas are hidden from assistive tech). */
export const figureDescription =
  'Diagram of a zero-trust access decision. A subject uses a system to request an enterprise resource. ' +
  'The request passes through a policy enforcement point, which is controlled by a policy decision point made up of a policy engine and a policy administrator. ' +
  'The policy engine draws on eight inputs, grouped here into three channels. Policy: industry compliance and data access policy. ' +
  'Identity: ID management and PKI. Activity: threat intelligence, activity logs, the SIEM system and the CDM system.';

export const channels: { id: ChannelId; label: string; question: string }[] = [
  { id: 'policy', label: 'Policy', question: 'what is allowed' },
  { id: 'identity', label: 'Identity', question: 'who is asking' },
  { id: 'activity', label: 'Activity', question: 'what is happening' },
];
