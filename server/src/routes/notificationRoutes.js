const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware');

const router = express.Router();

// All notification routes require authentication
router.use(protect);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/preferences', notificationController.updatePreferences);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
