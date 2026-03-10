const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const authenticateToken = require('../middlewares/auth');

// Toutes ces routes seront préfixées par /api/goals
router.get('/', authenticateToken, goalController.getGoals);
router.post('/', authenticateToken, goalController.addGoal);
router.put('/:id', authenticateToken, goalController.updateGoal);
router.delete('/:id', authenticateToken, goalController.deleteGoal);

module.exports = router;