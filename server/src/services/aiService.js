const { GoogleGenerativeAI } = require('@google/generative-ai');

function getEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getGeminiModelName() {
  // Modèle par défaut (compatible generateContent pour la plupart des clés récentes)
  return getEnv('GEMINI_MODEL') || 'gemini-2.5-flash';
}

function getGeminiFallbackModelName() {
  return getEnv('GEMINI_FALLBACK_MODEL') || 'gemini-pro-latest';
}

function normalizeModelName(rawName) {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name) return '';
  return name.startsWith('models/') ? name : `models/${name}`;
}

function parseRetryAfterSeconds(message) {
  const msg = typeof message === 'string' ? message : '';
  if (!msg) return null;

  // Ex: "Please retry in 30.345234893s."
  const m1 = msg.match(/Please\s+retry\s+in\s+([0-9.]+)s/i);
  if (m1?.[1]) {
    const n = Number(m1[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // Ex: "\"retryDelay\":\"30s\""
  const m2 = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (m2?.[1]) {
    const n = Number(m2[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function toGeminiError(e) {
  const err = e instanceof Error ? e : new Error(String(e));
  if (!err.code) err.code = 'GEMINI_ERROR';
  if (typeof e?.status === 'number') err.status = e.status;

  const msg = typeof err.message === 'string' ? err.message : '';
  const status = typeof err.status === 'number' ? err.status : undefined;
  const isRateLimited = status === 429 || /too many requests/i.test(msg) || /quota exceeded/i.test(msg);
  if (isRateLimited) {
    err.code = 'GEMINI_RATE_LIMIT';
    err.retryAfterSeconds = parseRetryAfterSeconds(msg);
  }

  return err;
}

function createGeminiClient() {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY est manquant dans les variables d\'environnement.');
    err.code = 'MISSING_GEMINI_API_KEY';
    throw err;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = getGeminiModelName();

  return { genAI, modelName };
}

async function generateText({ systemInstruction, userMessage }) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    const err = new Error('Message utilisateur manquant.');
    err.code = 'MISSING_USER_MESSAGE';
    throw err;
  }

  const { genAI, modelName } = createGeminiClient();

  const trimmedSystem = typeof systemInstruction === 'string' ? systemInstruction.trim() : '';

  function buildModelOptions(name) {
    const normalized = normalizeModelName(name);
    const opts = { model: normalized };
    if (trimmedSystem) opts.systemInstruction = trimmedSystem;
    return opts;
  }

  async function callModel(name) {
    const model = genAI.getGenerativeModel(buildModelOptions(name));
    return model.generateContent(userMessage.trim());
  }

  let result;
  try {
    result = await callModel(modelName);
  } catch (e) {
    const geminiErr = toGeminiError(e);
    if (geminiErr.code === 'GEMINI_RATE_LIMIT') {
      // Tentative: basculer vers un autre modèle (quota potentiellement séparé par modèle).
      const fallback = getGeminiFallbackModelName();

      const primaryNorm = normalizeModelName(modelName);
      const fallbackNorm = normalizeModelName(fallback);

      if (fallbackNorm && fallbackNorm !== primaryNorm) {
        try {
          result = await callModel(fallback);
        } catch (e2) {
          throw toGeminiError(e2);
        }
      } else {
        throw geminiErr;
      }
    }

    const message = typeof geminiErr?.message === 'string' ? geminiErr.message : String(geminiErr);
    const status = typeof geminiErr?.status === 'number' ? geminiErr.status : undefined;

    const isModelNotFound = status === 404 || /not found/i.test(message) || /not supported/i.test(message);
    if (isModelNotFound) {
      const fallback = getGeminiFallbackModelName();
      try {
        result = await callModel(fallback);
      } catch (e2) {
        throw toGeminiError(e2);
      }
    } else {
      throw geminiErr;
    }
  }

  const text = result?.response?.text?.();

  if (typeof text !== 'string' || !text.trim()) {
    const err = new Error('Réponse IA vide.');
    err.code = 'EMPTY_AI_RESPONSE';
    throw err;
  }

  return text.trim();
}

module.exports = {
  generateText,
};
