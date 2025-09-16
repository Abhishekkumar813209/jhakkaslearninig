const express = require('express');
const { body } = require('express-validator');
const {
  getAllStudents,
  getStudentById,
  updateProfile,
  assignStudentToBatch,
  toggleStudentStatus,
  deleteStudent,
  getDashboardData
} = require('../controllers/userController');
const { protect, authorize, ownerOrAdmin } = require('../middlewares/auth');

const router = express.Router();

// Profile update validation
const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian phone number'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL')
];

// Batch assignment validation
const batchAssignmentValidation = [
  body('batchId')
    .isMongoId()
    .withMessage('Valid batch ID is required')
];

// @route   GET /api/users/students
// @desc    Get all students (with pagination, search, filter)
// @access  Private/Admin
router.get('/students', protect, authorize('admin'), getAllStudents);

// @route   GET /api/users/students/:id
// @desc    Get student by ID
// @access  Private (Owner or Admin)
router.get('/students/:id', protect, ownerOrAdmin, getStudentById);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, profileUpdateValidation, updateProfile);

// @route   PUT /api/users/students/:id/batch
// @desc    Assign student to batch
// @access  Private/Admin
router.put('/students/:id/batch', protect, authorize('admin'), batchAssignmentValidation, assignStudentToBatch);

// @route   PUT /api/users/students/:id/status
// @desc    Toggle student active/inactive status
// @access  Private/Admin
router.put('/students/:id/status', protect, authorize('admin'), toggleStudentStatus);

// @route   DELETE /api/users/students/:id
// @desc    Delete student
// @access  Private/Admin
router.delete('/students/:id', protect, authorize('admin'), deleteStudent);

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', protect, getDashboardData);

module.exports = router;