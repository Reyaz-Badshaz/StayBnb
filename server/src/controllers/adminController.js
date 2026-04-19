const { adminService } = require('../services');
const { catchAsync, ApiResponse, AppError } = require('../utils');

/**
 * @desc    Get admin dashboard overview
 * @route   GET /api/v1/admin/dashboard
 * @access  Private (Admin)
 */
const getDashboardOverview = catchAsync(async (req, res) => {
  const stats = await adminService.getDashboardOverview();
  ApiResponse.success(res, stats);
});

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
 * @access  Private (Admin)
 */
const getUsers = catchAsync(async (req, res) => {
  const { role, status, search, verified, page, limit, sort } = req.query;

  const result = await adminService.getUsers(
    { role, status, search, verified },
    { page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort }
  );

  ApiResponse.paginated(res, result.users, result.pagination);
});

/**
 * @desc    Get user details
 * @route   GET /api/v1/admin/users/:id
 * @access  Private (Admin)
 */
const getUserDetails = catchAsync(async (req, res) => {
  const result = await adminService.getUserDetails(req.params.id);
  ApiResponse.success(res, result);
});

/**
 * @desc    Update user status (suspend/activate)
 * @route   PUT /api/v1/admin/users/:id/status
 * @access  Private (Admin)
 */
const updateUserStatus = catchAsync(async (req, res) => {
  const { status, reason } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    throw AppError.badRequest('Invalid status. Must be "active" or "suspended"');
  }

  const user = await adminService.updateUserStatus(
    req.params.id,
    status,
    req.user._id,
    reason
  );

  ApiResponse.success(res, user, `User ${status === 'active' ? 'activated' : 'suspended'} successfully`);
});

/**
 * @desc    Update user role
 * @route   PUT /api/v1/admin/users/:id/role
 * @access  Private (Admin)
 */
const updateUserRole = catchAsync(async (req, res) => {
  const { role } = req.body;

  const user = await adminService.updateUserRole(req.params.id, role, req.user._id);

  ApiResponse.success(res, user, 'User role updated successfully');
});

/**
 * @desc    Get all properties
 * @route   GET /api/v1/admin/properties
 * @access  Private (Admin)
 */
const getProperties = catchAsync(async (req, res) => {
  const { status, propertyType, search, hostId, page, limit, sort } = req.query;

  const result = await adminService.getProperties(
    { status, propertyType, search, hostId },
    { page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort }
  );

  ApiResponse.paginated(res, result.properties, result.pagination);
});

/**
 * @desc    Moderate property (approve/reject/suspend)
 * @route   PUT /api/v1/admin/properties/:id/moderate
 * @access  Private (Admin)
 */
const moderateProperty = catchAsync(async (req, res) => {
  const { action, reason } = req.body;

  if (!['approve', 'reject', 'suspend'].includes(action)) {
    throw AppError.badRequest('Invalid action. Must be "approve", "reject", or "suspend"');
  }

  const property = await adminService.moderateProperty(
    req.params.id,
    action,
    req.user._id,
    reason
  );

  ApiResponse.success(res, property, `Property ${action}d successfully`);
});

/**
 * @desc    Get all bookings
 * @route   GET /api/v1/admin/bookings
 * @access  Private (Admin)
 */
const getBookings = catchAsync(async (req, res) => {
  const { status, startDate, endDate, search, page, limit, sort } = req.query;

  const result = await adminService.getBookings(
    { status, startDate, endDate, search },
    { page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort }
  );

  ApiResponse.paginated(res, result.bookings, result.pagination);
});

/**
 * @desc    Get all reviews
 * @route   GET /api/v1/admin/reviews
 * @access  Private (Admin)
 */
const getReviews = catchAsync(async (req, res) => {
  const { type, reported, moderated, page, limit, sort } = req.query;

  const result = await adminService.getReviews(
    { type, reported, moderated },
    { page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort }
  );

  ApiResponse.paginated(res, result.reviews, result.pagination);
});

/**
 * @desc    Moderate review (approve/hide/delete)
 * @route   PUT /api/v1/admin/reviews/:id/moderate
 * @access  Private (Admin)
 */
const moderateReview = catchAsync(async (req, res) => {
  const { action, note } = req.body;

  if (!['approve', 'hide', 'delete'].includes(action)) {
    throw AppError.badRequest('Invalid action. Must be "approve", "hide", or "delete"');
  }

  const result = await adminService.moderateReview(
    req.params.id,
    action,
    req.user._id,
    note
  );

  if (result.deleted) {
    ApiResponse.success(res, null, 'Review deleted successfully');
  } else {
    ApiResponse.success(res, result, `Review ${action}d successfully`);
  }
});

/**
 * @desc    Get revenue analytics
 * @route   GET /api/v1/admin/analytics/revenue
 * @access  Private (Admin)
 */
const getRevenueAnalytics = catchAsync(async (req, res) => {
  const { period } = req.query;

  const analytics = await adminService.getRevenueAnalytics(period || 'year');

  ApiResponse.success(res, analytics);
});

/**
 * @desc    Get platform settings
 * @route   GET /api/v1/admin/settings
 * @access  Private (Admin)
 */
const getPlatformSettings = catchAsync(async (req, res) => {
  const settings = await adminService.getPlatformSettings();
  ApiResponse.success(res, settings);
});

module.exports = {
  getDashboardOverview,
  getUsers,
  getUserDetails,
  updateUserStatus,
  updateUserRole,
  getProperties,
  moderateProperty,
  getBookings,
  getReviews,
  moderateReview,
  getRevenueAnalytics,
  getPlatformSettings,
};
