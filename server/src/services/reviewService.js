const { Review, Booking, Property, User } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Create a review for a completed booking
 */
const createReview = async (userId, data) => {
  const { bookingId, ratings, comment, type } = data;

  // Get the booking
  const booking = await Booking.findById(bookingId)
    .populate('property')
    .populate('guest')
    .populate('host');

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  // Check if booking is completed
  if (booking.status !== 'completed') {
    throw AppError.badRequest('Can only review completed bookings');
  }

  // Check review deadline (14 days after checkout)
  if (booking.reviewDeadline && new Date() > booking.reviewDeadline) {
    throw AppError.badRequest('Review period has expired');
  }

  // Determine reviewer and reviewee
  let reviewer, reviewee, property;

  if (type === 'guest-to-host') {
    // Guest reviewing host/property
    if (booking.guest._id.toString() !== userId.toString()) {
      throw AppError.forbidden('Only the guest can write this review');
    }
    reviewer = booking.guest._id;
    reviewee = booking.host._id;
    property = booking.property._id;
  } else if (type === 'host-to-guest') {
    // Host reviewing guest
    if (booking.host._id.toString() !== userId.toString()) {
      throw AppError.forbidden('Only the host can write this review');
    }
    reviewer = booking.host._id;
    reviewee = booking.guest._id;
    property = booking.property._id;
  } else {
    throw AppError.badRequest('Invalid review type');
  }

  // Check if review already exists
  const existingReview = await Review.findOne({
    booking: bookingId,
    type,
  });

  if (existingReview) {
    throw AppError.badRequest('You have already reviewed this booking');
  }

  // Create the review
  const review = await Review.create({
    booking: bookingId,
    property,
    reviewer,
    reviewee,
    type,
    ratings,
    comment,
  });

  // Populate the review
  await review.populate([
    { path: 'reviewer', select: 'firstName lastName avatar' },
    { path: 'reviewee', select: 'firstName lastName avatar' },
    { path: 'property', select: 'title' },
  ]);

  return review;
};

/**
 * Get reviews for a property
 */
const getPropertyReviews = async (propertyId, options = {}) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = options;

  const query = {
    property: propertyId,
    type: 'guest-to-host',
    isPublic: true,
  };

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('reviewer', 'firstName lastName avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(query),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get reviews for a user (as host or guest)
 */
const getUserReviews = async (userId, type = 'received', options = {}) => {
  const { page = 1, limit = 10 } = options;

  const query = { isPublic: true };

  if (type === 'received') {
    query.reviewee = userId;
  } else if (type === 'given') {
    query.reviewer = userId;
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('property', 'title images')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(query),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Host responds to a review
 */
const respondToReview = async (reviewId, hostId, responseText) => {
  const review = await Review.findById(reviewId).populate('property');

  if (!review) {
    throw AppError.notFound('Review not found');
  }

  // Check if host owns the property
  if (review.property.host.toString() !== hostId.toString()) {
    throw AppError.forbidden('Only the property host can respond');
  }

  // Check if already responded
  if (review.response?.text) {
    throw AppError.badRequest('Already responded to this review');
  }

  review.response = {
    text: responseText,
    respondedAt: new Date(),
  };

  await review.save();

  return review;
};

/**
 * Get review statistics for a property
 */
const getPropertyReviewStats = async (propertyId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        property: propertyId,
        type: 'guest-to-host',
        isPublic: true,
      },
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        avgOverall: { $avg: '$ratings.overall' },
        avgCleanliness: { $avg: '$ratings.cleanliness' },
        avgAccuracy: { $avg: '$ratings.accuracy' },
        avgCommunication: { $avg: '$ratings.communication' },
        avgLocation: { $avg: '$ratings.location' },
        avgCheckIn: { $avg: '$ratings.checkIn' },
        avgValue: { $avg: '$ratings.value' },
        ratingDistribution: {
          $push: '$ratings.overall',
        },
      },
    },
  ]);

  if (!stats.length) {
    return {
      totalReviews: 0,
      averageRating: 0,
      breakdown: {},
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  // Calculate distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  stats[0].ratingDistribution.forEach((rating) => {
    const rounded = Math.round(rating);
    if (distribution[rounded] !== undefined) {
      distribution[rounded]++;
    }
  });

  return {
    totalReviews: stats[0].totalReviews,
    averageRating: Math.round(stats[0].avgOverall * 10) / 10,
    breakdown: {
      cleanliness: Math.round((stats[0].avgCleanliness || 0) * 10) / 10,
      accuracy: Math.round((stats[0].avgAccuracy || 0) * 10) / 10,
      communication: Math.round((stats[0].avgCommunication || 0) * 10) / 10,
      location: Math.round((stats[0].avgLocation || 0) * 10) / 10,
      checkIn: Math.round((stats[0].avgCheckIn || 0) * 10) / 10,
      value: Math.round((stats[0].avgValue || 0) * 10) / 10,
    },
    distribution,
  };
};

/**
 * Mark review as helpful
 */
const markHelpful = async (reviewId, userId) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw AppError.notFound('Review not found');
  }

  // Check if already voted
  const alreadyVoted = review.helpfulVotes.some(
    (v) => v.user.toString() === userId.toString()
  );

  if (alreadyVoted) {
    // Remove vote
    review.helpfulVotes = review.helpfulVotes.filter(
      (v) => v.user.toString() !== userId.toString()
    );
  } else {
    // Add vote
    review.helpfulVotes.push({ user: userId });
  }

  await review.save();

  return {
    isHelpful: !alreadyVoted,
    helpfulCount: review.helpfulVotes.length,
  };
};

/**
 * Get pending reviews for a user
 */
const getPendingReviews = async (userId) => {
  // Find completed bookings without reviews
  const bookingsAsGuest = await Booking.find({
    guest: userId,
    status: 'completed',
    reviewDeadline: { $gte: new Date() },
  })
    .populate('property', 'title images')
    .populate('host', 'firstName lastName avatar');

  const bookingsAsHost = await Booking.find({
    host: userId,
    status: 'completed',
    reviewDeadline: { $gte: new Date() },
  })
    .populate('property', 'title')
    .populate('guest', 'firstName lastName avatar');

  // Filter out already reviewed bookings
  const pendingAsGuest = [];
  for (const booking of bookingsAsGuest) {
    const hasReviewed = await Review.exists({
      booking: booking._id,
      type: 'guest-to-host',
    });
    if (!hasReviewed) {
      pendingAsGuest.push({
        booking,
        type: 'guest-to-host',
        daysLeft: Math.ceil(
          (booking.reviewDeadline - new Date()) / (1000 * 60 * 60 * 24)
        ),
      });
    }
  }

  const pendingAsHost = [];
  for (const booking of bookingsAsHost) {
    const hasReviewed = await Review.exists({
      booking: booking._id,
      type: 'host-to-guest',
    });
    if (!hasReviewed) {
      pendingAsHost.push({
        booking,
        type: 'host-to-guest',
        daysLeft: Math.ceil(
          (booking.reviewDeadline - new Date()) / (1000 * 60 * 60 * 24)
        ),
      });
    }
  }

  return {
    asGuest: pendingAsGuest,
    asHost: pendingAsHost,
  };
};

module.exports = {
  createReview,
  getPropertyReviews,
  getUserReviews,
  respondToReview,
  getPropertyReviewStats,
  markHelpful,
  getPendingReviews,
};
