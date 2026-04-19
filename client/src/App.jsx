import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import store from './store';
import { getCurrentUser } from './features/auth/authSlice';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/common';
import HomePage from './pages/Home';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/Auth';
import { SearchPage } from './pages/Search';
import { PropertyDetailsPage } from './pages/Property';
import { TripsPage, TripDetailsPage, WishlistsPage, AccountPage } from './pages/Dashboard';
import { BookingPage } from './pages/Booking';
import { HostDashboard, NewListingPage } from './pages/Host';
import { ExperiencesPage, ExperienceDetailsPage } from './pages/Experiences';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Auth check wrapper
const AuthProvider = ({ children }) => {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      store.dispatch(getCurrentUser());
    }
  }, []);

  return children;
};

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes with layout */}
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/property/:id" element={<PropertyDetailsPage />} />
                <Route path="/experiences" element={<ExperiencesPage />} />
                <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
                
                {/* Protected routes with layout */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/trips/:id" element={<TripDetailsPage />} />
                  <Route path="/wishlists" element={<WishlistsPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/account/*" element={<AccountPage />} />
                  <Route path="/booking/:id" element={<BookingPage />} />
                  <Route path="/host" element={<HostDashboard />} />
                </Route>
              </Route>

              {/* Host routes (separate layout for new listing wizard) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/host/new-listing" element={<NewListingPage />} />
              </Route>

              {/* Auth routes (no layout) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

              {/* 404 */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-8">Page not found</p>
                    <a href="/" className="bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition">Go home</a>
                  </div>
                </div>
              } />
            </Routes>
          </Router>

          {/* Toast notifications */}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '10px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
