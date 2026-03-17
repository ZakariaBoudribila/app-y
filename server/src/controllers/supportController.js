const ProfileModel = require('../models/profileModel');
const aiService = require('../services/aiService');
const { randomUUID } = require('crypto');

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
    "Tu es l'assistant IA de l'application App-Y.",
    "Tu aides l'utilisateur en te basant sur son profil professionnel (CV) ci-dessous.",
    "Réponds en français, de façon claire et utile.",
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
