const mongoose = require('mongoose');
const { User, Property, Booking, Review } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Get admin dashboard overview
 */
const getDashboardOverview = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalUsers,
    totalHosts,
    newUsersMonth,
    newUsersLastMonth,
    totalProperties,
    activeProperties,
    pendingProperties,
    newPropertiesMonth,
    totalBookings,
    bookingsMonth,
    bookingsLastMonth,
    revenue,
    revenueMonth,
    revenueLastMonth,
    totalReviews,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $in: ['host', 'admin'] } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Property.countDocuments(),
    Property.countDocuments({ status: 'active' }),
    Property.countDocuments({ status: 'pending' }),
    Property.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Booking.countDocuments({ status: { $ne: 'cancelled' } }),
    Booking.countDocuments({ createdAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } }),
    Booking.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: { $ne: 'cancelled' } }),
    Booking.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Booking.aggregate([
      { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Booking.aggregate([
      { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Review.countDocuments({ isPublic: true }),
  ]);

  // Calculate growth percentages
  const userGrowth = newUsersLastMonth > 0
    ? Math.round(((newUsersMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
    : newUsersMonth > 0 ? 100 : 0;

  const bookingGrowth = bookingsLastMonth > 0
    ? Math.round(((bookingsMonth - bookingsLastMonth) / bookingsLastMonth) * 100)
    : bookingsMonth > 0 ? 100 : 0;

  const currentRevenue = revenueMonth[0]?.total || 0;
  const previousRevenue = revenueLastMonth[0]?.total || 0;
  const revenueGrowth = previousRevenue > 0
    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
    : currentRevenue > 0 ? 100 : 0;

  return {
    users: {
      total: totalUsers,
      hosts: totalHosts,
      guests: totalUsers - totalHosts,
      newThisMonth: newUsersMonth,
      growth: userGrowth,
    },
    properties: {
      total: totalProperties,
      active: activeProperties,
      pending: pendingProperties,
      newThisMonth: newPropertiesMonth,
    },
    bookings: {
      total: totalBookings,
      thisMonth: bookingsMonth,
      growth: bookingGrowth,
    },
    revenue: {
      total: revenue[0]?.total || 0,
      thisMonth: currentRevenue,
      growth: revenueGrowth,
    },
    reviews: {
      total: totalReviews,
    },
  };
};

/**
 * Get all users with filters
 */
const getUsers = async (filters = {}, options = {}) => {
  const { role, status, search, verified } = filters;
  const { page = 1, limit = 20, sort = '-createdAt' } = options;

  const query = {};

  if (role) query.role = role;
  if (status === 'active') query.isActive = true;
  if (status === 'suspended') query.isActive = false;
  if (verified === 'true') query['verification.email'] = true;
  if (verified === 'false') query['verification.email'] = false;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshTokens')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user details
 */
const getUserDetails = async (userId) => {
  const user = await User.findById(userId).select('-password -refreshTokens');
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const [properties, bookingsAsGuest, bookingsAsHost, reviewsReceived] = await Promise.all([
    Property.countDocuments({ host: userId }),
    Booking.countDocuments({ guest: userId }),
    Booking.countDocuments({ host: userId }),
    Review.countDocuments({ reviewee: userId, isPublic: true }),
  ]);

  return {
    user,
    stats: {
      properties,
      bookingsAsGuest,
      bookingsAsHost,
      reviewsReceived,
    },
  };
};

/**
 * Update user status (suspend/activate)
 */
const updateUserStatus = async (userId, status, adminId, reason) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (user.role === 'admin' && status === 'suspended') {
    throw AppError.badRequest('Cannot suspend admin users');
  }

  user.isActive = status === 'active';
  if (status === 'suspended') {
    user.suspendedAt = new Date();
    user.suspendedBy = adminId;
    user.suspensionReason = reason;
  } else {
    user.suspendedAt = undefined;
    user.suspendedBy = undefined;
    user.suspensionReason = undefined;
  }

  await user.save();
  return user;
};

/**
 * Update user role
 */
const updateUserRole = async (userId, newRole, adminId) => {
  const validRoles = ['guest', 'host', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw AppError.badRequest('Invalid role');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  user.role = newRole;
  await user.save();
  return user;
};

/**
 * Get all properties with filters
 */
const getProperties = async (filters = {}, options = {}) => {
  const { status, propertyType, search, hostId } = filters;
  const { page = 1, limit = 20, sort = '-createdAt' } = options;

  const query = {};

  if (status) query.status = status;
  if (propertyType) query.propertyType = propertyType;
  if (hostId) query.host = hostId;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { 'location.city': { $regex: search, $options: 'i' } },
      { 'location.country': { $regex: search, $options: 'i' } },
    ];
  }

  const [properties, total] = await Promise.all([
    Property.find(query)
      .populate('host', 'firstName lastName email avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Property.countDocuments(query),
  ]);

  return {
    properties,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Approve/Reject property
 */
const moderateProperty = async (propertyId, action, adminId, reason) => {
  const property = await Property.findById(propertyId);
  if (!property) {
    throw AppError.notFound('Property not found');
  }

  if (action === 'approve') {
    property.status = 'active';
    property.moderatedBy = adminId;
    property.moderatedAt = new Date();
  } else if (action === 'reject') {
    property.status = 'rejected';
    property.moderatedBy = adminId;
    property.moderatedAt = new Date();
    property.rejectionReason = reason;
  } else if (action === 'suspend') {
    property.status = 'suspended';
    property.moderatedBy = adminId;
    property.moderatedAt = new Date();
    property.suspensionReason = reason;
  }

  await property.save();
  return property;
};

/**
 * Get all bookings with filters
 */
const getBookings = async (filters = {}, options = {}) => {
  const { status, startDate, endDate, search } = filters;
  const { page = 1, limit = 20, sort = '-createdAt' } = options;

  const query = {};

  if (status) query.status = status;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('property', 'title images')
      .populate('guest', 'firstName lastName email')
      .populate('host', 'firstName lastName email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all reviews with filters
 */
const getReviews = async (filters = {}, options = {}) => {
  const { type, reported, moderated } = filters;
  const { page = 1, limit = 20, sort = '-createdAt' } = options;

  const query = {};

  if (type) query.type = type;
  if (moderated === 'true') query.isModerated = true;
  if (moderated === 'false') query.isModerated = false;

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('property', 'title')
      .populate('reviewer', 'firstName lastName')
      .populate('reviewee', 'firstName lastName')
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
 * Moderate a review
 */
const moderateReview = async (reviewId, action, adminId, note) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw AppError.notFound('Review not found');
  }

  if (action === 'approve') {
    review.isModerated = true;
    review.isPublic = true;
  } else if (action === 'hide') {
    review.isModerated = true;
    review.isPublic = false;
  } else if (action === 'delete') {
    await review.deleteOne();
    return { deleted: true };
  }

  review.moderatedBy = adminId;
  review.moderatedAt = new Date();
  review.moderationNote = note;

  await review.save();
  return review;
};

/**
 * Get revenue analytics
 */
const getRevenueAnalytics = async (period = 'year') => {
  const now = new Date();
  let startDate, groupBy;

  if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    groupBy = { $month: '$payment.paidAt' };
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    groupBy = { $dayOfMonth: '$payment.paidAt' };
  } else {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    groupBy = { $dayOfWeek: '$payment.paidAt' };
  }

  const [revenueTimeline, topProperties, topHosts] = await Promise.all([
    // Revenue over time
    Booking.aggregate([
      {
        $match: {
          'payment.status': 'paid',
          'payment.paidAt': { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$pricing.total' },
          serviceFees: { $sum: '$pricing.serviceFee' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Top earning properties
    Booking.aggregate([
      {
        $match: {
          'payment.status': 'paid',
          'payment.paidAt': { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$property',
          revenue: { $sum: '$pricing.total' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: '_id',
          as: 'property',
        },
      },
      { $unwind: '$property' },
      {
        $project: {
          propertyId: '$_id',
          title: '$property.title',
          city: '$property.location.city',
          revenue: 1,
          bookings: 1,
        },
      },
    ]),

    // Top hosts by revenue
    Booking.aggregate([
      {
        $match: {
          'payment.status': 'paid',
          'payment.paidAt': { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$host',
          revenue: { $sum: '$pricing.total' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'host',
        },
      },
      { $unwind: '$host' },
      {
        $project: {
          hostId: '$_id',
          name: { $concat: ['$host.firstName', ' ', '$host.lastName'] },
          email: '$host.email',
          revenue: 1,
          bookings: 1,
        },
      },
    ]),
  ]);

  return {
    timeline: revenueTimeline,
    topProperties,
    topHosts,
    period,
  };
};

/**
 * Get platform settings
 */
const getPlatformSettings = async () => {
  // This would typically come from a Settings collection
  return {
    serviceFeePercentage: 12,
    hostPayoutPercentage: 88,
    minBookingAmount: 10,
    maxBookingDays: 365,
    supportEmail: 'support@staybnb.com',
    currencies: ['USD', 'EUR', 'GBP', 'INR'],
    languages: ['en', 'es', 'fr', 'de'],
    propertyTypes: ['apartment', 'house', 'villa', 'cabin', 'cottage', 'hotel', 'unique'],
    amenityCategories: ['basic', 'standout', 'safety', 'accessibility'],
  };
};

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
