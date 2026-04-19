const { hostDashboardService } = require('../services');
const { catchAsync, ApiResponse, AppError } = require('../utils');

/**
 * @desc    Get dashboard overview
 * @route   GET /api/v1/host/dashboard
 * @access  Private (Host)
 */
const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await hostDashboardService.getDashboardStats(req.user._id);

  ApiResponse.success(res, stats);
});

/**
 * @desc    Get earnings report
 * @route   GET /api/v1/host/earnings
 * @access  Private (Host)
 */
const getEarningsReport = catchAsync(async (req, res) => {
  const { period, year, month } = req.query;

  const report = await hostDashboardService.getEarningsReport(req.user._id, {
    period,
    year: year ? parseInt(year) : undefined,
    month: month ? parseInt(month) : undefined,
  });

  ApiResponse.success(res, report);
});

/**
 * @desc    Get booking calendar for a property
 * @route   GET /api/v1/host/properties/:propertyId/calendar
 * @access  Private (Host)
 */
const getBookingCalendar = catchAsync(async (req, res) => {
  const { propertyId } = req.params;
  const { year, month } = req.query;

  const now = new Date();
  const targetYear = year ? parseInt(year) : now.getFullYear();
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

  const calendar = await hostDashboardService.getBookingCalendar(
    req.user._id,
    propertyId,
    targetYear,
    targetMonth
  );

  ApiResponse.success(res, calendar);
});

/**
 * @desc    Get performance metrics
 * @route   GET /api/v1/host/performance
 * @access  Private (Host)
 */
const getPerformanceMetrics = catchAsync(async (req, res) => {
  const metrics = await hostDashboardService.getPerformanceMetrics(req.user._id);

  ApiResponse.success(res, metrics);
});

/**
 * @desc    Get activity feed
 * @route   GET /api/v1/host/activity
 * @access  Private (Host)
 */
const getActivityFeed = catchAsync(async (req, res) => {
  const { limit } = req.query;

  const activities = await hostDashboardService.getActivityFeed(req.user._id, {
    limit: limit ? parseInt(limit) : 20,
  });

  ApiResponse.success(res, activities);
});

/**
 * @desc    Get pricing suggestions for a property
 * @route   GET /api/v1/host/properties/:propertyId/pricing-suggestions
 * @access  Private (Host)
 */
const getPricingSuggestions = catchAsync(async (req, res) => {
  const { propertyId } = req.params;

  const suggestions = await hostDashboardService.getPricingSuggestions(
    req.user._id,
    propertyId
  );

  ApiResponse.success(res, suggestions);
});

/**
 * @desc    Get host's listings with stats
 * @route   GET /api/v1/host/listings
 * @access  Private (Host)
 */
const getHostListings = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const { propertyService } = require('../services');
  const properties = await propertyService.getHostProperties(
    req.user._id,
    status,
    parseInt(page),
    parseInt(limit)
  );

  ApiResponse.paginated(res, properties.properties, properties.pagination);
});

/**
 * @desc    Get host's bookings
 * @route   GET /api/v1/host/bookings
 * @access  Private (Host)
 */
const getHostBookings = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10, upcoming, past } = req.query;

  const { bookingService } = require('../services');
  
  let bookings;
  if (upcoming === 'true') {
    bookings = await bookingService.getHostUpcomingBookings(
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );
  } else {
    bookings = await bookingService.getHostBookings(
      req.user._id,
      status,
      parseInt(page),
      parseInt(limit)
    );
  }

  ApiResponse.paginated(res, bookings.bookings, bookings.pagination);
});

/**
 * @desc    Update availability / block dates
 * @route   PUT /api/v1/host/properties/:propertyId/availability
 * @access  Private (Host)
 */
const updateAvailability = catchAsync(async (req, res) => {
  const { propertyId } = req.params;
  const { blockedDates, minNights, maxNights, advanceNotice } = req.body;

  const { propertyService } = require('../services');
  const property = await propertyService.updateAvailability(
    propertyId,
    req.user._id,
    { blockedDates, minNights, maxNights, advanceNotice }
  );

  ApiResponse.success(res, property, 'Availability updated');
});

/**
 * @desc    Update property pricing
 * @route   PUT /api/v1/host/properties/:propertyId/pricing
 * @access  Private (Host)
 */
const updatePricing = catchAsync(async (req, res) => {
  const { propertyId } = req.params;
  const { basePrice, weekendPrice, weeklyDiscount, monthlyDiscount, cleaningFee } = req.body;

  const { propertyService } = require('../services');
  const property = await propertyService.updatePricing(
    propertyId,
    req.user._id,
    { basePrice, weekendPrice, weeklyDiscount, monthlyDiscount, cleaningFee }
  );

  ApiResponse.success(res, property, 'Pricing updated');
});

module.exports = {
  getDashboardStats,
  getEarningsReport,
  getBookingCalendar,
  getPerformanceMetrics,
  getActivityFeed,
  getPricingSuggestions,
  getHostListings,
  getHostBookings,
  updateAvailability,
  updatePricing,
};
