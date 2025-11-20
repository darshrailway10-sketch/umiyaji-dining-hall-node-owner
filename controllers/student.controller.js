const Student = require('../models/Student.model');

// Get all students with pagination, search, and filter
exports.getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const skip = (page - 1) * limit;

    // Build query
    const query = { createdBy: req.userId || req.user.id };
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get students and total count
    const [students, total] = await Promise.all([
      Student.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          currentPage: page,
          totalPages,
          total,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add new student
exports.addStudent = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, gender } = req.body;

    // Validation
    if (!fullName || !email || !phoneNumber || !gender) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if email already exists for this user
    const existingEmail = await Student.findOne({
      email: email.toLowerCase(),
      createdBy: req.userId || req.user.id
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if phone number already exists for this user
    const existingPhone = await Student.findOne({
      phoneNumber,
      createdBy: req.userId || req.user.id
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    // Create student
    const student = new Student({
      fullName,
      email: email.toLowerCase(),
      phoneNumber,
      gender,
      createdBy: req.userId || req.user.id
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: student
    });
  } catch (error) {
    console.error('Error adding student:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phoneNumber, gender, isActive } = req.body;

    // Find student and verify ownership
    const student = await Student.findOne({
      _id: id,
      createdBy: req.userId || req.user.id
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== student.email) {
      const existingEmail = await Student.findOne({
        email: email.toLowerCase(),
        createdBy: req.userId || req.user.id,
        _id: { $ne: id }
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if phone number is being changed and if it already exists
    if (phoneNumber && phoneNumber !== student.phoneNumber) {
      const existingPhone = await Student.findOne({
        phoneNumber,
        createdBy: req.userId || req.user.id,
        _id: { $ne: id }
      });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }
    }

    // Update fields
    if (fullName) student.fullName = fullName;
    if (email) student.email = email.toLowerCase();
    if (phoneNumber) student.phoneNumber = phoneNumber;
    if (gender) student.gender = gender;
    if (isActive !== undefined) student.isActive = isActive;

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete student (verify ownership)
    const student = await Student.findOneAndDelete({
      _id: id,
      createdBy: req.userId || req.user.id
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

