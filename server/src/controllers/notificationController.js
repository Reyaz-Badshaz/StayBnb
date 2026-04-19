const { notificationService } = require('../services');
const { catchAsync, ApiResponse, AppError } = require('../utils');

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getNotifications = catchAsync(async (req, res) => {
  const { page, limit, unread } = req.query;

  const result = await notificationService.getNotifications(req.user._id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    unreadOnly: unread === 'true',
  });

  ApiResponse.paginated(res, result.notifications, {
    ...result.pagination,
    unreadCount: result.unreadCount,
  });
});

/**
 * @desc    Get unread count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user._id);
  ApiResponse.success(res, result);
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/notifications/:id/read
 * @access  Private
 */
const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  ApiResponse.success(res, notification);
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/notifications/read-all
 * @access  Private
 */
const markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);
  ApiResponse.success(res, { success: true }, 'All notifications marked as read');
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
const deleteNotification = catchAsync(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);
  ApiResponse.success(res, { success: true }, 'Notification deleted');
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/v1/notifications/preferences
 * @access  Private
 */
const updatePreferences = catchAsync(async (req, res) => {
  const preferences = await notificationService.updatePreferences(req.user._id, req.body);
  ApiResponse.success(res, preferences, 'Notification preferences updated');
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updatePreferences,
};
