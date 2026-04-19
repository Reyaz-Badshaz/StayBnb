const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');

let io;

/**
 * Initialize Socket.io server
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id).select('_id firstName lastName avatar');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.firstName} (${userId})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Update user online status
    updateOnlineStatus(userId, true);

    // Join conversation rooms
    socket.on('joinConversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Leave conversation rooms
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        conversationId,
        userId,
        user: socket.user,
        isTyping,
      });
    });

    // Handle message seen
    socket.on('messageSeen', ({ conversationId, messageId }) => {
      socket.to(`conversation:${conversationId}`).emit('messageSeen', {
        conversationId,
        messageId,
        seenBy: userId,
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.firstName}`);
      updateOnlineStatus(userId, false);
    });
  });

  return io;
};

/**
 * Update user online status
 */
const updateOnlineStatus = async (userId, isOnline) => {
  try {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date(),
    });

    // Broadcast status change to relevant users
    io.emit('userStatus', { userId, isOnline, lastSeen: new Date() });
  } catch (error) {
    console.error('Failed to update online status:', error);
  }
};

/**
 * Send notification to specific user
 */
const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Send to conversation participants
 */
const sendToConversation = (conversationId, event, data, excludeUserId = null) => {
  if (io) {
    if (excludeUserId) {
      io.to(`conversation:${conversationId}`).except(`user:${excludeUserId}`).emit(event, data);
    } else {
      io.to(`conversation:${conversationId}`).emit(event, data);
    }
  }
};

/**
 * Emit new message notification
 */
const emitNewMessage = (conversationId, message, recipientIds) => {
  recipientIds.forEach((recipientId) => {
    sendToUser(recipientId, 'newMessage', {
      conversationId,
      message,
    });
  });
};

/**
 * Emit booking notification
 */
const emitBookingUpdate = (userId, booking, type) => {
  sendToUser(userId, 'bookingUpdate', {
    type, // 'new', 'confirmed', 'cancelled', 'completed'
    booking,
  });
};

/**
 * Emit review notification
 */
const emitReviewNotification = (userId, review) => {
  sendToUser(userId, 'newReview', { review });
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Middleware to attach io to request
 */
const attachIO = (req, res, next) => {
  req.io = io;
  next();
};

module.exports = {
  initializeSocket,
  getIO,
  sendToUser,
  sendToConversation,
  emitNewMessage,
  emitBookingUpdate,
  emitReviewNotification,
  attachIO,
};
