const { GoogleGenerativeAI } = require('@google/generative-ai');

function getEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeModelName(rawName) {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name) return '';
  return name.startsWith('models/') ? name : `models/${name}`;
}

async function run() {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY manquant (mets-le dans tes variables d\'environnement).');
    process.exitCode = 1;
    return;
  }

  const modelRaw = getEnv('GEMINI_MODEL') || 'gemini-pro';
  const modelName = normalizeModelName(modelRaw);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = 'Dis bonjour !';

  try {
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();
    console.log('✅ Réponse Gemini:');
    console.log(text);
  } catch (err) {
    console.error('❌ Erreur Gemini:');
    console.error(err?.message || err);
    if (typeof err?.status === 'number') {
      console.error(`status=${err.status}`);
    }
    process.exitCode = 1;
  }
}

run();
