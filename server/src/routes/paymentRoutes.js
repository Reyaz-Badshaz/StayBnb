const express = require('express');
const { razorpayService, bookingService } = require('../services');
const { protect } = require('../middleware');
const { catchAsync, ApiResponse, AppError } = require('../utils');

const router = express.Router();

/**
 * @desc    Get Razorpay key ID for frontend initialization
 * @route   GET /api/v1/payments/razorpay/key
 * @access  Public
 */
router.get('/razorpay/key', (req, res) => {
  ApiResponse.success(res, {
    keyId: razorpayService.getKeyId(),
  });
});

/**
 * @desc    Create a Razorpay order for booking
 * @route   POST /api/v1/payments/razorpay/order
 * @access  Private
 */
router.post('/razorpay/order', protect, catchAsync(async (req, res) => {
  const { amount, currency = 'INR', bookingId, propertyId } = req.body;

  if (!amount || amount <= 0) {
    throw AppError.badRequest('Valid amount is required');
  }

  const order = await razorpayService.createOrder(amount, currency, {
    bookingId,
    propertyId,
    userId: req.user._id.toString(),
  });

  ApiResponse.success(res, order, 'Order created successfully');
}));

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/v1/payments/razorpay/verify
 * @access  Private
 */
router.post('/razorpay/verify', protect, catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw AppError.badRequest('Payment verification details are required');
  }

  // Verify payment signature
  const isValid = razorpayService.verifyPayment(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    throw AppError.badRequest('Invalid payment signature');
  }

  // Get payment details
  const payment = await razorpayService.getPayment(razorpay_payment_id);

  // Confirm booking using the canonical booking service flow
  if (bookingId) {
    await bookingService.verifyPayment(bookingId, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
  }

  ApiResponse.success(res, {
    verified: true,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    payment: {
      amount: payment.amount / 100,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
    },
  }, 'Payment verified successfully');
}));

/**
 * @desc    Get payment details
 * @route   GET /api/v1/payments/razorpay/payment/:paymentId
 * @access  Private
 */
router.get('/razorpay/payment/:paymentId', protect, catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await razorpayService.getPayment(paymentId);
  
  ApiResponse.success(res, {
    id: payment.id,
    amount: payment.amount / 100,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    email: payment.email,
    contact: payment.contact,
    createdAt: new Date(payment.created_at * 1000),
  });
}));

/**
 * @desc    Create refund
 * @route   POST /api/v1/payments/razorpay/refund
 * @access  Private (Admin/Host)
 */
router.post('/razorpay/refund', protect, catchAsync(async (req, res) => {
  const { paymentId, amount, reason = 'requested_by_customer' } = req.body;

  if (!paymentId) {
    throw AppError.badRequest('Payment ID is required');
  }

  const refund = await razorpayService.createRefund(paymentId, amount, { reason });

  ApiResponse.success(res, {
    refundId: refund.id,
    paymentId: refund.payment_id,
    amount: refund.amount / 100,
    currency: refund.currency,
    status: refund.status,
  }, 'Refund initiated successfully');
}));

/**
 * @desc    Razorpay webhook handler
 * @route   POST /api/v1/payments/razorpay/webhook
 * @access  Public (verified by signature)
 */
router.post('/razorpay/webhook', express.raw({ type: 'application/json' }), catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body.toString();

  // Verify webhook signature
  const isValid = razorpayService.verifyWebhookSignature(body, signature);
  if (!isValid) {
    throw AppError.unauthorized('Invalid webhook signature');
  }

  const event = JSON.parse(body);
  const { Booking, Property } = require('../models');

  // Handle different webhook events
  switch (event.event) {
    case 'payment.captured':
      // Payment successful
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      
      // Find and update booking
      const updatedBooking = await Booking.findOneAndUpdate(
        { 'payment.razorpayOrderId': orderId },
        {
          'payment.status': 'succeeded',
          status: 'confirmed',
          'payment.razorpayPaymentId': payment.id,
          'payment.paidAt': new Date(),
          'payment.method': payment.method,
        },
        { new: true }
      );

      if (updatedBooking) {
        await Property.findByIdAndUpdate(updatedBooking.property, {
          $addToSet: {
            blockedDates: {
              startDate: updatedBooking.checkIn,
              endDate: updatedBooking.checkOut,
              reason: `Booking: ${updatedBooking.confirmationCode}`,
            },
          },
          $inc: { bookingCount: 1 },
        });
      }
      break;

    case 'payment.failed':
      // Payment failed
      const failedPayment = event.payload.payment.entity;
      await Booking.findOneAndUpdate(
        { 'payment.razorpayOrderId': failedPayment.order_id },
        {
          'payment.status': 'failed',
        }
      );
      break;

    case 'refund.created':
      // Refund initiated
      const refund = event.payload.refund.entity;
      await Booking.findOneAndUpdate(
        { 'payment.razorpayPaymentId': refund.payment_id },
        {
          $push: {
            'payment.refunds': {
              refundId: refund.id,
              amount: refund.amount / 100,
              status: refund.status,
              createdAt: new Date(),
            },
          },
        }
      );
      break;

    case 'refund.processed':
      // Refund completed
      const processedRefund = event.payload.refund.entity;
      await Booking.findOneAndUpdate(
        { 'payment.refunds.refundId': processedRefund.id },
        {
          'payment.refunds.$.status': 'processed',
          'payment.refunds.$.processedAt': new Date(),
        }
      );
      break;

    default:
      console.log('Unhandled Razorpay webhook event:', event.event);
  }

  // Acknowledge receipt
  res.status(200).json({ received: true });
}));

module.exports = router;
