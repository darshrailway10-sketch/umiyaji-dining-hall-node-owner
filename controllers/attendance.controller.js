const Attendance = require('../models/Attendance.model');
const Student = require('../models/Student.model');

// Get all attendance records with pagination
exports.getAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const date = req.query.date;
    const isBatch = req.query.isBatch;

    const query = { createdBy: req.userId || req.user._id || req.user.id };
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.attendanceDate = { $gte: startDate, $lte: endDate };
    }

    if (isBatch !== undefined) {
      query.isBatch = isBatch === 'true';
    }

    const [attendanceRecords, total] = await Promise.all([
      Attendance.find(query)
        .populate('studentId', 'fullName email phoneNumber')
        .populate('studentIds', 'fullName email phoneNumber')
        .sort({ attendanceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    // For batch attendance, get student details
    const attendanceWithStudents = await Promise.all(
      attendanceRecords.map(async (record) => {
        if (record.isBatch && record.studentIds && record.studentIds.length > 0) {
          const students = await Student.find({
            _id: { $in: record.studentIds },
          }).select('fullName email phoneNumber').lean();
          record.students = students;
        } else if (record.studentId && !record.isBatch) {
          // For single attendance, ensure studentId is populated or fetch it
          if (typeof record.studentId === 'object' && record.studentId._id) {
            // Already populated
            record.students = [record.studentId];
          } else {
            // Need to fetch student details
            const student = await Student.findById(record.studentId)
              .select('fullName email phoneNumber')
              .lean();
            if (student) {
              record.students = [student];
              record.studentId = student; // Update to populated object
            }
          }
        }
        return record;
      })
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        attendance: attendanceWithStudents,
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
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Add batch attendance
exports.addBatchAttendance = async (req, res) => {
  try {
    const { studentIds, attendanceDate, isPresent = true, mealType = 'Lunch' } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one student is required',
      });
    }

    // Verify all students belong to the user
    const students = await Student.find({
      _id: { $in: studentIds },
      createdBy: req.userId || req.user._id || req.user.id,
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some students not found or unauthorized',
      });
    }

    const attendance = new Attendance({
      studentIds,
      attendanceDate: attendanceDate ? new Date(attendanceDate) : new Date(),
      isPresent,
      isBatch: true,
      mealType,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    await attendance.save();

    // Populate student details
    await attendance.populate('studentIds', 'fullName email phoneNumber');

    res.status(201).json({
      success: true,
      message: 'Batch attendance added successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Error adding batch attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding batch attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Add single student attendance
exports.addSingleAttendance = async (req, res) => {
  try {
    const { studentId, attendanceDate, isPresent = true, mealType = 'Lunch' } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
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

    const attendance = new Attendance({
      studentId,
      attendanceDate: attendanceDate ? new Date(attendanceDate) : new Date(),
      isPresent,
      isBatch: false,
      mealType,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    await attendance.save();
    await attendance.populate('studentId', 'fullName email phoneNumber');

    res.status(201).json({
      success: true,
      message: 'Attendance added successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Error adding attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update attendance
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds, attendanceDate, isPresent, mealType } = req.body;

    const attendance = await Attendance.findOne({
      _id: id,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    if (attendanceDate) attendance.attendanceDate = new Date(attendanceDate);
    if (isPresent !== undefined) attendance.isPresent = isPresent;
    if (mealType) attendance.mealType = mealType;
    
    // For batch attendance, update student IDs
    if (studentIds && Array.isArray(studentIds) && attendance.isBatch) {
      // Verify all students belong to the user
      const students = await Student.find({
        _id: { $in: studentIds },
        createdBy: req.userId || req.user._id || req.user.id,
      });

      if (students.length !== studentIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some students not found or unauthorized',
        });
      }
      attendance.studentIds = studentIds;
    }

    await attendance.save();
    await attendance.populate('studentId', 'fullName email phoneNumber');
    await attendance.populate('studentIds', 'fullName email phoneNumber');

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Delete attendance
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findOneAndDelete({
      _id: id,
      createdBy: req.userId || req.user._id || req.user.id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Remove student from batch attendance
exports.removeStudentFromBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    const attendance = await Attendance.findOne({
      _id: id,
      createdBy: req.userId || req.user._id || req.user.id,
      isBatch: true,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Batch attendance record not found',
      });
    }

    if (!attendance.studentIds || !attendance.studentIds.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student not found in this batch',
      });
    }

    attendance.studentIds = attendance.studentIds.filter(
      (id) => id.toString() !== studentId
    );

    // If no students left, delete the batch
    if (attendance.studentIds.length === 0) {
      await Attendance.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'Batch attendance deleted (no students remaining)',
      });
    }

    await attendance.save();
    await attendance.populate('studentIds', 'fullName email phoneNumber');

    res.status(200).json({
      success: true,
      message: 'Student removed from batch successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('Error removing student from batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing student from batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

