import mongoose, { Schema } from 'mongoose';
import { ITestAttempt, IAnswer } from '@/types';

const answerSchema = new Schema<IAnswer>({
  questionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  selectedOption: {
    type: String // For MCQ questions
  },
  textAnswer: {
    type: String // For subjective questions
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  marksAwarded: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  }
});

const testAttemptSchema = new Schema<ITestAttempt>({
  test: {
    type: Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [answerSchema],
  score: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: Number, // in minutes
    default: 0
  },
  startedAt: {
    type: Date,
    required: true
  },
  submittedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'auto-submitted', 'abandoned'],
    default: 'in-progress'
  },
  isGraded: {
    type: Boolean,
    default: false
  },
  gradedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  gradedAt: {
    type: Date,
    default: null
  },
  feedback: {
    type: String,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  rank: {
    type: Number,
    default: null
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  timestamps: true
});

// Index for faster queries
testAttemptSchema.index({ test: 1, student: 1 });
testAttemptSchema.index({ student: 1 });
testAttemptSchema.index({ test: 1, score: -1 });
testAttemptSchema.index({ submittedAt: -1 });

// Calculate percentage before saving
testAttemptSchema.pre('save', function(next) {
  if (this.totalMarks > 0) {
    this.percentage = Math.round((this.score / this.totalMarks) * 100);
  }
  next();
});

export default mongoose.model<ITestAttempt>('TestAttempt', testAttemptSchema);