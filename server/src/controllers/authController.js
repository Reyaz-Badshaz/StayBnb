const { authService, emailService } = require('../services');
const { catchAsync, ApiResponse } = require('../utils');
const config = require('../config');

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = catchAsync(async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    phone,
    aadhaarNumber,
    panCardNumber,
  } = req.body;

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    phone,
    aadhaarNumber,
    panCardNumber,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // TODO: Send verification email
  // await emailService.sendVerificationEmail(result.user.email, result.verificationToken);

  ApiResponse.created(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, 'Registration successful. Please verify your email.');
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(
    email,
    password,
    req.get('User-Agent'),
    req.ip
  );

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ApiResponse.success(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, 'Login successful');
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken && req.user) {
    await authService.logout(req.user._id, refreshToken);
  }

  // Clear cookies
  res.cookie('refreshToken', '', {
    ...cookieOptions,
    maxAge: 0,
  });

  ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Logout from all devices
 * @route   POST /api/v1/auth/logout-all
 * @access  Private
 */
const logoutAll = catchAsync(async (req, res) => {
  await authService.logoutAll(req.user._id);

  res.cookie('refreshToken', '', {
    ...cookieOptions,
    maxAge: 0,
  });

  ApiResponse.success(res, null, 'Logged out from all devices');
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (but requires refresh token)
 */
const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    throw require('../utils').AppError.unauthorized('No refresh token provided');
  }

  const result = await authService.refreshAccessToken(token);

  ApiResponse.success(res, {
    accessToken: result.accessToken,
  }, 'Token refreshed');
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const result = await authService.forgotPassword(email);
  let emailSent = false;

  if (result.resetToken) {
    const emailResult = await emailService.sendPasswordResetEmail(
      { firstName: 'there', email },
      result.resetToken
    );
    emailSent = !!emailResult?.success;
  }

  const responseData = null;
  if (config.nodeEnv !== 'production' && result.resetToken) {
    const resetUrl = `${config.clientUrl}/reset-password/${result.resetToken}`;
    ApiResponse.success(
      res,
      { resetUrl, emailSent },
      'If the email exists, a password reset link will be sent.'
    );
    return;
  }

  // Always return same message for security
  ApiResponse.success(res, responseData, 'If the email exists, a password reset link will be sent.');
});

/**
 * @desc    Reset password
 * @route   POST /api/v1/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  await authService.resetPassword(token, password);

  // Clear any existing cookies
  res.cookie('refreshToken', '', {
    ...cookieOptions,
    maxAge: 0,
  });

  ApiResponse.success(res, null, 'Password reset successful. Please login with your new password.');
});

/**
 * @desc    Verify email
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;

  await authService.verifyEmail(token);

  ApiResponse.success(res, null, 'Email verified successfully');
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user._id, currentPassword, newPassword);

  ApiResponse.success(res, null, 'Password changed successfully');
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = catchAsync(async (req, res) => {
  // User is already attached to req by protect middleware
  const user = req.user.toObject();
  delete user.refreshTokens;

  ApiResponse.success(res, user);
});

/**
 * @desc    OAuth callback handler
 * @route   GET /api/v1/auth/google/callback, /api/v1/auth/facebook/callback
 * @access  Public
 */
const oauthCallback = catchAsync(async (req, res) => {
  // User is attached by passport strategy
  const user = req.user;

  // Generate tokens
  const result = await authService.loginOAuth(user, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Redirect to client with access token
  res.redirect(`${config.clientUrl}/oauth/callback?token=${result.accessToken}`);
});

/**
 * @desc    Google OAuth with ID Token (for popup/redirect flow)
 * @route   POST /api/v1/auth/google
 * @access  Public
 */
const googleAuth = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw require('../utils').AppError.badRequest('Google token is required');
  }

  const result = await authService.googleAuth(token, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ApiResponse.success(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, 'Google authentication successful');
});

/**
 * @desc    Apple OAuth with ID Token
 * @route   POST /api/v1/auth/apple
 * @access  Public
 */
const appleAuth = catchAsync(async (req, res) => {
  const { token, code, user: appleUser } = req.body;

  if (!token && !code) {
    throw require('../utils').AppError.badRequest('Apple token or code is required');
  }

  const result = await authService.appleAuth({ token, code, appleUser }, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ApiResponse.success(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, 'Apple authentication successful');
});

/**
 * @desc    Apple OAuth callback (for redirect flow)
 * @route   POST /api/v1/auth/apple/callback
 * @access  Public
 */
const appleCallback = catchAsync(async (req, res) => {
  const { id_token, code, user } = req.body;

  const result = await authService.appleAuth({ 
    token: id_token, 
    code, 
    appleUser: user ? JSON.parse(user) : null 
  }, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Redirect to client with access token
  res.redirect(`${config.clientUrl}/oauth/callback?token=${result.accessToken}`);
});

module.exports = {
  register,
  login,
  logout,
  logoutAll,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
  getMe,
  oauthCallback,
  googleAuth,
  appleAuth,
  appleCallback,
};
