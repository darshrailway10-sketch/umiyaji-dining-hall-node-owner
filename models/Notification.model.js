const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
  },
  type: {
    type: String,
    enum: ['overdue_payment', 'payment_received', 'attendance', 'other'],
    default: 'other',
  },
  studentIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Student',
    default: [],
  },
  studentNames: {
    type: [String],
    default: [],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index for efficient queries
notificationSchema.index({ createdBy: 1, createdAt: -1 });
notificationSchema.index({ createdBy: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdBy: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

