const express = require('express');
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware');

const router = express.Router();

// All message routes require authentication
router.use(protect);

// Conversation routes
router.get('/', messageController.getConversations);
router.post('/', messageController.createConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/search', messageController.searchConversations);

// Specific conversation routes
router.get('/:id/messages', messageController.getMessages);
router.post('/:id/messages', messageController.sendMessage);
router.put('/:id/read', messageController.markAsRead);
router.put('/:id/archive', messageController.archiveConversation);
router.put('/:id/unarchive', messageController.unarchiveConversation);

// Message routes
router.delete('/messages/:id', messageController.deleteMessage);

module.exports = router;
