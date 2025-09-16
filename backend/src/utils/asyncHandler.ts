import { Request, Response, NextFunction } from 'express';
import Logger from './logger';

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      Logger.error(`Async Handler Error: ${err.message}`);
      Logger.error(`Stack: ${err.stack}`);
      next(err);
    });
  };
};

export default asyncHandler;