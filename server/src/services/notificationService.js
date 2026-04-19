const Notification = require('../models/Notification');
const emailService = require('./emailService');
const { User } = require('../models');
const AppError = require('../utils/AppError');

// Notification templates
const notificationTemplates = {
  booking_request: (data) => ({
    title: 'New Booking Request',
    message: `${data.guestName} wants to book ${data.propertyTitle} for ${data.nights} nights`,
    actionUrl: `/host`,
    priority: 'high',
  }),

  booking_confirmed: (data) => ({
    title: 'Booking Confirmed! 🎉',
    message: `Your booking at ${data.propertyTitle} has been confirmed`,
    actionUrl: `/trips/${data.bookingId}`,
    priority: 'high',
  }),

  booking_cancelled: (data) => ({
    title: 'Booking Cancelled',
    message: `Your booking at ${data.propertyTitle} has been cancelled${data.refundAmount ? `. Refund: ₹${data.refundAmount}` : ''}`,
    actionUrl: `/trips/${data.bookingId}`,
    priority: 'normal',
  }),

  booking_reminder: (data) => ({
    title: 'Check-in Tomorrow! 📅',
    message: `Reminder: Your stay at ${data.propertyTitle} starts tomorrow`,
    actionUrl: `/bookings/${data.bookingId}`,
    priority: 'high',
  }),

  checkout_reminder: (data) => ({
    title: 'Check-out Today',
    message: `Reminder: Please check out of ${data.propertyTitle} by ${data.checkoutTime}`,
    actionUrl: `/bookings/${data.bookingId}`,
    priority: 'normal',
  }),

  payment_received: (data) => ({
    title: 'Payment Received 💰',
    message: `Payment of ₹${data.amount} received for ${data.propertyTitle}`,
    actionUrl: `/host/earnings`,
    priority: 'normal',
  }),

  payout_sent: (data) => ({
    title: 'Payout Sent! 🎉',
    message: `₹${data.amount} has been sent to your bank account`,
    actionUrl: `/host/earnings`,
    priority: 'normal',
  }),

  review_received: (data) => ({
    title: 'New Review ⭐',
    message: `${data.reviewerName} left a ${data.rating}-star review for ${data.propertyTitle}`,
    actionUrl: `/host/reviews`,
    priority: 'normal',
  }),

  review_reminder: (data) => ({
    title: 'Time to Review Your Stay',
    message: `Share your experience at ${data.propertyTitle}. ${data.daysLeft} days left`,
    actionUrl: `/reviews/write/${data.bookingId}`,
    priority: 'low',
  }),

  new_message: (data) => ({
    title: 'New Message 💬',
    message: `${data.senderName}: ${data.preview}`,
    actionUrl: `/messages/${data.conversationId}`,
    priority: 'normal',
  }),

  listing_approved: (data) => ({
    title: 'Listing Approved! 🎉',
    message: `Your property "${data.propertyTitle}" is now live and accepting bookings`,
    actionUrl: `/properties/${data.propertyId}`,
    priority: 'high',
  }),

  listing_rejected: (data) => ({
    title: 'Listing Needs Changes',
    message: `Your property "${data.propertyTitle}" requires updates before publishing`,
    actionUrl: `/host/listings/${data.propertyId}/edit`,
    priority: 'high',
  }),

  superhost_achieved: (data) => ({
    title: 'Congratulations, Superhost! 🏆',
    message: `You've earned Superhost status! Thank you for being an exceptional host.`,
    actionUrl: `/host/profile`,
    priority: 'high',
  }),

  account_verified: (data) => ({
    title: 'Account Verified ✓',
    message: `Your email has been verified. Welcome to StayBnB!`,
    actionUrl: `/profile`,
    priority: 'normal',
  }),
};

/**
 * Create notification
 */
const createNotification = async (userId, type, data, options = {}) => {
  const template = notificationTemplates[type];
  if (!template) {
    throw AppError.badRequest(`Invalid notification type: ${type}`);
  }

  const { title, message, actionUrl, priority } = template(data);

  // Get user's notification preferences
  const user = await User.findById(userId).select('preferences');
  const preferences = user?.preferences?.notifications || {};

  // Determine channels based on preferences and type
  const channels = {
    inApp: true,
    email: options.email !== false && preferences.email !== false,
    push: options.push !== false && preferences.push !== false,
  };

  const notification = await Notification.createNotification({
    user: userId,
    type,
    title,
    message,
    data: {
      ...data,
      custom: options.custom,
    },
    actionUrl,
    priority,
    channels,
    expiresAt: options.expiresAt,
  });

  // Send email if enabled
  const emailMethod = emailService[`send${capitalizeType(type)}`];
  if (channels.email && typeof emailMethod === 'function') {
    try {
      const emailResult = await emailMethod(data);
      notification.deliveryStatus.email = {
        sent: emailResult.success,
        sentAt: new Date(),
        error: emailResult.error,
      };
      await notification.save();
    } catch (err) {
      console.error('Email notification failed:', err);
    }
  }

  return notification;
};

/**
 * Get user notifications
 */
const getNotifications = async (userId, options = {}) => {
  const { page = 1, limit = 20, unreadOnly = false } = options;

  const query = { user: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.getUnreadCount(userId),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw AppError.notFound('Notification not found');
  }

  return notification;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  await Notification.markAllRead(userId);
  return { success: true };
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    throw AppError.notFound('Notification not found');
  }

  return { success: true };
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  const count = await Notification.getUnreadCount(userId);
  return { unreadCount: count };
};

/**
 * Update notification preferences
 */
const updatePreferences = async (userId, preferences) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { 'preferences.notifications': preferences },
    { new: true }
  ).select('preferences.notifications');

  return user.preferences.notifications;
};

/**
 * Send booking notifications
 */
const sendBookingNotifications = async (booking, type) => {
  const data = {
    bookingId: booking._id,
    propertyId: booking.property._id,
    propertyTitle: booking.property.title,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
    hostName: `${booking.host.firstName}`,
    nights: booking.pricing.nights,
    amount: booking.pricing.total,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  };

  if (type === 'request') {
    // Notify host
    await createNotification(booking.host._id, 'booking_request', data, { email: true });
  } else if (type === 'confirmed') {
    // Notify guest
    await createNotification(booking.guest._id, 'booking_confirmed', data, { email: true });
  } else if (type === 'cancelled') {
    // Notify both
    await createNotification(booking.guest._id, 'booking_cancelled', {
      ...data,
      refundAmount: booking.cancellation?.refundAmount,
    }, { email: true });
    await createNotification(booking.host._id, 'booking_cancelled', data);
  }
};

/**
 * Send review notification
 */
const sendReviewNotification = async (review) => {
  const data = {
    reviewId: review._id,
    propertyId: review.property._id,
    propertyTitle: review.property.title,
    reviewerName: `${review.reviewer.firstName}`,
    rating: review.ratings.overall,
  };

  await createNotification(review.reviewee._id, 'review_received', data);
};

/**
 * Send message notification
 */
const sendMessageNotification = async (message, conversation, recipientId) => {
  const data = {
    conversationId: conversation._id,
    messageId: message._id,
    senderName: `${message.sender.firstName}`,
    preview: message.content.substring(0, 50),
  };

  await createNotification(recipientId, 'new_message', data);
};

// Helper function
const capitalizeType = (type) => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  updatePreferences,
  sendBookingNotifications,
  sendReviewNotification,
  sendMessageNotification,
};
