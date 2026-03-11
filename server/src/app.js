require('dotenv').config();

const express = require('express');
const cors = require('cors');

const taskRoutes = require('./routes/taskRoutes');
const dailyEntryRoutes = require('./routes/dailyEntryRoutes');
const userRoutes = require('./routes/userRoutes');
const goalRoutes = require('./routes/goalRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options(/.*/, cors());
app.use(express.json());

app.use('/api/tasks', taskRoutes);
app.use('/api/journal', dailyEntryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/history', historyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

module.exports = app;
