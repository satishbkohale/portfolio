/**
 * Content access helpers.
 *
 * - Drafts (placeholder entries) are included in dev and preview builds and
 *   excluded from production builds (SITE_ENV=production).
 * - Evidence refs are validated: an unknown ref throws, which fails the build.
 */
import { type CollectionEntry, getCollection } from 'astro:content';
import type { RoleId } from '../data/roles';
import { type Skill, skills } from '../data/skills';

export const isProduction = process.env.SITE_ENV === 'production';
export const includeDrafts = !isProduction;

export type Project = CollectionEntry<'projects'>;
export type Certification = CollectionEntry<'certifications'>;

const visible = <T extends { data: { draft?: boolean } }>(e: T) => includeDrafts || !e.data.draft;

export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects');
  return all.filter(visible).sort((a, b) => a.data.order - b.data.order);
}

export async function getCertifications(): Promise<Certification[]> {
  const all = await getCollection('certifications');
  return all.filter(visible).sort((a, b) => a.data.order - b.data.order);
}

export async function getEducation() {
  const all = await getCollection('education');
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function getExperience() {
  const all = await getCollection('experience');
  return all.filter(visible).sort((a, b) => a.data.order - b.data.order);
}

/** Primary role of a project. */
export function primaryRole(p: Project): RoleId {
  const primary = p.data.roles.find((r) => r.weight === 'primary');
  if (!primary) throw new Error(`Project ${p.id} has no primary role`);
  return primary.role;
}

/** How a project relates to a role: primary, supporting, or not at all. */
export function roleWeight(p: Project, role: RoleId): 'primary' | 'supporting' | null {
  return p.data.roles.find((r) => r.role === role)?.weight ?? null;
}

/**
 * Order projects for a role page: primary for that role first, then supporting,
 * then the rest; ties keep the global order.
 */
export function sortForRole(projects: Project[], role?: RoleId): Project[] {
  if (!role) return projects;
  const rank = (p: Project) => {
    const w = roleWeight(p, role);
    return w === 'primary' ? 0 : w === 'supporting' ? 1 : 2;
  };
  return [...projects].sort((a, b) => rank(a) - rank(b) || a.data.order - b.data.order);
}

export interface EvidenceLink {
  ref: string;
  label: string;
  href: string;
}

/**
 * Build the evidence index and resolve a skill's refs to links.
 * Throws on refs that exist nowhere (typos), so the build fails loudly.
 */
export async function getSkillsWithEvidence(): Promise<(Skill & { links: EvidenceLink[] })[]> {
  const allProjects = await getCollection('projects');
  const allCerts = await getCollection('certifications');

  const known = new Set<string>([...allProjects.map((p) => p.data.ref), ...allCerts.map((c) => c.data.id)]);
  const visibleLinks = new Map<string, EvidenceLink>();
  for (const p of allProjects.filter(visible)) {
    visibleLinks.set(p.data.ref, { ref: p.data.ref, label: p.data.title, href: `/projects/${p.id}/` });
  }
  for (const c of allCerts.filter(visible)) {
    visibleLinks.set(c.data.id, { ref: c.data.id, label: c.data.name, href: `/#cert-${c.data.id.toLowerCase()}` });
  }

  // Project refs must be unique, or evidence links would be ambiguous.
  const refs = allProjects.map((p) => p.data.ref);
  const dup = refs.find((r, i) => refs.indexOf(r) !== i);
  if (dup) throw new Error(`Duplicate project ref "${dup}" in src/content/projects`);

  return skills.map((s) => {
    for (const ref of s.evidence) {
      if (!known.has(ref)) throw new Error(`Skill "${s.name}" cites unknown evidence "${ref}" (src/data/skills.ts)`);
    }
    const links = s.evidence.map((r) => visibleLinks.get(r)).filter((l): l is EvidenceLink => Boolean(l));
    return { ...s, links };
  });
}
