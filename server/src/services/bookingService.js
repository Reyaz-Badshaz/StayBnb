const { Booking, Property, User } = require('../models');
const { AppError } = require('../utils');
const razorpayService = require('./razorpayService');
const notificationService = require('./notificationService');
const emailService = require('./emailService');

class BookingService {
  async reconcileLegacyPaymentStatuses(scope = {}) {
    const query = {
      ...scope,
      status: { $in: ['confirmed', 'completed'] },
      'payment.status': 'pending',
      'payment.razorpayPaymentId': { $exists: true, $ne: null },
    };

    await Booking.updateMany(query, {
      $set: {
        'payment.status': 'succeeded',
        'payment.paidAt': new Date(),
      },
    });
  }

  normalizeLegacyPaymentStatus(booking) {
    if (!booking) return booking;

    const hasCapturedPayment = Boolean(booking?.payment?.razorpayPaymentId);
    const shouldBeSucceeded =
      (booking.status === 'confirmed' || booking.status === 'completed') &&
      booking?.payment?.status === 'pending' &&
      hasCapturedPayment;

    if (shouldBeSucceeded) {
      return {
        ...booking,
        payment: {
          ...(booking.payment || {}),
          status: 'succeeded',
          paidAt: booking?.payment?.paidAt || booking?.updatedAt || booking?.createdAt,
        },
      };
    }

    return booking;
  }

  async notifyBookingEvent(bookingId, eventType) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('property', 'title location')
        .populate('guest', 'firstName lastName email')
        .populate('host', 'firstName lastName email');

      if (!booking) return;

      await notificationService.sendBookingNotifications(booking, eventType);

      if (eventType === 'request') {
        await emailService.sendNewBookingRequest(booking);
      } else if (eventType === 'confirmed') {
        await Promise.all([
          emailService.sendBookingConfirmation(booking),
          notificationService.createNotification(booking.host._id, 'payment_received', {
            bookingId: booking._id,
            propertyId: booking.property._id,
            propertyTitle: booking.property.title,
            amount: booking.pricing.total,
          }),
        ]);
      } else if (eventType === 'cancelled') {
        await emailService.sendBookingCancellation(booking, booking.cancellation?.refundAmount || 0);
      }
    } catch (error) {
      // Notification/email issues should not block booking lifecycle
      console.error('Booking event notification failed:', error.message);
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(guestId, bookingData) {
    const { propertyId, checkIn, checkOut, guests, specialRequests, guestMessage } = bookingData;

    // Get property
    const property = await Property.findById(propertyId).populate('host', 'email');

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.status !== 'active') {
      throw AppError.badRequest('Property is not available for booking');
    }

    // Check if guest is the host
    if (property.host._id.toString() === guestId.toString()) {
      throw AppError.badRequest('You cannot book your own property');
    }

    // Validate guest count
    const totalGuests = (guests?.adults || 1) + (guests?.children || 0);
    if (totalGuests > property.capacity.guests) {
      throw AppError.badRequest(`This property accommodates maximum ${property.capacity.guests} guests`);
    }

    // Check availability
    if (!property.isAvailable(checkIn, checkOut)) {
      throw AppError.badRequest('Property is not available for selected dates');
    }

    // Check for booking conflicts
    const hasConflict = await Booking.hasConflict(propertyId, checkIn, checkOut);
    if (hasConflict) {
      throw AppError.badRequest('Property is already booked for these dates');
    }

    // Validate minimum/maximum nights
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (nights < property.availability.minNights) {
      throw AppError.badRequest(`Minimum stay is ${property.availability.minNights} nights`);
    }
    if (nights > property.availability.maxNights) {
      throw AppError.badRequest(`Maximum stay is ${property.availability.maxNights} nights`);
    }

    // Calculate pricing
    const pricing = property.calculatePrice(checkIn, checkOut, totalGuests);

    // Create booking
    const booking = await Booking.create({
      property: propertyId,
      guest: guestId,
      host: property.host._id,
      checkIn,
      checkOut,
      guests: {
        adults: guests?.adults || 1,
        children: guests?.children || 0,
        infants: guests?.infants || 0,
        pets: guests?.pets || 0,
      },
      pricing: {
        ...pricing,
        hostPayout: pricing.total - pricing.serviceFee,
      },
      specialRequests,
      guestMessage,
      isInstantBook: property.instantBook,
      cancellation: {
        policy: property.cancellationPolicy,
      },
      status: property.instantBook ? 'pending' : 'pending', // Will be confirmed after payment
    });

    await this.notifyBookingEvent(booking._id, 'request');

    return booking;
  }

  /**
   * Create Razorpay order for booking
   */
  async createPaymentOrder(bookingId, guestId) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.guest.toString() !== guestId.toString()) {
      throw AppError.forbidden('You can only pay for your own bookings');
    }

    if (booking.payment.status === 'succeeded') {
      throw AppError.badRequest('This booking is already paid');
    }

    // Create Razorpay order
    const order = await razorpayService.createOrder(
      booking.pricing.total,
      booking.pricing.currency || 'INR',
      {
        bookingId: booking._id.toString(),
        guestId: guestId.toString(),
        propertyId: booking.property.toString(),
        confirmationCode: booking.confirmationCode,
      }
    );

    // Update booking with Razorpay order ID
    booking.payment.razorpayOrderId = order.id;
    booking.payment.status = 'processing';
    await booking.save();

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      booking: {
        id: booking._id,
        confirmationCode: booking.confirmationCode,
        total: booking.pricing.total,
        currency: booking.pricing.currency,
      },
    };
  }

  /**
   * Verify Razorpay payment and confirm booking
   */
  async verifyPayment(bookingId, paymentData) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
    
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    // Verify signature
    const isValid = razorpayService.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      throw AppError.badRequest('Payment verification failed');
    }

    // Update booking status
    booking.payment.status = 'succeeded';
    booking.payment.razorpayPaymentId = razorpayPaymentId;
    booking.payment.paidAt = new Date();
    booking.status = 'confirmed';

    await booking.save();

    // Block dates on property
    await Property.findByIdAndUpdate(booking.property, {
      $push: {
        blockedDates: {
          startDate: booking.checkIn,
          endDate: booking.checkOut,
          reason: `Booking: ${booking.confirmationCode}`,
        },
      },
      $inc: { bookingCount: 1 },
    });

    await this.notifyBookingEvent(booking._id, 'confirmed');

    return booking;
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId, userId) {
    await this.reconcileLegacyPaymentStatuses({ _id: bookingId });

    const booking = await Booking.findById(bookingId)
      .populate('property', 'title images location pricing host')
      .populate('guest', 'firstName lastName avatar email phone')
      .populate('host', 'firstName lastName avatar email phone');

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    // Check if user is guest or host
    const isGuest = booking.guest._id.toString() === userId.toString();
    const isHost = booking.host._id.toString() === userId.toString();

    if (!isGuest && !isHost) {
      throw AppError.forbidden('You do not have access to this booking');
    }

    return { booking: this.normalizeLegacyPaymentStatus(booking.toObject()), isGuest, isHost };
  }

  /**
   * Get user's bookings (as guest)
   */
  async getGuestBookings(guestId, status = null, page = 1, limit = 10) {
    await this.reconcileLegacyPaymentStatuses({ guest: guestId });

    const query = { guest: guestId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('property', 'title images location')
        .populate('host', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    return {
      bookings: bookings.map((booking) => this.normalizeLegacyPaymentStatus(booking)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get host's bookings (received)
   */
  async getHostBookings(hostId, status = null, page = 1, limit = 10) {
    await this.reconcileLegacyPaymentStatuses({ host: hostId });

    const query = { host: hostId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('property', 'title images location')
        .populate('guest', 'firstName lastName avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    return {
      bookings: bookings.map((booking) => this.normalizeLegacyPaymentStatus(booking)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId, userId, reason) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const isGuest = booking.guest.toString() === userId.toString();
    const isHost = booking.host.toString() === userId.toString();

    if (!isGuest && !isHost) {
      throw AppError.forbidden('You cannot cancel this booking');
    }

    const cancelCheck = booking.canCancel();
    if (!cancelCheck.allowed) {
      throw AppError.badRequest(cancelCheck.reason);
    }

    // Calculate refund
    const { refundAmount, refundPercentage } = booking.calculateRefund();

    // Process refund if payment was made
    if (booking.payment.status === 'succeeded' && refundAmount > 0) {
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
      policy: booking.cancellation.policy,
      refundAmount,
      refundPercentage,
    };

    await booking.save();

    // Remove blocked dates from property
    await Property.findByIdAndUpdate(booking.property, {
      $pull: {
        blockedDates: {
          startDate: booking.checkIn,
          endDate: booking.checkOut,
        },
      },
    });

    await this.notifyBookingEvent(booking._id, 'cancelled');

    return booking;
  }

  /**
   * Host confirms booking (for request-to-book)
   */
  async hostConfirmBooking(bookingId, hostId) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only confirm your own bookings');
    }

    if (booking.status !== 'pending') {
      throw AppError.badRequest('Only pending bookings can be confirmed');
    }

    booking.status = 'confirmed';
    booking.hostResponse = {
      message: 'Booking confirmed',
      respondedAt: new Date(),
    };

    await booking.save();

    return booking;
  }

  /**
   * Host declines booking (for request-to-book)
   */
  async hostDeclineBooking(bookingId, hostId, reason) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only decline your own bookings');
    }

    if (booking.status !== 'pending') {
      throw AppError.badRequest('Only pending bookings can be declined');
    }

    // Full refund if payment was made
    if (booking.payment.status === 'succeeded') {
      await razorpayService.createRefund(
        booking.payment.razorpayPaymentId,
        booking.pricing.total // Full refund
      );
      booking.payment.status = 'refunded';
      booking.payment.refundedAt = new Date();
    }

    booking.status = 'declined';
    booking.hostResponse = {
      message: reason || 'Booking declined',
      respondedAt: new Date(),
    };

    await booking.save();

    return booking;
  }

  /**
   * Get booked dates for a property
   */
  async getBookedDates(propertyId, startDate, endDate) {
    return Booking.getBookedDates(propertyId, new Date(startDate), new Date(endDate));
  }

  /**
   * Mark booking as complete (after checkout)
   */
  async completeBooking(bookingId) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.status !== 'confirmed') {
      throw AppError.badRequest('Only confirmed bookings can be completed');
    }

    // Check if checkout date has passed
    if (new Date() < new Date(booking.checkOut)) {
      throw AppError.badRequest('Booking cannot be completed before checkout date');
    }

    booking.status = 'completed';
    await booking.save();

    // TODO: Trigger host payout

    return booking;
  }

  /**
   * Get host's upcoming bookings
   */
  async getHostUpcomingBookings(hostId, page = 1, limit = 10) {
    const now = new Date();
    const query = {
      host: hostId,
      status: 'confirmed',
      checkIn: { $gte: now },
    };

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('property', 'title images location')
        .populate('guest', 'firstName lastName avatar')
        .sort({ checkIn: 1 })
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
  }
}

module.exports = new BookingService();
