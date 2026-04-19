class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factories
AppError.badRequest = (message = 'Bad request') => new AppError(message, 400);
AppError.unauthorized = (message = 'Unauthorized') => new AppError(message, 401);
AppError.forbidden = (message = 'Forbidden') => new AppError(message, 403);
AppError.notFound = (message = 'Not found') => new AppError(message, 404);
AppError.conflict = (message = 'Conflict') => new AppError(message, 409);
AppError.tooManyRequests = (message = 'Too many requests') => new AppError(message, 429);
AppError.internal = (message = 'Internal server error') => new AppError(message, 500);

module.exports = AppError;
