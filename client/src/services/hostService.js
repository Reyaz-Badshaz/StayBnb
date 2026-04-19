import api from './api';

export const hostService = {
  // Dashboard
  getDashboardStats: async () => {
    const { data } = await api.get('/host/dashboard');
    return data;
  },

  // Earnings
  getEarningsReport: async (params = {}) => {
    const { data } = await api.get('/host/earnings', { params });
    return data;
  },

  // Performance
  getPerformanceMetrics: async () => {
    const { data } = await api.get('/host/performance');
    return data;
  },

  // Activity Feed
  getActivityFeed: async (limit = 20) => {
    const { data } = await api.get('/host/activity', { params: { limit } });
    return data;
  },

  // Listings
  getHostListings: async (params = {}) => {
    const { data } = await api.get('/host/listings', { params });
    return data;
  },

  // Bookings
  getHostBookings: async (params = {}) => {
    const { data } = await api.get('/host/bookings', { params });
    return data;
  },

  // Calendar
  getBookingCalendar: async (propertyId, year, month) => {
    const { data } = await api.get(`/host/properties/${propertyId}/calendar`, {
      params: { year, month },
    });
    return data;
  },

  // Pricing Suggestions
  getPricingSuggestions: async (propertyId) => {
    const { data } = await api.get(`/host/properties/${propertyId}/pricing-suggestions`);
    return data;
  },

  // Update Availability
  updateAvailability: async (propertyId, availabilityData) => {
    const { data } = await api.put(
      `/host/properties/${propertyId}/availability`,
      availabilityData
    );
    return data;
  },

  // Update Pricing
  updatePricing: async (propertyId, pricingData) => {
    const { data } = await api.put(`/host/properties/${propertyId}/pricing`, pricingData);
    return data;
  },
};

export default hostService;
