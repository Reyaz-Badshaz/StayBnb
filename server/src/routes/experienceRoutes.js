const express = require('express');
const experienceController = require('../controllers/experienceController');
const { protect, optionalAuth, requireHost } = require('../middleware');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Search & browse
router.get('/', optionalAuth, experienceController.getExperiences);
router.get('/featured', experienceController.getFeaturedExperiences);
router.get('/category/:category', experienceController.getByCategory);

// Single experience
router.get('/:id', optionalAuth, experienceController.getExperience);
router.get('/:id/availability', experienceController.getAvailability);

// ==================== PROTECTED ROUTES ====================
router.use(protect);

// Guest bookings
router.get('/bookings', experienceController.getMyBookings);
router.post('/:id/book', experienceController.bookExperience);
router.get('/bookings/:id', experienceController.getBooking);
router.post('/bookings/:id/payment-intent', experienceController.createPaymentIntent);
router.post('/bookings/:id/confirm-payment', experienceController.confirmPayment);
router.put('/bookings/:id/cancel', experienceController.cancelBooking);

// ==================== HOST ROUTES ====================
router.use(requireHost);

// Host experience management
router.post('/', experienceController.createExperience);
router.get('/host', experienceController.getHostExperiences);
router.put('/:id', experienceController.updateExperience);
router.delete('/:id', experienceController.deleteExperience);
router.put('/:id/publish', experienceController.publishExperience);
router.post('/:id/images', experienceController.addImages);
router.delete('/:id/images/:imageId', experienceController.deleteImage);

// Host bookings
router.get('/host/bookings', experienceController.getHostBookings);
router.get('/host/upcoming', experienceController.getUpcomingForHost);
router.put('/bookings/:id/no-show', experienceController.markNoShow);

module.exports = router;
