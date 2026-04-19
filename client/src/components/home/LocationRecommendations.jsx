import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronLeft, ChevronRight, Loader2, Navigation } from 'lucide-react';
import { PropertyCard } from '../property';
import { propertyService } from '../../services';
import geolocationService from '../../services/geolocationService';

const LocationRecommendations = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  
  const [location, setLocation] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt'); // prompt, granted, denied
  const [showScrollButtons, setShowScrollButtons] = useState({ left: false, right: true });

  useEffect(() => {
    checkLocationPermission();
  }, []);

  useEffect(() => {
    if (location) {
      fetchNearbyProperties();
    }
  }, [location]);

  const checkLocationPermission = async () => {
    // Check if we have cached location
    const cached = geolocationService.getCachedLocation();
    if (cached) {
      setLocation(cached);
      setLocationPermission('granted');
      return;
    }

    // Check permission status if available
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(result.state);
        
        if (result.state === 'granted') {
          requestLocation();
        } else if (result.state === 'prompt') {
          // Auto-request location on first load if prompt state
          requestLocation();
        }
        
        result.addEventListener('change', () => {
          setLocationPermission(result.state);
          if (result.state === 'granted') {
            requestLocation();
          }
        });
      } catch (e) {
        // permissions API not supported, try to get location anyway
        console.log('Permissions API not supported, requesting location directly');
        requestLocation();
      }
    } else {
      // Try to get location directly (will trigger browser permission)
      requestLocation();
    }
  };

  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loc = await geolocationService.getLocation();
      setLocation(loc);
      setLocationPermission('granted');
    } catch (err) {
      console.error('Location error:', err);
      setError(err.message);
      setLocationPermission('denied');
      // Fall back to showing general recommendations
      fetchGeneralProperties();
    }
  };

  const fetchNearbyProperties = async () => {
    try {
      setLoading(true);
      // Try to fetch properties near user's location
      const response = await propertyService.getProperties({
        latitude: location.latitude,
        longitude: location.longitude,
        maxDistance: 100, // 100km radius
        limit: 10,
      });
      
      if (response.success && response.data?.length > 0) {
        setProperties(response.data);
      } else {
        // Fall back to general properties if none nearby
        fetchGeneralProperties();
      }
    } catch (err) {
      console.error('Error fetching nearby properties:', err);
      fetchGeneralProperties();
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralProperties = async () => {
    try {
      const response = await propertyService.getProperties({
        limit: 10,
        featured: true,
      });
      if (response.success) {
        setProperties(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowScrollButtons({
        left: scrollLeft > 0,
        right: scrollLeft < scrollWidth - clientWidth - 10,
      });
    }
  };

  const locationName = location?.locationName || 'your area';
  const title = location ? `Popular homes in ${locationName}` : 'Popular homes near you';

  if (loading) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="text-gray-500">Finding homes near you...</span>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Permission prompt UI
  if (locationPermission === 'prompt' && !location) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm">
                <Navigation className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enable location for personalized recommendations</h3>
                <p className="text-sm text-gray-600">See popular homes and experiences near you</p>
              </div>
            </div>
            <button
              onClick={requestLocation}
              className="bg-[#FF385C] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#E31C5F] transition-colors"
            >
              Enable location
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (properties.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={() => navigate(`/search?location=${encodeURIComponent(locationName)}`)}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          {/* Navigation Arrows */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!showScrollButtons.left}
              className={`p-2 rounded-full border ${
                showScrollButtons.left
                  ? 'border-gray-300 hover:border-gray-900 hover:shadow-md'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              } transition-all`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!showScrollButtons.right}
              className={`p-2 rounded-full border ${
                showScrollButtons.right
                  ? 'border-gray-300 hover:border-gray-900 hover:shadow-md'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              } transition-all`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {properties.map((property) => (
            <div
              key={property._id}
              className="flex-shrink-0 w-72"
              style={{ scrollSnapAlign: 'start' }}
            >
              <PropertyCard property={property} />
            </div>
          ))}
        </div>

        {/* Location indicator */}
        {location && (
          <div className="flex items-center gap-1.5 mt-4 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>Based on your location in {locationName}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default LocationRecommendations;
