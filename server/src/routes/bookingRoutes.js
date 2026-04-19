const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect, requireHost } = require('../middleware');

const router = express.Router();

// Razorpay webhook (must be before body parser, use raw body)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  bookingController.razorpayWebhook
);

// Public routes
router.get('/property/:propertyId/booked-dates', bookingController.getBookedDates);

// Protected routes
router.use(protect);

// Guest routes
router.post('/', bookingController.createBooking);
router.get('/', bookingController.getMyBookings);
router.get('/host', requireHost, bookingController.getHostBookings);
router.get('/:id', bookingController.getBooking);
router.post('/:id/create-order', bookingController.createPaymentOrder);
router.post('/:id/verify-payment', bookingController.verifyPayment);
router.put('/:id/cancel', bookingController.cancelBooking);
router.put('/:id/checkout', bookingController.checkoutBooking);

// Host routes
router.put('/:id/confirm', requireHost, bookingController.hostConfirmBooking);
router.put('/:id/decline', requireHost, bookingController.hostDeclineBooking);

module.exports = router;
