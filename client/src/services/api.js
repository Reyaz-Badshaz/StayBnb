import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const isVercelHost = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
const API_URL = isVercelHost
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL || (API_BASE_URL ? `${API_BASE_URL}/api/v1` : '/api/v1'));

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip auth endpoints to prevent redirect loops
    const isAuthEndpoint = originalRequest.url.includes('/auth/');
    const isPublicEndpoint = originalRequest.url.includes('/properties') && originalRequest.method === 'get';
    
    // If 401 and not already retrying and not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // Check if we have a token to refresh
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // No token, just reject without redirecting for public endpoints
        if (isPublicEndpoint) {
          return Promise.reject(error);
        }
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
          withCredentials: true,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens but don't redirect for public pages
        localStorage.removeItem('accessToken');
        
        // Only redirect to login for protected routes
        if (!isPublicEndpoint && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          // Don't auto-redirect, let the app handle it
          console.log('Session expired. Please login again.');
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
