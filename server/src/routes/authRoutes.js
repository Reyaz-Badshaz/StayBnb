const express = require('express');
const { authController } = require('../controllers');
const { protect } = require('../middleware');
const { passport } = require('../config/passport');
const config = require('../config');
const {
  requestSignupOtpValidation,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require('../validators');

const router = express.Router();

// Public routes
router.post('/request-signup-otp', requestSignupOtpValidation, authController.requestSignupOtp);
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// OAuth Routes - Google (token-based for popup/redirect)
router.post('/google', authController.googleAuth);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.clientUrl}/login?error=oauth_failed` }),
  authController.oauthCallback
);

// OAuth Routes - Apple (token-based for popup/redirect)
router.post('/apple', authController.appleAuth);
router.post('/apple/callback', authController.appleCallback);

// Protected routes
router.use(protect); // All routes below require authentication

router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);
router.put('/change-password', changePasswordValidation, authController.changePassword);
router.get('/me', authController.getMe);

module.exports = router;
