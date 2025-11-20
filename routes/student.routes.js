const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All student routes require authentication
router.use(authenticate);

// Get all students with pagination
router.get('/', studentController.getStudents);

// Add new student
router.post('/', studentController.addStudent);

// Update student
router.put('/:id', studentController.updateStudent);

// Delete student
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

