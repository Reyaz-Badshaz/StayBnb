require('dotenv').config();

const stripAngleBrackets = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/^<(.+)>$/, '$1').trim();
};

const parseCloudinaryUrl = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return {};

  try {
    const normalized = stripAngleBrackets(cloudinaryUrl);
    const parsed = new URL(normalized);

    return {
      cloudName: stripAngleBrackets(parsed.hostname),
      apiKey: stripAngleBrackets(parsed.username),
      apiSecret: stripAngleBrackets(parsed.password),
    };
  } catch (error) {
    return {};
  }
};

const cloudinaryFromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

module.exports = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,

  // MongoDB
  mongoUri: process.env.MONGODB_URI,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expire: process.env.JWT_EXPIRE || '15m',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
  },

  // Cloudinary
  cloudinary: {
    cloudName: stripAngleBrackets(process.env.CLOUDINARY_CLOUD_NAME) || cloudinaryFromUrl.cloudName,
    apiKey: stripAngleBrackets(process.env.CLOUDINARY_API_KEY) || cloudinaryFromUrl.apiKey,
    apiSecret: stripAngleBrackets(process.env.CLOUDINARY_API_SECRET) || cloudinaryFromUrl.apiSecret,
  },

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  // OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
  },

  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'smtp',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    apiKey: process.env.SENDGRID_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@staybnb.com',
  },

  // Maps
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN,
  },

  // Client
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Cookie
  cookieSecret: process.env.COOKIE_SECRET,
};
