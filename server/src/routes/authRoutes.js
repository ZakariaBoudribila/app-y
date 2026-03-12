const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const { register, login, refresh, logout, me } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
