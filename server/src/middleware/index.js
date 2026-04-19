const errorHandler = require('./errorHandler');
const notFound = require('./notFound');
const {
  protect,
  optionalAuth,
  restrictTo,
  requireEmailVerified,
  requireHost,
  requireAdmin,
} = require('./auth');
const {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  searchLimiter,
  uploadLimiter,
  bookingLimiter,
} = require('./rateLimiter');
const {
  sanitizeMongo,
  preventHPP,
  xssSanitizer,
  sanitizePagination,
  validateObjectIdParams,
  sanitizeUser,
} = require('./sanitizer');

module.exports = {
  errorHandler,
  notFound,
  protect,
  optionalAuth,
  restrictTo,
  requireEmailVerified,
  requireHost,
  requireAdmin,
  // Rate limiters
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  searchLimiter,
  uploadLimiter,
  bookingLimiter,
  // Sanitizers
  sanitizeMongo,
  preventHPP,
  xssSanitizer,
  sanitizePagination,
  validateObjectIdParams,
  sanitizeUser,
};
