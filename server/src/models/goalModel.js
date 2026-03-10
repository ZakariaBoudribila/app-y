const db = require('../config/database');

const Goal = {
    createGoal: (userId, description, goalDate, callback) => {
        // On conserve la colonne type (NOT NULL) mais on standardise sur 'DATE'
        const sql = `INSERT INTO goals (user_id, description, type, is_completed, goal_date) VALUES (?, ?, 'DATE', 0, ?)`;
        db.run(sql, [userId, description, goalDate], function(err) {
            callback(err, this ? this.lastID : null);
        });
    },

    getGoalsByDate: (userId, goalDate, callback) => {
        const sql = `SELECT * FROM goals WHERE user_id = ? AND goal_date = ? ORDER BY id ASC`;
        db.all(sql, [userId, goalDate], callback);
    },

    updateGoalStatus: (userId, goalId, isCompleted, callback) => {
        const sql = `UPDATE goals SET is_completed = ? WHERE id = ? AND user_id = ?`;
        db.run(sql, [isCompleted ? 1 : 0, goalId, userId], function(err) {
            callback(err);
        });
    },

    updateGoal: (userId, goalId, fields, callback) => {
        const setClauses = [];
        const params = [];

        if (Object.prototype.hasOwnProperty.call(fields, 'description')) {
            setClauses.push('description = ?');
            params.push(fields.description);
        }

        if (Object.prototype.hasOwnProperty.call(fields, 'is_completed')) {
            setClauses.push('is_completed = ?');
            params.push(fields.is_completed ? 1 : 0);
        }

        if (Object.prototype.hasOwnProperty.call(fields, 'goal_date')) {
            setClauses.push('goal_date = ?');
            params.push(fields.goal_date ?? null);
        }

        if (setClauses.length === 0) {
            callback(new Error('Aucun champ à mettre à jour'));
            return;
        }

        const sql = `UPDATE goals SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;
        params.push(goalId, userId);
        db.run(sql, params, function(err) {
            callback(err);
        });
    },

    deleteGoal: (userId, goalId, callback) => {
        const sql = `DELETE FROM goals WHERE id = ? AND user_id = ?`;
        db.run(sql, [goalId, userId], function(err) {
            callback(err);
        });
    },
};

module.exports = Goal;