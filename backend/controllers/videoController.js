const Video = require('../models/Video');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const uploadService = require('../services/uploadService');

// Get all videos (with filters and pagination)
const getVideos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      course,
      isPublished = true
    } = req.query;

    const filter = { isPublished };
    if (course) filter.course = course;

    const videos = await Video.find(filter)
      .populate('course', 'title subject')
      .populate('uploadedBy', 'name email')
      .sort({ orderIndex: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-cloudFileId');

    const total = await Video.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos'
    });
  }
};

// Get single video by ID
const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('course', 'title subject instructor')
      .populate('uploadedBy', 'name email');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check access permission
    let hasAccess = false;
    
    if (req.user.role === 'admin' || video.uploadedBy._id.toString() === req.user._id.toString()) {
      hasAccess = true;
    } else if (req.user.role === 'student') {
      if (video.isFree) {
        hasAccess = true;
      } else {
        const enrollment = await Enrollment.findOne({
          student: req.user._id,
          course: video.course._id
        });
        hasAccess = !!enrollment;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this video'
      });
    }

    // Increment view count
    await Video.findByIdAndUpdate(video._id, { $inc: { views: 1 } });

    res.status(200).json({
      success: true,
      data: {
        ...video.toObject(),
        cloudFileId: undefined // Never expose cloud file ID
      }
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video'
    });
  }
};

// Upload and create new video (Teacher/Admin only)
const createVideo = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Verify course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add videos to this course'
      });
    }

    // Handle file upload
    let videoUrl = null;
    let cloudFileId = null;
    let fileSize = 0;

    if (req.file) {
      try {
        const uploadResult = await uploadService.uploadVideo(req.file);
        videoUrl = uploadResult.url;
        cloudFileId = uploadResult.fileId;
        fileSize = req.file.size;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload video file'
        });
      }
    } else if (req.body.videoUrl) {
      // External video URL provided
      videoUrl = req.body.videoUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Video file or URL is required'
      });
    }

    const videoData = {
      ...req.body,
      course: courseId,
      videoUrl,
      cloudFileId,
      fileSize,
      uploadedBy: req.user._id
    };

    const video = await Video.create(videoData);
    await video.populate('course', 'title subject');
    await video.populate('uploadedBy', 'name email');

    res.status(201).json({
      success: true,
      data: {
        ...video.toObject(),
        cloudFileId: undefined
      },
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('Create video error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create video'
    });
  }
};

// Update video (Teacher/Admin only)
const updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('course');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && 
        video.course.instructor.toString() !== req.user._id.toString() &&
        video.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this video'
      });
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('course', 'title subject')
     .populate('uploadedBy', 'name email');

    res.status(200).json({
      success: true,
      data: {
        ...updatedVideo.toObject(),
        cloudFileId: undefined
      },
      message: 'Video updated successfully'
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video'
    });
  }
};

// Delete video (Teacher/Admin only)
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('course');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && 
        video.course.instructor.toString() !== req.user._id.toString() &&
        video.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this video'
      });
    }

    // Delete from cloud storage if exists
    if (video.cloudFileId) {
      try {
        await uploadService.deleteVideo(video.cloudFileId);
      } catch (deleteError) {
        console.warn('Failed to delete video from cloud storage:', deleteError);
      }
    }

    await Video.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
};

// Track video progress (Student only)
const trackVideoProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { watchTime, isCompleted } = req.body;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if enrolled
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: video.course
    });

    if (!enrollment && !video.isFree) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    if (enrollment) {
      // Update enrollment progress
      const existingVideoProgress = enrollment.completedVideos.find(
        v => v.video.toString() === videoId
      );

      if (existingVideoProgress) {
        existingVideoProgress.watchTime = Math.max(existingVideoProgress.watchTime, watchTime);
        if (isCompleted) {
          existingVideoProgress.completedAt = new Date();
        }
      } else if (isCompleted) {
        enrollment.completedVideos.push({
          video: videoId,
          watchTime,
          completedAt: new Date()
        });
      }

      enrollment.lastWatchedVideo = videoId;
      enrollment.totalWatchTime += Math.max(0, watchTime - (existingVideoProgress?.watchTime || 0));

      // Calculate course progress
      const totalVideos = await Video.countDocuments({ course: video.course, isPublished: true });
      const completedVideos = enrollment.completedVideos.length;
      enrollment.progress = Math.round((completedVideos / totalVideos) * 100);

      if (enrollment.progress === 100 && !enrollment.isCompleted) {
        enrollment.isCompleted = true;
        enrollment.completedAt = new Date();
      }

      await enrollment.save();
    }

    res.status(200).json({
      success: true,
      message: 'Progress tracked successfully'
    });
  } catch (error) {
    console.error('Track video progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track progress'
    });
  }
};

module.exports = {
  getVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  trackVideoProgress
};