const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const aiController = require('../controllers/aiController');
const supportController = require('../controllers/supportController');

// POST /api/ai/chat
router.post('/chat', auth, aiController.chatWithAI);

// POST /api/ai/reorder-tasks
router.post('/reorder-tasks', auth, aiController.reorderTasksWithAI);

// POST /api/ai/support
router.post('/support', auth, supportController.askSupport);

module.exports = router;
