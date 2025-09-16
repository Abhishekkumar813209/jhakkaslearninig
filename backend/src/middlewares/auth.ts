import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/types';
import User from '@/models/User';
import Logger from '@/utils/logger';
import asyncHandler from '@/utils/asyncHandler';

// Protect routes
export const protect = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    Logger.warn(`🔐 Access denied - No token provided for ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      Logger.warn(`🔐 Access denied - Invalid token for user ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }

    if (!user.isActive) {
      Logger.warn(`🔐 Access denied - Inactive user: ${user.email}`);
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated.'
      });
    }

    req.user = user;
    next();
  } catch (error: any) {
    Logger.error(`🔐 Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.'
    });
  }
});

// Authorize roles
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      Logger.warn(`🚫 Access denied - User ${req.user.email} with role ${req.user.role} attempted to access ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized.`
      });
    }

    next();
  };
};

// Owner or admin access
export const ownerOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  const userId = req.params.id;
  if (req.user.role === 'admin' || req.user._id.toString() === userId) {
    next();
  } else {
    Logger.warn(`🚫 Access denied - User ${req.user.email} attempted unauthorized access to user ${userId}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own data.'
    });
  }
};