const ExperienceBooking = require('../models/ExperienceBooking');
const Experience = require('../models/Experience');
const razorpayService = require('./razorpayService');
const AppError = require('../utils/AppError');

/**
 * Create experience booking
 */
const createBooking = async (guestId, data) => {
  const { experienceId, date, startTime, guests, contact, specialRequests } = data;

  // Get experience
  const experience = await Experience.findById(experienceId).populate('host');
  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  if (experience.status !== 'active') {
    throw AppError.badRequest('Experience is not available for booking');
  }

  // Check availability
  if (!experience.isAvailable(date, guests.count)) {
    throw AppError.badRequest('Experience is not available for selected date/guests');
  }

  // Check capacity
  const hasConflict = await ExperienceBooking.hasConflict(experienceId, date, guests.count);
  if (hasConflict) {
    throw AppError.badRequest('Not enough spots available for this date');
  }

  // Cannot book own experience
  if (experience.host._id.toString() === guestId.toString()) {
    throw AppError.badRequest('Cannot book your own experience');
  }

  // Calculate pricing
  const pricing = experience.calculatePrice(guests.count);

  // Create booking
  const booking = await ExperienceBooking.create({
    experience: experienceId,
    guest: guestId,
    host: experience.host._id,
    schedule: {
      date: new Date(date),
      startTime,
      endTime: experience.schedule.recurringDays.find(
        (d) => d.dayOfWeek === new Date(date).getDay()
      )?.endTime,
    },
    guests,
    contact,
    specialRequests,
    pricing,
  });

  await booking.populate([
    { path: 'experience', select: 'title images location duration' },
    { path: 'host', select: 'firstName lastName' },
  ]);

  return booking;
};

/**
 * Create payment intent for booking
 */
const createPaymentOrder = async (bookingId, guestId) => {
  const booking = await ExperienceBooking.findById(bookingId).populate('experience');

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (booking.guest.toString() !== guestId.toString()) {
    throw AppError.forbidden('Not authorized');
  }

  if (booking.payment.status === 'paid') {
    throw AppError.badRequest('Booking is already paid');
  }

  // Create Razorpay order
  const order = await razorpayService.createOrder(
    booking.pricing.total,
    booking.pricing.currency,
    booking._id.toString(),
    {
      bookingId: booking._id.toString(),
      bookingType: 'experience',
      experienceId: booking.experience._id.toString(),
    }
  );

  // Save order ID
  booking.payment.razorpayOrderId = order.id;
  await booking.save();

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  };
};

/**
 * Verify Razorpay payment
 */
const verifyPayment = async (bookingId, paymentData) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
  
  const booking = await ExperienceBooking.findById(bookingId)
    .populate('experience', 'title images host')
    .populate('host', 'firstName lastName email')
    .populate('guest', 'firstName lastName email');

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  // Verify payment signature
  const isValid = razorpayService.verifyPayment(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValid) {
    throw AppError.badRequest('Payment verification failed');
  }

  // Update booking
  booking.payment.status = 'paid';
  booking.payment.razorpayPaymentId = razorpayPaymentId;
  booking.payment.paidAt = new Date();
  booking.status = 'confirmed';
  await booking.save();

  // Update experience stats
  await Experience.findByIdAndUpdate(booking.experience._id, {
    $inc: {
      'stats.bookings': 1,
      'stats.totalGuests': booking.guests.count,
      'stats.revenue': booking.pricing.total,
    },
  });

  return booking;
};

/**
 * Get guest's experience bookings
 */
const getGuestBookings = async (guestId, status, page = 1, limit = 10) => {
  const query = { guest: guestId };
  if (status) query.status = status;

  const [bookings, total] = await Promise.all([
    ExperienceBooking.find(query)
      .populate('experience', 'title images location duration category')
      .populate('host', 'firstName lastName avatar')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    ExperienceBooking.countDocuments(query),
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
 * Get host's experience bookings
 */
const getHostBookings = async (hostId, status, page = 1, limit = 10) => {
  const query = { host: hostId };
  if (status) query.status = status;

  const [bookings, total] = await Promise.all([
    ExperienceBooking.find(query)
      .populate('experience', 'title images')
      .populate('guest', 'firstName lastName avatar email phone')
      .sort('-schedule.date')
      .skip((page - 1) * limit)
      .limit(limit),
    ExperienceBooking.countDocuments(query),
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
 * Get booking details
 */
const getBooking = async (bookingId, userId) => {
  const booking = await ExperienceBooking.findById(bookingId)
    .populate('experience', 'title description images location duration category includes whatToBring')
    .populate('guest', 'firstName lastName avatar email phone')
    .populate('host', 'firstName lastName avatar email phone');

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  // Check authorization
  const isGuest = booking.guest._id.toString() === userId.toString();
  const isHost = booking.host._id.toString() === userId.toString();

  if (!isGuest && !isHost) {
    throw AppError.forbidden('Not authorized to view this booking');
  }

  return booking;
};

/**
 * Cancel booking
 */
const cancelBooking = async (bookingId, userId, reason) => {
  const booking = await ExperienceBooking.findById(bookingId)
    .populate('experience')
    .populate('guest')
    .populate('host');

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  // Check authorization
  const isGuest = booking.guest._id.toString() === userId.toString();
  const isHost = booking.host._id.toString() === userId.toString();

  if (!isGuest && !isHost) {
    throw AppError.forbidden('Not authorized to cancel this booking');
  }

  // Check if can cancel
  if (!booking.canCancel()) {
    throw AppError.badRequest('This booking cannot be cancelled');
  }

  // Calculate refund
  const { refundPercentage, refundAmount } = booking.calculateRefund();

  // Process refund if paid
  if (booking.payment.status === 'paid' && refundAmount > 0) {
    await razorpayService.createRefund(
      booking.payment.razorpayPaymentId,
      refundAmount
    );
    booking.payment.status = refundAmount === booking.pricing.total ? 'refunded' : 'partially_refunded';
    booking.payment.refundedAt = new Date();
  }

  // Update booking
  booking.status = 'cancelled';
  booking.cancellation = {
    cancelledBy: userId,
    cancelledAt: new Date(),
    reason,
    refundAmount,
    refundPercentage,
  };

  await booking.save();

  return booking;
};

/**
 * Complete experience (after it ends)
 */
const completeBooking = async (bookingId) => {
  const booking = await ExperienceBooking.findById(bookingId);

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (booking.status !== 'confirmed') {
    throw AppError.badRequest('Only confirmed bookings can be completed');
  }

  // Check if experience date has passed
  const now = new Date();
  const experienceDate = new Date(booking.schedule.date);
  if (now < experienceDate) {
    throw AppError.badRequest('Experience has not occurred yet');
  }

  booking.status = 'completed';
  await booking.save();

  return booking;
};

/**
 * Mark as no-show
 */
const markNoShow = async (bookingId, hostId) => {
  const booking = await ExperienceBooking.findById(bookingId);

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (booking.host.toString() !== hostId.toString()) {
    throw AppError.forbidden('Only host can mark as no-show');
  }

  booking.status = 'no_show';
  await booking.save();

  return booking;
};

/**
 * Get upcoming experiences for host
 */
const getUpcomingForHost = async (hostId, days = 7) => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const bookings = await ExperienceBooking.find({
    host: hostId,
    status: 'confirmed',
    'schedule.date': {
      $gte: new Date(),
      $lte: endDate,
    },
  })
    .populate('experience', 'title images')
    .populate('guest', 'firstName lastName avatar phone')
    .sort('schedule.date');

  return bookings;
};

module.exports = {
  createBooking,
  createPaymentOrder,
  verifyPayment,
  getGuestBookings,
  getHostBookings,
  getBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
  getUpcomingForHost,
};
