/**
 * security.txt (RFC 9116). Contact and Expires are required. Expires is set
 * 180 days after the build, so a monthly rebuild keeps it current;
 * scripts/check-dist.mjs fails if fewer than 30 days remain.
 */
import type { APIRoute } from 'astro';
import { site } from '../../data/site';

export const GET: APIRoute = ({ site: siteUrl }) => {
  const base = siteUrl ?? new URL('http://localhost:4321');
  const expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  expires.setUTCHours(0, 0, 0, 0);
  const body = [
    `Contact: mailto:${site.email}`,
    `Expires: ${expires.toISOString().replace('.000', '')}`,
    'Preferred-Languages: en',
    `Canonical: ${new URL('/.well-known/security.txt', base).href}`,
    `Policy: ${new URL('/security/', base).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
