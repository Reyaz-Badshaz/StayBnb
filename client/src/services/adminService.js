import api from './api';

export const adminService = {
  // Dashboard
  getDashboardOverview: async () => {
    const { data } = await api.get('/admin/dashboard');
    return data;
  },

  // Users
  getUsers: async (params = {}) => {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },

  getUserDetails: async (userId) => {
    const { data } = await api.get(`/admin/users/${userId}`);
    return data;
  },

  updateUserStatus: async (userId, status, reason) => {
    const { data } = await api.put(`/admin/users/${userId}/status`, { status, reason });
    return data;
  },

  updateUserRole: async (userId, role) => {
    const { data } = await api.put(`/admin/users/${userId}/role`, { role });
    return data;
  },

  // Properties
  getProperties: async (params = {}) => {
    const { data } = await api.get('/admin/properties', { params });
    return data;
  },

  moderateProperty: async (propertyId, action, reason) => {
    const { data } = await api.put(`/admin/properties/${propertyId}/moderate`, { action, reason });
    return data;
  },

  // Bookings
  getBookings: async (params = {}) => {
    const { data } = await api.get('/admin/bookings', { params });
    return data;
  },

  // Reviews
  getReviews: async (params = {}) => {
    const { data } = await api.get('/admin/reviews', { params });
    return data;
  },

  moderateReview: async (reviewId, action, note) => {
    const { data } = await api.put(`/admin/reviews/${reviewId}/moderate`, { action, note });
    return data;
  },

  // Analytics
  getRevenueAnalytics: async (period = 'year') => {
    const { data } = await api.get('/admin/analytics/revenue', { params: { period } });
    return data;
  },

  // Settings
  getPlatformSettings: async () => {
    const { data } = await api.get('/admin/settings');
    return data;
  },
};

export default adminService;
