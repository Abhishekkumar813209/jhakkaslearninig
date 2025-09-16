const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    unique: true,
    maxlength: [50, 'Batch name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  level: {
    type: String,
    enum: ['Foundation', 'Intermediate', 'Advanced', 'Crash Course'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 1000
  },
  currentStrength: {
    type: Number,
    default: 0
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assistants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: String,
    endTime: String,
    subject: String
  }],
  fees: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  promotionCriteria: {
    minimumAttendance: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    },
    minimumAvgScore: {
      type: Number,
      default: 60,
      min: 0,
      max: 100
    }
  },
  analytics: {
    averageScore: {
      type: Number,
      default: 0
    },
    averageAttendance: {
      type: Number,
      default: 0
    },
    topperUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
batchSchema.index({ instructor: 1 });
batchSchema.index({ level: 1 });
batchSchema.index({ isActive: 1 });
batchSchema.index({ startDate: 1, endDate: 1 });

// Validate end date is after start date
batchSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Batch', batchSchema);