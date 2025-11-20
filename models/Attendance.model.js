const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null, // null for batch attendance
  },
  studentIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Student',
    default: null, // for batch attendance
  },
  attendanceDate: {
    type: Date,
    required: [true, 'Attendance date is required'],
    default: Date.now,
  },
  isPresent: {
    type: Boolean,
    default: true,
  },
  isBatch: {
    type: Boolean,
    default: false,
  },
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner'],
    default: 'Lunch',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
attendanceSchema.index({ createdBy: 1, attendanceDate: -1 });
attendanceSchema.index({ studentId: 1, attendanceDate: -1 });
attendanceSchema.index({ isBatch: 1, createdBy: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;

