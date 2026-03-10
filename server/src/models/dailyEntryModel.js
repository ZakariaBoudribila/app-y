const db = require('../config/database');

const JournalModel = {
    // Récupérer l'entrée du journal pour une date spécifique
    getEntryByDate: (userId, date, callback) => {
        const sql = `
            SELECT
                journal_content AS content,
                mood_score
            FROM daily_entries
            WHERE user_id = ? AND entry_date = ?
        `;
        db.get(sql, [userId, date], callback);
    },

    // Créer ou mettre à jour une entrée (Upsert)
    // NOTE: content et moodScore peuvent être null pour préserver la valeur existante.
    saveEntry: (userId, date, content, moodScore, callback) => {
        const checkSql = `SELECT 1 FROM daily_entries WHERE user_id = ? AND entry_date = ?`;

        db.get(checkSql, [userId, date], (err, row) => {
            if (err) return callback(err);

            if (row) {
                const updateSql = `
                    UPDATE daily_entries
                    SET
                        journal_content = COALESCE(?, journal_content),
                        mood_score = COALESCE(?, mood_score)
                    WHERE user_id = ? AND entry_date = ?
                `;
                db.run(updateSql, [content, moodScore, userId, date], callback);
                return;
            }

            const insertSql = `
                INSERT INTO daily_entries (entry_date, user_id, journal_content, mood_score)
                VALUES (?, ?, ?, ?)
            `;
            const insertContent = content ?? '';
            const insertMood = moodScore ?? 5;
            db.run(insertSql, [date, userId, insertContent, insertMood], callback);
        });
    }
};

module.exports = JournalModel;