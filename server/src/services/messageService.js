const { Conversation, Message } = require('../models/Message');
const { User } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Get or create a conversation
 */
const getOrCreateConversation = async (userId, data) => {
  const { recipientId, propertyId, bookingId, type = 'general' } = data;

  if (!recipientId) {
    throw AppError.badRequest('Recipient ID is required');
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw AppError.notFound('Recipient not found');
  }

  // Find or create conversation
  const conversation = await Conversation.findOrCreate(
    [userId, recipientId],
    { property: propertyId, booking: bookingId, type }
  );

  await conversation.populate([
    { path: 'participants', select: 'firstName lastName avatar' },
    { path: 'property', select: 'title images' },
    { path: 'booking', select: 'checkIn checkOut status' },
  ]);

  return conversation;
};

/**
 * Get all conversations for a user
 */
const getConversations = async (userId, options = {}) => {
  const { page = 1, limit = 20, archived = false } = options;

  const query = {
    participants: userId,
    ...(archived
      ? { archivedBy: userId }
      : { archivedBy: { $ne: userId } }),
  };

  const [conversations, total] = await Promise.all([
    Conversation.find(query)
      .populate('participants', 'firstName lastName avatar isOnline lastSeen')
      .populate('property', 'title images')
      .populate('lastMessage.sender', 'firstName lastName')
      .sort({ 'lastMessage.sentAt': -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Conversation.countDocuments(query),
  ]);

  // Add unread count for current user
  const conversationsWithUnread = conversations.map((conv) => ({
    ...conv.toObject(),
    unreadCount: conv.getUnreadCount(userId),
  }));

  return {
    conversations: conversationsWithUnread,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get messages for a conversation
 */
const getMessages = async (conversationId, userId, options = {}) => {
  const { page = 1, limit = 50, before } = options;

  // Check if user is participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    throw AppError.forbidden('Not authorized to view this conversation');
  }

  const query = {
    conversation: conversationId,
    isDeleted: false,
    ...(before && { createdAt: { $lt: before } }),
  };

  const [messages, total] = await Promise.all([
    Message.find(query)
      .populate('sender', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Message.countDocuments(query),
  ]);

  // Mark conversation as read
  await conversation.markAsRead(userId);

  // Mark messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
    },
    {
      $push: { readBy: { user: userId, readAt: new Date() } },
    }
  );

  return {
    messages: messages.reverse(), // Return in chronological order
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};

/**
 * Send a message
 */
const sendMessage = async (conversationId, userId, data) => {
  const { content, type = 'text', attachments = [] } = data;

  // Check if user is participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    throw AppError.forbidden('Not authorized to send messages here');
  }

  // Create message
  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    content,
    type,
    attachments,
    readBy: [{ user: userId, readAt: new Date() }],
  });

  // Update conversation
  await conversation.incrementUnread(userId);

  // Populate sender
  await message.populate('sender', 'firstName lastName avatar');

  return message;
};

/**
 * Mark messages as read
 */
const markMessagesRead = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  // Mark conversation as read
  await conversation.markAsRead(userId);

  // Mark all unread messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
    },
    {
      $push: { readBy: { user: userId, readAt: new Date() } },
    }
  );

  return { success: true };
};

/**
 * Archive a conversation
 */
const archiveConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  if (!conversation.archivedBy.includes(userId)) {
    conversation.archivedBy.push(userId);
    await conversation.save();
  }

  return { success: true };
};

/**
 * Unarchive a conversation
 */
const unarchiveConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  conversation.archivedBy = conversation.archivedBy.filter(
    (id) => id.toString() !== userId.toString()
  );
  await conversation.save();

  return { success: true };
};

/**
 * Delete a message (soft delete)
 */
const deleteMessage = async (messageId, userId) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw AppError.notFound('Message not found');
  }

  if (message.sender.toString() !== userId.toString()) {
    throw AppError.forbidden('Can only delete your own messages');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = 'This message was deleted';
  await message.save();

  return { success: true };
};

/**
 * Get unread message count
 */
const getUnreadCount = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
    archivedBy: { $ne: userId },
  });

  const totalUnread = conversations.reduce((sum, conv) => {
    return sum + conv.getUnreadCount(userId);
  }, 0);

  return { unreadCount: totalUnread };
};

/**
 * Search conversations
 */
const searchConversations = async (userId, searchTerm, options = {}) => {
  const { page = 1, limit = 20 } = options;

  // Search in messages
  const messages = await Message.find({
    content: { $regex: searchTerm, $options: 'i' },
    isDeleted: false,
  })
    .populate('conversation')
    .limit(100);

  // Filter to user's conversations
  const conversationIds = [...new Set(
    messages
      .filter((m) =>
        m.conversation?.participants.some(
          (p) => p.toString() === userId.toString()
        )
      )
      .map((m) => m.conversation._id.toString())
  )];

  const conversations = await Conversation.find({
    _id: { $in: conversationIds },
  })
    .populate('participants', 'firstName lastName avatar')
    .populate('property', 'title')
    .sort({ 'lastMessage.sentAt': -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    conversations,
    pagination: {
      page,
      limit,
      total: conversationIds.length,
      pages: Math.ceil(conversationIds.length / limit),
    },
  };
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markMessagesRead,
  archiveConversation,
  unarchiveConversation,
  deleteMessage,
  getUnreadCount,
  searchConversations,
};
