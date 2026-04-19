const config = require('../config');

/**
 * Mapbox Geocoding Service
 * Handles location search, geocoding, and reverse geocoding
 */
class MapService {
  constructor() {
    this.accessToken = config.mapbox?.accessToken;
    this.baseUrl = 'https://api.mapbox.com';
  }

  /**
   * Check if Mapbox is configured
   */
  isConfigured() {
    return !!this.accessToken;
  }

  /**
   * Forward geocoding - address to coordinates
   * @param {string} address - Address to geocode
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Array of location results
   */
  async geocode(address, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Mapbox is not configured');
    }

    const {
      limit = 5,
      types = 'address,place,locality,neighborhood',
      country,
      bbox,
      proximity,
    } = options;

    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: limit.toString(),
      types,
    });

    if (country) params.append('country', country);
    if (bbox) params.append('bbox', bbox.join(','));
    if (proximity) params.append('proximity', proximity.join(','));

    const response = await fetch(
      `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.features.map((feature) => ({
      id: feature.id,
      name: feature.text,
      placeName: feature.place_name,
      coordinates: {
        longitude: feature.center[0],
        latitude: feature.center[1],
      },
      bbox: feature.bbox,
      context: this.parseContext(feature.context),
      type: feature.place_type[0],
    }));
  }

  /**
   * Reverse geocoding - coordinates to address
   * @param {number} longitude
   * @param {number} latitude
   * @returns {Promise<Object>} - Location details
   */
  async reverseGeocode(longitude, latitude) {
    if (!this.isConfigured()) {
      throw new Error('Mapbox is not configured');
    }

    const params = new URLSearchParams({
      access_token: this.accessToken,
      types: 'address,place,locality,neighborhood,region,country',
    });

    const response = await fetch(
      `${this.baseUrl}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const context = this.parseContext(feature.context);

    return {
      address: feature.place_name,
      street: feature.text,
      city: context.place || context.locality,
      state: context.region,
      country: context.country,
      zipCode: context.postcode,
      coordinates: {
        longitude: feature.center[0],
        latitude: feature.center[1],
      },
    };
  }

  /**
   * Search for places near coordinates
   * @param {number} longitude
   * @param {number} latitude
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async searchNearby(longitude, latitude, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Mapbox is not configured');
    }

    const {
      query = '',
      limit = 10,
      radius = 5000, // meters
      types = 'poi',
    } = options;

    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: limit.toString(),
      types,
      proximity: `${longitude},${latitude}`,
    });

    const searchQuery = query || 'restaurant,cafe,attraction';
    
    const response = await fetch(
      `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Nearby search failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.features.map((feature) => ({
      id: feature.id,
      name: feature.text,
      placeName: feature.place_name,
      coordinates: {
        longitude: feature.center[0],
        latitude: feature.center[1],
      },
      category: feature.properties?.category,
      distance: this.calculateDistance(
        latitude, longitude,
        feature.center[1], feature.center[0]
      ),
    }));
  }

  /**
   * Get directions between two points
   * @param {Array} origin - [longitude, latitude]
   * @param {Array} destination - [longitude, latitude]
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getDirections(origin, destination, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Mapbox is not configured');
    }

    const {
      profile = 'driving',
      alternatives = false,
      geometries = 'geojson',
      steps = true,
    } = options;

    const coordinates = `${origin.join(',')};${destination.join(',')}`;

    const params = new URLSearchParams({
      access_token: this.accessToken,
      alternatives: alternatives.toString(),
      geometries,
      steps: steps.toString(),
      overview: 'full',
    });

    const response = await fetch(
      `${this.baseUrl}/directions/v5/mapbox/${profile}/${coordinates}?${params}`
    );

    if (!response.ok) {
      throw new Error(`Directions failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];

    return {
      distance: route.distance, // meters
      duration: route.duration, // seconds
      geometry: route.geometry,
      steps: route.legs[0]?.steps?.map((step) => ({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
      })),
    };
  }

  /**
   * Parse context array from geocoding response
   */
  parseContext(context = []) {
    const parsed = {};
    
    for (const item of context) {
      const type = item.id.split('.')[0];
      parsed[type] = item.text;
    }

    return parsed;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Generate static map URL
   * @param {Object} options
   * @returns {string}
   */
  getStaticMapUrl(options = {}) {
    if (!this.isConfigured()) {
      return null;
    }

    const {
      longitude,
      latitude,
      zoom = 14,
      width = 600,
      height = 400,
      style = 'streets-v12',
      marker = true,
      markerColor = 'ff5a5f',
    } = options;

    let url = `${this.baseUrl}/styles/v1/mapbox/${style}/static`;

    if (marker) {
      url += `/pin-l+${markerColor}(${longitude},${latitude})`;
    }

    url += `/${longitude},${latitude},${zoom}/${width}x${height}@2x`;
    url += `?access_token=${this.accessToken}`;

    return url;
  }
}

module.exports = new MapService();
