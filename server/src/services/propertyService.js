const { Property } = require('../models');
const { AppError } = require('../utils');

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#x2F;': '/',
};

const decodeHtmlEntities = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(
    /(&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;)/g,
    (match) => HTML_ENTITY_MAP[match] || match
  );
};

const normalizePropertyImageUrls = (property) => {
  if (!property || !Array.isArray(property.images)) return property;

  property.images = property.images.map((image) => ({
    ...image,
    url: decodeHtmlEntities(image?.url),
  }));

  return property;
};

const normalizeInrAmount = (amount, threshold) => {
  if (typeof amount !== 'number') return amount;
  if (amount <= 0) return amount;
  return amount < threshold ? Math.round(amount * 10) : amount;
};

const normalizePropertyPricing = (property) => {
  if (!property?.pricing) return property;
  if ((property.pricing.currency || 'INR') !== 'INR') return property;

  property.pricing = {
    ...property.pricing,
    basePrice: normalizeInrAmount(property.pricing.basePrice, 1000),
    weekendPrice: normalizeInrAmount(property.pricing.weekendPrice, 1000),
    cleaningFee: normalizeInrAmount(property.pricing.cleaningFee, 500),
  };

  return property;
};

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class PropertyService {
  /**
   * Build search query from filters
   */
  buildSearchQuery(filters) {
    const query = { status: 'active' };
    const andClauses = [];

    // Location search (city, country, or text search)
    if (filters.location) {
      const normalizedInput = String(filters.location)
        .replace(/[,/]+/g, ' ')
        .trim();

      const terms = normalizedInput
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
        .slice(0, 6);

      const searchableFields = [
        'title',
        'description',
        'location.city',
        'location.state',
        'location.country',
        'propertyType',
        'category',
        'amenities',
        'keywords',
      ];

      const termRegexes = terms.map((term) => new RegExp(escapeRegex(term), 'i'));
      andClauses.push({
        $or: searchableFields.flatMap((field) =>
          termRegexes.map((termRegex) => ({ [field]: termRegex }))
        ),
      });
    }

    // Geospatial search (within radius)
    if (filters.lat && filters.lng) {
      const radius = filters.radius || 50; // km
      query['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(filters.lng), parseFloat(filters.lat)],
            radius / 6378.1, // Convert km to radians
          ],
        },
      };
    }

    // Date availability (check not in blocked dates)
    // This will need to be combined with booking checks later
    if (filters.checkIn && filters.checkOut) {
      query['blockedDates'] = {
        $not: {
          $elemMatch: {
            startDate: { $lt: new Date(filters.checkOut) },
            endDate: { $gt: new Date(filters.checkIn) },
          },
        },
      };
    }

    // Guest count
    if (filters.guests) {
      query['capacity.guests'] = { $gte: parseInt(filters.guests) };
    }

    // Price range
    if (filters.minPrice || filters.maxPrice) {
      query['pricing.basePrice'] = {};
      if (filters.minPrice) {
        query['pricing.basePrice'].$gte = parseFloat(filters.minPrice);
      }
      if (filters.maxPrice) {
        query['pricing.basePrice'].$lte = parseFloat(filters.maxPrice);
      }
    }

    // Property type
    if (filters.propertyType) {
      query.propertyType = filters.propertyType;
    }

    // Room type
    if (filters.roomType) {
      query.roomType = filters.roomType;
    }

    // Category
    if (filters.category) {
      query.category = filters.category;
    }

    // Bedrooms
    if (filters.bedrooms) {
      query['capacity.bedrooms'] = { $gte: parseInt(filters.bedrooms) };
    }

    // Bathrooms
    if (filters.bathrooms) {
      query['capacity.bathrooms'] = { $gte: parseInt(filters.bathrooms) };
    }

    // Amenities (must have all specified)
    if (filters.amenities) {
      const amenitiesArray = Array.isArray(filters.amenities)
        ? filters.amenities
        : filters.amenities.split(',');
      query.amenities = { $all: amenitiesArray };
    }

    // Instant book
    if (filters.instantBook === 'true') {
      query.instantBook = true;
    }

    // Superhost
    if (filters.superhost === 'true') {
      // Will need to join with host data
    }

    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    return query;
  }

  /**
   * Build sort options
   */
  buildSortOptions(sortBy) {
    const sortOptions = {
      price_low: { 'pricing.basePrice': 1 },
      price_high: { 'pricing.basePrice': -1 },
      rating: { 'rating.average': -1, 'rating.count': -1 },
      newest: { createdAt: -1 },
      popular: { bookingCount: -1, views: -1 },
      default: { isFeatured: -1, 'rating.average': -1, createdAt: -1 },
    };

    return sortOptions[sortBy] || sortOptions.default;
  }

  /**
   * Get properties with pagination and filters
   */
  async getProperties(filters = {}, page = 1, limit = 20) {
    const query = this.buildSearchQuery(filters);
    const sort = this.buildSortOptions(filters.sortBy);

    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('host', 'firstName lastName avatar isSuperhost rating')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments(query),
    ]);
    const normalizedProperties = properties
      .map(normalizePropertyImageUrls)
      .map(normalizePropertyPricing);

    return {
      properties: normalizedProperties,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Build dynamic destination and keyword suggestions from active listings
   */
  async getSearchSuggestions(limit = 12) {
    const properties = await Property.find({ status: 'active' })
      .select('location.city location.state location.country keywords propertyType category')
      .limit(500)
      .lean();

    const suggestions = new Map();

    const addSuggestion = (name, type, weight = 1) => {
      if (!name) return;
      const cleaned = String(name).trim();
      if (!cleaned) return;

      const key = cleaned.toLowerCase();
      const current = suggestions.get(key);
      if (current) {
        current.score += weight;
      } else {
        suggestions.set(key, { name: cleaned, type, score: weight });
      }
    };

    for (const property of properties) {
      const city = property?.location?.city;
      const state = property?.location?.state;
      const country = property?.location?.country;

      addSuggestion(city && country ? `${city}, ${country}` : city, 'destination', 4);
      addSuggestion(city, 'destination', 3);
      addSuggestion(state, 'destination', 2);
      addSuggestion(country, 'destination', 2);
      addSuggestion(property?.propertyType, 'keyword', 1);
      addSuggestion(property?.category, 'keyword', 1);

      for (const keyword of property?.keywords || []) {
        addSuggestion(keyword, 'keyword', 1);
      }
    }

    return Array.from(suggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ name, type }) => ({ name, type }));
  }

  /**
   * Get single property by ID
   */
  async getProperty(id, incrementViews = false) {
    const property = await Property.findById(id)
      .populate('host', 'firstName lastName avatar bio work languages createdAt isSuperhost isVerified rating')
      .lean();

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    // Increment view count
    if (incrementViews) {
      await Property.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    return normalizePropertyPricing(normalizePropertyImageUrls(property));
  }

  /**
   * Create new property
   */
  async createProperty(hostId, propertyData) {
    const property = await Property.create({
      ...propertyData,
      host: hostId,
      status: propertyData.status || 'active', // Allow client to set status, default to active
    });

    return property;
  }

  /**
   * Update property
   */
  async updateProperty(propertyId, hostId, updates) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only update your own properties');
    }

    // Fields that cannot be updated directly
    const restrictedFields = ['host', 'rating', 'views', 'bookingCount'];
    restrictedFields.forEach((field) => delete updates[field]);

    Object.assign(property, updates);
    await property.save();

    return property;
  }

  /**
   * Delete property (soft delete by setting status)
   */
  async deleteProperty(propertyId, hostId) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only delete your own properties');
    }

    // TODO: Check for active bookings before deleting

    property.status = 'inactive';
    await property.save();

    return { message: 'Property deleted successfully' };
  }

  /**
   * Add images to property
   */
  async addImages(propertyId, hostId, images) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only update your own properties');
    }

    property.images.push(...images);
    await property.save();

    return property.images;
  }

  /**
   * Remove image from property
   */
  async removeImage(propertyId, hostId, imageId) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only update your own properties');
    }

    const image = property.images.id(imageId);
    if (!image) {
      throw AppError.notFound('Image not found');
    }

    // Get public ID for Cloudinary deletion
    const publicId = image.publicId;

    image.deleteOne();
    await property.save();

    return { publicId, images: property.images };
  }

  /**
   * Get host's properties
   */
  async getHostProperties(hostId, status = null) {
    const query = { host: hostId };
    if (status) {
      query.status = status;
    }

    const properties = await Property.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return properties
      .map(normalizePropertyImageUrls)
      .map(normalizePropertyPricing);
  }

  /**
   * Update availability (blocked dates)
   */
  async updateAvailability(propertyId, hostId, data) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only update your own properties');
    }

    if (data.blockedDates) property.availability.blockedDates = data.blockedDates;
    if (data.minNights) property.availability.minNights = data.minNights;
    if (data.maxNights) property.availability.maxNights = data.maxNights;
    if (data.advanceNotice) property.availability.advanceNotice = data.advanceNotice;
    
    await property.save();

    return property;
  }

  /**
   * Update property pricing
   */
  async updatePricing(propertyId, hostId, data) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only update your own properties');
    }

    if (data.basePrice) property.pricing.basePrice = data.basePrice;
    if (data.weekendPrice) property.pricing.weekendPrice = data.weekendPrice;
    if (data.weeklyDiscount !== undefined) property.pricing.weeklyDiscount = data.weeklyDiscount;
    if (data.monthlyDiscount !== undefined) property.pricing.monthlyDiscount = data.monthlyDiscount;
    if (data.cleaningFee !== undefined) property.pricing.cleaningFee = data.cleaningFee;
    
    await property.save();

    return property;
  }

  /**
   * Publish property (change from draft to active)
   */
  async publishProperty(propertyId, hostId) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (property.host.toString() !== hostId.toString()) {
      throw AppError.forbidden('You can only publish your own properties');
    }

    // Validation checks
    if (property.images.length < 5) {
      throw AppError.badRequest('Property must have at least 5 images');
    }

    if (!property.description || property.description.length < 50) {
      throw AppError.badRequest('Property must have a proper description');
    }

    property.status = 'active';
    await property.save();

    return property;
  }

  /**
   * Calculate price for booking
   */
  async calculatePrice(propertyId, checkIn, checkOut, guests) {
    const property = await Property.findById(propertyId);

    if (!property) {
      throw AppError.notFound('Property not found');
    }

    if (guests > property.capacity.guests) {
      throw AppError.badRequest(`This property accommodates maximum ${property.capacity.guests} guests`);
    }

    // Check availability
    if (!property.isAvailable(checkIn, checkOut)) {
      throw AppError.badRequest('Property is not available for selected dates');
    }

    // Calculate price using model method
    const pricing = property.calculatePrice(checkIn, checkOut, guests);

    return {
      property: {
        id: property._id,
        title: property.title,
        image: decodeHtmlEntities(property.primaryImage),
      },
      ...pricing,
    };
  }
}

module.exports = new PropertyService();
