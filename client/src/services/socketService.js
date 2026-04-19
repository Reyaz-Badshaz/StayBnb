import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const normalizedFromApi = API_URL.replace(/\/api\/v1\/?$/, '');
const isVercelHost = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
const SOCKET_URL =
  (isVercelHost ? window.location.origin : '') ||
  import.meta.env.VITE_SOCKET_URL ||
  API_BASE_URL ||
  normalizedFromApi ||
  'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Connect to Socket.io server
   */
  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
    });

    return this.socket;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('joinConversation', conversationId);
    }
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('leaveConversation', conversationId);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId, isTyping) {
    if (this.socket) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  /**
   * Mark message as seen
   */
  markMessageSeen(conversationId, messageId) {
    if (this.socket) {
      this.socket.emit('messageSeen', { conversationId, messageId });
    }
  }

  /**
   * Listen for new messages
   */
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('newMessage', callback);
    }
  }

  /**
   * Listen for typing indicators
   */
  onTyping(callback) {
    if (this.socket) {
      this.socket.on('userTyping', callback);
    }
  }

  /**
   * Listen for messages read
   */
  onMessagesRead(callback) {
    if (this.socket) {
      this.socket.on('messagesRead', callback);
    }
  }

  /**
   * Listen for message seen
   */
  onMessageSeen(callback) {
    if (this.socket) {
      this.socket.on('messageSeen', callback);
    }
  }

  /**
   * Listen for user online status
   */
  onUserStatus(callback) {
    if (this.socket) {
      this.socket.on('userStatus', callback);
    }
  }

  /**
   * Listen for booking updates
   */
  onBookingUpdate(callback) {
    if (this.socket) {
      this.socket.on('bookingUpdate', callback);
    }
  }

  /**
   * Listen for new reviews
   */
  onNewReview(callback) {
    if (this.socket) {
      this.socket.on('newReview', callback);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
