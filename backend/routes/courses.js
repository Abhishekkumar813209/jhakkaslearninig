const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getEnrolledCourses,
  getCourseVideos
} = require('../controllers/courseController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourse);

// Student routes
router.post('/:id/enroll', protect, authorize('student'), enrollInCourse);
router.get('/enrolled/my-courses', protect, authorize('student'), getEnrolledCourses);
router.get('/:id/videos', protect, getCourseVideos);

// Teacher/Admin routes
router.post('/', protect, authorize('teacher', 'admin'), createCourse);
router.put('/:id', protect, authorize('teacher', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteCourse);

module.exports = router;