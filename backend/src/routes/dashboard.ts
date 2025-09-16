import express from 'express';
import { protect, authorize } from '@/middlewares/auth';
import {
  getDashboardOverview,
  getUpcomingSchedule,
  getAchievements
} from '@/controllers/dashboardController';

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get student dashboard overview data (stats, performance, activity)
// @access  Private (Student only)
router.get('/overview', protect, authorize('student'), getDashboardOverview);

// @route   GET /api/dashboard/schedule
// @desc    Get upcoming classes/schedule for student
// @access  Private (Student only)
router.get('/schedule', protect, authorize('student'), getUpcomingSchedule);

// @route   GET /api/dashboard/achievements
// @desc    Get student achievements and badges
// @access  Private (Student only)
router.get('/achievements', protect, authorize('student'), getAchievements);

export default router;