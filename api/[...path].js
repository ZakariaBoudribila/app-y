// Vercel Serverless Function: route toutes les requêtes /api/* vers Express.
//
// IMPORTANT:
// Avec les rewrites Vercel du type:
//   /api/(.*) -> /api/[...path].js?path=$1
// la function peut recevoir une URL comme `/api/[...path].js?path=auth/profile`.
// Express match les routes sur `req.url`, donc on reconstruit `/api/auth/profile`.
const app = require('../server/src/app');

function buildQueryString(query) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query || {})) {
		if (key === 'path') continue;
		if (Array.isArray(value)) {
			for (const v of value) params.append(key, String(v));
		} else if (value !== undefined) {
			params.append(key, String(value));
		}
	}
	const s = params.toString();
	return s ? `?${s}` : '';
}

function getPathFromQuery(req) {
	const raw = req?.query?.path;
	if (Array.isArray(raw)) return raw.filter(Boolean).join('/');
	if (typeof raw === 'string') return raw;
	return '';
}

module.exports = (req, res) => {
	const rawPath = getPathFromQuery(req);
	if (rawPath) {
		const clean = String(rawPath).replace(/^\/+/g, '').replace(/\/+$/g, '');
		req.url = `/api/${clean}${buildQueryString(req.query)}`;
	} else if (typeof req.url === 'string' && req.url.startsWith('/api/[')) {
		// Fallback: si Vercel a réécrit vers le fichier sans `path`.
		req.url = `/api${buildQueryString(req.query)}`;
	}

	// Espace Pro: certains navigateurs envoient If-None-Match/If-Modified-Since,
	// Express peut répondre 304 sans body, et Angular "perd" le profil.
	// On force donc un 200 avec JSON complet uniquement pour GET /api/profile.
	const url = typeof req.url === 'string' ? req.url : '';
	if ((req.method || 'GET').toUpperCase() === 'GET' && (url === '/api/profile' || url.startsWith('/api/profile?'))) {
		try {
			if (req.headers) {
				delete req.headers['if-none-match'];
				delete req.headers['if-modified-since'];
				delete req.headers['if-match'];
				delete req.headers['if-unmodified-since'];
			}
		} catch {
			// ignore
		}
	}

	return app(req, res);
};
