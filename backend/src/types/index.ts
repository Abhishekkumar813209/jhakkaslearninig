import { Request } from 'express';
import { Document, Types } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  isVerified: boolean;
  provider: 'email' | 'google';
  googleId?: string;
  batch?: Types.ObjectId;
  enrolledCourses: Array<{
    course: Types.ObjectId;
    enrolledAt: Date;
    progress: number;
  }>;
  analytics: {
    totalStudyTime: number;
    streakDays: number;
    lastActiveDate: Date;
    averageScore: number;
    testsAttempted: number;
    rank: {
      batch?: number;
      overall?: number;
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getJWTToken(): string;
}

// Course Types
export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  thumbnail?: string;
  instructor: Types.ObjectId;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  isPaid: boolean;
  duration: number;
  totalVideos: number;
  syllabus: Array<{
    title: string;
    description: string;
    videos: Types.ObjectId[];
  }>;
  tags: string[];
  isPublished: boolean;
  enrollmentCount: number;
  rating: number;
  reviews: Array<{
    user: Types.ObjectId;
    rating: number;
    comment: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Video Types
export interface IVideo extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  course: Types.ObjectId;
  chapter: number;
  order: number;
  videoUrl: string;
  duration: number;
  thumbnail?: string;
  isPublished: boolean;
  uploadedBy: Types.ObjectId;
  watchCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Test Types
export interface IQuestion {
  _id?: Types.ObjectId;
  question: string;
  type: 'mcq' | 'subjective';
  options?: string[];
  correctAnswer?: string;
  marks: number;
  explanation?: string;
}

export interface ITest extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  course?: Types.ObjectId;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  totalMarks: number;
  passingMarks: number;
  questions: IQuestion[];
  instructions?: string;
  allowRetakes: boolean;
  maxAttempts: number;
  isPublished: boolean;
  createdBy: Types.ObjectId;
  scheduledAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Test Attempt Types
export interface IAnswer {
  questionId: Types.ObjectId;
  selectedOption?: string;
  textAnswer?: string;
  isCorrect?: boolean;
  marksAwarded: number;
  timeSpent: number;
}

export interface ITestAttempt extends Document {
  _id: Types.ObjectId;
  test: Types.ObjectId;
  student: Types.ObjectId;
  answers: IAnswer[];
  score: number;
  totalMarks: number;
  percentage: number;
  timeTaken: number;
  startedAt: Date;
  submittedAt?: Date;
  status: 'in-progress' | 'submitted' | 'auto-submitted' | 'abandoned';
  isGraded: boolean;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  feedback?: string;
  rank?: number;
  attemptNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

// Enrollment Types
export interface IEnrollment extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrolledAt: Date;
  progress: number;
  completedVideos: Array<{
    video: Types.ObjectId;
    completedAt: Date;
    watchTime: number;
  }>;
  lastWatchedVideo?: Types.ObjectId;
  totalWatchTime: number;
  isCompleted: boolean;
  completedAt?: Date;
  rating?: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Batch Types
export interface IBatch extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  level: string;
  startDate: Date;
  endDate?: Date;
  maxCapacity: number;
  currentStrength: number;
  instructor: Types.ObjectId;
  courses: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Analytics Types
export interface StudentAnalytics {
  userId: Types.ObjectId;
  totalStudyTime: number;
  streakDays: number;
  testsAttempted: number;
  averageScore: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  totalWatchTime: number;
  rank: {
    batch?: number;
    overall?: number;
  };
  recentActivity: Array<{
    type: 'course' | 'test' | 'video';
    title: string;
    timestamp: Date;
    score?: number;
  }>;
  performanceTrend: Array<{
    date: Date;
    score: number;
    subject: string;
  }>;
  subjectWisePerformance: Array<{
    subject: string;
    averageScore: number;
    testsAttempted: number;
  }>;
}

export interface AdminAnalytics {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalTests: number;
  totalEnrollments: number;
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  coursePopularity: Array<{
    courseId: Types.ObjectId;
    title: string;
    enrollments: number;
    rating: number;
  }>;
  testAnalytics: {
    totalAttempts: number;
    averageScore: number;
    passRate: number;
  };
  userRegistrations: Array<{
    date: Date;
    count: number;
  }>;
  revenueChart: Array<{
    date: Date;
    amount: number;
  }>;
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user: IUser;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}

export interface CourseQuery extends PaginationQuery {
  subject?: string;
  level?: string;
  instructor?: string;
  isPaid?: boolean;
}

export interface TestQuery extends PaginationQuery {
  course?: string;
  subject?: string;
  difficulty?: string;
}