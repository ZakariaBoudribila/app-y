const ProfileModel = require('../models/profileModel');
const aiService = require('../services/aiService');
const { randomUUID } = require('crypto');

// Cooldown anti-spam (best-effort): mémoire locale du process
// Note: si plusieurs instances (scaling), le cooldown est par instance.
const nextAllowedAtByUserId = new Map();

// Cache (best-effort) des réponses IA pour réduire la consommation de quota.
// Clé: userId + message normalisé. Stockage en mémoire du process.
const supportAnswerCache = new Map();
const inflightSupportRequests = new Map();

function getSupportCacheTtlSeconds() {
  const raw = String(process.env.AI_SUPPORT_CACHE_TTL_SECONDS || '').trim();
  const n = Number(raw);
  // Défaut: 15 minutes
  if (!Number.isFinite(n) || n <= 0) return 15 * 60;
  return Math.min(Math.max(Math.floor(n), 0), 24 * 60 * 60);
}

function normalizeCacheKeyPart(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildSupportCacheKey(userId, message) {
  return `${String(userId)}::${normalizeCacheKeyPart(message)}`;
}

function purgeExpiredSupportCache() {
  if (supportAnswerCache.size <= 2000) return;
  const now = Date.now();
  for (const [key, entry] of supportAnswerCache.entries()) {
    if (!entry || typeof entry.expiresAt !== 'number' || entry.expiresAt <= now) {
      supportAnswerCache.delete(key);
    }
  }
}

function getUserCooldownSeconds() {
  const raw = String(process.env.AI_USER_COOLDOWN_SECONDS || '').trim();
  const n = Number(raw);
  // Valeur par défaut courte pour éviter les doubles clics
  if (!Number.isFinite(n) || n <= 0) return 3;
  return Math.min(Math.max(n, 1), 120);
}

function getRemainingCooldownSeconds(userId) {
  const until = nextAllowedAtByUserId.get(String(userId));
  if (typeof until !== 'number') return 0;
  const remainingMs = until - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}

function setCooldownSeconds(userId, seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return;
  const bounded = Math.min(Math.max(Math.ceil(s), 1), 24 * 60 * 60);
  nextAllowedAtByUserId.set(String(userId), Date.now() + bounded * 1000);

  // Nettoyage léger si ça grossit trop
  if (nextAllowedAtByUserId.size > 5000) {
    const now = Date.now();
    for (const [key, ts] of nextAllowedAtByUserId.entries()) {
      if (typeof ts !== 'number' || ts <= now) nextAllowedAtByUserId.delete(key);
    }
  }
}

function safeJson(value, maxChars = 8000) {
  try {
    const json = JSON.stringify(value ?? null, null, 2);
    if (typeof json !== 'string') return 'null';
    if (json.length <= maxChars) return json;
    return `${json.slice(0, maxChars)}\n... [TRONQUÉ]`;
  } catch {
    return 'null';
  }
}

function buildSystemInstruction({ profile }) {
  return [
    "Tu es l'assistant IA de Lalla Yassmine.",
    "Tu aides l'utilisateur en te basant sur son profil professionnel (CV) ci-dessous.",
    "Langue: réponds dans la même langue que le message de l'utilisateur (français, العربية, English).",
    "Si la langue n'est pas claire, réponds en français.",
    "Règles importantes :",
    "- N'invente jamais des informations qui ne sont pas dans les données.",
    "- Si une info manque, dis-le explicitement et propose une question de clarification.",
    "- Si on te demande quelque chose hors-sujet ou sensible, reste prudent et propose une alternative.",
    "Données de profil (source) :",
    safeJson(profile),
  ].join('\n');
}

exports.askSupport = async (req, res) => {
  try {
    const userId = req.userData?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const remainingCooldown = getRemainingCooldownSeconds(userId);
    if (remainingCooldown > 0) {
      res.setHeader('Retry-After', String(remainingCooldown));
      return res.status(429).json({
        message: `Patiente un peu avant de réessayer (${remainingCooldown}s).`,
        retryAfterSeconds: remainingCooldown,
      });
    }

    const body = req.body || {};
    const message =
      typeof body.message === 'string'
        ? body.message
        : (typeof body.question === 'string' ? body.question : '');

    if (!message.trim()) {
      return res.status(400).json({ message: 'Le champ "message" est requis.' });
    }

    // Cache hit (si activé)
    const ttlSeconds = getSupportCacheTtlSeconds();
    if (ttlSeconds > 0) {
      const key = buildSupportCacheKey(userId, message);
      const cached = supportAnswerCache.get(key);
      if (cached && typeof cached.expiresAt === 'number' && cached.expiresAt > Date.now() && typeof cached.answer === 'string') {
        setCooldownSeconds(userId, getUserCooldownSeconds());
        return res.status(200).json({ answer: cached.answer });
      }

      // Déduplication: si une requête identique est déjà en cours, on attend son résultat.
      const inflight = inflightSupportRequests.get(key);
      if (inflight && typeof inflight.then === 'function') {
        const answer = await inflight;
        setCooldownSeconds(userId, getUserCooldownSeconds());
        return res.status(200).json({ answer });
      }

      purgeExpiredSupportCache();

      const promise = (async () => {
        const profile = await ProfileModel.getProfile(userId);
        const systemInstruction = buildSystemInstruction({ profile });
        const answer = await aiService.generateText({
          systemInstruction,
          userMessage: message,
        });
        supportAnswerCache.set(key, {
          answer,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return answer;
      })();

      inflightSupportRequests.set(key, promise);

      try {
        const answer = await promise;
        setCooldownSeconds(userId, getUserCooldownSeconds());
        return res.status(200).json({ answer });
      } finally {
        inflightSupportRequests.delete(key);
      }
    }

    // Cache désactivé
    const profile = await ProfileModel.getProfile(userId);
    const systemInstruction = buildSystemInstruction({ profile });
    const answer = await aiService.generateText({
      systemInstruction,
      userMessage: message,
    });
    setCooldownSeconds(userId, getUserCooldownSeconds());
    return res.status(200).json({ answer });
  } catch (err) {
    const errorId = randomUUID();
    const code = err?.code;
    const msg = typeof err?.message === 'string' ? err.message : 'Erreur IA.';
    const debugEnabled = String(process.env.AI_DEBUG || '').toLowerCase() === 'true';

    const runtime = {
      nodeEnv: process.env.NODE_ENV || 'development',
      vercel: Boolean(process.env.VERCEL),
      railway: Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID),
    };

    if (code === 'MISSING_GEMINI_API_KEY' || code === 'MISSING_GROQ_API_KEY') {
      return res.status(503).json({
        message: msg,
        errorId,
        runtime,
      });
    }

    if (code === 'GEMINI_RATE_LIMIT' || code === 'GROQ_RATE_LIMIT') {
      const retryAfterSeconds = typeof err?.retryAfterSeconds === 'number' ? err.retryAfterSeconds : null;
      const rateLimitType = typeof err?.rateLimitType === 'string' ? err.rateLimitType : 'temporary';
      // Applique un cooldown aligné sur Gemini pour éviter de marteler l'API.
      if (req.userData?.id) {
        setCooldownSeconds(req.userData.id, retryAfterSeconds || 30);
      }
      if (retryAfterSeconds && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        res.setHeader('Retry-After', String(Math.ceil(retryAfterSeconds)));
      }

      const payload = {
        message:
          rateLimitType === 'daily'
            ? "Quota IA journalier atteint (limite gratuite). Réessaie plus tard ou active un plan/billing."
            : (retryAfterSeconds
              ? `Quota IA atteint. Réessaie dans ${Math.ceil(retryAfterSeconds)} secondes.`
              : 'Quota IA atteint. Réessaie dans quelques secondes.'),
        errorId,
        runtime,
        retryAfterSeconds,
        rateLimitType,
      };

      if (debugEnabled) {
        payload.detail = msg;
        if (typeof err?.name === 'string') payload.errorName = err.name;
        if (typeof err?.status === 'number') payload.upstreamStatus = err.status;
      }

      return res.status(429).json(payload);
    }

    console.error(`[askSupport:${errorId}]`, err);

    const payload = {
      message: 'Erreur lors de la génération IA.',
      errorId,
      runtime,
    };

    if (debugEnabled) {
      payload.detail = msg;
      if (typeof err?.name === 'string') payload.errorName = err.name;
      if (typeof err?.status === 'number') payload.upstreamStatus = err.status;
    }

    return res.status(502).json(payload);
  }
};
