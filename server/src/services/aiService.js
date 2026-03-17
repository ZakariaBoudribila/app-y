const { GoogleGenerativeAI } = require('@google/generative-ai');

function getEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getGeminiModelName() {
  return getEnv('GEMINI_MODEL') || 'gemini-1.5-flash';
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

  const modelOptions = { model: modelName };
  if (typeof systemInstruction === 'string' && systemInstruction.trim()) {
    modelOptions.systemInstruction = systemInstruction.trim();
  }

  const model = genAI.getGenerativeModel(modelOptions);
  const result = await model.generateContent(userMessage.trim());
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
