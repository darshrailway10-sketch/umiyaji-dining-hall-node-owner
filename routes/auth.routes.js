const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Register route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

// Update profile route (protected)
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;

