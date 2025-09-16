const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// For now, using local storage. Can be extended to support cloud providers
class UploadService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadsDir, 'videos'), { recursive: true });
      await fs.mkdir(path.join(this.uploadsDir, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.uploadsDir, 'documents'), { recursive: true });
    }
  }

  // Multer configuration for video uploads
  getVideoUploadConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(this.uploadsDir, 'videos'));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `video-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Check file type
      const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only MP4, MPEG, MOV, and WebM are allowed.'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max file size
      }
    });
  }

  // Multer configuration for image uploads
  getImageUploadConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(this.uploadsDir, 'thumbnails'));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `thumb-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
      }
    });
  }

  // Upload video (local storage for now)
  async uploadVideo(file) {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const url = `${baseUrl}/uploads/videos/${file.filename}`;
      
      return {
        url,
        fileId: file.filename,
        size: file.size,
        originalName: file.originalname
      };
    } catch (error) {
      throw new Error('Failed to upload video: ' + error.message);
    }
  }

  // Upload image/thumbnail
  async uploadImage(file) {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const url = `${baseUrl}/uploads/thumbnails/${file.filename}`;
      
      return {
        url,
        fileId: file.filename,
        size: file.size,
        originalName: file.originalname
      };
    } catch (error) {
      throw new Error('Failed to upload image: ' + error.message);
    }
  }

  // Delete video file
  async deleteVideo(fileId) {
    try {
      const filePath = path.join(this.uploadsDir, 'videos', fileId);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.warn('Failed to delete video file:', error);
      return false;
    }
  }

  // Delete image file
  async deleteImage(fileId) {
    try {
      const filePath = path.join(this.uploadsDir, 'thumbnails', fileId);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.warn('Failed to delete image file:', error);
      return false;
    }
  }

  // TODO: Implement cloud storage providers
  
  // AWS S3 Upload
  async uploadToS3(file, bucketName) {
    // Implementation for AWS S3
    throw new Error('AWS S3 upload not implemented yet');
  }

  // Google Cloud Storage Upload
  async uploadToGCS(file, bucketName) {
    // Implementation for Google Cloud Storage
    throw new Error('Google Cloud Storage upload not implemented yet');
  }

  // Cloudflare R2 Upload
  async uploadToR2(file, bucketName) {
    // Implementation for Cloudflare R2
    throw new Error('Cloudflare R2 upload not implemented yet');
  }
}

module.exports = new UploadService();