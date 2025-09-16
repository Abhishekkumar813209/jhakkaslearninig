import mongoose, { Schema } from 'mongoose';
import { IEnrollment } from '@/types';

const enrollmentSchema = new Schema<IEnrollment>({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedVideos: [{
    video: {
      type: Schema.Types.ObjectId,
      ref: 'Video'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    watchTime: {
      type: Number, // in seconds
      default: 0
    }
  }],
  lastWatchedVideo: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  totalWatchTime: {
    type: Number, // in minutes
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters'],
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure one enrollment per student per course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });

export default mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);