const { User } = require('../models');
const { catchAsync, ApiResponse, AppError } = require('../utils');

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/users/me
 * @access  Private
 */
const getMe = catchAsync(async (req, res) => {
  const user = req.user.toObject();
  delete user.refreshTokens;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;

  ApiResponse.success(res, user);
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/v1/users/me
 * @access  Private
 */
const updateMe = catchAsync(async (req, res) => {
  // Fields that are allowed to be updated
  const allowedFields = [
    'firstName',
    'lastName',
    'phone',
    'dateOfBirth',
    'bio',
    'work',
    'languages',
    'address',
    'preferences',
  ];

  // Filter out unwanted fields
  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Update user
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  const userObject = user.toObject();
  delete userObject.refreshTokens;

  ApiResponse.success(res, userObject, 'Profile updated successfully');
});

/**
 * @desc    Upload/update avatar
 * @route   PUT /api/v1/users/me/avatar
 * @access  Private
 */
const updateAvatar = catchAsync(async (req, res) => {
  // TODO: Implement Cloudinary upload
  // For now, accept URL directly
  const { avatar } = req.body;

  if (!avatar) {
    throw AppError.badRequest('Please provide an avatar URL');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar },
    { new: true }
  );

  ApiResponse.success(res, { avatar: user.avatar }, 'Avatar updated successfully');
});

/**
 * @desc    Delete avatar
 * @route   DELETE /api/v1/users/me/avatar
 * @access  Private
 */
const deleteAvatar = catchAsync(async (req, res) => {
  // TODO: Delete from Cloudinary

  await User.findByIdAndUpdate(req.user._id, { avatar: null });

  ApiResponse.success(res, null, 'Avatar deleted successfully');
});

/**
 * @desc    Get public user profile
 * @route   GET /api/v1/users/:id
 * @access  Public
 */
const getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'firstName lastName avatar bio work languages createdAt isSuperhost isVerified'
  );

  if (!user) {
    throw AppError.notFound('User not found');
  }

  ApiResponse.success(res, user);
});

/**
 * @desc    Become a host
 * @route   PUT /api/v1/users/me/become-host
 * @access  Private
 */
const becomeHost = catchAsync(async (req, res) => {
  if (req.user.role === 'host' || req.user.role === 'admin') {
    throw AppError.badRequest('You are already a host');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { role: 'host' },
    { new: true }
  );

  const userObject = user.toObject();
  delete userObject.refreshTokens;

  ApiResponse.success(res, userObject, 'You are now a host!');
});

/**
 * @desc    Deactivate account
 * @route   DELETE /api/v1/users/me
 * @access  Private
 */
const deactivateAccount = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    isActive: false,
    refreshTokens: [],
  });

  ApiResponse.success(res, null, 'Account deactivated successfully');
});

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
  deleteAvatar,
  getUser,
  becomeHost,
  deactivateAccount,
};
