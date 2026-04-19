import api from './api';

export const bookingService = {
  // Create booking
  createBooking: async (bookingData) => {
    // Map frontend field names to backend field names
    const payload = {
      propertyId: bookingData.property || bookingData.propertyId,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      guests: typeof bookingData.guests === 'number' 
        ? { adults: bookingData.guests } 
        : bookingData.guests,
      specialRequests: bookingData.specialRequests,
    };
    const response = await api.post('/bookings', payload);
    return response.data;
  },

  // Get user's bookings (as guest)
  getMyBookings: async (params = {}) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  // Get single booking
  getBooking: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  // Cancel booking
  cancelBooking: async (id, reason) => {
    const response = await api.put(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },

  // Complete checkout (guest)
  checkoutBooking: async (id) => {
    const response = await api.put(`/bookings/${id}/checkout`);
    return response.data;
  },

  // Get host's bookings (received)
  getHostBookings: async (params = {}) => {
    const response = await api.get('/bookings/host', { params });
    return response.data;
  },

  // Confirm booking (host)
  confirmBooking: async (id) => {
    const response = await api.put(`/bookings/${id}/confirm`);
    return response.data;
  },

  // Decline booking (host)
  declineBooking: async (id, reason) => {
    const response = await api.put(`/bookings/${id}/decline`, { reason });
    return response.data;
  },

  // Calculate price
  calculatePrice: async (propertyId, checkIn, checkOut, guests) => {
    const response = await api.post('/bookings/calculate-price', {
      propertyId,
      checkIn,
      checkOut,
      guests,
    });
    return response.data;
  },
};

export default bookingService;
