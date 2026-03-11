const app = require('./app');

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