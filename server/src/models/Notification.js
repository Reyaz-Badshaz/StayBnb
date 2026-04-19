const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    // Recipient
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
      index: true,
    },

    // Notification type
    type: {
      type: String,
      enum: [
        // Booking notifications
        'booking_request',
        'booking_confirmed',
        'booking_cancelled',
        'booking_reminder',
        'checkout_reminder',
        
        // Payment notifications
        'payment_received',
        'payment_failed',
        'payout_sent',
        'refund_processed',
        
        // Review notifications
        'review_received',
        'review_reminder',
        
        // Message notifications
        'new_message',
        
        // Host notifications
        'listing_approved',
        'listing_rejected',
        'superhost_achieved',
        
        // System notifications
        'account_verified',
        'password_changed',
        'system_alert',
      ],
      required: true,
    },

    // Title and message
    title: {
      type: String,
      required: [true, 'Notification must have a title'],
    },
    message: {
      type: String,
      required: [true, 'Notification must have a message'],
    },

    // Related entities
    data: {
      bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
      propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
      reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
      conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      amount: Number,
      custom: Schema.Types.Mixed,
    },

    // Action URL (for redirecting when clicked)
    actionUrl: String,

    // Status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,

    // Delivery channels
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },

    // Delivery status
    deliveryStatus: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
    },

    // Metadata
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    expiresAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static: Create notification helper
notificationSchema.statics.createNotification = async function (data) {
  const notification = await this.create(data);
  
  // Emit via Socket.io if available
  const { sendToUser } = require('../socket');
  try {
    sendToUser(data.user, 'notification', notification);
  } catch (err) {
    // Socket may not be initialized
  }
  
  return notification;
};

// Static: Mark all as read for user
notificationSchema.statics.markAllRead = async function (userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static: Get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
