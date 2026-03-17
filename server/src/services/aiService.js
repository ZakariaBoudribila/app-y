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
    const message = typeof e?.message === 'string' ? e.message : String(e);
    const status = typeof e?.status === 'number' ? e.status : undefined;

    const isModelNotFound = status === 404 || /not found/i.test(message) || /not supported/i.test(message);
    if (isModelNotFound) {
      const fallback = getGeminiFallbackModelName();
      try {
        result = await callModel(fallback);
      } catch (e2) {
        const err = e2 instanceof Error ? e2 : new Error(String(e2));
        if (!err.code) err.code = 'GEMINI_ERROR';
        if (typeof e2?.status === 'number') err.status = e2.status;
        throw err;
      }
    } else {
      const err = e instanceof Error ? e : new Error(String(e));
      if (!err.code) err.code = 'GEMINI_ERROR';
      if (typeof e?.status === 'number') err.status = e.status;
      throw err;
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
