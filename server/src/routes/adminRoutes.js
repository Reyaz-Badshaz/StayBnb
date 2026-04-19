const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardOverview);

// Users Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/role', adminController.updateUserRole);

// Properties Management
router.get('/properties', adminController.getProperties);
router.put('/properties/:id/moderate', adminController.moderateProperty);

// Bookings Management
router.get('/bookings', adminController.getBookings);

// Reviews Management
router.get('/reviews', adminController.getReviews);
router.put('/reviews/:id/moderate', adminController.moderateReview);

// Analytics
router.get('/analytics/revenue', adminController.getRevenueAnalytics);

// Settings
router.get('/settings', adminController.getPlatformSettings);

module.exports = router;
