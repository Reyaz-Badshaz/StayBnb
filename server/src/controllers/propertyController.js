const { propertyService, cloudinaryService } = require('../services');
const { catchAsync, ApiResponse, AppError } = require('../utils');

/**
 * @desc    Get all properties with filters
 * @route   GET /api/v1/properties
 * @access  Public
 */
const getProperties = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    location,
    lat,
    lng,
    radius,
    checkIn,
    checkOut,
    guests,
    minPrice,
    maxPrice,
    propertyType,
    roomType,
    category,
    bedrooms,
    bathrooms,
    amenities,
    instantBook,
    superhost,
    sortBy,
  } = req.query;

  const filters = {
    location,
    lat,
    lng,
    radius,
    checkIn,
    checkOut,
    guests,
    minPrice,
    maxPrice,
    propertyType,
    roomType,
    category,
    bedrooms,
    bathrooms,
    amenities,
    instantBook,
    superhost,
    sortBy,
  };

  const result = await propertyService.getProperties(
    filters,
    parseInt(page),
    parseInt(limit)
  );

  ApiResponse.paginated(res, result.properties, result.pagination);
});

/**
 * @desc    Get search suggestions from live listings
 * @route   GET /api/v1/properties/search-suggestions
 * @access  Public
 */
const getSearchSuggestions = catchAsync(async (req, res) => {
  const { limit = 12 } = req.query;
  const suggestions = await propertyService.getSearchSuggestions(parseInt(limit, 10) || 12);
  ApiResponse.success(res, suggestions);
});

/**
 * @desc    Get single property
 * @route   GET /api/v1/properties/:id
 * @access  Public
 */
const getProperty = catchAsync(async (req, res) => {
  const property = await propertyService.getProperty(req.params.id, true);
  ApiResponse.success(res, property);
});

/**
 * @desc    Create new property
 * @route   POST /api/v1/properties
 * @access  Private (Host only)
 */
const createProperty = catchAsync(async (req, res) => {
  const property = await propertyService.createProperty(req.user._id, req.body);
  ApiResponse.created(res, property, 'Property created successfully');
});

/**
 * @desc    Update property
 * @route   PUT /api/v1/properties/:id
 * @access  Private (Owner only)
 */
const updateProperty = catchAsync(async (req, res) => {
  const property = await propertyService.updateProperty(
    req.params.id,
    req.user._id,
    req.body
  );
  ApiResponse.success(res, property, 'Property updated successfully');
});

/**
 * @desc    Delete property
 * @route   DELETE /api/v1/properties/:id
 * @access  Private (Owner only)
 */
const deleteProperty = catchAsync(async (req, res) => {
  await propertyService.deleteProperty(req.params.id, req.user._id);
  ApiResponse.success(res, null, 'Property deleted successfully');
});

/**
 * @desc    Upload property images
 * @route   POST /api/v1/properties/:id/images
 * @access  Private (Owner only)
 */
const uploadImages = catchAsync(async (req, res) => {
  const { images } = req.body; // Array of base64 images

  if (!images || !images.length) {
    throw AppError.badRequest('Please provide images to upload');
  }

  if (images.length > 10) {
    throw AppError.badRequest('Cannot upload more than 10 images at once');
  }

  // Upload to Cloudinary
  const uploadedImages = await cloudinaryService.uploadImages(images, {
    folder: `staybnb/properties/${req.params.id}`,
  });

  // Add to property
  const formattedImages = uploadedImages.map((img, index) => ({
    url: img.url,
    publicId: img.publicId,
    isPrimary: index === 0,
  }));

  const updatedImages = await propertyService.addImages(
    req.params.id,
    req.user._id,
    formattedImages
  );

  ApiResponse.success(res, updatedImages, 'Images uploaded successfully');
});

/**
 * @desc    Delete property image
 * @route   DELETE /api/v1/properties/:id/images/:imageId
 * @access  Private (Owner only)
 */
const deleteImage = catchAsync(async (req, res) => {
  const result = await propertyService.removeImage(
    req.params.id,
    req.user._id,
    req.params.imageId
  );

  // Delete from Cloudinary
  if (result.publicId) {
    await cloudinaryService.deleteImage(result.publicId);
  }

  ApiResponse.success(res, result.images, 'Image deleted successfully');
});

/**
 * @desc    Get host's properties
 * @route   GET /api/v1/properties/my-listings
 * @access  Private (Host only)
 */
const getMyListings = catchAsync(async (req, res) => {
  const { status } = req.query;
  const properties = await propertyService.getHostProperties(req.user._id, status);
  ApiResponse.success(res, properties);
});

/**
 * @desc    Get property availability
 * @route   GET /api/v1/properties/:id/availability
 * @access  Public
 */
const getAvailability = catchAsync(async (req, res) => {
  const property = await propertyService.getProperty(req.params.id);

  // Return blocked dates and booking restrictions
  ApiResponse.success(res, {
    blockedDates: property.blockedDates,
    minNights: property.availability.minNights,
    maxNights: property.availability.maxNights,
    advanceNotice: property.availability.advanceNotice,
    preparationTime: property.availability.preparationTime,
  });
});

/**
 * @desc    Update property availability
 * @route   PUT /api/v1/properties/:id/availability
 * @access  Private (Owner only)
 */
const updateAvailability = catchAsync(async (req, res) => {
  const { blockedDates } = req.body;

  const updatedBlockedDates = await propertyService.updateAvailability(
    req.params.id,
    req.user._id,
    blockedDates
  );

  ApiResponse.success(res, updatedBlockedDates, 'Availability updated successfully');
});

/**
 * @desc    Publish property (activate)
 * @route   PUT /api/v1/properties/:id/publish
 * @access  Private (Owner only)
 */
const publishProperty = catchAsync(async (req, res) => {
  const property = await propertyService.publishProperty(req.params.id, req.user._id);
  ApiResponse.success(res, property, 'Property published successfully');
});

/**
 * @desc    Calculate price for dates
 * @route   POST /api/v1/properties/:id/calculate-price
 * @access  Public
 */
const calculatePrice = catchAsync(async (req, res) => {
  const { checkIn, checkOut, guests } = req.body;

  if (!checkIn || !checkOut) {
    throw AppError.badRequest('Check-in and check-out dates are required');
  }

  const pricing = await propertyService.calculatePrice(
    req.params.id,
    checkIn,
    checkOut,
    guests || 1
  );

  ApiResponse.success(res, pricing);
});

module.exports = {
  getProperties,
  getSearchSuggestions,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadImages,
  deleteImage,
  getMyListings,
  getAvailability,
  updateAvailability,
  publishProperty,
  calculatePrice,
};
