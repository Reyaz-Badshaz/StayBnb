import api from './api';

export const propertyService = {
  // Get all properties with filters
  getProperties: async (params = {}) => {
    const response = await api.get('/properties', { params });
    return response.data;
  },

  // Get single property
  getProperty: async (id) => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  // Create property (host only)
  createProperty: async (propertyData) => {
    const response = await api.post('/properties', propertyData);
    return response.data;
  },

  // Update property
  updateProperty: async (id, propertyData) => {
    const response = await api.put(`/properties/${id}`, propertyData);
    return response.data;
  },

  // Delete property
  deleteProperty: async (id) => {
    const response = await api.delete(`/properties/${id}`);
    return response.data;
  },

  // Get property availability
  getAvailability: async (id, params) => {
    const response = await api.get(`/properties/${id}/availability`, { params });
    return response.data;
  },

  // Update availability
  updateAvailability: async (id, availabilityData) => {
    const response = await api.put(`/properties/${id}/availability`, availabilityData);
    return response.data;
  },

  // Upload property images
  uploadImages: async (id, payload) => {
    const response = await api.post(`/properties/${id}/images`, payload);
    return response.data;
  },

  // Get host's properties
  getMyProperties: async () => {
    const response = await api.get('/properties/my-listings');
    return response.data;
  },

  // Get dynamic search suggestions
  getSearchSuggestions: async (limit = 12) => {
    const response = await api.get('/properties/search-suggestions', { params: { limit } });
    return response.data;
  },
};

export default propertyService;
