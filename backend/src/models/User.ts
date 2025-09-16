import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser } from '@/types';
import Logger from '@/utils/logger';

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    sparse: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  provider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  googleId: {
    type: String,
    sparse: true
  },
  batch: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
    default: null
  },
  enrolledCourses: [{
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
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
    }
  }],
  analytics: {
    totalStudyTime: {
      type: Number,
      default: 0 // in minutes
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    },
    averageScore: {
      type: Number,
      default: 0
    },
    testsAttempted: {
      type: Number,
      default: 0
    },
    rank: {
      batch: {
        type: Number,
        default: null
      },
      overall: {
        type: Number,
        default: null
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ batch: 1 });
userSchema.index({ 'analytics.averageScore': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) return next();
    
    if (this.password) {
      Logger.info(`🔐 Hashing password for user: ${this.email}`);
      this.password = await bcrypt.hash(this.password, 12);
    }
    next();
  } catch (error: any) {
    Logger.error(`❌ Error hashing password: ${error.message}`);
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) {
      Logger.warn(`⚠️ No password set for user: ${this.email}`);
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error: any) {
    Logger.error(`❌ Error comparing password: ${error.message}`);
    return false;
  }
};

// Generate JWT token
userSchema.methods.getJWTToken = function(): string {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  } catch (error: any) {
    Logger.error(`❌ Error generating JWT token: ${error.message}`);
    throw error;
  }
};

export default mongoose.model<IUser>('User', userSchema);