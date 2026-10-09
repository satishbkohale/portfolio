// Local preview server for dist/ that behaves like Cloudflare Workers static
// assets: applies dist/_headers (merging rules, "! Header" removal), serves
// directory indexes, redirects /path to /path/, and returns 404.html with 404.
// Used by `pnpm preview` and the Playwright tests, so they run under the real CSP.
//
// By default HSTS and upgrade-insecure-requests are dropped, because they would
// break a plain-HTTP preview. Set HTTPS_HEADERS=1 when TLS is terminated in
// front of this server (e.g. a reverse proxy in front of the Docker container)
// to send the headers exactly as deployed.
//
// Environment: PORT (default 4321), HOST (default 0.0.0.0), HTTPS_HEADERS (0|1).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const DIST = 'dist';
const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? '0.0.0.0';
const HTTPS_HEADERS = process.env.HTTPS_HEADERS === '1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

/** Parse Cloudflare's _headers format into ordered rules. */
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      const pattern = raw.trim();
      const source = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/:[A-Za-z_]\w*/g, '[^/]+');
      current = { re: new RegExp(`^${source}$`), set: [], unset: [] };
      rules.push(current);
      continue;
    }
    const line = raw.trim();
    if (line.startsWith('!')) current?.unset.push(line.slice(1).trim().toLowerCase());
    else {
      const i = line.indexOf(':');
      current?.set.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

const headerRules = existsSync(join(DIST, '_headers')) ? parseHeaders(readFileSync(join(DIST, '_headers'), 'utf8')) : [];

function headersFor(pathname) {
  const out = new Map(); // lower-case name -> [name, value]
  for (const rule of headerRules) {
    if (!rule.re.test(pathname)) continue;
    for (const name of rule.unset) out.delete(name);
    for (const [name, value] of rule.set) {
      const key = name.toLowerCase();
      const prev = out.get(key);
      out.set(key, [name, prev ? `${prev[1]}, ${value}` : value]);
    }
  }
  if (!HTTPS_HEADERS) {
    out.delete('strict-transport-security');
    const csp = out.get('content-security-policy');
    if (csp) csp[1] = csp[1].replace(/\s*upgrade-insecure-requests;?/g, '');
  }
  return [...out.values()];
}

function send(res, status, file, pathname) {
  const body = readFileSync(file);
  res.statusCode = status;
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.setHeader('Content-Length', body.length);
  for (const [name, value] of headersFor(pathname)) res.setHeader(name, value);
  res.end(res.req.method === 'HEAD' ? undefined : body);
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end();
  }
  let url;
  try {
    url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    decodeURIComponent(url.pathname);
  } catch {
    res.statusCode = 400;
    return res.end();
  }
  const pathname = decodeURIComponent(url.pathname);
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const target = join(DIST, safe);

  if (pathname === '/_headers') return send(res, 404, join(DIST, '404.html'), pathname);

  if (existsSync(target) && statSync(target).isFile()) return send(res, 200, target, pathname);
  if (existsSync(join(target, 'index.html'))) {
    if (!pathname.endsWith('/')) {
      res.statusCode = 307;
      res.setHeader('Location', `${pathname}/${url.search}`);
      return res.end();
    }
    return send(res, 200, join(target, 'index.html'), pathname);
  }
  return send(res, 404, join(DIST, '404.html'), pathname);
});

server.listen(PORT, HOST, () => console.log(`Serving dist/ with production headers on http://${HOST}:${PORT}`));

// Stop cleanly on docker stop / Ctrl+C.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
