const express = require('express');
const hostController = require('../controllers/hostController');
const { protect, requireHost } = require('../middleware');

const router = express.Router();

// All host routes require authentication and host role
router.use(protect);
router.use(requireHost);

// Dashboard & Analytics
router.get('/dashboard', hostController.getDashboardStats);
router.get('/earnings', hostController.getEarningsReport);
router.get('/performance', hostController.getPerformanceMetrics);
router.get('/activity', hostController.getActivityFeed);

// Listings Management
router.get('/listings', hostController.getHostListings);

// Bookings Management  
router.get('/bookings', hostController.getHostBookings);

// Property-specific routes
router.get('/properties/:propertyId/calendar', hostController.getBookingCalendar);
router.get('/properties/:propertyId/pricing-suggestions', hostController.getPricingSuggestions);
router.put('/properties/:propertyId/availability', hostController.updateAvailability);
router.put('/properties/:propertyId/pricing', hostController.updatePricing);

module.exports = router;
