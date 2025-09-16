const User = require('../models/User');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const TestAttempt = require('../models/TestAttempt');
const { validationResult } = require('express-validator');

// @desc    Get all students (Admin only)
// @route   GET /api/users/students
// @access  Private/Admin
const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', batch = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter object
    const filter = { role: 'student' };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (batch) {
      filter.batch = batch;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const students = await User.find(filter)
      .populate('batch', 'name level')
      .populate('enrolledCourses.course', 'title thumbnail')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalStudents: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get student by ID
// @route   GET /api/users/students/:id
// @access  Private
const getStudentById = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .populate('batch', 'name level instructor')
      .populate('enrolledCourses.course', 'title thumbnail instructor totalDuration')
      .select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get recent test attempts
    const recentAttempts = await TestAttempt.find({ student: student._id })
      .populate('test', 'title totalMarks')
      .sort({ submittedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        student,
        recentAttempts
      }
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, phone, avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign student to batch
// @route   PUT /api/users/students/:id/batch
// @access  Private/Admin
const assignStudentToBatch = async (req, res) => {
  try {
    const { batchId } = req.body;
    const studentId = req.params.id;

    // Validate batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check batch capacity
    if (batch.currentStrength >= batch.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Batch is at full capacity'
      });
    }

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Remove from previous batch if exists
    if (student.batch) {
      await Batch.findByIdAndUpdate(student.batch, {
        $inc: { currentStrength: -1 }
      });
    }

    // Assign to new batch
    student.batch = batchId;
    await student.save();

    // Update batch strength
    batch.currentStrength += 1;
    await batch.save();

    res.status(200).json({
      success: true,
      message: 'Student assigned to batch successfully',
      data: {
        student: await User.findById(studentId).populate('batch', 'name level')
      }
    });
  } catch (error) {
    console.error('Assign batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Toggle student status (active/inactive)
// @route   PUT /api/users/students/:id/status
// @access  Private/Admin
const toggleStudentStatus = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.isActive = !student.isActive;
    await student.save();

    res.status(200).json({
      success: true,
      message: `Student ${student.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          isActive: student.isActive
        }
      }
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/users/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Remove from batch if assigned
    if (student.batch) {
      await Batch.findByIdAndUpdate(student.batch, {
        $inc: { currentStrength: -1 }
      });
    }

    // Delete student
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
const getDashboardData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('batch', 'name level')
      .populate('enrolledCourses.course', 'title thumbnail totalDuration');

    // Get recent test attempts
    const recentAttempts = await TestAttempt.find({ student: user._id })
      .populate('test', 'title totalMarks')
      .sort({ submittedAt: -1 })
      .limit(5);

    // Calculate streak
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get today's activity (this would depend on your activity tracking implementation)
    // For now, we'll use the last active date
    const daysSinceLastActive = Math.floor((today - user.analytics.lastActiveDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastActive === 0) {
      // User is active today, maintain streak
    } else if (daysSinceLastActive === 1) {
      // User was active yesterday, reset streak to 1
      user.analytics.streakDays = 1;
    } else {
      // User missed days, reset streak
      user.analytics.streakDays = 0;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user,
        recentAttempts,
        stats: {
          totalCourses: user.enrolledCourses.length,
          averageProgress: user.enrolledCourses.length > 0 
            ? user.enrolledCourses.reduce((acc, course) => acc + course.progress, 0) / user.enrolledCourses.length
            : 0,
          streak: user.analytics.streakDays,
          totalStudyTime: user.analytics.totalStudyTime
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  updateProfile,
  assignStudentToBatch,
  toggleStudentStatus,
  deleteStudent,
  getDashboardData
};