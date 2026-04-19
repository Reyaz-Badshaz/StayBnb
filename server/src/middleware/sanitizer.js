/**
 * Input sanitization and validation helpers
 */

// Note: express-mongo-sanitize and hpp are incompatible with Express 5
// because req.query and req.params are read-only. Using custom implementations.

/**
 * Custom MongoDB sanitizer - only sanitizes req.body
 * Removes $ and . from KEYS (not values) to prevent NoSQL injection
 */
const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      // Remove $ and . from keys only
      const safeKey = key.replace(/\$|\./g, '');
      sanitized[safeKey] = sanitizeValue(val);
    }
    return sanitized;
  }
  // Don't modify string values - only keys are dangerous
  return value;
};

const sanitizeMongo = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};

/**
 * Custom HPP - only for body (query is read-only in Express 5)
 */
const preventHPP = (req, res, next) => {
  // In Express 5, req.query is read-only, so we skip HPP
  next();
};

/**
 * Custom XSS sanitizer (since xss-clean is deprecated)
 * Removes dangerous HTML/script patterns without HTML-encoding values.
 * This preserves URLs and query strings in payloads (e.g. image URLs).
 */
const stripDangerousHtml = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
};

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return stripDangerousHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * XSS protection middleware
 * Note: In Express 5, req.query and req.params are read-only
 * We only sanitize req.body which is mutable
 */
const xssSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  // req.query and req.params are read-only in Express 5
  // Sanitization for those should be done at the route handler level if needed
  next();
};

/**
 * Validate and sanitize pagination params
 */
const sanitizePagination = (req, res, next) => {
  const page = parseInt(req.query.page, 10);
  const limit = parseInt(req.query.limit, 10);
  
  req.query.page = isNaN(page) || page < 1 ? 1 : Math.min(page, 1000);
  req.query.limit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100);
  
  next();
};

/**
 * Validate ObjectId format
 */
const isValidObjectId = (id) => {
  return /^[a-fA-F0-9]{24}$/.test(id);
};

const validateObjectIdParams = (paramNames = ['id']) => {
  return (req, res, next) => {
    for (const param of paramNames) {
      if (req.params[param] && !isValidObjectId(req.params[param])) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${param} format`,
        });
      }
    }
    next();
  };
};

/**
 * Remove sensitive fields from response
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  
  const obj = user.toObject ? user.toObject() : { ...user };
  
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.__v;
  
  return obj;
};

module.exports = {
  sanitizeMongo,
  preventHPP,
  xssSanitizer,
  sanitizePagination,
  validateObjectIdParams,
  isValidObjectId,
  sanitizeUser,
  stripDangerousHtml,
};
