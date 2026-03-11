const db = require('../config/database');

const TaskModel = {
    // Récupérer les tâches d'un utilisateur pour une date précise
    getTasksByDate: (userId, date, callback) => {
        const sql = `SELECT * FROM tasks WHERE user_id = ? AND task_date = ? ORDER BY id ASC`;
        db.all(sql, [userId, date], callback);
    },

    // Ajouter une nouvelle tâche
    createTask: (userId, description, date, callback) => {
        const sql = `INSERT INTO tasks (user_id, description, is_completed, task_date) VALUES (?, ?, 0, ?) RETURNING id`;
        db.run(sql, [userId, description, date], function(err) {
            callback(err, this ? this.lastID : null);
        });
    },

    // Mettre à jour le statut (cocher/décocher)
    updateTaskStatus: (userId, taskId, isCompleted, callback) => {
        const sql = `UPDATE tasks SET is_completed = ? WHERE id = ? AND user_id = ?`;
        db.run(sql, [isCompleted ? 1 : 0, taskId, userId], function(err) {
            callback(err);
        });
    },

    // Mettre à jour une tâche (description et/ou statut)
    updateTask: (userId, taskId, fields, callback) => {
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

        if (setClauses.length === 0) {
            callback(new Error('Aucun champ à mettre à jour'));
            return;
        }

        const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;
        params.push(taskId, userId);
        db.run(sql, params, function(err) {
            callback(err);
        });
    },

    // Supprimer une tâche
    deleteTask: (userId, taskId, callback) => {
        const sql = `DELETE FROM tasks WHERE id = ? AND user_id = ?`;
        db.run(sql, [taskId, userId], function(err) {
            callback(err);
        });
    }
};

module.exports = TaskModel;