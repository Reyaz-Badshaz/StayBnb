const express = require('express');
const userController = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware');
const { updateProfileValidation } = require('../validators');

const router = express.Router();

// Protected routes
router.get('/me', protect, userController.getMe);
router.put('/me', protect, updateProfileValidation, userController.updateMe);
router.put('/me/avatar', protect, userController.updateAvatar);
router.delete('/me/avatar', protect, userController.deleteAvatar);
router.put('/me/become-host', protect, userController.becomeHost);
router.delete('/me', protect, userController.deactivateAccount);

// Public routes (keep after /me routes so "me" isn't matched as :id)
router.get('/:id', optionalAuth, userController.getUser);

module.exports = router;
