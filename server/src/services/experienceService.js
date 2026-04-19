const Experience = require('../models/Experience');
const ExperienceBooking = require('../models/ExperienceBooking');
const cloudinaryService = require('./cloudinaryService');
const AppError = require('../utils/AppError');

/**
 * Create a new experience
 */
const createExperience = async (hostId, data) => {
  const experience = await Experience.create({
    ...data,
    host: hostId,
    status: 'draft',
  });

  return experience;
};

/**
 * Update an experience
 */
const updateExperience = async (experienceId, hostId, data) => {
  const experience = await Experience.findById(experienceId);

  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  if (experience.host.toString() !== hostId.toString()) {
    throw AppError.forbidden('You can only update your own experiences');
  }

  // Fields that can be updated
  const allowedFields = [
    'title', 'description', 'summary', 'category', 'includes', 'whatToBring',
    'location', 'duration', 'capacity', 'pricing', 'schedule', 'languages',
    'accessibility', 'physicalRequirements', 'cancellationPolicy', 'tags',
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      experience[field] = data[field];
    }
  });

  // If active, don't allow setting back to draft
  if (experience.status === 'active' && data.status === 'draft') {
    throw AppError.badRequest('Cannot set active experience back to draft');
  }

  await experience.save();
  return experience;
};

/**
 * Add images to experience
 */
const addImages = async (experienceId, hostId, files) => {
  const experience = await Experience.findById(experienceId);

  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  if (experience.host.toString() !== hostId.toString()) {
    throw AppError.forbidden('You can only update your own experiences');
  }

  const uploadedImages = [];
  for (const file of files) {
    const result = await cloudinaryService.uploadImage(file, {
      folder: `staybnb/experiences/${experienceId}`,
      transformation: { width: 1200, height: 800, crop: 'fill' },
    });

    uploadedImages.push({
      url: result.secure_url,
      publicId: result.public_id,
      isPrimary: experience.images.length === 0 && uploadedImages.length === 0,
    });
  }

  experience.images.push(...uploadedImages);
  await experience.save();

  return experience.images;
};

/**
 * Delete image from experience
 */
const deleteImage = async (experienceId, hostId, imageId) => {
  const experience = await Experience.findById(experienceId);

  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  if (experience.host.toString() !== hostId.toString()) {
    throw AppError.forbidden('You can only update your own experiences');
  }

  const imageIndex = experience.images.findIndex(
    (img) => img._id.toString() === imageId
  );

  if (imageIndex === -1) {
    throw AppError.notFound('Image not found');
  }

  const image = experience.images[imageIndex];
  if (image.publicId) {
    await cloudinaryService.deleteImage(image.publicId);
  }

  experience.images.splice(imageIndex, 1);
  await experience.save();

  return experience.images;
};

/**
 * Publish experience
 */
const publishExperience = async (experienceId, hostId) => {
  const experience = await Experience.findById(experienceId);

  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  if (experience.host.toString() !== hostId.toString()) {
    throw AppError.forbidden('You can only publish your own experiences');
  }

  // Validation checks
  if (experience.images.length < 3) {
    throw AppError.badRequest('Experience must have at least 3 images');
  }

  if (!experience.description || experience.description.length < 100) {
    throw AppError.badRequest('Experience must have a proper description');
  }

  if (experience.schedule.type === 'recurring' && experience.schedule.recurringDays.length === 0) {
    throw AppError.badRequest('Experience must have scheduled days');
  }

  experience.status = 'pending'; // Goes to admin review
  await experience.save();

  return experience;
};

/**
 * Search experiences
 */
const searchExperiences = async (filters = {}, options = {}) => {
  const {
    location, category, date, guests, minPrice, maxPrice,
    duration, language, accessibility, fitnessLevel,
  } = filters;
  const { page = 1, limit = 20, sort = '-rating.average' } = options;

  const query = { status: 'active' };

  // Location search
  if (location) {
    const locationRegex = new RegExp(location, 'i');
    query.$or = [
      { 'location.city': locationRegex },
      { 'location.country': locationRegex },
    ];
  }

  // Category
  if (category) {
    query.category = category;
  }

  // Date availability
  if (date) {
    const dayOfWeek = new Date(date).getDay();
    query.$or = [
      { 'schedule.recurringDays.dayOfWeek': dayOfWeek },
      {
        'schedule.specificDates': {
          $elemMatch: {
            date: { $gte: new Date(date), $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) },
            spotsAvailable: { $gte: guests || 1 },
          },
        },
      },
    ];
    query['schedule.blockedDates'] = { $ne: new Date(date) };
  }

  // Guest capacity
  if (guests) {
    query['capacity.max'] = { $gte: guests };
    query['capacity.min'] = { $lte: guests };
  }

  // Price range
  if (minPrice) query['pricing.pricePerPerson'] = { $gte: parseFloat(minPrice) };
  if (maxPrice) {
    query['pricing.pricePerPerson'] = {
      ...query['pricing.pricePerPerson'],
      $lte: parseFloat(maxPrice),
    };
  }

  // Duration
  if (duration) {
    query['duration.hours'] = { $lte: parseFloat(duration) };
  }

  // Language
  if (language) {
    query.languages = language;
  }

  // Accessibility
  if (accessibility) {
    query.accessibility = { $in: accessibility.split(',') };
  }

  // Fitness level
  if (fitnessLevel) {
    query['physicalRequirements.fitnessLevel'] = fitnessLevel;
  }

  const [experiences, total] = await Promise.all([
    Experience.find(query)
      .populate('host', 'firstName lastName avatar rating')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Experience.countDocuments(query),
  ]);

  return {
    experiences,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get experience by ID
 */
const getExperience = async (experienceId, userId = null) => {
  const experience = await Experience.findById(experienceId)
    .populate('host', 'firstName lastName avatar bio rating hostStats createdAt');

  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  // Increment views
  experience.stats.views += 1;
  await experience.save();

  // Check if draft/pending and viewer is not host
  if (['draft', 'pending'].includes(experience.status)) {
    if (!userId || experience.host._id.toString() !== userId.toString()) {
      throw AppError.notFound('Experience not found');
    }
  }

  return experience;
};

/**
 * Get host's experiences
 */
const getHostExperiences = async (hostId, status, page = 1, limit = 10) => {
  const query = { host: hostId };
  if (status) query.status = status;

  const [experiences, total] = await Promise.all([
    Experience.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Experience.countDocuments(query),
  ]);

  return {
    experiences,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get available dates for an experience
 */
const getAvailableDates = async (experienceId, startDate, endDate, guests = 1) => {
  const experience = await Experience.findById(experienceId);
  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    const isAvailable = experience.isAvailable(date, guests);

    if (isAvailable) {
      // Get booked spots
      const booked = await ExperienceBooking.getBookedSpots(experienceId, date);
      const spotsLeft = experience.capacity.max - booked.totalGuests;

      if (spotsLeft >= guests) {
        dates.push({
          date: new Date(date),
          dayOfWeek: date.getDay(),
          spotsLeft,
          startTime: experience.schedule.recurringDays.find(
            (d) => d.dayOfWeek === date.getDay()
          )?.startTime,
        });
      }
    }
  }

  return dates;
};

/**
 * Delete experience
 */
const deleteExperience = async (experienceId, hostId) => {
  const experience = await Experience.findById(experienceId);

  if (!experience) {
    throw AppError.notFound('Experience not found');
  }

  if (experience.host.toString() !== hostId.toString()) {
    throw AppError.forbidden('You can only delete your own experiences');
  }

  // Check for active bookings
  const activeBookings = await ExperienceBooking.countDocuments({
    experience: experienceId,
    status: { $in: ['pending', 'confirmed'] },
    'schedule.date': { $gte: new Date() },
  });

  if (activeBookings > 0) {
    throw AppError.badRequest('Cannot delete experience with active bookings');
  }

  // Delete images from Cloudinary
  for (const image of experience.images) {
    if (image.publicId) {
      await cloudinaryService.deleteImage(image.publicId);
    }
  }

  await experience.deleteOne();

  return { deleted: true };
};

/**
 * Get featured experiences
 */
const getFeaturedExperiences = async (limit = 8) => {
  const experiences = await Experience.find({
    status: 'active',
    isFeatured: true,
  })
    .populate('host', 'firstName lastName avatar')
    .sort('-rating.average')
    .limit(limit);

  return experiences;
};

/**
 * Get experiences by category
 */
const getExperiencesByCategory = async (category, limit = 12) => {
  const experiences = await Experience.find({
    status: 'active',
    category,
  })
    .populate('host', 'firstName lastName avatar')
    .sort('-rating.average')
    .limit(limit);

  return experiences;
};

module.exports = {
  createExperience,
  updateExperience,
  addImages,
  deleteImage,
  publishExperience,
  searchExperiences,
  getExperience,
  getHostExperiences,
  getAvailableDates,
  deleteExperience,
  getFeaturedExperiences,
  getExperiencesByCategory,
};
