const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const profileController = require('../controllers/profileController');

// GET /api/profile
router.get('/', auth, profileController.getProfile);

// POST /api/profile
router.post('/', auth, profileController.saveProfile);

module.exports = router;
