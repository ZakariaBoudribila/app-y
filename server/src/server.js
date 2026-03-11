const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors({
  origin: '*', // On autorise tout le temps du test
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Répond explicitement aux preflights CORS
app.options('*', cors());
app.use(express.json());

// Importation des routes
const taskRoutes = require('./routes/taskRoutes');
const dailyEntryRoutes = require('./routes/dailyEntryRoutes');
const userRoutes = require('./routes/userRoutes'); 
const goalRoutes = require('./routes/goalRoutes');
const historyRoutes = require('./routes/historyRoutes');

// Utilisation des routes
app.use('/api/tasks', taskRoutes);
app.use('/api/journal', dailyEntryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/history', historyRoutes);

// Health check simple
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

// (Optionnel) Servir le build Angular en production si présent
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist', 'client');
const clientIndexPath = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientIndexPath)) {
    app.use(express.static(clientDistPath));
    // Express 5 + path-to-regexp: éviter '*' qui peut casser
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(clientIndexPath);
    });
}

const DEFAULT_PORT = 3001;
const requestedPort = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

// Important en dev: le front (proxy Angular) cible un port fixe (3001).
// Si on démarre sur 3002/3003 automatiquement, l'app casse. Donc on échoue clairement.
const server = app.listen(requestedPort, '0.0.0.0', () => {
    console.log(`Serveur démarré et écoute sur le port ${requestedPort}`);
});

server.on('error', (err) => {
    console.error('Erreur démarrage serveur:', err);
    process.exit(1);
});