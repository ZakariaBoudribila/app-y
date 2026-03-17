const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const profileController = require('../controllers/profileController');

// Espace Pro: éviter tout cache/304 (XHR peut recevoir un body vide).
router.use((req, res, next) => {
	res.setHeader('Cache-Control', 'no-store, max-age=0');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');
	res.setHeader('Surrogate-Control', 'no-store');
	next();
});

// GET /api/profile
router.get('/', auth, profileController.getProfile);

// POST /api/profile
router.post('/', auth, profileController.saveProfile);

module.exports = router;
