const { reviewService } = require('../services');
const { catchAsync, ApiResponse, AppError } = require('../utils');

/**
 * @desc    Create a review
 * @route   POST /api/v1/reviews
 * @access  Private
 */
const createReview = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.body);

  ApiResponse.created(res, review, 'Review submitted successfully');
});

/**
 * @desc    Get reviews for a property
 * @route   GET /api/v1/reviews/property/:propertyId
 * @access  Public
 */
const getPropertyReviews = catchAsync(async (req, res) => {
  const { page, limit, sort } = req.query;

  const result = await reviewService.getPropertyReviews(req.params.propertyId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sort,
  });

  ApiResponse.paginated(res, result.reviews, result.pagination);
});

/**
 * @desc    Get reviews for a user
 * @route   GET /api/v1/reviews/user/:userId
 * @access  Public
 */
const getUserReviews = catchAsync(async (req, res) => {
  const { type, page, limit } = req.query;

  const result = await reviewService.getUserReviews(req.params.userId, type, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  });

  ApiResponse.paginated(res, result.reviews, result.pagination);
});

/**
 * @desc    Get review statistics for a property
 * @route   GET /api/v1/reviews/property/:propertyId/stats
 * @access  Public
 */
const getPropertyReviewStats = catchAsync(async (req, res) => {
  const stats = await reviewService.getPropertyReviewStats(req.params.propertyId);

  ApiResponse.success(res, stats);
});

/**
 * @desc    Host responds to a review
 * @route   POST /api/v1/reviews/:id/response
 * @access  Private (Host)
 */
const respondToReview = catchAsync(async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    throw AppError.badRequest('Response text is required');
  }

  const review = await reviewService.respondToReview(
    req.params.id,
    req.user._id,
    text
  );

  ApiResponse.success(res, review, 'Response added successfully');
});

/**
 * @desc    Mark review as helpful
 * @route   POST /api/v1/reviews/:id/helpful
 * @access  Private
 */
const markHelpful = catchAsync(async (req, res) => {
  const result = await reviewService.markHelpful(req.params.id, req.user._id);

  ApiResponse.success(res, result);
});

/**
 * @desc    Get pending reviews for current user
 * @route   GET /api/v1/reviews/pending
 * @access  Private
 */
const getPendingReviews = catchAsync(async (req, res) => {
  const pending = await reviewService.getPendingReviews(req.user._id);

  ApiResponse.success(res, pending);
});

module.exports = {
  createReview,
  getPropertyReviews,
  getUserReviews,
  getPropertyReviewStats,
  respondToReview,
  markHelpful,
  getPendingReviews,
};
