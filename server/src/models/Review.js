const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema(
  {
    // References
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Review must be linked to a booking'],
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Review must be linked to a property'],
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must have a reviewer'],
    },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must have a reviewee'],
    },

    // Review type
    type: {
      type: String,
      enum: ['guest-to-host', 'host-to-guest'],
      required: [true, 'Review type is required'],
    },

    // Ratings (1-5 scale)
    ratings: {
      overall: {
        type: Number,
        required: [true, 'Overall rating is required'],
        min: [1, 'Rating cannot be less than 1'],
        max: [5, 'Rating cannot be more than 5'],
      },
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      accuracy: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      location: {
        type: Number,
        min: 1,
        max: 5,
      },
      checkIn: {
        type: Number,
        min: 1,
        max: 5,
      },
      value: {
        type: Number,
        min: 1,
        max: 5,
      },
    },

    // Review content
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      minlength: [10, 'Review must be at least 10 characters'],
      maxlength: [5000, 'Review cannot exceed 5000 characters'],
    },

    // Host response
    response: {
      text: {
        type: String,
        maxlength: [2000, 'Response cannot exceed 2000 characters'],
      },
      respondedAt: Date,
    },

    // Moderation
    isPublic: {
      type: Boolean,
      default: true,
    },
    isModerated: {
      type: Boolean,
      default: false,
    },
    moderationNote: String,
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: Date,

    // Helpful votes
    helpfulVotes: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      votedAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reviewSchema.index({ property: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ booking: 1, type: 1 }, { unique: true }); // One review per booking per type

// Virtual for helpful count
reviewSchema.virtual('helpfulCount').get(function () {
  return this.helpfulVotes?.length || 0;
});

// Static: Calculate average ratings for a property
reviewSchema.statics.calculatePropertyRatings = async function (propertyId) {
  const Property = require('./Property');

  const stats = await this.aggregate([
    { $match: { property: propertyId, type: 'guest-to-host', isPublic: true } },
    {
      $group: {
        _id: '$property',
        averageRating: { $avg: '$ratings.overall' },
        ratingCount: { $sum: 1 },
        avgCleanliness: { $avg: '$ratings.cleanliness' },
        avgAccuracy: { $avg: '$ratings.accuracy' },
        avgCommunication: { $avg: '$ratings.communication' },
        avgLocation: { $avg: '$ratings.location' },
        avgCheckIn: { $avg: '$ratings.checkIn' },
        avgValue: { $avg: '$ratings.value' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Property.findByIdAndUpdate(propertyId, {
      'rating.average': Math.round(stats[0].averageRating * 10) / 10,
      'rating.count': stats[0].ratingCount,
      'rating.breakdown': {
        cleanliness: Math.round((stats[0].avgCleanliness || 0) * 10) / 10,
        accuracy: Math.round((stats[0].avgAccuracy || 0) * 10) / 10,
        communication: Math.round((stats[0].avgCommunication || 0) * 10) / 10,
        location: Math.round((stats[0].avgLocation || 0) * 10) / 10,
        checkIn: Math.round((stats[0].avgCheckIn || 0) * 10) / 10,
        value: Math.round((stats[0].avgValue || 0) * 10) / 10,
      },
    });
  } else {
    await Property.findByIdAndUpdate(propertyId, {
      'rating.average': 0,
      'rating.count': 0,
      'rating.breakdown': {},
    });
  }
};

// Static: Calculate average rating for a user (host or guest)
reviewSchema.statics.calculateUserRating = async function (userId, type) {
  const User = require('./User');

  const matchField = type === 'host' ? 'reviewee' : 'reviewer';
  const reviewType = type === 'host' ? 'guest-to-host' : 'host-to-guest';

  const stats = await this.aggregate([
    {
      $match: {
        [matchField]: userId,
        type: reviewType,
        isPublic: true,
      },
    },
    {
      $group: {
        _id: `$${matchField}`,
        averageRating: { $avg: '$ratings.overall' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const updateField =
    type === 'host' ? 'hostStats.rating' : 'guestRating';

  if (stats.length > 0) {
    await User.findByIdAndUpdate(userId, {
      [updateField]: {
        average: Math.round(stats[0].averageRating * 10) / 10,
        count: stats[0].ratingCount,
      },
    });
  }
};

// Hook: Update ratings after save
reviewSchema.post('save', async function () {
  await this.constructor.calculatePropertyRatings(this.property);
  await this.constructor.calculateUserRating(this.reviewee, 'host');
});

// Hook: Update ratings after delete
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.calculatePropertyRatings(doc.property);
    await doc.constructor.calculateUserRating(doc.reviewee, 'host');
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
