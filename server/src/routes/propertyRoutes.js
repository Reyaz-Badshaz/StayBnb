const express = require('express');
const propertyController = require('../controllers/propertyController');
const { protect, optionalAuth, requireHost } = require('../middleware');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, propertyController.getProperties);
router.get('/search-suggestions', propertyController.getSearchSuggestions);
// Keep static host route before "/:id" to avoid ObjectId cast errors
router.get('/my-listings', protect, requireHost, propertyController.getMyListings);
router.get('/:id', optionalAuth, propertyController.getProperty);
router.get('/:id/availability', propertyController.getAvailability);
router.post('/:id/calculate-price', propertyController.calculatePrice);

// Protected routes - require authentication
router.use(protect);

// Property CRUD (host only)
router.post('/', requireHost, propertyController.createProperty);
router.put('/:id', propertyController.updateProperty);
router.delete('/:id', propertyController.deleteProperty);

// Images
router.post('/:id/images', propertyController.uploadImages);
router.delete('/:id/images/:imageId', propertyController.deleteImage);

// Availability & Publishing
router.put('/:id/availability', propertyController.updateAvailability);
router.put('/:id/publish', propertyController.publishProperty);

module.exports = router;
