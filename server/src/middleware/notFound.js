const { AppError } = require('../utils');

/**
 * Handle 404 Not Found for unmatched routes
 */
const notFound = (req, res, next) => {
  next(AppError.notFound(`Cannot find ${req.method} ${req.originalUrl} on this server`));
};

module.exports = notFound;
