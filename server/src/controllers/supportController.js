const ProfileModel = require('../models/profileModel');
const aiService = require('../services/aiService');
const { randomUUID } = require('crypto');

// Cooldown anti-spam (best-effort): mémoire locale du process
// Note: si plusieurs instances (scaling), le cooldown est par instance.
const nextAllowedAtByUserId = new Map();

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

    const profile = await ProfileModel.getProfile(userId);

    const systemInstruction = buildSystemInstruction({ profile });
    const answer = await aiService.generateText({
      systemInstruction,
      userMessage: message,
    });

    // Anti-spam: limite les doubles clics / rafraîchissements
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

    if (code === 'MISSING_GEMINI_API_KEY') {
      return res.status(503).json({
        message: msg,
        errorId,
        runtime,
      });
    }

    if (code === 'GEMINI_RATE_LIMIT') {
      const retryAfterSeconds = typeof err?.retryAfterSeconds === 'number' ? err.retryAfterSeconds : null;
      // Applique un cooldown aligné sur Gemini pour éviter de marteler l'API.
      if (req.userData?.id) {
        setCooldownSeconds(req.userData.id, retryAfterSeconds || 30);
      }
      if (retryAfterSeconds && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        res.setHeader('Retry-After', String(Math.ceil(retryAfterSeconds)));
      }

      const payload = {
        message: retryAfterSeconds
          ? `Quota IA atteint. Réessaie dans ${Math.ceil(retryAfterSeconds)} secondes.`
          : 'Quota IA atteint. Réessaie dans quelques secondes.',
        errorId,
        runtime,
        retryAfterSeconds,
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
