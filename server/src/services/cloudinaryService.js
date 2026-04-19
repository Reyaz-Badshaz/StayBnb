const cloudinary = require('cloudinary').v2;
const config = require('../config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

class CloudinaryService {
  /**
   * Upload a single image
   * @param {string} file - Base64 string or file path
   * @param {Object} options - Upload options
   */
  async uploadImage(file, options = {}) {
    const defaultOptions = {
      folder: 'staybnb/properties',
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'auto' },
      ],
    };

    const uploadOptions = { ...defaultOptions, ...options };

    try {
      const result = await cloudinary.uploader.upload(file, uploadOptions);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images
   * @param {Array} files - Array of base64 strings or file paths
   * @param {Object} options - Upload options
   */
  async uploadImages(files, options = {}) {
    const uploadPromises = files.map((file) => this.uploadImage(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete an image by public ID
   * @param {string} publicId - Cloudinary public ID
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      throw new Error(`Cloudinary delete failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple images
   * @param {Array} publicIds - Array of Cloudinary public IDs
   */
  async deleteImages(publicIds) {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      throw new Error(`Cloudinary bulk delete failed: ${error.message}`);
    }
  }

  /**
   * Get optimized URL for an image
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} transformations - Cloudinary transformations
   */
  getOptimizedUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      fetch_format: 'auto',
      quality: 'auto',
    };

    return cloudinary.url(publicId, {
      ...defaultTransformations,
      ...transformations,
    });
  }

  /**
   * Get thumbnail URL
   * @param {string} publicId - Cloudinary public ID
   * @param {number} width - Thumbnail width
   * @param {number} height - Thumbnail height
   */
  getThumbnailUrl(publicId, width = 400, height = 300) {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'auto',
      fetch_format: 'auto',
      quality: 'auto',
    });
  }

  /**
   * Upload avatar image
   * @param {string} file - Base64 string or file path
   * @param {string} userId - User ID for folder organization
   */
  async uploadAvatar(file, userId) {
    return this.uploadImage(file, {
      folder: `staybnb/avatars/${userId}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { format: 'auto' },
      ],
    });
  }
}

module.exports = new CloudinaryService();
