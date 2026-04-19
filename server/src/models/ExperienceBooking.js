const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const experienceBookingSchema = new Schema(
  {
    // References
    experience: {
      type: Schema.Types.ObjectId,
      ref: 'Experience',
      required: [true, 'Booking must be linked to an experience'],
      index: true,
    },
    guest: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must have a guest'],
      index: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must have a host'],
      index: true,
    },

    // Confirmation code
    confirmationCode: {
      type: String,
      unique: true,
      index: true,
    },

    // Schedule details
    schedule: {
      date: {
        type: Date,
        required: [true, 'Booking date is required'],
      },
      startTime: {
        type: String,
        required: [true, 'Start time is required'],
      },
      endTime: String,
    },

    // Guests
    guests: {
      count: {
        type: Number,
        required: [true, 'Number of guests is required'],
        min: 1,
      },
      details: [{
        name: String,
        age: Number,
        specialRequirements: String,
      }],
    },

    // Contact info
    contact: {
      phone: String,
      emergencyContact: {
        name: String,
        phone: String,
      },
    },

    // Special requests
    specialRequests: String,

    // Pricing
    pricing: {
      pricePerPerson: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      serviceFee: { type: Number, required: true },
      total: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      groupDiscountApplied: { type: Boolean, default: false },
    },

    // Payment
    payment: {
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending',
      },
      method: String,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
      refundedAt: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
    },

    // Cancellation
    cancellation: {
      cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
      cancelledAt: Date,
      reason: String,
      refundAmount: Number,
      refundPercentage: Number,
    },

    // Review deadline
    reviewDeadline: Date,
    hasReviewed: { type: Boolean, default: false },

    // Host notes
    hostNotes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
experienceBookingSchema.index({ experience: 1, 'schedule.date': 1 });
experienceBookingSchema.index({ guest: 1, createdAt: -1 });
experienceBookingSchema.index({ host: 1, 'schedule.date': 1 });
experienceBookingSchema.index({ status: 1 });

// Pre-save: Generate confirmation code (Mongoose 9.x uses async/await, no next())
experienceBookingSchema.pre('save', async function () {
  if (!this.confirmationCode) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'EXP';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.confirmationCode = code;
  }
});

// Pre-save: Set review deadline
experienceBookingSchema.pre('save', function () {
  if (this.isNew || this.isModified('schedule.date')) {
    const deadline = new Date(this.schedule.date);
    deadline.setDate(deadline.getDate() + 14);
    this.reviewDeadline = deadline;
  }
});

// Static: Check for conflicts
experienceBookingSchema.statics.hasConflict = async function (
  experienceId,
  date,
  guests
) {
  const Experience = require('./Experience');
  const experience = await Experience.findById(experienceId);
  
  if (!experience) return true;

  // Get existing confirmed bookings for this date
  const existingBookings = await this.aggregate([
    {
      $match: {
        experience: mongoose.Types.ObjectId.createFromHexString(experienceId.toString()),
        'schedule.date': {
          $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(date).setHours(23, 59, 59, 999)),
        },
        status: { $in: ['pending', 'confirmed'] },
      },
    },
    {
      $group: {
        _id: null,
        totalGuests: { $sum: '$guests.count' },
      },
    },
  ]);

  const bookedGuests = existingBookings[0]?.totalGuests || 0;
  const availableSpots = experience.capacity.max - bookedGuests;

  return guests > availableSpots;
};

// Static: Get booked spots for a date
experienceBookingSchema.statics.getBookedSpots = async function (
  experienceId,
  date
) {
  const result = await this.aggregate([
    {
      $match: {
        experience: mongoose.Types.ObjectId.createFromHexString(experienceId.toString()),
        'schedule.date': {
          $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(date).setHours(23, 59, 59, 999)),
        },
        status: { $in: ['pending', 'confirmed'] },
      },
    },
    {
      $group: {
        _id: null,
        totalGuests: { $sum: '$guests.count' },
        bookings: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { totalGuests: 0, bookings: 0 };
};

// Method: Can cancel
experienceBookingSchema.methods.canCancel = function () {
  if (!['pending', 'confirmed'].includes(this.status)) {
    return false;
  }
  // Can cancel up to 24 hours before
  const now = new Date();
  const experienceDate = new Date(this.schedule.date);
  const hoursUntil = (experienceDate - now) / (1000 * 60 * 60);
  return hoursUntil >= 24;
};

// Method: Calculate refund
experienceBookingSchema.methods.calculateRefund = function () {
  const now = new Date();
  const experienceDate = new Date(this.schedule.date);
  const hoursUntil = (experienceDate - now) / (1000 * 60 * 60);

  // Based on cancellation policy stored in experience
  // Default: full refund if 24+ hours before
  if (hoursUntil >= 24) {
    return {
      refundPercentage: 100,
      refundAmount: this.pricing.total,
    };
  } else if (hoursUntil >= 2) {
    return {
      refundPercentage: 50,
      refundAmount: this.pricing.total * 0.5,
    };
  }
  return {
    refundPercentage: 0,
    refundAmount: 0,
  };
};

const ExperienceBooking = mongoose.model('ExperienceBooking', experienceBookingSchema);

module.exports = ExperienceBooking;
