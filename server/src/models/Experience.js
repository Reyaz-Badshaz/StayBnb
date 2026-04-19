const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const experienceSchema = new Schema(
  {
    // Host
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Experience must have a host'],
      index: true,
    },

    // Basic Information
    title: {
      type: String,
      required: [true, 'Experience title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Experience description is required'],
      minlength: [100, 'Description must be at least 100 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    summary: {
      type: String,
      maxlength: [500, 'Summary cannot exceed 500 characters'],
    },

    // Category
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'food_and_drink',
        'art_and_culture',
        'entertainment',
        'sports',
        'tours',
        'sightseeing',
        'wellness',
        'nature',
        'social_impact',
        'animals',
        'history',
        'music',
        'cooking',
        'crafts',
        'photography',
        'nightlife',
        'workshops',
        'other',
      ],
    },

    // What's included
    includes: [{
      item: { type: String, required: true },
      description: String,
    }],

    // What to bring
    whatToBring: [String],

    // Location
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: String,
      city: { type: String, required: true },
      state: String,
      country: { type: String, required: true },
      postalCode: String,
      meetingPoint: {
        type: String,
        required: [true, 'Meeting point is required'],
      },
    },

    // Duration
    duration: {
      hours: { type: Number, required: true, min: 0.5, max: 24 },
      minutes: { type: Number, default: 0, min: 0, max: 59 },
    },

    // Capacity
    capacity: {
      min: { type: Number, default: 1, min: 1 },
      max: { type: Number, required: true, min: 1, max: 50 },
    },

    // Pricing
    pricing: {
      pricePerPerson: {
        type: Number,
        required: [true, 'Price per person is required'],
        min: [1, 'Price must be at least $1'],
      },
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      },
      groupDiscount: {
        minGuests: { type: Number, default: 0 },
        discountPercentage: { type: Number, default: 0, min: 0, max: 50 },
      },
    },

    // Images
    images: [{
      url: { type: String, required: true },
      publicId: String,
      caption: String,
      isPrimary: { type: Boolean, default: false },
    }],

    // Schedule & Availability
    schedule: {
      type: {
        type: String,
        enum: ['recurring', 'specific_dates'],
        default: 'recurring',
      },
      // For recurring schedules
      recurringDays: [{
        dayOfWeek: {
          type: Number, // 0 = Sunday, 6 = Saturday
          min: 0,
          max: 6,
        },
        startTime: String, // "10:00"
        endTime: String,   // "14:00"
      }],
      // For specific dates
      specificDates: [{
        date: Date,
        startTime: String,
        endTime: String,
        spotsAvailable: Number,
      }],
      // Blocked dates
      blockedDates: [Date],
      // Advance booking
      advanceNotice: { type: Number, default: 24 }, // hours
      bookingWindow: { type: Number, default: 90 }, // days ahead
    },

    // Languages offered
    languages: [{
      type: String,
      required: true,
    }],

    // Accessibility
    accessibility: [{
      type: String,
      enum: [
        'wheelchair_accessible',
        'mobility_assistance',
        'hearing_assistance',
        'visual_assistance',
        'service_animals_allowed',
        'step_free',
        'accessible_parking',
        'accessible_restroom',
      ],
    }],

    // Physical requirements
    physicalRequirements: {
      fitnessLevel: {
        type: String,
        enum: ['easy', 'moderate', 'challenging', 'intense'],
        default: 'easy',
      },
      ageRestriction: {
        minAge: { type: Number, default: 0 },
        maxAge: { type: Number, default: 100 },
      },
      notes: String,
    },

    // Ratings
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'paused', 'rejected', 'suspended'],
      default: 'draft',
    },

    // Moderation
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: Date,
    rejectionReason: String,

    // Stats
    stats: {
      views: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 },
      totalGuests: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },

    // Cancellation policy
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate',
    },

    // Tags for search
    tags: [String],

    // Featured flag
    isFeatured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
experienceSchema.index({ 'location.coordinates': '2dsphere' });
experienceSchema.index({ host: 1, status: 1 });
experienceSchema.index({ category: 1, status: 1 });
experienceSchema.index({ 'location.city': 1 });
experienceSchema.index({ 'pricing.pricePerPerson': 1 });
experienceSchema.index({ 'rating.average': -1 });
experienceSchema.index({ tags: 1 });

// Virtual for duration string
experienceSchema.virtual('durationString').get(function () {
  const hours = this.duration.hours;
  const minutes = this.duration.minutes || 0;
  if (hours < 1) return `${minutes} minutes`;
  if (minutes === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours}h ${minutes}m`;
});

// Virtual for primary image
experienceSchema.virtual('primaryImage').get(function () {
  const primary = this.images?.find((img) => img.isPrimary);
  return primary?.url || this.images?.[0]?.url || null;
});

// Virtual for next available date
experienceSchema.virtual('nextAvailable').get(function () {
  if (this.schedule.type === 'specific_dates') {
    const now = new Date();
    const upcoming = this.schedule.specificDates
      .filter((d) => new Date(d.date) > now && d.spotsAvailable > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return upcoming[0]?.date || null;
  }
  return null;
});

// Method: Check availability for a date
experienceSchema.methods.isAvailable = function (date, guests) {
  const checkDate = new Date(date);
  
  // Check if date is blocked
  const isBlocked = this.schedule.blockedDates.some(
    (d) => new Date(d).toDateString() === checkDate.toDateString()
  );
  if (isBlocked) return false;

  // Check advance notice
  const now = new Date();
  const hoursUntil = (checkDate - now) / (1000 * 60 * 60);
  if (hoursUntil < this.schedule.advanceNotice) return false;

  // Check booking window
  const daysUntil = hoursUntil / 24;
  if (daysUntil > this.schedule.bookingWindow) return false;

  // Check capacity
  if (guests > this.capacity.max || guests < this.capacity.min) return false;

  // Check schedule
  if (this.schedule.type === 'recurring') {
    const dayOfWeek = checkDate.getDay();
    return this.schedule.recurringDays.some((d) => d.dayOfWeek === dayOfWeek);
  } else {
    const specificDate = this.schedule.specificDates.find(
      (d) => new Date(d.date).toDateString() === checkDate.toDateString()
    );
    return specificDate && specificDate.spotsAvailable >= guests;
  }
};

// Method: Calculate price
experienceSchema.methods.calculatePrice = function (guests) {
  let pricePerPerson = this.pricing.pricePerPerson;

  // Apply group discount
  if (
    this.pricing.groupDiscount.minGuests > 0 &&
    guests >= this.pricing.groupDiscount.minGuests
  ) {
    const discount = this.pricing.groupDiscount.discountPercentage / 100;
    pricePerPerson = pricePerPerson * (1 - discount);
  }

  const subtotal = pricePerPerson * guests;
  const serviceFee = Math.round(subtotal * 0.15 * 100) / 100; // 15% service fee
  const total = subtotal + serviceFee;

  return {
    pricePerPerson: Math.round(pricePerPerson * 100) / 100,
    guests,
    subtotal: Math.round(subtotal * 100) / 100,
    serviceFee,
    total: Math.round(total * 100) / 100,
    currency: this.pricing.currency,
    groupDiscountApplied: guests >= this.pricing.groupDiscount.minGuests,
  };
};

const Experience = mongoose.model('Experience', experienceSchema);

module.exports = Experience;
