const GoalModel = require('../models/goalModel');

function normalizeDate(value) {
    const date = typeof value === 'string' ? value.trim() : '';
    if (!date) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
    return date;
}

// Récupérer les objectifs d'une date précise (calendrier)
exports.getGoals = (req, res) => {
    const userId = req.userData.id;
    const normalized = normalizeDate(req.query.date);

    if (normalized === undefined) {
        return res.status(400).json({ error: 'Format date invalide (YYYY-MM-DD)' });
    }
    if (normalized === null) {
        return res.status(400).json({ error: 'Le paramètre date est requis (YYYY-MM-DD)' });
    }

    GoalModel.getGoalsByDate(userId, normalized, (err, goals) => {
        if (err) return res.status(500).json({ error: 'Erreur DB' });
        res.json(goals);
    });
};

// Ajouter un objectif sur une date précise
exports.addGoal = (req, res) => {
    const userId = req.userData.id;
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    // Compat: accepter aussi l'ancien champ `date` si présent côté front
    const rawDate = (req.body && (req.body.goal_date ?? req.body.date)) ?? null;
    const normalized = normalizeDate(rawDate);

    if (!description) {
        return res.status(400).json({ error: 'Description manquante' });
    }
    if (normalized === undefined) {
        return res.status(400).json({ error: 'Format date invalide (YYYY-MM-DD)' });
    }
    if (normalized === null) {
        return res.status(400).json({ error: 'goal_date (ou date) est requis (YYYY-MM-DD)' });
    }

    GoalModel.createGoal(userId, description, normalized, (err, lastId) => {
        if (err) {
            console.error('Erreur SQL détaillée:', err.message);
            return res.status(500).json({ error: 'Erreur base de données' });
        }
        res.status(201).json({ id: lastId, message: 'Objectif ajouté !' });
    });
};

// Mettre à jour un objectif: checkbox + edition texte + date
exports.updateGoal = (req, res) => {
    const userId = req.userData.id;
    const goalId = req.params.id;
    // Compat: accepter aussi `date` en alias de `goal_date`
    const { is_completed, description, goal_date, date } = req.body ?? {};

    const hasCompleted = typeof is_completed !== 'undefined';
    const hasDescription = typeof description !== 'undefined';
    const hasGoalDate = typeof goal_date !== 'undefined' || typeof date !== 'undefined';

    if (!hasCompleted && !hasDescription && !hasGoalDate) {
        return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    if (hasDescription) {
        const nextDescription = String(description).trim();
        if (!nextDescription) {
            return res.status(400).json({ error: 'description ne peut pas être vide' });
        }
    }

    let normalized = null;
    if (hasGoalDate) {
        const rawGoalDate = typeof goal_date !== 'undefined' ? goal_date : date;
        normalized = normalizeDate(rawGoalDate);
        if (normalized === undefined) {
            return res.status(400).json({ error: 'Format date invalide (YYYY-MM-DD)' });
        }
        if (normalized === null) {
            return res.status(400).json({ error: 'goal_date (ou date) est requis (YYYY-MM-DD)' });
        }
    }

    const fields = {};
    if (hasDescription) fields.description = String(description).trim();
    if (hasCompleted) fields.is_completed = !!is_completed;
    if (hasGoalDate) fields.goal_date = normalized;

    GoalModel.updateGoal(userId, goalId, fields, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Objectif mis à jour' });
    });
};

exports.deleteGoal = (req, res) => {
    const userId = req.userData.id;
    const goalId = req.params.id;

    GoalModel.deleteGoal(userId, goalId, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Objectif supprimé' });
    });
};

