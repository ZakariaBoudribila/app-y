require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const taskRoutes = require('./routes/taskRoutes');
const dailyEntryRoutes = require('./routes/dailyEntryRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const goalRoutes = require('./routes/goalRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const explicitAllowedOrigins = new Set([
  'http://localhost:4200',
  'http://localhost:3000',
  'https://app-y.vercel.app',
  ...parseCorsOrigins(),
]);

function isAllowedVercelPreview(origin) {
  // Autorise les previews Vercel du projet (ex: https://app-y-git-xxx.vercel.app)
  return /^https:\/\/app-y(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
}

const corsOptions = {
  // Obligatoire si on veut envoyer/recevoir le cookie refresh (withCredentials).
  // IMPORTANT: avec credentials, Access-Control-Allow-Origin ne doit jamais être '*'.
  origin(origin, callback) {
    // Origin peut être absent pour des appels serveur-à-serveur / curl.
    if (!origin) return callback(null, true);

    if (explicitAllowedOrigins.has(origin) || isAllowedVercelPreview(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.use('/api/tasks', taskRoutes);
app.use('/api/journal', dailyEntryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/history', historyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

module.exports = app;
