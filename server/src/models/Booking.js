const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Booking must be associated with a property'],
      index: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must have a guest'],
      index: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must have a host'],
      index: true,
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    guests: {
      adults: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
      },
      children: {
        type: Number,
        default: 0,
        min: 0,
      },
      infants: {
        type: Number,
        default: 0,
        min: 0,
      },
      pets: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    pricing: {
      nightlyRate: {
        type: Number,
        required: true,
      },
      nights: {
        type: Number,
        required: true,
      },
      subtotal: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        default: 0,
      },
      cleaningFee: {
        type: Number,
        default: 0,
      },
      serviceFee: {
        type: Number,
        required: true,
      },
      taxes: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'INR',
      },
      hostPayout: {
        type: Number, // Total minus service fees
      },
    },
    payment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      status: {
        type: String,
        enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending',
      },
      method: {
        type: String,
        enum: ['razorpay', 'upi', 'card', 'netbanking', 'wallet', 'demo'],
        default: 'razorpay',
      },
      paidAt: Date,
      refundedAt: Date,
      refundAmount: Number,
      refundReason: String,
    },
    payout: {
      razorpayTransferId: String,
      status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed'],
        default: 'pending',
      },
      amount: Number,
      paidAt: Date,
    },
    status: {
      type: String,
      enum: [
        'pending',       // Initial state, waiting for payment
        'confirmed',     // Payment successful, booking confirmed
        'cancelled',     // Cancelled by guest or host
        'declined',      // Declined by host (for request-to-book)
        'completed',     // Stay completed
        'no_show',       // Guest didn't show up
      ],
      default: 'pending',
      index: true,
    },
    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      cancelledAt: Date,
      reason: String,
      policy: String, // The cancellation policy at time of booking
      refundAmount: Number,
      refundPercentage: Number,
    },
    specialRequests: {
      type: String,
      maxlength: 1000,
    },
    guestMessage: {
      type: String,
      maxlength: 1000,
    },
    hostResponse: {
      message: String,
      respondedAt: Date,
    },
    isInstantBook: {
      type: Boolean,
      default: false,
    },
    reviewDeadline: Date, // Date after which reviews can no longer be left
    guestReviewed: {
      type: Boolean,
      default: false,
    },
    hostReviewed: {
      type: Boolean,
      default: false,
    },
    confirmationCode: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total guests
bookingSchema.virtual('totalGuests').get(function () {
  return (
    (this.guests?.adults || 0) +
    (this.guests?.children || 0)
  );
});

// Virtual for number of nights
bookingSchema.virtual('numberOfNights').get(function () {
  if (!this.checkIn || !this.checkOut) return 0;
  const diffTime = Math.abs(new Date(this.checkOut) - new Date(this.checkIn));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1, checkIn: 1 });
bookingSchema.index({ createdAt: -1 });

// Pre-save: Generate confirmation code (Mongoose 9.x uses async/await, no next())
bookingSchema.pre('save', function () {
  if (!this.confirmationCode) {
    // Generate 8-character alphanumeric code
    this.confirmationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  // Set review deadline (14 days after checkout)
  if (this.checkOut && !this.reviewDeadline) {
    const deadline = new Date(this.checkOut);
    deadline.setDate(deadline.getDate() + 14);
    this.reviewDeadline = deadline;
  }

  // Calculate host payout
  if (this.pricing?.total && !this.pricing.hostPayout) {
    // Host gets total minus service fee (typically platform takes 3%)
    this.pricing.hostPayout = this.pricing.total - this.pricing.serviceFee;
  }
});

// Pre-save: Validate dates
bookingSchema.pre('save', function () {
  if (this.checkIn && this.checkOut) {
    if (new Date(this.checkIn) >= new Date(this.checkOut)) {
      throw new Error('Check-out date must be after check-in date');
    }
    if (new Date(this.checkIn) < new Date().setHours(0, 0, 0, 0)) {
      throw new Error('Check-in date cannot be in the past');
    }
  }
});

// Static method to check for booking conflicts
bookingSchema.statics.hasConflict = async function (propertyId, checkIn, checkOut, excludeBookingId = null) {
  const query = {
    property: propertyId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      {
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) },
      },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflict = await this.findOne(query);
  return !!conflict;
};

// Static method to get bookings for a property in date range
bookingSchema.statics.getBookedDates = async function (propertyId, startDate, endDate) {
  const bookings = await this.find({
    property: propertyId,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      { checkIn: { $gte: startDate, $lte: endDate } },
      { checkOut: { $gte: startDate, $lte: endDate } },
      { checkIn: { $lte: startDate }, checkOut: { $gte: endDate } },
    ],
  }).select('checkIn checkOut');

  // Convert to array of dates
  const bookedDates = [];
  bookings.forEach((booking) => {
    const current = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    while (current < end) {
      bookedDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  });

  return bookedDates;
};

// Instance method to check if cancellation is allowed
bookingSchema.methods.canCancel = function () {
  if (['cancelled', 'declined', 'completed', 'no_show'].includes(this.status)) {
    return { allowed: false, reason: 'Booking cannot be cancelled in current status' };
  }

  const now = new Date();
  const checkInDate = new Date(this.checkIn);

  // Can always cancel if check-in is more than 24 hours away
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);

  return {
    allowed: true,
    hoursUntilCheckIn,
    policy: this.cancellation?.policy || 'moderate',
  };
};

// Instance method to calculate refund amount
bookingSchema.methods.calculateRefund = function () {
  const { allowed, hoursUntilCheckIn, policy } = this.canCancel();

  if (!allowed) {
    return { refundAmount: 0, refundPercentage: 0 };
  }

  const total = this.pricing.total;
  let refundPercentage = 0;

  switch (policy) {
    case 'flexible':
      // Full refund if cancelled 24 hours before check-in
      refundPercentage = hoursUntilCheckIn >= 24 ? 100 : 0;
      break;
    case 'moderate':
      // Full refund if cancelled 5 days before check-in
      refundPercentage = hoursUntilCheckIn >= 120 ? 100 : 50;
      break;
    case 'strict':
      // 50% refund if cancelled 7 days before check-in
      refundPercentage = hoursUntilCheckIn >= 168 ? 50 : 0;
      break;
    case 'super_strict':
      // No refund
      refundPercentage = 0;
      break;
    default:
      refundPercentage = hoursUntilCheckIn >= 120 ? 100 : 50;
  }

  return {
    refundAmount: Math.round((total * refundPercentage) / 100 * 100) / 100,
    refundPercentage,
  };
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
