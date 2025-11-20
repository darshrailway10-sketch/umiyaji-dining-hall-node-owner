const Billing = require('../models/Billing.model');
const Student = require('../models/Student.model');
const Notification = require('../models/Notification.model');

// Helper function to remove student from overdue notification
async function _removeStudentFromOverdueNotification(userId, studentId, paymentMonth) {
  try {
    // Find overdue notification for this month
    const notification = await Notification.findOne({
      createdBy: userId,
      type: 'overdue_payment',
      'metadata.month': paymentMonth,
    });

    if (notification && notification.studentIds && notification.studentIds.length > 0) {
      // Remove student from the notification
      const studentIdObj = typeof studentId === 'string' ? studentId : studentId.toString();
      const updatedStudentIds = notification.studentIds.filter(
        id => id.toString() !== studentIdObj
      );
      
      // Get student names for remaining IDs
      const students = await Student.find({
        _id: { $in: updatedStudentIds },
      }).select('fullName').lean();
      
      const updatedStudentNames = students.map(s => s.fullName);

      if (updatedStudentIds.length === 0) {
        // No more overdue students, delete the notification
        await Notification.deleteOne({ _id: notification._id });
      } else {
        // Update notification with remaining students
        notification.studentIds = updatedStudentIds;
        notification.studentNames = updatedStudentNames;
        notification.message = `${updatedStudentNames.length} student${updatedStudentNames.length > 1 ? 's' : ''} have overdue payments for ${paymentMonth}`;
        notification.metadata.count = updatedStudentNames.length;
        notification.isRead = false; // Mark as unread when updated
        await notification.save();
      }
    }
  } catch (error) {
    console.error('Error removing student from overdue notification:', error);
    // Don't throw error, just log it
  }
}

// Get all billing records with pagination
exports.getBillingRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const studentId = req.query.studentId;
    const paymentMonth = req.query.paymentMonth;
    const paymentMode = req.query.paymentMode;

    const query = { createdBy: req.userId || req.user._id || req.user.id };
    
    if (studentId) {
      query.studentId = studentId;
    }

    if (paymentMonth) {
      query.paymentMonth = paymentMonth;
    }

    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    const [billingRecords, total] = await Promise.all([
      Billing.find(query)
        .populate('studentId', 'fullName email phoneNumber')
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Billing.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        billing: billingRecords,
        pagination: {
          currentPage: page,
          totalPages,
          total,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching billing records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Add billing record
exports.addBillingRecord = async (req, res) => {
  try {
    const { studentId, paymentDate, paymentTime, paymentMode, utrNumber, paymentMonth, amount } = req.body;

    if (!studentId || !paymentDate || !paymentTime || !paymentMode || !paymentMonth || !amount) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    // Verify student belongs to the user
    const student = await Student.findOne({
      _id: studentId,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or unauthorized',
      });
    }

    const billing = new Billing({
      studentId,
      paymentDate: new Date(paymentDate),
      paymentTime,
      paymentMode,
      utrNumber: paymentMode === 'Online' ? utrNumber : null,
      paymentMonth,
      amount,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    await billing.save();
    await billing.populate('studentId', 'fullName email phoneNumber');

    // Remove student from overdue notification if payment is received
    await _removeStudentFromOverdueNotification(
      req.userId || req.user._id || req.user.id,
      studentId,
      paymentMonth
    );

    res.status(201).json({
      success: true,
      message: 'Billing record added successfully',
      data: billing,
    });
  } catch (error) {
    console.error('Error adding billing record:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding billing record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update billing record
exports.updateBillingRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentDate, paymentTime, paymentMode, utrNumber, paymentMonth, amount } = req.body;

    const billing = await Billing.findOne({
      _id: id,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found or unauthorized',
      });
    }

    if (paymentDate) billing.paymentDate = new Date(paymentDate);
    if (paymentTime) billing.paymentTime = paymentTime;
    if (paymentMode) billing.paymentMode = paymentMode;
    if (utrNumber !== undefined) billing.utrNumber = paymentMode === 'Online' ? utrNumber : null;
    if (paymentMonth) billing.paymentMonth = paymentMonth;
    if (amount !== undefined) billing.amount = amount;

    await billing.save();
    await billing.populate('studentId', 'fullName email phoneNumber');

    // Remove student from overdue notification if payment is received
    // Use updated paymentMonth or existing one
    const finalPaymentMonth = paymentMonth || billing.paymentMonth;
    if (finalPaymentMonth) {
      await _removeStudentFromOverdueNotification(
        req.userId || req.user._id || req.user.id,
        billing.studentId.toString(),
        finalPaymentMonth
      );
    }

    res.status(200).json({
      success: true,
      message: 'Billing record updated successfully',
      data: billing,
    });
  } catch (error) {
    console.error('Error updating billing record:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating billing record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Delete billing record
exports.deleteBillingRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const billing = await Billing.findOneAndDelete({
      _id: id,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Billing record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting billing record:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting billing record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get overdue payments (for notifications)
exports.getOverduePayments = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = currentDate.getDate();

    // Only check if we're on or past the 11th of the month (after 10 days from month start)
    // On 11th date, check which students are overdue
    if (currentDay < 11) {
      return res.status(200).json({
        success: true,
        data: {
          overduePayments: [],
        },
      });
    }

    // Get all active students for this user
    const students = await Student.find({
      createdBy: req.userId || req.user._id || req.user.id,
      isActive: true,
    }).select('_id fullName').lean();

    const studentIds = students.map(s => s._id);

    // Get payments for current month (only payments received after 10th day are considered)
    // But we check all payments to see who hasn't paid at all
    const currentMonthPayments = await Billing.find({
      createdBy: req.userId || req.user._id || req.user.id,
      paymentMonth: currentMonth,
      studentId: { $in: studentIds },
    }).select('studentId').lean();

    const paidStudentIds = currentMonthPayments.map(p => p.studentId.toString());

    // Find students who haven't paid (these are overdue after 10th day)
    const overdueStudents = students.filter(
      s => !paidStudentIds.includes(s._id.toString())
    );

    // Create or update notification if there are overdue payments
    if (overdueStudents.length > 0) {
      const studentNames = overdueStudents.map(s => s.fullName);
      const overdueStudentIds = overdueStudents.map(s => s._id);

      // Check if notification already exists for this month
      const existingNotification = await Notification.findOne({
        createdBy: req.userId || req.user._id || req.user.id,
        type: 'overdue_payment',
        'metadata.month': currentMonth,
      });

      if (!existingNotification) {
        // Create new notification
        await Notification.create({
          title: 'Overdue Payments',
          message: `${studentNames.length} student${studentNames.length > 1 ? 's' : ''} have overdue payments for ${currentMonth}`,
          type: 'overdue_payment',
          studentIds: overdueStudentIds,
          studentNames: studentNames,
          createdBy: req.userId || req.user._id || req.user.id,
          metadata: {
            month: currentMonth,
            count: studentNames.length,
          },
        });
      } else {
        // Update existing notification with current overdue students
        // Only update if the list has changed
        const existingStudentIds = existingNotification.studentIds.map(id => id.toString());
        const newStudentIds = overdueStudentIds.map(id => id.toString());
        
        // Check if lists are different
        const listsEqual = existingStudentIds.length === newStudentIds.length &&
          existingStudentIds.every(id => newStudentIds.includes(id));

        if (!listsEqual) {
          existingNotification.studentIds = overdueStudentIds;
          existingNotification.studentNames = studentNames;
          existingNotification.message = `${studentNames.length} student${studentNames.length > 1 ? 's' : ''} have overdue payments for ${currentMonth}`;
          existingNotification.metadata.count = studentNames.length;
          existingNotification.isRead = false; // Mark as unread when updated
          await existingNotification.save();
        }
      }
    } else {
      // No overdue students, delete notification if it exists
      await Notification.deleteMany({
        createdBy: req.userId || req.user._id || req.user.id,
        type: 'overdue_payment',
        'metadata.month': currentMonth,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        overduePayments: overdueStudents.map(s => ({
          studentId: s._id,
          studentName: s.fullName,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching overdue payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Toggle billing management for a student (enable/disable)
exports.toggleBillingManagement = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { isActive } = req.body;

    // Verify student belongs to the user
    const student = await Student.findOne({
      _id: studentId,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or unauthorized',
      });
    }

    // Update all billing records for this student
    await Billing.updateMany(
      {
        studentId,
        createdBy: req.userId || req.user._id || req.user.id,
      },
      {
        $set: { isActive: isActive !== false },
      }
    );

    res.status(200).json({
      success: true,
      message: `Billing management ${isActive !== false ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling billing management:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling billing management',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

