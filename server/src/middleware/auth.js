const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { AppError, catchAsync } = require('../utils');

/**
 * Protect routes - require authentication
 */
const protect = catchAsync(async (req, res, next) => {
  // Get token from header or cookie
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw AppError.unauthorized('You are not logged in. Please log in to access this resource.');
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Your session has expired. Please log in again.');
    }
    throw AppError.unauthorized('Invalid token. Please log in again.');
  }

  // Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    throw AppError.unauthorized('The user belonging to this token no longer exists.');
  }

  // Check if user is active
  if (!user.isActive) {
    throw AppError.unauthorized('Your account has been deactivated.');
  }

  // Check if user changed password after token was issued
  if (user.changedPasswordAfter(decoded.iat)) {
    throw AppError.unauthorized('Password recently changed. Please log in again.');
  }

  // Grant access to protected route
  req.user = user;
  next();
});

/**
 * Optional authentication - populate user if token exists, continue otherwise
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id);
      if (user && user.isActive && !user.changedPasswordAfter(decoded.iat)) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
});

/**
 * Restrict access to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden('You do not have permission to perform this action.');
    }
    next();
  };
};

/**
 * Restrict to verified email only
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    throw AppError.forbidden('Please verify your email to access this resource.');
  }
  next();
};

/**
 * Restrict to hosts only
 */
const requireHost = (req, res, next) => {
  if (req.user.role !== 'host' && req.user.role !== 'admin') {
    throw AppError.forbidden('You need to be a host to perform this action.');
  }
  next();
};

/**
 * Restrict to admin only
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw AppError.forbidden('Admin access required.');
  }
  next();
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
  requireEmailVerified,
  requireHost,
  requireAdmin,
};
