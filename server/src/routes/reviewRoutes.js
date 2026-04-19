const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, optionalAuth, requireHost } = require('../middleware');

const router = express.Router();

// Public routes
router.get('/property/:propertyId', reviewController.getPropertyReviews);
router.get('/property/:propertyId/stats', reviewController.getPropertyReviewStats);
router.get('/user/:userId', reviewController.getUserReviews);

// Protected routes
router.use(protect);

router.post('/', reviewController.createReview);
router.get('/pending', reviewController.getPendingReviews);
router.post('/:id/helpful', reviewController.markHelpful);
router.post('/:id/response', requireHost, reviewController.respondToReview);

module.exports = router;
