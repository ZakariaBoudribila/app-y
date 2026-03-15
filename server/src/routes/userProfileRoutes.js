const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const userProfileController = require('../controllers/userProfileController');

// GET /api/user-profile
router.get('/', auth, userProfileController.getUserProfile);

// POST /api/user-profile (upsert)
router.post('/', auth, userProfileController.upsertUserProfile);

module.exports = router;
