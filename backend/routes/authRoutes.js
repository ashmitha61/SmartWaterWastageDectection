const express = require('express');
const router = express.Router();
const { login, register, getDemoUsers } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/demo-users', getDemoUsers);

module.exports = router;
