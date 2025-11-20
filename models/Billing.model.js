const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now,
  },
  paymentTime: {
    type: String,
    required: [true, 'Payment time is required'],
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Online', 'Google Pay', 'Paytm', 'PhonePe', 'Other'],
    required: [true, 'Payment mode is required'],
  },
  utrNumber: {
    type: String,
    default: null, // For online payments
  },
  paymentMonth: {
    type: String,
    required: [true, 'Payment month is required'],
    // Format: "YYYY-MM" e.g., "2025-01"
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount must be positive'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true, // For enable/disable billing management
  },
}, {
  timestamps: true,
});

// Index for efficient queries
billingSchema.index({ createdBy: 1, paymentDate: -1 });
billingSchema.index({ studentId: 1, paymentMonth: 1 });
billingSchema.index({ paymentMonth: 1, createdBy: 1 });

const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;

