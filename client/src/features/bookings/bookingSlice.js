import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingService } from '../../services';

// Async thunks
export const fetchMyBookings = createAsyncThunk(
  'bookings/fetchMyBookings',
  async (params, { rejectWithValue }) => {
    try {
      const response = await bookingService.getMyBookings(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const fetchBooking = createAsyncThunk(
  'bookings/fetchBooking',
  async (id, { rejectWithValue }) => {
    try {
      const response = await bookingService.getBooking(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch booking');
    }
  }
);

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await bookingService.createBooking(bookingData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Booking failed');
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await bookingService.cancelBooking(id, reason);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel booking');
    }
  }
);

export const fetchHostBookings = createAsyncThunk(
  'bookings/fetchHostBookings',
  async (params, { rejectWithValue }) => {
    try {
      const response = await bookingService.getHostBookings(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const confirmBooking = createAsyncThunk(
  'bookings/confirmBooking',
  async (id, { rejectWithValue }) => {
    try {
      const response = await bookingService.confirmBooking(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm booking');
    }
  }
);

export const declineBooking = createAsyncThunk(
  'bookings/declineBooking',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await bookingService.declineBooking(id, reason);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to decline booking');
    }
  }
);

const initialState = {
  bookings: [],
  hostBookings: [],
  currentBooking: null,
  pagination: null,
  isLoading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch my bookings
      .addCase(fetchMyBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch single booking
      .addCase(fetchBooking.fulfilled, (state, action) => {
        state.currentBooking = action.payload;
      })
      // Create booking
      .addCase(createBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings.unshift(action.payload);
        state.currentBooking = action.payload;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Cancel booking
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      })
      // Host bookings
      .addCase(fetchHostBookings.fulfilled, (state, action) => {
        state.hostBookings = action.payload.data;
      })
      // Confirm booking
      .addCase(confirmBooking.fulfilled, (state, action) => {
        const index = state.hostBookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.hostBookings[index] = action.payload;
        }
      })
      // Decline booking
      .addCase(declineBooking.fulfilled, (state, action) => {
        const index = state.hostBookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.hostBookings[index] = action.payload;
        }
      });
  },
});

export const { clearError, clearCurrentBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
