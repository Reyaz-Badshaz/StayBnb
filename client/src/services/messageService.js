import api from './api';

export const messageService = {
  // Get all conversations
  getConversations: async (params = {}) => {
    const { data } = await api.get('/conversations', { params });
    return data;
  },

  // Create a conversation
  createConversation: async (conversationData) => {
    const { data } = await api.post('/conversations', conversationData);
    return data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const { data } = await api.get('/conversations/unread-count');
    return data;
  },

  // Search conversations
  searchConversations: async (query, params = {}) => {
    const { data } = await api.get('/conversations/search', { params: { q: query, ...params } });
    return data;
  },

  // Get messages for a conversation
  getMessages: async (conversationId, params = {}) => {
    const { data } = await api.get(`/conversations/${conversationId}/messages`, { params });
    return data;
  },

  // Send a message
  sendMessage: async (conversationId, content, type = 'text', attachments = []) => {
    const { data } = await api.post(`/conversations/${conversationId}/messages`, {
      content,
      type,
      attachments,
    });
    return data;
  },

  // Mark conversation as read
  markAsRead: async (conversationId) => {
    const { data } = await api.put(`/conversations/${conversationId}/read`);
    return data;
  },

  // Archive conversation
  archiveConversation: async (conversationId) => {
    const { data } = await api.put(`/conversations/${conversationId}/archive`);
    return data;
  },

  // Unarchive conversation
  unarchiveConversation: async (conversationId) => {
    const { data } = await api.put(`/conversations/${conversationId}/unarchive`);
    return data;
  },

  // Delete a message
  deleteMessage: async (messageId) => {
    const { data } = await api.delete(`/conversations/messages/${messageId}`);
    return data;
  },
};

export default messageService;
