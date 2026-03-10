const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const historyController = require('../controllers/historyController');

// GET /api/history/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/summary', authenticateToken, historyController.getSummary);

module.exports = router;
