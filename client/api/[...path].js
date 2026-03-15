// Proxy Vercel Function (client-root deployments)
// Routes /api/* to an upstream backend (Railway/Replit/etc.) without browser CORS issues.
//
// Configure on Vercel:
//   UPSTREAM_API_BASE=https://<your-backend-host>/api
// Example:
//   UPSTREAM_API_BASE=https://app-y-production.up.railway.app/api

function normalizeUpstreamBase(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/\/+$/, '');
}

function appendQueryParams(url, query) {
  for (const [key, value] of Object.entries(query || {})) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, String(v));
    } else if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }
}

function shouldForwardHeader(name) {
  const n = String(name || '').toLowerCase();
  // Hop-by-hop headers and ones that fetch/node should manage.
  return ![
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
    'content-length',
  ].includes(n);
}

function getPathParts(req) {
  const rawPath = req.query?.path;
  if (Array.isArray(rawPath)) return rawPath;
  if (typeof rawPath === 'string') return [rawPath];

  const urlStr = typeof req.url === 'string' ? req.url : '';
  if (!urlStr) return [];

  let pathname = '';
  try {
    pathname = new URL(urlStr, 'http://localhost').pathname || '';
  } catch {
    pathname = urlStr.split('?')[0] || '';
  }

  // Expect paths like /api/<...>; remove the /api prefix.
  pathname = pathname.replace(/^\/api\/?/i, '');
  pathname = pathname.replace(/^\/+|\/+$/g, '');
  if (!pathname) return [];

  return pathname.split('/').filter(Boolean);
}

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  try {
    const upstreamBase = normalizeUpstreamBase(process.env.UPSTREAM_API_BASE);
    if (!upstreamBase) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Missing UPSTREAM_API_BASE on Vercel.' }));
      return;
    }

    const pathParts = getPathParts(req);
    const upstreamUrl = new URL(`${upstreamBase}/${pathParts.map(encodeURIComponent).join('/')}`);
    appendQueryParams(upstreamUrl, req.query);

    const method = (req.method || 'GET').toUpperCase();

    const headers = {};
    for (const [name, value] of Object.entries(req.headers || {})) {
      if (!shouldForwardHeader(name)) continue;
      if (value === undefined) continue;
      headers[name] = value;
    }

    let body;
    if (method !== 'GET' && method !== 'HEAD') {
      const raw = await readRawBody(req);
      body = raw.length ? raw : undefined;
    }

    const upstreamResp = await fetch(upstreamUrl.toString(), {
      method,
      headers,
      body,
      redirect: 'manual',
    });

    res.statusCode = upstreamResp.status;

    // Forward relevant headers (especially Set-Cookie) back to the browser.
    // Node18 fetch (undici) may expose getSetCookie(); fallback to single header.
    const getSetCookie = upstreamResp.headers.getSetCookie?.bind(upstreamResp.headers);
    const setCookies = typeof getSetCookie === 'function'
      ? getSetCookie()
      : (upstreamResp.headers.get('set-cookie') ? [upstreamResp.headers.get('set-cookie')] : []);

    for (const [name, value] of upstreamResp.headers.entries()) {
      const lower = name.toLowerCase();
      if (lower === 'set-cookie') continue;
      // Avoid overriding compression/content-length; Vercel handles it.
      if (lower === 'content-encoding' || lower === 'content-length') continue;
      res.setHeader(name, value);
    }

    if (setCookies.length) {
      res.setHeader('Set-Cookie', setCookies);
    }

    const buf = Buffer.from(await upstreamResp.arrayBuffer());
    res.end(buf);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        message: 'API proxy error on Vercel.',
        error: err?.message || String(err),
      })
    );
  }
};
