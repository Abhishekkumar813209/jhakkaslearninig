const express = require('express');
const {
  getVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  trackVideoProgress
} = require('../controllers/videoController');
const { protect, authorize } = require('../middlewares/auth');
const uploadService = require('../services/uploadService');

const router = express.Router();

// Configure multer for video uploads
const videoUpload = uploadService.getVideoUploadConfig();

// Student routes
router.get('/', protect, getVideos);
router.get('/:id', protect, getVideo);
router.post('/:videoId/progress', protect, authorize('student'), trackVideoProgress);

// Teacher/Admin routes
router.post('/', protect, authorize('teacher', 'admin'), videoUpload.single('video'), createVideo);
router.put('/:id', protect, authorize('teacher', 'admin'), updateVideo);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteVideo);

module.exports = router;