const TaskModel = require('../models/taskModel');

// 1. Récupérer les tâches
exports.getTasks = (req, res) => {
    const userId = req.userData.id;
    const { date } = req.query;

    TaskModel.getTasksByDate(userId, date, (err, tasks) => {
        if (err) return res.status(500).json({ error: "Erreur récupération" });
        res.json(tasks);
    });
};

// 2. Créer une tâche
exports.createTask = (req, res) => {
    const userId = req.userData.id;
    const { description, date, category } = req.body;

    const normalizedCategory = typeof category === 'string' && category.trim() ? category.trim() : 'Perso';

    TaskModel.createTask(userId, description, date, normalizedCategory, (err, lastId) => {
        if (err) return res.status(500).json({ error: "Erreur création" });
        res.status(201).json({ id: lastId });
    });
};

// 3. Mettre à jour (C'est souvent ici que l'erreur 'put' arrive)
exports.updateTaskStatus = (req, res) => {
    const userId = req.userData.id;
    const taskId = req.params.id;
    const { is_completed, description, category } = req.body;

    const hasDescription = typeof description === 'string';
    const hasCompleted = typeof is_completed !== 'undefined';
    const hasCategory = typeof category === 'string';

    if (!hasDescription && !hasCompleted && !hasCategory) {
        return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    if (hasDescription && !description.trim()) {
        return res.status(400).json({ error: "Description invalide" });
    }

    const fields = {};
    if (hasDescription) fields.description = description.trim();
    if (hasCompleted) fields.is_completed = !!is_completed;
    if (hasCategory) {
        const trimmed = category.trim();
        if (!trimmed) return res.status(400).json({ error: "Catégorie invalide" });
        fields.category = trimmed;
    }

    // Un seul endpoint pour compat: status (checkbox) + edition description
    TaskModel.updateTask(userId, taskId, fields, (err) => {
        if (err) return res.status(500).json({ error: "Erreur mise à jour" });
        res.json({ message: "Tâche mise à jour" });
    });
};

// 4. Supprimer
exports.deleteTask = (req, res) => {
    const userId = req.userData.id;
    const taskId = req.params.id;

    TaskModel.deleteTask(userId, taskId, (err) => {
        if (err) return res.status(500).json({ error: "Erreur suppression" });
        res.json({ message: "Tâche supprimée" });
    });
};