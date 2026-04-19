const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils');
const config = require('../config');

const skipInTest = () => config.nodeEnv === 'test';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (req, res, next, options) => {
    throw AppError.tooManyRequests(options.message.message);
  },
});

/**
 * Auth endpoints rate limiter (stricter)
 * 10 login attempts per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res, next, options) => {
    throw AppError.tooManyRequests(options.message.message);
  },
});

/**
 * Password reset limiter
 * 5 requests per hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (req, res, next, options) => {
    throw AppError.tooManyRequests(options.message.message);
  },
});

/**
 * Search/heavy operations limiter
 * 30 requests per minute
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: 'Too many search requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (req, res, next, options) => {
    throw AppError.tooManyRequests(options.message.message);
  },
});

/**
 * File upload limiter
 * 20 uploads per hour
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Upload limit reached, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (req, res, next, options) => {
    throw AppError.tooManyRequests(options.message.message);
  },
});

/**
 * Booking creation limiter
 * 10 booking attempts per hour
 */
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many booking attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (req, res, next, options) => {
    throw AppError.tooManyRequests(options.message.message);
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  searchLimiter,
  uploadLimiter,
  bookingLimiter,
};
