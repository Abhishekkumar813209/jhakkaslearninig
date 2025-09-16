import mongoose, { Schema } from 'mongoose';
import { ICourse } from '@/types';

const courseSchema = new Schema<ICourse>({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  thumbnail: {
    type: String,
    default: null
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: [true, 'Level is required']
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number, // in hours
    default: 0
  },
  totalVideos: {
    type: Number,
    default: 0
  },
  syllabus: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    videos: [{
      type: Schema.Types.ObjectId,
      ref: 'Video'
    }]
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  enrollmentCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
courseSchema.index({ instructor: 1 });
courseSchema.index({ subject: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ rating: -1 });
courseSchema.index({ enrollmentCount: -1 });
courseSchema.index({ title: 'text', description: 'text' });

export default mongoose.model<ICourse>('Course', courseSchema);