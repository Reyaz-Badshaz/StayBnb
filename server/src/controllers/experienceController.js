const experienceService = require('../services/experienceService');
const experienceBookingService = require('../services/experienceBookingService');
const { catchAsync, ApiResponse, AppError } = require('../utils');

// ==================== EXPERIENCE CRUD ====================

/**
 * @desc    Create a new experience
 * @route   POST /api/v1/experiences
 * @access  Private (Host)
 */
const createExperience = catchAsync(async (req, res) => {
  const experience = await experienceService.createExperience(req.user._id, req.body);
  ApiResponse.created(res, experience, 'Experience created successfully');
});

/**
 * @desc    Get all experiences (search)
 * @route   GET /api/v1/experiences
 * @access  Public
 */
const getExperiences = catchAsync(async (req, res) => {
  const {
    location, category, date, guests, minPrice, maxPrice,
    duration, language, accessibility, fitnessLevel,
    page, limit, sort,
  } = req.query;

  const result = await experienceService.searchExperiences(
    { location, category, date, guests, minPrice, maxPrice, duration, language, accessibility, fitnessLevel },
    { page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort }
  );

  ApiResponse.paginated(res, result.experiences, result.pagination);
});

/**
 * @desc    Get single experience
 * @route   GET /api/v1/experiences/:id
 * @access  Public
 */
const getExperience = catchAsync(async (req, res) => {
  const experience = await experienceService.getExperience(
    req.params.id,
    req.user?._id
  );
  ApiResponse.success(res, experience);
});

/**
 * @desc    Update experience
 * @route   PUT /api/v1/experiences/:id
 * @access  Private (Host)
 */
const updateExperience = catchAsync(async (req, res) => {
  const experience = await experienceService.updateExperience(
    req.params.id,
    req.user._id,
    req.body
  );
  ApiResponse.success(res, experience, 'Experience updated successfully');
});

/**
 * @desc    Delete experience
 * @route   DELETE /api/v1/experiences/:id
 * @access  Private (Host)
 */
const deleteExperience = catchAsync(async (req, res) => {
  await experienceService.deleteExperience(req.params.id, req.user._id);
  ApiResponse.success(res, null, 'Experience deleted successfully');
});

/**
 * @desc    Publish experience
 * @route   PUT /api/v1/experiences/:id/publish
 * @access  Private (Host)
 */
const publishExperience = catchAsync(async (req, res) => {
  const experience = await experienceService.publishExperience(
    req.params.id,
    req.user._id
  );
  ApiResponse.success(res, experience, 'Experience submitted for review');
});

/**
 * @desc    Add images to experience
 * @route   POST /api/v1/experiences/:id/images
 * @access  Private (Host)
 */
const addImages = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw AppError.badRequest('Please upload at least one image');
  }

  const images = await experienceService.addImages(
    req.params.id,
    req.user._id,
    req.files
  );

  ApiResponse.success(res, images, 'Images uploaded successfully');
});

/**
 * @desc    Delete image from experience
 * @route   DELETE /api/v1/experiences/:id/images/:imageId
 * @access  Private (Host)
 */
const deleteImage = catchAsync(async (req, res) => {
  const images = await experienceService.deleteImage(
    req.params.id,
    req.user._id,
    req.params.imageId
  );
  ApiResponse.success(res, images, 'Image deleted successfully');
});

/**
 * @desc    Get available dates for experience
 * @route   GET /api/v1/experiences/:id/availability
 * @access  Public
 */
const getAvailability = catchAsync(async (req, res) => {
  const { startDate, endDate, guests } = req.query;

  if (!startDate || !endDate) {
    throw AppError.badRequest('Start date and end date are required');
  }

  const dates = await experienceService.getAvailableDates(
    req.params.id,
    startDate,
    endDate,
    parseInt(guests) || 1
  );

  ApiResponse.success(res, dates);
});

/**
 * @desc    Get featured experiences
 * @route   GET /api/v1/experiences/featured
 * @access  Public
 */
const getFeaturedExperiences = catchAsync(async (req, res) => {
  const { limit } = req.query;
  const experiences = await experienceService.getFeaturedExperiences(
    parseInt(limit) || 8
  );
  ApiResponse.success(res, experiences);
});

/**
 * @desc    Get experiences by category
 * @route   GET /api/v1/experiences/category/:category
 * @access  Public
 */
const getByCategory = catchAsync(async (req, res) => {
  const { limit } = req.query;
  const experiences = await experienceService.getExperiencesByCategory(
    req.params.category,
    parseInt(limit) || 12
  );
  ApiResponse.success(res, experiences);
});

/**
 * @desc    Get host's experiences
 * @route   GET /api/v1/experiences/host
 * @access  Private (Host)
 */
const getHostExperiences = catchAsync(async (req, res) => {
  const { status, page, limit } = req.query;

  const result = await experienceService.getHostExperiences(
    req.user._id,
    status,
    parseInt(page) || 1,
    parseInt(limit) || 10
  );

  ApiResponse.paginated(res, result.experiences, result.pagination);
});

// ==================== EXPERIENCE BOOKING ====================

/**
 * @desc    Book an experience
 * @route   POST /api/v1/experiences/:id/book
 * @access  Private
 */
const bookExperience = catchAsync(async (req, res) => {
  const booking = await experienceBookingService.createBooking(req.user._id, {
    experienceId: req.params.id,
    ...req.body,
  });
  ApiResponse.created(res, booking, 'Booking created. Please complete payment.');
});

/**
 * @desc    Create payment intent for booking
 * @route   POST /api/v1/experiences/bookings/:id/payment-intent
 * @access  Private
 */
const createPaymentIntent = catchAsync(async (req, res) => {
  const result = await experienceBookingService.createPaymentIntent(
    req.params.id,
    req.user._id
  );
  ApiResponse.success(res, result, 'Payment intent created');
});

/**
 * @desc    Confirm payment
 * @route   POST /api/v1/experiences/bookings/:id/confirm-payment
 * @access  Private
 */
const confirmPayment = catchAsync(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    throw AppError.badRequest('Payment intent ID is required');
  }

  const booking = await experienceBookingService.confirmPayment(
    req.params.id,
    paymentIntentId
  );
  ApiResponse.success(res, booking, 'Payment confirmed. Booking confirmed!');
});

/**
 * @desc    Get my experience bookings
 * @route   GET /api/v1/experiences/bookings
 * @access  Private
 */
const getMyBookings = catchAsync(async (req, res) => {
  const { status, page, limit } = req.query;

  const result = await experienceBookingService.getGuestBookings(
    req.user._id,
    status,
    parseInt(page) || 1,
    parseInt(limit) || 10
  );

  ApiResponse.paginated(res, result.bookings, result.pagination);
});

/**
 * @desc    Get booking details
 * @route   GET /api/v1/experiences/bookings/:id
 * @access  Private
 */
const getBooking = catchAsync(async (req, res) => {
  const booking = await experienceBookingService.getBooking(
    req.params.id,
    req.user._id
  );
  ApiResponse.success(res, booking);
});

/**
 * @desc    Cancel booking
 * @route   PUT /api/v1/experiences/bookings/:id/cancel
 * @access  Private
 */
const cancelBooking = catchAsync(async (req, res) => {
  const { reason } = req.body;

  const booking = await experienceBookingService.cancelBooking(
    req.params.id,
    req.user._id,
    reason
  );
  ApiResponse.success(res, booking, 'Booking cancelled successfully');
});

/**
 * @desc    Get host's experience bookings
 * @route   GET /api/v1/experiences/host/bookings
 * @access  Private (Host)
 */
const getHostBookings = catchAsync(async (req, res) => {
  const { status, page, limit } = req.query;

  const result = await experienceBookingService.getHostBookings(
    req.user._id,
    status,
    parseInt(page) || 1,
    parseInt(limit) || 10
  );

  ApiResponse.paginated(res, result.bookings, result.pagination);
});

/**
 * @desc    Get upcoming experiences for host
 * @route   GET /api/v1/experiences/host/upcoming
 * @access  Private (Host)
 */
const getUpcomingForHost = catchAsync(async (req, res) => {
  const { days } = req.query;

  const bookings = await experienceBookingService.getUpcomingForHost(
    req.user._id,
    parseInt(days) || 7
  );
  ApiResponse.success(res, bookings);
});

/**
 * @desc    Mark booking as no-show
 * @route   PUT /api/v1/experiences/bookings/:id/no-show
 * @access  Private (Host)
 */
const markNoShow = catchAsync(async (req, res) => {
  const booking = await experienceBookingService.markNoShow(
    req.params.id,
    req.user._id
  );
  ApiResponse.success(res, booking, 'Marked as no-show');
});

module.exports = {
  // Experience CRUD
  createExperience,
  getExperiences,
  getExperience,
  updateExperience,
  deleteExperience,
  publishExperience,
  addImages,
  deleteImage,
  getAvailability,
  getFeaturedExperiences,
  getByCategory,
  getHostExperiences,
  // Bookings
  bookExperience,
  createPaymentIntent,
  confirmPayment,
  getMyBookings,
  getBooking,
  cancelBooking,
  getHostBookings,
  getUpcomingForHost,
  markNoShow,
};
