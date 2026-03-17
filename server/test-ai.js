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

function extractModelsList(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.models)) return resp.models;
  return [];
}

function supportsGenerateContent(model) {
  const methods = model?.supportedGenerationMethods;
  return Array.isArray(methods) && methods.includes('generateContent');
}

function pickModelName(availableModels, preferredRaw) {
  const preferred = normalizeModelName(preferredRaw);

  if (preferred) {
    const found = availableModels.find((m) => m?.name === preferred);
    if (found) return preferred;
  }

  const firstOk = availableModels.find(supportsGenerateContent);
  return typeof firstOk?.name === 'string' ? firstOk.name : '';
}

async function run() {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY manquant (mets-le dans tes variables d\'environnement).');
    process.exitCode = 1;
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 1) ListModels (diagnostic)
  let availableModels = [];
  try {
    const modelsResp = await genAI.listModels();
    availableModels = extractModelsList(modelsResp);
  } catch (err) {
    console.error('❌ Impossible de lister les modèles (ListModels):');
    console.error(err?.message || err);
    if (typeof err?.status === 'number') console.error(`status=${err.status}`);
    process.exitCode = 1;
    return;
  }

  const preferredRaw = getEnv('GEMINI_MODEL');
  const picked = pickModelName(availableModels, preferredRaw);

  console.log('📌 Modèles disponibles (generateContent en priorité):');
  for (const m of availableModels) {
    const name = typeof m?.name === 'string' ? m.name : '(sans nom)';
    const ok = supportsGenerateContent(m) ? '✅' : '❌';
    console.log(`- ${ok} ${name}`);
  }

  if (!picked) {
    console.error('❌ Aucun modèle compatible generateContent trouvé.');
    process.exitCode = 1;
    return;
  }

  console.log(`\n➡️ Modèle utilisé: ${picked}${preferredRaw ? ` (préféré: ${normalizeModelName(preferredRaw)})` : ''}`);

  // 2) Test generateContent
  const model = genAI.getGenerativeModel({ model: picked });
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
