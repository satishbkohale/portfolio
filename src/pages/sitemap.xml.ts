/** sitemap.xml generated at build time (drafts excluded in production). */
import type { APIRoute } from 'astro';
import { ROLE_IDS } from '../data/roles';
import { getProjects } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const projects = await getProjects();
  const paths = [
    '/',
    ...ROLE_IDS.map((r) => `/${r}/`),
    '/projects/',
    ...projects.map((p) => `/projects/${p.id}/`),
    '/resume/',
    '/contact/',
    '/security/',
  ];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, base).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
