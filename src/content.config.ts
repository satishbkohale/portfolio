/**
 * Content collections. Each schema is checked at build time, so a missing
 * field or a typo fails the build instead of shipping a broken page.
 *
 * `draft: true` marks placeholder entries (dummy text). They are shown in
 * development and preview builds so the layout is complete, and are removed
 * from production builds (SITE_ENV=production) so placeholders never go live.
 */
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const role = z.enum(['grc', 'iam', 'soc']);

/** Evidence reference ids: P = project, C = certificate. */
const projectRef = z.string().regex(/^P\d+$/, 'Project refs look like "P1"');
const certRef = z.string().regex(/^C\d+$/, 'Certificate refs look like "C1"');

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    ref: projectRef,
    title: z.string().min(3),
    /** One-line outcome shown in lists (no marketing words). */
    summary: z.string().min(20).max(180),
    /** Meta description for the case study page. */
    description: z.string().min(70).max(160),
    roles: z
      .array(z.object({ role, weight: z.enum(['primary', 'supporting']) }))
      .min(1)
      .refine((r) => r.filter((x) => x.weight === 'primary').length === 1, 'Exactly one primary role'),
    context: z.string(),
    problem: z.string(),
    approach: z.array(z.string()).min(1),
    tools: z.array(z.string()).min(1),
    outcome: z.string(),
    frameworks: z.array(z.string()).default([]),
    next: z.string().optional(),
    links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
    /** Free text such as "2025" or "Mar 2026". */
    date: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().int().default(100),
    draft: z.boolean().default(false),
    /** Missing facts to add. Listed on the page in development only. */
    todo: z.array(z.string()).default([]),
  }),
});

const certifications = defineCollection({
  loader: file('src/content/certifications.json'),
  schema: z.object({
    id: certRef,
    name: z.string(),
    issuer: z.string().nullable(),
    status: z.enum(['earned', 'in-progress', 'planned']),
    /** "Oct 2026", or null if unknown (hidden). */
    date: z.string().nullable(),
    credentialUrl: z.url().nullable(),
    roles: z.array(role).min(1),
    order: z.number().int(),
    draft: z.boolean().default(false),
    todo: z.array(z.string()).default([]),
  }),
});

const education = defineCollection({
  loader: file('src/content/education.json'),
  schema: z.object({
    id: z.string(),
    qualification: z.string(),
    institution: z.string(),
    location: z.string(),
    period: z.string(),
    detail: z.string().nullable(),
    order: z.number().int(),
  }),
});

const experience = defineCollection({
  loader: file('src/content/experience.json'),
  schema: z.object({
    id: z.string(),
    role: z.string(),
    organisation: z.string(),
    period: z.string(),
    points: z.array(z.string()).min(1).max(4),
    roles: z.array(role).min(1),
    order: z.number().int(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, certifications, education, experience };
