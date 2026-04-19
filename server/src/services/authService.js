const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { User, SignupOtp } = require('../models');
const { AppError } = require('../utils');
const emailService = require('./emailService');

class AuthService {
  generateSignupOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  hashOtp(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  async requestSignupOtp({ email, phone, firstName }) {
    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, '');

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    }).select('email phone');

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        throw AppError.conflict('Email already registered');
      }
      if (existingUser.phone === normalizedPhone) {
        throw AppError.conflict('Phone number already registered');
      }
    }

    const otp = this.generateSignupOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await SignupOtp.findOneAndUpdate(
      { email: normalizedEmail, phone: normalizedPhone },
      {
        email: normalizedEmail,
        phone: normalizedPhone,
        otpHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const emailResult = await emailService.sendSignupOtpEmail(
      normalizedEmail,
      firstName,
      otp,
      10
    );

    if (!emailResult?.success && config.nodeEnv === 'production') {
      throw AppError.badRequest('Failed to send OTP. Please try again.');
    }

    return {
      expiresInSeconds: 10 * 60,
      ...(config.nodeEnv !== 'production' ? { otp } : {}),
    };
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.secret, {
      expiresIn: config.jwt.expire,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpire,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    return jwt.verify(token, config.jwt.secret);
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    return jwt.verify(token, config.jwt.refreshSecret);
  }

  /**
   * Register a new user
   */
  async register(userData) {
    // Check if user already exists
    const normalizedEmail = userData.email.toLowerCase();
    const normalizedPanCard = userData.panCardNumber.toUpperCase();
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: userData.phone },
        { aadhaarNumber: userData.aadhaarNumber },
        { panCardNumber: normalizedPanCard },
      ],
    }).select('email phone +aadhaarNumber +panCardNumber');

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        throw AppError.conflict('Email already registered');
      }
      if (existingUser.phone === userData.phone) {
        throw AppError.conflict('Phone number already registered');
      }
      if (existingUser.aadhaarNumber === userData.aadhaarNumber) {
        throw AppError.conflict('Aadhaar number already registered');
      }
      if (existingUser.panCardNumber === normalizedPanCard) {
        throw AppError.conflict('PAN card number already registered');
      }
    }

    // Validate age (must be 18+)
    const birthDate = new Date(userData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      throw AppError.badRequest('You must be at least 18 years old to register');
    }

    const normalizedPhone = userData.phone.replace(/\D/g, '');
    const signupOtp = await SignupOtp.findOne({
      email: normalizedEmail,
      phone: normalizedPhone,
    }).select('+otpHash');

    if (!signupOtp) {
      throw AppError.badRequest('Please request OTP before signing up');
    }

    if (new Date() > signupOtp.expiresAt) {
      await SignupOtp.deleteOne({ _id: signupOtp._id });
      throw AppError.badRequest('OTP expired. Please request a new OTP.');
    }

    if (signupOtp.attempts >= 5) {
      throw AppError.badRequest('Too many invalid OTP attempts. Please request a new OTP.');
    }

    const isOtpValid = this.hashOtp(userData.signupOtp) === signupOtp.otpHash;
    if (!isOtpValid) {
      signupOtp.attempts += 1;
      await signupOtp.save({ validateBeforeSave: false });
      throw AppError.badRequest('Invalid OTP');
    }

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: normalizedPhone,
      aadhaarNumber: userData.aadhaarNumber,
      panCardNumber: normalizedPanCard,
      dateOfBirth: userData.dateOfBirth,
    });

    await SignupOtp.deleteOne({ _id: signupOtp._id });

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Store refresh token
    await this.storeRefreshToken(user._id, refreshToken, userData.userAgent, userData.ip);

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.aadhaarNumber;
    delete userObject.panCardNumber;

    return {
      user: userObject,
      accessToken,
      refreshToken,
      verificationToken, // For sending verification email
    };
  }

  /**
   * Login user
   */
  async login(email, password, userAgent, ip) {
    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.unauthorized('Your account has been deactivated');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Store refresh token
    await this.storeRefreshToken(user._id, refreshToken, userAgent, ip);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    return {
      user: userObject,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId, refreshToken) {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token: refreshToken } },
    });
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    // Verify refresh token
    let decoded;
    try {
      decoded = this.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    // Find user and check if refresh token exists
    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': refreshToken,
      isActive: true,
    });

    if (!user) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Check if token is expired in our records
    const tokenRecord = user.refreshTokens.find((t) => t.token === refreshToken);
    if (tokenRecord && new Date() > tokenRecord.expiresAt) {
      // Remove expired token
      await User.findByIdAndUpdate(user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
      throw AppError.unauthorized('Refresh token expired');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(user._id);

    return { accessToken };
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(userId, token, userAgent, ip) {
    // Parse refresh token expiry
    const decoded = this.verifyRefreshToken(token);
    const expiresAt = new Date(decoded.exp * 1000);

    // Remove old tokens for this device (optional: keep last 5 sessions)
    await User.findByIdAndUpdate(userId, {
      $push: {
        refreshTokens: {
          $each: [{ token, expiresAt, userAgent, ip }],
          $slice: -5, // Keep only last 5 refresh tokens
        },
      },
    });
  }

  /**
   * Forgot password - generate reset token
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link will be sent' };
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    return {
      resetToken, // For sending email
      message: 'Reset token generated',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    // Hash token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw AppError.badRequest('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Invalidate all refresh tokens (force re-login)
    user.refreshTokens = [];

    await user.save();

    return { message: 'Password reset successful' };
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw AppError.badRequest('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return { message: 'Email verified successfully' };
  }

  /**
   * Change password (for logged-in users)
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (!(await user.comparePassword(currentPassword))) {
      throw AppError.unauthorized('Current password is incorrect');
    }

    user.password = newPassword;
    // Keep current session but invalidate others
    await user.save();

    return { message: 'Password changed successfully' };
  }

  /**
   * OAuth login - generate tokens for OAuth user
   */
  async loginOAuth(user, { userAgent, ip }) {
    // Update last login
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Store refresh token
    await this.storeRefreshToken(user._id, refreshToken, userAgent, ip);

    // Return user without sensitive data
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;

    return {
      user: userObject,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Google OAuth authentication with ID token
   */
  async googleAuth(idToken, { userAgent, ip }) {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(config.google.clientId);

    // Verify the Google ID token
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw AppError.unauthorized('Invalid Google token');
    }

    const { sub: googleId, email, given_name, family_name, picture, email_verified } = payload;

    if (!email_verified) {
      throw AppError.unauthorized('Google email not verified');
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { 'oauth.google.id': googleId },
        { email: email.toLowerCase() },
      ],
    });

    if (user) {
      // Update OAuth info if not already linked
      if (!user.oauth?.google?.id) {
        user.oauth = user.oauth || {};
        user.oauth.google = { id: googleId, email };
      }
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user
      user = await User.create({
        email: email.toLowerCase(),
        firstName: given_name || 'User',
        lastName: family_name || '',
        avatar: picture,
        dateOfBirth: new Date('1990-01-01'), // Placeholder - can be updated later
        isEmailVerified: true,
        oauth: {
          google: { id: googleId, email },
        },
        password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
      });
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Store refresh token
    await this.storeRefreshToken(user._id, refreshToken, userAgent, ip);

    // Return user without sensitive data
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;

    return {
      user: userObject,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Apple OAuth authentication with ID token
   */
  async appleAuth({ token, code, appleUser }, { userAgent, ip }) {
    const jwt = require('jsonwebtoken');
    const jwksClient = require('jwks-rsa');

    // Apple's JWKS endpoint
    const client = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 1 day
    });

    // Verify Apple ID token
    let payload;
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        throw new Error('Invalid token');
      }

      const key = await client.getSigningKey(decoded.header.kid);
      const publicKey = key.getPublicKey();

      payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: config.apple?.clientId || 'com.staybnb.app',
      });
    } catch (error) {
      console.error('Apple token verification error:', error);
      throw AppError.unauthorized('Invalid Apple token');
    }

    const { sub: appleId, email } = payload;

    // Apple only provides user name on first sign-in
    let firstName = 'User';
    let lastName = '';
    if (appleUser?.name) {
      firstName = appleUser.name.firstName || 'User';
      lastName = appleUser.name.lastName || '';
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { 'oauth.apple.id': appleId },
        ...(email ? [{ email: email.toLowerCase() }] : []),
      ],
    });

    if (user) {
      // Update OAuth info if not already linked
      if (!user.oauth?.apple?.id) {
        user.oauth = user.oauth || {};
        user.oauth.apple = { id: appleId, email };
      }
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user
      user = await User.create({
        email: email?.toLowerCase() || `${appleId}@privaterelay.appleid.com`,
        firstName,
        lastName,
        dateOfBirth: new Date('1990-01-01'), // Placeholder
        isEmailVerified: true,
        oauth: {
          apple: { id: appleId, email },
        },
        password: crypto.randomBytes(32).toString('hex'),
      });
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Store refresh token
    await this.storeRefreshToken(user._id, refreshToken, userAgent, ip);

    // Return user without sensitive data
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;

    return {
      user: userObject,
      accessToken,
      refreshToken,
    };
  }
}

module.exports = new AuthService();
