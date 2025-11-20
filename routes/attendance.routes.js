const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All attendance routes require authentication
router.use(authenticate);

// Get all attendance with pagination
router.get('/', attendanceController.getAttendance);

// Add batch attendance
router.post('/batch', attendanceController.addBatchAttendance);

// Add single student attendance
router.post('/single', attendanceController.addSingleAttendance);

// Update attendance
router.put('/:id', attendanceController.updateAttendance);

// Delete attendance
router.delete('/:id', attendanceController.deleteAttendance);

// Remove student from batch
router.delete('/:id/student', attendanceController.removeStudentFromBatch);

module.exports = router;

