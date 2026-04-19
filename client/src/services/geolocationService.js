// Geolocation service for getting user's location and nearby properties

class GeolocationService {
  constructor() {
    this.currentPosition = null;
    this.locationName = null;
  }

  // Get current position using browser Geolocation API
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          // Try to get location name via reverse geocoding
          try {
            this.locationName = await this.reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );
          } catch (err) {
            console.warn('Reverse geocoding failed:', err);
          }
          
          resolve({
            ...this.currentPosition,
            locationName: this.locationName,
          });
        },
        (error) => {
          let errorMessage = 'Unknown error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  }

  // Reverse geocode coordinates to city/region name
  // Using free Nominatim API (OpenStreetMap)
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      // Extract location name from address
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality;
      const state = address.state || address.region;
      const country = address.country;
      
      if (city && state) {
        return `${city}, ${state}`;
      } else if (city && country) {
        return `${city}, ${country}`;
      } else if (state && country) {
        return `${state}, ${country}`;
      } else if (country) {
        return country;
      }
      
      return data.display_name?.split(',').slice(0, 2).join(',') || 'Your location';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  // Get cached location if available
  getCachedLocation() {
    const cached = localStorage.getItem('userLocation');
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 1 hour
        if (Date.now() - timestamp < 3600000) {
          return data;
        }
      } catch (e) {
        localStorage.removeItem('userLocation');
      }
    }
    return null;
  }

  // Cache location
  cacheLocation(location) {
    localStorage.setItem('userLocation', JSON.stringify({
      data: location,
      timestamp: Date.now(),
    }));
  }

  // Get location with caching
  async getLocation() {
    // Check cache first
    const cached = this.getCachedLocation();
    if (cached) {
      return cached;
    }

    // Get fresh location
    const location = await this.getCurrentPosition();
    this.cacheLocation(location);
    return location;
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

const geolocationService = new GeolocationService();
export default geolocationService;
