const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Register controller
const register = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password } = req.body;

    // Validation
    if (!fullName || !email || !mobileNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: fullName, email, mobileNumber, password'
      });
    }

    // Validate mobile number format (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format. Must be exactly 10 digits'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists (email or mobile)
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { mobileNumber: mobileNumber }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Mobile number already registered'
      });
    }

    // Create new user
    const user = new User({
      fullName,
      email: email.toLowerCase(),
      mobileNumber,
      password
    });

    // Save user (password will be hashed automatically by pre-save hook)
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        mobileNumber: user.mobileNumber,
        email: user.email
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    // Success response
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          profileImagePath: user.profileImagePath || null
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

// Login controller
const login = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    // Validation
    if (!mobileNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and password are required'
      });
    }

    // Validate mobile number format (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format. Must be 10 digits'
      });
    }

    // Find user by mobile number
    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or password'
      });
    }

    // Verify password using model method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        mobileNumber: user.mobileNumber,
        email: user.email
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    // Success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          profileImagePath: user.profileImagePath || null
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// Update profile controller
const updateProfile = async (req, res) => {
  try {
    const { fullName, profileImagePath } = req.body;
    const userId = req.userId;

    // Validation
    if (!fullName && !profileImagePath) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (fullName or profileImagePath) is required'
      });
    }

    // Build update object
    const updateData = {};
    if (fullName !== undefined) {
      if (fullName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be at least 2 characters'
        });
      }
      updateData.fullName = fullName.trim();
    }
    
    if (profileImagePath !== undefined) {
      updateData.profileImagePath = profileImagePath || null;
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Success response
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          profileImagePath: user.profileImagePath || null
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during profile update'
    });
  }
};

module.exports = {
  register,
  login,
  updateProfile
};

