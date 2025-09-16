import mongoose, { Schema } from 'mongoose';
import { IBatch } from '@/types';

const batchSchema = new Schema<IBatch>({
  name: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  level: {
    type: String,
    required: [true, 'Level is required'],
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    default: null
  },
  maxCapacity: {
    type: Number,
    required: [true, 'Max capacity is required'],
    min: [1, 'Max capacity must be at least 1']
  },
  currentStrength: {
    type: Number,
    default: 0,
    min: 0
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  courses: [{
    type: Schema.Types.ObjectId,
    ref: 'Course'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validate that currentStrength doesn't exceed maxCapacity
batchSchema.pre('save', function(next) {
  if (this.currentStrength > this.maxCapacity) {
    next(new Error('Current strength cannot exceed max capacity'));
  } else {
    next();
  }
});

// Index for faster queries
batchSchema.index({ instructor: 1 });
batchSchema.index({ isActive: 1 });
batchSchema.index({ startDate: 1 });

export default mongoose.model<IBatch>('Batch', batchSchema);