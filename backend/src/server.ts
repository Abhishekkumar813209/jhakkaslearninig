import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import connectDB from '@/config/database';
import Logger from '@/utils/logger';
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import courseRoutes from '@/routes/courses';
import videoRoutes from '@/routes/videos';
import testRoutes from '@/routes/tests';
import analyticsRoutes from '@/routes/analytics';

const app = express();

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  Logger.http(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    message: 'LMS Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };

  Logger.info('🏥 Health check requested');
  
  res.status(200).json({
    success: true,
    data: healthCheck
  });
});

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  Logger.error(`❌ Global Error Handler: ${err.message}`);
  Logger.error(`❌ Stack: ${err.stack}`);
  Logger.error(`❌ Request: ${req.method} ${req.originalUrl}`);
  Logger.error(`❌ IP: ${req.ip}`);
  
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message);
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  Logger.warn(`🔍 404 - API endpoint not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/analytics/student',
      'GET /api/analytics/admin',
      'GET /api/courses',
      'GET /api/tests'
    ]
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  Logger.info(`🚀 LMS Backend Server running on port ${PORT}`);
  Logger.info(`📱 API Base URL: http://localhost:${PORT}/api`);
  Logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`📁 Static files served from: /uploads`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any, promise) => {
  Logger.error(`❌ Unhandled Promise Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  Logger.error(`❌ Uncaught Exception: ${err.message}`);
  Logger.error(`❌ Stack: ${err.stack}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('👋 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    Logger.info('✅ Process terminated');
    process.exit(0);
  });
});

export default app;