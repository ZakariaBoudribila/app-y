const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// DB partagée (PostgreSQL) + tables initialisées dans src/config/database.js
const db = require('../config/database');

const { SECRET_KEY } = require('../config/auth');

// Inscription
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    if (!normalizedUsername || !normalizedEmail || !password) {
        return res.status(400).json({ error: "Champs manquants" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`;
        db.run(sql, [normalizedUsername, normalizedEmail, hashedPassword], function(err) {
            if (err) {
                console.error("Erreur SQLite détaillée:", err.message); // REGARDE TON TERMINAL ICI
                return res.status(400).json({ error: "Email déjà utilisé ou erreur base de données" });
            }
            res.status(201).json({ message: "Utilisateur créé avec succès" });
        });
    } catch (e) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Connexion
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || !password) {
        return res.status(400).json({ error: 'Champs manquants' });
    }
    
    db.get(`SELECT * FROM users WHERE email = ?`, [normalizedEmail], async (err, user) => {
        if (err) return res.status(500).json({ error: "Erreur base de données" });
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Identifiants incorrects" });
        }
        
        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ 
            token, 
            user: { username: user.username } 
        });
    });
});

module.exports = router;