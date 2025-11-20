const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Upload image route (protected)
router.post('/image', authenticate, upload.single('image'), uploadController.uploadImage);

module.exports = router;

