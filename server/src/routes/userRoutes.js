const express = require('express');
const router = express.Router();
const { registerLegacy, loginLegacy } = require('../controllers/authController');

// Auth legacy (front actuel)
router.post('/register', registerLegacy);
router.post('/login', loginLegacy);

module.exports = router;