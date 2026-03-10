const express = require('express');
const router = express.Router();
const dailyEntryController = require('../controllers/dailyEntryController');
const authenticateToken = require('../middlewares/auth');

// GET /api/journal?date=YYYY-MM-DD
router.get('/', authenticateToken, dailyEntryController.getJournalEntry);

// POST /api/journal (Sert à la fois pour créer et pour mettre à jour)
router.post('/', authenticateToken, dailyEntryController.saveJournalEntry);

module.exports = router;