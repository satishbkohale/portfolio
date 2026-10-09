/**
 * Data integrity: the figure topology and the evidence references.
 * (Content schemas themselves are enforced by Astro at build time.)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { skills } from '../../src/data/skills';
import { edges, nodes } from '../../src/data/topology';

describe('topology (NIST SP 800-207 Fig. 2, simplified)', () => {
  it('has the eight inputs from the standard', () => {
    const inputs = nodes.filter((n) => n.kind === 'input').map((n) => n.id);
    expect(inputs.sort()).toEqual(
      ['activity-logs', 'cdm', 'compliance', 'data-access-policy', 'id-management', 'pki', 'siem', 'threat-intel'].sort(),
    );
  });

  it('groups inputs into policy 2, identity 2, activity 4', () => {
    const count = (c: string) => nodes.filter((n) => n.kind === 'input' && n.channel === c).length;
    expect([count('policy'), count('identity'), count('activity')]).toEqual([2, 2, 4]);
  });

  it('only connects nodes that exist', () => {
    const ids = new Set(nodes.map((n) => n.id));
    for (const e of edges) {
      expect(ids.has(e.from), e.from).toBe(true);
      expect(ids.has(e.to), e.to).toBe(true);
    }
  });

  it('keeps every node inside its viewBox', () => {
    for (const n of nodes) {
      expect(n.wide.x + n.wide.w).toBeLessThanOrEqual(820);
      expect(n.wide.y + n.wide.h).toBeLessThanOrEqual(540);
      expect(n.tall.x + n.tall.w).toBeLessThanOrEqual(360);
      expect(n.tall.y + n.tall.h).toBeLessThanOrEqual(500);
    }
  });
});

describe('skills evidence', () => {
  const projectRefs = readdirSync('src/content/projects')
    .map((f) => readFileSync(`src/content/projects/${f}`, 'utf8').match(/^ref: (P\d+)$/m)?.[1])
    .filter(Boolean);
  const certRefs = [...readFileSync('src/content/certifications.json', 'utf8').matchAll(/"id": "(C\d+)"/g)].map((m) => m[1]);
  const known = new Set([...projectRefs, ...certRefs]);

  it('every evidence ref points to a real project or certificate', () => {
    for (const s of skills) for (const ref of s.evidence) expect(known.has(ref), `${s.name} -> ${ref}`).toBe(true);
  });

  it('project refs are unique', () => {
    expect(new Set(projectRefs).size).toBe(projectRefs.length);
  });

  it('applied skills always show evidence', () => {
    for (const s of skills.filter((x) => x.proficiency === 'applied')) expect(s.evidence.length, s.name).toBeGreaterThan(0);
  });
});
