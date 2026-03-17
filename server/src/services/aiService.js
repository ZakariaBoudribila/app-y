const Groq = require('groq-sdk');

function getEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getGroqModel() {
  return getEnv('GROQ_MODEL') || 'llama-3.3-70b-versatile';
}

function getGroqTemperature() {
  const raw = getEnv('GROQ_TEMPERATURE');
  if (!raw) return 0.7;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0.7;
  return Math.min(Math.max(n, 0), 2);
}

function parseRetryAfterSecondsFromError(e) {
  const h = e?.headers;

  // Some SDKs expose headers as plain object; others as Map-like.
  const retryAfter =
    (typeof h?.get === 'function' ? h.get('retry-after') : undefined) ||
    (h && typeof h === 'object' ? (h['retry-after'] || h['Retry-After']) : undefined);

  const n = Number(retryAfter);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

function toGroqError(e) {
  const err = e instanceof Error ? e : new Error(String(e));
  if (!err.code) err.code = 'GROQ_ERROR';
  if (typeof e?.status === 'number') err.status = e.status;

  const msg = typeof err.message === 'string' ? err.message : '';
  const status = typeof err.status === 'number' ? err.status : undefined;

  if (status === 429 || /too many requests/i.test(msg) || /rate limit/i.test(msg)) {
    err.code = 'GROQ_RATE_LIMIT';
    err.retryAfterSeconds = parseRetryAfterSecondsFromError(e);
    err.rateLimitType = 'temporary';
  }

  return err;
}

function createGroqClient() {
  const apiKey = getEnv('GROQ_API_KEY');
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY est manquant dans les variables d\'environnement.');
    err.code = 'MISSING_GROQ_API_KEY';
    throw err;
  }

  return new Groq({ apiKey });
}

async function generateText({ systemInstruction, userMessage }) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    const err = new Error('Message utilisateur manquant.');
    err.code = 'MISSING_USER_MESSAGE';
    throw err;
  }

  const groq = createGroqClient();
  const trimmedSystem = typeof systemInstruction === 'string' ? systemInstruction.trim() : '';

  try {
    const completion = await groq.chat.completions.create({
      model: getGroqModel(),
      temperature: getGroqTemperature(),
      messages: [
        {
          role: 'system',
          content: trimmedSystem || "Tu es l'assistant IA de Lalla Yassmine.",
        },
        {
          role: 'user',
          content: userMessage.trim(),
        },
      ],
    });

    const text = completion?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      const err = new Error('Réponse IA vide.');
      err.code = 'EMPTY_AI_RESPONSE';
      throw err;
    }

    return text.trim();
  } catch (e) {
    throw toGroqError(e);
  }
}

module.exports = {
  generateText,
};
