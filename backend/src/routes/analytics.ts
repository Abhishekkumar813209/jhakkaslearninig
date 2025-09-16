import express from 'express';
import { protect, authorize } from '@/middlewares/auth';
import {
  getStudentAnalytics,
  getAdminAnalytics,
  getTeacherAnalytics,
  getRankPrediction
} from '@/controllers/analyticsController';

const router = express.Router();

// @route   GET /api/analytics/student
// @desc    Get student analytics dashboard data
// @access  Private (Student only)
router.get('/student', protect, authorize('student'), getStudentAnalytics);

// @route   GET /api/analytics/admin
// @desc    Get admin analytics dashboard data
// @access  Private (Admin only)
router.get('/admin', protect, authorize('admin'), getAdminAnalytics);

// @route   GET /api/analytics/teacher
// @desc    Get teacher analytics dashboard data
// @access  Private (Teacher only)
router.get('/teacher', protect, authorize('teacher'), getTeacherAnalytics);

// @route   GET /api/analytics/rank-prediction
// @desc    Get predictive rank for student based on performance
// @access  Private (Student only)
router.get('/rank-prediction', protect, authorize('student'), getRankPrediction);

export default router;