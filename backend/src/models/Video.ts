import mongoose, { Schema } from 'mongoose';
import { IVideo } from '@/types';

const videoSchema = new Schema<IVideo>({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  chapter: {
    type: Number,
    required: [true, 'Chapter number is required'],
    min: [1, 'Chapter must be at least 1']
  },
  order: {
    type: Number,
    required: [true, 'Video order is required'],
    min: [1, 'Order must be at least 1']
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  duration: {
    type: Number, // in seconds
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 second']
  },
  thumbnail: {
    type: String,
    default: null
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  watchCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
videoSchema.index({ course: 1, chapter: 1, order: 1 });
videoSchema.index({ course: 1 });
videoSchema.index({ uploadedBy: 1 });
videoSchema.index({ isPublished: 1 });

export default mongoose.model<IVideo>('Video', videoSchema);