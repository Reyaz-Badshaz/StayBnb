import api from './api';

export const reviewService = {
  // Create a review
  createReview: async (reviewData) => {
    const { data } = await api.post('/reviews', reviewData);
    return data;
  },

  // Get reviews for a property
  getPropertyReviews: async (propertyId, params = {}) => {
    const { data } = await api.get(`/reviews/property/${propertyId}`, { params });
    return data;
  },

  // Get review stats for a property
  getPropertyReviewStats: async (propertyId) => {
    const { data } = await api.get(`/reviews/property/${propertyId}/stats`);
    return data;
  },

  // Get reviews for a user
  getUserReviews: async (userId, type = 'received', params = {}) => {
    const { data } = await api.get(`/reviews/user/${userId}`, { params: { type, ...params } });
    return data;
  },

  // Respond to a review (host only)
  respondToReview: async (reviewId, text) => {
    const { data } = await api.post(`/reviews/${reviewId}/response`, { text });
    return data;
  },

  // Mark review as helpful
  markHelpful: async (reviewId) => {
    const { data } = await api.post(`/reviews/${reviewId}/helpful`);
    return data;
  },

  // Get pending reviews
  getPendingReviews: async () => {
    const { data } = await api.get('/reviews/pending');
    return data;
  },
};

export default reviewService;
