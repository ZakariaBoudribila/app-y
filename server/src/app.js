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

const corsOptions = {
  // Nécessaire si on veut que le refresh token cookie fonctionne correctement.
  // En dev avec proxy Angular, c'est généralement same-origin côté navigateur.
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
