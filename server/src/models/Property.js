const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Property must belong to a host'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
      minlength: [10, 'Title must be at least 10 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Property description is required'],
      minlength: [50, 'Description must be at least 50 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    propertyType: {
      type: String,
      required: [true, 'Property type is required'],
      enum: {
        values: [
          'apartment',
          'house',
          'villa',
          'cabin',
          'cottage',
          'bungalow',
          'townhouse',
          'loft',
          'condo',
          'hotel',
          'hostel',
          'resort',
          'boat',
          'camper',
          'treehouse',
          'tent',
          'castle',
          'cave',
          'dome',
          'farm',
          'barn',
          'other',
        ],
        message: 'Invalid property type',
      },
    },
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      enum: {
        values: ['entire', 'private', 'shared'],
        message: 'Room type must be entire, private, or shared',
      },
    },
    category: {
      type: String,
      enum: [
        'beach',
        'mountain',
        'lake',
        'city',
        'countryside',
        'desert',
        'tropical',
        'arctic',
        'camping',
        'luxury',
        'unique',
        'historical',
        'trending',
      ],
      default: 'city',
    },
    location: {
      address: {
        type: String,
        required: [true, 'Address is required'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        index: true,
      },
      state: String,
      country: {
        type: String,
        required: [true, 'Country is required'],
        index: true,
      },
      zipCode: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
          index: '2dsphere',
        },
      },
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String, // Cloudinary public ID for deletion
        caption: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    amenities: [
      {
        type: String,
        enum: [
          // Essentials
          'wifi',
          'kitchen',
          'washer',
          'dryer',
          'air_conditioning',
          'heating',
          'tv',
          'hair_dryer',
          'iron',
          // Bathroom
          'hot_water',
          'shampoo',
          'shower_gel',
          // Bedroom
          'hangers',
          'bed_linens',
          'extra_pillows',
          'blackout_shades',
          // Safety
          'smoke_alarm',
          'carbon_monoxide_alarm',
          'fire_extinguisher',
          'first_aid_kit',
          'lock_on_bedroom',
          // Outdoor
          'pool',
          'hot_tub',
          'bbq_grill',
          'patio',
          'balcony',
          'garden',
          'beach_access',
          'lake_access',
          // Parking
          'free_parking',
          'paid_parking',
          'garage',
          'ev_charger',
          // Work
          'workspace',
          'desk',
          // Family
          'crib',
          'high_chair',
          'toys',
          // Accessibility
          'elevator',
          'wheelchair_accessible',
          'step_free_access',
          // Entertainment
          'game_console',
          'books',
          'board_games',
          // Pets
          'pets_allowed',
        ],
      },
    ],
    keywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    houseRules: {
      smokingAllowed: { type: Boolean, default: false },
      petsAllowed: { type: Boolean, default: false },
      partiesAllowed: { type: Boolean, default: false },
      checkInTime: { type: String, default: '15:00' },
      checkOutTime: { type: String, default: '11:00' },
      additionalRules: [String],
    },
    capacity: {
      guests: {
        type: Number,
        required: [true, 'Guest capacity is required'],
        min: [1, 'Must accommodate at least 1 guest'],
        max: [50, 'Cannot exceed 50 guests'],
      },
      bedrooms: {
        type: Number,
        required: [true, 'Number of bedrooms is required'],
        min: [0, 'Bedrooms cannot be negative'],
        max: [50, 'Cannot exceed 50 bedrooms'],
      },
      beds: {
        type: Number,
        required: [true, 'Number of beds is required'],
        min: [1, 'Must have at least 1 bed'],
        max: [100, 'Cannot exceed 100 beds'],
      },
      bathrooms: {
        type: Number,
        required: [true, 'Number of bathrooms is required'],
        min: [0, 'Bathrooms cannot be negative'],
        max: [50, 'Cannot exceed 50 bathrooms'],
      },
    },
    pricing: {
      basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [1, 'Price must be at least 1'],
      },
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      },
      cleaningFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      serviceFee: {
        type: Number, // Percentage
        default: 12,
      },
      weekendPrice: {
        type: Number,
        min: 0,
      },
      weeklyDiscount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      monthlyDiscount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    availability: {
      minNights: {
        type: Number,
        default: 1,
        min: 1,
      },
      maxNights: {
        type: Number,
        default: 365,
        max: 365,
      },
      advanceNotice: {
        type: Number, // Days
        default: 1,
      },
      preparationTime: {
        type: Number, // Days between bookings
        default: 0,
      },
      availableFrom: Date,
      availableTo: Date,
    },
    blockedDates: [
      {
        startDate: Date,
        endDate: Date,
        reason: String,
      },
    ],
    instantBook: {
      type: Boolean,
      default: false,
    },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict', 'super_strict'],
      default: 'moderate',
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'inactive', 'suspended'],
      default: 'draft',
      index: true,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
      breakdown: {
        cleanliness: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        communication: { type: Number, default: 0 },
        location: { type: Number, default: 0 },
        checkIn: { type: Number, default: 0 },
        value: { type: Number, default: 0 },
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    bookingCount: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for primary image
propertySchema.virtual('primaryImage').get(function () {
  const primary = this.images?.find((img) => img.isPrimary);
  return primary?.url || this.images?.[0]?.url || null;
});

// Virtual to check if property is bookable
propertySchema.virtual('isBookable').get(function () {
  return this.status === 'active' && this.images?.length > 0;
});

// Indexes for search performance
propertySchema.index({ 'location.coordinates': '2dsphere' });
propertySchema.index({ 'pricing.basePrice': 1 });
propertySchema.index({ 'rating.average': -1 });
propertySchema.index({ createdAt: -1 });
propertySchema.index({ status: 1, 'rating.average': -1 });
propertySchema.index({ keywords: 1 });
propertySchema.index({
  title: 'text',
  description: 'text',
  'location.city': 'text',
  'location.country': 'text',
  keywords: 'text',
});

const keywordStopwords = new Set([
  'the', 'and', 'with', 'for', 'from', 'this', 'that', 'your', 'you',
  'are', 'was', 'were', 'have', 'has', 'had', 'our', 'their', 'its',
  'into', 'onto', 'near', 'very', 'just', 'not', 'too', 'all', 'any',
]);

const extractKeywords = (input) => {
  if (!input) return [];
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !keywordStopwords.has(token));
};

// Pre-save middleware to ensure at least one primary image
propertySchema.pre('save', function () {
  if (this.images?.length > 0) {
    const hasPrimary = this.images.some((img) => img.isPrimary);
    if (!hasPrimary) {
      this.images[0].isPrimary = true;
    }
  }
});

// Pre-save middleware to auto-generate searchable keywords
propertySchema.pre('save', function () {
  const sourceTokens = [
    ...extractKeywords(this.title),
    ...extractKeywords(this.description),
    ...extractKeywords(this.propertyType),
    ...extractKeywords(this.roomType),
    ...extractKeywords(this.category),
    ...extractKeywords(this.location?.city),
    ...extractKeywords(this.location?.state),
    ...extractKeywords(this.location?.country),
    ...extractKeywords((this.amenities || []).join(' ')),
  ];

  const unique = Array.from(new Set(sourceTokens));
  this.keywords = unique.slice(0, 120);
});

// Static method to find active listings
propertySchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, status: 'active' });
};

// Static method for geo search
propertySchema.statics.findNearby = function (coordinates, maxDistance = 50000) {
  // maxDistance in meters (default 50km)
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates,
        },
        $maxDistance: maxDistance,
      },
    },
    status: 'active',
  });
};

// Instance method to check if dates are available
propertySchema.methods.isAvailable = function (checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  for (const blocked of this.blockedDates) {
    const blockStart = new Date(blocked.startDate);
    const blockEnd = new Date(blocked.endDate);

    // Check for overlap
    if (start < blockEnd && end > blockStart) {
      return false;
    }
  }
  return true;
};

// Instance method to calculate total price
propertySchema.methods.calculatePrice = function (checkIn, checkOut, guests) {
  const normalizeInrAmount = (amount, threshold) => {
    if (typeof amount !== 'number') return amount;
    if (amount <= 0) return amount;
    return amount < threshold ? Math.round(amount * 10) : amount;
  };

  const isInr = (this.pricing.currency || 'INR') === 'INR';
  const basePrice = isInr
    ? normalizeInrAmount(this.pricing.basePrice, 1000)
    : this.pricing.basePrice;
  const weekendPrice = isInr
    ? normalizeInrAmount(this.pricing.weekendPrice, 1000)
    : this.pricing.weekendPrice;
  const cleaningFeeAmount = isInr
    ? normalizeInrAmount(this.pricing.cleaningFee || 0, 500)
    : (this.pricing.cleaningFee || 0);

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  let totalNightlyRate = 0;

  // Calculate for each night
  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const dayOfWeek = currentDate.getDay();

    // Weekend pricing (Friday, Saturday)
    if (
      (dayOfWeek === 5 || dayOfWeek === 6) &&
      weekendPrice
    ) {
      totalNightlyRate += weekendPrice;
    } else {
      totalNightlyRate += basePrice;
    }
  }

  // Apply discounts
  let discount = 0;
  if (nights >= 28 && this.pricing.monthlyDiscount) {
    discount = (totalNightlyRate * this.pricing.monthlyDiscount) / 100;
  } else if (nights >= 7 && this.pricing.weeklyDiscount) {
    discount = (totalNightlyRate * this.pricing.weeklyDiscount) / 100;
  }

  const subtotal = totalNightlyRate - discount;
  const cleaningFee = cleaningFeeAmount;
  const serviceFee = (subtotal * (this.pricing.serviceFee || 12)) / 100;
  const total = subtotal + cleaningFee + serviceFee;

  return {
    nights,
    nightlyRate: basePrice,
    totalNightlyRate,
    discount,
    subtotal,
    cleaningFee,
    serviceFee,
    total: Math.round(total * 100) / 100,
    currency: this.pricing.currency,
  };
};

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
