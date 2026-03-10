const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Important: utiliser un chemin stable (sinon `./journal.db` dépend du cwd au démarrage)
const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(__dirname, '..', '..', 'journal.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur de connexion à la base SQLite :', err.message);
    } else {
        console.log('Connecté avec succès à la base de données SQLite.');
        initialiserTables();
    }
});

function initialiserTables() {
    db.serialize(() => {
        // Activer le support des clés étrangères (obligatoire pour SQLite)
        db.run("PRAGMA foreign_keys = ON");

        // 1. Table Utilisateurs (Authentification)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )`);

        // 2. Table pour les tâches (Daily To-Do)
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            is_completed INTEGER DEFAULT 0,
            task_date DATE NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        // 3. Table pour les objectifs (Weekly & Future Goals)
        db.run(`CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL,
            is_completed INTEGER DEFAULT 0,
            goal_date DATE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        // Migration légère: si une ancienne table goals existe sans goal_date
        db.all(`PRAGMA table_info(goals)`, (err, cols) => {
            if (err) return;
            const hasGoalDate = Array.isArray(cols) && cols.some(c => c && c.name === 'goal_date');
            if (hasGoalDate) return;
            db.run(`ALTER TABLE goals ADD COLUMN goal_date DATE`, () => {});
        });

        // 4. Table pour le journal de bord (Notes, Journal & Mood Tracker)
        db.run(`CREATE TABLE IF NOT EXISTS daily_entries (
            entry_date DATE NOT NULL,
            user_id INTEGER NOT NULL,
            notes TEXT,
            journal_content TEXT,
            mood_score INTEGER,
            PRIMARY KEY (entry_date, user_id),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        console.log('Tables initialisées avec succès.');
    });
}

module.exports = db;