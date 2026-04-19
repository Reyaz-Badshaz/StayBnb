const mongoose = require('mongoose');
const { Property, Booking, Review, User } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Get host dashboard overview statistics
 */
const getDashboardStats = async (hostId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get properties
  const properties = await Property.find({ host: hostId }).select('_id');
  const propertyIds = properties.map((p) => p._id);

  // Parallel aggregations
  const [
    totalListings,
    activeListings,
    totalBookings,
    monthlyBookings,
    lastMonthBookings,
    totalEarnings,
    monthlyEarnings,
    lastMonthEarnings,
    pendingBookings,
    upcomingCheckIns,
    reviewStats,
  ] = await Promise.all([
    // Total listings
    Property.countDocuments({ host: hostId }),

    // Active listings
    Property.countDocuments({ host: hostId, status: 'active' }),

    // Total bookings (all time)
    Booking.countDocuments({ host: hostId, status: { $ne: 'cancelled' } }),

    // This month's bookings
    Booking.countDocuments({
      host: hostId,
      createdAt: { $gte: startOfMonth },
      status: { $ne: 'cancelled' },
    }),

    // Last month's bookings
    Booking.countDocuments({
      host: hostId,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      status: { $ne: 'cancelled' },
    }),

    // Total earnings (all time)
    Booking.aggregate([
      {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          'payment.status': { $in: ['succeeded', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: ['$pricing.total', { $add: ['$pricing.serviceFee', '$pricing.taxes'] }],
            },
          },
        },
      },
    ]),

    // Monthly earnings
    Booking.aggregate([
      {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          'payment.status': { $in: ['succeeded', 'paid'] },
          'payment.paidAt': { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: ['$pricing.total', { $add: ['$pricing.serviceFee', '$pricing.taxes'] }],
            },
          },
        },
      },
    ]),

    // Last month's earnings
    Booking.aggregate([
      {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          'payment.status': { $in: ['succeeded', 'paid'] },
          'payment.paidAt': { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: ['$pricing.total', { $add: ['$pricing.serviceFee', '$pricing.taxes'] }],
            },
          },
        },
      },
    ]),

    // Pending bookings (awaiting confirmation)
    Booking.countDocuments({
      host: hostId,
      status: 'pending',
    }),

    // Upcoming check-ins (next 7 days)
    Booking.find({
      host: hostId,
      status: 'confirmed',
      checkIn: {
        $gte: now,
        $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    })
      .populate('property', 'title images')
      .populate('guest', 'firstName lastName avatar')
      .sort('checkIn')
      .limit(5),

    // Review stats
    Review.aggregate([
      {
        $match: {
          property: { $in: propertyIds },
          type: 'guest-to-host',
          isPublic: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$ratings.overall' },
          totalReviews: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Calculate growth percentages
  const bookingGrowth =
    lastMonthBookings > 0
      ? Math.round(((monthlyBookings - lastMonthBookings) / lastMonthBookings) * 100)
      : monthlyBookings > 0
      ? 100
      : 0;

  const currentMonthEarnings = monthlyEarnings[0]?.total || 0;
  const previousMonthEarnings = lastMonthEarnings[0]?.total || 0;
  const earningsGrowth =
    previousMonthEarnings > 0
      ? Math.round(((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100)
      : currentMonthEarnings > 0
      ? 100
      : 0;

  return {
    overview: {
      totalListings,
      activeListings,
      totalBookings,
      pendingBookings,
      totalEarnings: totalEarnings[0]?.total || 0,
      averageRating: Math.round((reviewStats[0]?.averageRating || 0) * 10) / 10,
      totalReviews: reviewStats[0]?.totalReviews || 0,
    },
    monthly: {
      bookings: monthlyBookings,
      bookingGrowth,
      earnings: currentMonthEarnings,
      earningsGrowth,
    },
    upcomingCheckIns,
  };
};

/**
 * Get earnings report with breakdown
 */
const getEarningsReport = async (hostId, options = {}) => {
  const { period = 'month', year, month } = options;

  let startDate, endDate;
  const now = new Date();

  if (period === 'year') {
    const targetYear = year || now.getFullYear();
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59);
  } else {
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth();
    startDate = new Date(targetYear, targetMonth, 1);
    endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
  }

  // Get earnings by property
  const earningsByProperty = await Booking.aggregate([
    {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          'payment.status': { $in: ['succeeded', 'paid'] },
          'payment.paidAt': { $gte: startDate, $lte: endDate },
        },
    },
    {
      $group: {
        _id: '$property',
        bookings: { $sum: 1 },
        nights: { $sum: '$pricing.nights' },
        grossEarnings: { $sum: '$pricing.total' },
        serviceFees: { $sum: '$pricing.serviceFee' },
        taxes: { $sum: '$pricing.taxes' },
        cleaningFees: { $sum: '$pricing.cleaningFee' },
      },
    },
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
        propertyTitle: '$property.title',
        propertyImage: { $arrayElemAt: ['$property.images.url', 0] },
        bookings: 1,
        nights: 1,
        grossEarnings: 1,
        netEarnings: { $subtract: ['$grossEarnings', { $add: ['$serviceFees', '$taxes'] }] },
        cleaningFees: 1,
      },
    },
    { $sort: { netEarnings: -1 } },
  ]);

  // Get daily/monthly breakdown
  const groupBy = period === 'year' ? { $month: '$payment.paidAt' } : { $dayOfMonth: '$payment.paidAt' };

  const earningsTimeline = await Booking.aggregate([
    {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          'payment.status': { $in: ['succeeded', 'paid'] },
          'payment.paidAt': { $gte: startDate, $lte: endDate },
        },
    },
    {
      $group: {
        _id: groupBy,
        earnings: {
          $sum: { $subtract: ['$pricing.total', { $add: ['$pricing.serviceFee', '$pricing.taxes'] }] },
        },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Calculate totals
  const totals = earningsByProperty.reduce(
    (acc, prop) => ({
      bookings: acc.bookings + prop.bookings,
      nights: acc.nights + prop.nights,
      grossEarnings: acc.grossEarnings + prop.grossEarnings,
      netEarnings: acc.netEarnings + prop.netEarnings,
      cleaningFees: acc.cleaningFees + prop.cleaningFees,
    }),
    { bookings: 0, nights: 0, grossEarnings: 0, netEarnings: 0, cleaningFees: 0 }
  );

  return {
    period: { start: startDate, end: endDate, type: period },
    totals,
    byProperty: earningsByProperty,
    timeline: earningsTimeline,
  };
};

/**
 * Get booking calendar for a property
 */
const getBookingCalendar = async (hostId, propertyId, year, month) => {
  // Verify ownership
  const property = await Property.findOne({ _id: propertyId, host: hostId });
  if (!property) {
    throw AppError.notFound('Property not found or not owned by you');
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const bookings = await Booking.find({
    property: propertyId,
    status: { $in: ['confirmed', 'completed'] },
    $or: [
      { checkIn: { $gte: startDate, $lte: endDate } },
      { checkOut: { $gte: startDate, $lte: endDate } },
      { checkIn: { $lte: startDate }, checkOut: { $gte: endDate } },
    ],
  })
    .populate('guest', 'firstName lastName avatar')
    .select('checkIn checkOut guest pricing status confirmationCode');

  // Create calendar data
  const calendar = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayBookings = bookings.filter((b) => {
      return date >= new Date(b.checkIn) && date <= new Date(b.checkOut);
    });

    calendar.push({
      date,
      day,
      isBlocked: property.availability.blockedDates.some(
        (d) => new Date(d).toDateString() === date.toDateString()
      ),
      bookings: dayBookings.map((b) => ({
        id: b._id,
        guest: b.guest,
        isCheckIn: new Date(b.checkIn).toDateString() === date.toDateString(),
        isCheckOut: new Date(b.checkOut).toDateString() === date.toDateString(),
        confirmationCode: b.confirmationCode,
      })),
    });
  }

  return {
    property: { id: property._id, title: property.title },
    year,
    month,
    calendar,
    bookings,
  };
};

/**
 * Get host performance metrics
 */
const getPerformanceMetrics = async (hostId) => {
  const properties = await Property.find({ host: hostId }).select('_id');
  const propertyIds = properties.map((p) => p._id);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [responseRate, acceptanceRate, cancellationRate, avgResponseTime] = await Promise.all([
    // Response rate (bookings responded to within 24h)
    Booking.aggregate([
      {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          responded: {
            $sum: {
              $cond: [{ $ne: ['$status', 'pending'] }, 1, 0],
            },
          },
        },
      },
    ]),

    // Acceptance rate
    Booking.aggregate([
      {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          createdAt: { $gte: thirtyDaysAgo },
          status: { $ne: 'pending' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          accepted: {
            $sum: {
              $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, 1, 0],
            },
          },
        },
      },
    ]),

    // Cancellation rate (host-initiated)
    Booking.aggregate([
      {
        $match: {
          host: mongoose.Types.ObjectId.createFromHexString(hostId.toString()),
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cancelled: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'cancelled'] },
                    { $eq: ['$cancellation.cancelledBy', mongoose.Types.ObjectId.createFromHexString(hostId.toString())] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // Average response time (placeholder - would need message tracking)
    Promise.resolve({ avgHours: 2 }),
  ]);

  // Check Superhost eligibility
  const reviewStats = await Review.aggregate([
    {
      $match: {
        property: { $in: propertyIds },
        type: 'guest-to-host',
        isPublic: true,
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$ratings.overall' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const totalBookingsYear = await Booking.countDocuments({
    host: hostId,
    status: { $in: ['confirmed', 'completed'] },
    createdAt: { $gte: new Date(now.getFullYear(), 0, 1) },
  });

  const responseRateVal = responseRate[0]
    ? Math.round((responseRate[0].responded / responseRate[0].total) * 100)
    : 100;
  const acceptanceRateVal = acceptanceRate[0]
    ? Math.round((acceptanceRate[0].accepted / acceptanceRate[0].total) * 100)
    : 100;
  const cancellationRateVal = cancellationRate[0]
    ? Math.round((cancellationRate[0].cancelled / cancellationRate[0].total) * 100)
    : 0;

  // Superhost criteria
  const isSuperhost =
    (reviewStats[0]?.avgRating || 0) >= 4.8 &&
    totalBookingsYear >= 10 &&
    responseRateVal >= 90 &&
    cancellationRateVal < 1;

  return {
    metrics: {
      responseRate: responseRateVal,
      acceptanceRate: acceptanceRateVal,
      cancellationRate: cancellationRateVal,
      avgResponseTime: avgResponseTime.avgHours,
    },
    superhost: {
      isEligible: isSuperhost,
      criteria: {
        rating: { value: reviewStats[0]?.avgRating || 0, required: 4.8 },
        bookings: { value: totalBookingsYear, required: 10 },
        responseRate: { value: responseRateVal, required: 90 },
        cancellationRate: { value: cancellationRateVal, required: 1, isMax: true },
      },
    },
    reviews: {
      average: Math.round((reviewStats[0]?.avgRating || 0) * 10) / 10,
      total: reviewStats[0]?.totalReviews || 0,
    },
  };
};

/**
 * Get recent activity feed
 */
const getActivityFeed = async (hostId, options = {}) => {
  const { limit = 20 } = options;

  // Get recent bookings, reviews, and messages
  const [recentBookings, recentReviews] = await Promise.all([
    Booking.find({ host: hostId })
      .populate('property', 'title')
      .populate('guest', 'firstName lastName avatar')
      .sort('-createdAt')
      .limit(limit),
    Review.find({
      reviewee: hostId,
      type: 'guest-to-host',
    })
      .populate('property', 'title')
      .populate('reviewer', 'firstName lastName avatar')
      .sort('-createdAt')
      .limit(limit),
  ]);

  // Merge and sort activities
  const activities = [
    ...recentBookings.map((b) => ({
      type: 'booking',
      id: b._id,
      action: b.status,
      property: b.property,
      user: b.guest,
      amount: b.pricing.total,
      createdAt: b.createdAt,
    })),
    ...recentReviews.map((r) => ({
      type: 'review',
      id: r._id,
      rating: r.ratings.overall,
      property: r.property,
      user: r.reviewer,
      comment: r.comment.substring(0, 100) + (r.comment.length > 100 ? '...' : ''),
      createdAt: r.createdAt,
    })),
  ];

  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return activities.slice(0, limit);
};

/**
 * Get smart pricing suggestions
 */
const getPricingSuggestions = async (hostId, propertyId) => {
  const property = await Property.findOne({ _id: propertyId, host: hostId });
  if (!property) {
    throw AppError.notFound('Property not found');
  }

  // Get average price of similar properties in the area
  const similarProperties = await Property.aggregate([
    {
      $geoNear: {
        near: property.location.coordinates,
        distanceField: 'distance',
        maxDistance: 5000, // 5km
        query: {
          _id: { $ne: property._id },
          propertyType: property.propertyType,
          status: 'active',
        },
        spherical: true,
      },
    },
    {
      $group: {
        _id: null,
        avgBasePrice: { $avg: '$pricing.basePrice' },
        avgWeekendPrice: { $avg: '$pricing.weekendPrice' },
        minPrice: { $min: '$pricing.basePrice' },
        maxPrice: { $max: '$pricing.basePrice' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Get booking history for demand analysis
  const now = new Date();
  const bookingDemand = await Booking.aggregate([
    {
      $match: {
        property: property._id,
        status: { $in: ['confirmed', 'completed'] },
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) },
      },
    },
    {
      $group: {
        _id: { $month: '$checkIn' },
        bookings: { $sum: 1 },
        avgNightlyRate: { $avg: { $divide: ['$pricing.subtotal', '$pricing.nights'] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const marketData = similarProperties[0] || { avgBasePrice: property.pricing.basePrice };

  return {
    currentPricing: property.pricing,
    marketComparison: {
      averageArea: Math.round(marketData.avgBasePrice || property.pricing.basePrice),
      minArea: marketData.minPrice,
      maxArea: marketData.maxPrice,
      competitorCount: marketData.count || 0,
    },
    suggestions: {
      basePrice: {
        current: property.pricing.basePrice,
        suggested: Math.round(marketData.avgBasePrice * 1.05) || property.pricing.basePrice,
        reasoning:
          property.pricing.basePrice < marketData.avgBasePrice
            ? 'Your price is below market average'
            : 'Your price is competitive',
      },
      weekendPrice: {
        current: property.pricing.weekendPrice,
        suggested: Math.round((marketData.avgWeekendPrice || property.pricing.basePrice) * 1.2),
        reasoning: 'Weekend demand typically increases by 20%',
      },
    },
    demandTrend: bookingDemand,
  };
};

module.exports = {
  getDashboardStats,
  getEarningsReport,
  getBookingCalendar,
  getPerformanceMetrics,
  getActivityFeed,
  getPricingSuggestions,
};
