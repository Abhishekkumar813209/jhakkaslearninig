const express = require('express');
const {
  getTests,
  getTest,
  createTest,
  updateTest,
  deleteTest,
  attemptTest,
  getTestAttempts,
  getMyTestAttempts
} = require('../controllers/testController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Student routes
router.get('/', protect, getTests);
router.get('/:id', protect, getTest);
router.post('/:id/attempt', protect, authorize('student'), attemptTest);
router.get('/attempts/my-attempts', protect, authorize('student'), getMyTestAttempts);

// Teacher/Admin routes
router.post('/', protect, authorize('teacher', 'admin'), createTest);
router.put('/:id', protect, authorize('teacher', 'admin'), updateTest);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteTest);
router.get('/:id/attempts', protect, authorize('teacher', 'admin'), getTestAttempts);

module.exports = router;