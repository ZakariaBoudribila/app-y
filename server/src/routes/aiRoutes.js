const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const aiController = require('../controllers/aiController');

// POST /api/ai/chat
router.post('/chat', auth, aiController.chatWithAI);

// POST /api/ai/reorder-tasks
router.post('/reorder-tasks', auth, aiController.reorderTasksWithAI);

module.exports = router;
