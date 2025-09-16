const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  duration: {
    type: Number, // in seconds
    required: [true, 'Video duration is required'],
    min: 0
  },
  orderIndex: {
    type: Number,
    required: true,
    min: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFree: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileSize: {
    type: Number, // in bytes
    default: 0
  },
  resolution: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '4K'],
    default: '720p'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  cloudProvider: {
    type: String,
    enum: ['aws', 'gcp', 'cloudflare', 'local'],
    default: 'cloudflare'
  },
  cloudFileId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
videoSchema.index({ course: 1, orderIndex: 1 });
videoSchema.index({ uploadedBy: 1 });
videoSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Video', videoSchema);