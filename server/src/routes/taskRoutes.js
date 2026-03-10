const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middlewares/auth');

// GET : /api/tasks?date=...
router.get('/', auth, taskController.getTasks);

// POST : /api/tasks
router.post('/', auth, taskController.createTask);

// PUT : /api/tasks/:id (Ligne 17 qui posait problème)
// Assure-toi que le nom est BIEN updateTaskStatus
router.put('/:id', auth, taskController.updateTaskStatus);

// DELETE : /api/tasks/:id
router.delete('/:id', auth, taskController.deleteTask);

module.exports = router;