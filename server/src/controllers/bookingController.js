const { bookingService, razorpayService } = require('../services');
const { catchAsync, ApiResponse, AppError } = require('../utils');
const config = require('../config');

/**
 * @desc    Create a new booking
 * @route   POST /api/v1/bookings
 * @access  Private
 */
const createBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking(req.user._id, req.body);

  ApiResponse.created(res, booking, 'Booking created. Please complete payment to confirm.');
});

/**
 * @desc    Create Razorpay order for booking
 * @route   POST /api/v1/bookings/:id/create-order
 * @access  Private
 */
const createPaymentOrder = catchAsync(async (req, res) => {
  const result = await bookingService.createPaymentOrder(req.params.id, req.user._id);

  ApiResponse.success(res, result, 'Payment order created');
});

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/v1/bookings/:id/verify-payment
 * @access  Private
 */
const verifyPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw AppError.badRequest('Payment details are required');
  }

  const booking = await bookingService.verifyPayment(req.params.id, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  ApiResponse.success(res, booking, 'Payment verified. Booking is now confirmed!');
});

/**
 * @desc    Get single booking
 * @route   GET /api/v1/bookings/:id
 * @access  Private (Guest or Host)
 */
const getBooking = catchAsync(async (req, res) => {
  const result = await bookingService.getBooking(req.params.id, req.user._id);

  ApiResponse.success(res, result);
});

/**
 * @desc    Get user's bookings (as guest)
 * @route   GET /api/v1/bookings
 * @access  Private
 */
const getMyBookings = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const result = await bookingService.getGuestBookings(
    req.user._id,
    status,
    parseInt(page),
    parseInt(limit)
  );

  ApiResponse.paginated(res, result.bookings, result.pagination);
});

/**
 * @desc    Get host's received bookings
 * @route   GET /api/v1/bookings/host
 * @access  Private (Host)
 */
const getHostBookings = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const result = await bookingService.getHostBookings(
    req.user._id,
    status,
    parseInt(page),
    parseInt(limit)
  );

  ApiResponse.paginated(res, result.bookings, result.pagination);
});

/**
 * @desc    Cancel booking
 * @route   PUT /api/v1/bookings/:id/cancel
 * @access  Private (Guest or Host)
 */
const cancelBooking = catchAsync(async (req, res) => {
  const { reason } = req.body;

  const booking = await bookingService.cancelBooking(req.params.id, req.user._id, reason);

  ApiResponse.success(res, booking, 'Booking cancelled successfully');
});

/**
 * @desc    Host confirms booking (for request-to-book)
 * @route   PUT /api/v1/bookings/:id/confirm
 * @access  Private (Host)
 */
const hostConfirmBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.hostConfirmBooking(req.params.id, req.user._id);

  ApiResponse.success(res, booking, 'Booking confirmed');
});

/**
 * @desc    Host declines booking
 * @route   PUT /api/v1/bookings/:id/decline
 * @access  Private (Host)
 */
const hostDeclineBooking = catchAsync(async (req, res) => {
  const { reason } = req.body;

  const booking = await bookingService.hostDeclineBooking(req.params.id, req.user._id, reason);

  ApiResponse.success(res, booking, 'Booking declined');
});

/**
 * @desc    Get booked dates for a property
 * @route   GET /api/v1/bookings/property/:propertyId/booked-dates
 * @access  Public
 */
const getBookedDates = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw AppError.badRequest('Start date and end date are required');
  }

  const bookedDates = await bookingService.getBookedDates(
    req.params.propertyId,
    startDate,
    endDate
  );

  ApiResponse.success(res, { bookedDates });
});

/**
 * @desc    Razorpay webhook handler
 * @route   POST /api/v1/bookings/webhook
 * @access  Public (but verified by Razorpay signature)
 */
const razorpayWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  const isValid = razorpayService.verifyWebhookSignature(req.body, signature);
  if (!isValid) {
    console.error('Webhook signature verification failed');
    return res.status(400).send('Webhook Error: Invalid signature');
  }

  const event = req.body;

  // Handle the event
  switch (event.event) {
    case 'payment.captured':
      const payment = event.payload.payment.entity;
      console.log('Payment captured:', payment.id);

      // Confirm the booking if payment is from our booking flow
      if (payment.notes?.bookingId) {
        await bookingService.verifyPayment(payment.notes.bookingId, {
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          razorpaySignature: signature,
        });
      }
      break;

    case 'payment.failed':
      const failedPayment = event.payload.payment.entity;
      console.log('Payment failed:', failedPayment.id);
      break;

    case 'refund.processed':
      const refund = event.payload.refund.entity;
      console.log('Refund processed:', refund.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.event}`);
  }

  res.json({ received: true });
});

module.exports = {
  createBooking,
  createPaymentOrder,
  verifyPayment,
  getBooking,
  getMyBookings,
  getHostBookings,
  cancelBooking,
  hostConfirmBooking,
  hostDeclineBooking,
  getBookedDates,
  razorpayWebhook,
};
