const { Pool } = require('pg');

const MISSING_DATABASE_URL_MESSAGE =
    "DATABASE_URL est manquant. Configure une base PostgreSQL (Neon/Supabase/Vercel Postgres) et définis DATABASE_URL dans tes variables d'environnement.";

if (!process.env.DATABASE_URL) {
    console.error(MISSING_DATABASE_URL_MESSAGE);
    // On n'auto-exit pas ici: certains outils importent ce fichier sans démarrer le serveur.
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : (process.env.DATABASE_SSL === 'false' ? false : undefined),
});

function safeDbLabel() {
    const raw = process.env.DATABASE_URL;
    if (!raw) return '(DATABASE_URL manquant)';
    try {
        const url = new URL(raw);
        // Ne pas logguer user/password.
        const dbName = url.pathname?.replace(/^\//, '') || '(db inconnue)';
        const host = url.host || '(host inconnu)';
        return `${host}/${dbName}`;
    } catch {
        return '(DATABASE_URL invalide)';
    }
}

let initPromise;

async function init() {
    if (!process.env.DATABASE_URL) return;
    await pool.query('SELECT 1');

    // Schéma compatible avec l'ancien SQLite.
    // On garde is_completed en SMALLINT (0/1) pour éviter de toucher aux requêtes existantes.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    `);

    // Compat auth: role RBAC (ajout non destructif)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`);

    // Refresh tokens rotatifs (whitelist)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            token_hash TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            family TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            revoked_at TIMESTAMPTZ
        )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens(family)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            is_completed SMALLINT NOT NULL DEFAULT 0,
            task_date DATE NOT NULL
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            type TEXT NOT NULL,
            is_completed SMALLINT NOT NULL DEFAULT 0,
            goal_date DATE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_entries (
            entry_date DATE NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notes TEXT,
            journal_content TEXT,
            mood_score INTEGER,
            PRIMARY KEY (entry_date, user_id)
        )
    `);

    console.log(`Connecté à PostgreSQL (${safeDbLabel()}) et tables initialisées.`);
}

function ensureInit() {
    if (!initPromise) initPromise = init().catch((err) => {
        console.error('Erreur init PostgreSQL:', err);
        throw err;
    });
    return initPromise;
}

function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

const db = {
    all(sql, params, callback) {
        if (!process.env.DATABASE_URL) {
            callback(new Error(MISSING_DATABASE_URL_MESSAGE));
            return;
        }
        ensureInit()
            .then(() => pool.query(convertPlaceholders(sql), params))
            .then((result) => callback(null, result.rows))
            .catch((err) => callback(err));
    },

    get(sql, params, callback) {
        if (!process.env.DATABASE_URL) {
            callback(new Error(MISSING_DATABASE_URL_MESSAGE));
            return;
        }
        ensureInit()
            .then(() => pool.query(convertPlaceholders(sql), params))
            .then((result) => callback(null, result.rows[0]))
            .catch((err) => callback(err));
    },

    run(sql, params, callback) {
        if (!process.env.DATABASE_URL) {
                callback.call({ lastID: null, changes: 0 }, new Error(MISSING_DATABASE_URL_MESSAGE));
            return;
        }
        ensureInit()
            .then(() => pool.query(convertPlaceholders(sql), params))
            .then((result) => {
                const lastID = result?.rows?.[0]?.id ?? null;
                    const changes = typeof result?.rowCount === 'number' ? result.rowCount : 0;
                // Simule sqlite3: callback appelé avec un `this.lastID`.
                    callback.call({ lastID, changes }, null);
            })
                .catch((err) => callback.call({ lastID: null, changes: 0 }, err));
    }
};

module.exports = db;