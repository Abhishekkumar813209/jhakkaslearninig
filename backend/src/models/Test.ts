import mongoose, { Schema } from 'mongoose';
import { ITest, IQuestion } from '@/types';

const questionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['mcq', 'subjective'],
    required: [true, 'Question type is required']
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: String,
    trim: true
  },
  marks: {
    type: Number,
    required: [true, 'Marks are required'],
    min: [0, 'Marks cannot be negative']
  },
  explanation: {
    type: String,
    maxlength: [1000, 'Explanation cannot exceed 1000 characters']
  }
});

const testSchema = new Schema<ITest>({
  title: {
    type: String,
    required: [true, 'Test title is required'],
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
    default: null
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: [true, 'Difficulty level is required']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks is required'],
    min: [1, 'Total marks must be at least 1']
  },
  passingMarks: {
    type: Number,
    required: [true, 'Passing marks is required'],
    min: [0, 'Passing marks cannot be negative']
  },
  questions: [questionSchema],
  instructions: {
    type: String,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  allowRetakes: {
    type: Boolean,
    default: true
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: [1, 'Max attempts must be at least 1']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Validate that passingMarks <= totalMarks
testSchema.pre('save', function(next) {
  if (this.passingMarks > this.totalMarks) {
    next(new Error('Passing marks cannot be greater than total marks'));
  } else {
    next();
  }
});

// Calculate total marks from questions
testSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    const calculatedMarks = this.questions.reduce((total, question) => total + question.marks, 0);
    if (calculatedMarks !== this.totalMarks) {
      this.totalMarks = calculatedMarks;
    }
  }
  next();
});

// Index for faster queries
testSchema.index({ createdBy: 1 });
testSchema.index({ course: 1 });
testSchema.index({ subject: 1 });
testSchema.index({ difficulty: 1 });
testSchema.index({ isPublished: 1 });
testSchema.index({ scheduledAt: 1 });
testSchema.index({ title: 'text', description: 'text' });

export default mongoose.model<ITest>('Test', testSchema);