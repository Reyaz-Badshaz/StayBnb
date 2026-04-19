import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import propertyReducer from './features/properties/propertySlice';
import bookingReducer from './features/bookings/bookingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    properties: propertyReducer,
    bookings: bookingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: import.meta.env.DEV,
});

export default store;
