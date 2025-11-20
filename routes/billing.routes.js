const express = require('express');
const router = express.Router();
const {
  getBillingRecords,
  addBillingRecord,
  updateBillingRecord,
  deleteBillingRecord,
  getOverduePayments,
  toggleBillingManagement,
} = require('../controllers/billing.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Get billing records with pagination
router.get('/', getBillingRecords);

// Get overdue payments (for notifications)
router.get('/overdue', getOverduePayments);

// Add billing record
router.post('/', addBillingRecord);

// Update billing record
router.put('/:id', updateBillingRecord);

// Delete billing record
router.delete('/:id', deleteBillingRecord);

// Toggle billing management for a student
router.patch('/student/:studentId/toggle', toggleBillingManagement);

module.exports = router;

