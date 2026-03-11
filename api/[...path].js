// Vercel Serverless Function: route toutes les requêtes /api/* vers Express
const app = require('../server/src/app');

module.exports = (req, res) => app(req, res);
