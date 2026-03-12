const { verifyAccessToken } = require('../utils/tokens');
const db = require('../config/database');

module.exports = (req, res, next) => {
    // On récupère le token dans le header "Authorization: Bearer <TOKEN>"
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentification échouée' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
        return res.status(401).json({ message: 'Authentification échouée' });
    }

    let decoded;
    try {
        decoded = verifyAccessToken(token);
    } catch (error) {
        return res.status(401).json({ message: 'Authentification échouée' });
    }

    const userId = decoded.sub ?? decoded.id;
    if (!userId) {
        return res.status(401).json({ message: 'Authentification échouée' });
    }

    // Sécurité/robustesse: si la DB a été recréée, un ancien token peut référencer un user absent.
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur base de données' });
        }
        if (!row) {
            return res.status(401).json({ message: 'Utilisateur introuvable, reconnecte-toi' });
        }

        // On ajoute les infos de l'utilisateur à la requête pour les controllers
        req.user = decoded;
        req.userData = {
            ...decoded,
            id: typeof userId === 'string' ? Number(userId) || userId : userId,
        };
        next();
    });
};