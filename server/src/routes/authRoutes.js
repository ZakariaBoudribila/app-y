const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const { register, login, refresh, logout, me, changePassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
