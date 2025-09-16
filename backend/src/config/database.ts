import mongoose from 'mongoose';
import Logger from '@/utils/logger';

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    Logger.info(`🍃 MongoDB Connected: ${conn.connection.host}`);
    Logger.info(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      Logger.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      Logger.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      Logger.info('🔄 MongoDB reconnected');
    });

  } catch (error: any) {
    Logger.error(`❌ MongoDB connection failed: ${error.message}`);
    Logger.error(`❌ Stack: ${error.stack}`);
    process.exit(1);
  }
};

export default connectDB;