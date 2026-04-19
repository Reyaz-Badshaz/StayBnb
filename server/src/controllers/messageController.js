const { messageService } = require('../services');
const { catchAsync, ApiResponse, AppError } = require('../utils');

/**
 * @desc    Get or create a conversation
 * @route   POST /api/v1/conversations
 * @access  Private
 */
const createConversation = catchAsync(async (req, res) => {
  const conversation = await messageService.getOrCreateConversation(
    req.user._id,
    req.body
  );

  ApiResponse.success(res, conversation);
});

/**
 * @desc    Get all conversations for current user
 * @route   GET /api/v1/conversations
 * @access  Private
 */
const getConversations = catchAsync(async (req, res) => {
  const { page, limit, archived } = req.query;

  const result = await messageService.getConversations(req.user._id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    archived: archived === 'true',
  });

  ApiResponse.paginated(res, result.conversations, result.pagination);
});

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/v1/conversations/:id/messages
 * @access  Private
 */
const getMessages = catchAsync(async (req, res) => {
  const { page, limit, before } = req.query;

  const result = await messageService.getMessages(
    req.params.id,
    req.user._id,
    {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      before,
    }
  );

  ApiResponse.paginated(res, result.messages, result.pagination);
});

/**
 * @desc    Send a message
 * @route   POST /api/v1/conversations/:id/messages
 * @access  Private
 */
const sendMessage = catchAsync(async (req, res) => {
  const { content, type, attachments } = req.body;

  if (!content || content.trim().length === 0) {
    throw AppError.badRequest('Message content is required');
  }

  const message = await messageService.sendMessage(
    req.params.id,
    req.user._id,
    { content, type, attachments }
  );

  // Emit via Socket.io if available
  if (req.io) {
    const conversation = await require('../models/Message').Conversation.findById(
      req.params.id
    );
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user._id.toString()) {
        req.io.to(`user:${participantId}`).emit('newMessage', {
          conversationId: req.params.id,
          message,
        });
      }
    });
  }

  ApiResponse.created(res, message);
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/v1/conversations/:id/read
 * @access  Private
 */
const markAsRead = catchAsync(async (req, res) => {
  await messageService.markMessagesRead(req.params.id, req.user._id);

  // Emit read receipt via Socket.io
  if (req.io) {
    const conversation = await require('../models/Message').Conversation.findById(
      req.params.id
    );
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user._id.toString()) {
        req.io.to(`user:${participantId}`).emit('messagesRead', {
          conversationId: req.params.id,
          readBy: req.user._id,
        });
      }
    });
  }

  ApiResponse.success(res, { success: true });
});

/**
 * @desc    Archive a conversation
 * @route   PUT /api/v1/conversations/:id/archive
 * @access  Private
 */
const archiveConversation = catchAsync(async (req, res) => {
  await messageService.archiveConversation(req.params.id, req.user._id);

  ApiResponse.success(res, { success: true }, 'Conversation archived');
});

/**
 * @desc    Unarchive a conversation
 * @route   PUT /api/v1/conversations/:id/unarchive
 * @access  Private
 */
const unarchiveConversation = catchAsync(async (req, res) => {
  await messageService.unarchiveConversation(req.params.id, req.user._id);

  ApiResponse.success(res, { success: true }, 'Conversation unarchived');
});

/**
 * @desc    Delete a message
 * @route   DELETE /api/v1/messages/:id
 * @access  Private
 */
const deleteMessage = catchAsync(async (req, res) => {
  await messageService.deleteMessage(req.params.id, req.user._id);

  ApiResponse.success(res, { success: true }, 'Message deleted');
});

/**
 * @desc    Get unread count
 * @route   GET /api/v1/conversations/unread-count
 * @access  Private
 */
const getUnreadCount = catchAsync(async (req, res) => {
  const result = await messageService.getUnreadCount(req.user._id);

  ApiResponse.success(res, result);
});

/**
 * @desc    Search conversations
 * @route   GET /api/v1/conversations/search
 * @access  Private
 */
const searchConversations = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;

  if (!q) {
    throw AppError.badRequest('Search query is required');
  }

  const result = await messageService.searchConversations(req.user._id, q, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  ApiResponse.paginated(res, result.conversations, result.pagination);
});

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  archiveConversation,
  unarchiveConversation,
  deleteMessage,
  getUnreadCount,
  searchConversations,
};
