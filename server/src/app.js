const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const config = require('./config');
const { configurePassport, passport } = require('./config/passport');
const { 
  errorHandler, 
  notFound,
  apiLimiter,
  authLimiter,
  sanitizeMongo,
  preventHPP,
  xssSanitizer,
} = require('./middleware');
const { authRoutes, userRoutes, propertyRoutes, bookingRoutes, reviewRoutes, messageRoutes, hostRoutes, adminRoutes, notificationRoutes, experienceRoutes, paymentRoutes } = require('./routes');
const { attachIO } = require('./socket');

// Create Express app
const app = express();

// Initialize Passport
configurePassport();
app.use(passport.initialize());

// Trust proxy (for deployment behind load balancers)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://images.unsplash.com', 'https://*.unsplash.com'],
      connectSrc: ["'self'", 'https://api.razorpay.com'],
      frameSrc: ["'self'", 'https://api.razorpay.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression
app.use(compression());

// Request logging (dev only)
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Cookie parser
app.use(cookieParser(config.cookieSecret));

// Security: Sanitize input (only body - query/params are read-only in Express 5)
app.use(sanitizeMongo);
app.use(preventHPP);
app.use(xssSanitizer);

// Global rate limiting
app.use('/api', apiLimiter);

// Health check endpoint (no rate limit)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to StayBnB API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      properties: '/api/v1/properties',
      bookings: '/api/v1/bookings',
      reviews: '/api/v1/reviews',
      messages: '/api/v1/messages',
      experiences: '/api/v1/experiences',
    },
  });
});

// Mount routes with appropriate rate limiters
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/conversations', attachIO, messageRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/host', hostRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/experiences', experienceRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Handle 404
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
